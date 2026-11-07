// Régénère public/og.png (aperçu des liens partagés : WhatsApp, SMS, Facebook…) à partir de tools/og/og.html
// et du cerf de public/icon.svg. Après un changement : monter le ?v= de og:image dans public/index.html,
// sinon les messageries gardent l'ancienne image en cache.
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
(async()=>{
  const racine=path.join(__dirname,'..','..');
  // le cerf seul : l'icône sans son fond carré ni son disque
  const icone=fs.readFileSync(path.join(racine,'public','icon.svg'),'utf8');
  const cerf=icone.slice(icone.indexOf('<g clip-path'),icone.lastIndexOf('</svg></svg>'));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath>${cerf}</svg>`;
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  await p.goto('file://'+path.join(__dirname,'og.html'));
  await p.evaluate(s=>{document.getElementById('cerf').innerHTML=s},svg);
  await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:path.join(racine,'public','og.png')});
  await b.close();console.log('public/og.png régénéré');
})();
