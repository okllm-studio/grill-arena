# Grill Arena

A grilling session run by Claude where several participants vote on the options of each question, with a score to make the exercise playful.

The domain terms are French: they are the ones used by the interface, the API and the code. Each entry gives its English equivalent in parentheses.

## Language

### Flow

**Séance** (session):
A complete grilling, from the first round until no question is left open.
_Avoid_: partie, session

**Étape** (Step):
One round of grilling: all the questions asked at the same time, put to the vote, then closed.
_Avoid_: round, manche, tour

**Prompt initial** (initial prompt):
The starting request of the Séance. Joueurs see it until the first Étape is opened, and the Animateur can edit it until then; afterwards only the Animateur can read it, and it no longer changes.
_Avoid_: consigne, sujet

**Ouverture** (opening):
The act by which the Animateur starts the vote of an Étape that Claude has published; until it is opened, Joueurs do not see its Questions.
_Avoid_: validation, démarrage

**Question**:
A decision to settle within an Étape, with closed Propositions.

**Numéro** (number):
The rank of a Question in the Séance, continuous from one Étape to the next; a Question à reposer gets a new Numéro.

**Proposition** (option):
One possible answer to a Question.
_Avoid_: option, choix

**Proposition recommandée** (recommended option):
The Proposition Claude advises for a Question; there is exactly one per Question.

**Proposition retenue** (retained option):
The Proposition that settles the Question when the Étape closes: the one with the most Votes, the recommended one if nobody voted, otherwise the one the Animateur picks among the tied ones.
_Avoid_: réponse gagnante, décision

**Question à reposer** (question to re-ask):
A Question closed without a Proposition retenue: either because the Votes are tied (split Votes), or because the Animateur re-asks it, the Commentaires showing that no Proposition fits. It comes back in the next Étape, reformulated, as a Question reprise.
_Avoid_: question annulée, autre

**Question reprise** (re-asked question):
A Question published by naming the Question à reposer it takes over (`reprise`). A tie on a Question reprise is not re-asked a second time: the Animateur breaks it. A Question is taken over only once, and a Question reprise can no longer be re-asked.

**Récapitulatif** (summary):
The list of the Propositions retenues of a Séance, which feeds the spec.

### Participants

**Joueur** (player):
A participant identified by a nickname, who votes, abstains or comments.
_Avoid_: participant, utilisateur, votant

**Animateur** (facilitator):
A Joueur who, in addition, opens and closes Étapes and breaks ties.
_Avoid_: admin, maître du jeu

**Co-animateur** (co-facilitator):
A Joueur the Animateur appoints to open and close Étapes in their place, for example when they have to step away; the Animateur can revoke them at any time.
_Avoid_: adjoint, modérateur

**Vote**:
A Joueur's choice of a Proposition for a Question; it stays hidden until the Étape closes.

**Abstention**:
A Joueur's absence of Vote on a Question; it earns nothing and costs nothing.

**Commentaire** (comment):
A free text a Joueur adds to a Question; it is passed on to Claude and does not count as a Vote.

### Score

**Point**:
What a Joueur earns when their Vote is for the Proposition retenue.

**Tableau des scores** (score table):
The running total of each Joueur's Points over the Séance, published at the end of the Séance.
_Avoid_: classement, leaderboard
