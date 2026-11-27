# Grill Arena

A grilling session run by Claude where several participants vote on the options of each question, with a score to make the exercise playful.

## Language

### Flow

**Session**:
A complete grilling, from the first Step until no question is left open. It is finished once Claude ends it; until then it can be shelved and reopened.
_Avoid_: game, match

**Session list**:
The screen the Facilitator sees while no Session is loaded: every stored Session with its title, date, state and number of Steps. An unfinished Session can be reopened or deleted, a finished one consulted or deleted. A loaded Session is left only by shelving it (unfinished) or by going back to the Session list (finished).
_Avoid_: history, archive

**Reopening**:
The Facilitator's act of loading an unfinished Session from the Session list to carry on from its last Step. A finished Session is never reopened: it is only consulted.

**Consultation**:
Loading a finished Session read-only from the Session list: the Summary, the Scoreboard and the results are shown to everyone, Players included, until the Facilitator goes back to the Session list.

**Shelving**:
The Facilitator's act of setting aside an unfinished Session, as a pause: it is unloaded, stays stored and can be reopened. Only the Facilitator can do it, at any time, after a confirmation. It is neither the closing of a Step nor the end of a Session.
_Avoid_: closing the Session, leaving

**Step**:
One round of grilling: all the Questions asked at the same time, put to the vote, then closed.
_Avoid_: round, turn

**Initial prompt**:
The starting request of the Session. Players see it until the first Step is opened, and the Facilitator can edit it until then; afterwards only the Facilitator can read it, and it no longer changes.
_Avoid_: brief, topic

**Opening**:
The act by which the Facilitator starts the vote of a Step that Claude has published; until it is opened, Players do not see its Questions.
_Avoid_: validation, launch

**Question**:
A decision to settle within a Step, with closed Options.

**Number**:
The rank of a Question in the Session, continuous from one Step to the next; a re-asked Question gets a new Number.

**Option**:
One possible answer to a Question.
_Avoid_: choice, proposal

**Recommended option**:
The Option Claude advises for a Question; there is exactly one per Question.

**Selected option**:
The Option that settles the Question when the Step closes: the one with the most Votes, the recommended one if nobody voted (Abstentions and Non-answers alike), otherwise the one the Facilitator picks among the tied ones.
_Avoid_: winning answer, decision

**Question to re-ask**:
A Question closed without a Selected option: either because the Votes are tied (a split vote), or because the Facilitator re-asks it, the Comments showing that no Option fits. It comes back in the next Step, reformulated, as a Re-asked question.
_Avoid_: cancelled question, other

**Split vote**:
A tie between Options on a Question. It is not settled by the Recommended option: the Question becomes a Question to re-ask, so that the disagreement is discussed out loud.

**Re-asked question**:
A Question published by naming the Question to re-ask it takes over (`reaskOf`). A tie on a Re-asked question is not re-asked a second time: the Facilitator breaks it. A Question is taken over only once, and a Re-asked question can no longer be re-asked.

**Consensus**:
The state of a closed Question on which every voter chose the same Option. Abstentions and Non-answers are ignored, and a Question with fewer than two voters has no Consensus status at all (it is not assessed). Two other levels exist: **Near-consensus** (exactly one dissenting Vote against a majority of at least two, so a 1 against 1 is Divided) and **Divided** (anything else, including a Split vote and a Question to re-ask).
_Avoid_: agreement, unanimity

**Consensual Step**:
A closed Step in which every assessed Question reached Consensus. A Step with no assessed Question is neither consensual nor not.

**Summary**:
The list of the Selected options of a Session, which feeds the spec.

### Participants

**Player**:
A participant identified by a nickname, who votes, abstains or comments (a Player who does none of these on a Question gives a Non-answer).
_Avoid_: participant, user, voter

**Facilitator**:
A Player who, in addition, opens and closes Steps and breaks ties.
_Avoid_: admin, game master

**Co-facilitator**:
A Player the Facilitator appoints to open and close Steps in their place, for example when they have to step away; the Facilitator can revoke them at any time.
_Avoid_: deputy, moderator

**Vote**:
A Player's choice of an Option for a Question; it stays hidden until the Step closes. An Abstention is not a Vote.

**Abstention**:
A Player's explicit answer to a Question that they decline to vote on, because they feel poorly placed to answer and would only bias the result. It is an act: it counts as a response, but not in the result, the Consensus or the Points; it earns nothing and costs nothing. It can be changed to an Option, and an Option to an Abstention, until the Step closes. It is offered next to the Options but is not one of them: Claude does not propose it, it has no letter and is never Recommended.

**Non-answer**:
A Player present when a Step opened who, at its closing, has answered a Question neither with a Vote nor with an Abstention. It has no effect on the result or the Consensus, but it costs a Penalty.
_Avoid_: silent abstention

**Comment**:
A free text a Player adds to a Question; it is passed on to Claude and does not count as a Vote.

### Score

**Point**:
What a Player earns when their Vote is for the Selected option. A Penalty takes one away.

**Penalty**:
The Point a Player loses on a Question closed with a Selected option when they gave a Non-answer to it. A Question to re-ask costs no Penalty, and neither does a Step opened before the Player joined. A Player's total can be negative.

**Scoreboard**:
The running total of each Player's Points over the Session, published at the end of the Session.
_Avoid_: ranking, leaderboard
