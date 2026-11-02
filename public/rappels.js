/* Rappels par notification : un réglage « Rappels » dans les Réglages, propre à chaque appareil.
   Tout est dans ce fichier (plus quelques lignes dans sw.js), côté serveur dans supabase/rappels.sql et la fonction « rappels ».
   Pour le cacher : rappels:false dans config.js (les appareils abonnés se désabonnent alors à leur prochaine visite).
   Pour l'enlever : supprimer ce fichier et sa ligne <script> dans index.html. */
(function(){
  const C=window.BF_CONFIG||{}, sb=window.bfSupabase;
  const URL_FN=(C.supabaseUrl||'')+'/functions/v1/rappels';
  const peut='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
  const reg=()=>peut?navigator.serviceWorker.ready:Promise.resolve(null);
  const abonnement=async()=>{const r=await reg();return r?r.pushManager.getSubscription():null;};
  const session=async()=>{if(!sb)return null;try{return (await sb.auth.getSession()).data.session;}catch(e){return null;}};

  // drapeau coupé : on n'affiche rien, et on retire discrètement l'abonnement de cet appareil s'il existe
  if(!C.rappels){
    if(peut&&sb)abonnement().then(async s=>{if(!s)return;try{await sb.from('rappels').delete().eq('endpoint',s.endpoint);}catch(e){}s.unsubscribe().catch(()=>{});}).catch(()=>{});
    return;
  }
  const view=document.getElementById('v-reglages'); if(!view||!sb)return;

  const iOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const installe=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const heures=[];for(let h=6;h<=22;h++)for(const m of ['00','30'])heures.push(String(h).padStart(2,'0')+':'+m);

  const p=document.createElement('div'); p.className='panel'; p.id='rappels-panel';
  p.innerHTML=`<div><h2>Rappels</h2><p class="muted note">Une notification à l’heure choisie, seulement si ta séance du jour n’est pas faite. Si tu le veux, une relance à 21 h quand ta série est en danger.</p></div>
    <div class="row"><span class="note">Sur cet appareil</span><div class="seg" id="rp-seg" role="group" aria-label="Rappels"><button data-r="on" aria-pressed="false">Activés</button><button data-r="off" aria-pressed="true">Coupés</button></div></div>
    <div class="row" id="rp-opts"><label class="note" for="rp-heure">Heure du rappel</label><select id="rp-heure">${heures.map(h=>`<option${h==='19:00'?' selected':''}>${h}</option>`).join('')}</select></div>
    <label class="row" id="rp-serie-l" style="cursor:pointer"><input type="checkbox" id="rp-serie" checked><span class="note">Relance à 21 h si ma série est en danger</span></label>
    <div class="row" id="rp-essai-r" hidden><button class="btn ghost small" id="rp-essai">Envoyer un essai</button></div>
    <p class="note" id="rp-msg" role="status"></p>
    <p class="note muted">L’adresse d’envoi de cet appareil et l’heure choisie sont gardées avec ton compte ; « Coupés » les efface.</p>`;
  const first=view.querySelector('.panel'); first?first.after(p):view.prepend(p);
  const $=s=>p.querySelector(s), msg=t=>{$('#rp-msg').textContent=t||'';};
  let on=false, busy=false;

  function show(){
    $('#rp-seg').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.r==='on')===on)));
    $('#rp-essai-r').hidden=!on;
  }
  function lock(why){
    [...p.querySelectorAll('button,select,input')].forEach(x=>x.disabled=!!why);
    if(why)msg(why);
  }
  function cle(b64){const t=b64.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(t+'==='.slice((t.length+3)%4)),c=>c.charCodeAt(0));}
  const memeCle=(s,k)=>{const a=s.options&&s.options.applicationServerKey;if(!a)return false;const x=new Uint8Array(a);return x.length===k.length&&x.every((v,i)=>v===k[i]);};

  // état de départ : abonné ici et connu du serveur ?
  async function lire(){
    if(!peut){lock(iOS&&!installe?'Sur iPhone, ajoute d’abord Néophyte à l’écran d’accueil (Partager › Sur l’écran d’accueil), puis ouvre-le de là pour activer les rappels.':'Ce navigateur ne sait pas recevoir de notifications.');return;}
    const s=await session();
    if(!s){on=false;show();lock('Connecte-toi pour recevoir des rappels : c’est ton compte qui sait si ta séance du jour est faite.');return;}
    lock(null); msg('');
    if(Notification.permission==='denied'){on=false;show();msg('Les notifications sont bloquées pour Néophyte : autorise-les dans les réglages du téléphone ou du navigateur, puis reviens ici.');return;}
    const sub=await abonnement().catch(()=>null);
    if(!sub){on=false;show();return;}
    const {data}=await sb.from('rappels').select('heure,serie').eq('endpoint',sub.endpoint).maybeSingle();
    on=!!data;
    if(data){const h=String(data.heure).slice(0,5);if(!heures.includes(h))$('#rp-heure').append(new Option(h));$('#rp-heure').value=h;$('#rp-serie').checked=!!data.serie;}
    show();
  }

  async function activer(){
    if(Notification.permission!=='granted'&&await Notification.requestPermission()!=='granted'){msg('Sans ton autorisation, Néophyte ne peut pas t’envoyer de rappel. Tu peux la donner dans les réglages du téléphone.');return false;}
    const r=await fetch(URL_FN,{headers:{apikey:C.supabaseKey}}).catch(()=>null);
    const j=r&&r.ok?await r.json().catch(()=>null):null;
    if(!j||!j.cle){msg('Les rappels ne sont pas encore disponibles. Réessaie plus tard.');return false;}
    const k=cle(j.cle), rg=await reg();
    let sub=await rg.pushManager.getSubscription();
    if(sub&&!memeCle(sub,k)){await sub.unsubscribe().catch(()=>{});sub=null;}
    if(!sub){
      try{sub=await rg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:k});}
      catch(e){console.error(e);msg('Ce navigateur a refusé l’abonnement (en navigation privée, c’est impossible). Essaie depuis Néophyte installé sur l’écran d’accueil.');return false;}
    }
    return enregistrer(sub);
  }
  async function enregistrer(sub){
    const o=sub.toJSON(), fuseau=Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Paris';
    const {error}=await sb.rpc('rappel_inscrire',{p_endpoint:o.endpoint,p_p256dh:o.keys.p256dh,p_auth:o.keys.auth,p_heure:$('#rp-heure').value,p_serie:$('#rp-serie').checked,p_fuseau:fuseau});
    if(error){msg('L’enregistrement n’a pas abouti. Vérifie ta connexion et réessaie.');return false;}
    return true;
  }
  async function couper(){
    const sub=await abonnement().catch(()=>null); if(!sub)return true;
    const {error}=await sb.from('rappels').delete().eq('endpoint',sub.endpoint);
    if(error){msg('La coupure n’a pas abouti. Vérifie ta connexion et réessaie.');return false;}
    await sub.unsubscribe().catch(()=>{});
    return true;
  }

  async function tache(f){if(busy)return;busy=true;try{await f();}catch(e){console.error(e);msg('Quelque chose a coincé. Réessaie dans un instant.');}finally{busy=false;}}
  $('#rp-seg').addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b||(b.dataset.r==='on')===on)return;
    tache(async()=>{
      msg('');
      if(b.dataset.r==='on'){if(await activer()){on=true;msg(`C’est noté : rappel vers ${$('#rp-heure').value}, à un quart d’heure près, les jours où ta séance n’est pas faite.`);}}
      else if(await couper()){on=false;msg('Rappels coupés sur cet appareil.');}
      show();
    });
  });
  const changer=()=>{if(on)tache(async()=>{const sub=await abonnement();if(sub&&await enregistrer(sub))msg(`Rappel déplacé vers ${$('#rp-heure').value}.`);});};
  $('#rp-heure').addEventListener('change',changer);
  $('#rp-serie').addEventListener('change',()=>{if(on)tache(async()=>{const sub=await abonnement();if(sub&&await enregistrer(sub))msg($('#rp-serie').checked?'Relance du soir activée.':'Relance du soir coupée.');});});
  $('#rp-essai').addEventListener('click',()=>tache(async()=>{
    const s=await session(); if(!s)return;
    msg('Envoi…');
    const r=await fetch(URL_FN,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token,apikey:C.supabaseKey},body:'{"essai":true}'}).catch(()=>null);
    msg(r&&r.ok?'Essai envoyé : la notification devrait arriver dans quelques secondes.':'L’essai n’est pas parti. Coupe puis réactive les rappels, et réessaie.');
  }));

  sb.auth.onAuthStateChange(()=>{setTimeout(()=>lire().catch(()=>{}),0);});
  lire().catch(()=>{});
})();
