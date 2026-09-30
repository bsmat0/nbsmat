(()=>{
  'use strict';
  const state={
    client:null,clientPromise:null,
    adminChannel:null,adminHandler:null,adminReconnectTimer:null,
    requestChannels:new Map(),requestHandlers:new Map(),requestReconnectTimers:new Map()
  };
  const emit=detail=>{try{window.dispatchEvent(new CustomEvent('bsmat-realtime-status',{detail}))}catch{}};
  const load=async()=>{
    if(state.client)return state.client;
    if(state.clientPromise)return state.clientPromise;
    state.clientPromise=import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm')
      .then(mod=>{
        const cfg=window.APP_CONFIG?.api;
        if(!cfg?.baseUrl||!cfg?.publicKey)throw new Error('تعذر تهيئة اتصال التحديث اللحظي.');
        const url=String(cfg.baseUrl).replace(/\/functions\/v1\/?$/,'');
        state.client=mod.createClient(url,cfg.publicKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:20}}});
        return state.client;
      })
      .catch(error=>{state.clientPromise=null;throw error});
    return state.clientPromise;
  };
  const clearTimer=(timer,store,key)=>{if(timer){clearTimeout(timer);store.delete?.(key)}};
  const clearAdminReconnect=()=>{if(state.adminReconnectTimer){clearTimeout(state.adminReconnectTimer);state.adminReconnectTimer=null}};
  const clearRequestReconnect=token=>{const t=state.requestReconnectTimers.get(token);if(t){clearTimeout(t);state.requestReconnectTimers.delete(token)}};
  const closeChannel=async channel=>{try{if(channel)await state.client?.removeChannel(channel)}catch{}};

  async function stopAdmin(){
    clearAdminReconnect();
    const channel=state.adminChannel;state.adminChannel=null;state.adminHandler=null;
    await closeChannel(channel);
  }
  async function reconnectAdmin(){
    clearAdminReconnect();
    const handler=state.adminHandler;
    if(!handler||!state.client)return;
    const old=state.adminChannel;state.adminChannel=null;await closeChannel(old);
    try{await subscribeAdmin(handler)}catch{}
  }
  async function subscribeAdmin(handler){
    await stopAdmin();
    const client=await load();
    state.adminHandler=handler;
    const channel=client.channel('bsmat:admin:requests');
    channel.on('broadcast',{event:'request_changed'},payload=>{try{state.adminHandler?.(payload?.payload||{})}catch{}});
    state.adminChannel=channel;
    return await new Promise((resolve,reject)=>{
      let settled=false;
      channel.subscribe((status,error)=>{
        emit({scope:'admin',status,error});
        if(status==='SUBSCRIBED'&&!settled){settled=true;resolve(channel);return}
        if((status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')&&!settled){
          settled=true;reject(error||new Error(status));
          clearAdminReconnect();
          if(state.adminHandler){state.adminReconnectTimer=setTimeout(()=>{state.adminReconnectTimer=null;reconnectAdmin()},3000)}
        }
      });
    });
  }
  async function stopRequest(requestToken){
    const token=String(requestToken||'');if(!token)return;
    clearRequestReconnect(token);
    const channel=state.requestChannels.get(token);state.requestChannels.delete(token);state.requestHandlers.delete(token);
    await closeChannel(channel);
  }
  async function subscribeRequest(requestToken,handler){
    const token=String(requestToken||'');if(!token)return null;
    await stopRequest(token);
    const client=await load();
    state.requestHandlers.set(token,handler);
    const scheduleReconnect=()=>{
      clearRequestReconnect(token);
      if(!state.requestHandlers.has(token))return;
      state.requestReconnectTimers.set(token,setTimeout(async()=>{
        state.requestReconnectTimers.delete(token);
        const h=state.requestHandlers.get(token);if(!h)return;
        try{await subscribeRequest(token,h)}catch{}
      },3000));
    };
    const channel=client.channel(`bsmat:req:${token}`);
    channel.on('broadcast',{event:'status_changed'},payload=>{try{state.requestHandlers.get(token)?.(payload?.payload||{})}catch{}});
    state.requestChannels.set(token,channel);
    return await new Promise((resolve,reject)=>{
      let settled=false;
      channel.subscribe((status,error)=>{
        emit({scope:'request',token,status,error});
        if(status==='SUBSCRIBED'&&!settled){settled=true;resolve(channel);return}
        if((status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')&&!settled){
          settled=true;reject(error||new Error(status));scheduleReconnect();
        }
      });
    });
  }
  window.BsmatRealtime=Object.freeze({load,subscribeAdmin,stopAdmin,subscribeRequest,stopRequest,isAdminConnected:()=>Boolean(state.adminChannel)});
})();
