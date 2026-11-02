// Récupère des chiffres officiels (Banque mondiale, Eurostat, Our World in Data, INSEE, data.gouv.fr)
// d'après sources.json, lancé par l'action « Importer les données ». Aucune clé : ces services sont ouverts.
// Chaque série va dans series/<id>.json : {id, libelle, unite, source, url, recupere, points:{pays:[[année,valeur],…]}}.
const fs=require('fs'), path=require('path');
const UA={'User-Agent':'Neophyte/1.0 (https://github.com/YohanDK/Brain-Fit)','Accept':'application/json'};
const out=path.join(__dirname,'series'); fs.mkdirSync(out,{recursive:true});
const today=new Date().toISOString().slice(0,10);
const get=async(url,type='json')=>{const r=await fetch(url,{headers:UA});if(!r.ok)throw new Error(`${r.status} ${url}`);return type==='json'?r.json():r.text();};
const arrondi=v=>v==null?null:Math.abs(v)>=100?Math.round(v):Math.round(v*100)/100;

const lecteurs={
  async banquemondiale(s){
    const url=`https://api.worldbank.org/v2/country/${s.pays}/indicator/${s.indicateur}?format=json&per_page=2000`;
    const j=await get(url); if(!Array.isArray(j)||!j[1])throw new Error('réponse vide : '+JSON.stringify(j).slice(0,200));
    const points={}; for(const o of j[1])if(o.value!=null)(points[o.countryiso3code||o.country.id]??=[]).push([+o.date,arrondi(o.value)]);
    return {source:`Banque mondiale, indicateur ${s.indicateur} (${j[1][0]?.indicator?.value||''})`,url,points};
  },
  async eurostat(s){
    const q=new URLSearchParams({format:'JSON',lang:'FR'});
    for(const [k,v] of Object.entries(s.filtres||{}))for(const x of [].concat(v))q.append(k,x);
    const url=`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${s.jeu}?${q}`;
    const j=await get(url), ids=j.id, size=j.size, geoAt=ids.indexOf('geo'), tAt=ids.indexOf('time');
    const reste=ids.filter((d,i)=>i!==geoAt&&i!==tAt&&size[i]>1);
    if(reste.length)throw new Error('filtre incomplet, plusieurs valeurs pour : '+reste.map(d=>`${d} (${Object.keys(j.dimension[d].category.index).slice(0,8).join(', ')})`).join(' ; '));
    const inv=d=>Object.fromEntries(Object.entries(j.dimension[d].category.index).map(([k,i])=>[i,k]));
    const geos=inv('geo'), times=inv('time'), points={};
    const stride=i=>size.slice(i+1).reduce((a,b)=>a*b,1);
    for(const [flat,v] of Object.entries(j.value)){const f=+flat,g=Math.floor(f/stride(geoAt))%size[geoAt],t=Math.floor(f/stride(tAt))%size[tAt];
      (points[geos[g]]??=[]).push([+String(times[t]).slice(0,4),arrondi(v)]);}
    for(const k in points)points[k].sort((a,b)=>a[0]-b[0]);
    return {source:`Eurostat, jeu ${s.jeu} (${j.label||''})`,url,points};
  },
  async owid(s){
    const url=`https://ourworldindata.org/grapher/${s.graphe}.csv?v=1&csvType=full&useColumnShortNames=false`;
    const lignes=(await get(url,'text')).trim().split('\n'), tete=lignes[0];
    const codes=s.pays.split(';'), points={};
    for(const l of lignes.slice(1)){
      const cols=l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/); if(!codes.includes(cols[1]))continue;
      (points[cols[1]]??=[]).push([+cols[2],arrondi(+cols[3])]);}
    return {source:`Our World in Data, graphique « ${s.graphe} » (colonnes : ${tete})`,url,points};
  },
  async 'insee-catalogue'(s){
    const url='https://api.insee.fr/melodi/catalog/all';
    const j=await get(url), liste=(Array.isArray(j)?j:j.items||j.catalog||[]);
    const txt=liste.map(d=>{const t=d.title||d.titre||d.label;const tt=Array.isArray(t)?(t.find(x=>x.lang==='fr')||t[0]).content:typeof t==='object'&&t?t.fr||Object.values(t)[0]:t;return `${d.identifier||d.id} | ${tt}`;}).join('\n');
    fs.writeFileSync(path.join(out,'_insee-catalogue.txt'),txt||JSON.stringify(j).slice(0,20000));
    return {source:'INSEE, catalogue Melodi',url,points:{},nb:liste.length};
  },
  async 'datagouv-recherche'(s){
    const url=`https://www.data.gouv.fr/api/1/datasets/?${new URLSearchParams({q:s.q,page_size:'8'})}`;
    const j=await get(url);
    const jeux=(j.data||[]).map(d=>({titre:d.title,producteur:d.organization?.name||'',page:d.page,maj:(d.last_update||'').slice(0,10),
      fichiers:(d.resources||[]).slice(0,4).map(r=>({titre:r.title,format:r.format,url:r.url}))}));
    return {source:`data.gouv.fr, recherche « ${s.q} »`,url,points:{},jeux};
  }
};

(async()=>{
  const {series}=JSON.parse(fs.readFileSync(path.join(__dirname,'sources.json'),'utf8')), rapport=[];
  for(const s of series){
    try{
      const lire=lecteurs[s.type]; if(!lire)throw new Error('type inconnu : '+s.type);
      const r=await lire(s);
      fs.writeFileSync(path.join(out,s.id+'.json'),JSON.stringify({id:s.id,libelle:s.libelle,unite:s.unite,recupere:today,...r},null,1).replace(/\[\s+(-?[\d.]+|null),\s+(-?[\d.]+|null)\s+\]/g,'[$1,$2]')+'\n');
      const resume=Object.entries(r.points).map(([k,p])=>{const d=p[p.length-1];return d?`${k} ${p[0][0]}-${d[0]} (${p.length} pts, dernier ${d[1]})`:k;}).join(' ; ');
      rapport.push(`ok ${s.id} : ${resume||(r.jeux?r.jeux.length+' jeux':r.nb!=null?r.nb+' jeux':'')}`);
    }catch(e){rapport.push(`! ${s.id} : ${e.message}`);}
    await new Promise(r=>setTimeout(r,300));
  }
  fs.writeFileSync(path.join(out,'_rapport.txt'),`Récupéré le ${today}\n`+rapport.join('\n')+'\n'); console.log(rapport.join('\n'));
})();
