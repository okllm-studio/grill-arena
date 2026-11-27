label: ready-for-agent

# Session management for the Facilitator

Working document: `docs/specs-to-implement/session-management-summary.md` (decisions of the grilling Session, Q1 to Q9). Vocabulary: `GLOSSARY.md` (Session list, Reopening, Consultation, Shelving).

## Problem Statement

Every Session is stored, but the Facilitator cannot do anything with the stored ones. Finished Sessions pile up in the Sessions folder and are forgotten because the interface does not list them. An unfinished Session is silently resumed at server start without the Facilitator choosing it, and when the server holds no Session, the Facilitator's page is empty and says nothing about what can be done. Starting `/grilling-arena` with no subject has no meaning: the skill always creates a new Session, so Claude has no way to carry on a reopened one.

The end of a Session is a dead end too. The Summary and the Scoreboard are shown, then the Facilitator reads only "the Session is finished". Nothing says that the Summary feeds `to-spec`, nothing lets them copy the Summary, and nothing leads out of the finished Session.

## Solution

The server starts with no Session loaded. While none is loaded, the Facilitator's page shows the Session list: every stored Session with its title, date, state (unfinished or finished) and number of Steps, newest first. From it the Facilitator can:

- **reopen** an unfinished Session, which carries on from its last Step (Players find their nickname again, an open Step is still open);
- **consult** a finished Session, loaded read-only for everyone: Players see its Summary, Scoreboard and results too;
- **delete** any stored Session, after a confirmation, definitively.

Once a Session is loaded it can no longer be swapped from the interface. The Facilitator leaves it in one of two ways: **shelving** an unfinished Session (a pause, after a confirmation, the Session stays stored and reopenable) or going **back to the Session list** from a finished one. In both cases Players see the waiting screen until another Session is loaded.

On a finished Session, the Facilitator sees a "What now?" block: copy or download the Summary, a reminder that the next step of the cycle is `to-spec` (run by the user on Claude's side), and the link back to the Session list.

Creating a Session stays Claude's job. `/grilling-arena` with a subject creates a new Session as today. `/grilling-arena` without a subject invites the Facilitator to choose in the Session list, waits until a Session is loaded, rebuilds the frontier from its closed Steps and carries on.

## User Stories

1. As a Facilitator, I want the server to start without a Session loaded, so that I decide which Session to work on.
2. As a Facilitator, I want to see the list of all stored Sessions when none is loaded, so that finished Sessions are not forgotten.
3. As a Facilitator, I want each Session of the list to show its title, its start date, whether it is finished and how many Steps it has, so that I can recognise it.
4. As a Facilitator, I want the list sorted from the most recent Session to the oldest, so that the one I want is at the top.
5. As a Facilitator, I want an explicit message when no Session is stored, so that an empty page is not mistaken for a failure.
6. As a Facilitator, I want a hint on the empty screen telling me that a new Session is started from Claude with a subject, so that I know what to do first.
7. As a Facilitator, I want to reopen an unfinished Session from the list, so that I can carry on an interrupted grilling.
8. As a Facilitator, I want a reopened Session to keep its Players, their Votes, its Steps, its open Step and its scores, so that nothing is lost.
9. As a Player, I want to find my nickname again in a reopened Session, so that I can vote without creating a duplicate.
10. As a Facilitator, I want a finished Session to be impossible to reopen for further grilling, so that its Summary and Scoreboard cannot become stale.
11. As a Facilitator, I want to consult a finished Session from the list, so that I can reread its Summary, Scoreboard and results.
12. As a Player, I want a consulted Session to show me its Summary, Scoreboard and results, so that I can reread them as at the end of the Session.
13. As a Facilitator, I want a consulted Session to be read-only, so that no Vote, Player or Step can be added to it.
14. As a Facilitator, I want to delete a stored Session from the list, so that old Sessions do not accumulate.
15. As a Facilitator, I want a confirmation naming the Session before it is deleted, so that I do not delete the wrong one.
16. As a Facilitator, I want the deletion to be definitive, so that the folder really is cleaned.
17. As a Facilitator, I want the loaded Session never to be deletable, so that I cannot cut the ground from under the Players.
18. As a Facilitator, I want to be unable to switch Session from the interface once one is loaded, so that a grilling is never changed by mistake.
19. As a Facilitator, I want to shelve an unfinished Session at any time, so that I can pause when the group has to stop.
20. As a Facilitator, I want a confirmation before shelving, so that a misclick does not stop the grilling.
21. As a Facilitator, I want a shelved Session to stay stored and reopenable, so that the pause loses nothing.
22. As a Facilitator, I want shelving reserved to me and not to Co-facilitators, so that they only open and close Steps.
23. As a Player, I want the waiting screen when the Session is shelved or left, so that I understand there is nothing to vote on right now.
24. As a Facilitator, I want a shelved Session whose Step is open or pending to be reopened in the same Step, so that the group can resume exactly where it stopped.
25. As a Facilitator, I want, on a finished Session, a "What now?" block, so that I know what the interface allows after the Summary.
26. As a Facilitator, I want to copy the Summary as Markdown in one click, so that I do not hunt for it in the terminal.
27. As a Facilitator, I want to download the Summary as a Markdown file, so that I can keep it.
28. As a Facilitator, I want a reminder that `to-spec` (run by the user on Claude's side) is the next step, so that the cycle does not stop at the Summary.
29. As a Facilitator, I want a "Back to the Session list" link on a finished Session, so that I can consult or delete another one.
30. As a Player, I want the waiting screen after the Facilitator goes back to the list, so that I know the Session is over for the page.
31. As a Facilitator, I want no "close the Session" button on a finished Session, so that "closing" keeps its single meaning (closing a Step).
32. As a Facilitator, I want `/grilling-arena` with a subject to create a new Session as today, so that my usual flow is unchanged.
33. As a Facilitator, I want `/grilling-arena` without a subject to wait for my choice in the Session list, so that I can reopen a Session from Claude's side.
34. As Claude, I want to wait until a Session is loaded, so that I do not poll.
35. As Claude, I want to rebuild the frontier from the closed Steps of the loaded Session (Questions, Selected options, Comments), so that I carry on without the old conversation.
36. As Claude, I want a loaded Session with an open or pending Step to be carried on, not republished, so that the Players keep their answers.
37. As a Facilitator, I want Claude's creation of a Session to keep replacing the loaded Session (which stays stored and reopenable), so that the skill keeps working as today.
38. As a Facilitator, I want the Session list, the confirmations and the "What now?" block in the interface language (English or French), so that the page is consistent.
39. As a Facilitator, I want every management action to require my token, so that Players cannot touch the stored Sessions.
40. As a Facilitator, I want a Session file that cannot be read to be left out of the list rather than break it, so that one corrupt file does not hide the others.

## Implementation Decisions

- **Storage module**: gains listing of all readable Sessions (summary data only: identifier, title, start date, finished or not, number of Steps), loading one by identifier and deleting one by identifier. The "last unfinished Session" lookup goes away with the automatic resume. Unreadable or unknown-shape files are ignored, as today. Deleting an unknown identifier is a not-found.
- **Server startup**: no Session is loaded at start. The state view still answers `{session: null}` until one is loaded.
- **API (all reserved to the Facilitator's token unless noted)**:
  - list the stored Sessions (newest first, with a flag telling which one is loaded, if any);
  - load a stored Session by identifier: refused with a conflict if a Session is already loaded, not-found if unknown. Loading an unfinished Session is a Reopening, loading a finished one is a Consultation; both go through the same route and give the same state as after a restart;
  - unload the loaded Session (shelving, or back to the Session list): saves it, releases the long-polls waiting on its Steps with a conflict like a replaced Session does, and leaves no Session loaded. No refusal on a finished Session;
  - delete a stored Session by identifier: refused with a conflict if it is the loaded one, not-found if unknown;
  - the state view, when called with the Facilitator's token and a wait flag, holds the request until a Session is loaded and then answers with the state; without a Session loaded and without the flag it answers `{session: null}` as today. This is what lets the skill wait for the Facilitator's choice.
- **Session creation** (`POST` of a new Session) keeps replacing the loaded Session, saved first, as today. Only the interface blocks switching. This asymmetry is accepted (decision Q7).
- **Finished Session**: a loaded finished Session refuses answers, new Steps and a second end; joining with a new nickname is refused too (added by this work), while resuming an existing nickname stays possible. Consultation relies on that. Its Summary and Scoreboard are visible to everyone, as at the end of a Session.
- **Players' screen**: with no Session loaded, Players see the existing "not started" waiting screen; no new state. A Player whose Session was unloaded under them returns to that screen at the next refresh (the change signal already reaches them).
- **Facilitator's page**: with no Session loaded, the Session list replaces the empty "start" text, with the hint that a new Session is started from Claude with a subject. Each row offers Reopen (unfinished) or Consult (finished), plus Delete with a confirmation naming the Session. With an unfinished Session loaded, the Facilitator tab gains a Shelve action with a confirmation. On a finished Session, the end-of-Session area gains the "What now?" block (copy Summary, download Summary as Markdown, reminder of `to-spec`, link back to the Session list); the "next action" text of a finished Session names these.
- **Roles**: Shelving, deleting, loading and going back to the list are Facilitator-only; a Co-facilitator and a Player are refused (same refusal rules as the other reserved routes).
- **Interface text**: every new string goes through the translation catalogue in both languages; no hard-coded text. Vocabulary follows `GLOSSARY.md`: "Shelve" (not "close the Session"), "Session list", "Reopen", "Consult".
- **Skill**: its instructions change. With a subject: unchanged (create). Without a subject: read the state, invite the Facilitator to choose in the Session list, wait on the state with the wait flag, then rebuild the frontier from the closed Steps and Comments and carry on (an open or pending Step is waited on, not republished). The state the Facilitator sees must carry what Claude needs to rebuild: closed Steps with their Questions, Selected options and Comments, and the current Step; if something is missing, add it to the Facilitator's view only.
- **Documentation**: the README and the skill describe the new flow; `GLOSSARY.md` already carries the four new terms. No ADR.

## Testing Decisions

- **One seam: the HTTP API**, in the existing API test file, with the real server on a temporary folder and the existing `claude`, `facilitator` and Player roles. A good test checks external behaviour only (statuses and what each role sees), never internal state or file layout, except that a deleted Session's file is gone from the folder.
- **Cases to cover**: a restart no longer loads a Session automatically but keeps it listed; the list is newest first, flags finished Sessions and the loaded one, and skips an unreadable file; loading an unfinished Session restores its Players, Steps, open Step and scores (nickname resumption included); loading a finished Session gives its Summary and Scoreboard to a Player and refuses join, answer and new Steps; loading while one is loaded is refused; unloading releases Claude's long-poll with a conflict and leaves `{session: null}`; unloading a finished Session works; delete removes the file, refuses the loaded Session, answers not-found for an unknown one; every new route is refused without the token, to a Player and to a Co-facilitator; the state wait holds until a Session is loaded and returns at once when one is already loaded; creating a Session while one is loaded still replaces it and keeps the old one listed and reopenable.
- **Prior art**: the restart test (resume with Players, open Step and scores), the "starting a new Session archives the previous one" test, the reserved-routes tests, and Claude's long-poll tests.
- **Interface**: not covered by automated tests (as for the Abstention radio); the manual checklist gains the Session list (empty, with Sessions), reopen, consult, delete with confirmation, shelve with confirmation, the "What now?" block and the Players' waiting screen, in both languages.
- **Translation catalogue**: the existing parity test must keep passing with the new keys.
- Targeted tests only during development (API test file and the catalogue test); the full suite at commit.

## Out of Scope

- Creating a Session from the interface (a "New Session" form): creation stays Claude's.
- Reopening a finished Session for further Steps, or undoing its end.
- A trash, undo or multi-select deletion; bulk clean-up.
- A preview of a finished Session reserved to the Facilitator without loading it.
- Blocking Claude's replacement of the loaded Session through the API.
- Renaming, searching, filtering or exporting Sessions other than copying or downloading the Summary.
- A "Close the Session" act on a finished Session.
- Changing the end-of-Session computation (Summary, Scoreboard, statistics).

## Further Notes

- The grilling Session settled the first answer of Q4 and Q5 with a "Close the Session" act, then the Facilitator's Comments corrected it: finished Sessions need no closing, only a way back to the Session list, and "Shelve" is for unfinished Sessions only. This spec follows the corrected version.
- Because only the interface blocks switching, a Session that Claude replaces while Players are voting disappears from their page at the next refresh; the skill should ask the Facilitator before creating a Session when one is unfinished and loaded.
- Once implemented, move this spec to `docs/specs/` in the same commit as the code (or the review fixes), and delete the working document `session-management-summary.md` or move it along, as the Facilitator prefers.
