// Modèles des énigmes du dimanche (B.enquetes dans public/banques.js).
// Pour chaque énigme : l'espace de tous les cas possibles, un prédicat par indice (dans l'ordre),
// et la réponse d'un cas (le texte exact d'une option). Le vérificateur énumère tous les cas et contrôle :
// une seule réponse après les cinq indices, et c'est l'option « bonne » ; plusieurs réponses encore possibles après le premier.
const perms=a=>a.length<=1?[a]:a.flatMap((x,i)=>perms([...a.slice(0,i),...a.slice(i+1)]).map(p=>[x,...p]));
const prod=(...ds)=>ds.reduce((acc,d)=>acc.flatMap(a=>d.map(x=>[...a,x])),[[]]);
const assign=(noms,vals)=>perms(vals).map(p=>Object.fromEntries(noms.map((n,i)=>[n,p[i]])));
const qui=(w,v)=>Object.keys(w).find(k=>w[k]===v);

const M={};

// Le carnet de la réserve : pièces L (lecture), R (réserve), K (cafétéria), Q (accueil)
M.eq01={espace:()=>assign(['Anne','Bruno','Claire','David'],['L','R','K','Q']),
  indices:[w=>w.Anne!=='K'&&w.Anne!=='Q', w=>w.Anne!=='R'||w.Bruno==='K', w=>w.Bruno!=='K', w=>w.Claire==='Q'||w.Claire==='L', w=>w.David==='K'],
  reponse:w=>qui(w,'R')};

// Les gardiens du phare : sincères (vrai) ou menteurs, le coupable ment
M.eq02={espace:()=>prod([true,false],[true,false],[true,false],['Albéric','Bertille','Corentin'])
    .map(([a,b,c,x])=>({S:{Albéric:a,Bertille:b,Corentin:c},x})).filter(w=>!w.S[w.x]),
  indices:(()=>{const dit=(w,p,v)=>w.S[p]===v;return[
    w=>dit(w,'Albéric',w.x!=='Albéric'), w=>dit(w,'Bertille',!w.S.Albéric), w=>dit(w,'Corentin',!w.S.Bertille),
    w=>dit(w,'Albéric',w.x==='Corentin'), w=>dit(w,'Corentin',w.x==='Bertille')];})(),
  reponse:w=>w.x};

// Le cadenas de la malle : trois chiffres différents ; « bien placés / mal placés »
M.eq03=(()=>{const sp=[];for(let a=0;a<10;a++)for(let b=0;b<10;b++)for(let c=0;c<10;c++)if(a!==b&&b!==c&&a!==c)sp.push([a,b,c]);
  const essai=(g,bien,mal)=>w=>g.filter((d,i)=>w[i]===d).length===bien&&g.filter((d,i)=>w[i]!==d&&w.includes(d)).length===mal;
  return{espace:()=>sp,indices:[essai([2,5,9],0,0),essai([7,1,3],0,2),essai([4,6,8],1,0),essai([1,4,0],0,2),essai([0,7,1],2,0)],reponse:w=>w.join(' ')};})();

// Les veilleurs de nuit : numéro du quart (1 = 20 h-22 h … 4 = 2 h-4 h)
M.eq04={espace:()=>assign(['Gaspard','Hector','Isidore','Jules'],[1,2,3,4]),
  indices:[w=>w.Gaspard<w.Hector, w=>w.Jules===w.Gaspard+1, w=>w.Isidore<w.Hector, w=>w.Isidore!==1&&w.Isidore!==4, w=>w.Hector===4],
  reponse:w=>qui(w,3)};

// La crèche : le coupable ment, les trois autres disent vrai
M.eq05={espace:()=>['Agathe','Basile','Clément','Diane'].map(x=>({x})),
  indices:(()=>{const dit=(w,p,v)=>(p===w.x)?!v:v, basile=w=>w.x==='Clément'||w.x==='Diane';return[
    w=>dit(w,'Agathe',w.x!=='Agathe'), w=>dit(w,'Basile',basile(w)), w=>dit(w,'Clément',basile(w)&&w.x!=='Basile'),
    w=>dit(w,'Diane',w.x==='Agathe'), w=>dit(w,'Agathe',w.x!=='Agathe')];})(),
  reponse:w=>w.x};

// Les cadeaux de Noël
M.eq06={espace:()=>assign(['Léa','Marc','Nina','Oscar'],['livre','violon','échecs','globe']),
  indices:[w=>w.Léa==='violon'||w.Léa==='échecs', w=>w.Marc!=='échecs'||w.Nina==='livre', w=>w.Nina!=='livre', w=>w.Marc!=='globe'&&w.Marc!=='livre', w=>w.Oscar==='livre'],
  reponse:w=>qui(w,'violon')};

// Les lettres de Noël : chacun écrit à un autre, chacun reçoit une lettre
M.eq07=(()=>{const P=['Élise','Fabien','Gabrielle','Henri'], fille=x=>x==='Élise'||x==='Gabrielle';
  return{espace:()=>assign(P,P).filter(w=>P.every(x=>w[x]!==x)),
  indices:[w=>P.every(x=>w[w[x]]!==x), w=>w.Fabien!=='Henri', w=>!fille(w.Gabrielle), w=>w.Fabien!=='Élise', w=>w.Henri==='Élise'],
  reponse:w=>w.Élise};})();

// Les santonniers du marché : une ville et un santon par personne
M.eq08=(()=>{const P=['Margaux','Noé','Rose'];
  return{espace:()=>assign(P,['Aubagne','Aix','Marseille']).flatMap(v=>assign(P,['berger','meunier','ravi']).map(s=>({v,s}))),
  indices:[w=>w.v.Noé==='Marseille', w=>w.v.Rose!=='Aix'&&w.s.Rose!=='meunier', w=>w.v[qui(w.s,'meunier')]==='Aix', w=>w.s[qui(w.v,'Aubagne')]!=='berger', w=>w.s.Margaux!=='berger'],
  reponse:w=>qui(w.s,'ravi')};})();

module.exports=M;
if(require.main===module){
  for(const[id,m] of Object.entries(M)){const sp=m.espace();
    console.log(id,m.indices.map((_,k)=>{const s=sp.filter(w=>m.indices.slice(0,k+1).every(c=>c(w)));return new Set(s.map(m.reponse)).size;}).join(' '),
      [...new Set(sp.filter(w=>m.indices.every(c=>c(w))).map(m.reponse))]);}
}
