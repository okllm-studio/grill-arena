import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { start } from "../src/server.js";

const TOKEN = "test-token";

let dir;
let server;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "grill-arena-"));
  server = await start({ port: 0, dir, token: TOKEN });
});

afterEach(async () => {
  await server.close();
  await rm(dir, { recursive: true, force: true });
});

// --- Roles played by the tests ----------------------------------------------

async function request(method, path, { body, token } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(server.url + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

const claude = {
  startSession: (title = "Test session") =>
    request("POST", "/api/session", { body: { title }, token: TOKEN }),
  publish: (step) => request("POST", "/api/steps", { body: step, token: TOKEN }),
  /** Publishes the Step, then the Facilitator opens it: most tests start from an open Step. */
  publishOpen: async (step) => {
    const publication = await request("POST", "/api/steps", { body: step, token: TOKEN });
    assert.equal(publication.status, 201);
    assert.equal((await facilitator.open(publication.body.id)).status, 200);
    return publication;
  },
  result: (id, { wait = false } = {}) =>
    request("GET", `/api/steps/${id}/result${wait ? "?wait=1" : ""}`, { token: TOKEN }),
  end: () => request("POST", "/api/session/end", { token: TOKEN }),
};

const facilitator = {
  /** The Facilitator's view: a Player's view, plus what is reserved to the Facilitator. */
  state: async (playerId) =>
    (await request("GET", `/api/state${playerId ? `?player=${playerId}` : ""}`, { token: TOKEN })).body,
  open: (stepId) => request("POST", `/api/steps/${stepId}/opening`, { token: TOKEN }),
  close: (stepId, decisions = {}) =>
    request("POST", `/api/steps/${stepId}/closing`, { body: decisions, token: TOKEN }),
};

async function joinAs(nickname) {
  const { status, body } = await request("POST", "/api/players", { body: { nickname } });
  assert.equal(status, 201, `join ${nickname}`);
  const id = body.id;
  return {
    id,
    state: async () => (await request("GET", `/api/state?player=${id}`)).body,
    answer: (stepId, questionId, answer) =>
      request("PUT", `/api/steps/${stepId}/questions/${questionId}/answer`, {
        body: { player: id, ...answer },
      }),
  };
}

function stepFixture(number = 1) {
  return {
    number,
    settled: 0,
    remaining: 4,
    questions: [
      {
        id: number === 1 ? "q1" : `q1-${number}`,
        title: "Where does the tool live",
        body: "A **dedicated repository**?",
        options: [
          { id: "A", label: "Dedicated repository" },
          { id: "B", label: "Folder in the monorepo" },
        ],
        recommended: "A",
      },
    ],
  };
}

// --- Behaviors ----------------------------------------------------------------

test("a Player sees the Step published by Claude, with the recommended option", async () => {
  await claude.startSession("Arena");
  const publication = await claude.publishOpen(stepFixture());
  assert.equal(publication.status, 201);

  const alice = await joinAs("alice");
  const state = await alice.state();
  assert.equal(state.session.title, "Arena");
  assert.equal(state.step.id, publication.body.id);
  assert.equal(state.step.open, true);
  assert.deepEqual(
    { number: state.step.number, settled: state.step.settled, remaining: state.step.remaining },
    { number: 1, settled: 0, remaining: 4 },
  );
  const [q1] = state.step.questions;
  assert.equal(q1.body, "A **dedicated repository**?");
  assert.equal(q1.recommended, "A");
  assert.deepEqual(q1.options.map((o) => o.label), ["Dedicated repository", "Folder in the monorepo"]);
});

test("a published Step waits for Opening: Players cannot see its Questions or vote", async () => {
  await claude.startSession();
  const alice = await joinAs("alice");
  const { body: step } = await claude.publish(stepFixture(1));

  const pending = (await alice.state()).step;
  assert.equal(pending.state, "pending");
  assert.equal(pending.open, false);
  assert.equal(pending.number, 1);
  assert.deepEqual(pending.questions, []);
  assert.equal(JSON.stringify(await alice.state()).includes("Dedicated repository"), false);
  assert.equal((await alice.answer(step.id, "q1", { option: "A" })).status, 409);
  assert.equal((await claude.result(step.id)).status, 202);
  assert.equal((await facilitator.close(step.id)).status, 409);

  assert.equal((await facilitator.open(step.id)).status, 200);
  const open = (await alice.state()).step;
  assert.equal(open.state, "open");
  assert.equal(open.questions.length, 1);
  assert.equal((await alice.answer(step.id, "q1", { option: "A" })).status, 200);
});

test("Opening is reserved to the Facilitator and refused on a Step already open or closed", async () => {
  await claude.startSession();
  const { body: step } = await claude.publish(stepFixture());
  assert.equal((await request("POST", `/api/steps/${step.id}/opening`)).status, 401);
  assert.equal((await facilitator.open(step.id)).status, 200);
  assert.equal((await facilitator.open(step.id)).status, 409);
  await facilitator.close(step.id);
  assert.equal((await facilitator.open(step.id)).status, 409);
});

test("Claude's long-poll waits for closing, not for Opening", async () => {
  await claude.startSession();
  const { body: step } = await claude.publish(stepFixture());
  let answered = false;
  const waiting = claude.result(step.id, { wait: true }).then((r) => ((answered = true), r));
  await facilitator.open(step.id);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(answered, false);
  await facilitator.close(step.id);
  assert.equal((await waiting).status, 200);
});

test("a Step cannot be published until the previous one is closed, even if it is still waiting for Opening", async () => {
  await claude.startSession();
  await claude.publish(stepFixture(1));
  assert.equal((await claude.publish(stepFixture(2))).status, 409);
});

test("without the token, a Session cannot be started, a Step published or closed, or the Session ended", async () => {
  assert.equal((await request("POST", "/api/session", { body: { title: "x" } })).status, 401);
  await claude.startSession();
  assert.equal((await request("POST", "/api/steps", { body: stepFixture() })).status, 401);
  const { body } = await claude.publishOpen(stepFixture());
  assert.equal(
    (await request("POST", `/api/steps/${body.id}/closing`, { body: {}, token: "wrong" })).status,
    401,
  );
  assert.equal((await request("GET", `/api/steps/${body.id}/result`)).status, 401);
  assert.equal((await request("POST", "/api/session/end")).status, 401);
});

test("before closing, a Player sees only their own Vote and the number of voters", async () => {
  await claude.startSession();
  const { body: step } = await claude.publishOpen(stepFixture());
  const alice = await joinAs("alice");
  const bob = await joinAs("bob");
  await joinAs("carol");

  assert.equal((await alice.answer(step.id, "q1", { option: "B", comment: "B for me" })).status, 200);
  await bob.answer(step.id, "q1", { comment: "I abstain" });

  const bobView = await bob.state();
  const [q1] = bobView.step.questions;
  assert.equal(q1.voters, 1);
  assert.equal(bobView.players, 3);
  assert.equal(q1.myVote, null);
  assert.equal(q1.myComment, "I abstain");
  assert.equal(JSON.stringify(bobView).includes("B for me"), false);
  assert.equal(q1.distribution, undefined);

  const [aliceQ1] = (await alice.state()).step.questions;
  assert.equal(aliceQ1.myVote, "B");
  assert.equal(aliceQ1.myComment, "B for me");
});

test("a Player can change their Vote, go back to Abstention and erase their Comment", async () => {
  await claude.startSession();
  const { body: step } = await claude.publishOpen(stepFixture());
  const alice = await joinAs("alice");

  await alice.answer(step.id, "q1", { option: "B", comment: "B" });
  await alice.answer(step.id, "q1", { option: "A" });
  let [q1] = (await alice.state()).step.questions;
  assert.deepEqual([q1.myVote, q1.myComment, q1.voters], ["A", "B", 1]);

  await alice.answer(step.id, "q1", { option: null, comment: "" });
  [q1] = (await alice.state()).step.questions;
  assert.deepEqual([q1.myVote, q1.myComment, q1.voters], [null, "", 0]);
});

test("at closing, Claude receives the selected option, the distribution, the Comments and the Scoreboard", async () => {
  await claude.startSession();
  const { body: step } = await claude.publishOpen(stepFixture());
  const alice = await joinAs("alice");
  const bob = await joinAs("bob");
  const carol = await joinAs("carol");
  await joinAs("dan"); // abstains without saying anything
  await alice.answer(step.id, "q1", { option: "B", comment: "the monorepo is enough" });
  await bob.answer(step.id, "q1", { option: "B" });
  await carol.answer(step.id, "q1", { option: "A" });

  assert.equal((await facilitator.close(step.id)).status, 200);
  const { status, body: result } = await claude.result(step.id);
  assert.equal(status, 200);
  assert.deepEqual(result.questions, [
    {
      id: "q1",
      number: 1,
      status: "selected",
      selected: "B",
      consensus: "near_consensus",
      distribution: { A: 1, B: 2 },
      abstentions: 1,
      comments: [{ nickname: "alice", text: "the monorepo is enough" }],
    },
  ]);
  assert.deepEqual(result.scoreboard, [
    { nickname: "alice", points: 1, total: 1, stepGain: 1 },
    { nickname: "bob", points: 1, total: 1, stepGain: 1 },
    { nickname: "carol", points: 0, total: 0, stepGain: 0 },
    { nickname: "dan", points: 0, total: 0, stepGain: 0 },
  ]);

  const carolView = await carol.state();
  assert.equal(carolView.step.open, false);
  assert.deepEqual(carolView.step.questions[0].result, result.questions[0]);
  assert.deepEqual((await facilitator.state()).scoreboard, result.scoreboard);
});

test("while the Step is open, the result without waiting says it is not closed", async () => {
  await claude.startSession();
  const { body: step } = await claude.publishOpen(stepFixture());
  const { status, body } = await claude.result(step.id);
  assert.equal(status, 202);
  assert.equal(body.open, true);
});

test("Claude's long-poll stays open until closing, then returns the result", async () => {
  await claude.startSession();
  const { body: step } = await claude.publishOpen(stepFixture());
  const alice = await joinAs("alice");
  await alice.answer(step.id, "q1", { option: "A" });

  let answered = false;
  const waiting = claude.result(step.id, { wait: true }).then((r) => {
    answered = true;
    return r;
  });
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(answered, false);

  await facilitator.close(step.id);
  const { status, body } = await waiting;
  assert.equal(status, 200);
  assert.equal(body.questions[0].selected, "A");

  // called again after closing, it answers immediately
  assert.equal((await claude.result(step.id, { wait: true })).status, 200);
});

function threeOptionsStep() {
  const step = stepFixture();
  step.questions[0].options.push({ id: "C", label: "Skills plugin" });
  return step;
}

test("a split vote is not settled: the Question is sent back to be re-asked, with no Point", async () => {
  await claude.startSession();
  const { body: step } = await claude.publishOpen(threeOptionsStep());
  const alice = await joinAs("alice");
  const bob = await joinAs("bob");
  await alice.answer(step.id, "q1", { option: "A", comment: "A first" });
  await bob.answer(step.id, "q1", { option: "C" });

  const closing = await facilitator.close(step.id);
  assert.equal(closing.status, 200);
  const [q1] = closing.body.questions;
  assert.equal(q1.status, "to_reask");
  assert.equal(q1.split, true);
  assert.equal(q1.selected, undefined);
  assert.deepEqual(q1.distribution, { A: 1, B: 0, C: 1 });
  assert.deepEqual(q1.comments, [{ nickname: "alice", text: "A first" }]);
  assert.deepEqual(closing.body.scoreboard.map((r) => [r.nickname, r.total]), [["alice", 0], ["bob", 0]]);
});

test("the Summary flags a split vote, distinct from a Question the Facilitator re-asks", async () => {
  await claude.startSession("Arena");
  const alice = await joinAs("alice");
  const bob = await joinAs("bob");
  const content = threeOptionsStep();
  content.questions.push({ ...structuredClone(content.questions[0]), id: "q2", title: "Hosting" });
  const { body: step } = await claude.publishOpen(content);
  await alice.answer(step.id, "q1", { option: "A" });
  await bob.answer(step.id, "q1", { option: "C" });
  await alice.answer(step.id, "q2", { option: "A" });
  await facilitator.close(step.id, { toReask: ["q2"] });

  const { body } = await claude.end();
  const lines = body.summary.split("\n");
  assert.ok(lines.includes("- **Q1 · Where does the tool live**: to re-ask (split vote)"), body.summary);
  assert.ok(lines.includes("- **Q2 · Hosting**: to re-ask"), body.summary);
});

test("Questions are numbered continuously across the Session, as seen by Players and by Claude", async () => {
  await claude.startSession();
  const alice = await joinAs("alice");
  const first = stepFixture(1);
  first.questions.push({ ...structuredClone(first.questions[0]), id: "q2", title: "Stack" });
  const { body: s1 } = await claude.publishOpen(first);
  assert.deepEqual((await alice.state()).step.questions.map((q) => q.number), [1, 2]);
  const { body: result1 } = await facilitator.close(s1.id);
  assert.deepEqual(result1.questions.map((q) => q.number), [1, 2]);

  const secondContent = stepFixture(2);
  secondContent.questions[0].id = "q3";
  const { body: s2 } = await claude.publishOpen(secondContent);
  assert.deepEqual((await alice.state()).step.questions.map((q) => q.number), [3]);
  const { body: result2 } = await facilitator.close(s2.id);
  assert.deepEqual(result2.questions.map((q) => q.number), [3]);
});

test("a Question marked to re-ask is returned to Claude with no selected option and no Point", async () => {
  await claude.startSession();
  const { body: step } = await claude.publishOpen(stepFixture());
  const alice = await joinAs("alice");
  await alice.answer(step.id, "q1", { option: "A", comment: "neither one" });

  const { body } = await facilitator.close(step.id, { toReask: ["q1"] });
  assert.equal(body.questions[0].status, "to_reask");
  assert.equal(body.questions[0].selected, undefined);
  assert.equal(body.scoreboard[0].total, 0);
});

test("a malformed Step is refused with an explicit message", async () => {
  await claude.startSession();
  const invalidCases = {
    "no Question": (s) => { s.questions = []; },
    "Question without options": (s) => { s.questions[0].options = []; },
    "no recommended option": (s) => { delete s.questions[0].recommended; },
    "recommended option missing from the options": (s) => { s.questions[0].recommended = "Z"; },
    "duplicate options": (s) => { s.questions[0].options[1].id = "A"; },
    "duplicate Questions": (s) => { s.questions.push(structuredClone(s.questions[0])); },
  };
  for (const [name, damage] of Object.entries(invalidCases)) {
    const step = stepFixture();
    damage(step);
    const { status, body } = await claude.publish(step);
    assert.equal(status, 400, name);
    assert.match(body.error, /\S/, name);
  }
});

test("a Step cannot be published while the previous one is open", async () => {
  await claude.startSession();
  const { body: step } = await claude.publishOpen(stepFixture(1));
  assert.equal((await claude.publish(stepFixture(2))).status, 409);
  await facilitator.close(step.id);
  assert.equal((await claude.publish(stepFixture(2))).status, 201);
});

test("a Vote on a closed Step, or for an unknown option, is refused", async () => {
  await claude.startSession();
  const { body: step } = await claude.publishOpen(stepFixture());
  const alice = await joinAs("alice");
  assert.equal((await alice.answer(step.id, "q1", { option: "Z" })).status, 400);
  await facilitator.close(step.id);
  assert.equal((await alice.answer(step.id, "q1", { option: "A" })).status, 409);
});

test("a nickname already taken in the Session is refused, ignoring case", async () => {
  await claude.startSession();
  await joinAs("Alice");
  const { status } = await request("POST", "/api/players", { body: { nickname: "alice" } });
  assert.equal(status, 409);
  assert.equal((await request("POST", "/api/players", { body: { nickname: "  " } })).status, 400);
});

test("a Player can resume their nickname on explicit request and gets their Votes back", async () => {
  await claude.startSession();
  const { body: step } = await claude.publishOpen(stepFixture());
  const alice = await joinAs("Alice");
  await alice.answer(step.id, "q1", { option: "B", comment: "B for me" });

  const resumed = await request("POST", "/api/players", { body: { nickname: "alice", resume: true } });
  assert.equal(resumed.status, 200);
  assert.equal(resumed.body.id, alice.id);
  assert.equal(resumed.body.nickname, "Alice");

  const [q1] = (await alice.state()).step.questions;
  assert.equal(q1.myVote, "B");
  assert.equal(q1.myComment, "B for me");
  assert.equal((await request("GET", "/api/state")).body.players, 1);
});

test("resuming an unknown nickname creates the Player, a blank nickname is still refused", async () => {
  await claude.startSession();
  const created = await request("POST", "/api/players", { body: { nickname: "bob", resume: true } });
  assert.equal(created.status, 201);
  assert.equal((await request("POST", "/api/players", { body: { nickname: " ", resume: true } })).status, 400);
});

test("the Summary is visible to everyone only once the Session has ended", async () => {
  await claude.startSession("Arena");
  const { body: step } = await claude.publishOpen(stepFixture());
  const alice = await joinAs("alice");
  await alice.answer(step.id, "q1", { option: "A" });
  await facilitator.close(step.id);

  assert.equal((await alice.state()).session.summary, undefined);

  const { body: end } = await claude.end();
  assert.equal((await alice.state()).session.summary, end.summary);
  assert.equal((await request("GET", "/api/state")).body.session.summary, end.summary);
});

test("without a started Session, joining or publishing is refused", async () => {
  assert.equal((await request("POST", "/api/players", { body: { nickname: "alice" } })).status, 409);
  assert.equal((await claude.publish(stepFixture())).status, 409);
});

test("a Player who arrives mid-Session starts at 0 and votes as soon as the Step is open", async () => {
  await claude.startSession();
  const { body: s1 } = await claude.publishOpen(stepFixture(1));
  const alice = await joinAs("alice");
  await alice.answer(s1.id, "q1", { option: "A" });
  await facilitator.close(s1.id);

  const { body: s2 } = await claude.publishOpen(stepFixture(2));
  const bob = await joinAs("bob");
  assert.equal((await facilitator.state()).scoreboard.find((r) => r.nickname === "bob").total, 0);
  assert.equal((await bob.answer(s2.id, "q1-2", { option: "A" })).status, 200);
  const { body } = await facilitator.close(s2.id);
  assert.deepEqual(body.scoreboard.map((r) => [r.nickname, r.total]), [["alice", 1], ["bob", 1]]);
});

test("at the end of the Session, Claude receives the Summary and Players see the Session ended", async () => {
  await claude.startSession("Arena");
  const alice = await joinAs("alice");
  const bob = await joinAs("bob");

  const { body: s1 } = await claude.publishOpen(stepFixture(1));
  await alice.answer(s1.id, "q1", { option: "B" });
  await facilitator.close(s1.id);

  const s2Content = stepFixture(2);
  s2Content.questions[0].id = "q2";
  s2Content.questions[0].title = "Stack";
  const { body: s2 } = await claude.publishOpen(s2Content);
  await bob.answer(s2.id, "q2", { option: "A" });
  await facilitator.close(s2.id, { toReask: ["q2"] });

  const { status, body } = await claude.end();
  assert.equal(status, 200);
  const lines = body.summary.split("\n");
  for (const expected of [
    "# Summary: Arena",
    "## Step 1",
    "- **Q1 · Where does the tool live**: Folder in the monorepo (not recommended)",
    "## Step 2",
    "- **Q2 · Stack**: to re-ask",
    "## Scoreboard",
    "1. alice: 1 (1 Point)",
    "2. bob: 0 (0 Points)",
  ]) {
    assert.ok(lines.includes(expected), `missing line: ${expected}\n${body.summary}`);
  }

  assert.equal((await alice.state()).session.ended, true);
  assert.equal((await claude.publish(stepFixture(3))).status, 409);
});

test("without a started Session, the state says so instead of failing", async () => {
  const { status, body } = await request("GET", "/api/state");
  assert.equal(status, 200);
  assert.equal(body.session, null);
});

test("after a restart, the Session resumes with its Players, its open Step and its scores", async () => {
  await claude.startSession("Arena");
  const alice = await joinAs("alice");
  const { body: s1 } = await claude.publishOpen(stepFixture(1));
  await alice.answer(s1.id, "q1", { option: "B" });
  await facilitator.close(s1.id);
  const { body: s2 } = await claude.publishOpen(stepFixture(2));
  await alice.answer(s2.id, "q1-2", { option: "A", comment: "kept" });

  await server.close();
  server = await start({ port: 0, dir, token: TOKEN });

  const state = await alice.state();
  assert.equal(state.session.title, "Arena");
  assert.equal(state.step.id, s2.id);
  assert.equal(state.step.questions[0].myComment, "kept");
  assert.deepEqual((await facilitator.state()).scoreboard.map((r) => [r.nickname, r.total]), [["alice", 1]]);

  const { body } = await facilitator.close(s2.id);
  assert.deepEqual(body.scoreboard.map((r) => [r.nickname, r.total]), [["alice", 2]]);
});

test("starting a new Session archives the previous one without overwriting it", async () => {
  await claude.startSession("First");
  await joinAs("alice");
  await claude.startSession("Second");
  assert.equal((await request("GET", "/api/state")).body.session.title, "Second");
  assert.equal((await request("POST", "/api/players", { body: { nickname: "alice" } })).status, 201);

  assert.equal((await readdir(dir)).filter((f) => f.endsWith(".json")).length, 2);

  await server.close();
  server = await start({ port: 0, dir, token: TOKEN });
  assert.equal((await request("GET", "/api/state")).body.session.title, "Second");
});

test("the Session's initial prompt is visible to everyone and the Facilitator can edit it", async () => {
  await request("POST", "/api/session", { body: { title: "Arena", prompt: "Grill **the** repository" }, token: TOKEN });
  const alice = await joinAs("alice");
  assert.equal((await alice.state()).session.prompt, "Grill **the** repository");

  assert.equal((await request("PUT", "/api/session/prompt", { body: { prompt: "x" } })).status, 401);
  const edit = await request("PUT", "/api/session/prompt", { body: { prompt: "New framing" }, token: TOKEN });
  assert.equal(edit.status, 200);
  assert.equal((await alice.state()).session.prompt, "New framing");
});

test("the initial prompt locks at the Opening of Step 1 and disappears from the Players' view", async () => {
  await request("POST", "/api/session", { body: { title: "Arena", prompt: "Initial framing" }, token: TOKEN });
  const alice = await joinAs("alice");
  const { body: step } = await claude.publish(stepFixture());

  // published but not open: still visible and editable
  assert.equal((await alice.state()).session.prompt, "Initial framing");
  assert.equal((await request("PUT", "/api/session/prompt", { body: { prompt: "Framing v2" }, token: TOKEN })).status, 200);
  assert.equal((await alice.state()).session.prompt, "Framing v2");

  await facilitator.open(step.id);
  assert.equal((await alice.state()).session.prompt, undefined);
  const facilitatorView = await request("GET", `/api/state?player=${alice.id}`, { token: TOKEN });
  assert.equal(facilitatorView.body.session.prompt, "Framing v2");
  assert.equal(facilitatorView.body.session.promptLocked, true);
  const refusal = await request("PUT", "/api/session/prompt", { body: { prompt: "Too late" }, token: TOKEN });
  assert.equal(refusal.status, 409);
  assert.equal((await request("GET", `/api/state?player=${alice.id}`, { token: TOKEN })).body.session.prompt, "Framing v2");
});

test("the Scoreboard and statistics are hidden from Players during the Session, visible to the Facilitator", async () => {
  await claude.startSession();
  const alice = await joinAs("alice");
  const bob = await joinAs("bob");
  const content = stepFixture(1);
  content.questions.push({ ...structuredClone(content.questions[0]), id: "q2", title: "Stack" });
  const { body: step } = await claude.publishOpen(content);
  await alice.answer(step.id, "q1", { option: "A", comment: "agreed" });
  await alice.answer(step.id, "q2", { option: "A" });
  await bob.answer(step.id, "q1", { option: "A" });
  await facilitator.close(step.id);

  const aliceView = await alice.state();
  assert.equal(aliceView.scoreboard, undefined);
  assert.equal(aliceView.statistics, undefined);
  assert.equal(aliceView.step.questions[0].result.selected, "A", "the Step's results stay public");

  const facilitatorView = await facilitator.state(alice.id);
  assert.deepEqual(facilitatorView.scoreboard.map((r) => [r.nickname, r.total]), [["alice", 2], ["bob", 1]]);
  assert.deepEqual(facilitatorView.statistics, [
    { nickname: "alice", votes: 2, comments: 1, abstentions: 0 },
    { nickname: "bob", votes: 1, comments: 0, abstentions: 1 },
  ]);
});

test("at the end of the Session, the Scoreboard and statistics are published to everyone and returned to Claude", async () => {
  await claude.startSession();
  const alice = await joinAs("alice");
  const { body: step } = await claude.publishOpen(stepFixture());
  await alice.answer(step.id, "q1", { option: "A" });
  await facilitator.close(step.id);

  const { body: end } = await claude.end();
  assert.deepEqual(end.statistics, [{ nickname: "alice", votes: 1, comments: 0, abstentions: 0 }]);
  const view = await alice.state();
  assert.deepEqual(view.statistics, end.statistics);
  assert.deepEqual(view.scoreboard.map((r) => [r.nickname, r.total]), [["alice", 1]]);
});

test("the Facilitator can publish the statistics before the end of the Session", async () => {
  await claude.startSession();
  const alice = await joinAs("alice");
  const { body: step } = await claude.publishOpen(stepFixture());
  await alice.answer(step.id, "q1", { option: "A" });
  await facilitator.close(step.id);
  assert.equal((await alice.state()).statistics, undefined);

  assert.equal((await request("POST", "/api/session/statistics")).status, 401);
  assert.equal((await request("POST", "/api/session/statistics", { token: TOKEN })).status, 200);
  const view = await alice.state();
  assert.deepEqual(view.statistics, [{ nickname: "alice", votes: 1, comments: 0, abstentions: 0 }]);
  assert.deepEqual(view.scoreboard.map((r) => [r.nickname, r.total]), [["alice", 1]]);
});

test("the live distribution is hidden by default, even when everyone has voted", async () => {
  await claude.startSession();
  const alice = await joinAs("alice");
  const { body: step } = await claude.publishOpen(stepFixture());
  await alice.answer(step.id, "q1", { option: "A" });
  assert.equal((await alice.state()).step.questions[0].distribution, undefined);
});

test("the Facilitator can show the live distribution before Step 1 opens; it appears only from half the voters", async () => {
  await claude.startSession();
  const [alice, bob] = [await joinAs("alice"), await joinAs("bob")];
  await joinAs("carol");
  await joinAs("dan");
  const setLive = (body, token = TOKEN) => request("PUT", "/api/session/live-distribution", { body, token });
  assert.equal((await setLive({ enabled: true }, null)).status, 401);
  assert.equal((await setLive({ enabled: true })).status, 200);

  const { body: step } = await claude.publish(stepFixture());
  assert.equal((await setLive({ enabled: true })).status, 200, "adjustable until Step 1 is open");
  await facilitator.open(step.id);
  assert.equal((await setLive({ enabled: false })).status, 409);

  await alice.answer(step.id, "q1", { option: "A" });
  assert.equal((await bob.state()).step.questions[0].distribution, undefined, "1 voter out of 4");
  await bob.answer(step.id, "q1", { option: "B" });
  assert.deepEqual((await bob.state()).step.questions[0].distribution, { A: 1, B: 1 }, "2 voters out of 4");
  assert.equal((await facilitator.state()).session.liveDistribution, true);
});

// --- Co-facilitator ----------------------------------------------------------

const appoint = (playerId, { token = TOKEN, method = "PUT" } = {}) =>
  request(method, `/api/session/co-facilitators/${playerId}`, { token });

test("only the Facilitator appoints and revokes Co-facilitators, among the Session's Players", async () => {
  await claude.startSession();
  const alice = await joinAs("alice");
  const bob = await joinAs("bob");

  assert.equal((await appoint(alice.id, { token: null })).status, 401);
  assert.equal((await appoint("unknown")).status, 404);
  assert.equal((await appoint(alice.id)).status, 200);
  assert.equal((await alice.state()).coFacilitator, true);
  assert.equal((await bob.state()).coFacilitator, false);
  const list = (await facilitator.state(bob.id)).participants;
  assert.deepEqual(list.map((p) => [p.nickname, p.coFacilitator]), [["alice", true], ["bob", false]]);

  // a Co-facilitator appoints nobody
  const byAlice = await request("PUT", `/api/session/co-facilitators/${bob.id}`, { body: { player: alice.id } });
  assert.equal(byAlice.status, 403);

  assert.equal((await appoint(alice.id, { method: "DELETE" })).status, 200);
  assert.equal((await alice.state()).coFacilitator, false);
});

test("a Co-facilitator opens and closes Steps, an ordinary Player cannot", async () => {
  await claude.startSession();
  const alice = await joinAs("alice");
  const bob = await joinAs("bob");
  await appoint(bob.id);
  const { body: step } = await claude.publish(stepFixture());

  const openBy = (player) => request("POST", `/api/steps/${step.id}/opening`, { body: { player: player.id } });
  const closeBy = (player) => request("POST", `/api/steps/${step.id}/closing`, { body: { player: player.id } });
  assert.equal((await openBy(alice)).status, 403);
  assert.equal((await openBy(bob)).status, 200);
  await alice.answer(step.id, "q1", { option: "A" });
  assert.equal((await closeBy(alice)).status, 403);
  assert.equal((await closeBy(bob)).status, 200);
  // the Facilitator arriving right after: refused, no effect
  assert.equal((await facilitator.close(step.id)).status, 409);

  // once revoked, they lose their rights
  await appoint(bob.id, { method: "DELETE" });
  const { body: next } = await claude.publish(stepFixture(2));
  assert.equal(
    (await request("POST", `/api/steps/${next.id}/opening`, { body: { player: bob.id } })).status,
    403,
  );
});

test("a Co-facilitator sees the Scoreboard and statistics, but cannot set the prompt, the live distribution or publication", async () => {
  await claude.startSession();
  const alice = await joinAs("alice");
  const bob = await joinAs("bob");
  await appoint(bob.id);
  const { body: step } = await claude.publishOpen(stepFixture());
  await alice.answer(step.id, "q1", { option: "A" });
  await facilitator.close(step.id);

  assert.equal((await alice.state()).scoreboard, undefined);
  const bobView = await bob.state();
  assert.deepEqual(bobView.scoreboard.map((r) => [r.nickname, r.total]), [["alice", 1], ["bob", 0]]);
  assert.equal(bobView.statistics.length, 2);
  assert.equal(bobView.participants, undefined, "the appointment list stays reserved to the Facilitator");

  const byBob = (method, path, body = {}) => request(method, path, { body: { ...body, player: bob.id } });
  assert.equal((await byBob("PUT", "/api/session/prompt", { prompt: "x" })).status, 403);
  assert.equal((await byBob("PUT", "/api/session/live-distribution", { enabled: true })).status, 403);
  assert.equal((await byBob("POST", "/api/session/statistics")).status, 403);
  assert.equal((await alice.state()).statistics, undefined);
});

test("Co-facilitators stay appointed after a server restart", async () => {
  await claude.startSession();
  const alice = await joinAs("alice");
  await appoint(alice.id);
  await claude.publish(stepFixture());

  await server.close();
  server = await start({ port: 0, dir, token: TOKEN });
  assert.equal((await alice.state()).coFacilitator, true);
});

test("a Player finds the results of all closed Steps, most recent first, with their Vote", async () => {
  await claude.startSession();
  const alice = await joinAs("alice");
  assert.deepEqual((await alice.state()).results, []);

  const s1 = await claude.publishOpen(stepFixture(1));
  await alice.answer(s1.body.id, "q1", { option: "B" });
  await facilitator.close(s1.body.id);
  const content2 = stepFixture(2);
  content2.questions[0].id = "q2";
  content2.questions[0].title = "Stack";
  const s2 = await claude.publishOpen(content2);
  assert.deepEqual((await alice.state()).results.map((r) => r.number), [1], "an open Step has no results");

  await alice.answer(s2.body.id, "q2", { option: "A" });
  await facilitator.close(s2.body.id);
  const { results } = await alice.state();
  assert.deepEqual(results.map((r) => r.number), [2, 1]);
  const [q1] = results[1].questions;
  assert.deepEqual([q1.number, q1.title, q1.myVote, q1.result.selected], [1, "Where does the tool live", "B", "B"]);
  assert.equal(results[0].questions[0].result.selected, "A");
});

// --- Re-asked Question and single re-ask -------------------------------------

/** Plays Step 1 up to a split vote on q1, closed: q1 is then to re-ask. */
async function splitVoteOnQ1() {
  await claude.startSession();
  const alice = await joinAs("alice");
  const bob = await joinAs("bob");
  const { body: step } = await claude.publishOpen(threeOptionsStep());
  await alice.answer(step.id, "q1", { option: "A" });
  await bob.answer(step.id, "q1", { option: "C" });
  assert.equal((await facilitator.close(step.id)).body.questions[0].status, "to_reask");
  return { alice, bob };
}

function reaskedQuestion(id = "q2") {
  return { ...structuredClone(threeOptionsStep().questions[0]), id, reaskOf: "q1" };
}

test("a re-asked Question that ends in a tie again must be broken by the Facilitator", async () => {
  const { alice, bob } = await splitVoteOnQ1();
  const { body: step2 } = await claude.publishOpen({ ...stepFixture(2), questions: [reaskedQuestion()] });
  await alice.answer(step2.id, "q2", { option: "A" });
  await bob.answer(step2.id, "q2", { option: "C" });

  const without = await facilitator.close(step2.id);
  assert.equal(without.status, 409);
  assert.deepEqual(without.body.tied, [{ question: "q2", tiedOptions: ["A", "C"] }]);

  const withTiebreak = await facilitator.close(step2.id, { tiebreaks: { q2: "C" } });
  assert.equal(withTiebreak.status, 200);
  assert.equal(withTiebreak.body.questions[0].status, "selected");
  assert.equal(withTiebreak.body.questions[0].selected, "C");
});

test("a Question can only re-ask a to-re-ask Question from a closed Step", async () => {
  await claude.startSession();
  const alice = await joinAs("alice");
  const { body: step } = await claude.publishOpen(stepFixture());
  await alice.answer(step.id, "q1", { option: "A" });
  await facilitator.close(step.id); // q1 selected, not to re-ask

  const selected = await claude.publish({ ...stepFixture(2), questions: [reaskedQuestion()] });
  assert.equal(selected.status, 400);
  assert.match(selected.body.error ?? JSON.stringify(selected.body), /q1/);

  const unknown = await claude.publish({ ...stepFixture(2), questions: [{ ...reaskedQuestion(), reaskOf: "q9" }] });
  assert.equal(unknown.status, 400);
});

test("the Summary gives each Question's number and flags the Question that another re-asks", async () => {
  await splitVoteOnQ1();
  const { body: step2 } = await claude.publishOpen({ ...stepFixture(2), questions: [reaskedQuestion()] });
  await facilitator.close(step2.id); // no Vote: the recommended option is selected

  const { body } = await claude.end();
  const lines = body.summary.split("\n");
  assert.ok(lines.includes("- **Q1 · Where does the tool live**: to re-ask (split vote)"), body.summary);
  assert.ok(
    lines.includes("- **Q2 · Where does the tool live** (re-asked from Q1): Dedicated repository (recommended)"),
    body.summary,
  );
});

test("the Players' view gives the number of the Question that a Question re-asks", async () => {
  const { alice } = await splitVoteOnQ1();
  await claude.publishOpen({ ...stepFixture(2), questions: [reaskedQuestion()] });
  const [q2] = (await alice.state()).step.questions;
  assert.equal(q2.reaskOfNumber, 1);
});

test("a Question id already used in a previous Step is refused", async () => {
  await splitVoteOnQ1();
  const reused = await claude.publish({ ...stepFixture(2), questions: [reaskedQuestion("q1")] });
  assert.equal(reused.status, 400);
  assert.match(reused.body.error, /q1/);
});

test("a to-re-ask Question can only be re-asked once", async () => {
  await splitVoteOnQ1();
  const duplicate = await claude.publish({
    ...stepFixture(2),
    questions: [reaskedQuestion("q2"), reaskedQuestion("q3")],
  });
  assert.equal(duplicate.status, 400);

  const first = await claude.publish({ ...stepFixture(2), questions: [reaskedQuestion("q2")] });
  assert.equal(first.status, 201);
});

test("a re-asked Question can no longer be re-asked: re-asking happens only once", async () => {
  const { alice } = await splitVoteOnQ1();
  const { body: step2 } = await claude.publishOpen({ ...stepFixture(2), questions: [reaskedQuestion("q2")] });
  await alice.answer(step2.id, "q2", { option: "A" });

  const refusal = await facilitator.close(step2.id, { toReask: ["q2"] });
  assert.equal(refusal.status, 409);
  assert.match(refusal.body.error, /q2/);

  assert.equal((await facilitator.close(step2.id)).status, 200);
  const reask = await claude.publish({ ...stepFixture(3), questions: [reaskedQuestion("q3")] });
  assert.equal(reask.status, 400); // q1 is already re-asked by q2
});

// --- Robustness -------------------------------------------------------------

test("the server starts and ignores session files it cannot read", async () => {
  await server.close();
  await writeFile(join(dir, "old-format.json"), JSON.stringify({ id: "x", titre: "Séance", etapes: [], joueurs: [] }));
  await writeFile(join(dir, "truncated.json"), '{"id": "y", "title"');
  server = await start({ port: 0, dir, token: TOKEN });

  assert.deepEqual((await request("GET", "/api/state")).body, { session: null });
});

test("closing with malformed decisions is refused with 400, and the Step stays open", async () => {
  await claude.startSession();
  const { body: step } = await claude.publishOpen(stepFixture());

  assert.equal((await facilitator.close(step.id, { toReask: "q1" })).status, 400);
  assert.equal((await facilitator.close(step.id, { tiebreaks: null })).status, 400);
  assert.equal((await facilitator.close(step.id)).status, 200);
});

test("a Step needs whole-number progress fields", async () => {
  await claude.startSession();
  for (const bad of [{ settled: "six" }, { remaining: -1 }, { number: 1.5 }, { number: undefined }]) {
    const response = await claude.publish({ ...stepFixture(), ...bad });
    assert.equal(response.status, 400, JSON.stringify(bad));
  }
  assert.equal((await claude.publish(stepFixture())).status, 201);
});

test("starting a new Session releases the requests waiting for a result", async () => {
  await claude.startSession();
  const { body: step } = await claude.publishOpen(stepFixture());
  const waiting = claude.result(step.id, { wait: true });

  await claude.startSession("Another session");

  const released = await Promise.race([waiting, new Promise((resolve) => setTimeout(() => resolve("hung"), 1000))]);
  assert.notEqual(released, "hung");
  assert.equal(released.status, 409);
});

// --- Consensus levels ---------------------------------------------------------

function optionQuestion(id, options = ["A", "B", "C"]) {
  return { id, title: id, body: "", options: options.map((o) => ({ id: o, label: o })), recommended: options[0] };
}

/** Opens a Step with the given Questions, has Players vote (`votes[questionId]` = optionId per player), closes it. */
async function closedStep(questionIds, votesByQuestion, { players = 4, decisions = {} } = {}) {
  await claude.startSession();
  const { body: step } = await claude.publishOpen({
    number: 1,
    settled: 0,
    remaining: 4,
    questions: questionIds.map((id) => optionQuestion(id)),
  });
  const joined = [];
  for (let i = 0; i < players; i++) joined.push(await joinAs(`p${i}`));
  for (const [qid, votes] of Object.entries(votesByQuestion)) {
    for (const [i, option] of Object.entries(votes)) {
      await joined[i].answer(step.id, qid, { option });
    }
  }
  const before = await joined[0].state();
  assert.equal(before.step.questions[0].result, undefined, "no level before closing");
  assert.equal(before.step.consensus, undefined, "no Step figures before closing");
  assert.equal((await facilitator.close(step.id, decisions)).status, 200);
  const { body: result } = await claude.result(step.id);
  return { step, result, view: await joined[0].state() };
}

const levels = (result) => result.questions.map((q) => q.consensus);

test("a unanimous Question is at Consensus, one dissenting Vote is Near-consensus, any other spread is Divided", async () => {
  const { result } = await closedStep(["q1", "q2", "q3"], {
    q1: { 0: "A", 1: "A", 2: "A", 3: "A" },
    q2: { 0: "A", 1: "A", 2: "A", 3: "B" },
    q3: { 0: "A", 1: "A", 2: "B", 3: "B" },
  }, { decisions: { tiebreaks: { q3: "A" } } });
  assert.deepEqual(levels(result), ["consensus", "near_consensus", "divided"]);
});

test("a split vote and a Question to re-ask are Divided", async () => {
  const { result } = await closedStep(["q1", "q2"], {
    q1: { 0: "A", 1: "B" },
    q2: { 0: "A", 1: "A", 2: "A" },
  }, { decisions: { toReask: ["q2"] } });
  assert.equal(result.questions[0].status, "to_reask");
  assert.deepEqual(levels(result), ["divided", "divided"]);
});

test("Abstentions and unanswered Players do not change the level", async () => {
  const { result } = await closedStep(["q1", "q2"], {
    q1: { 0: "A", 1: "A", 2: null }, // 2 abstains explicitly, 3 never answers
    q2: { 0: "A", 1: "A", 2: "A", 3: "B" },
  });
  assert.deepEqual(levels(result), ["consensus", "near_consensus"]);
});

test("a Question with 0 or 1 voter is not assessed", async () => {
  const { result } = await closedStep(["q1", "q2"], { q2: { 0: "A" } });
  assert.deepEqual(levels(result), [undefined, undefined]);
});

test("Step figures count only assessed Questions; a Near-consensus is not unanimous; the flag needs all of them at Consensus", async () => {
  const mixed = await closedStep(["q1", "q2", "q3"], {
    q1: { 0: "A", 1: "A" },
    q2: { 0: "A", 1: "A", 2: "A", 3: "B" },
  });
  assert.deepEqual(mixed.result.consensus, { assessed: 2, atConsensus: 1, consensual: false });

  const { result } = await closedStep(["q1", "q2", "q3"], {
    q1: { 0: "A", 1: "A" },
    q2: { 0: "B", 1: "B", 2: "B" },
    q3: { 0: "C" },
  });
  assert.deepEqual(result.consensus, { assessed: 2, atConsensus: 2, consensual: true });
});

test("a Step with no assessed Question has no consensus status", async () => {
  const { result } = await closedStep(["q1"], { q1: { 0: "A" } });
  assert.deepEqual(result.consensus, { assessed: 0, atConsensus: 0 });
});

test("Players get the levels and Step figures in their views of closed Steps, same as Claude", async () => {
  const { result, view } = await closedStep(["q1", "q2"], {
    q1: { 0: "A", 1: "A", 2: "A" },
    q2: { 0: "A", 1: "A", 2: "A", 3: "B" },
  });
  assert.deepEqual(view.step.questions.map((q) => q.result.consensus), levels(result));
  assert.deepEqual(view.step.consensus, result.consensus);
  assert.deepEqual(view.results[0].consensus, result.consensus);
  assert.deepEqual(view.results[0].questions.map((q) => q.result.consensus), levels(result));
});
