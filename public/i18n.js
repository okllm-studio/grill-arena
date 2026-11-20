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
    "rules.5": "You earn 1 Point if you voted for the selected Option. The Scoreboard and participation statistics are published at the end of the Session.",
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
    "tooltip.noVote": "You did not vote.",

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
    "question.voteSaved": "Vote saved, you can change it until the closing.",
    "result.splitReask": "Split vote: to be settled verbally, Claude will re-ask this Question.",
    "result.reask": "To re-ask: Claude will rephrase this Question.",

    // --- "Results" tab ---
    "fold.level.consensus": "Consensus",
    "fold.level.near_consensus": "Near-consensus",
    "fold.level.divided": "Divided",
    "fold.level.unassessed": "Not assessed",
    "fold.reask": "to re-ask",
    "fold.abstentions": "abst.",
    "fold.comments": "Comments",
    "fold.consensualStep": "Consensual Step",
    "fold.unanimous": "{questions} out of {total} unanimous",
    "results.yourVote": "Your Vote: {option}",
    "results.noVote": "You did not vote on this Question.",
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
};

/** Text of `key` in `lang`, `{placeholders}` filled from `params`. Falls back to English, then to the key itself. */
export function t(key, params = {}, lang = DEFAULT_LANGUAGE) {
  const text = catalogues[lang]?.[key] ?? catalogues[DEFAULT_LANGUAGE][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

/** "1 Point", "2 Points": `noun` is a key prefix with `.one` and `.other` forms. */
export function plural(n, noun, lang = DEFAULT_LANGUAGE) {
  return t(`${noun}.${n === 1 ? "one" : "other"}`, { n }, lang);
}

/** `t` and `plural` bound to a language, for a caller that renders everything in one language. */
export function createTranslator(lang = DEFAULT_LANGUAGE) {
  return {
    t: (key, params) => t(key, params, lang),
    plural: (n, noun) => plural(n, noun, lang),
  };
}
