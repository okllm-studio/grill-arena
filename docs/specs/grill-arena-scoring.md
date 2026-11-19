---
label: ready-for-agent
---

# Grill Arena : scoring, visibilité des Votes, égalités, déroulé d'une Séance

Vocabulaire : `GLOSSARY.md` à la racine du dépôt. Issue de deux Séances de grilling menées sur grill-arena lui-même : une Séance de brainstorm (« Interface et scoring de grill-arena », 5 Étapes, 14 Questions), puis un cadrage fait en jouant une Séance (déroulé, onglets, Co-animateur). Les décisions ci-dessous sont celles de ces Séances ; les points marqués **à confirmer** ne l'ont pas été.

Principe de la Séance : c'est un échange oral sur les specs. En principe, tous les Joueurs votent la même chose ; un désaccord signale un point important non dit. Le scoring doit donc faire remonter les désaccords, pas les effacer. L'Animateur est un Joueur comme les autres, avec des commandes en plus.

## Problem Statement

**Scoring.** Le scoring actuel récompense la contradiction : voter contre la recommandée rapporte un Bonus, alors que le but est de converger à l'oral. Il récompense aussi des Commentaires sans valeur, peut biaiser le résultat par la gamification, et les Points s'affichent en direct pendant la Séance, ce qui oriente les Votes. La règle « sans majorité nette, la recommandée gagne » fait disparaître les désaccords : sur la Séance de brainstorm, quatre Questions ont été tranchées sur des répartitions 1-1, sans que le partage soit discuté.

**Déroulé.** En jouant une Séance, plusieurs frictions sont apparues :
- le numéro des Questions repart de 1 à chaque Étape, ce qui empêche de s'y référer à l'oral ;
- un Commentaire peut être perdu : il n'est envoyé qu'à la sortie du champ, et une clôture pendant la saisie le rejette en silence ;
- à la clôture, le prochain Vote arrive sans que le groupe ait le temps de discuter les résultats, et les résultats des Étapes anciennes ne sont plus consultables ;
- le Prompt initial reste affiché et modifiable pendant toute la Séance, alors qu'il n'est utile qu'au départ ;
- une Question qui renvoie à une Question précédente oblige à la retrouver à la main ;
- si l'Animateur s'absente, la Séance est bloquée : personne d'autre ne peut ouvrir ni clore une Étape.

## Solution

Le scoring devient une statistique de participation, publiée en fin de Séance. Les Votes restent masqués par défaut ; l'Animateur peut activer la répartition en direct. Un partage ne se tranche plus par la recommandée : la Question revient à l'oral. L'Animateur reste le seul à trancher après une repose.

Le déroulé devient piloté : chaque Étape publiée par Claude attend l'Ouverture par l'Animateur, ce qui laisse le temps de discuter les résultats de la précédente. Les Questions ont un Numéro continu sur la Séance. La page s'organise en onglets (Étape en cours, Résultats de toutes les Étapes closes, Animateur). Les Commentaires s'enregistrent tout seuls. Une mention `Q4` dans une Question ouvre une infobulle qui rappelle la Question et ce qui a été voté. L'Animateur peut désigner des Co-animateurs qui font avancer la Séance à sa place.

## User Stories

### Scoring et visibilité

1. En tant que Joueur, je veux que voter contre la recommandée ne me rapporte rien de plus, afin de ne pas être incité à la contradiction.
2. En tant que Joueur, je veux que mes Commentaires soient reconnus, afin de ne pas me sentir pénalisé quand j'argumente.
3. En tant que Joueur, je veux voter sans voir le Tableau des Points pendant la Séance, afin de ne pas être influencé par le classement.
4. En tant que Joueur, je veux voir en fin de Séance les statistiques de participation, afin de savoir ce que la Séance a mobilisé de chacun.
5. En tant qu'Animateur, je veux choisir avant l'Ouverture de l'Étape 1 si la répartition des Votes s'affiche en direct, afin de déclencher la discussion orale quand c'est utile.
6. En tant qu'Animateur, je veux que la répartition, si elle est affichée, n'apparaisse qu'à partir de la moitié des votants, afin de ne pas orienter les premiers Votes.
7. En tant qu'Animateur, je veux voir le scoring et le Tableau à tout moment, même pendant la Séance, afin de piloter la discussion.
8. En tant qu'Animateur, je veux pouvoir publier les statistiques quand je le décide, afin de les garder pour la fin ou de les montrer plus tôt.
9. En tant qu'Animateur, je veux qu'une Question partagée (égalité) soit renvoyée à l'oral, afin que le désaccord soit discuté avant d'être tranché.
10. En tant qu'Animateur, je veux trancher une Question après une seule repose, afin de ne pas faire boucler la discussion.
11. En tant qu'Animateur, je veux pouvoir mettre une Question de côté et la noter dans le Récapitulatif, afin de garder une trace sans la trancher. **À confirmer** (Q14 de la Séance de brainstorm : 1-1, la recommandée a départagé).
12. En tant que Claude, je veux recevoir une Question partagée sans Proposition retenue, afin de la reposer avec les Commentaires comme matière.

### Numéros et références

13. En tant que Joueur, je veux que chaque Question ait un Numéro unique et continu sur toute la Séance, afin de m'y référer à l'oral sans ambiguïté.
14. En tant que Joueur, je veux qu'une Question reposée reçoive un nouveau Numéro et indique « reprise de Q4 », afin de faire le lien avec la Question d'origine.
15. En tant que Claude, je veux recevoir le Numéro de chaque Question dans les résultats d'une Étape, afin d'employer les mêmes Numéros que les Joueurs.
16. En tant que Joueur, je veux qu'une mention `Q4` dans le texte d'une Question ou d'une Proposition soit cliquable quand Q4 appartient à une Étape close, afin de retrouver ce qui a été décidé sans chercher.
17. En tant que Joueur, je veux que l'infobulle d'une référence affiche le titre de la Question, son issue (Proposition retenue ou « à reposer »), la répartition des Votes et mon propre Vote, afin de me rappeler le contexte.
18. En tant que Joueur sur téléphone, je veux ouvrir l'infobulle d'un toucher et la fermer d'un toucher ailleurs, afin de la lire sans survol.
19. En tant que Joueur, je veux qu'une mention d'une Question de l'Étape en cours, ou d'un Numéro qui n'existe pas, reste du texte brut, afin qu'aucun Vote ne soit révélé trop tôt.

### Ouverture des Étapes

20. En tant qu'Animateur, je veux que chaque Étape publiée par Claude, la première comprise, reste en attente jusqu'à ce que je l'ouvre, afin de laisser le temps de discuter les résultats avant de voter à nouveau.
21. En tant qu'Animateur, je veux un bouton « Ouvrir l'Étape N » visible quel que soit l'onglet affiché, afin de relancer le groupe sans chercher une commande.
22. En tant que Joueur, je veux lire « L'Animateur ouvrira l'Étape N » tant que l'Étape est en attente, afin de savoir que j'attends et que la page n'est pas figée.
23. En tant que Joueur, je veux garder les résultats de l'Étape close sous les yeux pendant l'attente, afin de les discuter à l'oral.
24. En tant que Joueur, je veux ne pas voir les Questions d'une Étape tant qu'elle n'est pas ouverte, afin que personne ne vote ni ne lise à l'avance, y compris par l'API.
25. En tant que Claude, je veux publier l'Étape suivante sans attendre l'Ouverture, et continuer à attendre la clôture avec le même long-poll, afin de ne pas modifier mon déroulé.

### Onglets et résultats

26. En tant que Joueur, je veux un onglet « Étape en cours », ouvert par défaut, afin de voter sans bruit.
27. En tant que Joueur, je veux un onglet « Résultats » qui liste toutes les Étapes closes, la plus récente en premier, afin de relire n'importe quelle décision, mon Vote et les Commentaires.
28. En tant que Joueur, je veux que « Règles » et « Tableau des scores » restent des boutons d'en-tête, afin de les ouvrir sans quitter mon onglet.
29. En tant qu'Animateur, je veux un onglet « Animateur » qui ne s'ouvre que depuis le lien avec jeton, afin que les Joueurs ne voient pas de commandes qu'ils ne peuvent pas utiliser.
30. En tant qu'Animateur, je veux que la zone de clôture collante reste visible au-dessus des onglets, afin de clore sans changer d'onglet.
31. En tant qu'Animateur, je veux retrouver dans mon onglet la ligne « Prochaine action », le Prompt initial, l'accès Joueurs (URL et QR code), le Tableau, les statistiques et le réglage de la répartition, afin de piloter la Séance depuis un seul endroit.
32. En tant qu'Animateur, je veux rejoindre la Séance avec un pseudo et voter comme un Joueur, afin de participer au grilling.

### Prompt initial

33. En tant que Joueur, je veux lire le Prompt initial avant le lancement de la Séance, afin de savoir de quoi on va parler.
34. En tant qu'Animateur, je veux modifier le Prompt initial depuis mon onglet jusqu'à l'Ouverture de l'Étape 1, et que les Joueurs voient la version à jour, afin de le corriger avant de commencer.
35. En tant que Joueur, je veux que le Prompt initial disparaisse de mon écran après l'Ouverture de l'Étape 1, afin de ne pas être distrait par un texte devenu inutile.
36. En tant qu'Animateur, je veux relire le Prompt initial après le lancement, en lecture seule, afin de garder le contexte sans pouvoir le changer par erreur.
37. En tant qu'Animateur, je veux que le serveur refuse toute modification du Prompt initial après le lancement, y compris venant de Claude, afin que le contexte de départ reste fiable.

### Commentaires

38. En tant que Joueur, je veux que mon Commentaire s'enregistre tout seul environ une seconde après ma dernière frappe, afin de ne pas le perdre en oubliant de quitter le champ.
39. En tant que Joueur, je veux qu'il s'enregistre aussi quand je quitte le champ, change d'application ou ferme la page, afin qu'aucune saisie ne reste en suspens.
40. En tant que Joueur, je veux voir « ✓ Enregistré » ou « Modifications non enregistrées » à côté du champ, afin de connaître l'état de mon texte.
41. En tant que Joueur dont l'Étape a été close avant l'envoi, je veux que mon texte reste affiché avec le message « Étape close avant l'envoi : copiez votre texte », afin de ne pas le perdre en silence.

### Co-animateur

42. En tant qu'Animateur, je veux désigner un ou plusieurs Joueurs comme Co-animateurs depuis une liste de mon onglet, afin que la Séance continue si je m'absente.
43. En tant qu'Animateur, je veux révoquer un Co-animateur à tout moment, afin de reprendre seul le pilotage.
44. En tant que Co-animateur, je veux ouvrir et clore les Étapes, départager les ex æquo et reposer des Questions, afin de faire avancer la Séance à la place de l'Animateur.
45. En tant que Co-animateur, je veux voir le Tableau et les statistiques, afin de piloter la discussion.
46. En tant qu'Animateur, je veux que le Co-animateur ne puisse pas modifier le Prompt initial, régler la répartition, publier les statistiques ni désigner d'autres Co-animateurs, afin de garder la maîtrise du cadre.
47. En tant qu'Animateur, je veux qu'une clôture ou une Ouverture déjà faite par quelqu'un d'autre soit refusée sans effet, afin que nos deux pages ne se contredisent pas.
48. En tant qu'Animateur, je veux que les Co-animateurs restent désignés après un redémarrage du serveur, afin de ne pas les redésigner.
49. En tant qu'Animateur, je veux voir un avertissement à la désignation d'un Co-animateur, afin de savoir que quiconque reprend son pseudo obtient ses droits.

## Implementation Decisions

### Scoring

- **Abstention générale.** Si personne ne vote, la recommandée est retenue (spec UX, story 9), sans Point.
- **Bonus supprimé.** Seul le Point reste, attribué à chaque Joueur dont le Vote porte sur la Proposition retenue. Les Abstentions ne rapportent rien.
- **Commentaires.** Ils ne rapportent des Points que sur les Questions reposées. Le montant n'a pas été tranché (un Point par Commentaire, ou autre) : **à confirmer**.
- **Scoring publié en fin de Séance** sous forme de statistiques de participation : Votes, Commentaires et Abstentions par Joueur. Le Points dérivé de ces statistiques est **à confirmer**.
- **Publication.** Les statistiques sont visibles de l'Animateur et des Co-animateurs à tout moment. Elles sont publiées à tous à la fin de la Séance, ou plus tôt à la demande de l'Animateur seul.

### Visibilité

- **Tableau** : masqué des Joueurs pendant la Séance, visible de l'Animateur et des Co-animateurs. Il est publié avec les statistiques.
- **Répartition des Votes** : masquée par défaut. L'Animateur seul peut l'activer, depuis son onglet, jusqu'à l'Ouverture de l'Étape 1 ; l'option est portée par la Séance et n'est plus un paramètre du démarrage envoyé par Claude. Quand elle est activée, la répartition n'apparaît qu'à partir de la moitié des votants.

### Clôture et égalité

- **Partage.** Une Question sans majorité nette (égalité entre Propositions) n'est pas tranchée par la recommandée : elle est renvoyée à l'oral, c'est-à-dire reposée avec ses Commentaires. Le module Arbitrage distingue ce cas du cas « un seul en tête », qui reste retenu sans intervention.
- **Repose.** Après une seule repose, l'Animateur tranche la Question à la clôture suivante, avec les Propositions de l'Étape courante.
- **Mise de côté** (Q14) : l'Animateur peut noter une Question dans le Récapitulatif sans la trancher. **À confirmer**.

### Numéro des Questions

- Le serveur attribue le Numéro à la publication de l'Étape, de façon continue sur la Séance dans l'ordre de publication. Il est exposé dans la vue des Joueurs et dans les résultats renvoyés à Claude.
- Une Question reposée est publiée avec un nouvel identifiant et reçoit un nouveau Numéro. Pour afficher « reprise de Qn », Claude indique à la publication l'identifiant de la Question qu'elle reprend ; le serveur en déduit le Numéro d'origine. **À confirmer** (champ optionnel de la Question publiée).
- Le Récapitulatif utilise les Numéros.

### Cycle de vie d'une Étape

- Une Étape a trois états : **en attente** (publiée, non ouverte), **ouverte**, **close**. Le seul passage de « en attente » à « ouverte » est l'Ouverture par l'Animateur ou un Co-animateur, y compris pour l'Étape 1. Une Ouverture sur une Étape déjà ouverte ou close est refusée (409) sans effet.
- Claude publie sans attendre l'Ouverture, et une Étape ne peut être publiée tant que la précédente n'est pas close. Le long-poll de résultat répond comme aujourd'hui à la clôture : le skill n'a pas d'autre attente à gérer.
- Tant qu'une Étape est en attente, la vue d'un Joueur ne contient ni ses Questions ni leurs Propositions ; elle contient seulement son numéro et les résultats des Étapes closes. Un Vote ou un Commentaire sur une Étape en attente est refusé (409).
- Les Séances déjà sauvegardées, qui portent un état ouvert/clos, sont relues sans perte.
- Les messages déduits de l'état (« Prochaine action », « Claude prépare la suite ») gagnent un état : après une clôture, « Claude prépare la suite » ; Étape publiée mais non ouverte, « Ouvrir l'Étape N ».

### Prompt initial

- Le Prompt initial est fourni au démarrage de la Séance et modifiable par l'Animateur. La **première Ouverture** (Étape 1) le verrouille : toute modification est ensuite refusée (409), par l'Animateur comme par Claude.
- Avant ce verrou, la vue de tout Joueur contient le prompt. Après, elle ne le contient plus, sauf pour l'Animateur authentifié, qui le reçoit toujours, en lecture seule.

### Onglets de la page

- Onglets **Étape en cours** (par défaut), **Résultats** et **Animateur** (lien avec jeton uniquement). Les boutons « Règles » et « Tableau des scores » restent dans l'en-tête.
- **Résultats** liste toutes les Étapes closes, la plus récente d'abord : Numéro et titre de chaque Question, répartition, Proposition retenue, Vote du Joueur, Commentaires. La vue des Joueurs porte donc les résultats de toutes les Étapes closes, pas seulement de la précédente ; la notion d'« Étape précédente » disparaît.
- **Animateur** contient : la ligne « Prochaine action » ; le Prompt initial (éditable avant le lancement, en lecture seule ensuite) ; l'accès Joueurs (URL et QR code) ; le Tableau et les statistiques avec le bouton « Publier les statistiques » ; la case « Afficher la répartition en direct » (jusqu'à l'Ouverture de l'Étape 1) ; la liste des Joueurs pour désigner ou révoquer des Co-animateurs.
- La **zone de clôture collante** reste au-dessus des onglets, quel que soit l'onglet actif, et porte aussi le bouton d'Ouverture. Un Co-animateur y a accès.
- L'Animateur est aussi un Joueur : il rejoint avec un pseudo, vote et compte dans les votants et dans le Tableau.

### Commentaires

- L'enregistrement se déclenche environ une seconde après la dernière frappe, à la perte du focus, et quand la page passe en arrière-plan ou se ferme. L'indicateur « ✓ Enregistré » / « Modifications non enregistrées » est conservé.
- Si le serveur refuse l'envoi parce que l'Étape est close, le texte reste dans le champ avec le message « Étape close avant l'envoi : copiez votre texte ».

### Références entre Questions

- La page détecte les mentions `Qn` dans le corps des Questions et les libellés des Propositions. Elle les rend cliquables quand `n` est le Numéro d'une Question d'une Étape close ; sinon le texte reste brut. Le skill n'a rien à changer.
- L'infobulle affiche le titre, l'issue (Proposition retenue ou « à reposer »), la répartition des Votes et le Vote du Joueur. Pour une Question reposée, le Numéro courant indique « reprise de Qn ». Elle s'ouvre au survol ou au toucher et se ferme au toucher ailleurs. Elle n'expose rien de plus que l'onglet Résultats.

### Co-animateur

- L'Animateur désigne et révoque des Co-animateurs, sans limite de nombre. Cette désignation est portée par la Séance et sauvegardée avec elle.
- Les Co-animateurs sont identifiés par l'identité de Joueur envoyée par leur page ; l'Animateur et Claude restent identifiés par le jeton.
- **Droits du Co-animateur** : ouvrir et clore les Étapes (départager les ex æquo, reposer des Questions) ; voir le Tableau et les statistiques. Il ne peut pas : modifier le Prompt initial, régler la répartition, publier les statistiques, désigner ou révoquer. Il n'a pas accès au QR code. Ces actions interdites sont refusées (403).
- L'Animateur garde tous ses droits en même temps que les Co-animateurs ; deux Ouvertures ou deux clôtures simultanées donnent un seul effet et un refus (409) pour la seconde.
- **Reprise de pseudo.** La reprise n'exige toujours aucun secret : quelqu'un qui reprend le pseudo d'un Co-animateur obtient ses droits. Ce risque est accepté (groupe de confiance) et reste suivi dans `improvements.md` ; le correctif devra protéger aussi ce droit. L'onglet Animateur affiche un avertissement à la désignation.

### Modules et interfaces modifiés

- **Arbitrage** (pur) : `trancher` renvoie `a_reposer` (ou un statut équivalent) pour une égalité, au lieu de retenir la recommandée. `gains` ne calcule plus de Bonus.
- **Séance** : état d'Étape à trois valeurs ; Numéros ; Ouverture ; verrou du prompt ; liste des Co-animateurs ; option de répartition. La vue d'un Joueur ne contient plus le Tableau pendant la Séance (statistiques après la fin ou publication), masque les Questions d'une Étape en attente, expose les résultats de toutes les Étapes closes, et masque le prompt après le verrou. Les vues de l'Animateur et des Co-animateurs ajoutent ce qui leur est réservé.
- **API HTTP** : nouvelle Ouverture d'une Étape (jeton ou Co-animateur) ; clôture ouverte aux Co-animateurs ; désignation et révocation des Co-animateurs (jeton seul) ; réglage de la répartition (jeton seul, avant la première Ouverture) ; modification du prompt (jeton seul, avant la première Ouverture) ; l'option de répartition quitte le démarrage de Séance ; publication d'une Question avec l'identifiant de la Question reprise ; la fin de Séance renvoie les statistiques en plus du Récapitulatif.
- **Page** : onglets, bouton d'Ouverture dans la zone collante, auto-enregistrement, infobulles de référence, liste des Co-animateurs.
- **Skill** : mentionner les Numéros des Questions dans le dialogue avec le groupe, indiquer l'identifiant de la Question reposée à la publication, et ne plus annoncer un prompt visible pendant toute la Séance.
- **Schéma de stockage** : état d'Étape, Numéros, Co-animateurs, option de répartition et statistiques dérivées s'ajoutent ; les Séances sauvegardées avant ce changement restent lisibles.

## Testing Decisions

Un bon test vérifie le comportement observable par un Joueur, un Co-animateur ou l'Animateur, pas la structure du code.

- **Seam principal : l'API HTTP** (`test/api.test.js`), avec un serveur sur port libre, un dossier temporaire et un jeton imposé. Chaque règle se teste par les requêtes d'un Joueur, d'un Co-animateur et de l'Animateur :
  - égalité renvoyée à l'oral, repose, tranche à la clôture suivante, Tableau caché pendant la Séance, statistiques à la fin ;
  - Numéros continus d'une Étape à l'autre, nouveau Numéro pour une Question reposée et indication de la Question reprise ;
  - Ouverture : Questions absentes de la vue d'un Joueur tant que l'Étape est en attente, Vote refusé (409), Ouverture refusée sur une Étape ouverte ou close, long-poll de résultat inchangé ;
  - prompt : visible des Joueurs avant la première Ouverture, absent après sauf pour l'Animateur, modification refusée (409) après, y compris avec le jeton ;
  - résultats : la vue contient les Étapes closes, la plus récente d'abord, avec le Vote du Joueur ;
  - Co-animateur : désignation et révocation (jeton seul, refusées sinon), droits d'Ouverture et de clôture acceptés pour un Co-animateur désigné et refusés (403) pour un Joueur ordinaire, actions réservées refusées (403) au Co-animateur, désignation conservée après rechargement de la Séance ;
  - répartition en direct : désactivée par défaut, réglable avant la première Ouverture, seuil de la moitié des votants.
- **Seam secondaire : le module pur Arbitrage** (`test/arbitrage.test.js`) pour `trancher` et `gains`, sans E/S : l'égalité et la suppression du Bonus.
- **Ce qu'il ne faut pas tester** : l'ordre interne des champs, ni le rendu exact de la page.
- **La page n'a pas de test automatisé** (JavaScript natif, sans infrastructure de test, comme dans la spec UX). Elle se vérifie à la main, avec une checklist suivant les user stories : onglets, bouton d'Ouverture visible quel que soit l'onglet, attente d'Ouverture, prompt avant et après le lancement, auto-enregistrement des Commentaires (dont la clôture pendant la saisie), infobulles de référence (survol et toucher), liste des Co-animateurs, affichage sur téléphone.
- **Prior art** : `test/api.test.js` (helpers `claude`, `animateur`, `rejoindre`), `test/arbitrage.test.js`.

## Out of Scope

- Le secret de la reprise de pseudo (`improvements.md`), même s'il protège désormais aussi le droit de Co-animateur.
- L'ETag du relevé périodique (`improvements.md`).
- La mise en forme du Récapitulatif (contenu inchangé en dehors des statistiques, des Numéros et des partages).
- Le transfert du rôle d'Animateur (jeton) à un autre Joueur, et la notification d'un Co-animateur désigné.
- Un message « Claude réfléchit » envoyé par le skill.
- Les tests automatisés de la page (navigateur ou module de vues).

## Further Notes

- Q14 de la Séance de brainstorm est contestée (1-1, la recommandée a départagé, aucun Commentaire du Joueur qui a voté C). Elle doit être discutée à l'oral avant implémentation ; les tâches liées à la mise de côté restent **à confirmer** tant que ce n'est pas fait.
- Les décisions Q5, Q7 et Q9 de la Séance de brainstorm ont été tranchées par la recommandée sur des répartitions 1-1. Elles sont remplacées par Q8, Q10 et Q11, qui ont été retenues à l'unanimité. Ne pas les reprendre.
- Le Récapitulatif de la Séance, généré par le serveur, affiche Q5, Q7, Q9 et Q14 comme « recommandée », ce qui masque les partages. Une correction de ce rendu fait partie de la spec : tout partage doit y figurer.
- Cette spec remplace, dans la spec UX (`docs/specs/grill-arena-ux.md`), les passages sur le message d'état « Claude prépare la suite », l'enregistrement du Commentaire à la sortie du champ et les Règles qui mentionnent le Bonus. À l'implémentation, mettre aussi à jour le README et la spec initiale (`docs/specs/grill-arena.md`) là où ils décrivent le Bonus, le prompt affiché pendant toute la Séance et la clôture sans Ouverture.
