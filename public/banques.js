/* Néophyte : les banques d'exercices de raisonnement et de langue.

   Un fichier à part pour que chaque ajout se relise d'un coup d'œil. Règles pour ajouter des questions :
   - toujours à la FIN d'une liste : l'appli retient les questions vues par leur position ;
   - un id unique et définitif (p43, s47…), jamais réutilisé, même si la question est retirée ;
   - niv : 1 facile, 2 moyen, 3 difficile ;
   - src : d'où vient la question ou le chiffre (auteur, année), obligatoire pour toute nouvelle question ;
   - vu : date de la dernière vérification (AAAA-MM-JJ), obligatoire pour toute nouvelle question ;
   - une seule réponse défendable ; on écrit dans l'énoncé toute hypothèse dont la réponse dépend.
   Pour retirer une question, on la marque retire:true au lieu de l'effacer.
   Avant de publier : node tools/verifier-banques.js (le site ne se publie pas si la vérification échoue). */
(function(root){
"use strict";
const B={};

// Problème du jour : énoncé, réponse, explication, indice
B.problemes=[
  {id:'p01',niv:1,src:"Frederick, 2005 (test de réflexion cognitive)",q:"Une raquette et une balle coûtent 1,10 € au total. La raquette coûte 1 € de plus que la balle. Combien coûte la balle ?",r:"0,05 €",expl:"Si la balle coûtait 0,10 €, la raquette coûterait 1,10 € et le total 1,20 €. Avec x pour la balle : x + (x + 1) = 1,10, donc x = 0,05 €. La réponse intuitive (0,10 €) est fausse.",indice:"Si la balle coûtait 0,10 €, combien coûterait la raquette, et le total ?"},
  {id:'p02',niv:1,src:"Frederick, 2005 (test de réflexion cognitive)",q:"5 machines fabriquent 5 objets en 5 minutes. Combien de temps faut-il à 100 machines pour fabriquer 100 objets ?",r:"5 minutes",expl:"Chaque machine fait 1 objet en 5 minutes. 100 machines font donc 100 objets en 5 minutes.",indice:"Combien de temps faut-il à une seule machine pour fabriquer un objet ?"},
  {id:'p03',niv:1,src:"Frederick, 2005 (test de réflexion cognitive)",q:"Une tache de nénuphars double de surface chaque jour. Il lui faut 48 jours pour couvrir le lac. En combien de jours en couvre-t-elle la moitié ?",r:"47 jours",expl:"Puisqu'elle double chaque jour, la veille du 48e jour elle couvrait la moitié du lac.",indice:"Que s'est-il passé la veille du jour où le lac est entièrement couvert ?"},
  {id:'p04',niv:2,src:"Wason, 1966 (tâche de sélection)",q:"Quatre cartes montrent : A, K, 4, 7. Règle : « si une carte a une voyelle d'un côté, elle a un nombre pair de l'autre ». Quelles cartes faut-il retourner, au minimum, pour vérifier la règle ?",r:"A et 7",expl:"A : il faut vérifier qu'il y a un nombre pair derrière. 7 : s'il y avait une voyelle derrière, la règle serait fausse. Le 4 ne prouve rien (la règle ne dit pas que les pairs ont une voyelle), K non plus.",indice:"Pour chaque carte, demande-toi si ce qu'il y a derrière pourrait contredire la règle."},
  {id:'p05',niv:3,src:"Casscells, Schoenberger et Graboys, 1978",q:"Une maladie touche 1 personne sur 1 000. Tu fais un test de dépistage sans raison particulière. Le test détecte toujours la maladie chez les malades, mais donne 5 % de faux positifs chez les personnes saines. Ton test est positif. Quelle est la probabilité que tu sois malade ?",r:"Environ 2 %",expl:"Sur 1 000 personnes : 1 malade testé positif, et 5 % des 999 saines, soit environ 50 faux positifs. 1 vrai positif sur 51 positifs ≈ 2 %. C'est l'oubli du taux de base.",indice:"Imagine 1 000 personnes testées : combien de vrais malades, combien de faux positifs ?"},
  {id:'p06',niv:2,q:"Combien de fois écrit-on le chiffre 9 en écrivant tous les nombres de 1 à 100 ?",r:"20 fois",expl:"10 fois en chiffre des unités (9, 19… 99) et 10 fois en chiffre des dizaines (90 à 99). 99 compte deux fois.",indice:"Compte à part les 9 en position des unités et ceux en position des dizaines."},
  {id:'p07',niv:1,q:"Un escargot est au fond d'un puits de 10 m. Chaque jour il monte de 3 m, chaque nuit il glisse de 2 m. En combien de jours sort-il ?",r:"8 jours",expl:"Il gagne 1 m par jour et nuit. Au matin du 8e jour il est à 7 m, il monte de 3 m dans la journée et sort sans glisser.",indice:"Attention au dernier jour : une fois sorti, il ne glisse plus."},
  {id:'p08',niv:2,q:"Un nombre de 3 chiffres a pour chiffre des centaines le double de celui des unités, et la somme de ses chiffres vaut 13. Son chiffre des dizaines est 7. Quel est ce nombre ?",r:"472",expl:"c = 2u et c + 7 + u = 13, donc 3u = 6 : u = 2 et c = 4. Le nombre est 472.",indice:"Écris c = 2u, puis utilise la somme des chiffres."},
  {id:'p09',niv:1,q:"Dans un tiroir sombre, il y a 10 chaussettes noires et 10 blanches. Combien faut-il en prendre, au minimum, pour être sûr d'avoir une paire de la même couleur ?",r:"3",expl:"Avec deux couleurs, la troisième chaussette forme forcément une paire avec l'une des deux premières.",indice:"Avec deux couleurs seulement, combien de chaussettes peuvent être toutes de couleurs différentes ?"},
  {id:'p10',niv:2,q:"Tous les chercheurs de ce labo sont des biologistes. Certains biologistes sont musiciens. Peut-on conclure que certains chercheurs du labo sont musiciens ?",r:"Non",expl:"Les biologistes musiciens peuvent tous être hors du labo. La conclusion n'est pas garantie par les prémisses.",indice:"Dessine les ensembles : les biologistes musiciens sont-ils forcément dans le labo ?"},
  {id:'p11',niv:2,q:"Un prix augmente de 20 %, puis baisse de 20 %. Par rapport au prix de départ, est-il plus haut, plus bas ou identique ?",r:"Plus bas de 4 %",expl:"100 → 120 → 120 × 0,8 = 96. La baisse s'applique sur une base plus grande.",indice:"Pars de 100 € et fais les deux calculs l'un après l'autre."},
  {id:'p12',niv:3,src:"Gardner, 1959 ; Bar-Hillel et Falk, 1982",q:"On interroge au hasard des familles de deux enfants, et l'on ne garde que celles qui répondent oui à la question « Avez-vous au moins une fille ? ». Parmi elles, quelle part a deux filles ?",r:"1 sur 3",expl:"Les familles de deux enfants se partagent à parts égales entre FF, FG, GF et GG. La question écarte GG : il reste FF, FG et GF, dont une seule sur trois a deux filles. Attention : si l'on apprenait l'existence d'une fille autrement, par exemple en croisant un père avec l'une de ses filles, la réponse serait 1 sur 2. La façon dont on obtient l'information compte.",indice:"Écris les quatre familles possibles, puis garde celles qui ont au moins une fille."},
  {id:'p13',niv:1,q:"Dans une course, tu doubles le deuxième. À quelle place es-tu ?",r:"Deuxième",expl:"Tu prends sa place : il passe troisième et toi deuxième. La réponse intuitive, « premier », est fausse.",indice:"Si tu doubles le deuxième, qui est encore devant toi ?"},
  {id:'p14',niv:1,q:"3 chats attrapent 3 souris en 3 minutes. Combien de chats faut-il pour attraper 100 souris en 100 minutes ?",r:"3 chats",expl:"À eux trois, ils attrapent 1 souris par minute, donc 100 souris en 100 minutes. Même piège que les machines.",indice:"Combien de souris les trois chats attrapent-ils ensemble en une minute ?"},
  {id:'p15',niv:1,q:"Marie a 4 sœurs, et chacune de ces filles a exactement un frère. Combien d'enfants ont leurs parents ?",r:"6",expl:"5 filles (Marie et ses 4 sœurs) et un seul garçon, frère de toutes. L'intuition compte un frère par fille.",indice:"Le frère de Marie est-il aussi le frère de ses sœurs ?"},
  {id:'p16',niv:1,q:"Un livre coûte 10 € plus la moitié de son prix. Combien coûte-t-il ?",r:"20 €",expl:"Si le prix est p, alors p = 10 + p/2, donc p/2 = 10 et p = 20 €. La réponse intuitive (15 €) prend la moitié de 10 au lieu de la moitié du prix.",indice:"Appelle p le prix et écris l'équation."},
  {id:'p17',niv:3,src:"Selvin, 1975 ; vos Savant, 1990",q:"Jeu télévisé : trois portes, une voiture derrière l'une, une chèvre derrière chacune des deux autres. Règle du jeu : après ton choix, l'animateur, qui sait où est la voiture, ouvre toujours l'une des deux autres portes, jamais celle de la voiture, puis te propose toujours de changer. Tu as choisi la porte 1, il ouvre la porte 3 : une chèvre. As-tu intérêt à passer à la porte 2 ?",r:"Oui : 2 chances sur 3",expl:"Ton premier choix avait 1 chance sur 3 d'être bon, et l'animateur n'y change rien puisqu'il ouvre toujours une porte perdante. Les 2 chances sur 3 restantes se reportent sur la porte 2. C'est la règle du jeu qui fait tout : si l'animateur ouvrait une porte au hasard, ou seulement quand tu as gagné, la réponse changerait. C'est le problème de Monty Hall.",indice:"Imagine 100 portes : tu en choisis une, l'animateur ouvre 98 portes perdantes. Changes-tu ?"},
  {id:'p18',niv:1,q:"Un train part de Paris vers Lyon à 100 km/h. Au même moment, un autre part de Lyon vers Paris à 125 km/h. Quand ils se croisent, lequel est le plus près de Paris ?",r:"Aucun",expl:"Au moment où ils se croisent, ils sont au même endroit, donc à la même distance de Paris. Les vitesses ne servent qu'à distraire.",indice:"Où sont les deux trains au moment précis où ils se croisent ?"},
  {id:'p19',niv:2,q:"Aujourd'hui, un père a 36 ans et son fils 12. Dans combien d'années le père aura-t-il le double de l'âge de son fils ?",r:"Dans 12 ans",expl:"Avec x années : 36 + x = 2 × (12 + x), donc 36 + x = 24 + 2x et x = 12. Le père aura 48 ans, le fils 24.",indice:"Appelle x le nombre d'années et écris l'âge de chacun dans x ans."},
  {id:'p20',niv:2,q:"Tu fais l'aller Paris–Chartres (90 km) à 90 km/h et le retour à 45 km/h. Quelle est ta vitesse moyenne sur l'aller-retour ?",r:"60 km/h",expl:"L'aller prend 1 h, le retour 2 h : 180 km en 3 h, soit 60 km/h. La moyenne des deux vitesses (67,5 km/h) est fausse, car tu passes plus de temps à rouler lentement.",indice:"Calcule le temps de chaque trajet plutôt que la moyenne des vitesses."},
  {id:'p21',niv:2,q:"À une réunion de 8 personnes, chacun serre la main de tous les autres, une seule fois. Combien y a-t-il de poignées de main ?",r:"28",expl:"Chacun serre 7 mains : 8 × 7 = 56. Mais chaque poignée de main concerne deux personnes, donc 56 ÷ 2 = 28.",indice:"Chacun serre 7 mains, mais une poignée de main se fait à deux."},
  {id:'p22',niv:2,q:"Quel angle forment les aiguilles d'une horloge à 3 h 15 ?",r:"7,5 degrés",expl:"La grande aiguille est sur le 3, à 90°. Mais en un quart d'heure, la petite aiguille a avancé d'un quart de l'intervalle entre 3 et 4 (30° ÷ 4 = 7,5°). L'angle n'est donc pas nul.",indice:"En 15 minutes, l'aiguille des heures avance aussi."},
  {id:'p23',niv:3,src:"Tversky et Kahneman, 1982",q:"Dans une ville, 85 % des taxis sont verts et 15 % sont bleus. Un témoin, qui reconnaît correctement la couleur d'un taxi 8 fois sur 10 (qu'il soit bleu ou vert), affirme qu'un taxi bleu a causé un accident. Le taxi est-il plus probablement bleu ou vert ?",r:"Plus probablement vert (environ 59 %)",expl:"Sur 100 accidents : 15 taxis bleus, dont 12 reconnus bleus ; 85 verts, dont 17 pris à tort pour des bleus. Sur les 29 taxis « vus bleus », 17 sont verts. Le témoignage ne suffit pas à renverser la rareté des taxis bleus (Kahneman et Tversky).",indice:"Imagine 100 accidents : combien de taxis bleus seraient vus bleus, et combien de verts seraient pris pour des bleus ?"},
  {id:'p24',niv:2,src:"Tversky et Kahneman, 1983",q:"Linda a 31 ans, elle a étudié la philosophie et milité contre les discriminations. Qu'est-ce qui est le plus probable : (a) Linda est guichetière de banque ; (b) Linda est guichetière de banque et militante féministe ?",r:"(a)",expl:"Toutes les guichetières féministes sont des guichetières : (b) ne peut pas être plus probable que (a). La description pousse vers (b), c'est l'erreur de conjonction étudiée par Kahneman et Tversky.",indice:"Deux conditions réunies peuvent-elles être plus probables qu'une seule ?"},
  {id:'p25',niv:2,q:"S'il pleut, la route est mouillée. La route est mouillée. A-t-il plu ?",r:"Pas forcément",expl:"La route peut être mouillée pour une autre raison : arrosage, nettoyage, rosée. « Si A alors B » ne permet pas de remonter de B à A.",indice:"Cherche une autre raison pour laquelle la route pourrait être mouillée."},
  {id:'p26',niv:3,src:"Smullyan, 1978",q:"Sur une île, les chevaliers disent toujours la vérité et les fripons mentent toujours. A dit : « Nous sommes tous les deux des fripons. » Que sont A et B ?",r:"A est un fripon, B un chevalier",expl:"Si A était chevalier, sa phrase serait vraie et il serait fripon : impossible. A est donc fripon et sa phrase est fausse : ils ne sont pas tous les deux fripons, donc B est chevalier.",indice:"Suppose que A dit vrai : est-ce possible ?"},
  {id:'p27',niv:2,q:"Tu as 9 pièces identiques en apparence, dont une un peu plus lourde. Avec une balance à deux plateaux, combien de pesées faut-il au minimum pour être sûr de la trouver ?",r:"2 pesées",expl:"Fais trois tas de 3 et compare deux tas : le plus lourd contient la pièce, ou bien c'est le troisième en cas d'équilibre. Puis compare deux pièces de ce tas de la même façon.",indice:"Une pesée a trois issues possibles, pas deux."},
  {id:'p28',niv:2,q:"Un article passe de 80 € à 100 €. De combien de pourcents a-t-il augmenté ? S'il redescend ensuite de 100 € à 80 €, de combien de pourcents baisse-t-il ?",r:"+25 %, puis −20 %",expl:"20 € de plus sur 80 €, c'est 25 %. 20 € de moins sur 100 €, c'est 20 %. Le même écart ne donne pas le même pourcentage, car la base change.",indice:"Un pourcentage se calcule par rapport au prix de départ de chaque variation."},
  {id:'p29',niv:3,src:"Problème des anniversaires (von Mises, 1939)",q:"Combien faut-il de personnes dans une pièce pour qu'il y ait plus d'une chance sur deux que deux d'entre elles aient le même jour d'anniversaire ? (On suppose les naissances réparties également sur 365 jours.)",r:"23 personnes",expl:"Avec 23 personnes, il y a déjà 253 paires possibles. La probabilité que toutes les dates soient différentes tombe sous 50 %. L'intuition pense à 183 (la moitié de l'année), car elle compte les personnes au lieu des paires.",indice:"Compte les paires de personnes, pas les personnes."},
  {id:'p30',niv:3,q:"On entoure la Terre, à l'équateur, d'une corde bien tendue. On rallonge la corde d'un seul mètre et on la soulève partout de la même hauteur. Une souris peut-elle passer dessous ?",r:"Oui : la corde s'élève d'environ 16 cm",expl:"La circonférence vaut 2πr. Si elle augmente de 1 m, le rayon augmente de 1 ÷ 2π ≈ 0,16 m, quelle que soit la taille de la sphère.",indice:"La circonférence vaut 2πr : de combien varie r si la circonférence augmente de 1 m ?"},
  {id:'p31',niv:1,q:"Une pièce équilibrée vient de tomber cinq fois de suite sur pile. Quelle est la probabilité que le sixième lancer donne face ?",r:"1 sur 2",expl:"La pièce n'a pas de mémoire : chaque lancer est indépendant. Croire qu'une série « appelle » son contraire, c'est l'erreur du joueur.",indice:"La pièce se souvient-elle des lancers précédents ?"},
  {id:'p32',niv:2,q:"Alex, Bastien et Chloé ont chacun un animal : un chat, un chien, un poisson. Celui qui a le chien est plus âgé que Chloé. Alex est le plus jeune des trois. Bastien n'a pas de chat. Chloé est allergique aux poils. Qui a le poisson ?",r:"Chloé",expl:"Le maître du chien est plus âgé que Chloé : ce n'est ni Chloé, ni Alex, le plus jeune. C'est donc Bastien. Chloé, allergique aux poils, a le poisson, et Alex le chat.",indice:"Commence par le chien : qui peut être plus âgé que Chloé ?"},
  {id:'p33',niv:2,q:"Le produit de trois nombres entiers consécutifs vaut 210. Quels sont ces nombres ?",r:"5, 6 et 7",expl:"5 × 6 × 7 = 210. Le nombre du milieu est proche de la racine cubique de 210, un peu moins de 6.",indice:"Le nombre du milieu est proche de la racine cubique de 210."},
  {id:'p34',niv:1,q:"Une horloge sonne 6 coups en 5 secondes. Combien de temps lui faut-il pour sonner 12 coups ?",r:"11 secondes",expl:"6 coups font 5 intervalles, donc 1 seconde par intervalle. 12 coups font 11 intervalles : 11 secondes, et non 10.",indice:"Compte les intervalles entre les coups, pas les coups."},
  {id:'p35',niv:2,q:"Ta moyenne est de 12 sur 20 après 4 devoirs. Quelle note te faut-il au 5e devoir pour atteindre 13 de moyenne ?",r:"17",expl:"4 devoirs à 12 de moyenne font 48 points. Pour 13 de moyenne sur 5 devoirs, il en faut 65. 65 − 48 = 17.",indice:"Raisonne sur les totaux de points, pas sur les moyennes."},
  {id:'p36',niv:3,q:"On lance deux dés. Quelle est la probabilité d'obtenir au moins un six ?",r:"11 sur 36, environ 31 %",expl:"La probabilité de n'avoir aucun six est 5/6 × 5/6 = 25/36. Celle d'en avoir au moins un est donc 11/36. Additionner 1/6 + 1/6 compterait deux fois le double six.",indice:"Calcule d'abord la probabilité de n'avoir aucun six."},
  {id:'p37',niv:2,q:"Aucun reptile n'a de poils. Certains animaux de compagnie ont des poils. Peut-on conclure que certains animaux de compagnie ne sont pas des reptiles ?",r:"Oui",expl:"Les animaux de compagnie qui ont des poils ne peuvent pas être des reptiles. Il en existe : la conclusion est donc certaine.",indice:"Regarde seulement les animaux de compagnie qui ont des poils."},
  {id:'p38',niv:2,q:"Règle du club : « Tout invité qui a reçu un badge peut entrer. » Jean, un invité, ne peut pas entrer. Que peut-on conclure ?",r:"Jean n'a pas reçu de badge",expl:"Si Jean avait un badge, il pourrait entrer. Or il ne peut pas : il n'en a donc pas. C'est la contraposée, toujours valide.",indice:"Si Jean avait un badge, que se passerait-il ?"},
  {id:'p39',niv:2,src:"Wald, 1943",q:"Pendant la guerre, on étudie les avions revenus de mission : les impacts de balles sont concentrés sur les ailes et le fuselage, presque aucun sur les moteurs. Où faut-il ajouter du blindage ?",r:"Sur les moteurs, là où les avions revenus ne sont pas touchés",expl:"Les avions touchés aux moteurs ne sont pas revenus : ils manquent à l'échantillon. Le statisticien Abraham Wald l'a fait remarquer. C'est le biais du survivant.",indice:"Quels avions ne sont pas dans l'échantillon étudié ?"},
  {id:'p40',niv:2,src:"Kahneman, Système 1 / Système 2, 2011",q:"Un moniteur de vol remarque que les élèves félicités après un excellent atterrissage font souvent moins bien la fois suivante, et que ceux qu'il a grondés après un mauvais font mieux. Il en conclut que les compliments nuisent. A-t-il raison ?",r:"Non : c'est la régression vers la moyenne",expl:"Un atterrissage exceptionnel, bon ou mauvais, doit beaucoup au hasard. Le suivant a toutes les chances d'être plus ordinaire, compliment ou pas. Kahneman raconte cette histoire vécue.",indice:"Un atterrissage exceptionnel est-il la norme pour un élève ?"},
  {id:'p41',niv:2,q:"Combien y a-t-il de carrés, de toutes tailles, sur un échiquier de 8 × 8 cases ?",r:"204",expl:"64 carrés de 1 × 1, 49 de 2 × 2, 36 de 3 × 3, et ainsi de suite jusqu'à 1 carré de 8 × 8 : 64 + 49 + 36 + 25 + 16 + 9 + 4 + 1 = 204.",indice:"Compte les carrés de 1 × 1, puis de 2 × 2, et ainsi de suite."},
  {id:'p42',niv:2,src:"Gardner, 1959 ; Bar-Hillel et Falk, 1982",q:"Une famille a deux enfants, et l'aîné est une fille. Quelle est la probabilité que les deux soient des filles ?",r:"1 sur 2",expl:"Seul le cadet reste inconnu : fille ou garçon, à chances égales. Compare avec le problème des familles qui disent avoir « au moins une fille » : savoir laquelle des deux est une fille change tout.",indice:"Cette fois, tu sais lequel des deux enfants est une fille."}
];
// Sophismes : l'argument, son nom (ou « Argument valable »), l'explication
B.sophismes=[
  {id:'s01',niv:1,arg:"Tu veux réduire le budget de la défense ? Donc tu veux laisser le pays sans protection.",nom:"Homme de paille",expl:"On déforme la position adverse pour l'attaquer plus facilement. Réduire n'est pas supprimer."},
  {id:'s02',niv:1,arg:"Son étude sur le climat ne vaut rien : il a été condamné pour fraude fiscale.",nom:"Attaque personnelle",expl:"On s'en prend à la personne au lieu d'examiner l'étude elle-même."},
  {id:'s03',niv:1,arg:"Soit tu soutiens ce projet à 100 %, soit tu veux que l'entreprise échoue.",nom:"Faux dilemme",expl:"On présente deux options comme les seules possibles alors qu'il en existe d'autres."},
  {id:'s04',niv:1,arg:"Si on autorise le télétravail un jour par semaine, bientôt plus personne ne viendra au bureau.",nom:"Pente glissante",expl:"On affirme sans preuve qu'un petit pas mènera forcément à une conséquence extrême."},
  {id:'s05',niv:1,arg:"Des millions de personnes prennent ce complément alimentaire : il doit bien être efficace.",nom:"Appel à la popularité",expl:"Le nombre de partisans ne prouve pas qu'une idée est vraie."},
  {id:'s06',niv:1,arg:"Ce célèbre acteur affirme que ce régime guérit le diabète.",nom:"Fausse autorité",expl:"L'autorité invoquée n'a pas de compétence dans le domaine."},
  {id:'s07',niv:1,arg:"J'ai porté mon pull porte-bonheur et on a gagné : il nous porte chance.",nom:"Post hoc",expl:"Que B suive A ne prouve pas que A cause B."},
  {id:'s08',niv:1,arg:"Les deux Lyonnais que j'ai rencontrés étaient pressés : les Lyonnais sont toujours pressés.",nom:"Généralisation hâtive",expl:"On tire une règle générale de quelques cas seulement."},
  {id:'s09',niv:2,arg:"Ce livre dit vrai, puisqu'il est écrit dans ce livre qu'il ne ment jamais.",nom:"Raisonnement circulaire",expl:"La conclusion est déjà contenue dans la prémisse."},
  {id:'s10',niv:1,arg:"C'est 100 % naturel, donc forcément bon pour la santé.",nom:"Appel à la nature",expl:"Naturel ne veut pas dire sain : l'arsenic aussi est naturel."},
  {id:'s11',niv:2,arg:"Les villes qui ont le plus de pompiers ont le plus d'incendies. Les pompiers causent donc des incendies.",nom:"Corrélation n'est pas causalité",expl:"Un troisième facteur (la taille de la ville) explique les deux."},
  {id:'s12',niv:2,arg:"Plusieurs milliardaires ont arrêté leurs études : arrêter ses études aide à réussir.",nom:"Biais du survivant",expl:"On ne voit que ceux qui ont réussi, pas les nombreux qui ont arrêté sans succès."},
  {id:'s13',niv:1,arg:"Tu me dis d'arrêter de fumer, alors que tu fumais à mon âge !",nom:"Toi aussi",expl:"L'incohérence de l'interlocuteur ne rend pas son argument faux."},
  {id:'s14',niv:2,arg:"On a déjà investi 2 millions dans ce projet, on ne peut pas l'arrêter maintenant.",nom:"Coûts irrécupérables",expl:"L'argent déjà dépensé est perdu dans tous les cas : seule compte la suite."},
  {id:'s15',niv:2,arg:"Personne n'a jamais prouvé que ce remède ne marche pas, donc il marche.",nom:"Appel à l'ignorance",expl:"L'absence de preuve contraire ne constitue pas une preuve."},
  {id:'s16',niv:1,arg:"Il faut garder cette règle : on a toujours fait comme ça.",nom:"Appel à la tradition",expl:"L'ancienneté d'une pratique ne prouve pas qu'elle soit bonne."},
  {id:'s17',niv:1,arg:"Si cette loi passe, vos enfants ne seront plus en sécurité dans la rue.",nom:"Appel à la peur",expl:"On agite une menace pour emporter l'adhésion, sans montrer en quoi la loi produirait cet effet."},
  {id:'s18',niv:1,arg:"Je mérite la moyenne : j'ai eu une année très difficile.",nom:"Appel à la pitié",expl:"Susciter la compassion ne dit rien de la qualité du travail rendu."},
  {id:'s19',niv:2,arg:"As-tu enfin arrêté de tricher aux examens ?",nom:"Question piège",expl:"La question présuppose un fait non établi : répondre oui ou non revient à l'admettre."},
  {id:'s20',niv:2,arg:"Un employé, c'est comme un clou : il faut taper dessus pour qu'il avance.",nom:"Fausse analogie",expl:"Deux choses semblables sur un point ne le sont pas sur tout : un employé n'est pas un objet."},
  {id:'s21',niv:3,arg:"Les uns disent que la Terre est ronde, les autres qu'elle est plate : la vérité doit être entre les deux.",nom:"Juste milieu",expl:"Le compromis entre deux positions n'est pas forcément vrai : parfois, l'une des deux a simplement raison."},
  {id:'s22',niv:2,arg:"On me reproche la pollution de l'usine ? Parlons plutôt des emplois qu'elle a créés et du club de foot qu'elle finance.",nom:"Diversion",expl:"On détourne l'attention vers un autre sujet au lieu de répondre à la critique."},
  {id:'s23',niv:2,arg:"Prends la dernière version de ce logiciel : elle est forcément meilleure.",nom:"Appel à la nouveauté",expl:"Récent ne veut pas dire meilleur. C'est le pendant de l'appel à la tradition."},
  {id:'s24',niv:3,arg:"S'il a la grippe, il a de la fièvre. Or il a de la fièvre. Donc il a la grippe.",nom:"Affirmation du conséquent",expl:"La fièvre peut avoir bien d'autres causes. « Si A, alors B » et « B » ne permettent pas de conclure A."},
  {id:'s25',niv:3,arg:"Aucun vrai Breton ne met de sucre dans son cidre. Ton cousin breton en met ? Alors ce n'est pas un vrai Breton.",nom:"Vrai Écossais",expl:"On redéfinit le groupe après coup pour écarter le contre-exemple. L'affirmation devient impossible à réfuter, donc vide."},
  {id:'s26',niv:3,arg:"Cette voyante avait annoncé trois événements de l'année, et ils se sont produits ! (On oublie les quarante autres prédictions.)",nom:"Tireur d'élite texan",expl:"On ne retient, après coup, que les résultats qui collent, comme un tireur qui dessine la cible autour de ses impacts."},
  {id:'s27',niv:2,arg:"Quand mon candidat arrange la vérité, c'est de la stratégie. Quand le tien le fait, c'est un scandale.",nom:"Deux poids, deux mesures",expl:"On juge le même acte différemment selon qui le commet. Un critère honnête s'applique à tout le monde."},
  {id:'s28',niv:2,arg:"Je ne peux pas avoir raté cet examen : sinon je devrais redoubler, et c'est impensable.",nom:"Appel aux conséquences",expl:"Qu'une conclusion soit désagréable ne la rend pas fausse. Le résultat ne dépend pas de ce qu'il entraînerait."},
  {id:'s29',niv:3,arg:"Chaque joueur de cette équipe est excellent, donc l'équipe sera excellente.",nom:"Composition",expl:"Ce qui vaut pour chaque partie ne vaut pas forcément pour le tout : une équipe, c'est aussi un collectif."},
  {id:'s30',niv:3,arg:"Cette entreprise est très riche, donc chacun de ses employés est riche.",nom:"Division",expl:"Ce qui vaut pour le tout ne vaut pas forcément pour chacune de ses parties."},
  {id:'s31',niv:3,arg:"Un sandwich vaut mieux que rien. Or rien ne vaut le bonheur. Donc un sandwich vaut mieux que le bonheur.",nom:"Équivoque",expl:"Le mot « rien » change de sens en cours de route : le raisonnement joue sur les mots."},
  {id:'s32',niv:1,arg:"Je n'ai jamais attaché ma ceinture et je n'ai jamais eu d'accident. La ceinture ne sert à rien.",nom:"Généralisation hâtive",expl:"Un seul cas personnel ne dit rien d'un risque qui se mesure sur des millions de trajets."},
  {id:'s33',niv:1,arg:"Ce grand footballeur recommande ce placement financier : on peut y aller les yeux fermés.",nom:"Fausse autorité",expl:"Son talent sportif ne lui donne aucune compétence en finance."},
  {id:'s34',niv:1,arg:"Si on autorise le téléphone en récréation, les élèves l'utiliseront bientôt en classe, puis pendant les examens.",nom:"Pente glissante",expl:"On enchaîne des conséquences de plus en plus graves sans montrer pourquoi chaque étape suivrait la précédente."},
  {id:'s35',niv:1,arg:"Tous mes amis disent que ce film est un chef-d'œuvre, donc c'en est un.",nom:"Appel à la popularité",expl:"Le nombre de personnes qui pensent une chose ne la rend pas vraie."},
  {id:'s36',niv:1,arg:"Soit on interdit complètement les voitures en ville, soit on accepte de respirer un air pollué.",nom:"Faux dilemme",expl:"Il existe bien d'autres options : transports en commun, vélo, véhicules moins polluants, zones à circulation limitée."},
  {id:'s37',niv:1,arg:"Tu critiques mon analyse économique ? Tu n'as même pas fait d'études.",nom:"Attaque personnelle",expl:"On disqualifie la personne au lieu de répondre à l'argument."},
  {id:'s38',niv:1,arg:"Il faut garder cette coutume : on l'a toujours faite.",nom:"Appel à la tradition",expl:"L'ancienneté d'une pratique ne prouve ni qu'elle est bonne, ni qu'elle est mauvaise. Il faut d'autres raisons."},
  {id:'s39',niv:1,arg:"Ce shampoing est 100 % naturel, il ne peut donc pas provoquer d'allergie.",nom:"Appel à la nature",expl:"Naturel ne veut pas dire sans danger : bien des plantes sont allergisantes, voire toxiques."},
  {id:'s40',niv:2,arg:"Pourquoi as-tu arrêté de tricher aux examens ?",nom:"Question piège",expl:"La question suppose que tu trichais : quelle que soit ta réponse, tu l'admets."},
  {id:'s41',niv:2,src:'Néophyte, 2026',vu:'2026-10-30',arg:"Mon cardiologue me conseille de surveiller ma tension : je vais suivre son avis.",nom:"Argument valable",expl:"Un spécialiste qui parle de son domaine est une raison sérieuse de le croire, même si ce n'est pas une preuve absolue. La fausse autorité, c'est une autorité invoquée hors de son domaine."},
  {id:'s42',niv:3,src:'Néophyte, 2026',vu:'2026-10-30',arg:"Si l'on supprime le contrôle technique, davantage de voitures mal entretenues rouleront ; or les défauts de freinage causent des accidents. On peut donc s'attendre à plus d'accidents.",nom:"Argument valable",expl:"Chaque étape est justifiée et la conclusion reste prudente. La pente glissante, elle, enchaîne des conséquences de plus en plus graves sans montrer pourquoi chacune suivrait la précédente."},
  {id:'s43',niv:2,src:'Néophyte, 2026',vu:'2026-10-30',arg:"Ce candidat a été condamné pour détournement de fonds publics : je ne lui confierai pas le budget de la commune.",nom:"Argument valable",expl:"Juger la fiabilité d'une personne sur ses actes passés est légitime quand on lui confie une tâche. L'attaque personnelle, c'est rejeter un argument à cause de celui qui le défend."},
  {id:'s44',niv:2,src:'Néophyte, 2026',vu:'2026-10-30',arg:"Plusieurs grands essais randomisés, sur des dizaines de milliers de personnes, montrent que ce vaccin réduit les hospitalisations : il protège contre les formes graves.",nom:"Argument valable",expl:"Ce n'est pas le nombre de partisans qui convainc ici, mais des expériences contrôlées et répétées : le meilleur type de preuve dont on dispose. Rien à voir avec l'appel à la popularité."},
  {id:'s45',niv:1,src:'Néophyte, 2026',vu:'2026-10-30',arg:"Tous les mammifères respirent avec des poumons. La baleine est un mammifère. Elle respire donc avec des poumons.",nom:"Argument valable",expl:"Syllogisme valide : si les deux prémisses sont vraies, la conclusion l'est forcément. Compare avec l'affirmation du conséquent, qui remonte à tort de la conséquence à la cause."},
  {id:'s46',niv:3,src:'Néophyte, 2026',vu:'2026-10-30',arg:"Sur 2 000 personnes tirées au hasard, 62 % préfèrent le projet A : une majorité de la population le préfère probablement.",nom:"Argument valable",expl:"Un grand échantillon tiré au hasard permet de généraliser, avec ici une marge d'erreur de l'ordre de 2 points. La généralisation hâtive part de quelques cas choisis sans méthode."}
];
// Des noms trop proches pour servir de mauvaise réponse l'un à l'autre : deux réponses seraient défendables.
// Un nom absent de cette liste n'a pas de voisin.
B.familles={
  cause:['Post hoc',"Corrélation n'est pas causalité"],
  echantillon:['Généralisation hâtive','Biais du survivant',"Tireur d'élite texan"],
  personne:['Attaque personnelle','Toi aussi','Deux poids, deux mesures'],
  autrui:['Appel à la popularité','Appel à la tradition','Appel à la nouveauté','Fausse autorité'],
  emotion:['Appel à la peur','Appel à la pitié','Appel aux conséquences','Pente glissante'],
  detour:['Homme de paille','Diversion'],
  options:['Faux dilemme','Juste milieu'],
  partie:['Composition','Division']
};
// Trouve l'erreur de l'IA : la question, les phrases de la réponse, l'index de la phrase fausse, l'explication
B.erreursIA=[
  {id:'a01',niv:2,question:"Pourquoi le ciel est-il bleu ?",phrases:["La lumière du Soleil contient toutes les couleurs du spectre visible.","En traversant l'atmosphère, elle est diffusée par les molécules d'air.","Cette diffusion, dite de Rayleigh, est plus forte pour les grandes longueurs d'onde, comme le rouge.","C'est pourquoi le bleu est dispersé dans tout le ciel et nous parvient de toutes les directions."],faute:2,expl:"C'est l'inverse : la diffusion de Rayleigh est bien plus forte pour les courtes longueurs d'onde, comme le bleu. D'ailleurs, la dernière phrase contredit celle-ci."},
  {id:'a02',niv:1,question:"Si je place 1 000 € à 5 % par an pendant 2 ans, avec intérêts composés, combien j'aurai ?",phrases:["La première année, les intérêts sont de 5 % de 1 000 €, soit 50 €.","Le capital passe donc à 1 050 €.","La deuxième année, les intérêts portent sur 1 050 €, soit 52,50 €.","Au bout de 2 ans, le capital atteint donc 1 100 €."],faute:3,expl:"1 050 + 52,50 = 1 102,50 €. Le raisonnement était juste mais le total final est faux : c'est typique, l'erreur se cache souvent dans la dernière ligne."},
  {id:'a03',niv:2,question:"Parle-moi des Misérables.",phrases:["Les Misérables est un roman de Victor Hugo.","Il a été publié en 1862.","L'histoire suit notamment Jean Valjean, un ancien forçat.","Le roman se termine pendant la Révolution française de 1789."],faute:3,expl:"Le roman se déroule de 1815 aux années 1830 et culmine avec l'insurrection républicaine de juin 1832, pas avec la Révolution de 1789."},
  {id:'a04',niv:1,question:"On lance deux dés. Quelle est la probabilité d'obtenir un total de 7 ?",phrases:["Il y a 6 × 6 = 36 résultats possibles, tous également probables.","Les combinaisons qui donnent 7 sont (1,6), (2,5), (3,4), (4,3), (5,2) et (6,1).","Cela fait 6 combinaisons favorables.","La probabilité est donc de 6/36, soit 1/3."],faute:3,expl:"6/36 se simplifie en 1/6, pas 1/3."},
  {id:'a05',niv:2,question:"Le café rend-il plus productif ?",phrases:["Une enquête montre que les salariés qui boivent le plus de café sont aussi les plus productifs.","Le café contient de la caféine, un stimulant du système nerveux.","La caféine peut réduire la sensation de fatigue à court terme.","Cette enquête prouve donc que boire du café rend plus productif."],faute:3,expl:"Une corrélation ne prouve pas une cause. Les plus productifs travaillent peut-être plus longtemps, et boivent donc plus de café."},
  {id:'a06',niv:2,question:"Comment s'expliquent les saisons ?",phrases:["L'axe de rotation de la Terre est incliné d'environ 23° par rapport au plan de son orbite.","Selon la période de l'année, un hémisphère reçoit les rayons du Soleil plus directement.","Les saisons s'expliquent surtout par la variation de distance entre la Terre et le Soleil.","C'est pour cela que les saisons sont inversées entre les deux hémisphères."],faute:2,expl:"C'est l'inclinaison de l'axe qui explique les saisons. La Terre est même au plus près du Soleil début janvier, en plein hiver dans l'hémisphère Nord."},
  {id:'a07',niv:1,question:"Parle-moi de l'Australie.",phrases:["L'Australie est à la fois un pays et un continent.","Sa capitale est Sydney, la plus grande ville du pays.","Elle abrite la Grande Barrière de corail, le plus grand récif corallien du monde.","Le kangourou y est un animal emblématique."],faute:1,expl:"Sydney est la plus grande ville, mais la capitale est Canberra."},
  {id:'a08',niv:2,question:"Quand faut-il accorder le participe passé ?",phrases:["Avec l'auxiliaire être, le participe passé s'accorde en général avec le sujet.","Avec avoir, il s'accorde avec le complément d'objet direct si celui-ci est placé avant le verbe.","Ainsi, on écrit : « les pommes que j'ai mangé ».","Si le complément est placé après, il n'y a pas d'accord : « j'ai mangé les pommes »."],faute:2,expl:"D'après la règle donnée juste avant, on écrit « les pommes que j'ai mangées » : le COD « que » est placé avant."},
  {id:'a09',niv:1,question:"Mon salaire a baissé de 10 %, puis augmenté de 10 %. Où en suis-je ?",phrases:["Partons d'un salaire de 2 000 €.","Après une baisse de 10 %, il passe à 1 800 €.","Une hausse de 10 % sur 1 800 € représente 180 €.","Tu retrouves donc exactement ton salaire de départ, 2 000 €."],faute:3,expl:"1 800 + 180 = 1 980 €. Tu as perdu 1 % : la hausse s'applique à une base plus petite."},
  {id:'a10',niv:3,question:"Qui a dit « Je pense, donc je suis » ?",phrases:["Cette phrase est de René Descartes.","Elle apparaît en français dans le Discours de la méthode, publié en 1637.","Une version latine figure dans les Principes de la philosophie.","Descartes l'a écrite pour montrer que les sens sont la source de connaissance la plus sûre."],faute:3,expl:"C'est l'inverse : Descartes doute de tout ce qui vient des sens. La seule certitude qui résiste au doute, c'est qu'il pense."},
  {id:'a11',niv:2,question:"Tous les chats sont des mammifères. Félix est un mammifère. Que peut-on conclure ?",phrases:["Tous les chats sont des mammifères : c'est une prémisse.","Félix est un mammifère : c'est la seconde prémisse.","On peut donc conclure avec certitude que Félix est un chat.","En revanche, si Félix était un chat, on pourrait conclure qu'il est un mammifère."],faute:2,expl:"Félix peut être un chien. Être un mammifère n'implique pas d'être un chat : c'est l'erreur de l'affirmation du conséquent."},
  {id:'a12',niv:3,question:"Quel est le rôle du sommeil pour la mémoire ?",phrases:["Pendant le sommeil, le cerveau consolide les souvenirs de la journée.","L'hippocampe joue un rôle central dans cette consolidation.","Une courte sieste peut améliorer la rétention après un apprentissage.","Pendant le sommeil profond, le cerveau est presque totalement inactif."],faute:3,expl:"Le cerveau reste très actif pendant le sommeil profond : c'est justement là qu'il rejoue et consolide les souvenirs. La phrase contredit la première."},
  {id:'a13',niv:3,question:"Qui a construit la tour Eiffel ?",phrases:["La tour Eiffel a été construite pour l'Exposition universelle de 1889.","Elle porte le nom de Gustave Eiffel, dont l'entreprise l'a conçue et bâtie.","Les ingénieurs Maurice Koechlin et Émile Nouguier en avaient dessiné le premier projet.","Haute de 312 mètres à l'origine, elle est restée le plus haut monument du monde jusqu'en 1960."],faute:3,expl:"Elle a perdu ce titre en 1930, dépassée par le Chrysler Building à New York. La fausse date se cache au milieu de détails exacts."},
  {id:'a14',niv:2,question:"Combien de temps met la lumière du Soleil pour nous parvenir ?",phrases:["Le Soleil est à environ 150 millions de kilomètres de la Terre.","La lumière parcourt près de 300 000 kilomètres par seconde.","Il lui faut donc environ 500 secondes pour faire le trajet.","Autrement dit, la lumière que nous voyons a quitté le Soleil il y a un peu plus de 8 heures."],faute:3,expl:"500 secondes font environ 8 minutes et 20 secondes, pas 8 heures. Le calcul était juste, la conversion d'unité non."},
  {id:'a15',niv:3,question:"Quand a eu lieu la bataille de Marignan ?",phrases:["La bataille de Marignan a eu lieu en 1515, près de Milan.","Elle oppose l'armée de François Ier aux mercenaires suisses qui défendent le duché.","Elle se termine par une victoire française au bout de deux jours de combat.","François Ier y est fait prisonnier, puis emmené à Madrid."],faute:3,expl:"C'est à Pavie, en 1525, que François Ier est fait prisonnier. À Marignan, il est vainqueur. Deux batailles d'Italie confondues : une erreur typique d'IA."},
  {id:'a16',niv:2,question:"Qui a écrit Le Rouge et le Noir ?",phrases:["Le Rouge et le Noir est un roman de Stendhal.","Stendhal est le pseudonyme de Gustave Flaubert.","Le roman a été publié en 1830.","Son héros, Julien Sorel, est un jeune homme ambitieux d'origine modeste."],faute:1,expl:"Stendhal est le pseudonyme d'Henri Beyle. Flaubert, lui, est l'auteur de Madame Bovary."},
  {id:'a17',niv:3,question:"Pourquoi la Lune nous montre-t-elle toujours la même face ?",phrases:["La Lune tourne sur elle-même.","Elle met autant de temps à tourner sur elle-même qu'à faire le tour de la Terre, environ 27 jours.","On parle de rotation synchrone.","C'est pour cela que sa face cachée est toujours plongée dans la nuit."],faute:3,expl:"La face cachée reçoit autant de lumière que l'autre : elle est seulement invisible depuis la Terre."},
  {id:'a18',niv:1,question:"Combien font 15 % de 80 ?",phrases:["10 % de 80, c'est 8.","5 %, c'est la moitié de 10 %, soit 4.","15 %, c'est 10 % plus 5 %.","Donc 15 % de 80 font 14."],faute:3,expl:"8 + 4 = 12. La méthode était juste : c'est l'addition finale qui est fausse."},
  {id:'a19',niv:1,question:"Qu'est-ce que la photosynthèse ?",phrases:["C'est le processus par lequel les plantes fabriquent leur matière organique.","Elles utilisent pour cela l'énergie de la lumière.","Elles absorbent de l'oxygène et rejettent du dioxyde de carbone.","Elle a lieu surtout dans les feuilles, grâce à la chlorophylle."],faute:2,expl:"C'est l'inverse : la photosynthèse absorbe du dioxyde de carbone et rejette de l'oxygène."},
  {id:'a20',niv:3,question:"Que s'est-il passé le 14 juillet 1789 ?",phrases:["La Bastille était une forteresse qui servait de prison royale.","Elle a été prise par les émeutiers parisiens le 14 juillet 1789.","Ce jour-là, elle ne comptait que sept prisonniers.","Le 14 juillet est devenu fête nationale dès l'année suivante, en 1790."],faute:3,expl:"Le 14 juillet 1790, on célèbre la fête de la Fédération, mais le 14 juillet ne devient fête nationale qu'avec la loi de 1880."},
  {id:'a21',niv:1,question:"Les chauves-souris sont-elles des oiseaux ?",phrases:["Non, les chauves-souris sont des mammifères.","Elles allaitent leurs petits.","Comme les oiseaux, elles pondent des œufs.","Ce sont les seuls mammifères capables d'un vrai vol battu."],faute:2,expl:"Les chauves-souris ne pondent pas : elles mettent bas, comme presque tous les mammifères."},
  {id:'a22',niv:1,question:"Un article à 50 € bénéficie de deux remises successives de 10 %. Quel est son prix final ?",phrases:["La première remise porte sur 50 €, soit 5 €.","Le prix passe à 45 €.","La seconde remise porte sur 45 €, soit 4,50 €.","Le prix final est donc de 40 €, soit 20 % de remise au total."],faute:3,expl:"45 − 4,50 = 40,50 €. Deux remises de 10 % ne font pas 20 % : la seconde porte sur un prix déjà réduit."},
  {id:'a23',niv:2,question:"Quelle est la plus haute montagne de France ?",phrases:["Le mont Blanc est le plus haut sommet de France.","Sa première ascension a eu lieu en 1953.","Il culmine à environ 4 805 mètres.","Il se trouve dans le massif des Alpes, à la frontière avec l'Italie."],faute:1,expl:"La première ascension du mont Blanc date de 1786, par Jacques Balmat et Michel Paccard. 1953, c'est l'Everest."},
  {id:'a24',niv:2,question:"Qu'est-ce qu'un nombre premier ?",phrases:["Un nombre premier a exactement deux diviseurs : 1 et lui-même.","2 est le seul nombre premier pair.","1 est le plus petit nombre premier.","Il en existe une infinité, comme Euclide l'a démontré."],faute:2,expl:"1 n'a qu'un seul diviseur, lui-même : il n'est pas premier. Le plus petit nombre premier est 2."},
  {id:'a25',niv:2,question:"Qui était Napoléon Ier ?",phrases:["Napoléon Bonaparte naît en 1769 à Ajaccio.","Il se fait sacrer empereur des Français en 1804, à Notre-Dame de Paris.","Il meurt en 1815, peu après sa défaite à Waterloo.","Ses cendres reposent aux Invalides, à Paris, depuis 1840."],faute:2,expl:"Après Waterloo (1815), Napoléon est exilé à Sainte-Hélène, où il meurt en 1821."},
  {id:'a26',niv:3,question:"Pourquoi l'eau de mer est-elle salée ?",phrases:["L'eau de pluie dissout lentement les minéraux des roches.","Les rivières transportent ces sels jusqu'à la mer.","L'évaporation emporte l'eau mais laisse le sel.","Les océans contiennent en moyenne 3,5 grammes de sel par litre."],faute:3,expl:"C'est environ 35 grammes par litre. Une erreur d'un facteur 10 passe facilement inaperçue quand le reste sonne juste."}
];
// Estimation : la question, la valeur de référence, l'unité, le calcul
B.fermi=[
  {id:'f01',niv:2,q:"Combien de fois un cœur humain bat-il au cours d'une vie de 80 ans ?",val:2900000000,unite:"battements",calc:"≈ 70 battements/min × 60 × 24 × 365 × 80 ≈ 3 milliards."},
  {id:'f02',niv:2,q:"Combien de litres d'eau contient une piscine olympique ?",val:2500000,unite:"litres",calc:"50 m × 25 m × 2 m = 2 500 m³, soit 2,5 millions de litres."},
  {id:'f03',niv:2,q:"Combien de cheveux a une personne en moyenne ?",val:100000,unite:"cheveux",calc:"Environ 100 000 : ≈ 200 cheveux/cm² sur ≈ 500 cm² de cuir chevelu."},
  {id:'f04',niv:1,q:"Combien de secondes y a-t-il dans une année ?",val:31500000,unite:"secondes",calc:"365 × 24 × 3 600 ≈ 31,5 millions."},
  {id:'f05',niv:2,q:"Combien de grains de riz dans un paquet de 1 kg ?",val:50000,unite:"grains",calc:"Un grain pèse ≈ 20 mg, donc 1 000 000 mg / 20 ≈ 50 000 grains."},
  {id:'f06',niv:3,q:"Combien de mots une personne prononce-t-elle par jour en moyenne ?",val:16000,unite:"mots",calc:"Environ 16 000 mots par jour selon des enregistrements en conditions réelles (Mehl et al., 2007)."},
  {id:'f07',niv:2,q:"Quelle masse d'air (en kg) contient une pièce de 4 m × 5 m × 2,5 m ?",val:60,unite:"kg",calc:"50 m³ × 1,2 kg/m³ ≈ 60 kg. Plus lourd qu'on ne l'imagine."},
  {id:'f08',niv:3,q:"Combien de neurones contient un cerveau humain ?",val:86000000000,unite:"neurones",calc:"Environ 86 milliards (Azevedo et al., 2009)."},
  {id:'f09',niv:3,q:"Combien de Terres faudrait-il pour remplir le volume du Soleil ?",val:1300000,unite:"Terres",calc:"Rayon du Soleil ≈ 109 fois celui de la Terre ; 109³ ≈ 1,3 million."},
  {id:'f10',niv:3,q:"Combien de vols commerciaux décollent chaque jour dans le monde ?",val:100000,unite:"vols",calc:"De l'ordre de 100 000 vols par jour en période normale."},
  {id:'f11',niv:1,q:"Combien de pas fais-tu en un an si tu marches 7 000 pas par jour ?",val:2600000,unite:"pas",calc:"7 000 × 365 ≈ 2,6 millions de pas, soit ≈ 1 800 km."},
  {id:'f12',niv:2,q:"Combien de livres de 300 pages faudrait-il pour imprimer 1 Go de texte ?",val:1700,unite:"livres",calc:"Une page ≈ 2 000 caractères, un livre ≈ 600 000 octets. 10⁹ / 6×10⁵ ≈ 1 700 livres."},
  {id:'f13',niv:1,q:"Combien de pas faut-il pour faire le tour de la Terre (40 000 km), avec des pas de 75 cm ?",val:53000000,unite:"pas",calc:"40 000 km = 4 × 10⁷ m, divisé par 0,75 m ≈ 53 millions de pas."},
  {id:'f14',niv:1,q:"Combien de mots lis-tu en un an si tu lis 20 minutes par jour, à 250 mots par minute ?",val:1800000,unite:"mots",calc:"20 × 250 = 5 000 mots par jour, × 365 ≈ 1,8 million de mots : une vingtaine de romans."},
  {id:'f15',niv:2,q:"Combien de litres d'air respires-tu en une journée, au repos ?",val:11000,unite:"litres",calc:"≈ 0,5 litre par inspiration × 15 inspirations par minute × 1 440 minutes ≈ 11 000 litres."},
  {id:'f16',niv:1,q:"Combien de jours faut-il pour compter jusqu'à un million, à raison d'un nombre par seconde, sans dormir ?",val:11.6,unite:"jours",calc:"1 000 000 s ÷ 86 400 s par jour ≈ 11,6 jours. Jusqu'à un milliard, il faudrait près de 32 ans."},
  {id:'f17',niv:2,q:"Combien de feuilles A4 faut-il pour recouvrir un terrain de football de 105 m × 68 m ?",val:115000,unite:"feuilles",calc:"Le terrain fait ≈ 7 100 m² et une feuille A4 ≈ 0,062 m² (21 × 29,7 cm) : ≈ 115 000 feuilles."},
  {id:'f18',niv:2,q:"Combien de litres de sang ton cœur pompe-t-il en une journée, au repos ?",val:7200,unite:"litres",calc:"≈ 5 litres par minute × 1 440 minutes ≈ 7 000 litres par jour."},
  {id:'f19',niv:1,q:"Combien de minutes compte une vie de 80 ans ?",val:42000000,unite:"minutes",calc:"80 × 365 × 24 × 60 ≈ 42 millions de minutes."},
  {id:'f20',niv:3,q:"Combien de kilomètres la Terre parcourt-elle chaque jour autour du Soleil ?",val:2600000,unite:"km",calc:"Orbite ≈ 2π × 150 millions de km ≈ 940 millions de km par an, soit ≈ 2,6 millions de km par jour."},
  {id:'f21',niv:2,q:"Combien de gouttes d'eau contient un litre ?",val:20000,unite:"gouttes",calc:"Une goutte fait ≈ 0,05 mL, soit ≈ 20 gouttes par millilitre et ≈ 20 000 par litre."},
  {id:'f22',niv:2,q:"Combien de feuilles de papier faut-il empiler pour une pile d'un mètre ?",val:10000,unite:"feuilles",calc:"Une feuille de papier ordinaire fait ≈ 0,1 mm d'épaisseur : 1 000 mm ÷ 0,1 mm = 10 000."},
  {id:'f23',niv:1,q:"Combien d'heures dors-tu dans une vie de 80 ans, à 8 heures par nuit ?",val:230000,unite:"heures",calc:"8 × 365 × 80 ≈ 234 000 heures, soit environ 27 ans."},
  {id:'f24',niv:2,q:"Combien de Lunes, alignées côte à côte, faudrait-il pour couvrir la distance Terre–Lune ?",val:111,unite:"Lunes",calc:"≈ 384 000 km ÷ 3 475 km de diamètre ≈ 110."},
  {id:'f25',niv:1,q:"Combien de personnes en France fêtent leur anniversaire aujourd'hui ?",val:190000,unite:"personnes",calc:"≈ 68 millions d'habitants ÷ 365 jours ≈ 190 000 personnes."},
  {id:'f26',niv:1,q:"Combien de litres d'eau utilises-tu pour une douche de 5 minutes ?",val:60,unite:"litres",calc:"Une pomme de douche courante débite ≈ 12 litres par minute : 5 × 12 ≈ 60 litres."},
  {id:'f27',niv:2,q:"Combien de lettres et de signes contient un roman de 300 pages ?",val:540000,unite:"signes",calc:"≈ 300 mots par page × 6 signes par mot (espace compris) ≈ 1 800 signes ; × 300 pages ≈ 540 000."},
  {id:'f28',niv:1,q:"Combien de fois ton cœur bat-il pendant un film de 2 heures ?",val:8400,unite:"battements",calc:"≈ 70 battements par minute × 120 minutes ≈ 8 400."},
  {id:'f29',niv:2,q:"Combien de tours fait une roue de vélo de 70 cm de diamètre sur 10 km ?",val:4500,unite:"tours",calc:"Circonférence = π × 0,7 ≈ 2,2 m ; 10 000 m ÷ 2,2 m ≈ 4 500 tours."},
  {id:'f30',niv:2,q:"Combien de pièces de 1 € faudrait-il empiler pour atteindre le sommet de la tour Eiffel (330 m) ?",val:140000,unite:"pièces",calc:"Une pièce de 1 € fait ≈ 2,3 mm d'épaisseur : 330 000 mm ÷ 2,3 mm ≈ 140 000."}
];
// Orthographe : la phrase, les formes proposées, l'index de la bonne, la règle
B.ortho=[
  {id:'o01',niv:2,phrase:"Les lettres que j'ai ___ hier sont arrivées.",choix:["écrit","écrites","écrits"],bonne:1,regle:"Avec avoir, le participe s'accorde avec le COD placé avant : « que », mis pour « les lettres »."},
  {id:'o02',niv:3,phrase:"Elles se sont ___ les mains.",choix:["lavé","lavées","lavés"],bonne:0,regle:"Le COD « les mains » est placé après le verbe : pas d'accord."},
  {id:'o03',niv:2,phrase:"Les filles se sont ___ dans le parc.",choix:["promené","promenées","promenés"],bonne:1,regle:"Verbe pronominal sans autre COD : accord avec le sujet « les filles »."},
  {id:'o04',niv:1,phrase:"Il ___ beaucoup de travail cette semaine.",choix:["a","à"],bonne:0,regle:"Verbe avoir : on peut dire « il avait »."},
  {id:'o05',niv:1,phrase:"Je pars ___ Lyon demain matin.",choix:["a","à"],bonne:1,regle:"Préposition : on ne peut pas dire « avait »."},
  {id:'o06',niv:1,phrase:"___ en forgeant qu'on devient forgeron.",choix:["C'est","S'est","Ses","Ces"],bonne:0,regle:"« Cela est » : c'est."},
  {id:'o07',niv:1,phrase:"Il ___ trompé de route.",choix:["s'est","c'est","ses"],bonne:0,regle:"Verbe pronominal se tromper : il s'est trompé."},
  {id:'o08',niv:3,phrase:"___ que soient tes raisons, préviens-nous.",choix:["Quelles","Quelle","Quel","Quels"],bonne:0,regle:"« Quel que » s'accorde avec le sujet : les raisons, féminin pluriel."},
  {id:'o09',niv:1,phrase:"Je ___ ai parlé hier soir.",choix:["leur","leurs"],bonne:0,regle:"Pronom devant un verbe : « leur » est toujours invariable."},
  {id:'o10',niv:1,phrase:"Ils ont rangé ___ affaires.",choix:["leur","leurs"],bonne:1,regle:"Déterminant devant un nom pluriel : leurs affaires."},
  {id:'o11',niv:1,phrase:"Il faut ___ ce dossier avant midi.",choix:["terminer","terminé","terminez"],bonne:0,regle:"Après « il faut », on met l'infinitif. Astuce : remplace par « finir »."},
  {id:'o12',niv:1,phrase:"Le dossier est ___ depuis midi.",choix:["terminé","terminer"],bonne:0,regle:"Astuce : remplace par « fini » ou « finir ». On dit « il est fini »."},
  {id:'o13',niv:2,phrase:"Quoi qu'il ___, je viendrai.",choix:["arrive","arrives","arrivera"],bonne:0,regle:"« Quoi que » est suivi du subjonctif : quoi qu'il arrive."},
  {id:'o14',niv:1,phrase:"___ vas-tu ce week-end ?",choix:["Où","Ou"],bonne:0,regle:"Le lieu prend un accent : où. « Ou » sans accent signifie « ou bien »."},
  {id:'o15',niv:3,phrase:"Elles sont ___ contentes de leur résultat.",choix:["tout","toutes"],bonne:1,regle:"« Tout » adverbe s'accorde devant un adjectif féminin qui commence par une consonne."},
  {id:'o16',niv:3,phrase:"Nous avons ___ deux heures sous la pluie.",choix:["attendu","attendus"],bonne:0,regle:"« Deux heures » est un complément de durée, pas un COD : pas d'accord."},
  {id:'o17',niv:3,phrase:"La maison qu'ils ont ___ construire est superbe.",choix:["fait","faite"],bonne:0,regle:"« Fait » suivi d'un infinitif reste toujours invariable."},
  {id:'o18',niv:2,phrase:"Les fleurs que tu m'as ___ sont magnifiques.",choix:["offert","offertes","offerts"],bonne:1,regle:"COD « que » (les fleurs) placé avant avoir : accord au féminin pluriel."},
  {id:'o19',niv:2,phrase:"Si j'___ su, je serais venu.",choix:["avais","aurais"],bonne:0,regle:"Après « si » de condition, jamais de conditionnel : si j'avais su."},
  {id:'o20',niv:1,phrase:"Demain, je ___ à Lyon toute la journée.",choix:["serai","serais"],bonne:0,regle:"Action certaine dans le futur : futur simple (je serai). Le conditionnel exprime une hypothèse."},
  {id:'o21',niv:1,phrase:"Ils ___ partis très tôt ce matin.",choix:["sont","son"],bonne:0,regle:"Verbe être : on peut dire « ils étaient partis »."},
  {id:'o22',niv:3,phrase:"J'ai payé quatre-___ euros.",choix:["vingts","vingt"],bonne:0,regle:"« Vingt » prend un s quand il est multiplié et termine le nombre : quatre-vingts."},
  {id:'o23',niv:2,phrase:"Il a mangé ___ pommes en rentrant.",choix:["quelques","quelque"],bonne:0,regle:"Devant un nom pluriel, « quelques » s'accorde."},
  {id:'o24',niv:3,phrase:"Ci-___ les documents demandés.",choix:["joint","jointes","joints"],bonne:0,regle:"En tête de phrase, devant le nom, « ci-joint » reste invariable."},
  {id:'o25',niv:2,phrase:"Ce sont les règles ___ je t'ai parlé.",choix:["dont","que"],bonne:0,regle:"On parle DE quelque chose : le relatif est « dont »."},
  {id:'o26',niv:3,phrase:"Les efforts qu'il a ___ ont payé.",choix:["fallu","fallus"],bonne:0,regle:"Le participe de « falloir » est toujours invariable."},
  {id:'o27',niv:3,phrase:"Ils se sont ___ des cadeaux.",choix:["offert","offerts"],bonne:0,regle:"Le COD « des cadeaux » est placé après le verbe : pas d'accord, même avec être."},
  {id:'o28',niv:3,phrase:"Elle s'est ___ compte de son erreur.",choix:["rendu","rendue"],bonne:0,regle:"« Se rendre compte » : « compte » est le COD, placé après. Le participe reste invariable."},
  {id:'o29',niv:2,phrase:"Ils ont ___ leurs devoirs.",choix:["fini","finit","finis"],bonne:0,regle:"Avec avoir et un COD placé après, le participe ne s'accorde pas. Astuce : « ils ont pris », pas « ils ont prit »."},
  {id:'o30',niv:2,phrase:"Il faut que tu ___ à l'heure.",choix:["sois","soit","soi"],bonne:0,regle:"Subjonctif d'être : que je sois, que tu sois, qu'il soit. « Soi » est un pronom."},
  {id:'o31',niv:1,phrase:"C'est ___ que je pensais.",choix:["ce","se"],bonne:0,regle:"« Ce » désigne une chose (cela). « Se » accompagne un verbe pronominal : il se lave."},
  {id:'o32',niv:2,phrase:"Les enfants, ___ par le bruit, se sont réveillés.",choix:["dérangé","dérangés"],bonne:1,regle:"Participe employé comme adjectif : il s'accorde avec « les enfants »."},
  {id:'o33',niv:1,phrase:"Je vous ___ de bonnes vacances.",choix:["souhaite","souhaites"],bonne:0,regle:"Le sujet est « je » : je souhaite. « Vous » est ici complément."},
  {id:'o34',niv:2,phrase:"Tu es ___ arriver à huit heures.",choix:["sensé","censé"],bonne:1,regle:"« Censé » veut dire « supposé ». « Sensé » veut dire « qui a du bon sens » : une remarque sensée."},
  {id:'o35',niv:1,phrase:"Je suis ___ à partir.",choix:["près","prêt"],bonne:1,regle:"« Prêt à » : préparé à. « Près de » : à côté de."},
  {id:'o36',niv:1,phrase:"Il ___ pleuvoir cet après-midi.",choix:["peu","peut","peux"],bonne:1,regle:"Verbe pouvoir : il peut. Astuce : on peut dire « il pouvait »."},
  {id:'o37',niv:1,phrase:"Il a ___ d'amis dans cette ville.",choix:["peu","peut"],bonne:0,regle:"« Peu » signifie « pas beaucoup ». On ne peut pas dire « il a pouvait d'amis »."},
  {id:'o38',niv:2,phrase:"___ à moi, je préfère rester.",choix:["Quand","Quant","Qu'en"],bonne:1,regle:"« Quant à » signifie « en ce qui concerne ». « Quand » marque le temps."},
  {id:'o39',niv:2,phrase:"Je ne sais pas ___ penser.",choix:["qu'en","quand","quant"],bonne:0,regle:"« Qu'en » = « que » + « en » : que penser de cela."},
  {id:'o40',niv:2,phrase:"Pour réussir, il faudra travailler ___.",choix:["d'avantage","davantage"],bonne:1,regle:"« Davantage », en un mot, signifie « plus ». « Un avantage » est un bénéfice."},
  {id:'o41',niv:3,phrase:"Elles se sont ___ toute la soirée.",choix:["parlées","parlé","parlés"],bonne:1,regle:"On parle à quelqu'un : « se » est complément indirect. Pas d'accord : elles se sont parlé."},
  {id:'o42',niv:3,phrase:"Elles se sont ___ de leur erreur.",choix:["aperçu","aperçues"],bonne:1,regle:"« S'apercevoir de » ne s'emploie qu'à la forme pronominale : le participe s'accorde avec le sujet."},
  {id:'o43',niv:2,phrase:"Il porte des chaussures ___.",choix:["marron","marrons"],bonne:0,regle:"Un nom employé comme couleur reste invariable : des chaussures marron, des yeux noisette."},
  {id:'o44',niv:3,phrase:"Elle a acheté des robes ___.",choix:["rose","roses"],bonne:1,regle:"« Rose » fait exception : avec mauve, fauve, pourpre et écarlate, il s'accorde."},
  {id:'o45',niv:3,phrase:"Il a mis ses chemises bleu ___.",choix:["claires","clair"],bonne:1,regle:"Une couleur composée de deux mots reste invariable : des chemises bleu clair."},
  {id:'o46',niv:2,phrase:"Bien qu'il ___ tard, je reste encore un peu.",choix:["est","soit"],bonne:1,regle:"« Bien que » est toujours suivi du subjonctif : bien qu'il soit tard."},
  {id:'o47',niv:2,phrase:"Je te rappellerai après que tu ___ rentré.",choix:["seras","sois"],bonne:0,regle:"« Après que » se construit avec l'indicatif, car l'action est réalisée. Le subjonctif, très répandu, est une faute."},
  {id:'o48',niv:2,phrase:"Ces livres, je les ai tous ___.",choix:["lu","lus"],bonne:1,regle:"Le COD « les » (ces livres) est placé avant avoir : accord au masculin pluriel."},
  {id:'o49',niv:2,phrase:"Combien de pommes as-tu ___ ?",choix:["mangé","mangées"],bonne:1,regle:"« Combien de pommes » est le COD, placé avant avoir : accord au féminin pluriel."},
  {id:'o50',niv:3,phrase:"Elle est ___ heureuse de sa journée.",choix:["tout","toute"],bonne:0,regle:"« Tout » adverbe reste invariable devant un adjectif féminin qui commence par une voyelle ou un h muet."},
  {id:'o51',niv:1,phrase:"Montre-moi ___ livres que tu as achetés hier.",choix:["ses","ces"],bonne:1,regle:"« Ces » montre : ces livres-là. « Ses » indique qu'ils appartiennent à quelqu'un d'autre : ses livres à lui."},
  {id:'o52',niv:3,phrase:"Il y avait deux ___ cinquante invités.",choix:["cents","cent"],bonne:1,regle:"« Cent » ne prend pas de s quand il est suivi d'un autre nombre : deux cent cinquante, mais deux cents."},
  {id:'o53',niv:3,phrase:"Il a parcouru trois ___ kilomètres à vélo.",choix:["mille","milles"],bonne:0,regle:"« Mille » est toujours invariable."},
  {id:'o54',niv:1,phrase:"La réunion de ce soir a été ___.",choix:["annulé","annulée","annuler"],bonne:1,regle:"Avec être, le participe s'accorde avec le sujet : la réunion, féminin singulier."},
  {id:'o55',niv:1,phrase:"Vous devez ___ ce formulaire avant lundi.",choix:["rempli","remplir","remplis"],bonne:1,regle:"Après un verbe comme « devoir », on met l'infinitif. Astuce : remplace par « prendre »."},
  {id:'o56',niv:3,phrase:"___ grands que soient leurs efforts, ils n'y arriveront pas seuls.",choix:["Quelques","Quelque","Quels que"],bonne:1,regle:"Devant un adjectif, « quelque » signifie « si » : il est adverbe, donc invariable."},
  {id:'o57',niv:3,phrase:"Les sommes ___ seront remboursées.",choix:["dûes","dues","dûs"],bonne:1,regle:"« Dû » ne garde son accent qu'au masculin singulier : due, dus, dues."},
  {id:'o58',niv:1,phrase:"Il a ___ partir plus tôt que prévu.",choix:["du","dû"],bonne:1,regle:"Participe passé de devoir : dû, avec un accent qui le distingue de l'article « du »."},
  {id:'o59',niv:3,phrase:"Elle s'est ___ de partir sans prévenir.",choix:["permise","permis"],bonne:1,regle:"On permet quelque chose à quelqu'un : « se » est complément indirect, pas d'accord."},
  {id:'o60',niv:3,phrase:"Elles ont ___ toute la nuit.",choix:["dormies","dormi"],bonne:1,regle:"« Dormir » n'a jamais de COD : avec avoir, son participe ne s'accorde pas."},
  {id:'o61',niv:2,phrase:"Voici la lettre ___ j'attendais.",choix:["dont","que"],bonne:1,regle:"On attend quelque chose, sans préposition : le relatif est « que ». On dit « dont » pour « parler de »."}
];

/* Variantes à l'infini : le même piège, d'autres nombres, une autre histoire.
   gen(r) tire les paramètres p et rédige l'énoncé ; la réponse val est calculée par le code.
   brute(p) refait le calcul par une autre voie (on compte, on simule) : le vérificateur exige que les deux concordent. */
const NF=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}), nb=n=>NF.format(n);
const eur=c=>c%100?nb(c/100).replace(/,(\d)$/,',$10')+' €':nb(c/100)+' €';
const pct=x=>x>=10?nb(Math.round(x))+' %':nb(Math.round(x*10)/10)+' %';
const plur=(n,s,pl)=>nb(n)+' '+(n>1?(pl||s+'s'):s);
const hm=h=>{const m=Math.round(h*60);return m%60?(m>=60?Math.floor(m/60)+' h '+String(m%60).padStart(2,'0'):m+' min'):(m/60)+' h';};
B.modeles=[
  {id:'raquette',niv:1,nom:'Le total et la différence',
    gen(r){
      const [a,b,la,lb]=r.pick([['Un stylo','un carnet','le stylo','Le carnet'],['Une balle','une raquette','la balle','La raquette'],['Un marque-page','un livre','le marque-page','Le livre'],['Une gomme','une trousse','la gomme','La trousse'],['Un café','un croissant','le café','Le croissant']]);
      const x=r.pick([5,10,15,20,25,30,40,50]), d=r.pick([100,200,300,500,1000]), t=2*x+d;
      return {p:{x,d,t},val:x,q:`${a} et ${b} coûtent ${eur(t)} au total. ${lb} coûte ${eur(d)} de plus que ${la}. Combien coûte ${la} ?`,
        r:eur(x),expl:`Avec x pour ${la} : x + (x + ${eur(d)}) = ${eur(t)}, donc 2x = ${eur(t-d)} et x = ${eur(x)}. La réponse intuitive, ${eur(t-d)}, donnerait un total de ${eur(2*(t-d)+d)}.`,
        indice:`Si ${la} coûtait ${eur(t-d)}, combien coûterait l'autre, et quel serait le total ?`};
    },
    brute(p){for(let c=0;c<=p.t;c++)if(c+(c+p.d)===p.t)return c;}},
  {id:'machines',niv:1,nom:'Le rythme qui ne change pas',
    gen(r){
      const [who,what,u]=r.pick([['machines','objets','minutes'],['imprimantes','affiches','minutes'],['couturières','chemises','heures'],['photocopieuses','copies','secondes']]);
      const n=r.int(3,9), m=r.pick([50,100,120,200,300]);
      return {p:{n,m},val:n,q:`${n} ${who} font ${n} ${what} en ${n} ${u}. Combien de temps faut-il à ${m} ${who} pour faire ${m} ${what} ?`,
        r:`${n} ${u}`,expl:`Chacune fait 1 ${what.replace(/s$/,'')} en ${n} ${u}. ${m} ${who} en font donc ${m} dans le même temps : ${n} ${u}. La réponse intuitive, ${m}, suit le rythme des nombres au lieu du rythme du travail.`,
        indice:`Combien de temps faut-il à une seule des ${who} pour en faire un seul ?`};
    },
    brute(p){const parUnite=p.n/p.n/p.n;return p.m/(p.m*parUnite);}},
  {id:'nenuphars',niv:1,nom:'Ce qui double chaque jour',
    gen(r){
      const [what,where]=r.pick([['une tache de nénuphars','le lac'],['une moisissure','la boîte de Petri'],['une colonie de bactéries','le flacon'],['une rumeur','la ville']]);
      const D=r.int(20,60), [frac,k]=r.pick([['la moitié',1],['le quart',2],['le huitième',3]]);
      return {p:{D,k},val:D-k,q:`${what[0].toUpperCase()+what.slice(1)} double chaque jour. Il lui faut ${D} jours pour envahir ${where}. Au bout de combien de jours en envahissait-elle ${frac} ?`,
        r:`${D-k} jours`,expl:`En remontant le temps, la surface est divisée par 2 chaque jour : ${k===1?'la veille':k+' jours avant'} du ${D}e jour, elle couvrait ${frac}. La réponse intuitive divise le nombre de jours au lieu de diviser la surface.`,
        indice:`Que couvrait-elle la veille du ${D}e jour ?`};
    },
    brute(p){let s=1,t=p.D;while(s>Math.pow(2,-p.k)+1e-12){s/=2;t--;}return t;}},
  {id:'vitesse',niv:2,nom:'La vitesse moyenne',
    gen(r){
      const [v1,v2]=r.pick([[90,45],[60,30],[120,40],[60,40],[120,60],[100,150],[80,120],[30,60]]), d=r.pick([60,90,120,180,240]);
      const [a,b]=r.pick([['Paris','Chartres'],['Lyon','Grenoble'],['Bordeaux','Arcachon'],['Lille','Arras'],['Nantes','Angers']]);
      const val=2*v1*v2/(v1+v2);
      return {p:{v1,v2,d},val,q:`Tu fais l'aller ${a}–${b} (${d} km) à ${v1} km/h et le retour à ${v2} km/h. Quelle est ta vitesse moyenne sur l'aller-retour ?`,
        r:`${nb(val)} km/h`,expl:`L'aller prend ${hm(d/v1)}, le retour ${hm(d/v2)} : ${2*d} km en ${hm(d/v1+d/v2)}, soit ${nb(val)} km/h. La moyenne des deux vitesses (${nb((v1+v2)/2)} km/h) est fausse : tu passes plus de temps à rouler lentement.`,
        indice:'Calcule le temps de chaque trajet plutôt que la moyenne des vitesses.'};
    },
    brute(p){let t=0;for(let k=0;k<p.d;k++)t+=1/p.v1;for(let k=0;k<p.d;k++)t+=1/p.v2;return Math.round(2*p.d/t*1e6)/1e6;}},
  {id:'hausse-baisse',niv:2,nom:'Hausse puis baisse',
    gen(r){
      const a=r.pick([10,20,25,30,40,50]), [what,start]=r.pick([['un prix','100 €'],['un salaire','2 000 €'],['un loyer','800 €'],['une action en Bourse','50 €']]), up=r.int(0,1);
      const val=a*a/100;
      return {p:{a,up},val,q:`${what[0].toUpperCase()+what.slice(1)} ${up?'augmente':'baisse'} de ${a} %, puis ${up?'baisse':'augmente'} de ${a} %. Par rapport au départ, est-il plus haut, plus bas ou identique ?`,
        r:`Plus bas de ${pct(val)}`,expl:`Pars de 100 : ${up?`100 → ${nb(100+a)} → ${nb(100+a)} × ${nb(1-a/100)} = ${nb(100-val)}`:`100 → ${nb(100-a)} → ${nb(100-a)} × ${nb(1+a/100)} = ${nb(100-val)}`}. Le second pourcentage s'applique à une autre base que le premier. Dans les deux ordres, on perd ${pct(val)}.`,
        indice:'Pars de 100 et fais les deux calculs l\'un après l\'autre.'};
    },
    brute(p){let x=10000;x=p.up?x*(100+p.a)/100*(100-p.a)/100:x*(100-p.a)/100*(100+p.a)/100;return Math.round((10000-x)/100*1e6)/1e6;}},
  {id:'poignees',niv:2,nom:'Les poignées de main',
    gen(r){
      const n=r.int(5,16), [ctx,act]=r.pick([['une réunion','serre la main de'],['un tournoi d\'échecs','joue une partie contre'],['un dîner','trinque avec'],['un club de tennis','dispute un match contre']]);
      const val=n*(n-1)/2, noun={'serre la main de':'poignées de main','joue une partie contre':'parties','trinque avec':'trinquées','dispute un match contre':'matchs'}[act];
      return {p:{n},val,q:`À ${ctx} de ${n} personnes, chacun ${act} tous les autres, une seule fois. Combien y a-t-il de ${noun} en tout ?`,
        r:nb(val),expl:`Chacun en fait ${n-1} : ${n} × ${n-1} = ${nb(n*(n-1))}. Mais chacune concerne deux personnes et a été comptée deux fois : ${nb(n*(n-1))} ÷ 2 = ${nb(val)}.`,
        indice:`Chacun en fait ${n-1}, mais il en faut deux pour chacune.`};
    },
    brute(p){let c=0;for(let i=0;i<p.n;i++)for(let j=i+1;j<p.n;j++)c++;return c;}},
  {id:'coups',niv:2,nom:'Les intervalles',
    gen(r){
      const k=r.int(3,7), per=r.int(1,3), m=r.int(k+3,12);
      const [what,unit]=r.pick([['Une horloge sonne','coups'],['Un phare lance','éclats'],['Un métronome bat','temps']]);
      const s=(k-1)*per, val=(m-1)*per;
      return {p:{k,s,m},val,q:`${what} ${k} ${unit} en ${s} secondes, à intervalles réguliers. Combien de temps lui faut-il pour en faire ${m} ? (Le chronomètre part au premier, s'arrête au dernier.)`,
        r:`${val} secondes`,expl:`${k} ${unit} font ${k-1} intervalles, soit ${per} seconde${per>1?'s':''} par intervalle. ${m} ${unit} font ${m-1} intervalles : ${val} secondes, et non ${nb(Math.round(s/k*m*10)/10)}.`,
        indice:'Compte les intervalles entre les coups, pas les coups.'};
    },
    brute(p){const per=p.s/(p.k-1);let t=0;for(let i=1;i<p.m;i++)t+=per;return t;}},
  {id:'moyenne',niv:2,nom:'La note qu\'il te faut',
    gen(r){
      for(;;){const n=r.int(2,6), a=r.int(8,14), b=a+r.pick([1,2]), x=(n+1)*b-n*a;
        if(x<=20)return {p:{n,a,b},val:x,q:`Ta moyenne est de ${a} sur 20 après ${n} devoirs. Quelle note te faut-il au devoir suivant pour atteindre ${b} de moyenne ?`,
          r:`${x} sur 20`,expl:`${n} devoirs à ${a} de moyenne font ${n*a} points. Pour ${b} de moyenne sur ${n+1} devoirs, il en faut ${(n+1)*b}. ${(n+1)*b} − ${n*a} = ${x}.`,
          indice:'Raisonne sur les totaux de points, pas sur les moyennes.'};}
    },
    brute(p){for(let x=0;x<=20;x++)if((p.n*p.a+x)===(p.n+1)*p.b)return x;}},
  {id:'ages',niv:2,nom:'Le double de l\'âge',
    gen(r){
      const s=r.int(4,15), y=r.int(2,16), f=2*s+y;
      const [who,kid]=r.pick([['un père','son fils'],['une mère','sa fille'],['un oncle','son neveu'],['une marraine','sa filleule']]);
      return {p:{f,s},val:y,q:`Aujourd'hui, ${who} a ${f} ans et ${kid} ${s}. Dans combien d'années ${who.replace(/^un /,'le ').replace(/^une /,'la ')} aura-t-${who.startsWith('une')?'elle':'il'} le double de l'âge de ${kid} ?`,
        r:`Dans ${plur(y,'an')}`,expl:`Avec x années : ${f} + x = 2 × (${s} + x), donc ${f} + x = ${2*s} + 2x et x = ${y}. Les âges seront alors ${f+y} et ${s+y} ans.`,
        indice:'Appelle x le nombre d\'années et écris l\'âge de chacun dans x ans.'};
    },
    brute(p){for(let x=0;x<100;x++)if(p.f+x===2*(p.s+x))return x;}},
  {id:'escargot',niv:2,nom:'Le dernier jour',
    gen(r){
      for(;;){const u=r.int(3,6), d=r.int(1,u-1), h=r.int(u+3,25);
        const val=Math.ceil((h-u)/(u-d))+1;
        return {p:{u,d,h},val,q:`Un escargot est au fond d'un puits de ${h} m. Chaque jour il monte de ${u} m, chaque nuit il glisse de ${d} m. Au bout de combien de jours sort-il ?`,
          r:`Le ${val}e jour`,expl:`Il gagne ${u-d} m par jour et nuit complets. Au matin du ${val}e jour, il est à ${(val-1)*(u-d)} m : il monte de ${u} m dans la journée, atteint le bord et sort sans glisser. Diviser ${h} par ${u-d} oublie ce dernier jour.`,
          indice:'Attention au dernier jour : une fois sorti, il ne glisse plus.'};}
    },
    brute(p){let z=0;for(let j=1;j<1000;j++){z+=p.u;if(z>=p.h)return j;z-=p.d;}}},
  {id:'depistage',niv:3,nom:'Le test positif',
    gen(r){
      const N=r.pick([100,200,500,1000,2000]), f=r.pick([1,2,5,10]);
      const [mal]=r.pick([['une maladie'],['une allergie rare'],['une anomalie génétique']]);
      const val=100*100/(100+f*(N-1));
      return {p:{N,f},val:Math.round(val*10)/10,q:`${mal[0].toUpperCase()+mal.slice(1)} touche 1 personne sur ${nb(N)}. Tu fais un test de dépistage sans raison particulière. Le test la détecte toujours chez les personnes atteintes, mais donne ${f} % de faux positifs chez les autres. Ton test est positif. Quelle est la probabilité que tu sois atteint ?`,
        r:`Environ ${pct(val)}`,expl:`Imagine ${nb(100*N)} personnes testées : 100 sont atteintes, toutes positives. Parmi les ${nb(100*(N-1))} autres, ${f} % sont positives à tort, soit ${nb(f*(N-1))}. Tu es l'un des ${nb(100+f*(N-1))} positifs, dont 100 seulement sont atteints : environ ${pct(val)}. Oublier la rareté de départ, c'est l'oubli du taux de base.`,
        indice:`Imagine ${nb(100*N)} personnes testées : combien d'atteintes, combien de faux positifs ?`};
    },
    brute(p){let vrais=0,faux=0;const pop=100*p.N;for(let i=0;i<pop;i++){if(i<100)vrais++;else if((i-100)%100<p.f)faux++;}return Math.round(vrais/(vrais+faux)*1000)/10;}},
  {id:'des',niv:3,nom:'Au moins un six',
    gen(r){
      const n=r.int(2,4), tot=Math.pow(6,n), none=Math.pow(5,n), val=tot-none;
      return {p:{n},val,q:`On lance ${n} dés. Quelle est la probabilité d'obtenir au moins un six ?`,
        r:`${nb(val)} sur ${nb(tot)}, environ ${pct(val/tot*100)}`,expl:`La probabilité de n'avoir aucun six est ${Array(n).fill('5/6').join(' × ')} = ${nb(none)}/${nb(tot)}. Celle d'en avoir au moins un est donc ${nb(val)}/${nb(tot)}. Additionner ${Array(n).fill('1/6').join(' + ')} compterait plusieurs fois les lancers à plusieurs six.`,
        indice:'Calcule d\'abord la probabilité de n\'avoir aucun six.'};
    },
    brute(p){let c=0;const tot=Math.pow(6,p.n);for(let k=0;k<tot;k++){let x=k,six=false;for(let i=0;i<p.n;i++){if(x%6===5)six=true;x=Math.floor(x/6);}if(six)c++;}return c;}},
  {id:'pourcentages',niv:2,nom:'Le même écart, deux pourcentages',
    gen(r){
      const [h,b]=r.pick([[25,20],[50,100/3],[100,50],[20,100/6]]), a=r.pick([40,60,80,120,200,300]), top=a*(100+h)/100;
      return {p:{a,h},val:Math.round(b*10)/10,q:`Un article passe de ${nb(a)} € à ${nb(top)} €. De combien de pourcents a-t-il augmenté ? S'il redescend ensuite à ${nb(a)} €, de combien de pourcents baisse-t-il ?`,
        r:`+${pct(h)}, puis −${pct(b)}`,expl:`${nb(top-a)} € de plus sur ${nb(a)} €, c'est ${pct(h)}. ${nb(top-a)} € de moins sur ${nb(top)} €, c'est ${pct(b)}. Le même écart ne donne pas le même pourcentage, car la base change.`,
        indice:'Un pourcentage se calcule par rapport au prix de départ de chaque variation.'};
    },
    brute(p){const top=p.a*(100+p.h)/100;return Math.round((top-p.a)/top*1000)/10;}}
];
// un tirage reproductible : la même graine donne le même problème
B.rng=seed=>{let s=(Math.imul(seed>>>0,2654435761)^0x9E3779B9)>>>0||1;const f=()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};for(let i=0;i<4;i++)f();
  return {int:(a,b)=>a+Math.floor(f()*(b-a+1)),pick:a=>a[Math.floor(f()*a.length)]};};


root.NEO_BANQUES=B;
})(typeof window!=='undefined'?window:globalThis);
