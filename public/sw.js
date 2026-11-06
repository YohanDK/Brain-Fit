// Néophyte hors ligne : on prend toujours la version en ligne si possible, sinon la dernière gardée.
const CACHE='brainfit-v6';
const SHELL=['./','./config.js','./services.js','./rappels.js','./banques.js','./manifest.webmanifest','./icon-192.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request, u=new URL(r.url);
  // les données et le coach ne passent jamais par le cache
  if(r.method!=='GET'||u.hostname.endsWith('.supabase.co')||/\.mp4$/.test(u.pathname))return;
  const keep=u.origin===location.origin||/^(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)$/.test(u.hostname);
  if(!keep)return;
  e.respondWith(fetch(r).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy));}
    return res;
  }).catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('./'):undefined))));
});

// rappels (voir rappels.js) : afficher la notification reçue, et ouvrir Néophyte quand on la touche
self.addEventListener('push',e=>{
  let d={}; try{d=e.data?e.data.json():{};}catch(x){d={body:e.data&&e.data.text()};}
  e.waitUntil(self.registration.showNotification(d.title||'Néophyte',{body:d.body||'',tag:d.tag||'neophyte',icon:'icon-192.png',badge:'icon-192.png',data:{url:d.url||'./'}}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=new URL((e.notification.data&&e.notification.data.url)||'./',self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{
    const w=ws.find(c=>c.url.startsWith(self.registration.scope));
    // une notification du cercle mène à l'onglet Amis, même si Néophyte est déjà ouvert
    if(!w)return self.clients.openWindow(url);
    return w.focus().then(c=>new URL(url).hash&&c.navigate?c.navigate(url).catch(()=>c):c);
  }));
});
