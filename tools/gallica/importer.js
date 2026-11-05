// Importe des textes du domaine public depuis Gallica (BnF), lancé par l'action « Importer Wikidata et Gallica ».
// liste.txt : « auteur | titre » (recherche SRU, premier résultat en texte) ou « ark:/12148/… » (document précis) ;
// « ? auteur | titre » liste seulement les 10 premiers résultats dans _rapport.txt pour choisir.
// Texte brut OCR (mode texte de Gallica) dans textes/<slug>.txt, 40 000 caractères au plus, avec titre, auteur, date, URL.
const fs=require('fs'), path=require('path');
const UA={'User-Agent':'Neophyte/1.0 (https://github.com/YohanDK/Brain-Fit)'};
const dir=path.join(__dirname,'textes'); fs.mkdirSync(dir,{recursive:true});
const slug=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);
const get=async u=>{const r=await fetch(u,{headers:UA});if(!r.ok)throw new Error(r.status+' '+u);return r.text();};
const tag=(x,t)=>[...x.matchAll(new RegExp(`<dc:${t}>([\\s\\S]*?)</dc:${t}>`,'g'))].map(m=>m[1].trim());
const strip=h=>h.replace(/<(style|script)[\s\S]*?<\/\1>/g,'').replace(/<br\s*\/?>/g,'\n').replace(/<\/(p|div|h\d)>/g,'\n').replace(/<[^>]+>/g,'')
  .replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
const cherche=async(l,n)=>{const [a,t]=l.split('|').map(s=>s.trim());
  const q=`dc.creator all "${a}" and dc.title all "${t}" and dc.type all "monographie"`;
  const x=await get('https://gallica.bnf.fr/SRU?'+new URLSearchParams({operation:'searchRetrieve',version:'1.2',query:q,maximumRecords:String(n)}));
  return x.split('<srw:record>').slice(1).map(r=>({ark:(tag(r,'identifier').find(i=>i.includes('ark:'))||'').replace(/^.*?(ark:\/12148\/[^\s<]+).*$/,'$1'),titre:tag(r,'title')[0]||'',auteur:tag(r,'creator')[0]||'',date:tag(r,'date')[0]||'',droits:tag(r,'rights').join(' ')})).filter(r=>r.ark);};
(async()=>{
  const lines=fs.readFileSync(path.join(__dirname,'liste.txt'),'utf8').split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
  const rapport=[];
  for(const l of lines){
    try{
      if(l.startsWith('?')){const rs=await cherche(l.slice(1),10);rapport.push(`? ${l}\n`+rs.map(r=>`    ${r.ark} | ${r.auteur} | ${r.titre} | ${r.date} | ${r.droits}`).join('\n'));continue;}
      let doc;
      if(l.startsWith('ark:')){doc={ark:l.split(/\s/)[0],titre:l,auteur:'',date:'',droits:''};}
      else{const rs=await cherche(l,1);if(!rs.length){rapport.push(`? ${l} : rien trouvé`);continue;}doc=rs[0];}
      if(/restreint|restricted/i.test(doc.droits)){rapport.push(`× ${l} : accès restreint`);continue;}
      const url='https://gallica.bnf.fr/'+doc.ark;
      const brut=strip(await get(url+'.texteBrut')).slice(0,40000);
      const f=slug((doc.auteur.split(/[,(]/)[0]||'')+' '+(doc.titre||doc.ark))+'.txt';
      fs.writeFileSync(path.join(dir,f),`${doc.titre}\n${doc.auteur} ${doc.date}\n${url}\nTexte : Gallica (BnF), OCR non relu — à vérifier avant usage.\n\n${brut}\n`);
      rapport.push(`ok ${l} -> ${f} (${brut.length} car.) ${doc.auteur} | ${doc.titre} | ${doc.date}`);
    }catch(e){rapport.push(`ERREUR ${l} : ${e.message}`);}
    await new Promise(s=>setTimeout(s,3000));
  }
  fs.writeFileSync(path.join(dir,'_rapport.txt'),rapport.join('\n')+'\n'); console.log(rapport.join('\n'));
})();
