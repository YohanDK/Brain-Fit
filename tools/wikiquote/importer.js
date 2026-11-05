// Importe des pages d'auteurs de fr.wikiquote.org (CC BY-SA), lancé par l'action « Importer Wikidata et Gallica ».
// liste.txt : un titre de page exact par ligne. Texte brut dans pages/<slug>.txt (titre, URL, texte, 80 000 caractères au plus).
// Les citations restent à trier à la main : on ne garde que celles dont la référence est précise (œuvre, chapitre, date).
const fs=require('fs'), path=require('path');
const API='https://fr.wikiquote.org/w/api.php', UA={'User-Agent':'Neophyte/1.0 (https://github.com/YohanDK/Brain-Fit)'};
const dir=path.join(__dirname,'pages'); fs.mkdirSync(dir,{recursive:true});
const slug=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);
const get=async q=>{const r=await fetch(API+'?'+new URLSearchParams({format:'json',formatversion:'2',...q}),{headers:UA});if(!r.ok)throw new Error(r.status);return r.json();};
const strip=h=>h.replace(/<(style|script)[\s\S]*?<\/\1>/g,'').replace(/<sup[\s\S]*?<\/sup>/g,'')
  .replace(/<br\s*\/?>/g,'\n').replace(/<\/(p|div|h\d|li|tr|dd|dt)>/g,'\n').replace(/<h(\d)[^>]*>/g,'\n## ').replace(/<li[^>]*>/g,'• ').replace(/<[^>]+>/g,'')
  .replace(/&nbsp;|&#160;/g,' ').replace(/&#8239;|&#x202f;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
  .replace(/\[modifier[^\]]*\]/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
(async()=>{
  const lines=fs.readFileSync(path.join(__dirname,'liste.txt'),'utf8').split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
  const rapport=[];
  for(const t of lines){
    try{const p=await get({action:'parse',page:t,prop:'text',redirects:'1'});if(p.error)throw new Error(p.error.info);
      const text=strip(p.parse.text).slice(0,80000), url='https://fr.wikiquote.org/wiki/'+encodeURIComponent(p.parse.title.replace(/ /g,'_'));
      const f=slug(p.parse.title)+'.txt'; fs.writeFileSync(path.join(dir,f),`${p.parse.title}\n${url}\nTexte : Wikiquote, CC BY-SA\n\n${text}\n`);
      rapport.push(`ok ${t} -> ${f} (${text.length} car.)`);
    }catch(e){rapport.push(`ERREUR ${t} : ${e.message}`);}
    await new Promise(s=>setTimeout(s,1000));
  }
  fs.writeFileSync(path.join(dir,'_rapport.txt'),rapport.join('\n')+'\n'); console.log(rapport.join('\n'));
})();
