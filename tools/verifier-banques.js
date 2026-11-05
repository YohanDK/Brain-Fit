// Vérifie public/banques.js avant toute publication : node tools/verifier-banques.js
// Sort en erreur (code 1) si une question est mal formée, ambiguë par construction ou si un calcul ne tombe pas juste.
'use strict';
const path=require('path');
require(path.join(__dirname,'..','public','banques.js'));
const B=globalThis.NEO_BANQUES;
const errs=[], warns=[];
const err=(id,m)=>errs.push(`${id} : ${m}`), warn=(id,m)=>warns.push(`${id} : ${m}`);
const str=v=>typeof v==='string'&&v.trim().length>0;
const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'');
// les questions d'avant la mise en place des sources (octobre 2026) en sont dispensées ; toutes les suivantes doivent en avoir
const ANCIENNES={lieux:0,problemes:42,sophismes:40,erreursIA:26,fermi:30,ortho:61,textes:6,graphiques:0};

const ids=new Set();
function common(bank,it,i,fields){
  const id=it&&it.id||`${bank}[${i}]`;
  if(!it||typeof it!=='object')return err(id,'pas un objet');
  if(!str(it.id))err(id,'id manquant');else if(ids.has(it.id))err(id,'id déjà utilisé');else ids.add(it.id);
  if(![1,2,3].includes(it.niv))err(id,'niv doit valoir 1, 2 ou 3');
  for(const f of fields)if(!str(it[f]))err(id,`champ « ${f} » vide`);
  if(i>=ANCIENNES[bank]){
    if(!str(it.src))err(id,'src obligatoire pour une nouvelle question');
    if(!date(it.vu))err(id,'vu obligatoire (AAAA-MM-JJ) pour une nouvelle question');
  }else if(it.vu&&!date(it.vu))err(id,'vu doit être une date AAAA-MM-JJ');
  for(const[k,v] of Object.entries(it))if(typeof v==='string'&&/\b(undefined|NaN|null)\b|\s{2,}/.test(v))err(id,`champ « ${k} » suspect : ${v.slice(0,60)}`);
  return id;
}
function noDup(bank,key){
  const seen=new Map();
  B[bank].forEach(it=>{const k=String(it[key]).toLowerCase().replace(/\W+/g,' ').trim();if(seen.has(k))err(it.id,`même texte que ${seen.get(k)}`);else seen.set(k,it.id);});
}

B.problemes.forEach((p,i)=>common('problemes',p,i,['q','r','expl','indice']));
noDup('problemes','q');

const famOf=new Map();
for(const[f,names] of Object.entries(B.familles))for(const n of names){if(famOf.has(n))err(n,`dans deux familles (${famOf.get(n)}, ${f})`);famOf.set(n,f);}
const noms=new Set(B.sophismes.map(s=>s.nom));
for(const n of famOf.keys())if(!noms.has(n))err(n,'nom de famille absent des sophismes');
B.sophismes.forEach((s,i)=>common('sophismes',s,i,['arg','nom','expl']));
noDup('sophismes','arg');
// un QCM a besoin d'au moins 3 mauvaises réponses qui ne soient pas des voisines
for(const n of noms){const pool=[...noms].filter(x=>x!==n&&x!=='Argument valable'&&(!famOf.has(n)||famOf.get(x)!==famOf.get(n)));if(pool.length<3)err(n,'trop peu de mauvaises réponses possibles');}
if(!noms.has('Argument valable'))warn('sophismes','aucun argument valable : on apprend à voir des sophismes partout');

B.erreursIA.forEach((a,i)=>{const id=common('erreursIA',a,i,['question','expl']);
  if(!Array.isArray(a.phrases)||a.phrases.length<3||a.phrases.length>6||!a.phrases.every(str))err(id,'il faut 3 à 6 phrases');
  else if(!Number.isInteger(a.faute)||a.faute<0||a.faute>=a.phrases.length)err(id,'faute hors des phrases');});
noDup('erreursIA','question');

B.fermi.forEach((f,i)=>{const id=common('fermi',f,i,['q','unite','calc']);
  if(!(typeof f.val==='number'&&isFinite(f.val)&&f.val>0))err(id,'val doit être un nombre positif');
  else if(f.val>1e12||f.val<1)err(id,'val hors de l\'échelle du curseur (1 à mille milliards)');});
noDup('fermi','q');

B.ortho.forEach((o,i)=>{const id=common('ortho',o,i,['phrase','regle']);
  if(!/___/.test(o.phrase))err(id,'la phrase doit contenir ___');
  if(!Array.isArray(o.choix)||o.choix.length<2||new Set(o.choix).size!==o.choix.length)err(id,'au moins 2 formes, toutes différentes');
  else if(!Number.isInteger(o.bonne)||o.bonne<0||o.bonne>=o.choix.length)err(id,'bonne hors des choix');});
noDup('ortho','phrase');

const THEMES=['histoire','sciences','philo','eco','politique','lettres','sport','nature','vivre'];
B.textes.forEach((t,i)=>{
  const id=t.id||`textes[${i}]`;
  if(!str(t.id))err(id,'id manquant');else if(ids.has(t.id))err(id,'id déjà utilisé');else ids.add(t.id);
  for(const f of ['titre','texte','th'])if(!str(t[f]))err(id,`champ « ${f} » vide`);
  if(i>=ANCIENNES.textes){if(!str(t.src))err(id,'src obligatoire pour un nouveau texte');if(!date(t.vu))err(id,'vu obligatoire (AAAA-MM-JJ) pour un nouveau texte');}
  const n=(String(t.texte).match(/\S+/g)||[]).length; if(n<90||n>200)err(id,`${n} mots : un texte de lecture fait entre 90 et 200 mots`);
  String(t.th).split(' ').forEach(x=>{if(!THEMES.includes(x))err(id,`thème inconnu : ${x}`);});
  if(!Array.isArray(t.quiz)||t.quiz.length!==3)err(id,'il faut exactement 3 questions (un fait, le sens, un mot)');
  else t.quiz.forEach(([qq,opts,ex],k)=>{if(!str(qq)||!Array.isArray(opts)||opts.length<3||new Set(opts).size!==opts.length||!opts.every(str))err(id,`question ${k+1} : au moins 3 réponses, toutes différentes (la bonne en premier)`);
    if(!str(ex))err(id,`question ${k+1} : une courte explication tirée du texte`);});
  // un extrait de Wikisource renvoie à sa page, et seulement à Wikisource
  if(/wikisource/.test(t.src||'')&&!/^https:\/\/fr\.wikisource\.org\/wiki\/\S+$/.test(t.lien||''))err(id,'lien vers la page fr.wikisource.org manquant ou invalide');
  if(t.lien!=null&&!/^https:\/\/fr\.wikisource\.org\/wiki\/\S+$/.test(t.lien))err(id,'lien : seulement une page fr.wikisource.org');
  if(!Array.isArray(t.idees)||t.idees.length!==3||!t.idees.every(str))err(id,'il faut exactement 3 idées clés');
});
noDup('textes','titre');

// graphiques : chaque valeur affichée doit tenir dans l'axe, dans la version piégée comme dans la version honnête
B.graphiques.forEach((g,i)=>{
  const id=common('graphiques',g,i,['titre','expl']);
  if(!B.pieges[g.piege])err(id,`piège inconnu : ${g.piege}`);
  for(const [nom,v] of [['piégée',g],['honnête',Object.assign({},g,g.corr||{})]]){
    if(!['barres','courbe'].includes(v.type))err(id,`${nom} : type barres ou courbe`);
    if(!Array.isArray(v.x)||!v.x.length)err(id,`${nom} : x vide`);
    if(!(v.ymin<v.ymax))err(id,`${nom} : ymin doit être inférieur à ymax`);
    if(v.xnum&&v.xnum.length!==v.x.length)err(id,`${nom} : xnum et x de longueurs différentes`);
    if(v.fenetre&&!(v.fenetre[0]>=0&&v.fenetre[1]<v.x.length&&v.fenetre[0]<v.fenetre[1]))err(id,`${nom} : fenêtre hors des données`);
    for(const x of v.s||[]){
      if(x.v.length!==v.x.length)err(id,`${nom} : une série n'a pas autant de valeurs que d'étiquettes`);
      let t=0; let vals=v.cumul?x.v.map(y=>t+=y):x.v; if(v.fenetre)vals=vals.slice(v.fenetre[0],v.fenetre[1]+1);
      const [a,b]=x.axe==='d'?[v.ymin2,v.ymax2]:[v.ymin,v.ymax];
      if(!(a<b))err(id,`${nom} : axe de droite sans bornes`);
      if(vals.some(y=>!(y>=a&&y<=b)))err(id,`${nom} : une valeur sort de l'axe (${a} à ${b})`);
    }
  }
  if(g.piege!=='honnete'&&g.piege!=='axes'&&!g.corr)warn(id,'pas de version honnête à montrer');
});
if(!B.graphiques.some(g=>g.piege==='honnete'))warn('graphiques','aucun graphique honnête');

// événements : dates, dix questions au plus, une seule bonne réponse, chaque question sourcée
B.evenements.forEach(ev=>{
  if(!str(ev.id)||!date(ev.du)||!date(ev.au)||!(ev.du<=ev.au))err(ev.id||'evenement','id, du et au (AAAA-MM-JJ, du ≤ au) obligatoires');
  for(const f of ['titre','court','intro'])if(!str(ev[f]))err(ev.id,`champ « ${f} » vide`);
  if(!Array.isArray(ev.badge)||ev.badge.length!==2||!ev.badge.every(str))err(ev.id,'badge : [nom, condition]');
  if(!Array.isArray(ev.questions)||ev.questions.length<5)err(ev.id,'au moins 5 questions');
  (ev.questions||[]).forEach(q=>{
    const id=q.id||ev.id; if(!str(q.id))err(id,'id manquant');else if(ids.has(q.id))err(id,'id déjà utilisé');else ids.add(q.id);
    for(const f of ['q','expl','src'])if(!str(q[f]))err(id,`champ « ${f} » vide`);
    if(!date(q.vu))err(id,'vu obligatoire (AAAA-MM-JJ)');
    if(!Array.isArray(q.options)||q.options.length<2||new Set(q.options).size!==q.options.length)err(id,'au moins 2 options, toutes différentes');
    else if(!Number.isInteger(q.bonne)||q.bonne<0||q.bonne>=q.options.length)err(id,'bonne hors des options');
  });
});

// énigmes du dimanche : un dimanche chacune, sans doublon ; un modèle par énigme dans tools/enquetes/modeles.js,
// énuméré cas par cas : une seule réponse après le cinquième indice, c'est l'option « bonne », et plusieurs encore possibles après le premier
{
  const MOD=require(path.join(__dirname,'enquetes','modeles.js')), dims=new Set();
  (B.enquetes||[]).forEach(e=>{
    const id=e.id||'enquete'; if(!str(e.id))err(id,'id manquant');else if(ids.has(e.id))err(id,'id déjà utilisé');else ids.add(e.id);
    if(!date(e.dim)||new Date(e.dim+'T12:00:00').getDay()!==0)err(id,'dim doit être un dimanche (AAAA-MM-JJ)');
    else if(dims.has(e.dim))err(id,`deux énigmes le même dimanche (${e.dim})`);else dims.add(e.dim);
    for(const f of ['titre','recit','question','solution','lecon','src'])if(!str(e[f]))err(id,`champ « ${f} » vide`);
    if(!date(e.vu))err(id,'vu obligatoire (AAAA-MM-JJ)');
    if(!Array.isArray(e.indices)||e.indices.length!==5||!e.indices.every(str))err(id,'cinq indices attendus');
    if(!Array.isArray(e.options)||e.options.length<3||new Set(e.options).size!==e.options.length)return err(id,'au moins 3 options, toutes différentes');
    if(!Number.isInteger(e.bonne)||e.bonne<0||e.bonne>=e.options.length)return err(id,'bonne hors des options');
    const m=MOD[e.id]; if(!m)return err(id,'pas de modèle dans tools/enquetes/modeles.js');
    if(m.indices.length!==5)return err(id,'le modèle doit avoir cinq indices');
    const sp=m.espace(), rep=k=>[...new Set(sp.filter(w=>m.indices.slice(0,k).every(c=>c(w))).map(m.reponse))];
    const fin=rep(5);
    if(fin.length!==1)err(id,`après les cinq indices, ${fin.length} réponses possibles : ${fin.join(', ')}`);
    else if(fin[0]!==e.options[e.bonne])err(id,`le modèle trouve « ${fin[0]} », l'énigme attend « ${e.options[e.bonne]} »`);
    else if(!e.options.includes(fin[0]))err(id,'la réponse du modèle n’est pas dans les options');
    if(rep(1).length<2)err(id,'la réponse est déjà certaine au premier indice');
  });
}

// parcours de saison : une case par jour compté, des semaines dans l'ordre, une énigme pour chaque dimanche
(B.parcours||[]).forEach(p=>{
  const id=p.id||'parcours';
  if(!str(p.id)||!date(p.du)||!date(p.au)||!(p.du<=p.au))return err(id,'id, du et au (AAAA-MM-JJ, du ≤ au) obligatoires');
  for(const f of ['titre','court','intro','origine'])if(!str(p[f]))err(id,`champ « ${f} » vide`);
  if(!Array.isArray(p.badge)||p.badge.length!==2||!p.badge.every(str))err(id,'badge : [nom, condition]');
  const jours=[]; for(let d=new Date(p.du+'T12:00:00');d<=new Date(p.au+'T12:00:00');d.setDate(d.getDate()+1)){
    const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(p.dimanches||d.getDay()!==0)jours.push(k);
    if(d.getDay()===0&&!(B.enquetes||[]).some(e=>e.dim===k))err(id,`pas d'énigme pour le dimanche ${k}`);
  }
  if(!Array.isArray(p.pas)||p.pas.length!==jours.length)err(id,`${(p.pas||[]).length} cases pour ${jours.length} jours`);
  (p.pas||[]).forEach((c,i)=>{if(!Array.isArray(c)||!str(c[0]))err(id,`case ${i+1} vide`);});
  if(!(p.seuil>0&&p.seuil<=jours.length))err(id,'seuil du badge entre 1 et le nombre de jours');
  const sem=p.semaines||[];
  if(!sem.length||sem[0].du!==p.du)err(id,'la première semaine commence le premier jour');
  sem.forEach((s,i)=>{if(!date(s.du)||!str(s.titre)||!str(s.fil))err(id,`semaine ${i+1} : du, titre et fil obligatoires`);if(i&&!(s.du>sem[i-1].du&&s.du<=p.au))err(id,`semaine ${i+1} hors de l'ordre ou du parcours`);});
});

// bilan : 4 axes, 4 affirmations par axe dont une à l'envers, anciennes positions 0 à 7 toutes présentes ;
// des séries de même taille, chaque axe mesuré autant de fois, une seule bonne réponse, chaque question sourcée
{
  const BL=B.bilan, axes=new Set(BL.axes.map(a=>a.k));
  if(BL.echelle.length!==5)err('bilan','échelle de 5 réponses attendue');
  BL.axes.forEach(a=>{for(const f of ['k','nom','pq','src'])if(!str(a[f]))err('bilan '+(a.k||'?'),`champ « ${f} » vide`);});
  BL.questions.forEach(q=>{
    if(!str(q.id))err('bilan','id manquant');else if(ids.has(q.id))err(q.id,'id déjà utilisé');else ids.add(q.id);
    if(!axes.has(q.axe))err(q.id,`axe inconnu : ${q.axe}`);
    for(const f of ['q','conseil'])if(!str(q[f]))err(q.id,`champ « ${f} » vide`);
  });
  for(const a of axes){const qs=BL.questions.filter(q=>q.axe===a);if(qs.length!==4)err('bilan '+a,`${qs.length} affirmations au lieu de 4`);if(qs.filter(q=>q.inv).length!==1)err('bilan '+a,'une affirmation à l’envers attendue');}
  const olds=BL.questions.filter(q=>q.old!=null).map(q=>q.old).sort((x,y)=>x-y);
  if(olds.join()!=='0,1,2,3,4,5,6,7')err('bilan','les 8 anciennes questions doivent garder leur position (old 0 à 7)');
  const shape=s=>[...axes].map(a=>s.filter(q=>q.axe===a).length).join();
  BL.series.forEach((se,i)=>{
    if(shape(se)!==shape(BL.series[0]))err('bilan série '+(i+1),'pas la même répartition par axe que la série 1');
    se.forEach(q=>{
      if(!str(q.id))err('bilan','id manquant');else if(ids.has(q.id))err(q.id,'id déjà utilisé');else ids.add(q.id);
      if(!axes.has(q.axe))err(q.id,`axe inconnu : ${q.axe}`);
      for(const f of ['q','expl','src'])if(!str(q[f]))err(q.id,`champ « ${f} » vide`);
      if(!date(q.vu))err(q.id,'vu obligatoire (AAAA-MM-JJ)');
      if(!Array.isArray(q.options)||q.options.length<2||new Set(q.options).size!==q.options.length)err(q.id,'au moins 2 options, toutes différentes');
      else if(!Number.isInteger(q.bonne)||q.bonne<0||q.bonne>=q.options.length)err(q.id,'bonne hors des options');
    });
  });
}

// variantes : 500 tirages par modèle, la réponse rédigée doit être celle que l'on retrouve en comptant
const mids=new Set();
for(const m of B.modeles){
  if(mids.has(m.id))err(m.id,'modèle en double');mids.add(m.id);
  if(![1,2,3].includes(m.niv))err(m.id,'niv doit valoir 1, 2 ou 3');
  const qs=new Set();
  for(let k=1;k<=500;k++){
    let g; try{g=m.gen(B.rng(k));}catch(e){err(m.id,`tirage ${k} : ${e.message}`);break;}
    const bad=['q','r','expl','indice'].find(f=>!str(g[f])||/undefined|NaN|null/.test(g[f]));
    if(bad){err(m.id,`tirage ${k} : champ « ${bad} » : ${String(g[bad]).slice(0,80)}`);break;}
    const b=m.brute(g.p);
    if(!(Math.abs(b-g.val)<1e-6)){err(m.id,`tirage ${k} : réponse ${g.val}, recalcul ${b}`);break;}
    qs.add(g.q);
  }
  if(qs.size<3)warn(m.id,`seulement ${qs.size} énoncés différents`);
}

// Sur la carte : coordonnées dans le cadre de la carte, et contrôlées par Wikidata (tools/wikidata/lieux.js) quand le relevé existe
const km=(a,b,c,d)=>{const R=6371,r=Math.PI/180,x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
let releve={}; try{for(const l of require('./wikidata/resultats/lieux.json').lignes)releve[l.titre_demande]=l;}catch(e){}
const CADRE={fr:[41.2,51.3,-5.6,10],monde:[-58,84,-180,180]};
(B.lieux||[]).forEach((l,i)=>{
  const id=common('lieux',l,i,['nom','wp','dit','genre']);
  if(!CADRE[l.carte])return err(id,'carte doit valoir fr ou monde');
  const [a,b,c,d]=CADRE[l.carte];
  if(!(l.lat>a&&l.lat<b&&l.lon>c&&l.lon<d))err(id,'hors de la carte');
  if(!(l.r>=0))err(id,'rayon r manquant');
  const w=releve[l.wp]; if(!w||w.lat==null){if(Object.keys(releve).length)warn(id,`${l.nom} : pas de coordonnées Wikidata pour « ${l.wp} »`);return;}
  const e=km(l.lat,l.lon,w.lat,w.lon), tol=Math.max(l.r,l.carte==='fr'?12:40);
  if(e>tol)err(id,`${l.nom} : ${Math.round(e)} km d'écart avec Wikidata (${w.lat}, ${w.lon})`);
});
noDup('lieux','nom');

const n=k=>B[k].filter(x=>!x.retire).length;
console.log(`Banques : ${n('problemes')} problèmes, ${n('sophismes')} arguments, ${n('erreursIA')} erreurs d'IA, ${n('fermi')} estimations, ${n('ortho')} phrases, ${n('textes')} textes, ${n('graphiques')} graphiques, ${B.modeles.length} modèles de variantes, ${B.bilan.series.length} séries de bilan, ${(B.enquetes||[]).length} énigmes du dimanche, ${(B.parcours||[]).length} parcours de saison, ${(B.lieux||[]).length} lieux sur la carte.`);
warns.forEach(w=>console.log('Attention · '+w));
if(errs.length){errs.forEach(e=>console.error('Erreur · '+e));console.error(`${errs.length} erreur(s) : à corriger avant de publier.`);process.exit(1);}
console.log('Tout est en ordre.');
