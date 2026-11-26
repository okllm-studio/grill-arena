label: ready-for-agent

# Abstention as an answer, Non-answer and Penalty

Vocabulary: see `GLOSSARY.md` (Question, Option, Selected option, Vote, Abstention, Non-answer, Penalty, Point, Scoreboard, Consensus, Question to re-ask, Step, Player, Facilitator).

## Problem Statement

Today an Abstention is the absence of an entry: the "Abstain" button erases the Player's Vote, so the "x/y voted" counter goes down as if the Player had done nothing. A Player who deliberately abstains (because they are poorly placed to answer, and would only bias the result) is indistinguishable from one who ignored the Question. The Facilitator cannot tell when everyone has actually answered, and nothing discourages Players from simply not answering.

A typical case: a Question needs an expertise that a single Player has. They are the only legitimate voter; the others should be able to say "I abstain" as a real answer, and that must neither create a divergence nor reopen the Question.

## Solution

Abstaining becomes an answer in its own right. It counts in the participation counter (and in the threshold of the live distribution), but never in the result, the Consensus or the Points. A Player can switch between an Option and an Abstention at any time while the Step is open, but cannot go back to "no answer".

A Player who has answered neither with a Vote nor with an Abstention when the Step closes gives a Non-answer. It has no effect on the result or the Consensus, but costs a Penalty of one Point on each Question closed with a Selected option. Statistics and the result sent to Claude tell Abstentions and Non-answers apart.

## User Stories

1. As a Player, I want to abstain on a Question as a deliberate answer, so that my reservation is distinguished from forgetting to answer.
2. As a Player, I want the "Abstain" button to be usable even before I voted, so that I can abstain straight away.
3. As a Player who abstained, I want my Abstention shown as my current choice, so that I know it is recorded.
4. As a Player, I want to switch from an Option to an Abstention and back until the Step closes, so that I can change my mind.
5. As a Player, I want the "x/y voted" counter to go up when I abstain, so that the group sees I have answered.
6. As a Player, I want my abstaining not to lower the counter, so that it reflects participation and not only Votes.
7. As a Player, I do not want to be able to go back to "no answer" once I answered, so that the state stays simple (an Abstention is available instead).
8. As a Facilitator, I want the counter to include Abstentions, so that I know when everyone has answered and can close the Step.
9. As a Facilitator, I want the live distribution threshold ("half of the Players have answered") to include Abstentions, so that the distribution appears when half of the Players have taken a position or abstained.
10. As a Facilitator, I want the re-ask control label ("{voters}/{players} voted") to use the same counter, so that the figures agree everywhere.
11. As an expert Player alone on a Question, I want my Option to be the Selected option even though everyone else abstained, so that the expertise settles the Question.
12. As a Player who abstained on an expert's Question, I want no divergence created by my abstention, so that the Question is not reopened in the next Step.
13. As a Player, I want a Question with a single Vote not to be assessed for Consensus, so that a lone Vote is neither called a Consensus nor a Divided Question.
14. As a Facilitator, I want a Consensual Step not to be broken by Abstentions or Non-answers, so that only cast Votes decide it.
15. As Claude, I want Abstentions and Non-answers never to count as an answer in a Question's distribution, so that the Summary reflects real positions.
16. As Claude, I want the result of each Question to give the number of Abstentions and the number of Non-answers separately, so that I can tell a deliberate reservation from silence.
17. As Claude, I want a Question where nobody cast a Vote (all abstained, all silent, or a mix) to select the Recommended option, so that the Step can progress.
18. As Claude, I want a Question the Facilitator re-asks to stay without a Selected option whatever the Abstentions, so that cancelling keeps working.
19. As a Player, I want to lose one Point on a Question that I left unanswered when the Step closes, so that ignoring Questions has a cost.
20. As a Player, I want an explicit Abstention to cost me nothing, so that abstaining remains a safe way to decline.
21. As a Player, I want no Penalty on a Question to re-ask (split vote or Facilitator's decision), so that I can answer it when it comes back.
22. As a Player, I want a Penalty even on a Question where nobody voted for an Option, so that a collective silence is not rewarded.
23. As a Player who joined after a Step opened, I want no Penalty on that Step's Questions, so that I am not punished for Questions I could not answer.
24. As a Player who joined before a Step opened, I want a Penalty on that Step's unanswered Questions, so that the rule is the same for everyone present.
25. As a Player, I want my Scoreboard total to be negative if my Penalties exceed my Points, so that the Penalty always has an effect.
26. As the Facilitator or Claude, I want the Scoreboard to show negative totals and the Step gain (possibly negative), so that the ranking is faithful.
27. As a Player, I want the end-of-Session statistics to show Votes, Comments, Abstentions and Non-answers per Player, so that participation is readable.
28. As a Player, I want the rules text to explain Abstention, Non-answer and the Penalty, so that I know the stakes before voting.
29. As a Player, I want my Abstention and my Vote to be restored after a server restart or when I resume my nickname, so that nothing is lost.
30. As a French-speaking Player, I want all new texts available in French and English, so that the interface stays consistent in both languages.
31. As Claude, I want the Session skill to describe `abstentions` and `nonAnswers` in the result, so that I read the new figures correctly.

## Implementation Decisions

- **Answer model**: per Question, a Player's answer is one of: an Option, an Abstention, or nothing. An Abstention is stored explicitly, distinct from the absence of an entry. Existing saved Sessions, where an abstention was an absent entry, must still load: their absent entries are Non-answers.
- **Answer interface**: the representation of the Abstention in the Player's answer request is a new explicit one; `option: null` can no longer mean "abstain" (it used to mean "erase"). Going back to "no answer" is not possible: the null form is removed or refused, and an unknown option is still refused with 400. The choice of the exact wire format is left to the implementation, but it must be documented in the README and in the Session skill.
- **Participation counter**: `voters` in a Player's view of an open Step counts Votes plus Abstentions (answers). The Player's own current choice is exposed so that the interface can show an Option, an Abstention or nothing.
- **Live distribution**: the threshold "half of the Players" uses the answer count (Votes plus Abstentions); the shown distribution still contains only Votes.
- **Arbitration** (`decide`, `consensusLevel`, `stepConsensus`): unchanged in behaviour. They ignore Abstentions and Non-answers, a Question without any cast Vote selects the Recommended option, and fewer than two voters means no Consensus status. The votes map given to `decide` must contain only Option Votes.
- **Players present at an Opening**: the Opening of a Step records the Players present at that moment. Players who join later are not concerned by that Step's Penalty. The record is saved with the Session.
- **Penalty**: when a Step closes, for each Question closed with a Selected option, each Player present at the Opening who gave a Non-answer gets minus one Point (the Point scale applies, as for the gain). Questions with status "to re-ask" generate no Penalty, nor does an Abstention. The Penalty is applied even if no Vote was cast (the Recommended option is selected). The Step gain and the total of each Player can be negative; the Scoreboard sorting is unchanged.
- **Gains function**: it is given the Players present and produces gains and Penalties; it remains a pure function.
- **Question result for Claude and Players**: `abstentions` counts explicit Abstentions only; a new `nonAnswers` counts the Players present at the Opening who gave a Non-answer. Both are in the Question result seen by Claude and by Players in closed Steps.
- **Statistics**: per Player, Votes, Comments, Abstentions and Non-answers (new field) over closed Steps, limited to the Steps open when the Player was present. Published with the Scoreboard as today.
- **Summary**: unchanged in structure; if it prints a Scoreboard, negative totals must render correctly.
- **Interface**: the "Abstain" button is always enabled and its state shows the Abstention as chosen when active; the "voted" counter label stays the same; folded results and detailed results show both Abstentions and Non-answers; the Scoreboard and statistics table gain a Non-answers column. The rules text mentions the Penalty. All new texts are added to both languages of the catalogue.
- **Documentation**: `README.md`, `skill/grilling-arena/SKILL.md` (result fields, statistics) are updated in the same change; `GLOSSARY.md` already defines the vocabulary.

## Testing Decisions

- A good test checks external behaviour through the HTTP API (what a Player, the Facilitator or Claude sees), not internal data structures.
- Main seam: the HTTP API (`test/api.test.js`), with its existing roles (Claude, Facilitator, Players). Cover: abstaining without a prior Vote; switching Option to Abstention and back; impossibility of returning to no answer; counter including Abstentions; live distribution threshold with Abstentions; result fields `abstentions` and `nonAnswers`; a lone expert Vote among Abstentions (Selected option, Consensus not assessed); everyone abstaining or silent (Recommended option); Penalty on a Non-answer; no Penalty on Abstention, on a Question to re-ask, or for a Player who joined after the Opening; negative total on the Scoreboard; statistics including Non-answers; restart and resume restoring an Abstention; an old saved Session still loading.
- Second seam: the gains function in `src/arbitration.js` (`test/arbitration.test.js`), for Points and Penalty (same style as the existing gains tests). `decide` and `consensusLevel` keep their tests, adapted only where they described an Abstention as an absent entry.
- Update existing tests that assumed "Abstain removes the Vote" (for example the test where a Player goes back to Abstention) and the one that pins the full Summary text if the Scoreboard rendering changes.
- The interface has no automated test beyond the translation catalogue test (`test/i18n.test.js`), which must stay green with the new keys in both languages; the rest is checked by hand with a short checklist (button states, counter, columns, French and English).
- Per project convention, run only the tests concerned during development.

## Out of Scope

- A Consensus level for a collective non-vote, or a Consensus for a lone voter: Questions with fewer than two voters stay not assessed.
- Changing the other scoring rules (gain per Vote for the Selected option, Point scale, tie-breaking).
- A Penalty amount other than one Point, or configurable.
- Going back to "no answer" once answered.
- Automatic tests of the user interface.
- Changes to the arbitration of ties, re-asked Questions or the Facilitator's tiebreak.

## Further Notes

- The "voted" label keeps its wording because an Abstention is an answer, but it counts answers, not Votes only; the glossary says an Abstention is not a Vote, so a later wording change may be considered.
- Texts that mention abstaining or scoring (rules, statuses) and the README must be reread for consistency, since "a Player who has not answered counts as abstaining" is no longer true.
