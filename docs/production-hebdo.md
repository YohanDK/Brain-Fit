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

Varier les thèmes de l'appli (histoire, sciences, philosophie, économie, politique, lettres, sport, nature). Ton sobre, français soigné, aucune question qui prenne parti en politique.

## Étapes

1. **Lire** l'en-tête de `public/banques.js` (les règles d'ajout) et les dix dernières questions de chaque banque, pour éviter les redites.
2. **Rédiger** chaque question avec `id` (le suivant, jamais réutilisé), `niv`, `src` (auteur et année, ou référence précise) et `vu` (la date du jour). Toujours à la fin des listes.
3. **Vérifier chaque fait** auprès d'une source primaire ou de référence (article, ouvrage, institution), pas d'un résumé. Une date, un chiffre ou une citation sans source sûre : on retire la question.
4. **Résoudre à l'aveugle** : un agent séparé reçoit seulement les énoncés (sans réponse ni explication) et les résout. Toute question où sa réponse diffère de la nôtre, ou où il trouve une seconde réponse défendable, est corrigée ou retirée.
5. **Lancer** `node tools/verifier-banques.js` : il doit finir par « Tout est en ordre ».
6. **Ouvrir une pull request** intitulée « Exercices de la semaine du JJ mois », avec un tableau : banque, id, énoncé en une ligne, réponse, source. Signaler en tête ce qui a été écarté à l'étape 4 et pourquoi.
7. **Ne jamais fusionner** : Yohan relit et fusionne lui-même.

## Les signalements

Les signalements « Je conteste » sont dans Supabase (table `signalements`), que la session ne peut pas lire. Quand Yohan en colle un export dans le fil, la session les traite dans le même lot : la question est corrigée (même `id`) ou marquée `retire:true`, et la PR le dit.
