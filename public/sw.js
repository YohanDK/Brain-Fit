// Néophyte hors ligne : on prend toujours la version en ligne si possible, sinon la dernière gardée.
const CACHE='brainfit-v2';
const SHELL=['./','./config.js','./services.js','./banques.js','./manifest.webmanifest','./icon-192.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request, u=new URL(r.url);
  // les données et le coach ne passent jamais par le cache
  if(r.method!=='GET'||u.hostname.endsWith('.supabase.co'))return;
  const keep=u.origin===location.origin||/^(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname);
  if(!keep)return;
  e.respondWith(fetch(r).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy));}
    return res;
  }).catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('./'):undefined))));
});
