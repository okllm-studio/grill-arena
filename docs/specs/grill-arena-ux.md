---
label: ready-for-agent
---

# Grill Arena : améliorations UX et documentation intégrée

Vocabulaire : `GLOSSARY.md` à la racine du dépôt. Issue d'une Séance de grilling (12 Questions, 4 Étapes) menée sur grill-arena lui-même. Spec précédente : `docs/specs/grill-arena.md`.

## Problem Statement

Un Joueur ou un Animateur qui ouvre la page grill-arena ne sait pas quoi faire. Sans Séance, la page dit « En attente d'une Séance… » sans dire qu'il faut lancer le skill dans Claude Code. Les règles du jeu (Votes masqués, Commentaires transmis à Claude, Points) ne sont écrites nulle part dans la page. L'Animateur ne comprend pas le panneau « Clore l'Étape » (faut-il cocher les cases ?) ni ce qu'il doit faire ensuite. Le Joueur ne sait pas si son Vote ou son Commentaire est enregistré, ni ce qu'il attend. Le compteur de Votes ne se met à jour que chez l'Animateur, et les pages restent périmées sans que personne le sache. Un Joueur qui recharge en navigation privée est bloqué : son pseudo est déjà pris. Après une clôture, rien n'indique que Claude prépare la suite, et la page de fin n'affiche pas le Récapitulatif des décisions.

## Solution

La page guide chacun selon son rôle et l'état de la Séance. Elle explique les règles à la demande, confirme chaque action de façon visible, se tient à jour toute seule, laisse un Joueur reprendre son pseudo, annonce que Claude prépare la suite et affiche le Récapitulatif en fin de Séance. Le README ouvre sur un « Démarrage rapide » pour l'Animateur.

## User Stories

1. As a Joueur, I want to read « L'Animateur n'a pas encore lancé la Séance » when no Séance exists, so that I know I just have to wait and not that something is broken
2. As an Animateur, I want an encart explaining that I must run `/grilling-arena` in Claude Code when no Séance exists, so that I know how to start
3. As an Animateur, I want that encart to appear only on my page (the one opened with the jeton), so that Joueurs are not shown technical jargon
4. As an Animateur opening the page with an invalid or missing jeton, I want an error message that tells me to take the Animateur link displayed in the terminal running the server, so that I can get a valid link
5. As a Joueur, I want a « Règles » button in the header opening a panel, so that I can read how the game works without leaving the vote
6. As a Joueur, I want the Règles panel to say that Votes stay hidden until the Étape is closed, so that I understand why I do not see others' choices
7. As a Joueur, I want the Règles panel to say that Commentaires are sent to Claude and do not count as a Vote, so that I know what they are for
8. As a Joueur, I want the Règles panel to explain Points, so that I understand the Tableau des scores
9. As a Joueur, I want the Règles panel to say that the Proposition recommandée is retenue when nobody votes, so that abstaining is not a surprise
10. As a Joueur, I want to close the Règles panel with the same button, so that it does not clutter the screen
11. As an Animateur, I want a « Prochaine action » line that changes with the state of the Séance, so that I always know what to do next
12. As an Animateur, I want the line to say « Attendre que Claude publie la première Étape » before the first Étape, so that I do not look for a button that does not exist
13. As an Animateur, I want the line to say « Clore l'Étape quand tout le monde a voté » while an Étape is open, so that I know when to act
14. As an Animateur, I want the line to say « Claude prépare la suite » after a closure, so that I do not wait for a button
15. As an Animateur, I want the « Clore l'Étape » panel to explain in one sentence that I only tick a Question when no Proposition fits, so that I do not tick boxes by default
16. As an Animateur, I want each checkbox labelled « Aucune Proposition ne convient : la reposer » with the Question title and vote count, so that its effect is unambiguous
17. As an Animateur, I want that leaving every box unticked is clearly the normal case, so that I can close the Étape without hesitation
18. As an Animateur, I want ex æquo to be explained when closure is refused (which Question, why I choose), so that I can resolve them
19. As a Joueur, I want a short message « Vote enregistré, modifiable jusqu'à la clôture » after I vote, so that I know my choice counts and can be changed
20. As a Joueur, I want a message « En attente de la clôture » once I have answered every Question, so that I know I have nothing more to do
21. As a Joueur, I want a message « Étape close, Claude prépare la suite » after a closure, so that I know the game continues
22. As a Joueur, I want my Commentaire to be saved automatically when I leave the field, so that I never lose it by forgetting a button
23. As a Joueur, I want « ✓ Enregistré » shown next to my Commentaire once saved, so that I see the result where I acted
24. As a Joueur, I want « modifications non enregistrées » shown while my Commentaire differs from the saved one, so that I know its state
25. As a Joueur, I want a Commentaire emptied and left to be removed, so that I can retract it
26. As a Joueur, I want the « x/y ont voté » counter to update on my page without reloading, so that I see how the group is progressing
27. As a Joueur, I want my page to refresh after each of my own actions, so that I immediately see the effect of my Vote
28. As a Joueur, I want my page to refresh itself about every 5 seconds while open, so that a new Étape or a closure appears even if the real-time stream does not reach me
29. As a Joueur behind a tunnel, I want the page to work even if the real-time stream is blocked or delayed, so that I am not stuck on a stale Étape
30. As a Joueur, I want refreshing to keep my typed Commentaire and my focus, so that I am not interrupted
31. As a Joueur who lost my identity (private browsing, cleared data, new device), I want to be offered « C'est moi, reprendre ce pseudo » when my pseudo exists, so that I can come back to the Séance
32. As a Joueur resuming a pseudo, I want to see my previous Votes and Commentaires for the open Étape, so that I continue where I stopped
33. As a Joueur choosing a new pseudo, I want a clear refusal if it is empty, so that I know what to fix
34. As a Joueur, I want the Récapitulatif of the Séance shown under the podium at the end, so that I find what was decided
35. As an Animateur, I want the Récapitulatif to be visible on my page as well, so that I can copy it
36. As a Joueur on a phone, I want touch targets of at least 44 px, so that I vote without mis-tapping
37. As a Joueur on a phone, I want the Tableau des scores to scroll horizontally instead of overflowing the page, so that the layout stays intact
38. As a Joueur using a keyboard or a screen reader, I want labelled fields and a visible focus, so that I can use every control
39. As a Joueur, I want readable contrasts for badges, buttons and bars, so that I read results in any light
40. As a new Animateur, I want a « Démarrage rapide » at the top of the README (installation, `make tunnel`, `make start`, `/grilling-arena`, sharing the URL), so that I can run a Séance without reading the whole document

## Implementation Decisions

- **État de la page sans Séance.** Le Joueur et l'Animateur voient des messages différents. L'Animateur est celui dont la page est ouverte avec le jeton ; l'encart cite le skill `/grilling-arena`.
- **Message de jeton invalide.** Il renvoie vers le lien Animateur affiché dans le terminal du serveur.
- **Panneau « Règles ».** Un bouton dans l'en-tête, à côté du Tableau des scores, l'ouvre et le ferme. Son contenu reprend la définition des Votes, Commentaires, Points et de la Proposition retenue du glossaire (il n'y a pas de Bonus), sans les redéfinir autrement. Il ne change pas selon l'état de la Séance.
- **Ligne « Prochaine action » (Animateur).** Elle se déduit de l'état visible : pas d'Étape, Étape ouverte, Étape close non terminée, Séance terminée.
- **« Claude prépare la suite ».** État déduit : Étape close et Séance non terminée, sans Étape publiée en attente d'Ouverture (voir `docs/specs/grill-arena-scoring.md`). Il apparaît côté Joueur et côté Animateur. Aucune route ni modification du skill n'est ajoutée : le serveur ne peut pas observer Claude, et la déduction ne peut être ni fausse ni oubliée. Un message explicite envoyé par le skill a été écarté.
- **Panneau « Clore l'Étape ».** Une phrase d'aide au-dessus des cases, et le libellé « Aucune Proposition ne convient : la reposer ». La mécanique de clôture ne change pas.
- **Messages d'état du Joueur.** Courts, affichés près des Questions et non en bas de page : Vote enregistré (modifiable jusqu'à la clôture), en attente de la clôture, Étape close.
- **Commentaires.** L'enregistrement se déclenche à la frappe (avec délai), à la sortie du champ et à la fermeture de la page (voir `docs/specs/grill-arena-scoring.md`). Le bouton « Enregistrer le commentaire » disparaît. L'indication « ✓ Enregistré » ou « modifications non enregistrées » s'affiche à côté du champ, pas dans le message global. Un Commentaire vidé est supprimé, comme aujourd'hui côté serveur.
- **Mise à jour des pages.** En plus du flux temps réel, chaque page se rafraîchit après toute action du Joueur et par un relevé périodique d'environ 5 secondes. Le relevé doit préserver la saisie en cours et le focus, comme le rendu actuel. Le flux temps réel est conservé.
- **Reprise de pseudo.** L'API d'inscription accepte une demande de reprise explicite pour un pseudo existant et renvoie alors l'identité de ce Joueur. Sans cette demande, le refus des doublons reste. La page propose « C'est moi, reprendre ce pseudo » quand elle reçoit ce refus. Aucun secret n'est exigé : le groupe est restreint, l'URL de la Séance étant déjà le seul secret ; ce choix est assumé, y compris le fait qu'un participant peut prendre le pseudo d'un autre.
- **Récapitulatif en fin de Séance.** L'état de la Séance expose le Récapitulatif quand la Séance est terminée, pour tous. La page le rend (Markdown) sous le podium, y compris sur la page Animateur. Le contenu est celui que l'API de fin renvoie déjà à Claude.
- **Mobile et accessibilité.** Zones tactiles d'au moins 44 px, tableau des scores défilant horizontalement sur petit écran, champs étiquetés, focus visible, contrastes suffisants. Pas de refonte de la mise en page.
- **README.** Un « Démarrage rapide » en tête (installation, `make tunnel`, `make start`, `/grilling-arena`, partage de l'URL). Pas de page d'aide servie par le serveur. Les passages du README et de la spec `docs/specs/grill-arena.md` que ces changements rendent obsolètes sont mis à jour.

## Testing Decisions

- Un bon test passe par une interface publique et vérifie un comportement observable (réponse HTTP, état visible par un Joueur). Il ne vérifie jamais la structure interne de l'état.
- **Couture unique : l'API HTTP**, déjà testée en processus avec un serveur sur port libre, un dossier temporaire et un jeton imposé. Elle est étendue pour :
  - la reprise de pseudo : un pseudo existant sans demande de reprise reste refusé (409) ; avec la demande, l'identité du Joueur est renvoyée et ses Votes de l'Étape ouverte sont visibles dans sa vue ; un pseudo vide reste refusé ;
  - le Récapitulatif dans l'état : absent tant que la Séance n'est pas terminée, présent pour tout Joueur une fois terminée.
- **La page n'a pas de test automatisé** : elle est en JavaScript natif, sans infrastructure de test, et ajouter un navigateur ou extraire un module de vues a été écarté. Elle se vérifie à la main, avec une checklist suivant les user stories : état sans Séance (Joueur et Animateur), panneau Règles, ligne « Prochaine action » aux quatre états, panneau de clôture, messages d'état, auto-enregistrement des Commentaires, mise à jour sans rechargement derrière le tunnel, reprise de pseudo, Récapitulatif de fin, affichage sur téléphone.
- Prior art : `test/api.test.js` (cycle complet avec plusieurs Joueurs), même démarrage de serveur et mêmes helpers de requête.

## Out of Scope

- Un message explicite « Claude réfléchit » envoyé par le skill.
- Un code personnel ou un mot de passe pour la reprise de pseudo.
- Une page d'aide `/aide` servie par le serveur.
- Les tests automatisés de la page (navigateur ou module de vues).
- Une refonte graphique ou une nouvelle mise en page de la page.

## Further Notes

- La spec précédente prévoit déjà que la page de fin affiche un Récapitulatif ; l'implémentation actuelle ne montre que le podium. Cette spec comble l'écart.
- Les messages du Joueur (« Claude prépare la suite ») et celui de l'Animateur reposent sur le même état déduit.
- Reste à vérifier en conditions réelles (téléphones, tunnel) que le relevé périodique suffit quand le flux temps réel ne passe pas.
