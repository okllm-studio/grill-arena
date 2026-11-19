// Session: in-memory state of a multiplayer grilling (Players, Steps, Votes, Comments).
import { randomUUID } from "node:crypto";
import { decide, gains, DEFAULT_SCALE } from "./arbitration.js";

/** Request refused by a rule of the Session; `httpStatus` is the HTTP code to return. */
export class Refusal extends Error {
  constructor(httpStatus, message, details = {}) {
    super(message);
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export class Session {
  constructor({ title, prompt = "", scale = DEFAULT_SCALE, startedAt = Date.now() }) {
    this.id = randomUUID();
    this.startedAt = startedAt;
    this.scale = scale;
    this.title = title;
    this.prompt = prompt;
    this.players = [];
    this.steps = [];
    this.ended = false;
    /** The Facilitator published the statistics before the end of the Session. */
    this.statisticsPublished = false;
    /** The distribution of Votes is shown before closing, once half of the Players have voted. */
    this.liveDistribution = false;
    /** Ids of the Players the Facilitator appointed to open and close Steps in their place. */
    this.coFacilitators = [];
  }

  /** `resume`: a nickname already taken returns its Player instead of being refused. Returns `{player, created}`. */
  join(nickname, { resume = false } = {}) {
    nickname = String(nickname ?? "").trim();
    if (!nickname) throw new Refusal(400, "Empty nickname");
    const existing = this.players.find((p) => p.nickname.toLowerCase() === nickname.toLowerCase());
    if (existing) {
      if (!resume) throw new Refusal(409, `Nickname "${nickname}" already taken`);
      return { player: existing, created: false };
    }
    const player = { id: randomUUID(), nickname };
    this.players.push(player);
    return { player, created: true };
  }

  /** The initial prompt can be edited until the first Step is opened. */
  get promptLocked() {
    return this.steps.length > 0 && this.steps[0].state !== "pending";
  }

  /** Sets whether the live distribution is shown; frozen when Step 1 is opened. */
  configure({ liveDistribution }) {
    if (this.promptLocked) throw new Refusal(409, "Setting locked: Step 1 is open");
    this.liveDistribution = liveDistribution === true;
  }

  /** Replaces the initial prompt, shown to Players until it is locked. */
  setPrompt(prompt) {
    if (this.promptLocked) throw new Refusal(409, "Prompt locked: Step 1 is open");
    this.prompt = String(prompt ?? "");
  }

  publish({ number, settled, remaining, questions }) {
    if (this.ended) throw new Refusal(409, "Session ended");
    if (this.currentStep && this.currentStep.state !== "closed") throw new Refusal(409, "The previous Step is not closed");
    for (const [field, value] of Object.entries({ number, settled, remaining })) {
      if (!Number.isInteger(value) || value < 0) throw new Refusal(400, `${field} must be a non-negative integer`);
    }
    validateQuestions(questions);
    this.validateReasks(questions);
    const step = {
      id: randomUUID(),
      number,
      settled,
      remaining,
      questions: numberQuestions(questions, this.steps),
      state: "pending",
      // questionId → playerId → optionId / text
      votes: Object.fromEntries(questions.map((q) => [q.id, {}])),
      comments: Object.fromEntries(questions.map((q) => [q.id, {}])),
    };
    this.steps.push(step);
    return step;
  }

  /**
   * A re-asked Question names a Question to re-ask from a closed Step, not yet re-asked;
   * ids are unique across the whole Session.
   */
  validateReasks(questions) {
    const existing = this.steps.flatMap((s) => s.questions);
    const reasked = new Set(existing.map((q) => q.reaskOf).filter(Boolean));
    for (const q of questions) {
      if (existing.some((e) => e.id === q.id)) throw new Refusal(400, `Question ${q.id}: id already used in the Session`);
      if (q.reaskOf === undefined) continue;
      const reaskable = this.steps.some(
        (s) => s.state === "closed" && s.questions.some((e) => e.id === q.reaskOf && s.outcomes[e.id].status === "to_reask"),
      );
      if (!reaskable) throw new Refusal(400, `Question ${q.id}: ${q.reaskOf} is not a question to re-ask`);
      if (reasked.has(q.reaskOf)) throw new Refusal(400, `Question ${q.id}: ${q.reaskOf} is already re-asked`);
      reasked.add(q.reaskOf);
    }
  }

  /**
   * Sets, changes or removes a Player's Vote and/or Comment.
   * `option: null` = Abstention; `comment: ""` = erased; absent field = unchanged.
   */
  answer(stepId, questionId, playerId, { option, comment }) {
    const step = this.step(stepId);
    if (step.state === "pending") throw new Refusal(409, "Step not open yet");
    if (step.state === "closed") throw new Refusal(409, "Step closed");
    const question = step.questions.find((q) => q.id === questionId);
    if (!question) throw new Refusal(404, "Unknown question");
    this.player(playerId);
    if (option != null && !question.options.some((o) => o.id === option)) {
      throw new Refusal(400, "Unknown option");
    }
    if (option !== undefined) {
      if (option === null) delete step.votes[questionId][playerId];
      else step.votes[questionId][playerId] = option;
    }
    if (comment !== undefined) {
      if (comment === "") delete step.comments[questionId][playerId];
      else step.comments[questionId][playerId] = comment;
    }
  }

  /** Opens the vote of a published Step: the only transition from "pending" to "open". */
  open(stepId) {
    const step = this.step(stepId);
    if (step.state !== "pending") throw new Refusal(409, "Step already open or closed");
    step.state = "open";
  }

  /**
   * Closes a Step with the Facilitator's decisions.
   * @param {{tiebreaks?: Record<string, string>, toReask?: string[]}} decisions
   */
  close(stepId, { tiebreaks = {}, toReask = [] } = {}) {
    const step = this.step(stepId);
    if (step.state !== "open") throw new Refusal(409, "Step not open");
    if (!Array.isArray(toReask)) throw new Refusal(400, "toReask must be a list of question ids");
    if (tiebreaks === null || typeof tiebreaks !== "object" || Array.isArray(tiebreaks)) {
      throw new Refusal(400, "tiebreaks must map question ids to option ids");
    }
    const alreadyReasked = step.questions.find((q) => q.reaskOf && toReask.includes(q.id));
    if (alreadyReasked) throw new Refusal(409, `Question ${alreadyReasked.id} already re-asked once: a question is re-asked only once`);
    const outcomes = Object.fromEntries(
      step.questions.map((q) => [
        q.id,
        decide(q, step.votes[q.id], {
          tiebreak: tiebreaks[q.id],
          toReask: toReask.includes(q.id),
          alreadyReasked: Boolean(q.reaskOf),
        }),
      ]),
    );
    const tied = Object.entries(outcomes)
      .filter(([, outcome]) => outcome.status === "tie")
      .map(([question, outcome]) => ({ question, tiedOptions: outcome.tiedOptions }));
    if (tied.length) throw new Refusal(409, "Tie to break", { tied });

    step.outcomes = outcomes;
    step.gains = {};
    for (const q of step.questions) {
      for (const [playerId, g] of Object.entries(gains(q, step.votes[q.id], step.outcomes[q.id], this.scale))) {
        const total = (step.gains[playerId] ??= { points: 0 });
        total.points += g.points;
      }
    }
    step.state = "closed";
  }

  /** Result of a closed Step, as Claude receives it. */
  result(stepId) {
    const step = this.step(stepId);
    return {
      step: { id: step.id, number: step.number },
      questions: step.questions.map((q) => this.questionResult(step, q)),
      scoreboard: this.scoreboard(),
    };
  }

  questionResult(step, question) {
    const outcome = step.outcomes[question.id];
    const votes = step.votes[question.id];
    return {
      id: question.id,
      number: question.number,
      status: outcome.status,
      ...(outcome.status === "selected" && { selected: outcome.selected }),
      ...(outcome.split && { split: true }),
      distribution: outcome.distribution,
      abstentions: this.players.filter((p) => !(p.id in votes)).length,
      comments: this.players
        .filter((p) => p.id in step.comments[question.id])
        .map((p) => ({ nickname: p.nickname, text: step.comments[question.id][p.id] })),
    };
  }

  /** Scoreboard, from the best total to the lowest. */
  scoreboard() {
    const closed = this.steps.filter((s) => s.state === "closed");
    const last = closed.at(-1);
    return this.players
      .map((p) => {
        let points = 0;
        for (const s of closed) points += s.gains[p.id]?.points ?? 0;
        return { nickname: p.nickname, points, total: points, stepGain: last?.gains[p.id]?.points ?? 0 };
      })
      .sort((a, b) => b.total - a.total || a.nickname.localeCompare(b.nickname));
  }

  /** Number of Votes per Option of a Question, without Abstentions. */
  distributionOf(step, question) {
    const distribution = Object.fromEntries(question.options.map((o) => [o.id, 0]));
    for (const option of Object.values(step.votes[question.id])) distribution[option] += 1;
    return distribution;
  }

  appointCoFacilitator(playerId) {
    this.player(playerId);
    if (!this.coFacilitators.includes(playerId)) this.coFacilitators.push(playerId);
  }

  revokeCoFacilitator(playerId) {
    this.coFacilitators = this.coFacilitators.filter((id) => id !== playerId);
  }

  isCoFacilitator(playerId) {
    return this.coFacilitators.includes(playerId);
  }

  player(playerId) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) throw new Refusal(404, "Unknown player");
    return player;
  }

  /** Participation statistics over the closed Steps: Votes, Comments and Abstentions per Player. */
  statistics() {
    const closed = this.steps.filter((s) => s.state === "closed");
    return this.players.map((p) => {
      const stats = { nickname: p.nickname, votes: 0, comments: 0, abstentions: 0 };
      for (const s of closed) {
        for (const q of s.questions) {
          if (p.id in s.votes[q.id]) stats.votes += 1;
          else stats.abstentions += 1;
          if (p.id in s.comments[q.id]) stats.comments += 1;
        }
      }
      return stats;
    });
  }

  /** Publishes the Scoreboard and the statistics to all Players, without waiting for the end. */
  publishStatistics() {
    this.statisticsPublished = true;
  }

  /** Ends the Session and returns the Summary as Markdown. */
  end() {
    if (this.currentStep && this.currentStep.state !== "closed") throw new Refusal(409, "A Step is not closed");
    this.ended = true;
    return this.summary();
  }

  summary() {
    const lines = [`# Summary: ${this.title}`, ""];
    for (const step of this.steps.filter((s) => s.state === "closed")) {
      lines.push(`## Step ${step.number}`, "");
      for (const q of step.questions) {
        const outcome = step.outcomes[q.id];
        const heading = `**Q${q.number} · ${q.title}**${q.reaskOf ? ` (re-asked from Q${this.question(q.reaskOf).number})` : ""}`;
        if (outcome.status === "to_reask") {
          lines.push(`- ${heading}: to re-ask${outcome.split ? " (split vote)" : ""}`);
          continue;
        }
        const label = q.options.find((o) => o.id === outcome.selected).label;
        const nature = outcome.selected === q.recommended ? "recommended" : "not recommended";
        lines.push(`- ${heading}: ${label} (${nature})`);
      }
      lines.push("");
    }
    lines.push("## Scoreboard", "");
    this.scoreboard().forEach((row, i) => {
      lines.push(`${i + 1}. ${row.nickname}: ${row.total} (${plural(row.points, "Point")})`);
    });
    return lines.join("\n") + "\n";
  }

  question(questionId) {
    return this.steps.flatMap((s) => s.questions).find((q) => q.id === questionId);
  }

  step(stepId) {
    const step = this.steps.find((s) => s.id === stepId);
    if (!step) throw new Refusal(404, "Unknown step");
    return step;
  }

  get currentStep() {
    return this.steps.at(-1);
  }

  /** Complete state, for Storage. */
  toJSON() {
    const { id, title, prompt, startedAt, scale, players, steps, ended, statisticsPublished, liveDistribution, coFacilitators } = this;
    return { id, title, prompt, startedAt, scale, players, steps, ended, statisticsPublished, liveDistribution, coFacilitators };
  }

  static restore(data) {
    return Object.assign(Object.create(Session.prototype), data);
  }

  /** What a Player is allowed to see. */
  viewFor(playerId, { facilitator = false } = {}) {
    const step = this.currentStep;
    return {
      session: {
        id: this.id,
        title: this.title,
        ...((!this.promptLocked || facilitator) && { prompt: this.prompt ?? "" }),
        promptLocked: this.promptLocked,
        liveDistribution: this.liveDistribution === true,
        statisticsPublished: this.statisticsPublished === true,
        ended: this.ended,
        ...(this.ended && { summary: this.summary() }),
      },
      players: this.players.length,
      coFacilitator: this.isCoFacilitator(playerId),
      ...(facilitator && {
        participants: this.players.map((p) => ({ id: p.id, nickname: p.nickname, coFacilitator: this.isCoFacilitator(p.id) })),
      }),
      ...((this.ended || this.statisticsPublished || facilitator || this.isCoFacilitator(playerId)) && {
        scoreboard: this.scoreboard(),
        statistics: this.statistics(),
      }),
      step: step && {
        id: step.id,
        number: step.number,
        settled: step.settled,
        remaining: step.remaining,
        state: step.state,
        open: step.state === "open",
        questions: (step.state === "pending" ? [] : step.questions).map((q) => {
          const voters = Object.keys(step.votes[q.id]).length;
          return {
            id: q.id,
            number: q.number,
            reaskOfNumber: q.reaskOf && this.question(q.reaskOf).number,
            title: q.title,
            body: q.body,
            options: q.options,
            recommended: q.recommended,
            voters,
            myVote: step.votes[q.id][playerId] ?? null,
            myComment: step.comments[q.id][playerId] ?? "",
            ...(step.state === "open" &&
              this.liveDistribution &&
              voters * 2 >= this.players.length && { distribution: this.distributionOf(step, q) }),
            ...(step.state === "closed" && { result: this.questionResult(step, q) }),
          };
        }),
      },
      // All closed Steps, most recent first.
      results: this.steps
        .filter((s) => s.state === "closed")
        .reverse()
        .map((s) => ({
          id: s.id,
          number: s.number,
          questions: s.questions.map((q) => ({
            id: q.id,
            number: q.number,
            title: q.title,
            options: q.options,
            recommended: q.recommended,
            myVote: s.votes[q.id][playerId] ?? null,
            result: this.questionResult(s, q),
          })),
        })),
    };
  }
}

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) throw new Refusal(400, "Step without questions");
  const ids = new Set();
  for (const q of questions) {
    if (!q?.id) throw new Refusal(400, "Question without id");
    if (ids.has(q.id)) throw new Refusal(400, `Question ${q.id} duplicated`);
    ids.add(q.id);
    if (!Array.isArray(q.options) || q.options.length === 0) {
      throw new Refusal(400, `Question ${q.id} without options`);
    }
    const optionIds = new Set(q.options.map((o) => o?.id));
    if (optionIds.size !== q.options.length || optionIds.has(undefined)) {
      throw new Refusal(400, `Question ${q.id}: options without id or duplicated`);
    }
    if (!q.recommended) throw new Refusal(400, `Question ${q.id} without recommended option`);
    if (!optionIds.has(q.recommended)) {
      throw new Refusal(400, `Question ${q.id}: the recommended ${q.recommended} is not an option`);
    }
  }
}

/** Gives each Question its Number, continuous over the Session. */
function numberQuestions(questions, previousSteps) {
  const already = previousSteps.reduce((n, s) => n + s.questions.length, 0);
  return questions.map((q, i) => ({ ...q, number: already + i + 1 }));
}

function plural(n, word) {
  return `${n} ${n === 1 ? word : word + "s"}`;
}
