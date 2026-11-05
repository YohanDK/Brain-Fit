// Récupère naissance et mort (au jour près) de personnes données par leur titre Wikipédia en français (entites.txt),
// via l'API wbgetentities, bien plus rapide que SPARQL. Résultat : resultats/personnes.json.
const fs=require('fs'), path=require('path');
const UA={'User-Agent':'Neophyte/1.0 (https://github.com/YohanDK/Brain-Fit)'};
const titres=fs.readFileSync(path.join(__dirname,'entites.txt'),'utf8').split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
const date=c=>{const v=c?.[0]?.mainsnak?.datavalue?.value;return v?{t:v.time,precision:v.precision,calendrier:/Q1985786/.test(v.calendarmodel)?'julien':'grégorien'}:null;};
(async()=>{
  const lignes=[], manquants=[];
  for(let i=0;i<titres.length;i+=50){
    const lot=titres.slice(i,i+50), u='https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',sites:'frwiki',titles:lot.join('|'),props:'claims|labels|descriptions|sitelinks',languages:'fr',sitefilter:'frwiki',format:'json'});
    const j=await (await fetch(u,{headers:UA})).json(); if(j.error)console.log('erreur API',JSON.stringify(j.error).slice(0,300));
    for(const [q,e] of Object.entries(j.entities||{})){
      if(e.missing!==undefined){manquants.push(e.title);continue;}
      lignes.push({e:q,titre:e.sitelinks?.frwiki?.title,libelle:e.labels?.fr?.value,description:e.descriptions?.fr?.value,naissance:date(e.claims?.P569),mort:date(e.claims?.P570)});
    }
    await new Promise(s=>setTimeout(s,1000));
  }
  fs.writeFileSync(path.join(__dirname,'resultats','personnes.json'),JSON.stringify({source:'Wikidata (CC0), wbgetentities',recupere:new Date().toISOString().slice(0,10),manquants,lignes},null,0).replace(/\},\{"e"/g,'},\n{"e"'));
  console.log(`personnes : ${lignes.length} trouvées, manquantes : ${manquants.join(', ')||'aucune'}`);
})();
