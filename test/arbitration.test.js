import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, gains, DEFAULT_SCALE } from "../src/arbitration.js";

// Sample Question: three options, B recommended.
const question = {
  id: "q1",
  options: [{ id: "A" }, { id: "B" }, { id: "C" }],
  recommended: "B",
};

test("the option with the most Votes is selected", () => {
  const outcome = decide(question, { alice: "A", bob: "A", carol: "B" });
  assert.equal(outcome.status, "selected");
  assert.equal(outcome.selected, "A");
  assert.deepEqual(outcome.distribution, { A: 2, B: 1, C: 0 });
});

test("with no Votes at all, the recommended option is selected", () => {
  const outcome = decide(question, {});
  assert.equal(outcome.status, "selected");
  assert.equal(outcome.selected, "B");
});

test("a split vote including the recommended option is sent back to be re-asked", () => {
  const outcome = decide(question, { alice: "A", bob: "B" });
  assert.equal(outcome.status, "to_reask");
  assert.equal(outcome.split, true);
  assert.equal(outcome.selected, undefined);
  assert.deepEqual(outcome.distribution, { A: 1, B: 1, C: 0 });
});

test("a split vote without the recommended option is also sent back to be re-asked", () => {
  const outcome = decide(question, { alice: "A", bob: "C", carol: "B", dan: "A", eve: "C" });
  assert.equal(outcome.status, "to_reask");
  assert.equal(outcome.selected, undefined);
});

test("once re-asked, a tie is left for the facilitator to break", () => {
  const votes = { alice: "A", bob: "C", carol: "A", dan: "C" };
  const outcome = decide(question, votes, { alreadyReasked: true });
  assert.equal(outcome.status, "tie");
  assert.deepEqual(outcome.tiedOptions, ["A", "C"]);
});

test("once re-asked, the facilitator's tiebreak settles the tie, even with the recommended option", () => {
  const votes = { alice: "A", bob: "B" };
  const outcome = decide(question, votes, { alreadyReasked: true, tiebreak: "A" });
  assert.equal(outcome.status, "selected");
  assert.equal(outcome.selected, "A");
});

test("a Question marked to re-ask has no selected option", () => {
  const outcome = decide(question, { alice: "A", bob: "A" }, { toReask: true });
  assert.equal(outcome.status, "to_reask");
  assert.equal(outcome.selected, undefined);
  assert.deepEqual(outcome.distribution, { A: 2, B: 0, C: 0 });
});

test("voting for the selected option earns a Point", () => {
  const votes = { alice: "B", bob: "B", carol: "A" };
  const outcome = decide(question, votes);
  assert.deepEqual(gains(question, votes, outcome), {
    alice: { points: 1 },
    bob: { points: 1 },
    carol: { points: 0 },
  });
});

test("voting for a selected option that is not the recommended one earns no more", () => {
  const votes = { alice: "A", bob: "A", carol: "B" };
  const outcome = decide(question, votes);
  assert.deepEqual(gains(question, votes, outcome), {
    alice: { points: 1 },
    bob: { points: 1 },
    carol: { points: 0 },
  });
});

test("a Question to re-ask earns nobody a Point", () => {
  const votes = { alice: "A", bob: "A" };
  const outcome = decide(question, votes, { toReask: true });
  assert.deepEqual(gains(question, votes, outcome), {
    alice: { points: 0 },
    bob: { points: 0 },
  });
});

test("the Point scale is configurable", () => {
  const votes = { alice: "C" };
  const outcome = decide(question, votes);
  assert.deepEqual(gains(question, votes, outcome, { point: 2 }), { alice: { points: 2 } });
});

test("the default scale gives one Point", () => {
  assert.equal(DEFAULT_SCALE.point, 1);
});
