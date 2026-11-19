# Grill Arena

A grilling session run by Claude where several participants vote on the options of each question, with a score to make the exercise playful.

## Language

### Flow

**Session**:
A complete grilling, from the first Step until no question is left open.
_Avoid_: game, match

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
The Option that settles the Question when the Step closes: the one with the most Votes, the recommended one if nobody voted, otherwise the one the Facilitator picks among the tied ones.
_Avoid_: winning answer, decision

**Question to re-ask**:
A Question closed without a Selected option: either because the Votes are tied (a split vote), or because the Facilitator re-asks it, the Comments showing that no Option fits. It comes back in the next Step, reformulated, as a Re-asked question.
_Avoid_: cancelled question, other

**Split vote**:
A tie between Options on a Question. It is not settled by the Recommended option: the Question becomes a Question to re-ask, so that the disagreement is discussed out loud.

**Re-asked question**:
A Question published by naming the Question to re-ask it takes over (`reaskOf`). A tie on a Re-asked question is not re-asked a second time: the Facilitator breaks it. A Question is taken over only once, and a Re-asked question can no longer be re-asked.

**Summary**:
The list of the Selected options of a Session, which feeds the spec.

### Participants

**Player**:
A participant identified by a nickname, who votes, abstains or comments.
_Avoid_: participant, user, voter

**Facilitator**:
A Player who, in addition, opens and closes Steps and breaks ties.
_Avoid_: admin, game master

**Co-facilitator**:
A Player the Facilitator appoints to open and close Steps in their place, for example when they have to step away; the Facilitator can revoke them at any time.
_Avoid_: deputy, moderator

**Vote**:
A Player's choice of an Option for a Question; it stays hidden until the Step closes.

**Abstention**:
A Player's absence of Vote on a Question; it earns nothing and costs nothing.

**Comment**:
A free text a Player adds to a Question; it is passed on to Claude and does not count as a Vote.

### Score

**Point**:
What a Player earns when their Vote is for the Selected option.

**Scoreboard**:
The running total of each Player's Points over the Session, published at the end of the Session.
_Avoid_: ranking, leaderboard
