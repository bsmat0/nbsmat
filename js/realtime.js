(()=>{
  'use strict';
  const state={client:null,clientPromise:null,adminChannel:null,requestChannels:new Map(),adminHandler:null,requestHandlers:new Map(),adminReconnectTimer:null,requestReconnectTimers:new Map(),reconnectAttempt:0};
  const load=async()=>{
    if(state.client)return state.client;
    if(state.clientPromise)return state.clientPromise;
    state.clientPromise=import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm')
      .then(mod=>{
        const cfg=window.APP_CONFIG?.api;
        if(!cfg?.baseUrl||!cfg?.publicKey)throw new Error('تعذر تهيئة اتصال التحديث اللحظي.');
        const url=String(cfg.baseUrl).replace(/\/functions\/v1\/?$/,'');
        state.client=mod.createClient(url,cfg.publicKey,{
          auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
          realtime:{
            worker:true,
            heartbeatIntervalMs:25000,
            heartbeatCallback:status=>{
              try{window.dispatchEvent(new CustomEvent('bsmat-realtime-heartbeat',{detail:{status}}))}catch{}
              if(status==='ok')state.reconnectAttempt=0;
              if(status==='timeout'||status==='disconnected'){
                state.reconnectAttempt=Math.min(state.reconnectAttempt+1,6);
                try{state.client?.realtime?.connect?.()}catch{}
              }
            },
            reconnectAfterMs:tries=>[500,1000,2000,5000,10000,30000][Math.min(Math.max(Number(tries)||1,1),6)-1]||30000
          }
        });
        return state.client;
      })
      .catch(error=>{state.clientPromise=null;throw error});
    return state.clientPromise;
  };
  const closeChannel=async channel=>{try{if(channel)await state.client?.removeChannel(channel)}catch{}};
  async function stopAdmin(){
    if(state.adminReconnectTimer){clearTimeout(state.adminReconnectTimer);state.adminReconnectTimer=null}
    const channel=state.adminChannel;state.adminChannel=null;state.adminHandler=null;await closeChannel(channel);
  }
  async function subscribeAdmin(handler){
    await stopAdmin();const client=await load();state.adminHandler=handler;
    const channel=client.channel('bsmat:admin:requests');
    channel.on('broadcast',{event:'request_changed'},payload=>{try{state.adminHandler?.(payload?.payload||{})}catch{}});
    state.adminChannel=channel;
    channel.subscribe((status,error)=>{
      try{window.dispatchEvent(new CustomEvent('bsmat-realtime-status',{detail:{scope:'admin',status,error}}))}catch{}
      if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(String(status))&&state.adminHandler&&!state.adminReconnectTimer){
        const fn=state.adminHandler;
        state.adminReconnectTimer=setTimeout(()=>{state.adminReconnectTimer=null;if(state.adminHandler===fn&&fn)subscribeAdmin(fn).catch(()=>{})},1200);
      }
    });
    return channel;
  }
  async function stopRequest(requestToken){
    const key=String(requestToken||'');if(!key)return;
    if(state.requestReconnectTimers.has(key)){clearTimeout(state.requestReconnectTimers.get(key));state.requestReconnectTimers.delete(key)}
    const channel=state.requestChannels.get(key);state.requestChannels.delete(key);state.requestHandlers.delete(key);await closeChannel(channel);
  }
  async function subscribeRequest(requestToken,handler){
    const token=String(requestToken||'');if(!token)return null;
    await stopRequest(token);const client=await load();state.requestHandlers.set(token,handler);
    const channel=client.channel(`bsmat:req:${token}`);
    channel.on('broadcast',{event:'status_changed'},payload=>{try{state.requestHandlers.get(token)?.(payload?.payload||{})}catch{}});
    state.requestChannels.set(token,channel);
    channel.subscribe((status,error)=>{
      try{window.dispatchEvent(new CustomEvent('bsmat-realtime-status',{detail:{scope:'request',token,status,error}}))}catch{}
      if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(String(status))&&state.requestHandlers.has(token)&&!state.requestReconnectTimers.has(token)){
        const fn=state.requestHandlers.get(token);
        state.requestReconnectTimers.set(token,setTimeout(()=>{state.requestReconnectTimers.delete(token);if(state.requestHandlers.get(token)===fn&&fn)subscribeRequest(token,fn).catch(()=>{})},1200));
      }
    });
    return channel;
  }
  window.BsmatRealtime=Object.freeze({load,subscribeAdmin,stopAdmin,subscribeRequest,stopRequest,isAdminConnected:()=>state.adminChannel?.state==='joined'});
})();
