(()=>{
  'use strict';
  const cfg=window.APP_CONFIG;
  const keys=Object.freeze({
    parentSession:'bsmat.parent.session',
    parentData:'bsmat.parent.data',
    parentClient:'bsmat.parent.client',
    parentCooldown:'bsmat.parent.cooldown.v2',
    delegateSession:'bsmat.delegate.session',
    adminSession:'bsmat.admin.session',
    theme:'bsmat.theme'
  });

  function getClientId(){
    const valid=v=>/^[A-Za-z0-9_-]{20,120}$/.test(String(v||''));
    try{
      const existing=localStorage.getItem(keys.parentClient);
      if(valid(existing)) return existing;
      const seed=(crypto.randomUUID?.()||`${Date.now()}-${Math.random()}-${Math.random()}`)
        .replace(/[^A-Za-z0-9_-]/g,'');
      const value=`web_${seed}`.slice(0,80);
      localStorage.setItem(keys.parentClient,value);
      return value;
    }catch{
      return `web_${Date.now()}_${Math.random().toString(36).slice(2)}`.replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
    }
  }

  function endpointPath(endpoint){
    const path=cfg.api.endpoints[endpoint];
    if(!cfg.api.baseUrl||!cfg.api.publicKey||!path) throw new Error('إعدادات الاتصال بالخادم غير مكتملة.');
    return `${cfg.api.baseUrl.replace(/\/$/,'')}/${String(path).replace(/^\//,'')}`;
  }

  function headersFor(endpoint,token,clientId){
    const headers={
      'Content-Type':'application/json',
      apikey:cfg.api.publicKey,
      Authorization:`Bearer ${cfg.api.publicKey}`
    };
    if(token){
      if(endpoint==='admin-api'||endpoint==='admin-delegations'||endpoint==='admin-log-action') headers['x-admin-session']=token;
      else if(endpoint==='delegate-api') headers['x-delegate-session']=token;
      else if(endpoint==='parent-multi-request'||endpoint==='parent-session'){
        headers['x-parent-session']=token;
        headers['x-parent-client-id']=clientId||getClientId();
      }else if(endpoint==='delegation-api'){
        headers['x-parent-session']=token;
        headers['x-parent-client-id']=clientId||getClientId();
      }else if(endpoint==='parent-api'){headers['x-parent-session']=token;headers['x-parent-client-id']=clientId||getClientId();}
    }
    if(endpoint==='parent-login') headers['x-parent-client-id']=getClientId();
    return headers;
  }

  async function request(endpoint,{method='POST',body,token,signal,clientId}={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),cfg.api.timeoutMs);
    if(signal) signal.addEventListener('abort',()=>controller.abort(),{once:true});
    try{
      const response=await fetch(endpointPath(endpoint),{
        method,
        signal:controller.signal,
        headers:headersFor(endpoint,token,clientId),
        ...(body!==undefined?{body:JSON.stringify(body)}:{})
      });
      const raw=await response.text();
      let data={};
      try{data=raw?JSON.parse(raw):{}}catch{data={message:raw||''};}
      if(!response.ok){
        const error=new Error(data.message||data.error||`تعذر تنفيذ الطلب (${response.status})`);
        error.status=response.status;
        error.data=data;
        throw error;
      }
      if(data&&data.success===false){
        const error=new Error(data.message||data.error||'رفض الخادم الطلب.');
        error.status=response.status;
        error.data=data;
        throw error;
      }
      return data;
    }catch(error){
      if(error?.name==='AbortError') throw new Error('انتهت مهلة الاتصال بالخادم.');
      throw error;
    }finally{clearTimeout(timer)}
  }

  function syncThemeIcons(dark){
    document.querySelectorAll('.header-theme-btn').forEach(button=>{
      button.setAttribute('aria-pressed',String(dark));
      button.setAttribute('data-theme-mode',dark?'dark':'light');
      const icon=button.querySelector('.theme-sun-icon');
      if(!icon) return;
      icon.innerHTML=dark
        ? '<path d=\"M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 1 0 9.8 9.8Z\"/>'
        : '<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M2 12h2M20 12h2m-17.1-7.1 1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4\"/>';
      button.setAttribute('aria-label',dark?'التحويل إلى الوضع النهاري':'التحويل إلى الوضع الليلي');
    });
  }

  function setTheme(dark){
    document.body.classList.toggle('dark',dark);
    document.body.classList.toggle('site-dark',dark);
    document.documentElement.classList.toggle('dark',dark);
    document.querySelector('#mainCardContainer')?.classList.toggle('dark-card',dark);
    syncThemeIcons(dark);
  }
  function applyStoredTheme(){setTheme(localStorage.getItem(keys.theme)==='dark')}
  function toggleTheme(){const dark=!document.body.classList.contains('site-dark');setTheme(dark);try{localStorage.setItem(keys.theme,dark?'dark':'light')}catch{}}

  window.Bsmat={
    keys,getClientId,request,escape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))},
    theme:applyStoredTheme,toggleTheme
  };
  document.addEventListener('DOMContentLoaded',()=>{
    applyStoredTheme();
    document.querySelectorAll('[data-theme]').forEach(b=>b.addEventListener('click',toggleTheme));
  });
})();
