# Production hebdomadaire des exercices

Chaque semaine, une session Claude ajoute un lot de questions nouvelles à `public/banques.js` et les propose dans une pull request. Rien n'est mis en ligne tant que Yohan n'a pas fusionné.

## Le lot de la semaine

Par défaut, dix questions :

| Banque | Nombre | Remarque |
|---|---|---|
| `problemes` | 3 | un par niveau si possible ; un problème où l'intuition se trompe |
| `sophismes` | 2 | dont un « Argument valable » une semaine sur deux |
| `erreursIA` | 2 | une erreur de fait, une erreur de raisonnement ou de calcul |
| `ortho` | 2 | les fautes fréquentes, jamais une règle discutée entre grammairiens |
| `textes` ou `graphiques` | 1 | en alternance d'une semaine à l'autre |
| `enquetes` | 1 | l'énigme du dimanche d'après le suivant (voir plus bas) |

Varier les thèmes de l'appli (histoire, sciences, philosophie, économie, politique, lettres, sport, nature). Ton sobre, français soigné, aucune question qui prenne parti en politique.

## Étapes

1. **Lire** l'en-tête de `public/banques.js` (les règles d'ajout) et les dix dernières questions de chaque banque, pour éviter les redites.
2. **Rédiger** chaque question avec `id` (le suivant, jamais réutilisé), `niv`, `src` (auteur et année, ou référence précise) et `vu` (la date du jour). Toujours à la fin des listes.
3. **Vérifier chaque fait** auprès d'une source primaire ou de référence (article, ouvrage, institution), pas d'un résumé. Une date, un chiffre ou une citation sans source sûre : on retire la question. Pour les chiffres (estimations, graphiques), partir des séries officielles de `tools/donnees/series/` (INSEE, Eurostat, Banque mondiale, Our World in Data) : citer le jeu dans `src`, et marquer `reel:true` un graphique tiré de vraies données. Pour une nouvelle série, l'ajouter à `tools/donnees/sources.json` : l'action « Importer les données » la récupère. Pour un texte ou une dictée, partir de `tools/wikisource/textes/`.
4. **Résoudre à l'aveugle** : un agent séparé reçoit seulement les énoncés (sans réponse ni explication) et les résout. Toute question où sa réponse diffère de la nôtre, ou où il trouve une seconde réponse défendable, est corrigée ou retirée.
5. **Lancer** `node tools/verifier-banques.js` : il doit finir par « Tout est en ordre ».
6. **Ouvrir une pull request** intitulée « Exercices de la semaine du JJ mois », avec un tableau : banque, id, énoncé en une ligne, réponse, source. Signaler en tête ce qui a été écarté à l'étape 4 et pourquoi.
7. **Ne jamais fusionner** : Yohan relit et fusionne lui-même.

## L'énigme du dimanche

Une par semaine, dans `B.enquetes`, datée du dimanche **d'après le suivant** (le lot du samedi 7 novembre écrit celle du 22), pour que Yohan ait le temps de relire. Un récit, une question, 3 ou 4 options (« On ne peut pas savoir » est un bon piège), cinq indices, la solution rédigée et une leçon d'une phrase.

1. Écrire d'abord le **modèle** dans `tools/enquetes/modeles.js` : l'espace de tous les cas, un prédicat par indice, la réponse d'un cas.
2. `node tools/enquetes/modeles.js` affiche, après chaque indice, combien de réponses restent possibles. Viser : plusieurs au premier indice, une seule au troisième ou au quatrième, le cinquième confirme. Une énigme qui ne se résout qu'au cinquième indice ne récompense personne.
3. Le vérificateur refuse une énigme sans modèle, dont la réponse n'est pas unique ou ne correspond pas à l'option « bonne », ou un dimanche de parcours sans énigme.
4. Varier les familles : qui était où (grille), sincères et menteurs, cadenas à chiffres, ordre de passage, boucles (qui écrit à qui).

## Les parcours de saison

`B.parcours` : l'Avent 2026 (29 novembre-24 décembre, dimanches compris) est en place. Le Carême 2027 (10 février-27 mars, `dimanches:false` : 40 jours sans les dimanches, l'énigme y tient lieu de case) s'écrit en janvier sur le même modèle, avec six énigmes pour les dimanches du 14 février au 21 mars. Pour relire un parcours avant sa date : `?apercu=AAAA-MM-JJ` (rien n'est enregistré).

## Les signalements

Les signalements « Je conteste » sont dans Supabase (table `signalements`), que la session ne peut pas lire. Quand Yohan en colle un export dans le fil, la session les traite dans le même lot : la question est corrigée (même `id`) ou marquée `retire:true`, et la PR le dit.
