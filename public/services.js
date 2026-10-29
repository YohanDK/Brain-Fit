/* Services du site : compte, sauvegarde et coach.
   La page a été écrite pour tourner dans Claude, qui lui fournissait window.claude.use('db' | 'user' | 'sample' | 'downloads').
   Ce fichier fournit les mêmes services avec Supabase (compte et données) et la fonction « coach » (API Claude). */
(function(){
  const C=window.BF_CONFIG||{};
  const ready=!!(window.supabase&&C.supabaseUrl&&C.supabaseKey);
  const sb=ready?window.supabase.createClient(C.supabaseUrl,C.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  window.bfSupabase=sb;

  async function session(){
    if(!sb)return null;
    try{const {data}=await sb.auth.getSession();return data.session;}catch(e){return null;}
  }
  function fail(code,text){const e=new Error(code);e.code=code;if(text)e.text=text;return e;}

  // un document JSON par nom (progress, texts), dans la table docs, visible du seul propriétaire
  const db={collection(){return{doc(name){return{
    async get(){
      const s=await session(); if(!s)throw fail('signed_out');
      const {data,error}=await sb.from('docs').select('data').eq('user_id',s.user.id).eq('name',name).maybeSingle();
      if(error)throw error;
      return {exists:!!data,data:()=>data?data.data:undefined};
    },
    async set(value){
      const s=await session(); if(!s)throw fail('signed_out');
      const {error}=await sb.from('docs').upsert({user_id:s.user.id,name,data:value,updated_at:new Date().toISOString()});
      if(error)throw error;
    }
  };}};}};

  const user={async id(){const s=await session();return s?s.user.id:null;}};

  // appelle la fonction « coach » et lit sa réponse au fil de l'eau ; \u0000 suivi d'un code signale une erreur en cours de route
  async function call(body,onText){
    const s=await session(); if(!s)throw fail('not_granted');
    let r;
    try{
      r=await fetch(C.supabaseUrl+'/functions/v1/coach',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token,apikey:C.supabaseKey},body:JSON.stringify(body)});
    }catch(e){throw fail('network');}
    if(!r.ok){let j={};try{j=await r.json();}catch(e){}throw fail(j.error||(r.status===429?'rate_limited':'error'));}
    const rd=r.body.getReader(), dec=new TextDecoder(); let text='';
    for(;;){
      const {value,done}=await rd.read(); if(done)break;
      text+=dec.decode(value,{stream:true});
      const k=text.indexOf('\u0000');
      if(k>=0)throw fail(text.slice(k+1).trim()||'error',text.slice(0,k).trim());
      if(onText)onText({text});
    }
    return text;
  }
  const toMessages=input=>typeof input==='string'?[{role:'user',content:input}]:input.map(m=>({role:m.role,content:String(m.content)}));
  async function toBase64(blob){
    const buf=new Uint8Array(await blob.arrayBuffer()); let bin='';
    for(let i=0;i<buf.length;i+=0x8000)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));
    return {media_type:blob.type||'image/jpeg',data:btoa(bin)};
  }
  function parseJSON(text){
    const t=text.replace(/^\s*```(?:json)?/i,'').replace(/```\s*$/,'');
    const a=t.indexOf('{'), b=t.lastIndexOf('}');
    try{return JSON.parse(a>=0&&b>a?t.slice(a,b+1):t);}catch(e){throw fail('bad_json');}
  }

  async function sample(input,opts){
    opts=opts||{};
    const text=await call({messages:toMessages(input),tier:opts.modelTier},opts.onText);
    return {text};
  }
  sample.json=async(input,opts)=>{
    opts=opts||{};
    const images=opts.images?await Promise.all(opts.images.map(toBase64)):undefined;
    return parseJSON(await call({messages:toMessages(input),json:true,images,tier:opts.modelTier}));
  };
  sample.limits=async()=>({images:true});

  window.claude={async use(cap){
    if(cap==='sample')return sample;
    if(cap==='db'||cap==='user')return (await session())?(cap==='db'?db:user):null;
    return null; // downloads : la page télécharge le fichier directement
  }};
})();
