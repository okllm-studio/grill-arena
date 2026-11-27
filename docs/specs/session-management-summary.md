label: needs-spec

# Synthèse : Gestion des Sessions côté Facilitateur

Décisions de la Session de cadrage (9 Questions, 3 Étapes). Les Comments de la Session précisent ou corrigent certaines Options retenues ; la section « Décisions consolidées » fait foi.

## Décisions consolidées

- **Session list** (Q1) : le serveur démarre **sans Session chargée** (fin de la reprise automatique). Tant qu'aucune Session n'est chargée, la page Facilitateur affiche la Session list : titre, date, état, nombre d'Étapes. La création d'une Session reste à Claude (titre + Initial prompt), pas de formulaire dans l'interface.
- **Reopening / Consultation** (Q2, Q9) : une Session **non terminée** se rouvre pour continuer. Une Session **terminée** ne se reprend jamais : on la consulte (lecture seule), et la consultation la charge pour tout le monde (Joueurs compris : Summary, Scoreboard, résultats) jusqu'au retour à la Session list.
- **Suppression** (Q3) : définitive, avec confirmation, une Session à la fois, depuis la Session list uniquement (jamais la Session chargée).
- **Shelving** (Q5, Q8) : mettre de côté une Session **non terminée** = pause ; réservé au Facilitateur (pas les Co-facilitateurs), à tout moment, avec confirmation ; la Session est déchargée, reste stockée et rouvrable. Les Joueurs voient un écran d'attente. Pas de geste « Clore » pour une Session terminée : elle est déjà finie.
- **Fin de Session** (Q4, corrigée par le Comment de Q7/Q8) : sur la Session terminée, le Facilitateur voit un bloc « Et maintenant ? » : copier/télécharger le Summary, rappel de la suite du cycle (`to-spec`, lancé par l'utilisateur), et un lien **Retour aux Sessions** (décharge la Session, ramène à la Session list). Pas de « Clore ».
- **Skill** (Q6) : `/grilling-arena` **avec sujet** crée une Session neuve ; **sans sujet** il lit `/api/state`, invite le Facilitateur à choisir dans la Session list, attend (long-poll) qu'une Session soit chargée, puis reconstruit la frontière depuis ses Étapes closes et continue. Nécessite un moyen d'attendre le chargement d'une Session.
- **Remplacement par Claude** (Q7) : `POST /api/session` garde son comportement actuel (remplace silencieusement la Session chargée, déjà sauvegardée, donc rouvrable depuis la Session list). L'interface, elle, ne permet plus de changer de Session sans passer par Shelving ou Retour aux Sessions.

## Résultats par Question

### Étape 1
- Q1 : A. Démarrage sans Session ; liste + Rouvrir/Supprimer ; création à Claude.
- Q2 : A. Non terminées : continuer. Terminées : consultation seule.
- Q3 : A. Suppression définitive, confirmation, une à la fois.
- Q4 : A. Copier/télécharger le Summary + rappel de la suite + Clore (voir correction ci-dessus).
- Q5 : A. Facilitateur seul, à tout moment, avec confirmation (réduit à Shelving, voir ci-dessus).

### Étape 2
- Q6 : A. Sujet : création ; sans sujet : attendre le choix du Facilitateur puis reprendre.
- Q7 : C (non recommandée). Remplacement silencieux conservé.
- Q8 : B. Shelve the Session.

### Étape 3
- Q9 : A. Consultation = chargement en lecture seule, visible des Joueurs.

## Comments notables

- Q1 : les Sessions terminées s'accumulent dans `sessions/` sans qu'on sache qu'en faire ; la reprise n'a jamais été utilisée ; comment reprendre sans prompt dans Claude ? → Q6.
- Q7 : le besoin de « clore » en fin de Session est un besoin d'UX alors que la Session est déjà finie ; le vrai besoin est de gérer les Sessions terminées (les lister) et de reprendre les non terminées.
- Q8 : « mettre de côté » ne vaut que pour une Session en cours ; une Session terminée ne se reprend pas, on la consulte ou on l'efface.

## Points à garder en tête pour la spec

- Q4/Q5 ont été retenues avec « Clore » puis corrigées par les Comments : la spec suit la section « Décisions consolidées ».
- Q7 = C laisse une asymétrie : Claude peut remplacer une Session non terminée sans geste du Facilitateur.
- `GLOSSARY.md` définit Session list, Reopening, Consultation, Shelving. Aucun ADR (aucune décision à la fois difficile à défaire et surprenante).

## Statistiques

siko : 9 Votes, 3 Comments, 0 Abstention, 0 Non-answer. Score : 9.
