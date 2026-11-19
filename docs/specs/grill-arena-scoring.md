---
label: ready-for-agent
---

# Grill Arena: scoring, Vote visibility, ties, flow of a Session

Vocabulary: `GLOSSARY.md` at the root of the repository. Stemming from two grilling Sessions run on grill-arena itself: a brainstorm Session ("grill-arena interface and scoring", 5 Steps, 14 Questions), then a framing done by playing a Session (flow, tabs, Co-facilitator). The decisions below are those of these Sessions; the points marked **to confirm** were not settled.

Principle of the Session: it is an oral exchange about the specs. In principle, all Players vote the same thing; a disagreement signals an important unspoken point. Scoring must therefore bring disagreements to the surface, not erase them. The Facilitator is a Player like the others, with extra controls.

## Problem Statement

**Scoring.** The previous scoring rewarded contradiction: voting against the recommended option earned a Bonus, whereas the goal is to converge out loud. It also rewarded worthless Comments, could bias the result through gamification, and Points were displayed live during the Session, which steered the Votes. The rule "without a clear majority, the recommended option wins" made disagreements disappear: in the brainstorm Session, four Questions were settled on 1-1 distributions, without the split being discussed.

**Flow.** While playing a Session, several frictions appeared:
- the Question number restarted at 1 in each Step, which prevented referring to them out loud;
- a Comment could be lost: it was only sent when leaving the field, and a closing during typing rejected it silently;
- at closing, the next Vote arrived without the group having time to discuss the results, and the results of older Steps were no longer viewable;
- the Initial prompt stayed displayed and editable throughout the Session, whereas it is only useful at the start;
- a Question referring to a previous Question forced one to find it by hand;
- if the Facilitator stepped away, the Session was blocked: nobody else could open or close a Step.

## Solution

Scoring becomes a participation statistic, published at the end of the Session. Votes stay hidden by default; the Facilitator can enable the live distribution. A split vote is no longer settled by the recommended option: the Question comes back out loud. The Facilitator remains the only one to decide after a re-ask.

The flow becomes driven: each Step published by Claude waits for the Opening by the Facilitator, which leaves time to discuss the results of the previous one. Questions have a continuous Number over the Session. The page is organized in tabs (current Step, Results of all closed Steps, Facilitator). Comments save themselves. A mention `Q4` in a Question opens a tooltip recalling the Question and what was voted. The Facilitator can appoint Co-facilitators who move the Session forward in their place.

## User Stories

### Scoring and visibility

1. As a Player, I want voting against the recommended option to earn me nothing more, so that I am not encouraged to contradict.
2. As a Player, I want my Comments to be recognized, so that I do not feel penalized when I argue.
3. As a Player, I want to vote without seeing the Points table during the Session, so that I am not influenced by the ranking.
4. As a Player, I want to see the participation statistics at the end of the Session, so that I know what the Session drew from each person.
5. As a Facilitator, I want to choose before the Opening of Step 1 whether the distribution of Votes is displayed live, so that I trigger oral discussion when useful.
6. As a Facilitator, I want the distribution, if displayed, to appear only from half of the voters, so that I do not steer the first Votes.
7. As a Facilitator, I want to see the scoring and the Scoreboard at any time, even during the Session, so that I steer the discussion.
8. As a Facilitator, I want to be able to publish the statistics when I decide, so that I keep them for the end or show them earlier.
9. As a Facilitator, I want a split Question (tie) to be sent back out loud, so that the disagreement is discussed before being settled.
10. As a Facilitator, I want to settle a Question after a single re-ask, so that the discussion does not loop.
11. As a Facilitator, I want to be able to set a Question aside and note it in the Summary, so that I keep a trace without settling it. **To confirm** (Q14 of the brainstorm Session: 1-1, the recommended option broke the tie).
12. As Claude, I want to receive a split Question without a Selected option, so that I re-ask it with the Comments as material.

### Numbers and references

13. As a Player, I want each Question to have a unique and continuous Number over the whole Session, so that I refer to it out loud without ambiguity.
14. As a Player, I want a re-asked Question to receive a new Number and show "re-asked from Q4", so that I link it to the original Question.
15. As Claude, I want to receive the Number of each Question in the results of a Step, so that I use the same Numbers as the Players.
16. As a Player, I want a mention `Q4` in the text of a Question or an Option to be clickable when Q4 belongs to a closed Step, so that I find what was decided without searching.
17. As a Player, I want the tooltip of a reference to display the Question title, its outcome (Selected option or "to re-ask"), the distribution of Votes and my own Vote, so that the context is recalled to me.
18. As a Player on a phone, I want to open the tooltip with a tap and close it with a tap elsewhere, so that I read it without hovering.
19. As a Player, I want a mention of a Question of the current Step, or of a Number that does not exist, to remain plain text, so that no Vote is revealed too early.

### Opening of Steps

20. As a Facilitator, I want each Step published by Claude, the first included, to stay pending until I open it, so that there is time to discuss the results before voting again.
21. As a Facilitator, I want an "Open Step N" button visible whichever tab is displayed, so that I restart the group without looking for a control.
22. As a Player, I want to read "The Facilitator will open Step N" as long as the Step is pending, so that I know I am waiting and that the page is not frozen.
23. As a Player, I want to keep the results of the closed Step in view while waiting, so that I discuss them out loud.
24. As a Player, I want not to see the Questions of a Step until it is open, so that nobody votes or reads in advance, including through the API.
25. As Claude, I want to publish the next Step without waiting for the Opening, and keep waiting for closing with the same long-poll, so that my flow does not change.

### Tabs and results

26. As a Player, I want a "Current Step" tab, open by default, so that I vote without noise.
27. As a Player, I want a "Results" tab that lists all closed Steps, most recent first, so that I reread any decision, my Vote and the Comments.
28. As a Player, I want "Rules" and "Scoreboard" to remain header buttons, so that I open them without leaving my tab.
29. As a Facilitator, I want a "Facilitator" tab that only opens from the link with the token, so that Players do not see controls they cannot use.
30. As a Facilitator, I want the sticky closing area to remain visible above the tabs, so that I close without changing tab.
31. As a Facilitator, I want to find in my tab the "Next action" line, the Initial prompt, the Players access (URL and QR code), the Scoreboard, the statistics and the distribution setting, so that I steer the Session from a single place.
32. As a Facilitator, I want to join the Session with a nickname and vote like a Player, so that I take part in the grilling.

### Initial prompt

33. As a Player, I want to read the Initial prompt before the Session starts, so that I know what we are going to talk about.
34. As a Facilitator, I want to edit the Initial prompt from my tab until the Opening of Step 1, and have Players see the up-to-date version, so that I fix it before starting.
35. As a Player, I want the Initial prompt to disappear from my screen after the Opening of Step 1, so that I am not distracted by a text that has become useless.
36. As a Facilitator, I want to reread the Initial prompt after the start, read-only, so that I keep the context without being able to change it by mistake.
37. As a Facilitator, I want the server to refuse any modification of the Initial prompt after the start, including from Claude, so that the starting context stays reliable.

### Comments

38. As a Player, I want my Comment to save itself about one second after my last keystroke, so that I do not lose it by forgetting to leave the field.
39. As a Player, I want it to also save when I leave the field, switch application or close the page, so that no input stays pending.
40. As a Player, I want to see "✓ Saved" or "Unsaved changes" next to the field, so that I know the state of my text.
41. As a Player whose Step was closed before sending, I want my text to stay displayed with the message "Step closed before sending: copy your text", so that I do not lose it silently.

### Co-facilitator

42. As a Facilitator, I want to appoint one or more Players as Co-facilitators from a list in my tab, so that the Session continues if I step away.
43. As a Facilitator, I want to revoke a Co-facilitator at any time, so that I take back the steering alone.
44. As a Co-facilitator, I want to open and close Steps, break ties and re-ask Questions, so that I move the Session forward in place of the Facilitator.
45. As a Co-facilitator, I want to see the Scoreboard and the statistics, so that I steer the discussion.
46. As a Facilitator, I want the Co-facilitator not to be able to edit the Initial prompt, set the distribution, publish the statistics nor appoint other Co-facilitators, so that I keep control of the framework.
47. As a Facilitator, I want a closing or an Opening already done by someone else to be refused without effect, so that our two pages do not contradict each other.
48. As a Facilitator, I want Co-facilitators to remain appointed after a server restart, so that I do not have to appoint them again.
49. As a Facilitator, I want to see a warning when appointing a Co-facilitator, so that I know that anyone who resumes their nickname gets their rights.

## Implementation Decisions

### Scoring

- **General abstention.** If nobody votes, the recommended option is selected (UX spec, story 9), with no Point.
- **No Bonus.** Only the Point remains, awarded to each Player whose Vote is for the Selected option. Abstentions earn nothing.
- **Comments.** They only earn Points on re-asked Questions. The amount was not settled (one Point per Comment, or other): **to confirm**.
- **Scoring published at the end of the Session** as participation statistics: Votes, Comments and Abstentions per Player. The Point derived from these statistics is **to confirm**.
- **Publication.** The statistics are visible to the Facilitator and Co-facilitators at any time. They are published to everyone at the end of the Session, or earlier at the Facilitator's request alone.

### Visibility

- **Scoreboard**: hidden from Players during the Session, visible to the Facilitator and Co-facilitators. It is published with the statistics.
- **Distribution of Votes**: hidden by default. Only the Facilitator can enable it, from their tab, until the Opening of Step 1; the option belongs to the Session and is not a start parameter sent by Claude. When enabled, the distribution only appears from half of the voters.

### Closing and ties

- **Split vote.** A Question without a clear majority (tie between Options) is not settled by the recommended option: it is sent back out loud, that is, re-asked with its Comments. The Arbitration module distinguishes this case from the "single leader" case, which remains selected without intervention.
- **Re-ask.** After a single re-ask, the Facilitator settles the Question at the next closing, with the Options of the current Step.
- **Setting aside** (Q14): the Facilitator can note a Question in the Summary without settling it. **To confirm**.

### Question Numbers

- The server assigns the Number when the Step is published, continuously over the Session in publication order. It is exposed in the Players' view and in the results returned to Claude.
- A re-asked Question is published with a new identifier and receives a new Number. To display "re-asked from Qn", Claude gives at publication, in the `reaskOf` field of the Question, the identifier of the Question it takes over; the server derives the original Number from it. A `reaskOf` that does not designate a Question to re-ask of a closed Step, or that is already taken over, is refused (400).
- The Summary uses the Numbers.

### Life cycle of a Step

- A Step has three states: **pending** (published, not opened), **open**, **closed**. The only transition from "pending" to "open" is the Opening by the Facilitator or a Co-facilitator, including for Step 1. An Opening on a Step already open or closed is refused (409) with no effect.
- Claude publishes without waiting for the Opening, and a Step cannot be published as long as the previous one is not closed. The result long-poll answers at closing as before: the skill has no other wait to manage.
- As long as a Step is pending, a Player's view contains neither its Questions nor their Options; it only contains its number and the results of the closed Steps. A Vote or a Comment on a pending Step is refused (409).
- The messages deduced from the state ("Next action", "Claude is preparing the next Step") gain a state: after a closing, "Claude is preparing the next Step"; Step published but not opened, "Open Step N".

### Initial prompt

- The Initial prompt is provided when the Session starts and can be edited by the Facilitator. The **first Opening** (Step 1) locks it: any modification is then refused (409), by the Facilitator as well as by Claude.
- Before this lock, any Player's view contains the prompt. After, it no longer does, except for the authenticated Facilitator, who always receives it, read-only.

### Page tabs

- Tabs **Current Step** (default), **Results** and **Facilitator** (token link only). The "Rules" and "Scoreboard" buttons remain in the header.
- **Results** lists all closed Steps, most recent first: Number and title of each Question, distribution, Selected option, the Player's Vote, Comments. The Players' view therefore carries the results of all closed Steps, not only the previous one.
- **Facilitator** contains: the "Next action" line; the Initial prompt (editable before the start, read-only afterwards); the Players access (URL and QR code); the Scoreboard and the statistics with the "Publish statistics" button; the "Show live distribution" checkbox (until the Opening of Step 1); the list of Players to appoint or revoke Co-facilitators.
- The **sticky closing area** stays above the tabs, whichever tab is active, and also carries the Opening button. A Co-facilitator has access to it.
- The Facilitator is also a Player: they join with a nickname, vote and count among the voters and on the Scoreboard.

### Comments

- Saving is triggered about one second after the last keystroke, on loss of focus, and when the page goes to the background or closes. The "✓ Saved" / "Unsaved changes" indicator is kept.
- If the server refuses the submission because the Step is closed, the text stays in the field with the message "Step closed before sending: copy your text".

### References between Questions

- The page detects `Qn` mentions in the body of Questions and the labels of Options. It makes them clickable when `n` is the Number of a Question of a closed Step; otherwise the text stays plain. The skill has nothing to change.
- The tooltip displays the title, the outcome (Selected option or "to re-ask"), the distribution of Votes and the Player's Vote. For a re-asked Question, the current Number indicates "re-asked from Qn". It opens on hover or touch and closes on touch elsewhere. It exposes nothing more than the Results tab.

### Co-facilitator

- The Facilitator appoints and revokes Co-facilitators, with no limit on their number. This appointment belongs to the Session and is saved with it.
- Co-facilitators are identified by the Player identity sent by their page; the Facilitator and Claude remain identified by the token.
- **Co-facilitator rights**: open and close Steps (break ties, re-ask Questions); see the Scoreboard and the statistics. They cannot: edit the Initial prompt, set the distribution, publish the statistics, appoint or revoke. They have no access to the QR code. These forbidden actions are refused (403).
- The Facilitator keeps all their rights alongside the Co-facilitators; two simultaneous Openings or closings give a single effect and a refusal (409) for the second.
- **Nickname resumption.** Resumption still requires no secret: someone who resumes a Co-facilitator's nickname gets their rights. This risk is accepted (trusted group) and tracked in `improvements.md`; the fix will have to protect this right as well. The Facilitator tab displays a warning at appointment.

### Modules and interfaces

- **Arbitration** (pure): `decide` returns `to_reask` (or an equivalent status) for a tie, instead of selecting the recommended option. `gains` computes no Bonus.
- **Session**: three-valued Step state; Numbers; Opening; prompt lock; Co-facilitators list; distribution option. A Player's view does not contain the Scoreboard during the Session (statistics after the end or publication), hides the Questions of a pending Step, exposes the results of all closed Steps, and hides the prompt after the lock. The Facilitator's and Co-facilitators' views add what is reserved to them.
- **HTTP API**: Opening of a Step (token or Co-facilitator); closing open to Co-facilitators; appointment and revocation of Co-facilitators (token only); distribution setting (token only, before the first Opening); prompt modification (token only, before the first Opening); the distribution option is not a Session start parameter; publication of a Question with the identifier of the Question taken over (`reaskOf`); the end of the Session returns the statistics in addition to the Summary.
- **Page**: tabs, Opening button in the sticky area, auto-save, reference tooltips, Co-facilitators list.
- **Skill**: mention the Question Numbers in the dialogue with the group, give the identifier of the re-asked Question at publication, and no longer announce a prompt visible throughout the Session.
- **Storage schema**: Step state, Numbers, Co-facilitators, distribution option and derived statistics are part of it.

## Testing Decisions

A good test checks the behavior observable by a Player, a Co-facilitator or the Facilitator, not the structure of the code.

- **Main seam: the HTTP API** (`test/api.test.js`), with a server on a free port, a temporary folder and an imposed token. Each rule is tested through the requests of a Player, a Co-facilitator and the Facilitator:
  - tie sent back out loud, re-ask, settled at the next closing, Scoreboard hidden during the Session, statistics at the end;
  - continuous Numbers from one Step to the next, new Number for a re-asked Question and indication of the Question taken over;
  - Opening: Questions absent from a Player's view while the Step is pending, Vote refused (409), Opening refused on an open or closed Step, result long-poll unchanged;
  - prompt: visible to Players before the first Opening, absent after except for the Facilitator, modification refused (409) after, including with the token;
  - results: the view contains the closed Steps, most recent first, with the Player's Vote;
  - Co-facilitator: appointment and revocation (token only, refused otherwise), Opening and closing rights accepted for an appointed Co-facilitator and refused (403) for an ordinary Player, reserved actions refused (403) to the Co-facilitator, appointment kept after reloading the Session;
  - live distribution: disabled by default, settable before the first Opening, half-of-voters threshold.
- **Secondary seam: the pure Arbitration module** (`test/arbitration.test.js`) for `decide` and `gains`, with no I/O: the tie and the absence of a Bonus.
- **What not to test**: the internal order of fields, nor the exact rendering of the page.
- **The page has no automated test** (native JavaScript, no test infrastructure, as in the UX spec). It is checked by hand, with a checklist following the user stories: tabs, Opening button visible whichever tab, wait for Opening, prompt before and after the start, Comment auto-save (including closing during typing), reference tooltips (hover and touch), Co-facilitators list, display on a phone.
- **Prior art**: `test/api.test.js` (helpers for Claude, the Facilitator and joining), `test/arbitration.test.js`.

## Out of Scope

- The secret of nickname resumption (`improvements.md`), even though it now also protects the Co-facilitator right.
- The ETag of the periodic poll (`improvements.md`).
- The formatting of the Summary (content unchanged apart from the statistics, the Numbers and the splits).
- Transferring the Facilitator role (token) to another Player, and notifying an appointed Co-facilitator.
- An explicit "Claude is thinking" message sent by the skill.
- Automated tests of the page (browser or views module).

## Further Notes

- Q14 of the brainstorm Session is contested (1-1, the recommended option broke the tie, no Comment from the Player who voted C). It must be discussed out loud before implementation; the tasks related to setting aside remain **to confirm** until then.
- Decisions Q5, Q7 and Q9 of the brainstorm Session were settled by the recommended option on 1-1 distributions. They are replaced by Q8, Q10 and Q11, which were selected unanimously. Do not take them over.
- The Summary generated by the server shows every split as "to re-ask (split vote)" so that no split is hidden.
- This spec supersedes, in the UX spec (`docs/specs/grill-arena-ux.md`), the passages on the "Claude is preparing the next Step" status message, on saving the Comment on leaving the field and on the Rules mentioning the Bonus. The README and the initial spec (`docs/specs/grill-arena.md`) must also match where they describe the Bonus, the prompt displayed throughout the Session and closing without Opening.
