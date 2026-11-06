// Vidéo de l’accueil des testeurs (public/videos/testeurs.mp4) : enregistrement Playwright de l’appli servie en local
// (python3 -m http.server 8765 dans public/), puis découpe et musique avec ffmpeg :
//   ffmpeg -ss 2.6 -to 97.5 -i brut.webm -i musique.wav -filter_complex "[0:v]crop=390:844:0:0,fps=30[v];[1:a]volume=0.8[a]" -map "[v]" -map "[a]" -c:v libx264 -crf 24 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 96k -shortest testeurs.mp4
// T = dossier contenant supabase-js (npm pack @supabase/supabase-js@2.117.3) et html2canvas (npm pack html2canvas@1.4.1).
const {chromium}=require('playwright');
const T='/tmp/claude-0/-home-user-brain-fit/ed503eff-f1f1-56a2-af1f-4ac0874a9a5a/scratchpad/t/';
const OUT=__dirname+'/';
const W=390,H=844;
// PDF1, PDF2 : premières pages de fiche-du-jour-cerf.pdf et cahier-sophismes.pdf (pdftoppm -r 70), en data URL
const PDF1='data:image/png;base64,'+require('fs').readFileSync(__dirname+'/pdf1.png').toString('base64'), PDF2='data:image/png;base64,'+require('fs').readFileSync(__dirname+'/pdf2.png').toString('base64');
const day=i=>new Date(Date.now()-864e5*i).toISOString().slice(0,10);
const exs=['calc','erreuria','write','ortho','sophisme','chrono'];
const results=[],days={};
for(let i=12;i>=1;i--){const d=day(i);days[d]={done:{},habits:{}};for(let k=0;k<3;k++){const ex=exs[(i+k)%exs.length];results.push({t:Date.now()-864e5*i+k*6e5,d,ex,s:60+((i*7+k*13)%40)});days[d].done[ex]=true;}}
const ST={v:1,bilans:[{t:Date.now()-864e5*13,s:50},{t:Date.now()-864e5*6,s:58}],settings:{minutes:10,stagName:'Aristote'},days,results,sas:[],weeks:{},lastLevel:3};
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:2,recordVideo:{dir:OUT+'raw',size:{width:W*2,height:H*2}}});
 const p=await ctx.newPage();
 p.on('pageerror',e=>console.log('ERR',e.message));
 await p.route(/cdn\.jsdelivr\.net\/npm\/@supabase/,r=>r.fulfill({status:200,contentType:'application/javascript',path:T+'pkg/package/dist/umd/supabase.js'}));
 await p.route(/cdn\.jsdelivr\.net\/npm\/html2canvas/,r=>r.fulfill({status:200,contentType:'application/javascript',path:T+'h2c/package/dist/html2canvas.min.js'}));
 await p.route('**/*.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
 await p.addInitScript(st=>{
  if(!sessionStorage.getItem('rec')){sessionStorage.setItem('rec','1');localStorage.clear();localStorage.setItem('brainfit.v1',st);}
  localStorage.setItem('brainfit.welcome','1');localStorage.setItem('brainfit.testeur','1');sessionStorage.setItem('brainfit.splash','1');sessionStorage.setItem('brainfit.later','1');
  addEventListener('DOMContentLoaded',()=>{
   const css=document.createElement('style');css.textContent='.evpop,.toast,#syncwarn,#themes-ask{display:none!important}';document.head.append(css);
   const f=document.createElement('div');f.id='finger';f.style.cssText='position:fixed;z-index:9999;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(58,93,191,.28);border:2px solid rgba(58,93,191,.55);pointer-events:none;opacity:0;transition:opacity .2s,transform .15s';document.body.append(f);
   const mv=e=>{f.style.left=e.clientX+'px';f.style.top=e.clientY+'px';};addEventListener('pointermove',mv,true);
   addEventListener('pointerdown',e=>{mv(e);f.style.opacity=1;f.style.transform='scale(.8)';},true);addEventListener('pointerup',()=>{f.style.transform='';setTimeout(()=>f.style.opacity=0,350);},true);});
 },JSON.stringify(ST));
 await p.goto('http://localhost:8765/index.html');await p.waitForTimeout(1500);
 const cap=async(t,ms=2600)=>{await p.evaluate(t=>{let c=document.getElementById('cap');if(!c){c=document.createElement('div');c.id='cap';c.style.cssText='position:fixed;z-index:9998;left:14px;right:14px;bottom:88px;padding:12px 16px;border-radius:14px;background:rgba(36,33,28,.9);color:#FAF2DE;font:600 19px/1.3 "EB Garamond",Georgia,serif;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.25);transition:opacity .35s,transform .35s;opacity:0;transform:translateY(8px)';document.body.append(c);}
   c.innerHTML=t;requestAnimationFrame(()=>{c.style.opacity=1;c.style.transform='none';});},t);await p.waitForTimeout(ms);};
 const uncap=async()=>{await p.evaluate(()=>{const c=document.getElementById('cap');if(c){c.style.opacity=0;}});await p.waitForTimeout(300);};
 const card=async(html,ms)=>{await p.evaluate(h=>{let c=document.getElementById('card');if(!c){c=document.createElement('div');c.id='card';document.body.append(c);}
   const stag=(document.querySelector('#stag svg')||{}).outerHTML||'';
   c.style.cssText='position:fixed;inset:0;z-index:9997;background:#F6EFE0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;gap:14px;color:#24211C;font-family:"EB Garamond",Georgia,serif;opacity:0;transition:opacity .6s';
   c.innerHTML='<div style="width:150px;height:150px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px #E2D6BC,0 0 0 9px #F3E6C4,0 0 0 10px #D9B44A;display:grid;place-items:center;margin-bottom:12px"><div style="width:120px;height:120px">'+stag+'</div></div>'+h;
   const s=c.querySelector('svg');if(s){s.setAttribute('width','120');s.setAttribute('height','120');}
   requestAnimationFrame(()=>c.style.opacity=1);},html);await p.waitForTimeout(ms);};
 const uncard=async()=>{await p.evaluate(()=>{const c=document.getElementById('card');c.style.opacity=0;setTimeout(()=>c.remove(),650);});await p.waitForTimeout(700);};
 const tap=async(loc)=>{await loc.evaluate(e=>{const r=e.getBoundingClientRect();if(r.top<70||r.bottom>innerHeight-90)e.scrollIntoView({block:'center',behavior:'smooth'});});await p.waitForTimeout(500);const bb=await loc.boundingBox();await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2,{steps:10});await p.waitForTimeout(160);await p.mouse.down();await p.waitForTimeout(90);await p.mouse.up();};
 const scroll=async(dy,ms=1400)=>{await p.evaluate(([dy,ms])=>{const s=scrollY,t0=performance.now();const f=t=>{const k=Math.min(1,(t-t0)/ms);scrollTo(0,s+dy*(k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2));if(k<1)requestAnimationFrame(f);};requestAnimationFrame(f);},[dy,ms]);await p.waitForTimeout(ms+200);};
 const tab=async t=>{await tap(p.locator(`.tabs button[data-tab="${t}"]`));await p.waitForTimeout(900);};
 const top=async()=>{await p.evaluate(()=>scrollTo(0,0));};
 const toView=async id=>{await p.evaluate(id=>{const v=document.getElementById(id);if(!v)return;const y=v.getBoundingClientRect().top+scrollY-6,s=scrollY,t0=performance.now();const f=t=>{const k=Math.min(1,(t-t0)/700);scrollTo(0,s+(y-s)*k*(2-k));if(k<1)requestAnimationFrame(f);};requestAnimationFrame(f);},id);await p.waitForTimeout(800);};
 const T0=Date.now();const mark=n=>console.log(n,((Date.now()-T0)/1000).toFixed(1));
 // 0. ouverture
 mark('intro');
 await card('<div style="font:600 13px/1 Cinzel,serif;letter-spacing:.2em;color:#9A7420;border:1px solid #D9B44A;border-radius:99px;padding:7px 16px;background:#F3E6C4">AVANT-PREMIÈRE</div><div style="font:700 34px/1.15 Cinzel,serif;letter-spacing:.04em">Bienvenue<br>parmi les testeurs</div><div style="font-style:italic;font-size:22px;color:#5C5547">Aiguise ton esprit, reste libre.</div>',4200);
 await uncard();
 // 0 bis. l'objectif, en trois temps
 mark('objectif');
 await p.evaluate(()=>{const c=document.createElement('div');c.id='obj';
  c.style.cssText='position:fixed;inset:0;z-index:9997;background:#F6EFE0;display:flex;flex-direction:column;justify-content:center;padding:34px;gap:26px;color:#24211C;font-family:"EB Garamond",Georgia,serif;opacity:0;transition:opacity .6s';
  const L=[['I','L’IA écrit, résume, répond à ta place.'],['II','Garde la main : écris, raisonne, vérifie par toi-même.'],['III','Puis lève les yeux de l’écran : un livre, une feuille, une conversation.']];
  c.innerHTML='<div style="font:600 13px/1 Cinzel,serif;letter-spacing:.2em;color:#9A7420;text-align:center">NOTRE ESPRIT</div>'+L.map((l,i)=>'<div class="ol" style="display:flex;gap:16px;align-items:baseline;opacity:0;transform:translateY(10px);transition:opacity .7s,transform .7s"><span style="font:700 22px/1 Cinzel,serif;color:#B08A2E;min-width:42px">'+l[0]+'</span><span style="font-size:25px;line-height:1.3">'+l[1]+'</span></div>').join('')+'<div class="ol" style="text-align:center;font:600 17px/1.3 Cinzel,serif;letter-spacing:.06em;color:#3A5DBF;opacity:0;transition:opacity .8s;margin-top:6px">Aiguise ton esprit, reste libre.</div>';
  document.body.append(c);requestAnimationFrame(()=>c.style.opacity=1);
  [...c.querySelectorAll('.ol')].forEach((e,i)=>setTimeout(()=>{e.style.opacity=1;e.style.transform='none';},700+i*2300));});
 await p.waitForTimeout(700+3*2300+2600);
 await p.evaluate(()=>{const c=document.getElementById('obj');c.style.opacity=0;setTimeout(()=>c.remove(),650);});await p.waitForTimeout(700);
 // 1. aujourd'hui
 mark('aujourdhui');
 await cap('Chaque jour, ta séance :<br>dix minutes pour écrire et raisonner',3000);
 await scroll(380,1600);await p.waitForTimeout(600);await scroll(-380,1000);await uncap();
 // 2. un exercice
 mark('exercice');
 await tab('exercices');
 await cap('Des exercices courts et exigeants,<br>rangés en cinq familles',2800);
 await scroll(700,2400);await uncap();await top();
 // géographie
 mark('carte');
 await p.evaluate(()=>[...document.querySelectorAll('.excard')].find(c=>c.querySelector('h3').textContent==='Sur la carte').click());await p.waitForTimeout(900);
 await tap(p.locator('#arena button:text-is("Commencer")'));await p.waitForTimeout(1000);
 await p.evaluate(()=>document.querySelector('#arena .carte-svg').scrollIntoView({block:'center',behavior:'smooth'}));await p.waitForTimeout(700);
 await cap('Géographie : place villes, fleuves<br>et pays disparus sur la carte',2600);
 {const pts=await p.$$eval('#arena .carte-svg circle, #arena .carte-svg [role=button], #arena .carte-svg .pt',xs=>xs.map(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,c:e.getAttribute('class')||e.tagName};}).filter(o=>o.w>8));
  console.log('points',JSON.stringify(pts.slice(0,6)));
  const q=pts[1]||pts[0];if(q){await p.mouse.move(q.x,q.y,{steps:12});await p.waitForTimeout(150);await p.mouse.down();await p.waitForTimeout(80);await p.mouse.up();await p.waitForTimeout(900);}}
 const val=p.locator('#arena button:text-is("Valider")');if(await val.count()&&await val.isEnabled()){await tap(val);await p.waitForTimeout(2600);}else{console.log('pas de valider');await p.waitForTimeout(1500);}
 await uncap();
 // fiches papier
 mark('pdf');
 await p.evaluate(()=>location.hash='exercices');await p.waitForTimeout(700);
 await p.evaluate(()=>[...document.querySelectorAll('.excard')].find(c=>c.querySelector('h3').textContent==='Fiche papier').click());await p.waitForTimeout(900);await p.evaluate(()=>scrollTo(0,0));
 await cap('Des fiches et des cahiers en PDF<br>à imprimer : stylo, papier, corrigé à la fin',2600);
 await p.evaluate(([a,b])=>{const c=document.createElement('div');c.id='pdfs';c.style.cssText='position:fixed;inset:0;z-index:9990;background:rgba(36,33,28,.55);opacity:0;transition:opacity .5s';
   const im=(src,r,x,y,d)=>'<img src="'+src+'" style="position:absolute;width:265px;left:'+x+'px;top:'+y+'px;box-shadow:0 12px 30px rgba(0,0,0,.35);border-radius:3px;transform:rotate('+r+'deg) translateY(40px);opacity:0;transition:transform .8s '+d+'s,opacity .8s '+d+'s">';
   c.innerHTML=im(b,6,100,170,.5)+im(a,-4,24,120,0);document.body.append(c);
   requestAnimationFrame(()=>{c.style.opacity=1;c.querySelectorAll('img').forEach(i=>{i.style.opacity=1;i.style.transform=i.style.transform.replace('translateY(40px)','translateY(0)');});});},[PDF1,PDF2]);
 await p.waitForTimeout(4200);await uncap();
 await p.evaluate(()=>{const c=document.getElementById('pdfs');c.style.opacity=0;setTimeout(()=>c.remove(),600);});await p.waitForTimeout(600);
 await p.evaluate(()=>location.hash='exercices');await p.waitForTimeout(700);
 await p.evaluate(()=>{const c=[...document.querySelectorAll('.excard')].find(c=>/Énigme du jour/.test(c.querySelector('h3').textContent));c.scrollIntoView({block:'center'});});await p.waitForTimeout(500);
 await p.evaluate(()=>[...document.querySelectorAll('.excard')].find(c=>c.querySelector('h3').textContent==='Énigme du jour').click());await p.waitForTimeout(900);
  await tap(p.locator('#arena button:text-is("Commencer")'));await p.waitForTimeout(800);
 await cap('L’énigme du jour : la même pour tout le monde',2400);await uncap();
 for(let q=0;q<2;q++){await p.waitForTimeout(900);
  await tap(p.locator('#arena .options button').nth(q));await p.waitForTimeout(1500);
  const c=p.locator('.contest-go:visible');
  if(q===1&&await c.count()){await c.first().evaluate(e=>e.scrollIntoView({block:'center',behavior:'smooth'}));await p.waitForTimeout(600);
     await cap('Une réponse te semble fausse ?<br>Touche « ⚑ Une erreur dans la réponse ? »',3400);await tap(c.first());await p.waitForTimeout(1800);await uncap();}
  else{if(q===1)console.log('pas de contest');await tap(p.locator('#arena .btn.primary:visible'));}}
 // 3. amis
 mark('amis');
 await tab('amis');await toView('v-amis');await cap('Ton cercle : classement, défis et duels<br>entre amis',3200);await scroll(450,1800);await uncap();await top();
 // 4. bilan
 mark('bilan');
 await tab('progres');await toView('v-progres');await cap('Ton bilan : niveaux, badges<br>en pièces d’époque',3200);await scroll(600,2200);await uncap();await top();
 // 5. mon cerf
 mark('cerf');
 await tap(p.locator('#go-settings'));await p.waitForTimeout(900);await toView('v-reglages');
 await cap('Ton cerf grandit avec toi :<br>parures, saisons, attributs',3200);await scroll(300,1400);await uncap();await top();
 // 6. bibliothèque
 mark('biblio');
 await tap(p.locator('#go-biblio'));await p.waitForTimeout(1200);await toView('v-conseils');
 await cap('Une bibliothèque pour apprendre<br>à apprendre',2800);await scroll(500,1800);await uncap();await top();
 // 7. signaler
 mark('signaler');
 await tab('aujourdhui');await top();await p.waitForTimeout(400);
 await cap('Un souci, une idée ? Le drapeau, en haut',2400);
 await tap(p.locator('#go-report'));await p.waitForTimeout(2200);
 const ta=p.locator('.rp-wrap textarea');if(await ta.count()){await ta.click();await p.keyboard.type('Le bouton Valider ne répond pas sur mon téléphone.',{delay:45});}
 await cap('Une capture de l’écran part avec ton mot.<br>On lit tout.',3600);await uncap();
 await p.keyboard.press('Escape');await p.waitForTimeout(700);
 // 8. fin
 mark('fin');
 await card('<div style="font:700 30px/1.2 Cinzel,serif">Merci d’en être !</div><div style="font-size:21px;color:#5C5547;max-width:300px;line-height:1.35">Une séance par jour, deux semaines,<br>et dis-nous tout.</div><div style="font:600 15px/1 Cinzel,serif;letter-spacing:.16em;color:#9A7420;margin-top:10px">ΧΑΛΕΠΑ ΤΑ ΚΑΛΑ</div><div style="font-style:italic;font-size:17px;color:#5C5547">Les belles choses sont difficiles.</div>',4800);
 mark('end');
 const v=p.video();await ctx.close();await v.saveAs(OUT+'brut.webm');await b.close();
})();
