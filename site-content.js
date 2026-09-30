(()=>{
  'use strict';
  const page=document.body?.dataset?.sitePage||'';
  if(!page)return;
  const setText=(id,value)=>{const el=document.getElementById(id);if(el&&value)el.textContent=value;};
  const setContact=(id,value,hrefPrefix)=>{
    const el=document.getElementById(id);if(!el)return;
    const text=String(value||'').trim();
    if(!text){el.textContent=el.dataset.fallback||'لم تتم إضافة البيانات الرسمية بعد.';return;}
    el.textContent=text;
    if(el.tagName==='A') el.href=hrefPrefix+text;
  };
  const setSocial=(text,url)=>{
    const el=document.getElementById('contactSocialValue');if(!el)return;
    const label=String(text||'').trim();
    const link=String(url||'').trim();
    el.textContent=label||el.dataset.fallback||'لم تتم إضافة بيانات التواصل الاجتماعي بعد.';
    if(link && /^https?:\/\//i.test(link)){
      el.href=link;el.target='_blank';el.rel='noopener noreferrer';
      el.classList.remove('contact-plain');
    }else{
      el.removeAttribute('href');el.removeAttribute('target');el.removeAttribute('rel');el.classList.add('contact-plain');
    }
  };
  async function load(){
    try{
      const data=await Bsmat.request('parent-api',{body:{action:'get_site_content'}});
      if(page==='privacy'){
        setText('privacyCollect',data.privacy?.collect);setText('privacyUse',data.privacy?.use);setText('privacyStorage',data.privacy?.storage);setText('privacyRetention',data.privacy?.retention);setText('privacyUpdates',data.privacy?.updates);
      }else if(page==='terms'){
        setText('termsScope',data.terms?.scope);setText('termsUser',data.terms?.user);setText('termsServices',data.terms?.services);setText('termsSupport',data.terms?.support);
      }else if(page==='contact'){
        const phone=data.contact?.phone||'';const email=data.contact?.email||'';
        setContact('contactPhoneValue',phone,'tel:');setContact('contactEmailValue',email,'mailto:');setSocial(data.contact?.social,data.contact?.social_url);
      }
    }catch{}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
