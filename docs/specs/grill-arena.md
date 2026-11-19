---
label: ready-for-agent
---

# Grill Arena : séance de grilling multijoueur

Vocabulaire : `GLOSSARY.md` à la racine du dépôt.

## Problem Statement

Un grilling avec Claude se joue dans un terminal, face à une seule personne. Quand plusieurs personnes doivent trancher ensemble (une équipe autour d'un écran, ou chacun sur son poste), une seule tape les réponses. Les autres donnent leur avis à l'oral et cet avis se perd. Personne n'est incité à s'écarter de la recommandation de Claude, alors que c'est souvent là que le cadrage gagne en qualité. On n'a pas non plus de vue d'ensemble de l'avancement de la Séance.

## Solution

Une page web servie en local, que chaque Joueur ouvre dans son navigateur. Claude y publie chaque Étape du grilling au lieu de l'écrire au terminal. Les Joueurs votent pour une Proposition de chaque Question (ou s'abstiennent) et peuvent laisser un Commentaire. L'Animateur ouvre puis clôt chaque Étape (un Co-animateur peut le faire à sa place). La Proposition retenue est celle qui a le plus de Votes ; un partage des Votes est renvoyé à l'oral. Claude reçoit les résultats et les Commentaires, puis construit l'Étape suivante. Chaque Joueur gagne un Point quand il a voté pour la Proposition retenue. L'avancement s'affiche à chaque clôture ; le Tableau et les statistiques de participation sont publiés en fin de Séance. En fin de Séance, la page affiche un podium et un Récapitulatif des décisions, qui sert d'entrée à `to-spec`.

## User Stories

### Animateur : mise en place
1. En tant qu'Animateur, je veux lancer une Séance avec un skill `grilling-arena`, pour que les Joueurs reçoivent les Questions sur la page plutôt que dans mon terminal.
2. En tant qu'Animateur, je veux que le skill démarre le serveur s'il ne tourne pas déjà, pour ne rien avoir à lancer à la main.
3. En tant qu'Animateur, je veux que la page Animateur affiche l'URL du réseau local et un QR code, pour que les Joueurs rejoignent en quelques secondes.
4. En tant qu'Animateur, je veux une URL Animateur protégée par un jeton aléatoire, pour qu'un Joueur ne puisse pas clore une Étape par erreur.
5. En tant qu'Animateur, je veux que le jeton s'affiche dans le terminal au démarrage du serveur, pour ouvrir ma page sans le chercher.
6. En tant qu'Animateur, je veux que démarrer une nouvelle Séance archive la précédente, pour ne jamais mélanger deux grillings.

### Joueur : rejoindre
7. En tant que Joueur, je veux rejoindre en choisissant un pseudo, sans compte ni mot de passe, pour participer tout de suite.
8. En tant que Joueur, je veux que mon navigateur se souvienne de mon pseudo, pour retrouver ma place et mon score après un rechargement.
9. En tant que Joueur, je veux qu'on me refuse un pseudo déjà pris dans la Séance, sauf si je demande explicitement à le reprendre, pour ne pas être confondu avec quelqu'un d'autre au Tableau des scores tout en pouvant revenir après avoir perdu mon identité.
10. En tant que Joueur arrivé en cours de Séance, je veux pouvoir voter dès l'Étape ouverte, en partant de 0, pour participer même en retard.

### Joueur : voter
11. En tant que Joueur, je veux voir chaque Question de l'Étape avec son texte rendu en Markdown, pour lire le raisonnement de Claude comme au terminal.
12. En tant que Joueur, je veux voir quelle Proposition Claude recommande, pour décider en connaissance de cause.
13. En tant que Joueur, je veux voter pour une seule Proposition par Question, pour exprimer clairement mon choix.
14. En tant que Joueur, je veux pouvoir m'abstenir sur une Question, pour ne pas me prononcer sur un sujet que je ne maîtrise pas.
15. En tant que Joueur, je veux changer mon Vote ou revenir à l'Abstention tant que l'Étape est ouverte, pour corriger un clic ou changer d'avis.
16. En tant que Joueur, je veux ajouter un Commentaire libre à une Question, que j'aie voté ou non, pour signaler une nuance ou une Proposition manquante.
17. En tant que Joueur, je veux modifier ou effacer mon Commentaire tant que l'Étape est ouverte.
18. En tant que Joueur, je veux que les Votes et Commentaires des autres restent masqués jusqu'à la clôture, pour voter sans être influencé.
19. En tant que Joueur, je veux voir combien de Joueurs ont déjà voté sur chaque Question, pour savoir où en est le groupe.
20. En tant que Joueur, je veux que la page se mette à jour toute seule (nouvelle Étape, clôture, compteurs), pour ne jamais avoir à la recharger.

### Animateur : clore une Étape
21. En tant qu'Animateur, je veux voir le compteur « X/N ont voté » de chaque Question, pour juger quand clore.
22. En tant qu'Animateur, je veux clore l'Étape d'un clic, pour révéler les résultats et rendre la main à Claude.
23. En tant qu'Animateur, je veux qu'au moment de clore on me demande de départager les ex æquo qui ne contiennent pas la Proposition recommandée, pour que chaque Question soit tranchée.
24. En tant qu'Animateur, je veux pouvoir marquer une Question « à reposer » quand les Commentaires montrent qu'aucune Proposition ne convient, pour que Claude la reformule.
25. En tant qu'Animateur, je veux pouvoir voter comme n'importe quel Joueur, puisque je fais aussi partie du groupe.

### Arbitrage et score
26. En tant que Joueur, je veux que la Proposition qui a le plus de Votes soit retenue, pour que le choix du groupe s'impose.
27. En tant que Joueur, je veux qu'en l'absence de tout Vote ce soit la recommandée qui soit retenue, sans Point pour personne, pour que la Séance avance quand même.
28. En tant que Joueur, je veux qu'en cas d'ex æquo incluant la recommandée ce soit elle qui l'emporte, pour une règle prévisible.
29. En tant que Joueur, je veux gagner un Point quand j'ai voté pour la Proposition retenue, pour être récompensé d'avoir vu juste.
31. En tant que Joueur, je veux qu'une Abstention ou un Vote pour une autre Proposition ne me coûte rien, pour voter sans crainte.
32. En tant que Joueur, je veux qu'une Question à reposer ne rapporte de Point à personne, puisqu'elle n'a pas été tranchée.

### Révélation et avancement
33. En tant que Joueur, je veux qu'à la clôture la page révèle pour chaque Question la répartition des Votes, la Proposition retenue (ou « à reposer ») et les Commentaires avec leur auteur, pour comprendre la décision.
35. En tant que Joueur, je veux voir le Tableau des scores à la fin de la Séance (ou quand l'Animateur le publie), pour ne pas orienter mes Votes pendant la Séance.
36. En tant que Joueur, je veux voir le numéro de l'Étape, le nombre de Questions tranchées et une estimation des Questions à venir, pour savoir où en est la Séance.

### Claude
37. En tant que Claude, je veux publier une Étape (numéro, avancement, Questions avec Propositions fermées et une recommandée), pour la soumettre au vote.
38. En tant que Claude, je veux qu'une Étape mal formée soit refusée avec un message explicite (pas de recommandée, recommandée absente des Propositions, Question sans Proposition), pour la corriger avant que les Joueurs la voient.
39. En tant que Claude, je veux attendre la clôture avec une requête en long-poll que je lance en arrière-plan, pour être réveillé à la clôture sans interroger le serveur en boucle.
40. En tant que Claude, je veux recevoir pour chaque Question son statut (retenue ou à reposer), la Proposition retenue, la répartition des Votes et les Commentaires, pour construire l'Étape suivante.
41. En tant que Claude, je veux que mes requêtes exigent le jeton de l'Animateur, pour qu'un Joueur ne puisse pas publier d'Étape.
42. En tant que Claude, je veux déclarer la fin de la Séance, pour déclencher le podium et obtenir le Récapitulatif.
43. En tant que Claude, je veux recevoir le Récapitulatif en Markdown (Questions et Propositions retenues, par Étape), pour enchaîner sur `to-spec`.
44. En tant que Claude, je veux que le skill `grilling-arena` applique les mêmes règles de frontière que `grilling`, en publiant au lieu d'écrire au terminal, pour garder la même rigueur.
45. En tant que Claude, je veux que le skill me rappelle de traiter les Commentaires comme des réponses « autre », pour ouvrir les branches qu'ils révèlent.

### Fin et reprise
46. En tant que Joueur, je veux voir un podium et le Récapitulatif en fin de Séance, pour conclure le jeu et retrouver ce qui a été décidé.
47. En tant qu'Animateur, je veux que la Séance soit sauvegardée sur disque à chaque clôture et rechargée au redémarrage du serveur, pour ne perdre ni décisions ni scores en cas de plantage.
48. En tant qu'Animateur, je veux que chaque Séance ait son fichier sur disque, pour garder une trace des grillings passés.

## Implementation Decisions

- **Dépôt dédié** `grill-arena`, en Node.js et Express, sans étape de build. Le serveur écoute sur `0.0.0.0`, port 4242 par défaut et configurable.
- **Modules** :
  - **Arbitrage** (pur, sans E/S) : à partir d'une Question, des Votes, des départages et des Questions à reposer, il détermine le statut de la Question, la Proposition retenue et les ex æquo à départager. À partir des résultats d'une Étape et des Joueurs, il calcule les gains de chacun. Le barème vaut 1 Point par défaut, et il est configurable. Une égalité entre Propositions est renvoyée à l'oral (Question à reposer), sauf après une repose où l'Animateur tranche.
  - **Séance** : l'état en mémoire (Joueurs, Étapes, Votes, Commentaires, Tableau des scores). Il valide les Étapes publiées, applique les règles de masquage et produit le Récapitulatif. Il s'appuie sur l'Arbitrage.
  - **Stockage** : un fichier JSON par Séance, écrit à chaque clôture et au démarrage ou à la fin de la Séance. La dernière Séance non terminée est rechargée au démarrage. Le dossier est configurable.
  - **API HTTP** : un fin adaptateur sur la Séance, plus un flux SSE qui diffuse les changements (nouvelle Étape, compteurs, clôture, fin).
  - **Page** : HTML et JS servis statiquement, avec trois vues (Joueur, Animateur selon le jeton, podium avec Récapitulatif), un panneau de règles, et un relevé périodique de l'état en plus du flux SSE. Le Markdown est rendu côté client, le QR code est généré côté client, et le joueur est mémorisé dans `localStorage`.
  - **Skill `grilling-arena`** : sa source est versionnée dans le dépôt et elle est installée dans `~/.claude/skills/` par un lien symbolique.
- **Jeton Animateur** : aléatoire, régénéré à chaque démarrage du serveur, affiché dans la console et écrit (avec le port) dans le dossier des Séances, lisible par l'utilisateur seul. Il est exigé pour publier une Étape, lire un résultat, clore, départager, marquer à reposer, démarrer et terminer une Séance. Le skill le lit dans ce dossier, que le serveur vienne d'être lancé ou tourne déjà.
- **Contrat de l'API** (les noms exacts sont laissés à l'implémentation) :
  - Claude, avec jeton : démarrer une Séance (titre), ce qui archive la Séance active ; publier une Étape (numéro, nombre de Questions tranchées, estimation des Questions à venir, puis pour chaque Question un identifiant, un titre, un corps Markdown, des Propositions identifiées et l'identifiant de la recommandée) ; attendre le résultat d'une Étape en long-poll ; terminer la Séance, ce qui renvoie le Récapitulatif Markdown.
  - Une seule Étape à la fois : en publier une autre tant que la précédente n'est pas close est refusé. Une Étape publiée attend l'Ouverture par l'Animateur.
  - Le long-poll répond tout de suite si l'Étape est déjà close. Sinon il reste ouvert jusqu'à la clôture, sans délai côté serveur, et peut être relancé sans effet de bord.
  - Joueur : rejoindre avec un pseudo, unique dans la Séance sans tenir compte de la casse (refusé s'il existe, sauf demande de reprise explicite qui rend le Joueur existant), ce qui renvoie un identifiant de Joueur ; poser, changer ou retirer son Vote et son Commentaire sur une Question de l'Étape ouverte ; lire l'état courant.
  - L'état renvoyé pendant une Étape ouverte ne contient que le Vote et le Commentaire du Joueur qui le demande, plus les compteurs. Après la clôture, il contient tout.
  - Animateur, avec jeton : clore l'Étape avec les départages et la liste des Questions à reposer. Une clôture qui laisse un ex æquo sans recommandée et sans départage est refusée, avec la liste des Questions à départager.
  - Un Vote ou un Commentaire sur une Étape close est refusé.
- **Résultat renvoyé à Claude**, pour chaque Question : statut (`retenue` ou `a_reposer`), Proposition retenue, nombre de Votes par Proposition, nombre d'Abstentions, Commentaires avec leur pseudo. Le résultat contient aussi le Tableau des scores à jour.
- **Avancement** : fourni par Claude à chaque Étape et affiché tel quel (« Étape n · x tranchées · ~y à venir »). Le serveur ne le calcule pas.
- **Récapitulatif** : produit par le serveur à partir des Étapes closes. Il liste, Étape par Étape, chaque Question avec sa Proposition retenue. Il contient aussi les Questions à reposer, comme telles, et le Tableau des scores final.

## Testing Decisions

- Un bon test passe par une interface publique et vérifie un comportement observable (réponse HTTP, résultat renvoyé à Claude, Tableau des scores, contenu de l'état visible par un Joueur). Il ne vérifie jamais la structure interne de l'état.
- **Couture principale : l'API HTTP.** Le serveur est démarré dans le processus de test, sur un port libre, avec un dossier de Séances temporaire et un jeton imposé. Les tests jouent Claude, plusieurs Joueurs et l'Animateur sur un cycle complet. Ils couvrent :
  - la publication, avec refus des Étapes mal formées ;
  - les Votes, les changements de Vote et les Abstentions ;
  - le masquage avant clôture ;
  - le refus sans jeton ;
  - la clôture refusée tant qu'un ex æquo n'est pas départagé ;
  - le long-poll débloqué par la clôture ;
  - le contenu du résultat et du Récapitulatif ;
  - la reprise après redémarrage à partir du JSON.
- **Couture secondaire : le module Arbitrage**, testé directement. Cas couverts :
  - majorité simple ;
  - aucun Vote ;
  - ex æquo avec la recommandée ;
  - ex æquo sans la recommandée (départage exigé, puis appliqué) ;
  - Question à reposer ;
  - Point unique, sans Bonus ;
  - Abstention ;
  - Joueur arrivé en cours de Séance ;
  - barème personnalisé.
- Runner : `node:test`, sans dépendance de test. Implémentation en TDD (`tdd`).
- Pas de test automatisé pour la page (SSE côté navigateur, rendu, QR code) ni pour le skill : on les vérifie à la main lors d'une vraie Séance.
- Il n'existe pas de test antérieur dans ce dépôt (il vient d'être créé).

## Out of Scope

- Authentification réelle, HTTPS, accès depuis Internet.
- Plusieurs Séances simultanées.
- Délai automatique de clôture, ou clôture quand tout le monde a voté.
- Propositions ajoutées par les Joueurs pendant le vote (on passe par un Commentaire, puis par une Question à reposer).
- Malus, pondération des Questions, succès ou badges.
- Modification du skill `grilling` existant et intégration à `grill-with-docs` (le glossaire et les ADR restent à la charge de Claude pendant la Séance, comme au terminal).
- Historique navigable des Séances passées dans l'interface (les fichiers JSON suffisent).

## Further Notes

- Le serveur ne fait pas tourner Claude : il ne fait que relayer. Toute l'intelligence du grilling (frontière, recommandations) reste dans le skill.
- Le long-poll lancé en arrière-plan sert à respecter la contrainte de Claude Code, qui ne permet pas d'attente bloquante au premier plan. Le skill doit lancer la requête en arrière-plan et attendre la notification.
- Découpage possible avec `to-tickets` : (1) Arbitrage ; (2) Séance, Stockage et API ; (3) Page ; (4) Skill `grilling-arena`.
