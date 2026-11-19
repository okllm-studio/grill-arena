import { test } from "node:test";
import assert from "node:assert/strict";
import { trancher, gains } from "../src/arbitrage.js";

// Question type : trois Propositions, B recommandée.
const question = {
  id: "q1",
  propositions: [{ id: "A" }, { id: "B" }, { id: "C" }],
  recommandee: "B",
};

test("la Proposition qui a le plus de Votes est retenue", () => {
  const issue = trancher(question, { alice: "A", bob: "A", carol: "B" });
  assert.equal(issue.statut, "retenue");
  assert.equal(issue.retenue, "A");
  assert.deepEqual(issue.repartition, { A: 2, B: 1, C: 0 });
});

test("sans aucun Vote, la Proposition recommandée est retenue", () => {
  const issue = trancher(question, {});
  assert.equal(issue.statut, "retenue");
  assert.equal(issue.retenue, "B");
});

test("un partage des Votes incluant la recommandée est renvoyé à l'oral", () => {
  const issue = trancher(question, { alice: "A", bob: "B" });
  assert.equal(issue.statut, "a_reposer");
  assert.equal(issue.retenue, undefined);
  assert.deepEqual(issue.repartition, { A: 1, B: 1, C: 0 });
});

test("un partage des Votes sans la recommandée est aussi renvoyé à l'oral", () => {
  const issue = trancher(question, { alice: "A", bob: "C", carol: "B", dan: "A", eve: "C" });
  assert.equal(issue.statut, "a_reposer");
  assert.equal(issue.retenue, undefined);
});

test("après une repose, une égalité reste à départager par l'Animateur", () => {
  const votes = { alice: "A", bob: "C", carol: "A", dan: "C" };
  const issue = trancher(question, votes, { dejaReposee: true });
  assert.equal(issue.statut, "a_departager");
  assert.deepEqual(issue.exAequo, ["A", "C"]);
});

test("après une repose, le départage de l'Animateur tranche l'égalité, même avec la recommandée", () => {
  const votes = { alice: "A", bob: "B" };
  const issue = trancher(question, votes, { dejaReposee: true, departage: "A" });
  assert.equal(issue.statut, "retenue");
  assert.equal(issue.retenue, "A");
});

test("une Question marquée à reposer n'a pas de Proposition retenue", () => {
  const issue = trancher(question, { alice: "A", bob: "A" }, { aReposer: true });
  assert.equal(issue.statut, "a_reposer");
  assert.equal(issue.retenue, undefined);
  assert.deepEqual(issue.repartition, { A: 2, B: 0, C: 0 });
});

test("voter pour la Proposition retenue rapporte un Point", () => {
  const votes = { alice: "B", bob: "B", carol: "A" };
  const issue = trancher(question, votes);
  assert.deepEqual(gains(question, votes, issue), {
    alice: { points: 1 },
    bob: { points: 1 },
    carol: { points: 0 },
  });
});

test("voter pour une Proposition retenue non recommandée ne rapporte pas plus", () => {
  const votes = { alice: "A", bob: "A", carol: "B" };
  const issue = trancher(question, votes);
  assert.deepEqual(gains(question, votes, issue), {
    alice: { points: 1 },
    bob: { points: 1 },
    carol: { points: 0 },
  });
});

test("une Question à reposer ne rapporte de Point à personne", () => {
  const votes = { alice: "A", bob: "A" };
  const issue = trancher(question, votes, { aReposer: true });
  assert.deepEqual(gains(question, votes, issue), {
    alice: { points: 0 },
    bob: { points: 0 },
  });
});

test("le barème du Point est configurable", () => {
  const votes = { alice: "C" };
  const issue = trancher(question, votes);
  assert.deepEqual(gains(question, votes, issue, { point: 2 }), { alice: { points: 2 } });
});
