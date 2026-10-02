(()=>{
  'use strict';
  const state={client:null,clientPromise:null,adminChannel:null,requestChannels:new Map(),adminHandler:null,requestHandlers:new Map()};
  const load=async()=>{
    if(state.client)return state.client;
    if(state.clientPromise)return state.clientPromise;
    state.clientPromise=import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm')
      .then(mod=>{
        const cfg=window.APP_CONFIG?.api;
        if(!cfg?.baseUrl||!cfg?.publicKey)throw new Error('تعذر تهيئة اتصال التحديث اللحظي.');
        const url=String(cfg.baseUrl).replace(/\/functions\/v1\/?$/,'');
        const createClient=mod.createClient;
        state.client=createClient(url,cfg.publicKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
        return state.client;
      })
      .catch(error=>{state.clientPromise=null;throw error});
    return state.clientPromise;
  };
  const closeChannel=async channel=>{try{if(channel)await state.client?.removeChannel(channel)}catch{}};
  async function stopAdmin(){const channel=state.adminChannel;state.adminChannel=null;state.adminHandler=null;await closeChannel(channel)}
  async function subscribeAdmin(handler){
    await stopAdmin();
    const client=await load();
    state.adminHandler=handler;
    const channel=client.channel('bsmat:admin:requests');
    channel.on('broadcast',{event:'request_changed'},payload=>{try{state.adminHandler?.(payload?.payload||{})}catch{}});
    state.adminChannel=channel;
    channel.subscribe((status,error)=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')window.dispatchEvent(new CustomEvent('bsmat-realtime-status',{detail:{scope:'admin',status,error}}));else if(status==='SUBSCRIBED')window.dispatchEvent(new CustomEvent('bsmat-realtime-status',{detail:{scope:'admin',status}}));});
    return channel;
  }
  async function stopRequest(requestToken){
    const key=String(requestToken||'');if(!key)return;
    const channel=state.requestChannels.get(key);state.requestChannels.delete(key);state.requestHandlers.delete(key);await closeChannel(channel);
  }
  async function subscribeRequest(requestToken,handler){
    const token=String(requestToken||'');if(!token)return null;
    await stopRequest(token);
    const client=await load();
    state.requestHandlers.set(token,handler);
    const channel=client.channel(`bsmat:req:${token}`);
    channel.on('broadcast',{event:'status_changed'},payload=>{try{state.requestHandlers.get(token)?.(payload?.payload||{})}catch{}});
    state.requestChannels.set(token,channel);
    channel.subscribe((status,error)=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')window.dispatchEvent(new CustomEvent('bsmat-realtime-status',{detail:{scope:'request',token,status,error}}));else if(status==='SUBSCRIBED')window.dispatchEvent(new CustomEvent('bsmat-realtime-status',{detail:{scope:'request',token,status}}));});
    return channel;
  }
  window.BsmatRealtime=Object.freeze({load,subscribeAdmin,stopAdmin,subscribeRequest,stopRequest,isAdminConnected:()=>Boolean(state.adminChannel)});
})();
