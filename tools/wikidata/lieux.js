// Relève sur Wikidata (CC0) les coordonnées (P625) des lieux de l'exercice « Sur la carte », par leur titre Wikipédia (champ wp
// de B.lieux dans public/banques.js). Résultat : resultats/lieux.json, que tools/verifier-banques.js compare aux coordonnées saisies.
const fs=require('fs'), path=require('path');
require(path.join(__dirname,'..','..','public','banques.js'));
const UA={'User-Agent':'Neophyte/1.0 (https://github.com/YohanDK/Brain-Fit)'};
const titres=[...new Set((globalThis.NEO_BANQUES.lieux||[]).map(l=>l.wp))];
(async()=>{
  const lignes=[], manquants=[];
  for(let i=0;i<titres.length;i+=50){
    const lot=titres.slice(i,i+50), u='https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',sites:'frwiki',titles:lot.join('|'),props:'claims|sitelinks',sitefilter:'frwiki',format:'json'});
    const j=await (await fetch(u,{headers:UA})).json(); if(j.error)console.log('erreur API',JSON.stringify(j.error).slice(0,300));
    // titre demandé ← titre normalisé ← titre de redirection
    const vers=new Map(); for(const n of [...(j.normalized||[]),...(j.redirects||[])])vers.set(n.to,vers.get(n.from)||n.from);
    for(const [q,e] of Object.entries(j.entities||{})){
      if(e.missing!==undefined){manquants.push(e.title);continue;}
      const t=e.sitelinks?.frwiki?.title, c=e.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
      lignes.push({e:q,titre_demande:vers.get(t)||t,titre:t,lat:c?+c.latitude.toFixed(4):null,lon:c?+c.longitude.toFixed(4):null});
    }
    await new Promise(s=>setTimeout(s,1000));
  }
  const vus=new Set(lignes.map(l=>l.titre_demande)); for(const t of titres)if(!vus.has(t)&&!manquants.includes(t))manquants.push(t);
  fs.writeFileSync(path.join(__dirname,'resultats','lieux.json'),JSON.stringify({source:'Wikidata (CC0), wbgetentities, P625',recupere:new Date().toISOString().slice(0,10),manquants,lignes},null,0).replace(/\},\{"e"/g,'},\n{"e"'));
  console.log(`lieux : ${lignes.length} trouvés, ${lignes.filter(l=>l.lat==null).length} sans coordonnées, introuvables : ${manquants.join(', ')||'aucun'}`);
})();
