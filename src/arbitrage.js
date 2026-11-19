// Arbitrage : tranche une Question à partir des Votes. Module pur, sans E/S.

/**
 * @param {{id: string, propositions: {id: string}[], recommandee: string}} question
 * @param {Record<string, string>} votes  joueurId → propositionId (absent = Abstention)
 * @param {{departage?: string, aReposer?: boolean, dejaReposee?: boolean}} [decisions]
 *   `dejaReposee` : la Question a déjà été reposée une fois ; une égalité se départage alors au lieu d'être reposée.
 */
export function trancher(question, votes, { departage, aReposer = false, dejaReposee = false } = {}) {
  const repartition = Object.fromEntries(question.propositions.map((p) => [p.id, 0]));
  for (const propositionId of Object.values(votes)) repartition[propositionId] += 1;
  if (aReposer) return { statut: "a_reposer", repartition };

  const max = Math.max(...Object.values(repartition));
  const enTete = Object.keys(repartition).filter((id) => repartition[id] === max);
  if (max === 0) return { statut: "retenue", retenue: question.recommandee, repartition };
  if (enTete.length === 1) return { statut: "retenue", retenue: enTete[0], repartition };
  if (!dejaReposee) return { statut: "a_reposer", partage: true, repartition };
  if (enTete.includes(departage)) return { statut: "retenue", retenue: departage, repartition };
  return { statut: "a_departager", exAequo: enTete, repartition };
}

export const BAREME_PAR_DEFAUT = Object.freeze({ point: 1 });

/**
 * Gains de chaque votant sur une Question tranchée. Une Abstention n'apparaît pas.
 * @returns {Record<string, {points: number}>}
 */
export function gains(question, votes, issue, bareme = BAREME_PAR_DEFAUT) {
  const resultat = {};
  for (const [joueurId, propositionId] of Object.entries(votes)) {
    const gagne = issue.statut === "retenue" && propositionId === issue.retenue;
    resultat[joueurId] = { points: gagne ? bareme.point : 0 };
  }
  return resultat;
}
