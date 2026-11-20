---
name: grilling-arena
description: Multiplayer grilling. The Questions are published on a local web page (grill-arena) where the Players vote, comment and score Points. Run by the user only, instead of `grilling` when several people decide together.
disable-model-invocation: true
---

# Grilling in the arena

Multiplayer version of `grill-with-docs` (Matt Pocock, `mattpocock-skills` plugin), which is `grilling` + `domain-modeling`. This skill takes both over:

- **`grilling`**: decision tree, frontier, one Step = the whole frontier, a recommendation for every Question, facts are looked up, decisions are voted. Only the channel changes: the Questions go to the grill-arena page instead of the terminal, and the Players decide by majority Vote. A split vote is not settled: the Question goes back to the table, out loud.
- **`domain-modeling`**: applied throughout the Session (see § 3, point 5), so that it leaves a `GLOSSARY.md`, ADRs and a working document for `to-spec`.

Prerequisite: the `mattpocock-skills` plugin installed (`domain-modeling` comes from it; `grilling` is the reference for the discipline). Load `domain-modeling` with the Skill tool at the start of the Session. Do not run `grill-with-docs` itself: it would interview in the terminal instead of on the page.

The glossary and ADR files are created in the **grilled** repository (the current working directory), not in grill-arena.

Vocabulary: `GLOSSARY.md` of the grill-arena repository (Session, Step, Opening, Question, Number, Option, Recommended/Selected option, Question to re-ask, Re-asked question, Consensus, Comment, Facilitator, Co-facilitator, Player).

Repository: the grill-arena clone this skill is installed from (resolve the symlink `~/.claude/skills/grilling-arena`; the repository is two levels above its target). Sessions folder: `$GRILL_ARENA_DIR`, otherwise `sessions/` in that repository. It contains `.token` and `.port`.

## 1. Server

1. If `.port` exists and `curl -s http://127.0.0.1:<port>/api/state` answers, reuse that server; the token is in `.token`.
2. Otherwise run `npm start` in the repository **in the background** (`run_in_background`), then read `.token` and `.port`.
3. Give the user the Facilitator URL printed at startup (`…/?token=…`): the Facilitator page shows the URL and the QR code for the Players.

All the requests below carry `authorization: Bearer <token>` and `content-type: application/json`, on `http://127.0.0.1:<port>`.

## 2. Session

`POST /api/session` `{"title": "<subject>", "prompt": "<the Facilitator's initial request, in Markdown>"}`. This archives the previous Session. The Initial prompt is displayed at the top of the page for the Players until the Opening of Step 1; the Facilitator can edit it until then from their page, after which it is frozen (the server refuses any change, yours included) and reserved to the Facilitator.

## 3. Each Step

1. Compute the frontier as in `grilling`.
2. Publish: `POST /api/steps`
   ```json
   {"number": 1, "settled": 0, "remaining": 6,
    "questions": [{"id": "q1", "title": "…", "body": "Markdown: context, stakes",
                   "options": [{"id": "A", "label": "…"}, {"id": "B", "label": "…"}],
                   "recommended": "A"}]}
   ```
   - Closed, short and mutually exclusive Options; exactly one recommended. Identify them with consecutive capital letters starting at `A` (`A`, `B`, `C`…): the page shows the letter before each Option, and the `body` must cite the Options by these letters ("Option B"). The reasoning and the justification of the recommendation go in `body`.
   - `settled`: Questions already settled in the Session; `remaining`: an honest estimate of what remains in the tree.
   - Question identifiers are unique across the Session (`q1`, `q2`…). A re-asked Question takes a new identifier and carries `"reaskOf": "<identifier of the Question taken over>"` (a Question to re-ask of a closed Step, otherwise 400): the Summary and the page display "re-asked from Qn", and a tie on a Re-asked question is no longer re-asked but broken by the Facilitator; a Question to re-ask is taken over only once, and a Re-asked question can no longer be re-asked (closing is refused with 409).
   - A 400 answer describes the malformed Step: fix and republish.
   - The server numbers the Questions continuously over the Session (`number`, in the result). Use these Numbers ("Q4") in the dialogue and in the text of the Questions: the page turns a mention of a Question of a closed Step into a tooltip.
   - The published Step stays pending: the Facilitator (or a Co-facilitator) opens it when the group is ready. Do not publish the next one before this one is closed.
3. Wait for the close (the wait covers the Opening and the vote): run **in the background** `curl -s -H "authorization: Bearer <token>" "http://127.0.0.1:<port>/api/steps/<id>/result?wait=1"`. Do not poll in a loop: the end of the command wakes the session. While waiting, look up the facts useful for the next branches.
4. Read the result: for each Question, `number`, `status` (`selected` or `to_reask`), `split` (true when the Votes are split), `selected`, `consensus` (`consensus`, `near_consensus` or `divided`; absent when fewer than two Players voted), `distribution`, `abstentions`, `comments` (nickname, text), then, for the Step, `consensus` (`assessed` Questions, `atConsensus`, and `consensual`, present only when at least one Question is assessed) and `scoreboard` (Points per Player, reserved to Claude and the Facilitator during the Session).
   - The Selected option is the decision, even if it is not the recommended one. Do not question it.
   - The Comments count as "other" answers: they can open new branches or Questions.
   - A `to_reask` Question comes back in the next Step, reformulated with new Options drawn from the Comments. A `split` is one of them: it is a disagreement to re-ask, not a decision.
   - The Consensus levels measure how aligned the group is, not which Option wins: a `divided` or `near_consensus` Question, even with a Selected option, may hide a point worth naming out loud.
   - The goal is to discuss the specs out loud: in principle, everyone votes the same. A disagreement (split Votes, contradictory Comments) therefore hides an important unspoken point. Do not treat it as a mere count: name it in the terminal, read the Comments to find what separates the Players, and re-ask it if needed.
5. In the terminal, summarise the decisions and the notable Comments in a few lines. Apply `domain-modeling` at every Step, as in `grill-with-docs`: confront the terms used by the Players and in the Comments with the `GLOSSARY.md` of the grilled repository, and immediately write what was just decided into `GLOSSARY.md` (a settled term) or `docs/adr/` (a decision that is hard to undo, surprising, and the result of a real trade-off). The glossary and the ADRs are updated during the Session, not after.

## 4. End

When the frontier is empty: `POST /api/session/end`. The response contains `summary` (Markdown) and `statistics` (Votes, Comments and Abstentions per Player, published to everyone with the Scoreboard). The page shows the Scoreboard (a single ranked list, no podium) and the Summary. The Summary is generated in the Session's interface language (English or French, set by the Facilitator, `GRILL_LANG` by default). Write the Summary into the grilled repository, as a working document for the spec: `docs/specs-to-implement/<subject>-summary.md`, with `label: needs-spec` as a header (do not overwrite it if it exists: complete it). Check that `GLOSSARY.md` and `docs/adr/` reflect the decisions of the Session, then suggest the next step of the cycle: `to-spec` (run by the user), which starts from this document.
