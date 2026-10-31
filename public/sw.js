// Néophyte hors ligne : on prend toujours la version en ligne si possible, sinon la dernière gardée.
const CACHE='brainfit-v3';
const SHELL=['./','./config.js','./services.js','./banques.js','./vendor/supabase-2.117.3.js','./fonts/fonts.css','./fonts/EBGaramond-latin.woff2','./fonts/Cinzel-latin.woff2','./manifest.webmanifest','./icon-192.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request, u=new URL(r.url);
  // les données et le coach ne passent jamais par le cache
  if(r.method!=='GET'||u.hostname.endsWith('.supabase.co'))return;
  // tout est servi par le site lui-même (polices et bibliothèques comprises) : rien d'autre n'est gardé
  if(u.origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy));}
    return res;
  }).catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('./'):undefined))));
});
