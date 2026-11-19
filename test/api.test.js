import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { demarrer } from "../src/serveur.js";

const JETON = "jeton-de-test";

let dossier;
let serveur;

beforeEach(async () => {
  dossier = await mkdtemp(join(tmpdir(), "grill-arena-"));
  serveur = await demarrer({ port: 0, dossier, jeton: JETON });
});

afterEach(async () => {
  await serveur.fermer();
  await rm(dossier, { recursive: true, force: true });
});

// --- Rôles joués par les tests ---------------------------------------------

async function requete(methode, chemin, { corps, jeton } = {}) {
  const entetes = { "content-type": "application/json" };
  if (jeton) entetes.authorization = `Bearer ${jeton}`;
  const reponse = await fetch(serveur.url + chemin, {
    method: methode,
    headers: entetes,
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const texte = await reponse.text();
  return { statut: reponse.status, corps: texte ? JSON.parse(texte) : undefined };
}

const claude = {
  demarrerSeance: (titre = "Séance de test") =>
    requete("POST", "/api/seance", { corps: { titre }, jeton: JETON }),
  publier: (etape) => requete("POST", "/api/etapes", { corps: etape, jeton: JETON }),
  /** Publie l'Étape puis l'Animateur l'ouvre : la plupart des tests partent d'une Étape ouverte. */
  publierOuverte: async (etape) => {
    const publication = await requete("POST", "/api/etapes", { corps: etape, jeton: JETON });
    assert.equal(publication.statut, 201);
    assert.equal((await animateur.ouvrir(publication.corps.id)).statut, 200);
    return publication;
  },
  resultat: (id, { attendre = false } = {}) =>
    requete("GET", `/api/etapes/${id}/resultat${attendre ? "?attendre=1" : ""}`, { jeton: JETON }),
  terminer: () => requete("POST", "/api/seance/fin", { jeton: JETON }),
};

const animateur = {
  /** Vue de l'Animateur : celle d'un Joueur, plus ce qui lui est réservé. */
  etat: async (joueurId) =>
    (await requete("GET", `/api/etat${joueurId ? `?joueur=${joueurId}` : ""}`, { jeton: JETON })).corps,
  ouvrir: (etapeId) => requete("POST", `/api/etapes/${etapeId}/ouverture`, { jeton: JETON }),
  clore: (etapeId, decisions = {}) =>
    requete("POST", `/api/etapes/${etapeId}/cloture`, { corps: decisions, jeton: JETON }),
};

async function rejoindre(pseudo) {
  const { statut, corps } = await requete("POST", "/api/joueurs", { corps: { pseudo } });
  assert.equal(statut, 201, `rejoindre ${pseudo}`);
  const id = corps.id;
  return {
    id,
    etat: async () => (await requete("GET", `/api/etat?joueur=${id}`)).corps,
    repondre: (etapeId, questionId, reponse) =>
      requete("PUT", `/api/etapes/${etapeId}/questions/${questionId}/reponse`, {
        corps: { joueur: id, ...reponse },
      }),
  };
}

function etapeType(numero = 1) {
  return {
    numero,
    tranchees: 0,
    aVenir: 4,
    questions: [
      {
        id: numero === 1 ? "q1" : `q1-${numero}`,
        titre: "Où vit l'outil",
        corps: "Un **dépôt dédié** ?",
        propositions: [
          { id: "A", libelle: "Dépôt dédié" },
          { id: "B", libelle: "Dossier dans le monorepo" },
        ],
        recommandee: "A",
      },
    ],
  };
}

// --- Comportements ----------------------------------------------------------

test("un Joueur voit l'Étape publiée par Claude, avec la Proposition recommandée", async () => {
  await claude.demarrerSeance("Arène");
  const publication = await claude.publierOuverte(etapeType());
  assert.equal(publication.statut, 201);

  const alice = await rejoindre("alice");
  const etat = await alice.etat();
  assert.equal(etat.seance.titre, "Arène");
  assert.equal(etat.etape.id, publication.corps.id);
  assert.equal(etat.etape.ouverte, true);
  assert.deepEqual(
    { numero: etat.etape.numero, tranchees: etat.etape.tranchees, aVenir: etat.etape.aVenir },
    { numero: 1, tranchees: 0, aVenir: 4 },
  );
  const [q1] = etat.etape.questions;
  assert.equal(q1.corps, "Un **dépôt dédié** ?");
  assert.equal(q1.recommandee, "A");
  assert.deepEqual(q1.propositions.map((p) => p.libelle), ["Dépôt dédié", "Dossier dans le monorepo"]);
});

test("une Étape publiée attend l'Ouverture : les Joueurs ne voient pas ses Questions et ne peuvent pas voter", async () => {
  await claude.demarrerSeance();
  const alice = await rejoindre("alice");
  const { corps: etape } = await claude.publier(etapeType(1));

  const attente = (await alice.etat()).etape;
  assert.equal(attente.etat, "en_attente");
  assert.equal(attente.ouverte, false);
  assert.equal(attente.numero, 1);
  assert.deepEqual(attente.questions, []);
  assert.equal(JSON.stringify(await alice.etat()).includes("Dépôt dédié"), false);
  assert.equal((await alice.repondre(etape.id, "q1", { proposition: "A" })).statut, 409);
  assert.equal((await claude.resultat(etape.id)).statut, 202);
  assert.equal((await animateur.clore(etape.id)).statut, 409);

  assert.equal((await animateur.ouvrir(etape.id)).statut, 200);
  const ouverte = (await alice.etat()).etape;
  assert.equal(ouverte.etat, "ouverte");
  assert.equal(ouverte.questions.length, 1);
  assert.equal((await alice.repondre(etape.id, "q1", { proposition: "A" })).statut, 200);
});

test("l'Ouverture est réservée à l'Animateur et refusée sur une Étape déjà ouverte ou close", async () => {
  await claude.demarrerSeance();
  const { corps: etape } = await claude.publier(etapeType());
  assert.equal((await requete("POST", `/api/etapes/${etape.id}/ouverture`)).statut, 401);
  assert.equal((await animateur.ouvrir(etape.id)).statut, 200);
  assert.equal((await animateur.ouvrir(etape.id)).statut, 409);
  await animateur.clore(etape.id);
  assert.equal((await animateur.ouvrir(etape.id)).statut, 409);
});

test("le long-poll de Claude attend la clôture, pas l'Ouverture", async () => {
  await claude.demarrerSeance();
  const { corps: etape } = await claude.publier(etapeType());
  let repondu = false;
  const attente = claude.resultat(etape.id, { attendre: true }).then((r) => ((repondu = true), r));
  await animateur.ouvrir(etape.id);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(repondu, false);
  await animateur.clore(etape.id);
  assert.equal((await attente).statut, 200);
});

test("on ne publie pas une Étape tant que la précédente n'est pas close, même en attente d'Ouverture", async () => {
  await claude.demarrerSeance();
  await claude.publier(etapeType(1));
  assert.equal((await claude.publier(etapeType(2))).statut, 409);
});

test("sans le jeton, impossible de démarrer une Séance, publier, clore ou terminer", async () => {
  assert.equal((await requete("POST", "/api/seance", { corps: { titre: "x" } })).statut, 401);
  await claude.demarrerSeance();
  assert.equal((await requete("POST", "/api/etapes", { corps: etapeType() })).statut, 401);
  const { corps } = await claude.publierOuverte(etapeType());
  assert.equal(
    (await requete("POST", `/api/etapes/${corps.id}/cloture`, { corps: {}, jeton: "faux" })).statut,
    401,
  );
  assert.equal((await requete("GET", `/api/etapes/${corps.id}/resultat`)).statut, 401);
  assert.equal((await requete("POST", "/api/seance/fin")).statut, 401);
});

test("avant la clôture, un Joueur ne voit que son propre Vote et le nombre de votants", async () => {
  await claude.demarrerSeance();
  const { corps: etape } = await claude.publierOuverte(etapeType());
  const alice = await rejoindre("alice");
  const bob = await rejoindre("bob");
  await rejoindre("carol");

  assert.equal((await alice.repondre(etape.id, "q1", { proposition: "B", commentaire: "plutôt B" })).statut, 200);
  await bob.repondre(etape.id, "q1", { commentaire: "je m'abstiens" });

  const vueBob = await bob.etat();
  const [q1] = vueBob.etape.questions;
  assert.equal(q1.votants, 1);
  assert.equal(vueBob.joueurs, 3);
  assert.equal(q1.monVote, null);
  assert.equal(q1.monCommentaire, "je m'abstiens");
  assert.equal(JSON.stringify(vueBob).includes("plutôt B"), false);
  assert.equal(q1.repartition, undefined);

  const [q1Alice] = (await alice.etat()).etape.questions;
  assert.equal(q1Alice.monVote, "B");
  assert.equal(q1Alice.monCommentaire, "plutôt B");
});

test("un Joueur peut changer son Vote, revenir à l'Abstention et effacer son Commentaire", async () => {
  await claude.demarrerSeance();
  const { corps: etape } = await claude.publierOuverte(etapeType());
  const alice = await rejoindre("alice");

  await alice.repondre(etape.id, "q1", { proposition: "B", commentaire: "B" });
  await alice.repondre(etape.id, "q1", { proposition: "A" });
  let [q1] = (await alice.etat()).etape.questions;
  assert.deepEqual([q1.monVote, q1.monCommentaire, q1.votants], ["A", "B", 1]);

  await alice.repondre(etape.id, "q1", { proposition: null, commentaire: "" });
  [q1] = (await alice.etat()).etape.questions;
  assert.deepEqual([q1.monVote, q1.monCommentaire, q1.votants], [null, "", 0]);
});

test("à la clôture, Claude reçoit la Proposition retenue, la répartition, les Commentaires et le Tableau des scores", async () => {
  await claude.demarrerSeance();
  const { corps: etape } = await claude.publierOuverte(etapeType());
  const alice = await rejoindre("alice");
  const bob = await rejoindre("bob");
  const carol = await rejoindre("carol");
  await rejoindre("dan"); // s'abstient sans rien dire
  await alice.repondre(etape.id, "q1", { proposition: "B", commentaire: "le monorepo suffit" });
  await bob.repondre(etape.id, "q1", { proposition: "B" });
  await carol.repondre(etape.id, "q1", { proposition: "A" });

  assert.equal((await animateur.clore(etape.id)).statut, 200);
  const { statut, corps: resultat } = await claude.resultat(etape.id);
  assert.equal(statut, 200);
  assert.deepEqual(resultat.questions, [
    {
      id: "q1",
      numero: 1,
      statut: "retenue",
      retenue: "B",
      repartition: { A: 1, B: 2 },
      abstentions: 1,
      commentaires: [{ pseudo: "alice", texte: "le monorepo suffit" }],
    },
  ]);
  assert.deepEqual(resultat.tableau, [
    { pseudo: "alice", points: 1, total: 1, gainEtape: 1 },
    { pseudo: "bob", points: 1, total: 1, gainEtape: 1 },
    { pseudo: "carol", points: 0, total: 0, gainEtape: 0 },
    { pseudo: "dan", points: 0, total: 0, gainEtape: 0 },
  ]);

  const vueCarol = await carol.etat();
  assert.equal(vueCarol.etape.ouverte, false);
  assert.deepEqual(vueCarol.etape.questions[0].resultat, resultat.questions[0]);
  assert.deepEqual((await animateur.etat()).tableau, resultat.tableau);
});

test("tant que l'Étape est ouverte, le résultat sans attente indique qu'elle n'est pas close", async () => {
  await claude.demarrerSeance();
  const { corps: etape } = await claude.publierOuverte(etapeType());
  const { statut, corps } = await claude.resultat(etape.id);
  assert.equal(statut, 202);
  assert.equal(corps.ouverte, true);
});

test("le long-poll de Claude reste ouvert jusqu'à la clôture, puis renvoie le résultat", async () => {
  await claude.demarrerSeance();
  const { corps: etape } = await claude.publierOuverte(etapeType());
  const alice = await rejoindre("alice");
  await alice.repondre(etape.id, "q1", { proposition: "A" });

  let repondu = false;
  const attente = claude.resultat(etape.id, { attendre: true }).then((r) => {
    repondu = true;
    return r;
  });
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(repondu, false);

  await animateur.clore(etape.id);
  const { statut, corps } = await attente;
  assert.equal(statut, 200);
  assert.equal(corps.questions[0].retenue, "A");

  // relancé après la clôture, il répond tout de suite
  assert.equal((await claude.resultat(etape.id, { attendre: true })).statut, 200);
});

function etapeTroisPropositions() {
  const etape = etapeType();
  etape.questions[0].propositions.push({ id: "C", libelle: "Plugin de skills" });
  return etape;
}

test("un partage des Votes n'est pas tranché : la Question est renvoyée à l'oral, sans Point", async () => {
  await claude.demarrerSeance();
  const { corps: etape } = await claude.publierOuverte(etapeTroisPropositions());
  const alice = await rejoindre("alice");
  const bob = await rejoindre("bob");
  await alice.repondre(etape.id, "q1", { proposition: "A", commentaire: "A d'abord" });
  await bob.repondre(etape.id, "q1", { proposition: "C" });

  const cloture = await animateur.clore(etape.id);
  assert.equal(cloture.statut, 200);
  const [q1] = cloture.corps.questions;
  assert.equal(q1.statut, "a_reposer");
  assert.equal(q1.retenue, undefined);
  assert.deepEqual(q1.repartition, { A: 1, B: 0, C: 1 });
  assert.deepEqual(q1.commentaires, [{ pseudo: "alice", texte: "A d'abord" }]);
  assert.deepEqual(cloture.corps.tableau.map((l) => [l.pseudo, l.total]), [["alice", 0], ["bob", 0]]);
});

test("le Récapitulatif signale un partage des Votes, distinct d'une Question que l'Animateur repose", async () => {
  await claude.demarrerSeance("Arène");
  const alice = await rejoindre("alice");
  const bob = await rejoindre("bob");
  const contenu = etapeTroisPropositions();
  contenu.questions.push({ ...structuredClone(contenu.questions[0]), id: "q2", titre: "Hébergement" });
  const { corps: etape } = await claude.publierOuverte(contenu);
  await alice.repondre(etape.id, "q1", { proposition: "A" });
  await bob.repondre(etape.id, "q1", { proposition: "C" });
  await alice.repondre(etape.id, "q2", { proposition: "A" });
  await animateur.clore(etape.id, { aReposer: ["q2"] });

  const { corps } = await claude.terminer();
  const lignes = corps.recapitulatif.split("\n");
  assert.ok(lignes.includes("- **Q1 · Où vit l'outil** : à reposer (partage des Votes)"), corps.recapitulatif);
  assert.ok(lignes.includes("- **Q2 · Hébergement** : à reposer"), corps.recapitulatif);
});

test("les Questions ont un Numéro continu sur toute la Séance, vu des Joueurs et de Claude", async () => {
  await claude.demarrerSeance();
  const alice = await rejoindre("alice");
  const premiere = etapeType(1);
  premiere.questions.push({ ...structuredClone(premiere.questions[0]), id: "q2", titre: "Stack" });
  const { corps: e1 } = await claude.publierOuverte(premiere);
  assert.deepEqual((await alice.etat()).etape.questions.map((q) => q.numero), [1, 2]);
  const { corps: resultat1 } = await animateur.clore(e1.id);
  assert.deepEqual(resultat1.questions.map((q) => q.numero), [1, 2]);

  const secondeContenu = etapeType(2);
  secondeContenu.questions[0].id = "q3";
  const { corps: e2 } = await claude.publierOuverte(secondeContenu);
  assert.deepEqual((await alice.etat()).etape.questions.map((q) => q.numero), [3]);
  const { corps: resultat2 } = await animateur.clore(e2.id);
  assert.deepEqual(resultat2.questions.map((q) => q.numero), [3]);
});

test("une Question marquée à reposer est renvoyée à Claude sans Proposition retenue ni Point", async () => {
  await claude.demarrerSeance();
  const { corps: etape } = await claude.publierOuverte(etapeType());
  const alice = await rejoindre("alice");
  await alice.repondre(etape.id, "q1", { proposition: "A", commentaire: "ni l'un ni l'autre" });

  const { corps } = await animateur.clore(etape.id, { aReposer: ["q1"] });
  assert.equal(corps.questions[0].statut, "a_reposer");
  assert.equal(corps.questions[0].retenue, undefined);
  assert.equal(corps.tableau[0].total, 0);
});

test("une Étape mal formée est refusée avec un message explicite", async () => {
  await claude.demarrerSeance();
  const casInvalides = {
    "sans Question": (e) => { e.questions = []; },
    "Question sans Proposition": (e) => { e.questions[0].propositions = []; },
    "sans recommandée": (e) => { delete e.questions[0].recommandee; },
    "recommandée absente des Propositions": (e) => { e.questions[0].recommandee = "Z"; },
    "Propositions en double": (e) => { e.questions[0].propositions[1].id = "A"; },
    "Questions en double": (e) => { e.questions.push(structuredClone(e.questions[0])); },
  };
  for (const [cas, abimer] of Object.entries(casInvalides)) {
    const etape = etapeType();
    abimer(etape);
    const { statut, corps } = await claude.publier(etape);
    assert.equal(statut, 400, cas);
    assert.match(corps.erreur, /\S/, cas);
  }
});

test("on ne publie pas une Étape tant que la précédente est ouverte", async () => {
  await claude.demarrerSeance();
  const { corps: etape } = await claude.publierOuverte(etapeType(1));
  assert.equal((await claude.publier(etapeType(2))).statut, 409);
  await animateur.clore(etape.id);
  assert.equal((await claude.publier(etapeType(2))).statut, 201);
});

test("un Vote sur une Étape close, ou pour une Proposition inconnue, est refusé", async () => {
  await claude.demarrerSeance();
  const { corps: etape } = await claude.publierOuverte(etapeType());
  const alice = await rejoindre("alice");
  assert.equal((await alice.repondre(etape.id, "q1", { proposition: "Z" })).statut, 400);
  await animateur.clore(etape.id);
  assert.equal((await alice.repondre(etape.id, "q1", { proposition: "A" })).statut, 409);
});

test("un pseudo déjà pris dans la Séance est refusé, sans tenir compte de la casse", async () => {
  await claude.demarrerSeance();
  await rejoindre("Alice");
  const { statut } = await requete("POST", "/api/joueurs", { corps: { pseudo: "alice" } });
  assert.equal(statut, 409);
  assert.equal((await requete("POST", "/api/joueurs", { corps: { pseudo: "  " } })).statut, 400);
});

test("un Joueur peut reprendre son pseudo sur demande explicite et retrouve ses Votes", async () => {
  await claude.demarrerSeance();
  const { corps: etape } = await claude.publierOuverte(etapeType());
  const alice = await rejoindre("Alice");
  await alice.repondre(etape.id, "q1", { proposition: "B", commentaire: "plutôt B" });

  const reprise = await requete("POST", "/api/joueurs", { corps: { pseudo: "alice", reprendre: true } });
  assert.equal(reprise.statut, 200);
  assert.equal(reprise.corps.id, alice.id);
  assert.equal(reprise.corps.pseudo, "Alice");

  const [q1] = (await alice.etat()).etape.questions;
  assert.equal(q1.monVote, "B");
  assert.equal(q1.monCommentaire, "plutôt B");
  assert.equal((await requete("GET", "/api/etat")).corps.joueurs, 1);
});

test("reprendre un pseudo inconnu crée le Joueur, un pseudo vide reste refusé", async () => {
  await claude.demarrerSeance();
  const nouveau = await requete("POST", "/api/joueurs", { corps: { pseudo: "bob", reprendre: true } });
  assert.equal(nouveau.statut, 201);
  assert.equal((await requete("POST", "/api/joueurs", { corps: { pseudo: " ", reprendre: true } })).statut, 400);
});

test("le Récapitulatif n'est visible de tous qu'une fois la Séance terminée", async () => {
  await claude.demarrerSeance("Arène");
  const { corps: etape } = await claude.publierOuverte(etapeType());
  const alice = await rejoindre("alice");
  await alice.repondre(etape.id, "q1", { proposition: "A" });
  await animateur.clore(etape.id);

  assert.equal((await alice.etat()).seance.recapitulatif, undefined);

  const { corps: fin } = await claude.terminer();
  assert.equal((await alice.etat()).seance.recapitulatif, fin.recapitulatif);
  assert.equal((await requete("GET", "/api/etat")).corps.seance.recapitulatif, fin.recapitulatif);
});

test("sans Séance démarrée, rejoindre ou publier est refusé", async () => {
  assert.equal((await requete("POST", "/api/joueurs", { corps: { pseudo: "alice" } })).statut, 409);
  assert.equal((await claude.publier(etapeType())).statut, 409);
});

test("un Joueur arrivé en cours de Séance démarre à 0 et vote dès l'Étape ouverte", async () => {
  await claude.demarrerSeance();
  const { corps: e1 } = await claude.publierOuverte(etapeType(1));
  const alice = await rejoindre("alice");
  await alice.repondre(e1.id, "q1", { proposition: "A" });
  await animateur.clore(e1.id);

  const { corps: e2 } = await claude.publierOuverte(etapeType(2));
  const bob = await rejoindre("bob");
  assert.equal((await animateur.etat()).tableau.find((l) => l.pseudo === "bob").total, 0);
  assert.equal((await bob.repondre(e2.id, "q1-2", { proposition: "A" })).statut, 200);
  const { corps } = await animateur.clore(e2.id);
  assert.deepEqual(corps.tableau.map((l) => [l.pseudo, l.total]), [["alice", 1], ["bob", 1]]);
});

test("à la fin de la Séance, Claude reçoit le Récapitulatif et les Joueurs voient la Séance terminée", async () => {
  await claude.demarrerSeance("Arène");
  const alice = await rejoindre("alice");
  const bob = await rejoindre("bob");

  const { corps: e1 } = await claude.publierOuverte(etapeType(1));
  await alice.repondre(e1.id, "q1", { proposition: "B" });
  await animateur.clore(e1.id);

  const e2Contenu = etapeType(2);
  e2Contenu.questions[0].id = "q2";
  e2Contenu.questions[0].titre = "Stack";
  const { corps: e2 } = await claude.publierOuverte(e2Contenu);
  await bob.repondre(e2.id, "q2", { proposition: "A" });
  await animateur.clore(e2.id, { aReposer: ["q2"] });

  const { statut, corps } = await claude.terminer();
  assert.equal(statut, 200);
  const lignes = corps.recapitulatif.split("\n");
  for (const attendue of [
    "# Récapitulatif : Arène",
    "## Étape 1",
    "- **Q1 · Où vit l'outil** : Dossier dans le monorepo (non recommandée)",
    "## Étape 2",
    "- **Q2 · Stack** : à reposer",
    "## Tableau des scores",
    "1. alice : 1 (1 Point)",
    "2. bob : 0 (0 Point)",
  ]) {
    assert.ok(lignes.includes(attendue), `ligne manquante : ${attendue}\n${corps.recapitulatif}`);
  }

  assert.equal((await alice.etat()).seance.terminee, true);
  assert.equal((await claude.publier(etapeType(3))).statut, 409);
});

test("sans Séance démarrée, l'état le dit au lieu d'échouer", async () => {
  const { statut, corps } = await requete("GET", "/api/etat");
  assert.equal(statut, 200);
  assert.equal(corps.seance, null);
});

test("après un redémarrage, la Séance reprend avec ses Joueurs, son Étape ouverte et ses scores", async () => {
  await claude.demarrerSeance("Arène");
  const alice = await rejoindre("alice");
  const { corps: e1 } = await claude.publierOuverte(etapeType(1));
  await alice.repondre(e1.id, "q1", { proposition: "B" });
  await animateur.clore(e1.id);
  const { corps: e2 } = await claude.publierOuverte(etapeType(2));
  await alice.repondre(e2.id, "q1-2", { proposition: "A", commentaire: "gardé" });

  await serveur.fermer();
  serveur = await demarrer({ port: 0, dossier, jeton: JETON });

  const etat = await alice.etat();
  assert.equal(etat.seance.titre, "Arène");
  assert.equal(etat.etape.id, e2.id);
  assert.equal(etat.etape.questions[0].monCommentaire, "gardé");
  assert.deepEqual((await animateur.etat()).tableau.map((l) => [l.pseudo, l.total]), [["alice", 1]]);

  const { corps } = await animateur.clore(e2.id);
  assert.deepEqual(corps.tableau.map((l) => [l.pseudo, l.total]), [["alice", 2]]);
});

test("démarrer une nouvelle Séance archive la précédente sans l'écraser", async () => {
  await claude.demarrerSeance("Première");
  await rejoindre("alice");
  await claude.demarrerSeance("Seconde");
  assert.equal((await requete("GET", "/api/etat")).corps.seance.titre, "Seconde");
  assert.equal((await requete("POST", "/api/joueurs", { corps: { pseudo: "alice" } })).statut, 201);

  const { readdir } = await import("node:fs/promises");
  assert.equal((await readdir(dossier)).filter((f) => f.endsWith(".json")).length, 2);

  await serveur.fermer();
  serveur = await demarrer({ port: 0, dossier, jeton: JETON });
  assert.equal((await requete("GET", "/api/etat")).corps.seance.titre, "Seconde");
});

test("le prompt initial de la Séance est visible de tous et l'Animateur peut le modifier", async () => {
  await requete("POST", "/api/seance", { corps: { titre: "Arène", prompt: "Grill **le** dépôt" }, jeton: JETON });
  const alice = await rejoindre("alice");
  assert.equal((await alice.etat()).seance.prompt, "Grill **le** dépôt");

  assert.equal((await requete("PUT", "/api/seance/prompt", { corps: { prompt: "x" } })).statut, 401);
  const modification = await requete("PUT", "/api/seance/prompt", { corps: { prompt: "Nouveau cadrage" }, jeton: JETON });
  assert.equal(modification.statut, 200);
  assert.equal((await alice.etat()).seance.prompt, "Nouveau cadrage");
});

test("le prompt initial se verrouille à l'Ouverture de l'Étape 1 et disparaît de la vue des Joueurs", async () => {
  await requete("POST", "/api/seance", { corps: { titre: "Arène", prompt: "Cadrage initial" }, jeton: JETON });
  const alice = await rejoindre("alice");
  const { corps: etape } = await claude.publier(etapeType());

  // publiée mais pas ouverte : toujours visible et modifiable
  assert.equal((await alice.etat()).seance.prompt, "Cadrage initial");
  assert.equal((await requete("PUT", "/api/seance/prompt", { corps: { prompt: "Cadrage v2" }, jeton: JETON })).statut, 200);
  assert.equal((await alice.etat()).seance.prompt, "Cadrage v2");

  await animateur.ouvrir(etape.id);
  assert.equal((await alice.etat()).seance.prompt, undefined);
  const vueAnimateur = await requete("GET", `/api/etat?joueur=${alice.id}`, { jeton: JETON });
  assert.equal(vueAnimateur.corps.seance.prompt, "Cadrage v2");
  assert.equal(vueAnimateur.corps.seance.promptVerrouille, true);
  const refus = await requete("PUT", "/api/seance/prompt", { corps: { prompt: "Trop tard" }, jeton: JETON });
  assert.equal(refus.statut, 409);
  assert.equal((await requete("GET", `/api/etat?joueur=${alice.id}`, { jeton: JETON })).corps.seance.prompt, "Cadrage v2");
});

test("le Tableau et les statistiques sont cachés des Joueurs pendant la Séance, visibles de l'Animateur", async () => {
  await claude.demarrerSeance();
  const alice = await rejoindre("alice");
  const bob = await rejoindre("bob");
  const contenu = etapeType(1);
  contenu.questions.push({ ...structuredClone(contenu.questions[0]), id: "q2", titre: "Stack" });
  const { corps: etape } = await claude.publierOuverte(contenu);
  await alice.repondre(etape.id, "q1", { proposition: "A", commentaire: "d'accord" });
  await alice.repondre(etape.id, "q2", { proposition: "A" });
  await bob.repondre(etape.id, "q1", { proposition: "A" });
  await animateur.clore(etape.id);

  const vueAlice = await alice.etat();
  assert.equal(vueAlice.tableau, undefined);
  assert.equal(vueAlice.statistiques, undefined);
  assert.equal(vueAlice.etape.questions[0].resultat.retenue, "A", "les résultats de l'Étape restent publics");

  const vueAnimateur = await animateur.etat(alice.id);
  assert.deepEqual(vueAnimateur.tableau.map((l) => [l.pseudo, l.total]), [["alice", 2], ["bob", 1]]);
  assert.deepEqual(vueAnimateur.statistiques, [
    { pseudo: "alice", votes: 2, commentaires: 1, abstentions: 0 },
    { pseudo: "bob", votes: 1, commentaires: 0, abstentions: 1 },
  ]);
});

test("à la fin de la Séance, le Tableau et les statistiques sont publiés à tous et renvoyés à Claude", async () => {
  await claude.demarrerSeance();
  const alice = await rejoindre("alice");
  const { corps: etape } = await claude.publierOuverte(etapeType());
  await alice.repondre(etape.id, "q1", { proposition: "A" });
  await animateur.clore(etape.id);

  const { corps: fin } = await claude.terminer();
  assert.deepEqual(fin.statistiques, [{ pseudo: "alice", votes: 1, commentaires: 0, abstentions: 0 }]);
  const vue = await alice.etat();
  assert.deepEqual(vue.statistiques, fin.statistiques);
  assert.deepEqual(vue.tableau.map((l) => [l.pseudo, l.total]), [["alice", 1]]);
});

test("l'Animateur peut publier les statistiques avant la fin de la Séance", async () => {
  await claude.demarrerSeance();
  const alice = await rejoindre("alice");
  const { corps: etape } = await claude.publierOuverte(etapeType());
  await alice.repondre(etape.id, "q1", { proposition: "A" });
  await animateur.clore(etape.id);
  assert.equal((await alice.etat()).statistiques, undefined);

  assert.equal((await requete("POST", "/api/seance/statistiques")).statut, 401);
  assert.equal((await requete("POST", "/api/seance/statistiques", { jeton: JETON })).statut, 200);
  const vue = await alice.etat();
  assert.deepEqual(vue.statistiques, [{ pseudo: "alice", votes: 1, commentaires: 0, abstentions: 0 }]);
  assert.deepEqual(vue.tableau.map((l) => [l.pseudo, l.total]), [["alice", 1]]);
});

test("la répartition en direct est masquée par défaut, même quand tout le monde a voté", async () => {
  await claude.demarrerSeance();
  const alice = await rejoindre("alice");
  const { corps: etape } = await claude.publierOuverte(etapeType());
  await alice.repondre(etape.id, "q1", { proposition: "A" });
  assert.equal((await alice.etat()).etape.questions[0].repartition, undefined);
});

test("l'Animateur peut afficher la répartition en direct avant l'Ouverture de l'Étape 1 ; elle n'apparaît qu'à partir de la moitié des votants", async () => {
  await claude.demarrerSeance();
  const [alice, bob] = [await rejoindre("alice"), await rejoindre("bob")];
  await rejoindre("carol");
  await rejoindre("dan");
  const regler = (corps, jeton = JETON) => requete("PUT", "/api/seance/repartition-en-direct", { corps, jeton });
  assert.equal((await regler({ actif: true }, null)).statut, 401);
  assert.equal((await regler({ actif: true })).statut, 200);

  const { corps: etape } = await claude.publier(etapeType());
  assert.equal((await regler({ actif: true })).statut, 200, "réglable tant que l'Étape 1 n'est pas ouverte");
  await animateur.ouvrir(etape.id);
  assert.equal((await regler({ actif: false })).statut, 409);

  await alice.repondre(etape.id, "q1", { proposition: "A" });
  assert.equal((await bob.etat()).etape.questions[0].repartition, undefined, "1 votant sur 4");
  await bob.repondre(etape.id, "q1", { proposition: "B" });
  assert.deepEqual((await bob.etat()).etape.questions[0].repartition, { A: 1, B: 1 }, "2 votants sur 4");
  assert.equal((await animateur.etat()).seance.repartitionEnDirect, true);
});

// --- Co-animateur ------------------------------------------------------------

const designer = (joueurId, { jeton = JETON, methode = "PUT" } = {}) =>
  requete(methode, `/api/seance/co-animateurs/${joueurId}`, { jeton });

test("seul l'Animateur désigne et révoque les Co-animateurs, parmi les Joueurs de la Séance", async () => {
  await claude.demarrerSeance();
  const alice = await rejoindre("alice");
  const bob = await rejoindre("bob");

  assert.equal((await designer(alice.id, { jeton: null })).statut, 401);
  assert.equal((await designer("inconnu")).statut, 404);
  assert.equal((await designer(alice.id)).statut, 200);
  assert.equal((await alice.etat()).coAnimateur, true);
  assert.equal((await bob.etat()).coAnimateur, false);
  const liste = (await animateur.etat(bob.id)).participants;
  assert.deepEqual(liste.map((p) => [p.pseudo, p.coAnimateur]), [["alice", true], ["bob", false]]);

  // un Co-animateur ne désigne personne
  const parAlice = await requete("PUT", `/api/seance/co-animateurs/${bob.id}`, { corps: { joueur: alice.id } });
  assert.equal(parAlice.statut, 403);

  assert.equal((await designer(alice.id, { methode: "DELETE" })).statut, 200);
  assert.equal((await alice.etat()).coAnimateur, false);
});

test("un Co-animateur ouvre et clôt les Étapes, un Joueur ordinaire non", async () => {
  await claude.demarrerSeance();
  const alice = await rejoindre("alice");
  const bob = await rejoindre("bob");
  await designer(bob.id);
  const { corps: etape } = await claude.publier(etapeType());

  const ouvrirPar = (joueur) => requete("POST", `/api/etapes/${etape.id}/ouverture`, { corps: { joueur: joueur.id } });
  const clorePar = (joueur) => requete("POST", `/api/etapes/${etape.id}/cloture`, { corps: { joueur: joueur.id } });
  assert.equal((await ouvrirPar(alice)).statut, 403);
  assert.equal((await ouvrirPar(bob)).statut, 200);
  await alice.repondre(etape.id, "q1", { proposition: "A" });
  assert.equal((await clorePar(alice)).statut, 403);
  assert.equal((await clorePar(bob)).statut, 200);
  // l'Animateur arrivé juste après : refus sans effet
  assert.equal((await animateur.clore(etape.id)).statut, 409);

  // révoqué, il perd ses droits
  await designer(bob.id, { methode: "DELETE" });
  const { corps: suivante } = await claude.publier(etapeType(2));
  assert.equal(
    (await requete("POST", `/api/etapes/${suivante.id}/ouverture`, { corps: { joueur: bob.id } })).statut,
    403,
  );
});

test("un Co-animateur voit le Tableau et les statistiques, mais ne règle ni le prompt, ni la répartition, ni la publication", async () => {
  await claude.demarrerSeance();
  const alice = await rejoindre("alice");
  const bob = await rejoindre("bob");
  await designer(bob.id);
  const { corps: etape } = await claude.publierOuverte(etapeType());
  await alice.repondre(etape.id, "q1", { proposition: "A" });
  await animateur.clore(etape.id);

  assert.equal((await alice.etat()).tableau, undefined);
  const vueBob = await bob.etat();
  assert.deepEqual(vueBob.tableau.map((l) => [l.pseudo, l.total]), [["alice", 1], ["bob", 0]]);
  assert.equal(vueBob.statistiques.length, 2);
  assert.equal(vueBob.participants, undefined, "la liste de désignation reste réservée à l'Animateur");

  const parBob = (methode, chemin, corps = {}) => requete(methode, chemin, { corps: { ...corps, joueur: bob.id } });
  assert.equal((await parBob("PUT", "/api/seance/prompt", { prompt: "x" })).statut, 403);
  assert.equal((await parBob("PUT", "/api/seance/repartition-en-direct", { actif: true })).statut, 403);
  assert.equal((await parBob("POST", "/api/seance/statistiques")).statut, 403);
  assert.equal((await alice.etat()).statistiques, undefined);
});

test("les Co-animateurs restent désignés après un redémarrage du serveur", async () => {
  await claude.demarrerSeance();
  const alice = await rejoindre("alice");
  await designer(alice.id);
  await claude.publier(etapeType());

  await serveur.fermer();
  serveur = await demarrer({ port: 0, dossier, jeton: JETON });
  assert.equal((await alice.etat()).coAnimateur, true);
});

test("un Joueur retrouve les résultats de toutes les Étapes closes, la plus récente d'abord, avec son Vote", async () => {
  await claude.demarrerSeance();
  const alice = await rejoindre("alice");
  assert.deepEqual((await alice.etat()).resultats, []);

  const e1 = await claude.publierOuverte(etapeType(1));
  await alice.repondre(e1.corps.id, "q1", { proposition: "B" });
  await animateur.clore(e1.corps.id);
  const contenu2 = etapeType(2);
  contenu2.questions[0].id = "q2";
  contenu2.questions[0].titre = "Stack";
  const e2 = await claude.publierOuverte(contenu2);
  assert.deepEqual((await alice.etat()).resultats.map((r) => r.numero), [1], "une Étape ouverte n'a pas de résultats");

  await alice.repondre(e2.corps.id, "q2", { proposition: "A" });
  await animateur.clore(e2.corps.id);
  const { resultats, etapePrecedente } = await alice.etat();
  assert.equal(etapePrecedente, undefined);
  assert.deepEqual(resultats.map((r) => r.numero), [2, 1]);
  const [q1] = resultats[1].questions;
  assert.deepEqual([q1.numero, q1.titre, q1.monVote, q1.resultat.retenue], [1, "Où vit l'outil", "B", "B"]);
  assert.equal(resultats[0].questions[0].resultat.retenue, "A");
});

// --- Question reprise et repose unique -------------------------------------

/** Joue l'Étape 1 jusqu'à une égalité sur q1, close : q1 est alors à reposer. */
async function egaliteSurQ1() {
  await claude.demarrerSeance();
  const alice = await rejoindre("alice");
  const bob = await rejoindre("bob");
  const { corps: etape } = await claude.publierOuverte(etapeTroisPropositions());
  await alice.repondre(etape.id, "q1", { proposition: "A" });
  await bob.repondre(etape.id, "q1", { proposition: "C" });
  assert.equal((await animateur.clore(etape.id)).corps.questions[0].statut, "a_reposer");
  return { alice, bob };
}

function questionReprise(id = "q2") {
  return { ...structuredClone(etapeTroisPropositions().questions[0]), id, reprise: "q1" };
}

test("une Question reprise qui retombe sur une égalité doit être départagée par l'Animateur", async () => {
  const { alice, bob } = await egaliteSurQ1();
  const { corps: etape2 } = await claude.publierOuverte({ ...etapeType(2), questions: [questionReprise()] });
  await alice.repondre(etape2.id, "q2", { proposition: "A" });
  await bob.repondre(etape2.id, "q2", { proposition: "C" });

  const sans = await animateur.clore(etape2.id);
  assert.equal(sans.statut, 409);
  assert.deepEqual(sans.corps.aDepartager, [{ question: "q2", exAequo: ["A", "C"] }]);

  const avec = await animateur.clore(etape2.id, { departages: { q2: "C" } });
  assert.equal(avec.statut, 200);
  assert.equal(avec.corps.questions[0].statut, "retenue");
  assert.equal(avec.corps.questions[0].retenue, "C");
});

test("une Question ne peut reprendre qu'une Question à reposer d'une Étape close", async () => {
  await claude.demarrerSeance();
  const alice = await rejoindre("alice");
  const { corps: etape } = await claude.publierOuverte(etapeType());
  await alice.repondre(etape.id, "q1", { proposition: "A" });
  await animateur.clore(etape.id); // q1 retenue, pas à reposer

  const retenue = await claude.publier({ ...etapeType(2), questions: [questionReprise()] });
  assert.equal(retenue.statut, 400);
  assert.match(retenue.corps.erreur ?? JSON.stringify(retenue.corps), /q1/);

  const inconnue = await claude.publier({ ...etapeType(2), questions: [{ ...questionReprise(), reprise: "q9" }] });
  assert.equal(inconnue.statut, 400);
});

test("le Récapitulatif donne le Numéro de chaque Question et signale la Question qu'une autre reprend", async () => {
  await egaliteSurQ1();
  const { corps: etape2 } = await claude.publierOuverte({ ...etapeType(2), questions: [questionReprise()] });
  await animateur.clore(etape2.id); // aucun Vote : la recommandée est retenue

  const { corps } = await claude.terminer();
  const lignes = corps.recapitulatif.split("\n");
  assert.ok(lignes.includes("- **Q1 · Où vit l'outil** : à reposer (partage des Votes)"), corps.recapitulatif);
  assert.ok(lignes.includes("- **Q2 · Où vit l'outil** (reprise de Q1) : Dépôt dédié (recommandée)"), corps.recapitulatif);
});

test("la vue des Joueurs indique le Numéro de la Question qu'une Question reprend", async () => {
  const { alice } = await egaliteSurQ1();
  await claude.publierOuverte({ ...etapeType(2), questions: [questionReprise()] });
  const [q2] = (await alice.etat()).etape.questions;
  assert.equal(q2.repriseDe, 1);
});

test("un identifiant de Question déjà utilisé dans une Étape précédente est refusé", async () => {
  await egaliteSurQ1();
  const reutilise = await claude.publier({ ...etapeType(2), questions: [questionReprise("q1")] });
  assert.equal(reutilise.statut, 400);
  assert.match(reutilise.corps.erreur, /q1/);
});

test("une Question à reposer ne peut être reprise qu'une fois", async () => {
  await egaliteSurQ1();
  const doublon = await claude.publier({
    ...etapeType(2),
    questions: [questionReprise("q2"), questionReprise("q3")],
  });
  assert.equal(doublon.statut, 400);

  const premiere = await claude.publier({ ...etapeType(2), questions: [questionReprise("q2")] });
  assert.equal(premiere.statut, 201);
});

test("une Question reprise ne peut plus être reposée : la repose est unique", async () => {
  const { alice } = await egaliteSurQ1();
  const { corps: etape2 } = await claude.publierOuverte({ ...etapeType(2), questions: [questionReprise("q2")] });
  await alice.repondre(etape2.id, "q2", { proposition: "A" });

  const refus = await animateur.clore(etape2.id, { aReposer: ["q2"] });
  assert.equal(refus.statut, 409);
  assert.match(refus.corps.erreur, /q2/);

  assert.equal((await animateur.clore(etape2.id)).statut, 200);
  const reprise = await claude.publier({ ...etapeType(3), questions: [questionReprise("q3")] });
  assert.equal(reprise.statut, 400); // q1 est déjà reprise par q2
});
