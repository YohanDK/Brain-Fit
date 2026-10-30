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
const ANCIENNES={problemes:42,sophismes:40,erreursIA:26,fermi:30,ortho:61};

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
console.log(`Banques : ${n('problemes')} problèmes, ${n('sophismes')} arguments, ${n('erreursIA')} erreurs d'IA, ${n('fermi')} estimations, ${n('ortho')} phrases, ${B.modeles.length} modèles de variantes.`);
warns.forEach(w=>console.log('Attention · '+w));
if(errs.length){errs.forEach(e=>console.error('Erreur · '+e));console.error(`${errs.length} erreur(s) : à corriger avant de publier.`);process.exit(1);}
console.log('Tout est en ordre.');
