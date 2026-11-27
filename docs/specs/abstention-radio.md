label: ready-for-agent

# Abstention as a radio in the Option group

## Problem Statement

A Player answers a Question with an Option (a radio) or with an Abstention (a separate "Abstain" button next to the participation counter). Both are mutually exclusive answers to the same Question, yet they are two controls of different kinds: the Player does not see them as one choice among several, and the keyboard cannot move from an Option to the Abstention. The wording "Abstain" reads as an action, not as an answer, although the rules say that an Abstention is a deliberate answer that costs nothing, unlike a Non-answer.

## Solution

On the Player's page, the Abstention becomes one more radio in the same group as the Options of the Question. It comes last, has no letter, is never Recommended, and is visually set apart from the Options so that it is not mistaken for one of Claude's proposals. Its label is a first-person answer: "I abstain" / "Je m'abstiens". Only the interface changes: what is sent to the server, how an Abstention is counted and what it earns stay as they are.

## User Stories

1. As a Player, I want to abstain by selecting a radio among the answers, so that Options and Abstention read as one choice.
2. As a Player, I want only one answer selected at a time across the Options and the Abstention, so that my current answer is unambiguous.
3. As a Player, I want to move from an Option to the Abstention (and back) with the keyboard arrows, so that I can answer without the mouse.
4. As a Player, I want the Abstention radio to be last and visually set apart, so that I do not take it for an Option proposed by Claude.
5. As a Player, I want the Abstention to have no letter, so that the letters keep matching the Options cited in the Question text.
6. As a Player, I want the Abstention never to carry the "Recommended" badge, so that it is not suggested as the preferred answer.
7. As a Player, I want the Abstention label to be "I abstain" / "Je m'abstiens", so that it reads as an answer.
8. As a Player, I want the label in the language of the interface (English or French), so that it matches the rest of the page.
9. As a Player, I want my Abstention recorded as soon as I select the radio, like an Option, so that I do not need a second action.
10. As a Player, I want to be able to abstain before voting, so that I can decline straight away.
11. As a Player, I want to switch from an Option to the Abstention and back until the Step closes, so that I can change my mind.
12. As a Player, I do not want a way back to "no answer" once I have answered, so that the state stays simple.
13. As a Player who abstained, I want the Abstention radio shown as selected after a reload or reconnection, so that I know it is recorded.
14. As a Player, I want the "Vote saved" message to appear after an Abstention as it does after a Vote, so that I get the same confirmation.
15. As a Player, I want the "x/y voted" counter to include my Abstention, so that the group sees I have answered.
16. As a Player, I want the old "Abstain" button to be gone, so that there is only one way to abstain.
17. As a Player, I want a Question I have not answered to show no radio selected, so that "no answer" stays visible (and costs a Penalty when the Step closes).
18. As a Player, I want the summary of a closed Question to keep saying that I abstained, so that the results stay readable.
19. As a Player using a screen reader, I want the Abstention radio announced as part of the same group as the Options, so that I understand it is an alternative answer.
20. As a Facilitator or Co-facilitator, I want the Abstention to behave the same way on my page when I answer, so that every role has the same interface.
21. As Claude, I want the result of a Question to be unchanged (Votes in the distribution, `abstentions` and `nonAnswers` apart), so that nothing changes in how I read it.
22. As a Player, I want the rules text to keep describing the Abstention correctly, so that it does not mention a button.

## Implementation Decisions

- The change is limited to the Player-facing interface: the open-Question card, the labels (English and French), and the styling of the Abstention radio.
- The Abstention radio belongs to the same radio group as the Options of its Question. Its selected state comes from the Player's current choice already exposed by the server (Option, Abstention or nothing).
- Choosing the radio sends the existing explicit Abstention answer; choosing an Option sends a Vote as today. The wire format of the answer, the server rules (mutually exclusive, no return to "no answer", unknown Option refused) and the saved-Session format do not change.
- Selecting the Abstention radio is handled by the same change handling as the Options; the dedicated button handling is removed.
- Visual separation: the Abstention radio is set apart from the Options (a rule or a muted style); it does not use the letter or the "Recommended" badge, and its selected state uses the same "chosen" treatment as a selected Option.
- Label: the existing label text is replaced in both languages by the first-person form ("I abstain" / "Je m'abstiens"). Other texts that mention abstaining (status line, rules, tooltips, results) are reviewed and kept consistent; the rules and status texts must not refer to a button.
- The domain vocabulary is unchanged: an Abstention is offered beside the Options but is not an Option (see the glossary).

## Testing Decisions

- A good test checks external behaviour, not internal structure. The server API is not changed, so its existing tests (Abstention, switching, counter, Penalty, restart) already cover the behaviour and stay as they are.
- Seam: the i18n tests, extended so that the Abstention label exists in English and French (and that both languages keep the same keys). No new seam, no DOM test harness.
- The interface is verified manually, with a checklist: one radio group per Question with the Abstention last, without letter or badge and visually set apart; selecting it records the Abstention and unselects the Option (and conversely); counter goes up; selection persists after reload; closed Step still says "You abstained"; arrow keys move across Options and Abstention; no leftover "Abstain" button; both languages.

## Out of Scope

- Any change to the server, the API, the arbitration, the Points, the Penalty, the statistics or the Summary.
- Treating the Abstention as an Option in the domain (it keeps no letter, no Recommended status, and stays out of the distribution).
- A way to withdraw an answer and go back to "no answer".
- A DOM test harness.

## Further Notes

- The glossary states that the Abstention is offered next to the Options without being one: it has no letter and is never Recommended.
