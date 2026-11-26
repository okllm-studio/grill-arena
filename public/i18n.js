// Translation catalogue, shared by the server (imported by src/session.js) and the browser (imported by app.js,
// served as a static file). English is the reference: a key missing from another language falls back to it.
//
// Texts may contain {placeholders}, filled from the `params` of t(). A few texts carry HTML markup
// (<code>, <strong>); parameters inserted into them are escaped by the caller when they go to the page.
// Not in the catalogue: content supplied by Claude or Players, and the API error messages for Claude.

export const DEFAULT_LANGUAGE = "en";

export const catalogues = {
  en: {
    // --- Nouns with a singular and a plural form (see plural()) ---
    "noun.Point.one": "{n} Point",
    "noun.Point.other": "{n} Points",
    "noun.Question.one": "{n} Question",
    "noun.Question.other": "{n} Questions",
    "noun.abstention.one": "{n} abstention",
    "noun.abstention.other": "{n} abstentions",
    "noun.nonAnswer.one": "{n} non-answer",
    "noun.nonAnswer.other": "{n} non-answers",

    // --- Summary (built by the server) ---
    "summary.title": "# Summary: {title}",
    "summary.step": "## Step {number}",
    "summary.questionHeading": "**Q{number} · {title}**",
    "summary.reaskedFrom": "(re-asked from Q{number})",
    "summary.toReask": "to re-ask",
    "summary.splitVote": "(split vote)",
    "summary.recommended": "recommended",
    "summary.notRecommended": "not recommended",
    "summary.scoreboard": "## Scoreboard",
    "summary.scoreRow": "{rank}. {nickname}: {total} ({points})",

    // --- Page header, tabs, rules ---
    "app.title": "Grill Arena",
    "progress.ended": "Session ended",
    "progress.step": "Step {number} · {settled} settled · ~{remaining} to go",
    "progress.waiting": "Waiting for the first Step",
    "header.rules": "Rules",
    "header.scoreboard": "Scoreboard",
    "tabs.label": "Sections",
    "tab.current": "Current Step",
    "tab.results": "Results",
    "tab.resultsCount": "Results ({count})",
    "tab.facilitator": "Facilitator",
    "rules.title": "Rules",
    "rules.1": "Claude publishes Questions in Steps. The Facilitator opens each Step; you then vote for one Option per Question, or abstain.",
    "rules.2": "Votes stay hidden until the Step is closed; you can change yours until then.",
    "rules.3": "A Comment is passed on to Claude and can open new Questions; it does not count as a Vote.",
    "rules.4": "The selected Option is the one with the most Votes. With no Vote at all, it is the recommended one. On a split vote, the Question is settled verbally and Claude re-asks it.",
    "rules.5": "You earn 1 Point if you voted for the selected Option. If you answer a Question with neither a Vote nor an Abstention, you lose 1 Point once it is settled. Abstaining costs nothing. The Scoreboard and participation statistics are published at the end of the Session.",
    "rules.6": "When the Comments show that no Option fits, the Facilitator can also re-ask the Question in the next Step.",

    // --- Questions ---
    "question.reaskedFrom": "(re-asked from Q{number})",
    "badge.recommended": "recommended",
    "badge.coFacilitator": "co-facilitator",

    // --- Tooltip of a reference to a closed Question ---
    "tooltip.selected": "Selected: {option}",
    "tooltip.split": "Split vote: to be settled verbally",
    "tooltip.toReask": "To re-ask",
    "tooltip.yourVote": "Your Vote: {option}",
    "tooltip.noVote": "You did not answer.",
    "tooltip.abstained": "You abstained.",

    // --- "Current Step" tab ---
    "step.notStarted": "The Facilitator has not started the Session yet. This page will update by itself.",
    "step.initialPrompt": "Initial prompt",
    "step.welcome": "Welcome {nickname}. Claude is preparing the first Step…",
    "step.pending": "The Facilitator will open Step {number}: you will then be able to vote.",
    "join.title": "Join the Session",
    "join.nickname": "Nickname",
    "join.button": "Join",
    "join.taken": "The nickname \"{nickname}\" is already taken. If it was you (other browser, cleared data), you can take it back.",
    "join.resume": "It's me, resume this nickname",
    "status.closed": "Step closed. Claude is preparing what comes next…",
    "status.answeredAll": "You have answered every Question. Waiting for the closing: you can still change your Votes.",
    "status.vote": "Vote for one Option per Question (or abstain). You can change your Vote until the closing.",
    "comment.unsaved": "Unsaved changes",
    "comment.saved": "✓ Saved",
    "comment.stepClosed": "Step closed before sending: copy your text.",
    "question.abstain": "Abstain",
    "question.voted": "{voters}/{players} voted",
    "question.distribution": "Distribution: {distribution}",
    "question.commentLabel": "Comment (passed on to Claude, visible at closing)",
    "question.voteSaved": "Answer saved, you can change it until the closing.",
    "result.splitReask": "Split vote: to be settled verbally, Claude will re-ask this Question.",
    "result.reask": "To re-ask: Claude will rephrase this Question.",

    // --- "Results" tab ---
    "fold.level.consensus": "Consensus",
    "fold.level.near_consensus": "Near-consensus",
    "fold.level.divided": "Divided",
    "fold.level.unassessed": "Not assessed",
    "fold.reask": "to re-ask",
    "fold.abstentions": "abst.",
    "fold.nonAnswers": "no ans.",
    "fold.comments": "Comments",
    "fold.consensualStep": "Consensual Step",
    "fold.unanimous": "{questions} out of {total} unanimous",
    "results.yourVote": "Your Vote: {option}",
    "results.noVote": "You did not answer this Question.",
    "results.abstained": "You abstained on this Question.",
    "results.title": "Results of Step {number}",
    "results.none": "No Step has been closed yet.",

    // --- Scoreboard and end of Session ---
    "scoreboard.title": "Scoreboard",
    "scoreboard.me": "(me)",
    "scoreboard.player": "Player",
    "scoreboard.points": "Points",
    "scoreboard.step": "Step",
    "scoreboard.votes": "Votes",
    "scoreboard.comments": "Comments",
    "scoreboard.abstentions": "Abstentions",
    "scoreboard.nonAnswers": "Non-answers",
    "end.title": "End of the Session",

    // --- Controls (Opening and closing) ---
    "controls.show": "Show",
    "controls.fold": "Fold",
    "controls.ready": "Step {number} ready",
    "controls.readyHint": "Claude has published the Step. Players cannot see its Questions yet: open it when the group is ready{locked}.",
    "controls.readyLocked": " (the Initial prompt and the live distribution will then be locked)",
    "controls.open": "Open Step {number}",
    "controls.closing": "Closing of Step {number}",
    "controls.reaskLabel": "{heading} ({voters}/{players} voted): no Option fits, re-ask it",
    "controls.tiebreak": "Break the tie on \"{heading}\"",
    "controls.closingHint": "Only tick the Questions where no Option fits; the others are settled by the Votes (a split vote is settled verbally). Normally, tick nothing.",
    "controls.close": "Close the Step",

    // --- "Facilitator" tab ---
    "next.label": "Next action:",
    "next.start": "Run the <code>/grilling-arena</code> skill in Claude Code to start the Session.",
    "next.ended": "Session ended. The Summary is in the \"Current Step\" tab; stop the server with Ctrl+C.",
    "next.waitFirst": "Wait for Claude to publish the first Step.",
    "next.open": "Open Step {number} (control at the top of the page) when the group is ready.",
    "next.close": "Close the Step (controls at the top of the page) when everyone has voted.",
    "next.preparing": "Claude is preparing what comes next: the next Step, or the end of the Session.",
    "facilitator.invalidToken": "Invalid Facilitator token. Open the \"Facilitator\" link shown in the terminal where the server is running (<code>make start</code>), or read it from <code>sessions/.token</code>.",
    "facilitator.title": "Facilitator",
    "facilitator.access": "Player access",
    "facilitator.promptLocked": "Locked since the Opening of Step 1.",
    "facilitator.promptHint": "Visible to all Players until the Opening of Step 1; Markdown. Used as the starting point of the grilling.",
    "facilitator.savePrompt": "Save the prompt",
    "facilitator.distribution": "Vote distribution",
    "facilitator.liveDistribution": "Show the live distribution, once half of the Players have voted{locked}",
    "facilitator.liveLocked": " (locked since the Opening of Step 1)",
    "facilitator.publication": "Scoreboard and statistics",
    "facilitator.published": "Statistics published",
    "facilitator.publish": "Publish the statistics to Players",
    "facilitator.coFacilitators": "Co-facilitators",
    "facilitator.coFacilitatorHint": "A Co-facilitator can open and close Steps in your place. Be careful: anyone who takes back their nickname gets their rights.",
    "facilitator.language": "Interface language",
    "facilitator.revoke": "Revoke",
    "facilitator.appoint": "Appoint",

    // --- Notifications ---
    "notify.promptRefused": "Prompt refused",
    "notify.promptSaved": "Prompt saved",
    "notify.answerRefused": "Answer refused",
    "notify.joinFailed": "Could not join",
    "notify.settingRefused": "Setting refused",
    "notify.appointmentRefused": "Appointment refused",
    "notify.publicationRefused": "Publication refused",
    "notify.statisticsPublished": "Statistics published",
    "notify.openingRefused": "Opening refused",
    "notify.closingRefused": "Closing refused",
    "notify.tie": "Tie: choose the selected Option, then close again.",
  },
  fr: {
    // --- Nouns with a singular and a plural form (see plural(): in French, 0 takes the singular) ---
    "noun.Point.one": "{n} point",
    "noun.Point.other": "{n} points",
    "noun.Question.one": "{n} question",
    "noun.Question.other": "{n} questions",
    "noun.abstention.one": "{n} abstention",
    "noun.abstention.other": "{n} abstentions",
    "noun.nonAnswer.one": "{n} non-réponse",
    "noun.nonAnswer.other": "{n} non-réponses",

    // --- Summary (built by the server) ---
    "summary.title": "# Synthèse : {title}",
    "summary.step": "## Étape {number}",
    "summary.questionHeading": "**Q{number} · {title}**",
    "summary.reaskedFrom": "(reposée depuis Q{number})",
    "summary.toReask": "à reposer",
    "summary.splitVote": "(vote partagé)",
    "summary.recommended": "recommandée",
    "summary.notRecommended": "non recommandée",
    "summary.scoreboard": "## Tableau des scores",
    "summary.scoreRow": "{rank}. {nickname}: {total} ({points})",

    // --- Page header, tabs, rules ---
    "app.title": "Grill Arena",
    "progress.ended": "Session terminée",
    "progress.step": "Étape {number} · {settled} tranchées · ~{remaining} à venir",
    "progress.waiting": "En attente de la première Étape",
    "header.rules": "Règles",
    "header.scoreboard": "Tableau des scores",
    "tabs.label": "Sections",
    "tab.current": "Étape en cours",
    "tab.results": "Résultats",
    "tab.resultsCount": "Résultats ({count})",
    "tab.facilitator": "Animateur",
    "rules.title": "Règles",
    "rules.1": "Claude publie des Questions par Étapes. L’Animateur ouvre chaque Étape ; vous votez alors pour une Option par Question, ou vous vous abstenez.",
    "rules.2": "Les Votes restent cachés jusqu’à la clôture de l’Étape ; vous pouvez modifier le vôtre jusque-là.",
    "rules.3": "Un Commentaire est transmis à Claude et peut ouvrir de nouvelles Questions ; il ne compte pas comme un Vote.",
    "rules.4": "L’Option retenue est celle qui a le plus de Votes. Sans aucun Vote, c’est l’Option recommandée. En cas de vote partagé, la Question est tranchée à l’oral et Claude la repose.",
    "rules.5": "Vous gagnez 1 point si vous avez voté pour l’Option retenue. Si vous ne répondez à une Question ni par un Vote ni par une abstention, vous perdez 1 point une fois la Question tranchée. S’abstenir ne coûte rien. Le Tableau des scores et les statistiques de participation sont publiés à la fin de la Session.",
    "rules.6": "Quand les Commentaires montrent qu’aucune Option ne convient, l’Animateur peut aussi reposer la Question dans l’Étape suivante.",

    // --- Questions ---
    "question.reaskedFrom": "(reposée depuis Q{number})",
    "badge.recommended": "recommandée",
    "badge.coFacilitator": "co-animateur",

    // --- Tooltip of a reference to a closed Question ---
    "tooltip.selected": "Retenue : {option}",
    "tooltip.split": "Vote partagé : à trancher à l’oral",
    "tooltip.toReask": "À reposer",
    "tooltip.yourVote": "Votre Vote : {option}",
    "tooltip.noVote": "Vous n’avez pas répondu.",
    "tooltip.abstained": "Vous vous êtes abstenu.",

    // --- "Current Step" tab ---
    "step.notStarted": "L’Animateur n’a pas encore démarré la Session. Cette page se mettra à jour toute seule.",
    "step.initialPrompt": "Prompt initial",
    "step.welcome": "Bienvenue {nickname}. Claude prépare la première Étape…",
    "step.pending": "L’Animateur va ouvrir l’Étape {number} : vous pourrez alors voter.",
    "join.title": "Rejoindre la Session",
    "join.nickname": "Pseudo",
    "join.button": "Rejoindre",
    "join.taken": "Le pseudo « {nickname} » est déjà pris. Si c’était vous (autre navigateur, données effacées), vous pouvez le reprendre.",
    "join.resume": "C’est moi, reprendre ce pseudo",
    "status.closed": "Étape clôturée. Claude prépare la suite…",
    "status.answeredAll": "Vous avez répondu à toutes les Questions. En attente de la clôture : vous pouvez encore modifier vos Votes.",
    "status.vote": "Votez pour une Option par Question (ou abstenez-vous). Vous pouvez modifier votre Vote jusqu’à la clôture.",
    "comment.unsaved": "Modifications non enregistrées",
    "comment.saved": "✓ Enregistré",
    "comment.stepClosed": "Étape clôturée avant l’envoi : copiez votre texte.",
    "question.abstain": "S’abstenir",
    "question.voted": "{voters}/{players} ont voté",
    "question.distribution": "Répartition : {distribution}",
    "question.commentLabel": "Commentaire (transmis à Claude, visible à la clôture)",
    "question.voteSaved": "Réponse enregistrée, vous pouvez la modifier jusqu’à la clôture.",
    "result.splitReask": "Vote partagé : à trancher à l’oral, Claude reposera cette Question.",
    "result.reask": "À reposer : Claude reformulera cette Question.",

    // --- "Results" tab ---
    "fold.level.consensus": "Unanime",
    "fold.level.near_consensus": "Quasi unanime",
    "fold.level.divided": "Divisée",
    "fold.level.unassessed": "Non évaluée",
    "fold.reask": "à reposer",
    "fold.abstentions": "abst.",
    "fold.nonAnswers": "sans rép.",
    "fold.comments": "Commentaires",
    "fold.consensualStep": "Étape consensuelle",
    "fold.unanimous": "{questions} sur {total} unanimes",
    "results.yourVote": "Votre Vote : {option}",
    "results.noVote": "Vous n’avez pas répondu à cette Question.",
    "results.abstained": "Vous vous êtes abstenu sur cette Question.",
    "results.title": "Résultats de l’Étape {number}",
    "results.none": "Aucune Étape n’a encore été clôturée.",

    // --- Scoreboard and end of Session ---
    "scoreboard.title": "Tableau des scores",
    "scoreboard.me": "(moi)",
    "scoreboard.player": "Joueur",
    "scoreboard.points": "Points",
    "scoreboard.step": "Étape",
    "scoreboard.votes": "Votes",
    "scoreboard.comments": "Commentaires",
    "scoreboard.abstentions": "Abstentions",
    "scoreboard.nonAnswers": "Non-réponses",
    "end.title": "Fin de la Session",

    // --- Controls (Opening and closing) ---
    "controls.show": "Afficher",
    "controls.fold": "Replier",
    "controls.ready": "Étape {number} prête",
    "controls.readyHint": "Claude a publié l’Étape. Les Joueurs ne voient pas encore ses Questions : ouvrez-la quand le groupe est prêt{locked}.",
    "controls.readyLocked": " (le Prompt initial et la répartition en direct seront alors verrouillés)",
    "controls.open": "Ouvrir l’Étape {number}",
    "controls.closing": "Clôture de l’Étape {number}",
    "controls.reaskLabel": "{heading} ({voters}/{players} ont voté) : aucune Option ne convient, la reposer",
    "controls.tiebreak": "Départager « {heading} »",
    "controls.closingHint": "Ne cochez que les Questions où aucune Option ne convient ; les autres sont tranchées par les Votes (un vote partagé se tranche à l’oral). Normalement, ne cochez rien.",
    "controls.close": "Clôturer l’Étape",

    // --- "Facilitator" tab ---
    "next.label": "Prochaine action :",
    "next.start": "Lancez la compétence <code>/grilling-arena</code> dans Claude Code pour démarrer la Session.",
    "next.ended": "Session terminée. La Synthèse est dans l’onglet « Étape en cours » ; arrêtez le serveur avec Ctrl+C.",
    "next.waitFirst": "Attendez que Claude publie la première Étape.",
    "next.open": "Ouvrez l’Étape {number} (commande en haut de la page) quand le groupe est prêt.",
    "next.close": "Clôturez l’Étape (commandes en haut de la page) quand tout le monde a voté.",
    "next.preparing": "Claude prépare la suite : l’Étape suivante, ou la fin de la Session.",
    "facilitator.invalidToken": "Jeton d’Animateur invalide. Ouvrez le lien « Facilitator » affiché dans le terminal où tourne le serveur (<code>make start</code>), ou lisez-le dans <code>sessions/.token</code>.",
    "facilitator.title": "Animateur",
    "facilitator.access": "Accès des Joueurs",
    "facilitator.promptLocked": "Verrouillé depuis l’Ouverture de l’Étape 1.",
    "facilitator.promptHint": "Visible de tous les Joueurs jusqu’à l’Ouverture de l’Étape 1 ; Markdown. Sert de point de départ au grilling.",
    "facilitator.savePrompt": "Enregistrer le prompt",
    "facilitator.distribution": "Répartition des Votes",
    "facilitator.liveDistribution": "Afficher la répartition en direct, dès que la moitié des Joueurs ont voté{locked}",
    "facilitator.liveLocked": " (verrouillé depuis l’Ouverture de l’Étape 1)",
    "facilitator.language": "Langue de l’interface",
    "facilitator.publication": "Tableau des scores et statistiques",
    "facilitator.published": "Statistiques publiées",
    "facilitator.publish": "Publier les statistiques aux Joueurs",
    "facilitator.coFacilitators": "Co-animateurs",
    "facilitator.coFacilitatorHint": "Un Co-animateur peut ouvrir et clôturer les Étapes à votre place. Attention : toute personne qui reprend son pseudo récupère ses droits.",
    "facilitator.revoke": "Révoquer",
    "facilitator.appoint": "Nommer",

    // --- Notifications ---
    "notify.promptRefused": "Prompt refusé",
    "notify.promptSaved": "Prompt enregistré",
    "notify.answerRefused": "Réponse refusée",
    "notify.joinFailed": "Impossible de rejoindre",
    "notify.settingRefused": "Réglage refusé",
    "notify.appointmentRefused": "Nomination refusée",
    "notify.publicationRefused": "Publication refusée",
    "notify.statisticsPublished": "Statistiques publiées",
    "notify.openingRefused": "Ouverture refusée",
    "notify.closingRefused": "Clôture refusée",
    "notify.tie": "Égalité : choisissez l’Option retenue, puis clôturez à nouveau.",
  },
};

/** Text of `key` in `lang`, `{placeholders}` filled from `params`. Falls back to English, then to the key itself. */
export function t(key, params = {}, lang = DEFAULT_LANGUAGE) {
  const text = catalogues[lang]?.[key] ?? catalogues[DEFAULT_LANGUAGE][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

/** "1 Point", "2 Points": `noun` is a key prefix with `.one` and `.other` forms. */
export function plural(n, noun, lang = DEFAULT_LANGUAGE) {
  const size = Math.abs(n);
  const singular = lang === "fr" ? size <= 1 : size === 1;
  return t(`${noun}.${singular ? "one" : "other"}`, { n }, lang);
}

/** `t` and `plural` bound to a language, for a caller that renders everything in one language. */
export function createTranslator(lang = DEFAULT_LANGUAGE) {
  return {
    t: (key, params) => t(key, params, lang),
    plural: (n, noun) => plural(n, noun, lang),
  };
}
