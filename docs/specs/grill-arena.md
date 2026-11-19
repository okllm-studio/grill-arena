---
label: ready-for-agent
---

# Grill Arena: multiplayer grilling Session

Vocabulary: `GLOSSARY.md` at the root of the repository.

## Problem Statement

A grilling with Claude is played in a terminal, in front of a single person. When several people have to decide together (a team around a screen, or everyone at their own desk), only one person types the answers. The others give their opinion out loud and that opinion is lost. Nobody is encouraged to depart from Claude's recommendation, although that is often where the framing gains in quality. There is also no overview of how far the Session has progressed.

## Solution

A web page served locally, which each Player opens in their browser. Claude publishes each Step of the grilling there instead of writing it in the terminal. Players vote for an Option of each Question (or abstain) and can leave a Comment. The Facilitator opens then closes each Step (a Co-facilitator can do it in their place). The Selected option is the one with the most Votes; a split vote is sent back to the table, out loud. Claude receives the results and the Comments, then builds the next Step. Each Player earns a Point when they voted for the Selected option. Progress is displayed at each closing; the Scoreboard and the participation statistics are published at the end of the Session. At the end of the Session, the page displays a podium and a Summary of the decisions, which feeds `to-spec`.

## User Stories

### Facilitator: setup
1. As a Facilitator, I want to start a Session with a `grilling-arena` skill, so that the Players receive the Questions on the page rather than in my terminal.
2. As a Facilitator, I want the skill to start the server if it is not already running, so that I have nothing to launch by hand.
3. As a Facilitator, I want the Facilitator page to display the local network URL and a QR code, so that the Players join within seconds.
4. As a Facilitator, I want a Facilitator URL protected by a random token, so that a Player cannot close a Step by mistake.
5. As a Facilitator, I want the token to be displayed in the terminal when the server starts, so that I can open my page without looking for it.
6. As a Facilitator, I want starting a new Session to archive the previous one, so that two grillings are never mixed.

### Player: joining
7. As a Player, I want to join by choosing a nickname, with no account or password, so that I can take part right away.
8. As a Player, I want my browser to remember my nickname, so that I find my place and my score after a reload.
9. As a Player, I want a nickname already taken in the Session to be refused, unless I explicitly ask to resume it, so that I am not confused with someone else on the Scoreboard while still being able to come back after losing my identity.
10. As a Player who arrives mid-Session, I want to be able to vote as soon as the Step is open, starting from 0, so that I can take part even when late.

### Player: voting
11. As a Player, I want to see each Question of the Step with its text rendered as Markdown, so that I read Claude's reasoning as in the terminal.
12. As a Player, I want to see which Option Claude recommends, so that I decide with full knowledge.
13. As a Player, I want to vote for a single Option per Question, so that I express my choice clearly.
14. As a Player, I want to be able to abstain on a Question, so that I do not take a stand on a subject I do not master.
15. As a Player, I want to change my Vote or go back to Abstention while the Step is open, so that I can fix a misclick or change my mind.
16. As a Player, I want to add a free Comment to a Question, whether or not I voted, so that I can point out a nuance or a missing Option.
17. As a Player, I want to edit or erase my Comment while the Step is open.
18. As a Player, I want the others' Votes and Comments to stay hidden until closing, so that I vote without being influenced.
19. As a Player, I want to see how many Players have already voted on each Question, so that I know where the group stands.
20. As a Player, I want the page to update by itself (new Step, closing, counters), so that I never have to reload it.

### Facilitator: closing a Step
21. As a Facilitator, I want to see the "X/N voted" counter of each Question, so that I can judge when to close.
22. As a Facilitator, I want to close the Step with one click, so that the results are revealed and Claude takes over again.
23. As a Facilitator, I want to be asked, when closing, to break the ties that do not contain the Recommended option, so that every Question is settled.
24. As a Facilitator, I want to be able to mark a Question "to re-ask" when the Comments show that no Option fits, so that Claude reformulates it.
25. As a Facilitator, I want to be able to vote like any Player, since I am also part of the group.

### Arbitration and score
26. As a Player, I want the Option with the most Votes to be selected, so that the group's choice prevails.
27. As a Player, I want the Recommended option to be selected when nobody voted at all, with no Point for anyone, so that the Session moves on anyway.
28. As a Player, I want the Recommended option to win a tie that includes it, for a predictable rule.
29. As a Player, I want to earn a Point when I voted for the Selected option, so that I am rewarded for being right.
31. As a Player, I want an Abstention or a Vote for another Option to cost me nothing, so that I vote without fear.
32. As a Player, I want a Question to re-ask to earn no Point for anyone, since it was not settled.

### Reveal and progress
33. As a Player, I want the page, at closing, to reveal for each Question the distribution of the Votes, the Selected option (or "to re-ask") and the Comments with their author, so that I understand the decision.
35. As a Player, I want to see the Scoreboard at the end of the Session (or when the Facilitator publishes it), so that I do not steer my Votes during the Session.
36. As a Player, I want to see the Step number, the number of Questions settled and an estimate of the Questions to come, so that I know where the Session stands.

### Claude
37. As Claude, I want to publish a Step (number, progress, Questions with closed Options and one recommended), so that I submit it to the vote.
38. As Claude, I want a malformed Step to be refused with an explicit message (no recommended option, recommended option missing from the Options, Question without Option), so that I fix it before the Players see it.
39. As Claude, I want to wait for the closing with a long-poll request that I launch in the background, so that I am woken at closing without polling the server in a loop.
40. As Claude, I want to receive for each Question its status (selected or to re-ask), the Selected option, the distribution of the Votes and the Comments, so that I build the next Step.
41. As Claude, I want my requests to require the Facilitator's token, so that a Player cannot publish a Step.
42. As Claude, I want to declare the end of the Session, so that the podium is triggered and I get the Summary.
43. As Claude, I want to receive the Summary as Markdown (Questions and Selected options, per Step), so that I can move on to `to-spec`.
44. As Claude, I want the `grilling-arena` skill to apply the same frontier rules as `grilling`, publishing instead of writing in the terminal, so that the same rigor is kept.
45. As Claude, I want the skill to remind me to treat Comments as "other" answers, so that I open the branches they reveal.

### End and resumption
46. As a Player, I want to see a podium and the Summary at the end of the Session, so that I conclude the game and find what was decided.
47. As a Facilitator, I want the Session to be saved to disk at each closing and reloaded when the server restarts, so that neither decisions nor scores are lost in a crash.
48. As a Facilitator, I want each Session to have its own file on disk, so that I keep a trace of past grillings.

## Implementation Decisions

- **Dedicated repository** `grill-arena`, in Node.js and Express, with no build step. The server listens on `0.0.0.0`, port 4242 by default and configurable.
- **Modules**:
  - **Arbitration** (pure, no I/O): from a Question, Votes, tiebreaks and Questions to re-ask, it determines the status of the Question, the Selected option and the ties to break. From the results of a Step and the Players, it computes each one's gains. The scale is 1 Point by default, and is configurable. A tie between Options is sent back out loud (Question to re-ask), except after a re-ask where the Facilitator decides.
  - **Session**: the in-memory state (Players, Steps, Votes, Comments, Scoreboard). It validates the published Steps, applies the hiding rules and produces the Summary. It relies on Arbitration.
  - **Storage**: one JSON file per Session, written at each closing and at the start or end of the Session. The last unfinished Session is reloaded at startup. The folder is configurable.
  - **HTTP API**: a thin adapter over the Session, plus an SSE stream that broadcasts changes (new Step, counters, closing, end).
  - **Page**: HTML and JS served statically, with three views (Player, Facilitator depending on the token, podium with Summary), a rules panel, and a periodic poll of the state in addition to the SSE stream. Markdown is rendered client-side, the QR code is generated client-side, and the Player is remembered in `localStorage`.
  - **`grilling-arena` skill**: its source is versioned in the repository and it is installed in `~/.claude/skills/` through a symbolic link.
- **Facilitator token**: random, regenerated at each server start, displayed in the console and written (with the port) in the Sessions folder, readable by the user only. It is required to publish a Step, read a result, close, break a tie, mark a Question to re-ask, and start and end a Session. The skill reads it from that folder, whether the server has just been launched or is already running.
- **API contract** (exact names are in `src/server.js`):
  - Claude, with token: start a Session (title, initial prompt), which archives the active Session; publish a Step (number, number of Questions settled, estimate of the Questions to come, then for each Question an identifier, a title, a Markdown body, identified Options and the identifier of the recommended one); wait for the result of a Step by long-poll; end the Session, which returns the Markdown Summary.
  - Only one Step at a time: publishing another while the previous one is not closed is refused. A published Step waits for the Opening by the Facilitator.
  - The long-poll answers immediately if the Step is already closed. Otherwise it stays open until closing, with no server-side timeout, and can be relaunched with no side effect.
  - Player: join with a nickname, unique in the Session regardless of case (refused if it exists, unless an explicit resume request returns the existing Player), which returns a Player identifier; set, change or remove one's Vote and Comment on a Question of the open Step; read the current state.
  - The state returned during an open Step only contains the Vote and Comment of the Player who asks, plus the counters. After closing, it contains everything.
  - Facilitator, with token: close the Step with the tiebreaks and the list of Questions to re-ask. A closing that leaves a tie without recommended option and without tiebreak is refused, with the list of Questions to break.
  - A Vote or a Comment on a closed Step is refused.
- **Result returned to Claude**, for each Question: status (`selected` or `to_reask`), Selected option, number of Votes per Option, number of Abstentions, Comments with their nickname. The result also contains the up-to-date Scoreboard.
- **Progress**: provided by Claude at each Step and displayed as is ("Step n · x settled · ~y to come"). The server does not compute it.
- **Summary**: produced by the server from the closed Steps. It lists, Step by Step, each Question with its Selected option. It also contains the Questions to re-ask, as such, and the final Scoreboard.

## Testing Decisions

- A good test goes through a public interface and checks an observable behavior (HTTP response, result returned to Claude, Scoreboard, content of the state visible to a Player). It never checks the internal structure of the state.
- **Main seam: the HTTP API.** The server is started in the test process, on a free port, with a temporary Sessions folder and an imposed token. The tests play Claude, several Players and the Facilitator over a full cycle. They cover:
  - publishing, with refusal of malformed Steps;
  - Votes, Vote changes and Abstentions;
  - hiding before closing;
  - refusal without a token;
  - closing refused as long as a tie is not broken;
  - the long-poll released by closing;
  - the content of the result and of the Summary;
  - resumption after a restart from the JSON.
- **Secondary seam: the Arbitration module**, tested directly. Cases covered:
  - simple majority;
  - no Vote;
  - tie with the recommended option;
  - tie without the recommended option (tiebreak required, then applied);
  - Question to re-ask;
  - single Point, no Bonus;
  - Abstention;
  - Player who arrives mid-Session;
  - custom scale.
- Runner: `node:test`, with no test dependency. Implementation in TDD (`tdd`).
- No automated test for the page (browser-side SSE, rendering, QR code) nor for the skill: they are checked by hand during a real Session.
- There is no prior test in this repository (it has just been created).

## Out of Scope

- Real authentication, HTTPS, access from the Internet.
- Several simultaneous Sessions.
- Automatic closing delay, or closing when everyone has voted.
- Options added by Players during the vote (go through a Comment, then a Question to re-ask).
- Penalties, weighting of Questions, achievements or badges.
- Modification of the existing `grilling` skill and integration into `grill-with-docs` (the glossary and ADRs remain Claude's responsibility during the Session, as in the terminal).
- Browsable history of past Sessions in the interface (the JSON files are enough).

## Further Notes

- The server does not run Claude: it only relays. All the intelligence of the grilling (frontier, recommendations) stays in the skill.
- The long-poll launched in the background respects the Claude Code constraint, which does not allow a blocking wait in the foreground. The skill must launch the request in the background and wait for the notification.
- Possible split with `to-tickets`: (1) Arbitration; (2) Session, Storage and API; (3) Page; (4) `grilling-arena` skill.
