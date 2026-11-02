// Importe des textes du domaine public depuis fr.wikisource.org (lancé par l'action « Importer Wikisource »).
// Pour chaque ligne « auteur | titre » de liste.txt : recherche, puis texte brut dans textes/<slug>.txt (titre, URL, texte).
const fs=require('fs'), path=require('path');
const API='https://fr.wikisource.org/w/api.php', UA={'User-Agent':'Neophyte/1.0 (https://github.com/YohanDK/Brain-Fit)'};
const dir=path.join(__dirname,'textes'); fs.mkdirSync(dir,{recursive:true});
const slug=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);
const get=async q=>{const r=await fetch(API+'?'+new URLSearchParams({format:'json',formatversion:'2',...q}),{headers:UA});if(!r.ok)throw new Error(r.status);return r.json();};
const strip=h=>h.replace(/<(style|script)[\s\S]*?<\/\1>/g,'').replace(/<span class="pagenum[\s\S]*?<\/span>/g,'').replace(/<sup[\s\S]*?<\/sup>/g,'')
  .replace(/<br\s*\/?>/g,'\n').replace(/<\/(p|div|h\d|li|tr)>/g,'\n').replace(/<[^>]+>/g,'')
  .replace(/&nbsp;|&#160;/g,' ').replace(/&#8239;|&#x202f;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
  .replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
(async()=>{
  const lines=fs.readFileSync(path.join(__dirname,'liste.txt'),'utf8').split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
  const report=[];
  for(const l of lines){
    try{
      const s=await get({action:'query',list:'search',srsearch:l.replace('|',' '),srnamespace:'0',srlimit:'5'});
      const hits=s.query.search.map(h=>h.title); if(!hits.length){report.push(`? ${l} : rien trouvé`);continue;}
      const title=hits[0], p=await get({action:'parse',page:title,prop:'text',redirects:'1'});
      const text=strip(p.parse.text).slice(0,30000);
      const url='https://fr.wikisource.org/wiki/'+encodeURIComponent(p.parse.title.replace(/ /g,'_'));
      fs.writeFileSync(path.join(dir,slug(l)+'.txt'),`# ${p.parse.title}\n# ${url}\n# autres résultats : ${hits.slice(1).join(' ; ')}\n\n${text}\n`);
      report.push(`ok ${l} -> ${p.parse.title} (${text.length} car.)`);
    }catch(e){report.push(`! ${l} : ${e.message}`);}
    await new Promise(r=>setTimeout(r,400));
  }
  fs.writeFileSync(path.join(dir,'_rapport.txt'),report.join('\n')+'\n'); console.log(report.join('\n'));
})();
