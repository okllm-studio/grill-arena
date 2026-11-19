// Page Joueur / Animateur. L'état vient de /api/etat ; le flux SSE signale chaque changement.

const jeton = new URLSearchParams(location.search).get("jeton");
const el = (id) => document.getElementById(id);

let etat = null;
let tableauOuvert = false;
let reglesOuvertes = false;
/** Onglet affiché : "etape", "resultats" ou "animateur". */
let onglet = "etape";
/** Dernier état reçu, sérialisé : évite de redessiner la page quand rien n'a changé. */
let dernierEtat = "";
/** Pseudo en cours de saisie, conservé à travers les redessins ; conflit : pseudo déjà pris à proposer à la reprise. */
let pseudoSaisi = "";
let conflitPseudo = null;
/** Questions à départager après un refus de clôture : [{question, exAequo}] */
let aDepartager = [];
/** Commentaires en cours de saisie, non encore enregistrés : questionId → texte */
const brouillons = new Map();
/** Commentaires refusés par le serveur : questionId → message */
const erreursCommentaire = new Map();
/** Enregistrement automatique : questionId → minuteur du délai après la dernière frappe */
const minuteurs = new Map();
const DELAI_ENREGISTREMENT = 1000;
/** Étape dont dépendent les brouillons ; ils sont abandonnés quand une autre Étape apparaît. */
let etapeSuivie = null;
/** Prompt initial en cours de modification par l'Animateur, non encore enregistré. */
let promptBrouillon = null;
/** Adresses d'accès des Joueurs, lues une fois par l'Animateur. */
let infos = null;
let jetonInvalide = false;
let infosEnCours = false;

// --- Identité du Joueur, mémorisée par Séance -------------------------------

const cle = () => `grill-arena:${etat?.seance?.id}`;
function moi() {
  try {
    return JSON.parse(localStorage.getItem(cle()) ?? "null");
  } catch {
    return null;
  }
}
function memoriser(joueur) {
  try {
    localStorage.setItem(cle(), JSON.stringify(joueur));
  } catch {
    // stockage indisponible : le Joueur devra rejoindre à nouveau après rechargement
  }
  sessionJoueur = joueur;
}
let sessionJoueur = null;
const joueur = () => moi() ?? sessionJoueur;

// --- Échanges avec le serveur -----------------------------------------------

/** Une requête qui modifie la Séance porte l'identité du Joueur : un Co-animateur s'y reconnaît. */
async function api(methode, chemin, corps, { keepalive = false } = {}) {
  const entetes = { "content-type": "application/json" };
  if (jeton) entetes.authorization = `Bearer ${jeton}`;
  if (methode !== "GET" && methode !== "DELETE" && joueur() && (corps === undefined || corps.joueur === undefined)) {
    corps = { joueur: joueur().id, ...(corps ?? {}) };
  }
  const reponse = await fetch(
    methode === "DELETE" && joueur() ? `${chemin}?joueur=${encodeURIComponent(joueur().id)}` : chemin,
    {
      method: methode,
      headers: entetes,
      body: corps === undefined ? undefined : JSON.stringify(corps),
      keepalive,
    },
  );
  const donnees = await reponse.json().catch(() => ({}));
  return { ok: reponse.ok, statut: reponse.status, donnees };
}

let numeroReleve = 0;
/** Clic ou toucher en cours : on retarde le redessin pour ne pas perdre le clic. */
let pointeurEnfonce = false;
let renduEnAttente = false;

async function rafraichir({ forcer = false } = {}) {
  const numero = ++numeroReleve;
  const j = joueur();
  const { donnees } = await api("GET", j ? `/api/etat?joueur=${encodeURIComponent(j.id)}` : "/api/etat");
  if (numero !== numeroReleve) return; // un relevé plus récent a été lancé entre-temps
  const serialise = JSON.stringify(donnees);
  etat = donnees;
  if (!forcer && serialise === dernierEtat) return;
  dernierEtat = serialise;
  if (pointeurEnfonce) renduEnAttente = true;
  else afficher();
}

function signaler(texte) {
  el("message").textContent = texte;
  clearTimeout(signaler.minuteur);
  signaler.minuteur = setTimeout(() => (el("message").textContent = ""), 4000);
}

// --- Outils de rendu -----------------------------------------------------------

const echapper = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Le Récapitulatif contient des pseudos choisis par les Joueurs : le HTML brut du Markdown est affiché tel quel, jamais interprété.
marked.use({ renderer: { html: ({ text }) => echapper(text) } });

const estAnimateur = () => Boolean(jeton);
const peutPiloter = () => estAnimateur() || etat?.coAnimateur === true;

/** Numéro de la Question dans la Séance, affiché pour que les Joueurs puissent s'y référer. */
const intitule = (q) =>
  `<span class="numero">Q${q.numero}</span>${echapper(q.titre ?? q.id)}${q.repriseDe ? ` <small>(reprise de Q${q.repriseDe})</small>` : ""}`;

const libelleProposition = (q, id) => q.propositions.find((p) => p.id === id)?.libelle ?? id;

// --- Références entre Questions ------------------------------------------------

/** Questions des Étapes closes, par Numéro : de quoi remplir les infobulles. */
function questionsCloses() {
  const index = new Map();
  for (const etape of etat?.resultats ?? []) {
    for (const q of etape.questions) index.set(q.numero, q);
  }
  return index;
}

function contenuInfobulle(q) {
  const r = q.resultat;
  const issue =
    r.statut === "retenue"
      ? `Retenue : ${libelleProposition(q, r.retenue)}`
      : r.partage
        ? "Partage des Votes : renvoyée à l'oral"
        : "À reposer";
  const repartition = q.propositions.map((p) => `${echapper(p.libelle)} : ${r.repartition[p.id]}`).join(" · ");
  const vote = q.monVote ? `Votre Vote : ${echapper(libelleProposition(q, q.monVote))}` : "Vous n'avez pas voté.";
  return `<strong>Q${q.numero} · ${echapper(q.titre)}</strong><br>${echapper(issue)}<br>${repartition}<br>${vote}`;
}

/** Transforme les mentions `Qn` d'une Question d'une Étape close en références à infobulle ; le reste est inchangé. */
function avecReferences(html) {
  const index = questionsCloses();
  if (!index.size) return html;
  const conteneur = document.createElement("div");
  conteneur.innerHTML = html;
  const marcheur = document.createTreeWalker(conteneur, NodeFilter.SHOW_TEXT);
  const textes = [];
  while (marcheur.nextNode()) {
    if (!marcheur.currentNode.parentElement.closest("code, pre, a")) textes.push(marcheur.currentNode);
  }
  for (const noeud of textes) {
    if (!/\bQ\d+\b/.test(noeud.textContent)) continue;
    const fragment = document.createDocumentFragment();
    for (const morceau of noeud.textContent.split(/(\bQ\d+\b)/)) {
      const q = /^Q(\d+)$/.test(morceau) ? index.get(Number(morceau.slice(1))) : null;
      if (!q) {
        fragment.append(morceau);
        continue;
      }
      const ref = document.createElement("span");
      ref.className = "ref";
      ref.tabIndex = 0;
      ref.dataset.reference = String(q.numero);
      ref.append(morceau);
      const bulle = document.createElement("span");
      bulle.className = "infobulle";
      bulle.setAttribute("role", "tooltip");
      bulle.innerHTML = contenuInfobulle(q);
      ref.append(bulle);
      fragment.append(ref);
    }
    noeud.replaceWith(fragment);
  }
  return conteneur.innerHTML;
}

// --- Rendu général ---------------------------------------------------------------

function afficher() {
  const focus = document.activeElement?.id;
  const selection = focus && [document.activeElement.selectionStart, document.activeElement.selectionEnd];

  const etapeId = etat?.etape?.id ?? null;
  if (etapeId !== etapeSuivie) {
    etapeSuivie = etapeId;
    brouillons.clear();
    erreursCommentaire.clear();
    for (const minuteur of minuteurs.values()) clearTimeout(minuteur);
    minuteurs.clear();
  }

  const seance = etat?.seance;
  el("titre").textContent = seance?.titre ?? "Grill Arena";
  const e = etat?.etape;
  el("avancement").textContent = !seance
    ? ""
    : seance.terminee
      ? "Séance terminée"
      : e
        ? `Étape ${e.numero} · ${e.tranchees} tranchées · ~${e.aVenir} à venir`
        : "En attente de la première Étape";

  afficherRegles();
  afficherTableau();
  afficherOnglets();
  afficherPilotage();
  afficherEtape();
  afficherResultats();
  afficherAnimateur();

  if (focus && el(focus)) {
    el(focus).focus();
    if (selection && el(focus).setSelectionRange) el(focus).setSelectionRange(...selection);
  }
}

function afficherOnglets() {
  const nav = el("onglets");
  if (!etat?.seance) {
    nav.hidden = true;
    el("contenu").hidden = false;
    el("resultats").hidden = true;
    el("animateur").hidden = !estAnimateur();
    return;
  }
  const onglets = [
    ["etape", "Étape en cours"],
    ["resultats", `Résultats${etat.resultats?.length ? ` (${etat.resultats.length})` : ""}`],
    ...(estAnimateur() ? [["animateur", "Animateur"]] : []),
  ];
  if (!onglets.some(([id]) => id === onglet)) onglet = "etape";
  nav.hidden = false;
  nav.innerHTML = onglets
    .map(
      ([id, libelle]) =>
        `<button type="button" role="tab" class="secondaire" data-onglet="${id}" aria-selected="${id === onglet}">${libelle}</button>`,
    )
    .join("");
  el("contenu").hidden = onglet !== "etape";
  el("resultats").hidden = onglet !== "resultats";
  el("animateur").hidden = onglet !== "animateur";
}

// --- Onglet « Étape en cours » -----------------------------------------------------

function afficherEtape() {
  const seance = etat?.seance;
  if (!seance) {
    el("contenu").innerHTML = estAnimateur()
      ? ""
      : `<div class="carte">L'Animateur n'a pas encore lancé la Séance. Cette page se mettra à jour toute seule.</div>`;
    return;
  }
  const e = etat.etape;
  // Le Prompt initial n'est donné aux Joueurs que jusqu'à l'Ouverture de l'Étape 1.
  const prompt =
    seance.prompt && !seance.promptVerrouille
      ? `<section class="panneau prompt-visible"><h2>Prompt initial</h2><div class="corps">${marked.parse(seance.prompt)}</div></section>`
      : "";

  if (seance.terminee) {
    el("contenu").innerHTML = podium();
  } else if (!joueur()) {
    el("contenu").innerHTML = prompt + formulaireRejoindre();
  } else if (!e) {
    el("contenu").innerHTML =
      prompt + `<div class="carte">Bienvenue ${echapper(joueur().pseudo)}. Claude prépare la première Étape…</div>`;
  } else if (e.etat === "en_attente") {
    el("contenu").innerHTML =
      prompt +
      `<p class="statut" role="status">L'Animateur ouvrira l'Étape ${e.numero} : vous pourrez alors voter.</p>` +
      (etat.resultats?.length ? blocResultats(etat.resultats[0]) : "");
  } else {
    el("contenu").innerHTML =
      statutJoueur(e) + e.questions.map((q) => carteQuestion(e, q)).join("");
  }
}

function formulaireRejoindre() {
  return `<form class="carte" id="form-rejoindre">
    <h2>Rejoindre la Séance</h2>
    <label for="pseudo">Pseudo</label>
    <input id="pseudo" name="pseudo" maxlength="30" autocomplete="nickname" value="${echapper(pseudoSaisi)}" required />
    <div class="actions"><button type="submit">Rejoindre</button></div>
    ${
      conflitPseudo
        ? `<p class="statut-reposer">Le pseudo « ${echapper(conflitPseudo)} » est déjà pris. Si c'était vous (autre navigateur, données effacées), vous pouvez le reprendre.</p>
           <div class="actions"><button type="button" class="secondaire" data-reprendre>C'est moi, reprendre ce pseudo</button></div>`
        : ""
    }
  </form>`;
}

/** Message d'état du Joueur : ce qu'il peut faire ou ce qu'il attend. */
function statutJoueur(e) {
  let texte;
  if (e.etat === "close") texte = "Étape close. Claude prépare la suite…";
  else if (e.questions.every((q) => q.monVote !== null)) {
    texte = "Vous avez répondu à toutes les Questions. En attente de la clôture : vous pouvez encore changer vos Votes.";
  } else texte = "Votez pour une Proposition par Question (ou abstenez-vous). Votre Vote est modifiable jusqu'à la clôture.";
  return `<p class="statut" role="status">${texte}</p>`;
}

/** Indication d'état du Commentaire d'une Question. */
function statutCommentaire(q) {
  if (erreursCommentaire.has(q.id)) return erreursCommentaire.get(q.id);
  const brouillon = brouillons.get(q.id);
  if (brouillon !== undefined && brouillon !== q.monCommentaire) return "Modifications non enregistrées";
  return q.monCommentaire ? "✓ Enregistré" : "";
}

function afficherRegles() {
  el("regles").hidden = !reglesOuvertes;
  el("bouton-regles").setAttribute("aria-expanded", String(reglesOuvertes));
  if (!reglesOuvertes) return;
  el("regles").innerHTML = `<h2>Règles</h2>
    <ul>
      <li>Claude publie des Questions par Étape. L'Animateur ouvre chaque Étape ; vous votez alors pour une Proposition par Question, ou vous vous abstenez.</li>
      <li>Les Votes restent masqués jusqu'à la clôture de l'Étape ; vous pouvez changer le vôtre d'ici là.</li>
      <li>Un Commentaire est transmis à Claude et peut ouvrir de nouvelles Questions ; il ne compte pas comme un Vote.</li>
      <li>La Proposition retenue est celle qui a le plus de Votes. Sans aucun Vote, c'est la recommandée. En cas de partage des Votes, la Question est renvoyée à l'oral et Claude la repose.</li>
      <li>Vous gagnez 1 Point si vous avez voté pour la Proposition retenue. Le Tableau et les statistiques de participation sont publiés à la fin de la Séance.</li>
      <li>Quand les Commentaires montrent qu'aucune Proposition ne convient, l'Animateur peut aussi reposer la Question à l'Étape suivante.</li>
    </ul>`;
}

function carteQuestion(etape, q) {
  const corps = `<div class="corps">${avecReferences(marked.parse(q.corps ?? ""))}</div>`;
  const entete = `<h2>${intitule(q)}</h2>`;
  if (etape.etat === "close") {
    const nonEnvoye = brouillons.get(q.id);
    const perdu =
      nonEnvoye !== undefined && nonEnvoye !== q.monCommentaire
        ? `<p class="erreur-commentaire">Étape close avant l'envoi : copiez votre texte.</p><div class="brouillon">${echapper(nonEnvoye)}</div>`
        : "";
    return `<article class="carte">${entete}${corps}${resultatQuestion(q)}${perdu}</article>`;
  }

  const propositions = q.propositions
    .map(
      (p) => `<label class="proposition ${q.monVote === p.id ? "choisie" : ""}">
        <input type="radio" name="vote-${q.id}" data-question="${q.id}" value="${echapper(p.id)}" ${q.monVote === p.id ? "checked" : ""} />
        <span>${avecReferences(echapper(p.libelle))}${p.id === q.recommandee ? '<span class="badge reco">recommandée</span>' : ""}</span>
      </label>`,
    )
    .join("");
  const commentaire = brouillons.get(q.id) ?? q.monCommentaire;
  const repartition = q.repartition
    ? `<p class="compteur">Répartition : ${q.propositions.map((p) => `${echapper(p.libelle)} ${q.repartition[p.id]}`).join(" · ")}</p>`
    : "";
  return `<article class="carte">
    ${entete}${corps}
    <div class="propositions">${propositions}</div>
    <div class="actions">
      <button type="button" class="secondaire" data-abstention="${q.id}" ${q.monVote ? "" : "disabled"}>S'abstenir</button>
      <span class="compteur">${q.votants}/${etat.joueurs} ont voté</span>
    </div>
    ${repartition}
    <label for="commentaire-${q.id}" class="compteur">Commentaire (transmis à Claude, visible à la clôture)</label>
    <textarea id="commentaire-${q.id}" data-commentaire="${q.id}" rows="2">${echapper(commentaire)}</textarea>
    <p class="compteur statut-commentaire ${erreursCommentaire.has(q.id) ? "erreur-commentaire" : ""}" data-statut-commentaire="${q.id}" role="status">${statutCommentaire(q)}</p>
    ${q.monVote ? `<p class="compteur">Vote enregistré, modifiable jusqu'à la clôture.</p>` : ""}
  </article>`;
}

function resultatQuestion(q) {
  const r = q.resultat;
  const total = Object.values(r.repartition).reduce((a, b) => a + b, 0) || 1;
  const barres = q.propositions
    .map((p) => {
      const n = r.repartition[p.id];
      const retenue = r.statut === "retenue" && r.retenue === p.id;
      return `<div class="barre ${retenue ? "retenue" : ""}">
        <div class="piste"><div class="remplie" style="width:${(n / total) * 100}%">
          ${retenue ? "✓ " : ""}${echapper(p.libelle)}${p.id === q.recommandee ? '<span class="badge reco">recommandée</span>' : ""}
        </div></div><span>${n}</span>
      </div>`;
    })
    .join("");
  const statut =
    r.statut === "a_reposer"
      ? `<p class="statut-reposer">${r.partage ? "Partage des Votes : à reprendre à l'oral, Claude reposera cette Question." : "À reposer : Claude reformulera cette Question."}</p>`
      : "";
  const commentaires = r.commentaires.length
    ? `<ul class="commentaires">${r.commentaires
        .map((c) => `<li><strong>${echapper(c.pseudo)}</strong> : ${echapper(c.texte)}</li>`)
        .join("")}</ul>`
    : "";
  return `${statut}${barres}<p class="compteur">${r.abstentions} abstention(s)</p>${commentaires}`;
}

// --- Onglet « Résultats » ------------------------------------------------------------

/** Résultats d'une Étape close : Questions, répartition, Commentaires et Vote du Joueur. */
function blocResultats(etape) {
  const questions = etape.questions
    .map((q) => {
      const monChoix = q.monVote ? libelleProposition(q, q.monVote) : null;
      const vote = monChoix ? `Votre Vote : ${echapper(monChoix)}` : "Vous n'avez pas voté sur cette Question.";
      return `<article class="question-resultat"><h3>${intitule(q)}</h3>${resultatQuestion(q)}<p class="compteur">${vote}</p></article>`;
    })
    .join("");
  return `<section class="carte"><h2>Résultats de l'Étape ${etape.numero}</h2>${questions}</section>`;
}

function afficherResultats() {
  if (!etat?.seance || onglet !== "resultats") {
    el("resultats").innerHTML = "";
    return;
  }
  const etapes = etat.resultats ?? [];
  el("resultats").innerHTML = etapes.length
    ? etapes.map(blocResultats).join("")
    : `<div class="carte">Aucune Étape n'est encore close.</div>`;
}

// --- Tableau, statistiques, podium ----------------------------------------------------

function afficherTableau() {
  const disponible = Boolean(etat?.tableau);
  el("bouton-tableau").hidden = !disponible;
  const visible = disponible && tableauOuvert;
  el("tableau").hidden = !visible;
  el("bouton-tableau").setAttribute("aria-expanded", String(visible));
  if (!visible) return;
  el("tableau").innerHTML = tableauHtml();
}

function tableauHtml() {
  const stats = new Map((etat.statistiques ?? []).map((s) => [s.pseudo, s]));
  const lignes = etat.tableau
    .map((l, i) => {
      const s = stats.get(l.pseudo);
      return `<tr>
        <td>${i + 1}</td><td>${echapper(l.pseudo)}${l.pseudo === joueur()?.pseudo ? " (moi)" : ""}</td>
        <td class="nombre"><strong>${l.total}</strong></td>
        <td class="nombre">${l.gainEtape ? `<span class="gain">+${l.gainEtape}</span>` : ""}</td>
        <td class="nombre">${s?.votes ?? 0}</td><td class="nombre">${s?.commentaires ?? 0}</td><td class="nombre">${s?.abstentions ?? 0}</td>
      </tr>`;
    })
    .join("");
  return `<h2>Tableau des scores</h2>
    <div class="defile"><table><thead><tr><th>#</th><th>Joueur</th><th class="nombre">Points</th><th class="nombre">Étape</th>
    <th class="nombre">Votes</th><th class="nombre">Commentaires</th><th class="nombre">Abstentions</th></tr></thead><tbody>${lignes}</tbody></table></div>`;
}

function podium() {
  const [p1, p2, p3] = etat.tableau ?? [];
  const marche = (l, rang) =>
    l ? `<div class="marche p${rang}"><strong>${echapper(l.pseudo)}</strong>${l.total} pt(s)<br />${rang}<sup>e</sup></div>` : "";
  return `<div class="carte"><h2>Fin de la Séance</h2>
    <div class="podium">${marche(p2, 2)}${marche(p1, 1)}${marche(p3, 3)}</div>
    <div class="defile">${etat.tableau ? tableauHtml() : ""}</div></div>
    ${etat.seance.recapitulatif ? `<article class="carte corps">${marked.parse(etat.seance.recapitulatif)}</article>` : ""}`;
}

// --- Pilotage : Ouverture et clôture (Animateur et Co-animateurs) ------------------------

function afficherPilotage() {
  const pilotage = el("pilotage");
  const e = etat?.etape;
  if (!peutPiloter() || !etat?.seance || etat.seance.terminee || !e || e.etat === "close") {
    pilotage.hidden = true;
    pilotage.innerHTML = "";
    return;
  }
  if (e.etat === "en_attente") {
    pilotage.hidden = false;
    pilotage.innerHTML = `<h2>Étape ${e.numero} prête</h2>
      <p class="compteur">Claude a publié l'Étape. Les Joueurs ne voient pas encore ses Questions : ouvrez-la quand le groupe est prêt${e.numero === 1 ? " (le Prompt initial et la répartition en direct seront alors figés)" : ""}.</p>
      <div class="actions"><button type="button" id="ouvrir">Ouvrir l'Étape ${e.numero}</button></div>`;
    return;
  }
  // Conserver les choix en cours à travers les rafraîchissements.
  const coches = new Set([...pilotage.querySelectorAll("[data-reposer]:checked")].map((c) => c.dataset.reposer));
  const choix = Object.fromEntries([...pilotage.querySelectorAll("[data-departage]")].map((s) => [s.dataset.departage, s.value]));
  const reposer = e.questions
    .map(
      (q) => `<label class="compteur"><input type="checkbox" data-reposer="${q.id}" style="width:auto" />
          ${intitule(q)} (${q.votants}/${etat.joueurs} ont voté) : aucune Proposition ne convient, la reposer</label>`,
    )
    .join("<br />");
  const departages = aDepartager
    .map(({ question, exAequo }) => {
      const q = e.questions.find((x) => x.id === question);
      const options = exAequo
        .map((id) => `<option value="${echapper(id)}">${echapper(libelleProposition(q, id))}</option>`)
        .join("");
      return `<label class="compteur">Départager « ${intitule(q)} »
          <select data-departage="${question}">${options}</select></label>`;
    })
    .join("");
  pilotage.hidden = false;
  pilotage.innerHTML = `<h2>Clôture de l'Étape ${e.numero}</h2>
    <p class="compteur">Ne cochez que les Questions dont aucune Proposition ne convient ; les autres sont tranchées par les Votes (un partage est renvoyé à l'oral). Dans le cas normal, ne cochez rien.</p>
    <div>${reposer}</div>${departages}
    <div class="actions"><button type="button" id="clore">Clore l'Étape</button></div>`;
  for (const c of pilotage.querySelectorAll("[data-reposer]")) c.checked = coches.has(c.dataset.reposer);
  for (const s of pilotage.querySelectorAll("[data-departage]")) if (choix[s.dataset.departage]) s.value = choix[s.dataset.departage];
}

// --- Onglet « Animateur » -----------------------------------------------------------------

/** Ce que l'Animateur a à faire, déduit de l'état de la Séance. */
function prochaineAction() {
  let texte;
  if (!etat?.seance) {
    texte = "Lancez le skill <code>/grilling-arena</code> dans Claude Code pour démarrer la Séance.";
  } else if (etat.seance.terminee) {
    texte = "Séance terminée. Le Récapitulatif est dans l'onglet « Étape en cours » ; fermez le serveur avec Ctrl+C.";
  } else if (!etat.etape) {
    texte = "Attendez que Claude publie la première Étape.";
  } else if (etat.etape.etat === "en_attente") {
    texte = `Ouvrir l'Étape ${etat.etape.numero} (commande en haut de page) quand le groupe est prêt.`;
  } else if (etat.etape.etat === "ouverte") {
    texte = "Clore l'Étape (commandes en haut de page) quand tout le monde a voté.";
  } else {
    texte = "Claude prépare la suite : l'Étape suivante, ou la fin de la Séance.";
  }
  return `<p class="statut" role="status"><strong>Prochaine action :</strong> ${texte}</p>`;
}

async function chargerInfos() {
  if (infos || infosEnCours || !jeton) return;
  infosEnCours = true;
  const { ok, donnees } = await api("GET", "/api/infos");
  infosEnCours = false;
  if (ok) infos = donnees.urlsJoueurs;
  else jetonInvalide = true;
  afficherAnimateur();
}

function afficherAnimateur() {
  const zone = el("animateur");
  if (!jeton || zone.hidden) return;
  if (jetonInvalide) {
    zone.innerHTML = `<p>Jeton Animateur invalide. Ouvrez le lien « Animateur » affiché dans le terminal où tourne le serveur (<code>make start</code>), ou lu dans <code>seances/.jeton</code>.</p>`;
    return;
  }
  if (!infos) {
    chargerInfos();
    return;
  }
  const [url] = infos;
  const qr = qrcode(0, "M");
  qr.addData(url ?? location.origin);
  qr.make();

  const seance = etat?.seance;
  const verrouille = seance?.promptVerrouille === true;
  let corps = "";
  if (seance) {
    const prompt = verrouille
      ? `<h3>Prompt initial</h3><p class="compteur">Figé depuis l'Ouverture de l'Étape 1.</p><div class="corps">${marked.parse(seance.prompt ?? "")}</div>`
      : `<h3>Prompt initial</h3>
         <label for="prompt-edition" class="compteur">Visible par tous les Joueurs jusqu'à l'Ouverture de l'Étape 1 ; Markdown. Sert de point de départ au grilling.</label>
         <textarea id="prompt-edition" rows="6">${echapper(promptBrouillon ?? seance.prompt ?? "")}</textarea>
         <div class="actions"><button type="button" id="enregistrer-prompt">Enregistrer le prompt</button></div>`;
    const reglage = `<h3>Répartition des Votes</h3>
      <label><input type="checkbox" id="repartition-en-direct" style="width:auto" ${seance.repartitionEnDirect ? "checked" : ""} ${verrouille ? "disabled" : ""} />
        Afficher la répartition en direct, à partir de la moitié des votants${verrouille ? " (figé depuis l'Ouverture de l'Étape 1)" : ""}</label>`;
    const publication = `<h3>Tableau et statistiques</h3>
      ${etat.tableau ? tableauHtml() : ""}
      <div class="actions"><button type="button" id="publier-stats" ${seance.statistiquesPubliees || seance.terminee ? "disabled" : ""}>
        ${seance.statistiquesPubliees || seance.terminee ? "Statistiques publiées" : "Publier les statistiques aux Joueurs"}</button></div>`;
    const participants = (etat.participants ?? []).length
      ? `<h3>Co-animateurs</h3>
         <p class="compteur">Un Co-animateur peut ouvrir et clore les Étapes à votre place. Attention : quiconque reprend son pseudo obtient ses droits.</p>
         <ul class="liste-participants">${etat.participants
           .map(
             (p) => `<li><span>${echapper(p.pseudo)}${p.coAnimateur ? ' <span class="badge reco">co-animateur</span>' : ""}</span>
               <button type="button" class="secondaire" data-coanimateur="${p.id}" data-actif="${p.coAnimateur}">${p.coAnimateur ? "Révoquer" : "Désigner"}</button></li>`,
           )
           .join("")}</ul>`
      : "";
    corps = prompt + reglage + publication + participants;
  }

  zone.innerHTML = `<h2>Animateur</h2>
    ${prochaineAction()}
    <h3>Accès des Joueurs</h3>
    <div class="acces"><div class="qr">${qr.createSvgTag({ cellSize: 4, margin: 0 })}</div>
    <div>${infos.map((u) => `<code>${echapper(u)}</code>`).join("<br />")}</div></div>
    ${corps}`;
}

// --- Actions -------------------------------------------------------------------------------------

async function enregistrerPrompt() {
  const { ok, donnees } = await api("PUT", "/api/seance/prompt", { prompt: promptBrouillon ?? etat.seance.prompt });
  if (!ok) return signaler(donnees.erreur ?? "Prompt refusé");
  promptBrouillon = null;
  signaler("Prompt enregistré");
  await rafraichir({ forcer: true });
}

async function repondre(questionId, reponse, options) {
  const { ok, statut, donnees } = await api(
    "PUT",
    `/api/etapes/${etat.etape.id}/questions/${questionId}/reponse`,
    { joueur: joueur().id, ...reponse },
    options,
  );
  if (!ok && !(statut === 409 && "commentaire" in reponse)) signaler(donnees.erreur ?? "Réponse refusée");
  return { ok, statut };
}

async function rejoindre(reprendre) {
  const pseudo = el("pseudo")?.value ?? pseudoSaisi;
  const { ok, statut, donnees } = await api("POST", "/api/joueurs", { pseudo, reprendre });
  if (statut === 409 && !reprendre && /déjà pris/.test(donnees.erreur ?? "")) {
    pseudoSaisi = pseudo;
    conflitPseudo = pseudo.trim();
    return afficher();
  }
  if (!ok) return signaler(donnees.erreur ?? "Impossible de rejoindre");
  conflitPseudo = null;
  pseudoSaisi = "";
  memoriser(donnees);
  rafraichir({ forcer: true });
}

/** Enregistre le Commentaire d'une Question : à la frappe (avec délai), à la sortie du champ, à la fermeture de la page. */
async function enregistrerCommentaire(questionId, options) {
  clearTimeout(minuteurs.get(questionId));
  minuteurs.delete(questionId);
  const texte = brouillons.get(questionId);
  if (texte === undefined || !joueur()) return;
  const question = etat?.etape?.questions.find((x) => x.id === questionId);
  if (question && texte === question.monCommentaire) {
    brouillons.delete(questionId);
    return;
  }
  if (etat?.etape?.etat !== "ouverte") {
    erreursCommentaire.set(questionId, "Étape close avant l'envoi : copiez votre texte.");
    return afficherStatutCommentaire(questionId);
  }
  const { ok, statut } = await repondre(questionId, { commentaire: texte }, options);
  if (!ok) {
    if (statut === 409) erreursCommentaire.set(questionId, "Étape close avant l'envoi : copiez votre texte.");
    await rafraichir({ forcer: true });
    return;
  }
  erreursCommentaire.delete(questionId);
  if (brouillons.get(questionId) === texte) brouillons.delete(questionId);
  if (options?.keepalive) return;
  await rafraichir({ forcer: true });
}

function afficherStatutCommentaire(questionId) {
  const question = etat?.etape?.questions.find((x) => x.id === questionId);
  const statut = document.querySelector(`[data-statut-commentaire="${questionId}"]`);
  if (question && statut) {
    statut.textContent = statutCommentaire(question);
    statut.classList.toggle("erreur-commentaire", erreursCommentaire.has(questionId));
  } else if (!question) {
    afficher();
  }
}

/** Envoie sans attendre tous les Commentaires en suspens (page masquée ou fermée). */
function viderBrouillons() {
  for (const questionId of [...brouillons.keys()]) enregistrerCommentaire(questionId, { keepalive: true });
}

document.addEventListener("submit", async (ev) => {
  if (ev.target.id !== "form-rejoindre") return;
  ev.preventDefault();
  rejoindre(false);
});

document.addEventListener("change", async (ev) => {
  const q = ev.target.dataset.question;
  if (q) {
    await repondre(q, { proposition: ev.target.value });
    return rafraichir({ forcer: true });
  }
  if (ev.target.id === "repartition-en-direct") {
    const { ok, donnees } = await api("PUT", "/api/seance/repartition-en-direct", { actif: ev.target.checked });
    if (!ok) signaler(donnees.erreur ?? "Réglage refusé");
    await rafraichir({ forcer: true });
  }
});

document.addEventListener("input", (ev) => {
  if (ev.target.id === "prompt-edition") {
    promptBrouillon = ev.target.value;
    return;
  }
  if (ev.target.id === "pseudo") {
    pseudoSaisi = ev.target.value;
    return;
  }
  const q = ev.target.dataset.commentaire;
  if (!q) return;
  brouillons.set(q, ev.target.value);
  erreursCommentaire.delete(q);
  afficherStatutCommentaire(q);
  clearTimeout(minuteurs.get(q));
  minuteurs.set(q, setTimeout(() => enregistrerCommentaire(q), DELAI_ENREGISTREMENT));
});

// Un redessin entre l'appui et le relâchement ferait perdre le clic : on le retarde.
document.addEventListener("pointerdown", () => (pointeurEnfonce = true));
for (const type of ["pointerup", "pointercancel"]) {
  document.addEventListener(type, () => {
    pointeurEnfonce = false;
    setTimeout(() => {
      if (renduEnAttente && !pointeurEnfonce) {
        renduEnAttente = false;
        afficher();
      }
    }, 50);
  });
}

// Le Commentaire s'enregistre aussi quand on quitte le champ, change d'application ou ferme la page.
document.addEventListener("focusout", (ev) => {
  const q = ev.target.dataset?.commentaire;
  if (q && brouillons.has(q)) enregistrerCommentaire(q);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) viderBrouillons();
});
window.addEventListener("pagehide", viderBrouillons);

/** Un seul infobulle de référence ouverte à la fois (toucher sur téléphone, où il n'y a pas de survol). */
function basculerReference(ref) {
  const ouvrir = ref && !ref.classList.contains("ouverte");
  for (const autre of document.querySelectorAll(".ref.ouverte")) autre.classList.remove("ouverte");
  if (ouvrir) ref.classList.add("ouverte");
}

document.addEventListener("click", async (ev) => {
  const cible = ev.target instanceof Element ? ev.target : null;
  if (!cible) return;
  basculerReference(cible.closest(".ref"));
  const d = cible.dataset;
  if (d.onglet) {
    onglet = d.onglet;
    return afficher();
  }
  if (d.abstention) {
    await repondre(d.abstention, { proposition: null });
    return rafraichir({ forcer: true });
  }
  if (d.reprendre !== undefined) return rejoindre(true);
  if (d.coanimateur) {
    const methode = d.actif === "true" ? "DELETE" : "PUT";
    const { ok, donnees } = await api(methode, `/api/seance/co-animateurs/${d.coanimateur}`);
    if (!ok) signaler(donnees.erreur ?? "Désignation refusée");
    return rafraichir({ forcer: true });
  }
  if (cible.id === "bouton-regles") {
    reglesOuvertes = !reglesOuvertes;
    return afficher();
  }
  if (cible.id === "bouton-tableau") {
    tableauOuvert = !tableauOuvert;
    return afficher();
  }
  if (cible.id === "enregistrer-prompt") return enregistrerPrompt();
  if (cible.id === "publier-stats") {
    const { ok, donnees } = await api("POST", "/api/seance/statistiques", {});
    if (!ok) return signaler(donnees.erreur ?? "Publication refusée");
    signaler("Statistiques publiées");
    return rafraichir({ forcer: true });
  }
  if (cible.id === "ouvrir") {
    const { ok, donnees } = await api("POST", `/api/etapes/${etat.etape.id}/ouverture`, {});
    if (!ok) signaler(donnees.erreur ?? "Ouverture refusée");
    return rafraichir({ forcer: true });
  }
  if (cible.id === "clore") {
    const aReposer = [...document.querySelectorAll("[data-reposer]:checked")].map((c) => c.dataset.reposer);
    const departages = Object.fromEntries(
      [...document.querySelectorAll("[data-departage]")].map((s) => [s.dataset.departage, s.value]),
    );
    const { ok, statut, donnees } = await api("POST", `/api/etapes/${etat.etape.id}/cloture`, { aReposer, departages });
    if (statut === 409 && donnees.aDepartager) {
      aDepartager = donnees.aDepartager;
      signaler("Ex æquo : choisis la Proposition retenue, puis clos à nouveau.");
      return afficher();
    }
    if (!ok) return signaler(donnees.erreur ?? "Clôture refusée");
    aDepartager = [];
    return rafraichir({ forcer: true });
  }
});

// --- Temps réel -----------------------------------------------------------------------------------------

const flux = new EventSource("/api/evenements");
flux.addEventListener("changement", () => rafraichir());
flux.addEventListener("open", () => rafraichir());
// Relevé périodique : le flux temps réel peut ne pas passer (tunnel, réseau mobile).
setInterval(() => {
  if (!document.hidden) rafraichir();
}, 5000);
rafraichir();
