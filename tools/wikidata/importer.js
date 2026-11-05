// Interroge Wikidata (query.wikidata.org, données CC0) avec chaque requête SPARQL de requetes/*.rq,
// lancé par l'action « Importer Wikidata et Gallica ». Résultat : resultats/<nom>.json (lignes simplifiées) + _rapport.txt.
const fs=require('fs'), path=require('path');
const UA={'User-Agent':'Neophyte/1.0 (https://github.com/YohanDK/Brain-Fit)','Accept':'application/sparql-results+json'};
const dq=path.join(__dirname,'requetes'), out=path.join(__dirname,'resultats'); fs.mkdirSync(out,{recursive:true});
const val=b=>b==null?null:b.datatype&&/decimal|integer|double/.test(b.datatype)?+b.value:b.value.replace(/^http:\/\/www\.wikidata\.org\/entity\//,'');
(async()=>{
  const rapport=[];
  for(const f of fs.readdirSync(dq).filter(f=>f.endsWith('.rq')).sort()){
    try{
      const q=fs.readFileSync(path.join(dq,f),'utf8');
      const r=await fetch('https://query.wikidata.org/sparql',{method:'POST',headers:{...UA,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({query:q})});
      if(!r.ok)throw new Error(r.status+' '+(await r.text()).slice(0,300));
      const j=await r.json(), vars=j.head.vars;
      const lignes=j.results.bindings.map(b=>Object.fromEntries(vars.map(v=>[v,val(b[v])])));
      fs.writeFileSync(path.join(out,f.replace('.rq','.json')),JSON.stringify({requete:f,source:'Wikidata (CC0), query.wikidata.org',recupere:new Date().toISOString().slice(0,10),lignes},null,0).replace(/\},\{/g,'},\n{'));
      rapport.push(`ok ${f} : ${lignes.length} lignes`);
    }catch(e){rapport.push(`ERREUR ${f} : ${e.message}`);}
    await new Promise(s=>setTimeout(s,2000));
  }
  fs.writeFileSync(path.join(out,'_rapport.txt'),rapport.join('\n')+'\n'); console.log(rapport.join('\n'));
})();
