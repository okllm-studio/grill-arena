---
name: grilling-arena
description: Multiplayer grilling. The Questions are published on a local web page (grill-arena) where the Joueurs vote, comment and score points. Run by the user only, instead of `grilling` when several people decide together.
disable-model-invocation: true
---

# Grilling in the arena

Multiplayer version of `grill-with-docs` (Matt Pocock, `mattpocock-skills` plugin), which is `grilling` + `domain-modeling`. This skill takes both over:

- **`grilling`**: decision tree, frontier, one Étape = the whole frontier, a recommendation for every Question, facts are looked up, decisions are voted. Only the channel changes: the Questions go to the grill-arena page instead of the terminal, and the Joueurs decide by majority Vote. A split Vote is not settled: the Question goes back to the table, out loud.
- **`domain-modeling`**: applied throughout the Séance (see § 3, point 5), so that it leaves a `GLOSSARY.md`, ADRs and a working document for `to-spec`.

Prerequisite: the `mattpocock-skills` plugin installed (`domain-modeling` comes from it; `grilling` is the reference for the discipline). Load `domain-modeling` with the Skill tool at the start of the Séance. Do not run `grill-with-docs` itself: it would interview in the terminal instead of on the page.

The glossary and ADR files are created in the **grilled** repository (the current working directory), not in grill-arena.

Vocabulary: `GLOSSARY.md` of the grill-arena repository (Séance, Étape, Ouverture, Question, Numéro, Proposition recommandée/retenue, Question à reposer, Question reprise, Commentaire, Animateur, Co-animateur, Joueur). The French terms are the ones of the API and of the page: use them as they are.

Repository: the grill-arena clone this skill is installed from (resolve the symlink `~/.claude/skills/grilling-arena`; the repository is two levels above its target). Séances folder: `$GRILL_ARENA_DOSSIER`, otherwise `seances/` in that repository. It contains `.jeton` (the token) and `.port`.

## 1. Server

1. If `.port` exists and `curl -s http://127.0.0.1:<port>/api/etat` answers, reuse that server; the token is in `.jeton`.
2. Otherwise run `npm start` in the repository **in the background** (`run_in_background`), then read `.jeton` and `.port`.
3. Give the user the Animateur URL printed at startup (`…/?jeton=…`): the Animateur page shows the URL and the QR code for the Joueurs.

All the requests below carry `authorization: Bearer <token>` and `content-type: application/json`, on `http://127.0.0.1:<port>`.

## 2. Séance

`POST /api/seance` `{"titre": "<subject>", "prompt": "<the Animateur's initial request, in Markdown>"}`. This archives the previous Séance. The Prompt initial is displayed at the top of the page for the Joueurs until the Ouverture of Étape 1; the Animateur can edit it until then from their page, after which it is frozen (the server refuses any change, yours included) and reserved to the Animateur.

## 3. Each Étape

1. Compute the frontier as in `grilling`.
2. Publish: `POST /api/etapes`
   ```json
   {"numero": 1, "tranchees": 0, "aVenir": 6,
    "questions": [{"id": "q1", "titre": "…", "corps": "Markdown: context, stakes",
                   "propositions": [{"id": "A", "libelle": "…"}, {"id": "B", "libelle": "…"}],
                   "recommandee": "A"}]}
   ```
   - Closed, short and mutually exclusive Propositions; exactly one recommended. The reasoning and the justification of the recommendation go in `corps`.
   - `tranchees`: Questions already settled in the Séance; `aVenir`: an honest estimate of what remains in the tree.
   - Question identifiers are unique across the Séance (`q1`, `q2`…). A re-asked Question takes a new identifier and carries `"reprise": "<identifier of the Question taken over>"` (a Question à reposer of a closed Étape, otherwise 400): the Récapitulatif and the page display « reprise de Qn », and a tie on a Question reprise is no longer re-asked but broken by the Animateur; a Question à reposer is taken over only once, and a Question reprise can no longer be re-asked (closing is refused with 409).
   - A 400 answer describes the malformed Étape: fix and republish.
   - The server numbers the Questions continuously over the Séance (`numero`, in the result). Use these Numéros (« Q4 ») in the dialogue and in the text of the Questions: the page turns a mention of a Question of a closed Étape into a tooltip.
   - The published Étape stays pending: the Animateur (or a Co-animateur) opens it when the group is ready. Do not publish the next one before this one is closed.
3. Wait for the close (the wait covers the Ouverture and the vote): run **in the background** `curl -s -H "authorization: Bearer <token>" "http://127.0.0.1:<port>/api/etapes/<id>/resultat?attendre=1"`. Do not poll in a loop: the end of the command wakes the session. While waiting, look up the facts useful for the next branches.
4. Read the result: for each Question, `numero`, `statut` (`retenue` or `a_reposer`), `partage` (true when the Votes are split), `retenue`, `repartition`, `abstentions`, `commentaires` (nickname, text), then `tableau` (Points per Joueur, reserved to Claude and the Animateur during the Séance).
   - The Proposition retenue is the decision, even if it is not the recommended one. Do not question it.
   - The Commentaires count as « other » answers: they can open new branches or Questions.
   - A `a_reposer` Question comes back in the next Étape, reformulated with new Propositions drawn from the Commentaires. A `partage` of the Votes is one of them: it is a disagreement to re-ask, not a decision.
   - The goal is to discuss the specs out loud: in principle, everyone votes the same. A disagreement (split Votes, contradictory Commentaires) therefore hides an important unspoken point. Do not treat it as a mere count: name it in the terminal, read the Commentaires to find what separates the Joueurs, and re-ask it if needed.
5. In the terminal, summarise the decisions and the notable Commentaires in a few lines. Apply `domain-modeling` at every Étape, as in `grill-with-docs`: confront the terms used by the Joueurs and in the Commentaires with the `GLOSSARY.md` of the grilled repository, and immediately write what was just decided into `GLOSSARY.md` (a settled term) or `docs/adr/` (a decision that is hard to undo, surprising, and the result of a real trade-off). The glossary and the ADRs are updated during the Séance, not after.

## 4. End

When the frontier is empty: `POST /api/seance/fin`. The response contains `recapitulatif` (Markdown) and `statistiques` (Votes, Commentaires and Abstentions per Joueur, published to everyone with the Tableau). The page shows the podium and the Récapitulatif. Write the Récapitulatif into the grilled repository, as a working document for the spec: `docs/specs-to-implement/<subject>-recapitulatif.md`, with `label: needs-spec` as a header (do not overwrite it if it exists: complete it). Check that `GLOSSARY.md` and `docs/adr/` reflect the decisions of the Séance, then suggest the next step of the cycle: `to-spec` (run by the user), which starts from this document.
