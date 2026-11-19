---
label: ready-for-agent
---

# Grill Arena: UX improvements and built-in documentation

Vocabulary: `GLOSSARY.md` at the root of the repository. Stemming from a grilling Session (12 Questions, 4 Steps) run on grill-arena itself. Previous spec: `docs/specs/grill-arena.md`.

## Problem Statement

A Player or a Facilitator who opens the grill-arena page does not know what to do. Without a Session, the page says "Waiting for a Session…" without saying that the skill must be launched in Claude Code. The rules of the game (hidden Votes, Comments passed on to Claude, Points) are written nowhere in the page. The Facilitator does not understand the "Close the Step" panel (should the boxes be ticked?) nor what to do next. The Player does not know whether their Vote or Comment is saved, nor what they are waiting for. The Vote counter only updates on the Facilitator's page, and pages go stale without anyone knowing. A Player who reloads in private browsing is stuck: their nickname is already taken. After a closing, nothing indicates that Claude is preparing the next Step, and the end page does not display the Summary of the decisions.

## Solution

The page guides everyone according to their role and the state of the Session. It explains the rules on demand, confirms each action visibly, keeps itself up to date, lets a Player resume their nickname, announces that Claude is preparing the next Step and displays the Summary at the end of the Session. The README opens with a "Quick start" for the Facilitator.

## User Stories

1. As a Player, I want to read "The Facilitator has not started the Session yet" when no Session exists, so that I know I just have to wait and not that something is broken
2. As a Facilitator, I want a box explaining that I must run `/grilling-arena` in Claude Code when no Session exists, so that I know how to start
3. As a Facilitator, I want that box to appear only on my page (the one opened with the token), so that Players are not shown technical jargon
4. As a Facilitator opening the page with an invalid or missing token, I want an error message that tells me to take the Facilitator link displayed in the terminal running the server, so that I can get a valid link
5. As a Player, I want a "Rules" button in the header opening a panel, so that I can read how the game works without leaving the vote
6. As a Player, I want the Rules panel to say that Votes stay hidden until the Step is closed, so that I understand why I do not see others' choices
7. As a Player, I want the Rules panel to say that Comments are sent to Claude and do not count as a Vote, so that I know what they are for
8. As a Player, I want the Rules panel to explain Points, so that I understand the Scoreboard
9. As a Player, I want the Rules panel to say that the Recommended option is selected when nobody votes, so that abstaining is not a surprise
10. As a Player, I want to close the Rules panel with the same button, so that it does not clutter the screen
11. As a Facilitator, I want a "Next action" line that changes with the state of the Session, so that I always know what to do next
12. As a Facilitator, I want the line to say "Wait for Claude to publish the first Step" before the first Step, so that I do not look for a button that does not exist
13. As a Facilitator, I want the line to say "Close the Step when everyone has voted" while a Step is open, so that I know when to act
14. As a Facilitator, I want the line to say "Claude is preparing the next Step" after a closing, so that I do not wait for a button
15. As a Facilitator, I want the "Close the Step" panel to explain in one sentence that I only tick a Question when no Option fits, so that I do not tick boxes by default
16. As a Facilitator, I want each checkbox labelled "No Option fits: re-ask it" with the Question title and vote count, so that its effect is unambiguous
17. As a Facilitator, I want that leaving every box unticked is clearly the normal case, so that I can close the Step without hesitation
18. As a Facilitator, I want ties to be explained when closing is refused (which Question, why I choose), so that I can resolve them
19. As a Player, I want a short message "Vote saved, editable until closing" after I vote, so that I know my choice counts and can be changed
20. As a Player, I want a message "Waiting for closing" once I have answered every Question, so that I know I have nothing more to do
21. As a Player, I want a message "Step closed, Claude is preparing the next Step" after a closing, so that I know the game continues
22. As a Player, I want my Comment to be saved automatically when I leave the field, so that I never lose it by forgetting a button
23. As a Player, I want "✓ Saved" shown next to my Comment once saved, so that I see the result where I acted
24. As a Player, I want "unsaved changes" shown while my Comment differs from the saved one, so that I know its state
25. As a Player, I want a Comment emptied and left to be removed, so that I can retract it
26. As a Player, I want the "x/y voted" counter to update on my page without reloading, so that I see how the group is progressing
27. As a Player, I want my page to refresh after each of my own actions, so that I immediately see the effect of my Vote
28. As a Player, I want my page to refresh itself about every 5 seconds while open, so that a new Step or a closing appears even if the real-time stream does not reach me
29. As a Player behind a tunnel, I want the page to work even if the real-time stream is blocked or delayed, so that I am not stuck on a stale Step
30. As a Player, I want refreshing to keep my typed Comment and my focus, so that I am not interrupted
31. As a Player who lost my identity (private browsing, cleared data, new device), I want to be offered "It's me, resume this nickname" when my nickname exists, so that I can come back to the Session
32. As a Player resuming a nickname, I want to see my previous Votes and Comments for the open Step, so that I continue where I stopped
33. As a Player choosing a new nickname, I want a clear refusal if it is empty, so that I know what to fix
34. As a Player, I want the Summary of the Session shown under the podium at the end, so that I find what was decided
35. As a Facilitator, I want the Summary to be visible on my page as well, so that I can copy it
36. As a Player on a phone, I want touch targets of at least 44 px, so that I vote without mis-tapping
37. As a Player on a phone, I want the Scoreboard to scroll horizontally instead of overflowing the page, so that the layout stays intact
38. As a Player using a keyboard or a screen reader, I want labelled fields and a visible focus, so that I can use every control
39. As a Player, I want readable contrasts for badges, buttons and bars, so that I read results in any light
40. As a new Facilitator, I want a "Quick start" at the top of the README (installation, `make tunnel`, `make start`, `/grilling-arena`, sharing the URL), so that I can run a Session without reading the whole document

## Implementation Decisions

- **Page state without a Session.** The Player and the Facilitator see different messages. The Facilitator is the one whose page is opened with the token; the box cites the `/grilling-arena` skill.
- **Invalid token message.** It points to the Facilitator link displayed in the server's terminal.
- **"Rules" panel.** A button in the header, next to the Scoreboard, opens and closes it. Its content restates the glossary's definition of Votes, Comments, Points and the Selected option (there is no Bonus), without redefining them otherwise. It does not change with the state of the Session.
- **"Next action" line (Facilitator).** It is deduced from the visible state: no Step, open Step, closed Step with the Session not ended, Session ended.
- **"Claude is preparing the next Step".** Deduced state: Step closed and Session not ended, with no published Step waiting for Opening (see `docs/specs/grill-arena-scoring.md`). It appears on the Player side and on the Facilitator side. No route and no change to the skill is added: the server cannot observe Claude, and the deduction can be neither wrong nor forgotten. An explicit message sent by the skill was ruled out.
- **"Close the Step" panel.** A help sentence above the checkboxes, and the label "No Option fits: re-ask it". The closing mechanics do not change.
- **Player status messages.** Short, displayed near the Questions and not at the bottom of the page: Vote saved (editable until closing), waiting for closing, Step closed.
- **Comments.** Saving is triggered on typing (with a delay), on leaving the field and on closing the page (see `docs/specs/grill-arena-scoring.md`). There is no "Save comment" button. The "✓ Saved" or "unsaved changes" indication is displayed next to the field, not in the global message. An emptied Comment is deleted on the server side.
- **Page updates.** In addition to the real-time stream, each page refreshes after any Player action and through a periodic poll of about 5 seconds. The poll must preserve the input in progress and the focus. The real-time stream is kept.
- **Nickname resumption.** The join API accepts an explicit resume request for an existing nickname and then returns that Player's identity. Without that request, the refusal of duplicates remains. The page offers "It's me, resume this nickname" when it receives that refusal. No secret is required: the group is small, the Session URL already being the only secret; this choice is deliberate, including the fact that a participant can take another's nickname.
- **Summary at the end of the Session.** The Session state exposes the Summary when the Session is ended, to everyone. The page renders it (Markdown) under the podium, including on the Facilitator page. The content is the one the end API already returns to Claude.
- **Mobile and accessibility.** Touch targets of at least 44 px, Scoreboard scrolling horizontally on small screens, labelled fields, visible focus, sufficient contrasts. No redesign of the layout.
- **README.** A "Quick start" at the top (installation, `make tunnel`, `make start`, `/grilling-arena`, sharing the URL). No help page served by the server.

## Testing Decisions

- A good test goes through a public interface and checks an observable behavior (HTTP response, state visible to a Player). It never checks the internal structure of the state.
- **Single seam: the HTTP API**, already tested in-process with a server on a free port, a temporary folder and an imposed token. It is extended for:
  - nickname resumption: an existing nickname without a resume request remains refused (409); with the request, the Player's identity is returned and their Votes of the open Step are visible in their view; an empty nickname remains refused;
  - the Summary in the state: absent as long as the Session is not ended, present for any Player once ended.
- **The page has no automated test**: it is in native JavaScript, with no test infrastructure, and adding a browser or extracting a views module was ruled out. It is checked by hand, with a checklist following the user stories: state without a Session (Player and Facilitator), Rules panel, "Next action" line in the four states, closing panel, status messages, Comment auto-save, update without reloading behind the tunnel, nickname resumption, end Summary, display on a phone.
- Prior art: `test/api.test.js` (full cycle with several Players), same server startup and same request helpers.

## Out of Scope

- An explicit "Claude is thinking" message sent by the skill.
- A personal code or a password for nickname resumption.
- A help page served by the server.
- Automated tests of the page (browser or views module).
- A graphic redesign or a new layout of the page.

## Further Notes

- The previous spec already provides that the end page displays a Summary; the current implementation only shows the podium. This spec closes the gap.
- The Player's message ("Claude is preparing the next Step") and the Facilitator's rely on the same deduced state.
- Still to check in real conditions (phones, tunnel) that the periodic poll is enough when the real-time stream does not get through.
