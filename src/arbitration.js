// Arbitration: decides a Question from the Votes. Pure module, no I/O.

/**
 * @param {{id: string, options: {id: string}[], recommended: string}} question
 * @param {Record<string, string>} votes  playerId → optionId (absent = Abstention)
 * @param {{tiebreak?: string, toReask?: boolean, alreadyReasked?: boolean}} [decisions]
 *   `alreadyReasked`: the Question has already been re-asked once; a tie is then broken instead of re-asked.
 */
export function decide(question, votes, { tiebreak, toReask = false, alreadyReasked = false } = {}) {
  const distribution = Object.fromEntries(question.options.map((o) => [o.id, 0]));
  for (const optionId of Object.values(votes)) distribution[optionId] += 1;
  if (toReask) return { status: "to_reask", distribution };

  const max = Math.max(...Object.values(distribution));
  const leaders = Object.keys(distribution).filter((id) => distribution[id] === max);
  if (max === 0) return { status: "selected", selected: question.recommended, distribution };
  if (leaders.length === 1) return { status: "selected", selected: leaders[0], distribution };
  if (!alreadyReasked) return { status: "to_reask", split: true, distribution };
  if (leaders.includes(tiebreak)) return { status: "selected", selected: tiebreak, distribution };
  return { status: "tie", tiedOptions: leaders, distribution };
}

export const DEFAULT_SCALE = Object.freeze({ point: 1 });

/**
 * Gains of each voter on a decided Question. An Abstention does not appear.
 * @returns {Record<string, {points: number}>}
 */
export function gains(question, votes, outcome, scale = DEFAULT_SCALE) {
  const result = {};
  for (const [playerId, optionId] of Object.entries(votes)) {
    const won = outcome.status === "selected" && optionId === outcome.selected;
    result[playerId] = { points: won ? scale.point : 0 };
  }
  return result;
}
