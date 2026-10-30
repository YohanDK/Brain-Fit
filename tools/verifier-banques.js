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
const ANCIENNES={problemes:42,sophismes:40,erreursIA:26,fermi:30,ortho:61,textes:6,graphiques:0};

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

const THEMES=['histoire','sciences','philo','eco','politique','lettres','sport','nature'];
B.textes.forEach((t,i)=>{
  const id=t.id||`textes[${i}]`;
  if(!str(t.id))err(id,'id manquant');else if(ids.has(t.id))err(id,'id déjà utilisé');else ids.add(t.id);
  for(const f of ['titre','texte','th'])if(!str(t[f]))err(id,`champ « ${f} » vide`);
  if(i>=ANCIENNES.textes){if(!str(t.src))err(id,'src obligatoire pour un nouveau texte');if(!date(t.vu))err(id,'vu obligatoire (AAAA-MM-JJ) pour un nouveau texte');}
  const n=(String(t.texte).match(/\S+/g)||[]).length; if(n<90||n>200)err(id,`${n} mots : un texte de lecture fait entre 90 et 200 mots`);
  String(t.th).split(' ').forEach(x=>{if(!THEMES.includes(x))err(id,`thème inconnu : ${x}`);});
  if(!Array.isArray(t.quiz)||t.quiz.length!==2)err(id,'il faut exactement 2 questions');
  else t.quiz.forEach(([qq,opts],k)=>{if(!str(qq)||!Array.isArray(opts)||opts.length<3||new Set(opts).size!==opts.length||!opts.every(str))err(id,`question ${k+1} : au moins 3 réponses, toutes différentes (la bonne en premier)`);});
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

const n=k=>B[k].filter(x=>!x.retire).length;
console.log(`Banques : ${n('problemes')} problèmes, ${n('sophismes')} arguments, ${n('erreursIA')} erreurs d'IA, ${n('fermi')} estimations, ${n('ortho')} phrases, ${n('textes')} textes, ${n('graphiques')} graphiques, ${B.modeles.length} modèles de variantes.`);
warns.forEach(w=>console.log('Attention · '+w));
if(errs.length){errs.forEach(e=>console.error('Erreur · '+e));console.error(`${errs.length} erreur(s) : à corriger avant de publier.`);process.exit(1);}
console.log('Tout est en ordre.');
