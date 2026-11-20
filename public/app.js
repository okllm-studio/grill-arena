// Player / Facilitator page. State comes from /api/state; the SSE stream signals every change.

import { createTranslator, DEFAULT_LANGUAGE } from "/i18n.js";

// Every interface text comes from the catalogue (i18n.js), in the language of the Session (set at each render).
let { t, plural } = createTranslator(DEFAULT_LANGUAGE);

const token = new URLSearchParams(location.search).get("token");
const el = (id) => document.getElementById(id);

/** Closed list of interface languages, each named in its own language. */
const LANGUAGES = [
  ["en", "English"],
  ["fr", "Français"],
];

let state = null;
let scoreboardOpen = false;
let rulesOpen = false;
/** Displayed tab: "step", "results" or "facilitator". */
let tab = "step";
/** Last state received, serialized: avoids redrawing the page when nothing changed. */
let lastState = "";
/** Nickname being typed, kept across redraws; nicknameConflict: nickname already taken, offered for resuming. */
let typedNickname = "";
let nicknameConflict = null;
/** Questions whose tie must be broken after a refused closing: [{question, tiedOptions}] */
let toBreak = [];
/** Comments being typed, not yet saved: questionId → text */
const drafts = new Map();
/** Comments refused by the server: questionId → message */
const commentErrors = new Map();
/** Autosave: questionId → timer for the delay after the last keystroke */
const timers = new Map();
const SAVE_DELAY = 1000;
/** Step the drafts belong to; they are dropped when another Step appears. */
let trackedStep = null;
/** Initial prompt being edited by the Facilitator, not yet saved. */
let promptDraft = null;
/** Player access URLs, read once by the Facilitator. */
let info = null;
let invalidToken = false;
let infoLoading = false;

// --- Player identity, remembered per Session ---------------------------------

const storageKey = () => `grill-arena:${state?.session?.id}`;
function stored() {
  try {
    return JSON.parse(localStorage.getItem(storageKey()) ?? "null");
  } catch {
    return null;
  }
}
function remember(player) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(player));
  } catch {
    // storage unavailable: the Player will have to join again after a reload
  }
  sessionPlayer = player;
}
let sessionPlayer = null;
const player = () => stored() ?? sessionPlayer;

// --- Server exchanges -----------------------------------------------------------

/** A request that modifies the Session carries the Player's identity: a Co-facilitator is recognized by it. */
async function api(method, path, body, { keepalive = false } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (method !== "GET" && method !== "DELETE" && player() && (body === undefined || body.player === undefined)) {
    body = { player: player().id, ...(body ?? {}) };
  }
  const response = await fetch(
    method === "DELETE" && player() ? `${path}?player=${encodeURIComponent(player().id)}` : path,
    {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      keepalive,
    },
  );
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

let fetchCounter = 0;
/** Click or touch in progress: the redraw is delayed so the click is not lost. */
let pointerDown = false;
let renderPending = false;

async function refresh({ force = false } = {}) {
  const counter = ++fetchCounter;
  const p = player();
  const { data } = await api("GET", p ? `/api/state?player=${encodeURIComponent(p.id)}` : "/api/state");
  if (counter !== fetchCounter) return; // a more recent fetch was started in the meantime
  const serialized = JSON.stringify(data);
  // Question numbers restart at Q1 in a new Session: forget which ones were unfolded.
  if (data.session?.id !== state?.session?.id) unfoldedQuestions.clear();
  state = data;
  if (!force && serialized === lastState) return;
  lastState = serialized;
  if (pointerDown) renderPending = true;
  else render();
}

function notify(text) {
  el("message").textContent = text;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => (el("message").textContent = ""), 4000);
}

// --- Rendering helpers -----------------------------------------------------------

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// The Summary contains nicknames chosen by Players: raw HTML in the Markdown is shown as is, never interpreted.
marked.use({ renderer: { html: ({ text }) => escapeHtml(text) } });

const isFacilitator = () => Boolean(token);
const canControl = () => isFacilitator() || state?.coFacilitator === true;

/** Question number within the Session, shown so Players can refer to it. */
const heading = (q) =>
  `<span class="number">Q${q.number}</span>${escapeHtml(q.title ?? q.id)}${q.reaskOfNumber ? ` <small>${t("question.reaskedFrom", { number: q.reaskOfNumber })}</small>` : ""}`;

/** Option text prefixed with its identifier (A, B, C…), so it matches the letters cited in the body. */
const withLetter = (o) => `${o.id}. ${o.label}`;

const optionLabel = (q, id) => {
  const option = q.options.find((o) => o.id === id);
  return option ? withLetter(option) : id;
};

// --- References between Questions ------------------------------------------------

/** Questions of closed Steps, by number: used to fill the tooltips. */
function closedQuestions() {
  const index = new Map();
  for (const step of state?.results ?? []) {
    for (const q of step.questions) index.set(q.number, q);
  }
  return index;
}

function tooltipContent(q) {
  const r = q.result;
  const outcome =
    r.status === "selected"
      ? t("tooltip.selected", { option: optionLabel(q, r.selected) })
      : r.split
        ? t("tooltip.split")
        : t("tooltip.toReask");
  const distribution = q.options.map((o) => `${escapeHtml(withLetter(o))}: ${r.distribution[o.id]}`).join(" · ");
  const vote = q.myVote ? t("tooltip.yourVote", { option: escapeHtml(optionLabel(q, q.myVote)) }) : t("tooltip.noVote");
  return `<strong>Q${q.number} · ${escapeHtml(q.title)}</strong><br>${escapeHtml(outcome)}<br>${distribution}<br>${vote}`;
}

/** Turns `Qn` mentions of a closed Step's Question into references with a tooltip; the rest is unchanged. */
function withReferences(html) {
  const index = closedQuestions();
  if (!index.size) return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) {
    if (!walker.currentNode.parentElement.closest("code, pre, a")) texts.push(walker.currentNode);
  }
  for (const node of texts) {
    if (!/\bQ\d+\b/.test(node.textContent)) continue;
    const fragment = document.createDocumentFragment();
    for (const piece of node.textContent.split(/(\bQ\d+\b)/)) {
      const q = /^Q(\d+)$/.test(piece) ? index.get(Number(piece.slice(1))) : null;
      if (!q) {
        fragment.append(piece);
        continue;
      }
      const ref = document.createElement("span");
      ref.className = "ref";
      ref.tabIndex = 0;
      ref.dataset.reference = String(q.number);
      ref.append(piece);
      const bubble = document.createElement("span");
      bubble.className = "tooltip";
      bubble.setAttribute("role", "tooltip");
      bubble.innerHTML = tooltipContent(q);
      ref.append(bubble);
      fragment.append(ref);
    }
    node.replaceWith(fragment);
  }
  return container.innerHTML;
}

// --- Overall rendering -------------------------------------------------------------

function render() {
  const focus = document.activeElement?.id;
  const selection = focus && [document.activeElement.selectionStart, document.activeElement.selectionEnd];

  const stepId = state?.step?.id ?? null;
  if (stepId !== trackedStep) {
    trackedStep = stepId;
    drafts.clear();
    commentErrors.clear();
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
  }

  const session = state?.session;
  // The language comes from the state: Players switch with the next refresh, without reloading.
  ({ t, plural } = createTranslator(session?.language));
  document.documentElement.lang = session?.language ?? DEFAULT_LANGUAGE;
  el("title").textContent = session?.title ?? t("app.title");
  document.title = t("app.title");
  el("rules-button").textContent = t("header.rules");
  el("scoreboard-button").textContent = t("header.scoreboard");
  el("tabs").setAttribute("aria-label", t("tabs.label"));
  const s = state?.step;
  el("progress").textContent = !session
    ? ""
    : session.ended
      ? t("progress.ended")
      : s
        ? t("progress.step", { number: s.number, settled: s.settled, remaining: s.remaining })
        : t("progress.waiting");

  renderRules();
  renderScoreboard();
  renderTabs();
  renderControls();
  renderStep();
  renderResults();
  renderFacilitator();

  if (focus && el(focus)) {
    el(focus).focus();
    if (selection && el(focus).setSelectionRange) el(focus).setSelectionRange(...selection);
  }
}

function renderTabs() {
  const nav = el("tabs");
  if (!state?.session) {
    nav.hidden = true;
    el("content").hidden = false;
    el("results").hidden = true;
    el("facilitator").hidden = !isFacilitator();
    return;
  }
  const tabs = [
    ["step", t("tab.current")],
    ["results", state.results?.length ? t("tab.resultsCount", { count: state.results.length }) : t("tab.results")],
    ...(isFacilitator() ? [["facilitator", t("tab.facilitator")]] : []),
  ];
  if (!tabs.some(([id]) => id === tab)) tab = "step";
  nav.hidden = false;
  nav.innerHTML = tabs
    .map(
      ([id, label]) =>
        `<button type="button" role="tab" class="secondary" data-tab="${id}" aria-selected="${id === tab}">${label}</button>`,
    )
    .join("");
  el("content").hidden = tab !== "step";
  el("results").hidden = tab !== "results";
  el("facilitator").hidden = tab !== "facilitator";
}

// --- "Current Step" tab -----------------------------------------------------------------

function renderStep() {
  const session = state?.session;
  if (!session) {
    el("content").innerHTML = isFacilitator()
      ? ""
      : `<div class="card">${t("step.notStarted")}</div>`;
    return;
  }
  const s = state.step;
  // The Initial prompt is only shown to Players until the Opening of Step 1.
  const prompt =
    session.prompt && !session.promptLocked
      ? `<section class="panel prompt-visible"><h2>${t("step.initialPrompt")}</h2><div class="body-text">${marked.parse(session.prompt)}</div></section>`
      : "";

  if (session.ended) {
    el("content").innerHTML = endCard();
  } else if (!player()) {
    el("content").innerHTML = prompt + joinForm();
  } else if (!s) {
    el("content").innerHTML =
      prompt + `<div class="card">${t("step.welcome", { nickname: escapeHtml(player().nickname) })}</div>`;
  } else if (s.state === "pending") {
    el("content").innerHTML =
      prompt +
      `<p class="status" role="status">${t("step.pending", { number: s.number })}</p>` +
      (state.results?.length ? resultsBlock(state.results[0]) : "");
  } else {
    el("content").innerHTML =
      playerStatus(s) + s.questions.map((q) => questionCard(s, q)).join("");
  }
}

function joinForm() {
  return `<form class="card" id="join-form">
    <h2>${t("join.title")}</h2>
    <label for="nickname">${t("join.nickname")}</label>
    <input id="nickname" name="nickname" maxlength="30" autocomplete="nickname" value="${escapeHtml(typedNickname)}" required />
    <div class="actions"><button type="submit">${t("join.button")}</button></div>
    ${
      nicknameConflict
        ? `<p class="reask-status">${t("join.taken", { nickname: escapeHtml(nicknameConflict) })}</p>
           <div class="actions"><button type="button" class="secondary" data-resume>${t("join.resume")}</button></div>`
        : ""
    }
  </form>`;
}

/** Player status message: what they can do or what they are waiting for. */
function playerStatus(s) {
  let text;
  if (s.state === "closed") text = t("status.closed");
  else if (s.questions.every((q) => q.myVote !== null)) {
    text = t("status.answeredAll");
  } else text = t("status.vote");
  return `<p class="status" role="status">${text}</p>`;
}

/** Status indicator for a Question's Comment. */
function commentStatus(q) {
  if (commentErrors.has(q.id)) return commentErrors.get(q.id);
  const draft = drafts.get(q.id);
  if (draft !== undefined && draft !== q.myComment) return t("comment.unsaved");
  return q.myComment ? t("comment.saved") : "";
}

function renderRules() {
  el("rules").hidden = !rulesOpen;
  el("rules-button").setAttribute("aria-expanded", String(rulesOpen));
  if (!rulesOpen) return;
  const items = [1, 2, 3, 4, 5, 6].map((n) => `<li>${t(`rules.${n}`)}</li>`).join("");
  el("rules").innerHTML = `<h2>${t("rules.title")}</h2><ul>${items}</ul>`;
}

function questionCard(step, q) {
  const body = `<div class="body-text">${withReferences(marked.parse(q.body ?? ""))}</div>`;
  const title = `<h2>${heading(q)}</h2>`;
  if (step.state === "closed") {
    const unsent = drafts.get(q.id);
    const lost =
      unsent !== undefined && unsent !== q.myComment
        ? `<p class="comment-error">${t("comment.stepClosed")}</p><div class="draft">${escapeHtml(unsent)}</div>`
        : "";
    return `<article class="card">${title}${body}${questionResult(q)}${lost}</article>`;
  }

  const options = q.options
    .map(
      (o) => `<label class="option ${q.myVote === o.id ? "chosen" : ""}">
        <input type="radio" name="vote-${q.id}" data-question="${q.id}" value="${escapeHtml(o.id)}" ${q.myVote === o.id ? "checked" : ""} />
        <span>${withReferences(escapeHtml(withLetter(o)))}${o.id === q.recommended ? `<span class="badge recommended">${t("badge.recommended")}</span>` : ""}</span>
      </label>`,
    )
    .join("");
  const comment = drafts.get(q.id) ?? q.myComment;
  const distribution = q.distribution
    ? `<p class="counter">${t("question.distribution", { distribution: q.options.map((o) => `${escapeHtml(withLetter(o))} ${q.distribution[o.id]}`).join(" · ") })}</p>`
    : "";
  return `<article class="card">
    ${title}${body}
    <div class="options">${options}</div>
    <div class="actions">
      <button type="button" class="secondary" data-abstain="${q.id}" ${q.myVote ? "" : "disabled"}>${t("question.abstain")}</button>
      <span class="counter">${t("question.voted", { voters: q.voters, players: state.players })}</span>
    </div>
    ${distribution}
    <label for="comment-${q.id}" class="counter">${t("question.commentLabel")}</label>
    <textarea id="comment-${q.id}" data-comment="${q.id}" rows="2">${escapeHtml(comment)}</textarea>
    <p class="counter comment-status ${commentErrors.has(q.id) ? "comment-error" : ""}" data-comment-status="${q.id}" role="status">${commentStatus(q)}</p>
    ${q.myVote ? `<p class="counter">${t("question.voteSaved")}</p>` : ""}
  </article>`;
}

function questionResult(q) {
  const r = q.result;
  const total = Object.values(r.distribution).reduce((a, b) => a + b, 0) || 1;
  const bars = q.options
    .map((o) => {
      const n = r.distribution[o.id];
      const selected = r.status === "selected" && r.selected === o.id;
      return `<div class="bar ${selected ? "selected" : ""}">
        <div class="track"><div class="filled" style="width:${(n / total) * 100}%">
          ${selected ? "✓ " : ""}${escapeHtml(withLetter(o))}${o.id === q.recommended ? `<span class="badge recommended">${t("badge.recommended")}</span>` : ""}
        </div></div><span>${n}</span>
      </div>`;
    })
    .join("");
  const status =
    r.status === "to_reask"
      ? `<p class="reask-status">${r.split ? t("result.splitReask") : t("result.reask")}</p>`
      : "";
  const comments = r.comments.length
    ? `<ul class="comments">${r.comments
        .map((c) => `<li><strong>${escapeHtml(c.nickname)}</strong>: ${escapeHtml(c.text)}</li>`)
        .join("")}</ul>`
    : "";
  return `${status}${bars}<p class="counter">${plural(r.abstentions, "noun.abstention")}</p>${comments}`;
}

// --- "Results" tab ------------------------------------------------------------------------

/** Questions (by number) the user has unfolded: kept across re-renders triggered by live updates. */
const unfoldedQuestions = new Set();

/** Banner of a closed Step, from the server's figures; none when no Question was assessed. */
function consensusBanner(step) {
  const c = step.consensus;
  if (!c || !c.assessed) return "";
  const consensual = c.consensual === true;
  return `<p class="consensus-banner ${consensual ? "consensual" : "mixed"}" role="status">${escapeHtml(
    consensual
      ? t("fold.consensualStep")
      : t("fold.unanimous", { questions: plural(c.atConsensus, "noun.Question"), total: c.assessed }),
  )}</p>`;
}

/** Folded line of a Question: level mark with its label, outcome, text distribution, Comment indicator. */
function foldedSummary(q) {
  const r = q.result;
  const level = r.consensus ?? "unassessed";
  const selected = r.status === "selected" ? q.options.find((o) => o.id === r.selected) : null;
  const outcome = selected ? withLetter(selected) : t("fold.reask");
  const distribution = [
    ...q.options.map((o) => `${o.id} ${r.distribution[o.id]}`),
    `${t("fold.abstentions")} ${r.abstentions}`,
  ].join(" · ");
  const comments = r.comments.length
    ? `<span class="fold-comments">${t("fold.comments")}: ${r.comments.length}</span>`
    : "";
  return `<summary><span class="level level-${level}">${escapeHtml(t(`fold.level.${level}`))}</span>
    <span class="fold-title">${heading(q)}</span>
    <span class="fold-outcome">${escapeHtml(outcome)}</span>
    <span class="fold-distribution">${escapeHtml(distribution)}</span>${comments}</summary>`;
}

/** Results of a closed Step: Consensus banner, then Questions folded by default. */
function resultsBlock(step) {
  const questions = step.questions
    .map((q) => {
      const myChoice = q.myVote ? optionLabel(q, q.myVote) : null;
      const vote = myChoice ? t("results.yourVote", { option: escapeHtml(myChoice) }) : t("results.noVote");
      const open = unfoldedQuestions.has(q.number) ? "open" : "";
      return `<details class="question-result" data-fold="${q.number}" ${open}>${foldedSummary(q)}${questionResult(q)}<p class="counter">${vote}</p></details>`;
    })
    .join("");
  return `<section class="card"><h2>${t("results.title", { number: step.number })}</h2>${consensusBanner(step)}${questions}</section>`;
}

function renderResults() {
  if (!state?.session || tab !== "results") {
    el("results").innerHTML = "";
    return;
  }
  const steps = state.results ?? [];
  el("results").innerHTML = steps.length
    ? steps.map(resultsBlock).join("")
    : `<div class="card">${t("results.none")}</div>`;
}

// --- Scoreboard and statistics ----------------------------------------------------

function renderScoreboard() {
  // Once the Session has ended, the end-of-Session card shows the Scoreboard: no button, no panel.
  const available = Boolean(state?.scoreboard) && !state.session?.ended;
  el("scoreboard-button").hidden = !available;
  const visible = available && scoreboardOpen;
  el("scoreboard").hidden = !visible;
  el("scoreboard-button").setAttribute("aria-expanded", String(visible));
  if (!visible) return;
  el("scoreboard").innerHTML = scoreboardHtml();
}

function scoreboardHtml() {
  const stats = new Map((state.statistics ?? []).map((s) => [s.nickname, s]));
  const rows = state.scoreboard
    .map((l, i) => {
      const s = stats.get(l.nickname);
      return `<tr>
        <td>${i + 1}</td><td>${escapeHtml(l.nickname)}${l.nickname === player()?.nickname ? ` ${t("scoreboard.me")}` : ""}</td>
        <td class="num"><strong>${l.total}</strong></td>
        <td class="num">${l.stepGain ? `<span class="gain">+${l.stepGain}</span>` : ""}</td>
        <td class="num">${s?.votes ?? 0}</td><td class="num">${s?.comments ?? 0}</td><td class="num">${s?.abstentions ?? 0}</td>
      </tr>`;
    })
    .join("");
  return `<h2>${t("scoreboard.title")}</h2>
    <div class="scroll"><table><thead><tr><th>#</th><th>${t("scoreboard.player")}</th><th class="num">${t("scoreboard.points")}</th><th class="num">${t("scoreboard.step")}</th>
    <th class="num">${t("scoreboard.votes")}</th><th class="num">${t("scoreboard.comments")}</th><th class="num">${t("scoreboard.abstentions")}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/** End-of-Session card: the Scoreboard (only if the server sent it, i.e. published) shown once, then the Summary. */
function endCard() {
  return `<div class="card"><h2>${t("end.title")}</h2>
    ${state.scoreboard ? scoreboardHtml() : ""}</div>
    ${state.session.summary ? `<article class="card body-text">${marked.parse(state.session.summary)}</article>` : ""}`;
}

// --- Controls: Opening and closing (Facilitator and Co-facilitators) -----------------------

/** The Facilitator can fold the controls panel to free the screen; the action button stays visible. */
let controlsFolded = false;

function controlsHeader(title) {
  return `<div class="header-bar"><h2>${title}</h2>
    <button type="button" class="secondary" id="toggle-controls" aria-expanded="${!controlsFolded}">${controlsFolded ? t("controls.show") : t("controls.fold")}</button></div>`;
}

function renderControls() {
  const controls = el("controls");
  const s = state?.step;
  if (!canControl() || !state?.session || state.session.ended || !s || s.state === "closed") {
    controls.hidden = true;
    controls.innerHTML = "";
    return;
  }
  if (s.state === "pending") {
    controls.hidden = false;
    controls.innerHTML = `${controlsHeader(t("controls.ready", { number: s.number }))}
      <p class="counter" ${controlsFolded ? "hidden" : ""}>${t("controls.readyHint", { locked: s.number === 1 ? t("controls.readyLocked") : "" })}</p>
      <div class="actions"><button type="button" id="open-step">${t("controls.open", { number: s.number })}</button></div>`;
    return;
  }
  // Keep the choices in progress across refreshes.
  const checked = new Set([...controls.querySelectorAll("[data-reask]:checked")].map((c) => c.dataset.reask));
  const choices = Object.fromEntries([...controls.querySelectorAll("[data-tiebreak]")].map((x) => [x.dataset.tiebreak, x.value]));
  const reask = s.questions
    .map(
      (q) => `<label class="counter"><input type="checkbox" data-reask="${q.id}" style="width:auto" />
          ${t("controls.reaskLabel", { heading: heading(q), voters: q.voters, players: state.players })}</label>`,
    )
    .join("<br />");
  const tiebreaks = toBreak
    .map(({ question, tiedOptions }) => {
      const q = s.questions.find((x) => x.id === question);
      const options = tiedOptions
        .map((id) => `<option value="${escapeHtml(id)}">${escapeHtml(optionLabel(q, id))}</option>`)
        .join("");
      return `<label class="counter">${t("controls.tiebreak", { heading: heading(q) })}
          <select data-tiebreak="${question}">${options}</select></label>`;
    })
    .join("");
  controls.hidden = false;
  controls.innerHTML = `${controlsHeader(t("controls.closing", { number: s.number }))}
    <div ${controlsFolded ? "hidden" : ""}>
    <p class="counter">${t("controls.closingHint")}</p>
    <div>${reask}</div>${tiebreaks}</div>
    <div class="actions"><button type="button" id="close-step">${t("controls.close")}</button></div>`;
  for (const c of controls.querySelectorAll("[data-reask]")) c.checked = checked.has(c.dataset.reask);
  for (const x of controls.querySelectorAll("[data-tiebreak]")) if (choices[x.dataset.tiebreak]) x.value = choices[x.dataset.tiebreak];
}

// --- "Facilitator" tab -----------------------------------------------------------------------

/** What the Facilitator has to do, deduced from the Session state. */
function nextAction() {
  let text;
  if (!state?.session) {
    text = t("next.start");
  } else if (state.session.ended) {
    text = t("next.ended");
  } else if (!state.step) {
    text = t("next.waitFirst");
  } else if (state.step.state === "pending") {
    text = t("next.open", { number: state.step.number });
  } else if (state.step.state === "open") {
    text = t("next.close");
  } else {
    text = t("next.preparing");
  }
  return `<p class="status" role="status"><strong>${t("next.label")}</strong> ${text}</p>`;
}

async function loadInfo() {
  if (info || infoLoading || !token) return;
  infoLoading = true;
  const { ok, data } = await api("GET", "/api/info");
  infoLoading = false;
  if (ok) info = data.playerUrls;
  else invalidToken = true;
  renderFacilitator();
}

function renderFacilitator() {
  const area = el("facilitator");
  if (!token || area.hidden) return;
  if (invalidToken) {
    area.innerHTML = `<p>${t("facilitator.invalidToken")}</p>`;
    return;
  }
  if (!info) {
    loadInfo();
    return;
  }
  const [url] = info;
  const qr = qrcode(0, "M");
  qr.addData(url ?? location.origin);
  qr.make();

  const session = state?.session;
  const locked = session?.promptLocked === true;
  let content = "";
  if (session) {
    const prompt = locked
      ? `<h3>${t("step.initialPrompt")}</h3><p class="counter">${t("facilitator.promptLocked")}</p><div class="body-text">${marked.parse(session.prompt ?? "")}</div>`
      : `<h3>${t("step.initialPrompt")}</h3>
         <label for="prompt-edit" class="counter">${t("facilitator.promptHint")}</label>
         <textarea id="prompt-edit" rows="6">${escapeHtml(promptDraft ?? session.prompt ?? "")}</textarea>
         <div class="actions"><button type="button" id="save-prompt">${t("facilitator.savePrompt")}</button></div>`;
    const setting = `<h3>${t("facilitator.distribution")}</h3>
      <label><input type="checkbox" id="live-distribution" style="width:auto" ${session.liveDistribution ? "checked" : ""} ${locked ? "disabled" : ""} />
        ${t("facilitator.liveDistribution", { locked: locked ? t("facilitator.liveLocked") : "" })}</label>`;
    const language = `<h3>${t("facilitator.language")}</h3>
      <select id="language" aria-label="${t("facilitator.language")}">
        ${LANGUAGES.map(([code, name]) => `<option value="${code}" ${session.language === code ? "selected" : ""}>${name}</option>`).join("")}
      </select>`;
    // Once the Session has ended, the end-of-Session page carries the Scoreboard: no block here.
    const publication = session.ended
      ? ""
      : `<h3>${t("facilitator.publication")}</h3>
      ${state.scoreboard ? scoreboardHtml() : ""}
      <div class="actions"><button type="button" id="publish-stats" ${session.statisticsPublished ? "disabled" : ""}>
        ${session.statisticsPublished ? t("facilitator.published") : t("facilitator.publish")}</button></div>`;
    const participants = (state.participants ?? []).length
      ? `<h3>${t("facilitator.coFacilitators")}</h3>
         <p class="counter">${t("facilitator.coFacilitatorHint")}</p>
         <ul class="participant-list">${state.participants
           .map(
             (p) => `<li><span>${escapeHtml(p.nickname)}${p.coFacilitator ? ` <span class="badge recommended">${t("badge.coFacilitator")}</span>` : ""}</span>
               <button type="button" class="secondary" data-cofacilitator="${p.id}" data-active="${p.coFacilitator}">${p.coFacilitator ? t("facilitator.revoke") : t("facilitator.appoint")}</button></li>`,
           )
           .join("")}</ul>`
      : "";
    content = prompt + setting + language + publication + participants;
  }

  area.innerHTML = `<h2>${t("facilitator.title")}</h2>
    ${nextAction()}
    <h3>${t("facilitator.access")}</h3>
    <div class="access"><div class="qr">${qr.createSvgTag({ cellSize: 4, margin: 0 })}</div>
    <div>${info.map((u) => `<code>${escapeHtml(u)}</code>`).join("<br />")}</div></div>
    ${content}`;
}

// --- Actions -------------------------------------------------------------------------------------

async function savePrompt() {
  const { ok, data } = await api("PUT", "/api/session/prompt", { prompt: promptDraft ?? state.session.prompt });
  if (!ok) return notify(data.error ?? t("notify.promptRefused"));
  promptDraft = null;
  notify(t("notify.promptSaved"));
  await refresh({ force: true });
}

async function answer(questionId, body, options) {
  const { ok, status, data } = await api(
    "PUT",
    `/api/steps/${state.step.id}/questions/${questionId}/answer`,
    { player: player().id, ...body },
    options,
  );
  if (!ok && !(status === 409 && "comment" in body)) notify(data.error ?? t("notify.answerRefused"));
  return { ok, status };
}

async function join(resume) {
  const nickname = el("nickname")?.value ?? typedNickname;
  const { ok, status, data } = await api("POST", "/api/players", { nickname, resume });
  if (status === 409 && !resume && /already taken/.test(data.error ?? "")) {
    typedNickname = nickname;
    nicknameConflict = nickname.trim();
    return render();
  }
  if (!ok) return notify(data.error ?? t("notify.joinFailed"));
  nicknameConflict = null;
  typedNickname = "";
  remember(data);
  refresh({ force: true });
}

/** Saves a Question's Comment: while typing (with a delay), when leaving the field, when closing the page. */
async function saveComment(questionId, options) {
  clearTimeout(timers.get(questionId));
  timers.delete(questionId);
  const text = drafts.get(questionId);
  if (text === undefined || !player()) return;
  const question = state?.step?.questions.find((x) => x.id === questionId);
  if (question && text === question.myComment) {
    drafts.delete(questionId);
    return;
  }
  if (state?.step?.state !== "open") {
    commentErrors.set(questionId, t("comment.stepClosed"));
    return renderCommentStatus(questionId);
  }
  const { ok, status } = await answer(questionId, { comment: text }, options);
  if (!ok) {
    if (status === 409) commentErrors.set(questionId, t("comment.stepClosed"));
    await refresh({ force: true });
    return;
  }
  commentErrors.delete(questionId);
  if (drafts.get(questionId) === text) drafts.delete(questionId);
  if (options?.keepalive) return;
  await refresh({ force: true });
}

function renderCommentStatus(questionId) {
  const question = state?.step?.questions.find((x) => x.id === questionId);
  const status = document.querySelector(`[data-comment-status="${questionId}"]`);
  if (question && status) {
    status.textContent = commentStatus(question);
    status.classList.toggle("comment-error", commentErrors.has(questionId));
  } else if (!question) {
    render();
  }
}

/** Sends every pending Comment without waiting (page hidden or closed). */
function flushDrafts() {
  for (const questionId of [...drafts.keys()]) saveComment(questionId, { keepalive: true });
}

document.addEventListener("submit", async (ev) => {
  if (ev.target.id !== "join-form") return;
  ev.preventDefault();
  join(false);
});

document.addEventListener("change", async (ev) => {
  const q = ev.target.dataset.question;
  if (q) {
    await answer(q, { option: ev.target.value });
    return refresh({ force: true });
  }
  if (ev.target.id === "language") {
    const { ok, data } = await api("PUT", "/api/session/language", { language: ev.target.value });
    if (!ok) notify(data.error ?? t("notify.settingRefused"));
    return refresh({ force: true });
  }
  if (ev.target.id === "live-distribution") {
    const { ok, data } = await api("PUT", "/api/session/live-distribution", { enabled: ev.target.checked });
    if (!ok) notify(data.error ?? t("notify.settingRefused"));
    await refresh({ force: true });
  }
});

document.addEventListener("input", (ev) => {
  if (ev.target.id === "prompt-edit") {
    promptDraft = ev.target.value;
    return;
  }
  if (ev.target.id === "nickname") {
    typedNickname = ev.target.value;
    return;
  }
  const q = ev.target.dataset.comment;
  if (!q) return;
  drafts.set(q, ev.target.value);
  commentErrors.delete(q);
  renderCommentStatus(q);
  clearTimeout(timers.get(q));
  timers.set(q, setTimeout(() => saveComment(q), SAVE_DELAY));
});

// A redraw between press and release would lose the click: it is delayed.
document.addEventListener("pointerdown", () => (pointerDown = true));
for (const type of ["pointerup", "pointercancel"]) {
  document.addEventListener(type, () => {
    pointerDown = false;
    setTimeout(() => {
      if (renderPending && !pointerDown) {
        renderPending = false;
        render();
      }
    }, 50);
  });
}

// The Comment is also saved when leaving the field, switching apps or closing the page.
document.addEventListener("focusout", (ev) => {
  const q = ev.target.dataset?.comment;
  if (q && drafts.has(q)) saveComment(q);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) flushDrafts();
});
window.addEventListener("pagehide", flushDrafts);

/** Only one reference tooltip open at a time (tap on phones, where there is no hover). */
function toggleReference(ref) {
  const open = ref && !ref.classList.contains("open");
  for (const other of document.querySelectorAll(".ref.open")) other.classList.remove("open");
  if (open) ref.classList.add("open");
}

// "toggle" does not bubble: capture it to remember which results the user has unfolded.
document.addEventListener(
  "toggle",
  (ev) => {
    const fold = ev.target.dataset?.fold;
    if (fold === undefined) return;
    if (ev.target.open) unfoldedQuestions.add(Number(fold));
    else unfoldedQuestions.delete(Number(fold));
  },
  true,
);

document.addEventListener("click", async (ev) => {
  const target = ev.target instanceof Element ? ev.target : null;
  if (!target) return;
  toggleReference(target.closest(".ref"));
  const d = target.dataset;
  if (d.tab) {
    tab = d.tab;
    return render();
  }
  if (d.abstain) {
    await answer(d.abstain, { option: null });
    return refresh({ force: true });
  }
  if (target.id === "toggle-controls") {
    controlsFolded = !controlsFolded;
    return renderControls();
  }
  if (d.resume !== undefined) return join(true);
  if (d.cofacilitator) {
    const method = d.active === "true" ? "DELETE" : "PUT";
    const { ok, data } = await api(method, `/api/session/co-facilitators/${d.cofacilitator}`);
    if (!ok) notify(data.error ?? t("notify.appointmentRefused"));
    return refresh({ force: true });
  }
  if (target.id === "rules-button") {
    rulesOpen = !rulesOpen;
    return render();
  }
  if (target.id === "scoreboard-button") {
    scoreboardOpen = !scoreboardOpen;
    return render();
  }
  if (target.id === "save-prompt") return savePrompt();
  if (target.id === "publish-stats") {
    const { ok, data } = await api("POST", "/api/session/statistics", {});
    if (!ok) return notify(data.error ?? t("notify.publicationRefused"));
    notify(t("notify.statisticsPublished"));
    return refresh({ force: true });
  }
  if (target.id === "open-step") {
    const { ok, data } = await api("POST", `/api/steps/${state.step.id}/opening`, {});
    if (!ok) notify(data.error ?? t("notify.openingRefused"));
    return refresh({ force: true });
  }
  if (target.id === "close-step") {
    const toReask = [...document.querySelectorAll("[data-reask]:checked")].map((c) => c.dataset.reask);
    const tiebreaks = Object.fromEntries(
      [...document.querySelectorAll("[data-tiebreak]")].map((x) => [x.dataset.tiebreak, x.value]),
    );
    const { ok, status, data } = await api("POST", `/api/steps/${state.step.id}/closing`, { tiebreaks, toReask });
    if (status === 409 && data.tied) {
      toBreak = data.tied;
      notify(t("notify.tie"));
      return render();
    }
    if (!ok) return notify(data.error ?? t("notify.closingRefused"));
    toBreak = [];
    return refresh({ force: true });
  }
});

// --- Real time --------------------------------------------------------------------------------------

const stream = new EventSource("/api/events");
stream.addEventListener("change", () => refresh());
stream.addEventListener("open", () => refresh());
// Periodic fetch: the real-time stream may not get through (tunnel, mobile network).
setInterval(() => {
  if (!document.hidden) refresh();
}, 5000);
refresh();
