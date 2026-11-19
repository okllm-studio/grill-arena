// Séance : état en mémoire d'un grilling multijoueur (Joueurs, Étapes, Votes, Commentaires).
import { randomUUID } from "node:crypto";
import { trancher, gains, BAREME_PAR_DEFAUT } from "./arbitrage.js";

/** Demande refusée par une règle de la Séance ; `statut` est le code HTTP à renvoyer. */
export class Refus extends Error {
  constructor(statut, message, details = {}) {
    super(message);
    this.statut = statut;
    this.details = details;
  }
}

export class Seance {
  constructor({ titre, prompt = "", bareme = BAREME_PAR_DEFAUT, demarreeLe = Date.now() }) {
    this.id = randomUUID();
    this.demarreeLe = demarreeLe;
    this.bareme = bareme;
    this.titre = titre;
    this.prompt = prompt;
    this.joueurs = [];
    this.etapes = [];
    this.terminee = false;
    /** L'Animateur a publié les statistiques avant la fin de la Séance. */
    this.statistiquesPubliees = false;
    /** La répartition des Votes s'affiche avant la clôture, à partir de la moitié des votants. */
    this.repartitionEnDirect = false;
    /** Identifiants des Joueurs que l'Animateur a désignés pour ouvrir et clore les Étapes à sa place. */
    this.coAnimateurs = [];
  }

  /** `reprendre` : un pseudo déjà pris rend son Joueur au lieu d'être refusé. Renvoie `{joueur, cree}`. */
  rejoindre(pseudo, { reprendre = false } = {}) {
    pseudo = String(pseudo ?? "").trim();
    if (!pseudo) throw new Refus(400, "Pseudo vide");
    const existant = this.joueurs.find((j) => j.pseudo.toLowerCase() === pseudo.toLowerCase());
    if (existant) {
      if (!reprendre) throw new Refus(409, `Pseudo « ${pseudo} » déjà pris`);
      return { joueur: existant, cree: false };
    }
    const joueur = { id: randomUUID(), pseudo };
    this.joueurs.push(joueur);
    return { joueur, cree: true };
  }

  /** Le prompt initial est modifiable jusqu'à l'Ouverture de la première Étape. */
  get promptVerrouille() {
    return this.etapes.length > 0 && this.etapes[0].etat !== "en_attente";
  }

  /** Règle l'affichage de la répartition en direct ; figé à l'Ouverture de l'Étape 1. */
  regler({ repartitionEnDirect }) {
    if (this.promptVerrouille) throw new Refus(409, "Réglage verrouillé : l'Étape 1 est ouverte");
    this.repartitionEnDirect = repartitionEnDirect === true;
  }

  /** Remplace le prompt initial, affiché aux Joueurs jusqu'au verrou. */
  definirPrompt(prompt) {
    if (this.promptVerrouille) throw new Refus(409, "Prompt verrouillé : l'Étape 1 est ouverte");
    this.prompt = String(prompt ?? "");
  }

  publier({ numero, tranchees, aVenir, questions }) {
    if (this.terminee) throw new Refus(409, "Séance terminée");
    if (this.etapeCourante && this.etapeCourante.etat !== "close") throw new Refus(409, "L'Étape précédente n'est pas close");
    validerQuestions(questions);
    this.validerReprises(questions);
    const etape = {
      id: randomUUID(),
      numero,
      tranchees,
      aVenir,
      questions: numeroter(questions, this.etapes),
      etat: "en_attente",
      // questionId → joueurId → propositionId / texte
      votes: Object.fromEntries(questions.map((q) => [q.id, {}])),
      commentaires: Object.fromEntries(questions.map((q) => [q.id, {}])),
    };
    this.etapes.push(etape);
    return etape;
  }

  /**
   * Une Question reprise désigne une Question à reposer d'une Étape close, non encore reprise ;
   * les identifiants sont uniques sur toute la Séance.
   */
  validerReprises(questions) {
    const existantes = this.etapes.flatMap((e) => e.questions);
    const reprises = new Set(existantes.map((p) => p.reprise).filter(Boolean));
    for (const q of questions) {
      if (existantes.some((p) => p.id === q.id)) throw new Refus(400, `Question ${q.id} : identifiant déjà utilisé dans la Séance`);
      if (q.reprise === undefined) continue;
      const reposable = this.etapes.some(
        (e) => e.etat === "close" && e.questions.some((p) => p.id === q.reprise && e.issues[p.id].statut === "a_reposer"),
      );
      if (!reposable) throw new Refus(400, `Question ${q.id} : ${q.reprise} n'est pas une Question à reposer`);
      if (reprises.has(q.reprise)) throw new Refus(400, `Question ${q.id} : ${q.reprise} est déjà reprise`);
      reprises.add(q.reprise);
    }
  }

  /**
   * Pose, change ou retire le Vote et/ou le Commentaire d'un Joueur.
   * `proposition: null` = Abstention ; `commentaire: ""` = effacé ; champ absent = inchangé.
   */
  repondre(etapeId, questionId, joueurId, { proposition, commentaire }) {
    const etape = this.etape(etapeId);
    if (etape.etat === "en_attente") throw new Refus(409, "Étape pas encore ouverte");
    if (etape.etat === "close") throw new Refus(409, "Étape close");
    const question = etape.questions.find((q) => q.id === questionId);
    if (!question) throw new Refus(404, "Question inconnue");
    this.joueur(joueurId);
    if (proposition != null && !question.propositions.some((p) => p.id === proposition)) {
      throw new Refus(400, "Proposition inconnue");
    }
    if (proposition !== undefined) {
      if (proposition === null) delete etape.votes[questionId][joueurId];
      else etape.votes[questionId][joueurId] = proposition;
    }
    if (commentaire !== undefined) {
      if (commentaire === "") delete etape.commentaires[questionId][joueurId];
      else etape.commentaires[questionId][joueurId] = commentaire;
    }
  }

  /** Ouvre le vote d'une Étape publiée : seul passage de « en attente » à « ouverte ». */
  ouvrir(etapeId) {
    const etape = this.etape(etapeId);
    if (etape.etat !== "en_attente") throw new Refus(409, "Étape déjà ouverte ou close");
    etape.etat = "ouverte";
  }

  /**
   * Clôt une Étape avec les décisions de l'Animateur.
   * @param {{departages?: Record<string, string>, aReposer?: string[]}} decisions
   */
  clore(etapeId, { departages = {}, aReposer = [] } = {}) {
    const etape = this.etape(etapeId);
    if (etape.etat !== "ouverte") throw new Refus(409, "Étape non ouverte");
    const dejaReprise = etape.questions.find((q) => q.reprise && aReposer.includes(q.id));
    if (dejaReprise) throw new Refus(409, `Question ${dejaReprise.id} déjà reposée une fois : la repose est unique`);
    const issues = Object.fromEntries(
      etape.questions.map((q) => [
        q.id,
        trancher(q, etape.votes[q.id], {
          departage: departages[q.id],
          aReposer: aReposer.includes(q.id),
          dejaReposee: Boolean(q.reprise),
        }),
      ]),
    );
    const aDepartager = Object.entries(issues)
      .filter(([, issue]) => issue.statut === "a_departager")
      .map(([question, issue]) => ({ question, exAequo: issue.exAequo }));
    if (aDepartager.length) throw new Refus(409, "Ex æquo à départager", { aDepartager });

    etape.issues = issues;
    etape.gains = {};
    for (const q of etape.questions) {
      for (const [joueurId, g] of Object.entries(gains(q, etape.votes[q.id], etape.issues[q.id], this.bareme))) {
        const cumul = (etape.gains[joueurId] ??= { points: 0 });
        cumul.points += g.points;
      }
    }
    etape.etat = "close";
  }

  /** Résultat d'une Étape close, tel que le reçoit Claude. */
  resultat(etapeId) {
    const etape = this.etape(etapeId);
    return {
      etape: { id: etape.id, numero: etape.numero },
      questions: etape.questions.map((q) => this.resultatQuestion(etape, q)),
      tableau: this.tableau(),
    };
  }

  resultatQuestion(etape, question) {
    const issue = etape.issues[question.id];
    const votes = etape.votes[question.id];
    return {
      id: question.id,
      numero: question.numero,
      statut: issue.statut,
      ...(issue.statut === "retenue" && { retenue: issue.retenue }),
      ...(issue.partage && { partage: true }),
      repartition: issue.repartition,
      abstentions: this.joueurs.filter((j) => !(j.id in votes)).length,
      commentaires: this.joueurs
        .filter((j) => j.id in etape.commentaires[question.id])
        .map((j) => ({ pseudo: j.pseudo, texte: etape.commentaires[question.id][j.id] })),
    };
  }

  /** Tableau des scores, du meilleur total au moins bon. */
  tableau() {
    const closes = this.etapes.filter((e) => e.etat === "close");
    const derniere = closes.at(-1);
    return this.joueurs
      .map((j) => {
        let points = 0;
        for (const e of closes) points += e.gains[j.id]?.points ?? 0;
        return { pseudo: j.pseudo, points, total: points, gainEtape: derniere?.gains[j.id]?.points ?? 0 };
      })
      .sort((a, b) => b.total - a.total || a.pseudo.localeCompare(b.pseudo));
  }

  /** Nombre de Votes par Proposition d'une Question, sans les Abstentions. */
  repartitionEn(etape, question) {
    const repartition = Object.fromEntries(question.propositions.map((p) => [p.id, 0]));
    for (const proposition of Object.values(etape.votes[question.id])) repartition[proposition] += 1;
    return repartition;
  }

  designerCoAnimateur(joueurId) {
    this.joueur(joueurId);
    if (!this.coAnimateurs.includes(joueurId)) this.coAnimateurs.push(joueurId);
  }

  revoquerCoAnimateur(joueurId) {
    this.coAnimateurs = this.coAnimateurs.filter((id) => id !== joueurId);
  }

  estCoAnimateur(joueurId) {
    return this.coAnimateurs.includes(joueurId);
  }

  joueur(joueurId) {
    const joueur = this.joueurs.find((j) => j.id === joueurId);
    if (!joueur) throw new Refus(404, "Joueur inconnu");
    return joueur;
  }

  /** Statistiques de participation sur les Étapes closes : Votes, Commentaires et Abstentions par Joueur. */
  statistiques() {
    const closes = this.etapes.filter((e) => e.etat === "close");
    return this.joueurs.map((j) => {
      const stats = { pseudo: j.pseudo, votes: 0, commentaires: 0, abstentions: 0 };
      for (const e of closes) {
        for (const q of e.questions) {
          if (j.id in e.votes[q.id]) stats.votes += 1;
          else stats.abstentions += 1;
          if (j.id in e.commentaires[q.id]) stats.commentaires += 1;
        }
      }
      return stats;
    });
  }

  /** Publie le Tableau et les statistiques à tous les Joueurs, sans attendre la fin. */
  publierStatistiques() {
    this.statistiquesPubliees = true;
  }

  /** Termine la Séance et renvoie le Récapitulatif en Markdown. */
  terminer() {
    if (this.etapeCourante && this.etapeCourante.etat !== "close") throw new Refus(409, "Une Étape n'est pas close");
    this.terminee = true;
    return this.recapitulatif();
  }

  recapitulatif() {
    const lignes = [`# Récapitulatif : ${this.titre}`, ""];
    for (const etape of this.etapes.filter((e) => e.etat === "close")) {
      lignes.push(`## Étape ${etape.numero}`, "");
      for (const q of etape.questions) {
        const issue = etape.issues[q.id];
        const titre = `**Q${q.numero} · ${q.titre}**${q.reprise ? ` (reprise de Q${this.question(q.reprise).numero})` : ""}`;
        if (issue.statut === "a_reposer") {
          lignes.push(`- ${titre} : à reposer${issue.partage ? " (partage des Votes)" : ""}`);
          continue;
        }
        const libelle = q.propositions.find((p) => p.id === issue.retenue).libelle;
        const nature = issue.retenue === q.recommandee ? "recommandée" : "non recommandée";
        lignes.push(`- ${titre} : ${libelle} (${nature})`);
      }
      lignes.push("");
    }
    lignes.push("## Tableau des scores", "");
    this.tableau().forEach((l, i) => {
      lignes.push(`${i + 1}. ${l.pseudo} : ${l.total} (${pluriel(l.points, "Point")})`);
    });
    return lignes.join("\n") + "\n";
  }

  question(questionId) {
    return this.etapes.flatMap((e) => e.questions).find((q) => q.id === questionId);
  }

  etape(etapeId) {
    const etape = this.etapes.find((e) => e.id === etapeId);
    if (!etape) throw new Refus(404, "Étape inconnue");
    return etape;
  }

  get etapeCourante() {
    return this.etapes.at(-1);
  }

  /** État complet, pour le Stockage. */
  toJSON() {
    const { id, titre, prompt, demarreeLe, bareme, joueurs, etapes, terminee, statistiquesPubliees, repartitionEnDirect, coAnimateurs } = this;
    return { id, titre, prompt, demarreeLe, bareme, joueurs, etapes, terminee, statistiquesPubliees, repartitionEnDirect, coAnimateurs };
  }

  static restaurer(donnees) {
    const seance = Object.assign(Object.create(Seance.prototype), donnees);
    seance.coAnimateurs ??= [];
    // Séances sauvegardées avant les états d'Étape : ouverte ou close
    for (const etape of seance.etapes) etape.etat ??= etape.ouverte ? "ouverte" : "close";
    // Séances sauvegardées avant l'introduction des Numéros
    let dernier = 0;
    for (const etape of seance.etapes) {
      for (const q of etape.questions) q.numero ??= ++dernier;
      dernier = etape.questions.at(-1).numero;
    }
    return seance;
  }

  /** Ce qu'un Joueur a le droit de voir. */
  vuePour(joueurId, { animateur = false } = {}) {
    const etape = this.etapeCourante;
    return {
      seance: {
        id: this.id,
        titre: this.titre,
        ...((!this.promptVerrouille || animateur) && { prompt: this.prompt ?? "" }),
        promptVerrouille: this.promptVerrouille,
        repartitionEnDirect: this.repartitionEnDirect === true,
        statistiquesPubliees: this.statistiquesPubliees === true,
        terminee: this.terminee,
        ...(this.terminee && { recapitulatif: this.recapitulatif() }),
      },
      joueurs: this.joueurs.length,
      coAnimateur: this.estCoAnimateur(joueurId),
      ...(animateur && {
        participants: this.joueurs.map((j) => ({ id: j.id, pseudo: j.pseudo, coAnimateur: this.estCoAnimateur(j.id) })),
      }),
      ...((this.terminee || this.statistiquesPubliees || animateur || this.estCoAnimateur(joueurId)) && {
        tableau: this.tableau(),
        statistiques: this.statistiques(),
      }),
      etape: etape && {
        id: etape.id,
        numero: etape.numero,
        tranchees: etape.tranchees,
        aVenir: etape.aVenir,
        etat: etape.etat,
        ouverte: etape.etat === "ouverte",
        questions: (etape.etat === "en_attente" ? [] : etape.questions).map((q) => {
          const votants = Object.keys(etape.votes[q.id]).length;
          return {
          id: q.id,
          numero: q.numero,
          repriseDe: q.reprise && this.question(q.reprise).numero,
          titre: q.titre,
          corps: q.corps,
          propositions: q.propositions,
          recommandee: q.recommandee,
          votants,
          monVote: etape.votes[q.id][joueurId] ?? null,
          monCommentaire: etape.commentaires[q.id][joueurId] ?? "",
          ...(etape.etat === "ouverte" &&
            this.repartitionEnDirect &&
            votants * 2 >= this.joueurs.length && { repartition: this.repartitionEn(etape, q) }),
          ...(etape.etat === "close" && { resultat: this.resultatQuestion(etape, q) }),
          };
        }),
      },
      // Toutes les Étapes closes, la plus récente d'abord.
      resultats: this.etapes
        .filter((e) => e.etat === "close")
        .reverse()
        .map((e) => ({
          id: e.id,
          numero: e.numero,
          questions: e.questions.map((q) => ({
            id: q.id,
            numero: q.numero,
            titre: q.titre,
            propositions: q.propositions,
            recommandee: q.recommandee,
            monVote: e.votes[q.id][joueurId] ?? null,
            resultat: this.resultatQuestion(e, q),
          })),
        })),
    };
  }
}

function validerQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) throw new Refus(400, "Étape sans Question");
  const ids = new Set();
  for (const q of questions) {
    if (!q?.id) throw new Refus(400, "Question sans identifiant");
    if (ids.has(q.id)) throw new Refus(400, `Question ${q.id} en double`);
    ids.add(q.id);
    if (!Array.isArray(q.propositions) || q.propositions.length === 0) {
      throw new Refus(400, `Question ${q.id} sans Proposition`);
    }
    const propositions = new Set(q.propositions.map((p) => p?.id));
    if (propositions.size !== q.propositions.length || propositions.has(undefined)) {
      throw new Refus(400, `Question ${q.id} : Propositions sans identifiant ou en double`);
    }
    if (!q.recommandee) throw new Refus(400, `Question ${q.id} sans Proposition recommandée`);
    if (!propositions.has(q.recommandee)) {
      throw new Refus(400, `Question ${q.id} : la recommandée ${q.recommandee} n'est pas une Proposition`);
    }
  }
}

/** Attribue à chaque Question son Numéro, continu sur la Séance. */
function numeroter(questions, etapesPrecedentes) {
  const deja = etapesPrecedentes.reduce((n, e) => n + e.questions.length, 0);
  return questions.map((q, i) => ({ ...q, numero: deja + i + 1 }));
}

function pluriel(n, mot) {
  return `${n} ${n > 1 && !mot.endsWith("s") ? mot + "s" : mot}`;
}
