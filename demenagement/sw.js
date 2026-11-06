// Ancienne adresse : on vide le cache hors ligne et on se retire, pour que chaque visite passe par la redirection.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))
  .then(()=>self.registration.unregister()).then(()=>self.clients.matchAll({type:'window'}))
  .then(ws=>ws.forEach(w=>w.navigate(w.url).catch(()=>{})))));
