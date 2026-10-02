(()=>{
  'use strict';
  const $=selector=>document.querySelector(selector);
  const state={mode:'pickup',children:[],selected:new Set(),parent:null,token:null,poll:null,pollToken:null,pollStatusCleanup:null,sessionPoll:null,cooldown:null};
  const home=$('#home'),screen=$('#request'),message=$('#formMessage');
  const say=(text,ok=false)=>{message.textContent=text||'';message.classList.toggle('hidden',!text);message.classList.toggle('ok',ok)};
  const digits=value=>String(value||'').replace(/[٠-٩]/g,char=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(char))).replace(/[۰-۹]/g,char=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(char))).replace(/\D/g,'');
  const femaleNames=new Set(['سارة','سارا','تولين','فجر','فرح','عهود','ريتال','يارا','وتين','رتيل','هنا','هنه','ملاذ','لانا','شموخ','نوف','ديم','سديم','رزان','أقدار','ميلاف','شوق','صباح','شمس','عهد','ريما','سلمى','بلقيس','الماس','ليليا','رغد','إيلاف','ايلاف','ياسمين','الميس','اليانا','ماسه','ماسة','ريفال','حنين','حلا','نوره','نورة','مادلين','غنى','ملك','جود','جنى','جوانا','جوري','جوريه','دانة','دانه','دانية','دانيه','رؤى','روان','رنا','رنين','ريم','ريناد','سارة','شذى','شهد','صفا','طيبة','عبير','علا','غلا','لمار','لمى','ليان','ليلى','ميس','ميساء','مها','مريم','منار','منيرة','نجود','نجلاء','هيا','هند','وعد','رؤيا','تالا','تالين','لارا','لجين','لجين','نور','نورين']);
  const maleNames=new Set(['خالد','يوسف','أسر','اسر','إسر','إياد','اياد','دغيم','زياد','غيث','بسام','اسامه','أسامة','سعد','سلمان','سامر','يامن','عبد','عز','محمد','عبدالله','عبد الله','عبد الرحمن','نواف','سعود','عباس','ليث','حسن','فيصل','فواز','أشرف','راكان','فهد','فيصل','سلطان','ماجد','مشعل','تركي','تركي','حمد','حسن','حسين','ريان','رائد','رامي','زياد','علي','عمر','عبدالعزيز','عبد العزيز','عبدالرحمن','عبد الرحمن','عبدالملك','عبد الملك','طارق','نايف','منصور','مراد','مهند','بندر','بدر','بدران']);
  const normalizeName=name=>String(name||'').replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/\s+/g,' ').trim();
  function stableNameHash(name){let h=0;for(const ch of normalizeName(name))h=((h<<5)-h+ch.charCodeAt(0))|0;return Math.abs(h);}
  function studentGender(name,student={}){
    const explicit=String(student.gender||student.gender_code||student.sex||'').toLowerCase().trim();
    if(['female','girl','f','انثى','أنثى','بنت'].includes(explicit))return 'girl';
    if(['male','boy','m','ذكر','ولد'].includes(explicit))return 'boy';
    const n=normalizeName(name),first=n.split(' ')[0]||'';
    if(femaleNames.has(n)||femaleNames.has(first))return 'girl';
    if(maleNames.has(first)||/^عبد/.test(first))return 'boy';
    // Unknown names get a deterministic visual assignment so the same child never flips between visits.
    return stableNameHash(n)%3===0?'girl':'boy';
  }
  function studentAvatar(name,student={}){const gender=studentGender(name,student);return `<span class="child-card-avatar gender-${gender}" aria-hidden="true"><img class="student-gender-avatar" src="assets/student-${gender}.svg" alt=""></span>`}
  const SOUND_PRESETS=[
    {id:'signal-1',tones:[[880,0,.16,'square',.22],[660,.08,.16,'square',.22],[990,.16,.22,'square',.25]]},
    {id:'signal-2',tones:[[740,0,.24,'sawtooth',.24],[920,.28,.28,'sawtooth',.25]]},
    {id:'signal-3',tones:[[523,0,.18,'triangle',.24],[659,.2,.18,'triangle',.24],[784,.4,.32,'triangle',.26]]},
    {id:'signal-4',tones:[[620,0,.14,'square',.24],[980,.14,.18,'square',.26],[620,.34,.22,'square',.24]]},
    {id:'signal-5',tones:[[700,0,.12,'sawtooth',.26],[700,.16,.12,'sawtooth',.26],[880,.32,.18,'sawtooth',.28]]},
    {id:'signal-6',tones:[[440,0,.2,'triangle',.24],[554,.22,.2,'triangle',.24],[659,.44,.26,'triangle',.26]]},
    {id:'signal-7',tones:[[960,0,.18,'square',.24],[540,.2,.18,'square',.24],[960,.4,.18,'square',.24],[540,.6,.18,'square',.24]]},
    {id:'signal-8',tones:[[840,0,.1,'square',.22],[840,.14,.1,'square',.22],[840,.28,.1,'square',.22],[1100,.42,.18,'square',.25]]},
    {id:'signal-9',tones:[[392,0,.18,'triangle',.22],[494,.2,.18,'triangle',.22],[587,.4,.18,'triangle',.24],[784,.6,.3,'triangle',.26]]},
    {id:'signal-10',tones:[[1000,0,.12,'square',.26],[500,.15,.12,'square',.26],[1000,.3,.12,'square',.26],[500,.45,.12,'square',.26],[1000,.6,.22,'square',.28]]}
  ];
  let alertAudioContext=null;
  async function primeAlertAudio(){
    try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;alertAudioContext=alertAudioContext&&alertAudioContext.state!=='closed'?alertAudioContext:new C();if(alertAudioContext.state==='suspended')await alertAudioContext.resume();return alertAudioContext}catch{return null}
  }
  async function playAlertSound(presetOverride){
    try{
      let pref={};try{pref=JSON.parse(localStorage.getItem('bsmat.admin.preferences.v5')||'{}')}catch{}
      if(pref.sound===false)return;
      const ctx=await primeAlertAudio();if(!ctx)return;
      const presetId=presetOverride||pref.soundPreset||'signal-1';
      const preset=SOUND_PRESETS.find(x=>x.id===presetId)||SOUND_PRESETS[0],master=ctx.createGain();master.gain.value=.58;master.connect(ctx.destination);const now=ctx.currentTime;
      preset.tones.forEach(([freq,offset,duration,wave,volume])=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=wave;osc.frequency.setValueAtTime(freq,now+offset);gain.gain.setValueAtTime(.0001,now+offset);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),now+offset+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+offset+duration);osc.connect(gain);gain.connect(master);osc.start(now+offset);osc.stop(now+offset+duration+.03)});setTimeout(()=>{try{master.disconnect()}catch{}},1200);
    }catch{}
  }
  async function playApprovalSound(){
    try{let pref={};try{pref=JSON.parse(localStorage.getItem('bsmat.admin.preferences.v5')||'{}')}catch{}if(pref.sound===false)return;const ctx=await primeAlertAudio();if(!ctx)return;const master=ctx.createGain();master.gain.value=.62;master.connect(ctx.destination);const now=ctx.currentTime;[[660,0,.18],[880,.2,.22],[1046,.44,.34]].forEach(([freq,offset,duration])=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,now+offset);gain.gain.setValueAtTime(.0001,now+offset);gain.gain.exponentialRampToValueAtTime(.34,now+offset+.018);gain.gain.exponentialRampToValueAtTime(.0001,now+offset+duration);osc.connect(gain);gain.connect(master);osc.start(now+offset);osc.stop(now+offset+duration+.03)});setTimeout(()=>{try{master.disconnect()}catch{}},1100)}catch{}
  }
  window.BsmatParentFeedback=Object.freeze({approved(){playApprovalSound();setTimeout(playApprovalSound,360)},rejected(){playAlertSound()}});
  document.addEventListener('pointerdown',()=>{primeAlertAudio()}, {once:true,passive:true});
  document.addEventListener('keydown',()=>{primeAlertAudio()}, {once:true});

  function stopPoll(){if(state.poll)clearTimeout(state.poll);state.poll=null;if(state.pollStatusCleanup){try{state.pollStatusCleanup()}catch{}state.pollStatusCleanup=null}if(state.pollToken){window.BsmatRealtime?.stopRequest?.(state.pollToken).catch?.(()=>{});state.pollToken=null}}
  function stopSessionMonitor(){if(state.sessionPoll)clearInterval(state.sessionPoll);state.sessionPoll=null}
  function clearParentSessionUi(messageText=''){
    stopPoll();stopSessionMonitor();state.token=null;state.parent=null;state.children=[];state.selected.clear();
    localStorage.removeItem(Bsmat.keys.parentSession);localStorage.removeItem(Bsmat.keys.parentData);localStorage.removeItem('bsmat.parent.mobile');sessionStorage.removeItem(Bsmat.keys.parentSession);sessionStorage.removeItem(Bsmat.keys.parentData);sessionStorage.removeItem('bsmat.parent.mobile');
    $('#students').replaceChildren();$('#studentsWrap').classList.add('hidden');$('#parentSessionBar').classList.add('hidden');$('#parentGreeting').textContent='ولي الأمر';$('#parentForm').classList.remove('hidden');$('#parentDelegatePanel').classList.add('hidden');$('#parentDelegateManagement').classList.add('hidden');$('#toggleDelegateManagement').setAttribute('aria-expanded','false');$('#sendRequest').classList.add('hidden');
    const status=$('#requestStatus');status.classList.add('hidden');status.classList.remove('request-status-feedback');status.removeAttribute('data-state');status.textContent='';
    const history=$('#parentRequestHistory');history?.classList.add('hidden');$('#parentRequestHistoryList')?.replaceChildren();
    const utility=$('#parentUtilityCard');if(utility){clearInterval(utility._timer);utility._timer=null;utility.classList.add('hidden');$('#parentUtilityBody').replaceChildren()}
    $('#reason').value='';$('#count').textContent='0 / 100';say(messageText);
  }
  function expireParentSession(messageText='انتهت جلسة ولي الأمر. سجل الدخول من جديد.'){clearParentSessionUi(messageText)}
  function startSessionMonitor(){
    stopSessionMonitor();if(!validSession())return;let checking=false;
    const check=async()=>{if(!validSession()||screen.classList.contains('hidden')||checking)return;checking=true;try{await Bsmat.request('parent-api',{body:{action:'get_children',parent_session:state.token},token:state.token})}catch(error){if(error?.status===401||error?.status===403)expireParentSession('تم إنهاء ارتباط هذا الجهاز. سجل الدخول بعد اعتماد الجهاز مجددًا.')}finally{checking=false}};
    check();state.sessionPoll=setInterval(check,300000);
  }

  function showHome(){setHeaderAction(false);$('#headerPortalAction').dataset.action='admin';stopPoll();stopSessionMonitor();const utility=$('#parentUtilityCard');if(utility){clearInterval(utility._timer);utility._timer=null;utility.classList.add('hidden')}screen.classList.add('hidden');home.classList.remove('hidden');$('#parentDelegatePanel').classList.add('hidden');$('#parentDelegateManagement').classList.add('hidden');$('#toggleDelegateManagement')?.setAttribute('aria-expanded','false')}
  function validSession(){return Boolean(state.token&&state.parent)}
  function setFieldVerification(id, state, text){
    const el=$('#'+id);if(!el)return;
    el.className='field-verification '+(state||'');
    el.textContent=text||'';
    el.classList.toggle('hidden',!state);
  }
  function clearFieldVerification(){setFieldVerification('identityCheck','','');setFieldVerification('mobileCheck','','')}
  function readSchoolSchedule(){
    const fallback={dayStartTime:'06:00',dismissalTime:'15:00'};
    try{const raw=localStorage.getItem('bsmat.school.schedule.v1');if(raw){const v=JSON.parse(raw);return {...fallback,...v}}}catch{}
    try{const raw=localStorage.getItem('bsmat.admin.preferences.v5');if(raw){const v=JSON.parse(raw);return {...fallback,...v}}}catch{}
    return fallback;
  }
  function formatCountdown(totalSeconds){
    const safe=Math.max(0,Math.floor(Number(totalSeconds)||0));
    const minutes=Math.floor(safe/60);
    const seconds=String(safe%60).padStart(2,'0');
    return `${minutes}:${seconds}`;
  }
  function childrenStoreKey(){return `bsmat.parent.children.v1.${String(state.parent?.id||'unknown')}`}
  function mergeChildrenStable(serverChildren){
    const incoming=Array.isArray(serverChildren)?serverChildren.filter(s=>s&&(s.id!=null||s.student_id!=null||s.school_student_id!=null)):[];
    const byId=new Map(incoming.map(s=>[String(s.id??s.student_id??s.school_student_id),s]));
    let order=[];
    try{const raw=localStorage.getItem(childrenStoreKey());order=raw?JSON.parse(raw):[]}catch{order=[]}
    if(!Array.isArray(order))order=[];
    const out=[];const used=new Set();
    for(const id of order){const s=byId.get(String(id));if(s){out.push(s);used.add(String(id))}}
    incoming.forEach(s=>{const id=String(s.id??s.student_id??s.school_student_id);if(!used.has(id)){out.push(s);used.add(id)}});
    try{localStorage.setItem(childrenStoreKey(),JSON.stringify(out.map(s=>String(s.id??s.student_id??s.school_student_id))))}catch{}
    return out;
  }
  function setHeaderAction(inRequest){
    const action=$('#headerPortalAction');if(!action)return;
    const icon='<circle cx="12" cy="7.5" r="4.5" fill="currentColor" stroke="none"/><path d="M3 22c.5-5.2 3.7-8 9-8s8.5 2.8 9 8H3Z" fill="currentColor" stroke="none"/>';
    if(inRequest){
      action.dataset.action=validSession()?'logout':'parent-login';action.removeAttribute('href');action.setAttribute('aria-label',validSession()?'تسجيل الخروج':'تسجيل دخول ولي الأمر');action.setAttribute('title',validSession()?'تسجيل الخروج':'تسجيل دخول ولي الأمر');action.querySelector('svg').innerHTML=icon;
    }else{
      $('#portalLegalLinks')?.classList.remove('hidden');
      action.dataset.action='admin';action.setAttribute('href','./');action.setAttribute('aria-label','تسجيل الدخول إلى بوابة الإدارة');action.setAttribute('title','تسجيل الدخول إلى بوابة الإدارة');action.querySelector('svg').innerHTML=icon;
    }
  }

  function renderParentUtility(){
    const card=$('#parentUtilityCard'),title=$('#parentUtilityTitle'),copy=$('#parentUtilityCopy'),body=$('#parentUtilityBody');
    if(!card||!title||!copy||!body)return;
    if(!validSession()){card.classList.add('hidden');clearInterval(card._timer);card._timer=null;return}
    card.classList.remove('hidden');
    const raw=sessionStorage.getItem(Bsmat.keys.parentCooldown);let active=null;
    try{active=raw?JSON.parse(raw):null}catch{}
    const matches=active&&Array.isArray(active.student_ids)&&[...state.selected].some(id=>active.student_ids.map(String).includes(String(id)));
    if(active&&matches&&Number(active.until)>Date.now()){
      const tick=()=>{
        const left=Math.max(0,Number(active.until)-Date.now());
        if(!left){sessionStorage.removeItem(Bsmat.keys.parentCooldown);renderParentUtility();return}
        const total=Math.ceil(left/1000);
        title.textContent='مؤقت الطلب';copy.textContent='الانتظار قبل إرسال طلب جديد لنفس الطالب';body.innerHTML=`<div class="parent-countdown-value">${formatCountdown(total)}</div><span class="parent-countdown-label">الوقت المتبقي</span>`;card.dataset.mode='countdown';
      };
      tick();
      clearInterval(card._timer);card._timer=setInterval(tick,1000);
      return;
    }
    clearInterval(card._timer);card._timer=null;
    const schedule=readSchoolSchedule();
    title.textContent='مواعيد اليوم';copy.textContent='الأوقات المعتمدة الظاهرة لولي الأمر';
    body.innerHTML=`<div class="parent-schedule-row"><span>بداية اليوم</span><strong dir="ltr">${Bsmat.escape(schedule.dayStartTime||'06:00')}</strong></div><div class="parent-schedule-row"><span>انصراف الطلاب</span><strong dir="ltr">${Bsmat.escape(schedule.dismissalTime||'15:00')}</strong></div>`;card.dataset.mode='schedule';
  }

  function drawChildren(){
    const box=$('#students');box.replaceChildren();
    state.children.forEach(student=>{
      const id=String(student.id??student.student_id??student.school_student_id??'');if(!id)return;
      const name=Bsmat.escape(student.name||student.student_name||'طالب');
      const grade=Bsmat.escape(student.class_name||student.grade||'الصف غير محدد');
      const button=document.createElement('button');button.type='button';button.className='student child-card';
      button.innerHTML=`${studentAvatar(student.name||student.student_name||'طالب',student)}<span class="child-card-copy"><strong>${name}</strong><small><span>الصف</span><b>${grade}</b></small></span><span class="child-card-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span>`;
      button.setAttribute('aria-pressed',String(state.selected.has(id)));
      if(state.selected.has(id))button.classList.add('selected');
      button.addEventListener('click',()=>{if(state.selected.has(id))state.selected.delete(id);else state.selected.add(id);button.classList.toggle('selected',state.selected.has(id));button.setAttribute('aria-pressed',String(state.selected.has(id)));$('#sendRequest').classList.toggle('hidden',state.selected.size===0);updateCooldownButton()});
      box.append(button);
    });
    $('#studentsWrap').classList.toggle('hidden',!state.children.length);
    $('#parentDelegatePanel').classList.toggle('hidden',!validSession());
    $('#sendRequest').classList.toggle('hidden',!state.selected.size);
    renderParentUtility();
  }

  async function lookupChildren(){
    if(!validSession())throw new Error('يلزم تسجيل الدخول أولًا.');
    const data=await Bsmat.request('parent-api',{body:{action:'get_children',parent_session:state.token},token:state.token});
    state.children=mergeChildrenStable(data.students||data.children||[]);drawChildren();
  }

  function updateCooldownButton(){
    const button=$('#sendRequest');
    primeAlertAudio();if(state.cooldown)clearInterval(state.cooldown);state.cooldown=null;
    const raw=sessionStorage.getItem(Bsmat.keys.parentCooldown);
    if(!raw||!state.selected.size){button.disabled=false;button.textContent='تأكيد وإرسال الطلب';return}
    let cooldown;try{cooldown=JSON.parse(raw)}catch{sessionStorage.removeItem(Bsmat.keys.parentCooldown);button.disabled=false;button.textContent='تأكيد وإرسال الطلب';return}
    const ids=(cooldown.student_ids||[]).map(String),matches=[...state.selected].some(id=>ids.includes(id));
    const tick=()=>{const left=Math.max(0,Number(cooldown.until||0)-Date.now());if(!matches||!left){button.disabled=false;button.textContent='تأكيد وإرسال الطلب';if(!left)sessionStorage.removeItem(Bsmat.keys.parentCooldown);if(state.cooldown)clearInterval(state.cooldown);state.cooldown=null;return}button.disabled=true;const totalSeconds=Math.ceil(left/1000);button.textContent=`انتظر ${formatCountdown(totalSeconds)} قبل إرسال طلب جديد`};
    tick();state.cooldown=setInterval(()=>{tick();renderParentUtility()},1000);renderParentUtility();
  }

  function setRequestFeedback(statusKey,text){const el=$('#requestStatus');el.classList.remove('hidden');el.classList.add('request-status-feedback');el.dataset.state=statusKey;el.textContent=text;$('#sendRequest').classList.remove('is-sending')}
  function startPoll(requestToken){
    stopPoll();if(!requestToken)return;state.pollToken=String(requestToken);const status=$('#requestStatus');let checking=false,closed=false,lastFinalSound='',realtimeConnected=false,fallbackTimer=null;
    const stopFallback=()=>{const t=fallbackTimer;if(t)clearTimeout(t);if(state.poll===t)state.poll=null;fallbackTimer=null};
    const scheduleCheck=(delay)=>{if(closed)return;if(fallbackTimer)clearTimeout(fallbackTimer);const ms=Math.max(5000,Number(delay)||120000);fallbackTimer=setTimeout(async()=>{fallbackTimer=null;state.poll=null;await check();if(!closed)scheduleCheck(realtimeConnected?120000:15000)},ms);state.poll=fallbackTimer};
    const feedbackFor=(req,statusValue,reasonOverride='')=>{
      const type=req?.request_type||state.mode;
      const approved=type==='excuse'?'تمت الموافقة على طلب الاستئذان، وسيتم تجهيز خروج الطالب وتوجيهه إلى البوابة وفق إجراءات المدرسة.':'تمت الموافقة على طلب النداء، وتتم الآن مناداة الطالب عبر مكبرات الصوت داخل المدرسة، وسيتم توجيهه إلى البوابة مباشرة.';
      const reason=String(reasonOverride||req?.reject_reason||'').trim();
      const rejected=reason?`تم رفض طلب ${type==='excuse'?'الاستئذان':'النداء'} من قبل الإدارة بسبب: ${reason}`:`تم رفض طلب ${type==='excuse'?'الاستئذان':'النداء'} من قبل الإدارة.`;
      return {next:String(statusValue||'pending').toLowerCase(),text:statusValue==='approved'?approved:statusValue==='rejected'?rejected:'تم إرسال الطلب، بانتظار موافقة الإدارة.'};
    };
    const applyLiveState=(statusValue,reason='')=>{
      const next=String(statusValue||'').toLowerCase();if(!['pending','approved','rejected'].includes(next))return;
      const current=status.dataset.state||'pending';const feedback=feedbackFor({request_type:state.mode},next,reason);
      setRequestFeedback(feedback.next,feedback.text);renderParentUtility();
      if((next==='approved'||next==='rejected')&&current!==next&&lastFinalSound!==next){
        lastFinalSound=next;if(next==='approved'){playApprovalSound();setTimeout(playApprovalSound,360)}else playAlertSound();loadRequestHistory().catch(()=>{});
      }
    };
    const check=async()=>{
      if(closed||checking)return;checking=true;
      try{
        const data=await Bsmat.request('parent-api',{body:{action:'get_request_status',request_token:requestToken,parent_session:state.token},token:state.token});
        const req=data.request||data,feedback=feedbackFor(req,req.status,req.reject_reason),before=status.dataset.state||'pending';
        setRequestFeedback(feedback.next,feedback.text);renderParentUtility();
        if((feedback.next==='approved'||feedback.next==='rejected')&&before!==feedback.next&&lastFinalSound!==feedback.next){
          lastFinalSound=feedback.next;if(feedback.next==='approved'){playApprovalSound();setTimeout(playApprovalSound,360)}else playAlertSound();try{await loadRequestHistory()}catch{}
        }
        if(['approved','rejected'].includes(feedback.next)){closed=true;stopFallback();state.pollStatusCleanup?.();state.pollStatusCleanup=null;window.BsmatRealtime?.stopRequest?.(requestToken);stopPoll()}
      }catch(error){
        if(error?.status===401||error?.status===403){closed=true;stopFallback();state.pollStatusCleanup?.();state.pollStatusCleanup=null;window.BsmatRealtime?.stopRequest?.(requestToken);expireParentSession('انتهى ارتباط هذا الجهاز أو جلسة ولي الأمر. سجل الدخول من جديد.')}
      }finally{checking=false}
    };
    const onRealtime=async payload=>{
      const liveStatus=String(payload?.status||'').toLowerCase();if(!['approved','rejected'].includes(liveStatus))return;
      realtimeConnected=true;stopFallback();applyLiveState(liveStatus,String(payload?.reject_reason||''));await check();
    };
    const onRealtimeStatus=event=>{
      const detail=event.detail||{};if(detail.scope!=='request'||String(detail.token||'')!==String(requestToken))return;
      const st=String(detail.status||'');
      if(st==='SUBSCRIBED'){realtimeConnected=true;scheduleCheck(120000);check()}
      else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(st)){realtimeConnected=false;scheduleCheck(5000);check()}
    };
    window.addEventListener('bsmat-realtime-status',onRealtimeStatus);
    state.pollStatusCleanup=()=>window.removeEventListener('bsmat-realtime-status',onRealtimeStatus);
    window.BsmatRealtime?.subscribeRequest?.(requestToken,onRealtime).catch?.(()=>{realtimeConnected=false;scheduleCheck(5000)});
    check();scheduleCheck(120000);
  }

  async function loadRequestHistory(){
    const wrap=$('#parentRequestHistory'),list=$('#parentRequestHistoryList');if(!wrap||!list||!validSession())return;
    try{const data=await Bsmat.request('parent-api',{body:{action:'get_parent_request_history',parent_session:state.token,limit:15},token:state.token});const rows=data.history||[];list.replaceChildren();
      if(!rows.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='لا توجد عمليات طلب مسجلة للأبناء حتى الآن.';list.append(empty)}
      else rows.forEach(r=>{const item=document.createElement('article');item.className='parent-history-item';const main=document.createElement('div');const students=(r.students||[]).map(x=>x.student_name).filter(Boolean).join('، ')||'الطلاب';const classes=(r.students||[]).map(x=>x.class_name).filter(Boolean).join('، ');const type=r.request_type==='excuse'?'استئذان مبكر':'نداء انصراف';const reason=r.excuse_reason?`السبب: ${r.excuse_reason}`:'';main.innerHTML=`<div class="parent-history-students">${Bsmat.escape(students)}</div><div class="parent-history-meta"><span>${Bsmat.escape(classes||'')}</span><span>${Bsmat.escape(type)}</span><span>${Bsmat.escape(new Date(r.created_at).toLocaleString('ar-SA'))}</span>${reason?`<span>${Bsmat.escape(reason)}</span>`:''}</div>`;const badge=document.createElement('span');badge.className=`parent-history-status ${r.status||'pending'}`;badge.textContent=r.status==='approved'?'تمت الموافقة':r.status==='rejected'?'مرفوض':'قيد الإجراء';item.append(main,badge);list.append(item)});wrap.classList.remove('hidden');
    }catch(e){wrap.classList.add('hidden');if(e?.status===401||e?.status===403)expireParentSession('انتهى ارتباط هذا الجهاز أو جلسة ولي الأمر. سجل الدخول من جديد.')}
  }

  document.querySelectorAll('#home .service-btn[data-mode], #home .service-delegate-btn[data-mode]').forEach(button=>{
    const openMode=()=>{
      state.mode=button.dataset.mode;
      if(state.mode==='delegate'){BsmatDelegation.open();return}
      $('#flowTitle').textContent=state.mode==='excuse'?'طلب استئذان مبكر':'طلب نداء انصراف';
      setHeaderAction(validSession());
      $('#reasonWrap').classList.toggle('hidden',state.mode!=='excuse');
      $('#requestStatus').classList.add('hidden');$('#studentsWrap').classList.add('hidden');$('#parentDelegatePanel').classList.add('hidden');$('#portalLegalLinks')?.classList.add('hidden');home.classList.add('hidden');screen.classList.remove('hidden');setHeaderAction(validSession());say('');
      if(validSession()){$('#parentForm').classList.add('hidden');$('#parentSessionBar').classList.remove('hidden');$('#identity').value=state.parent.national_id||$('#identity').value||'';$('#mobile').value=state.parent.mobile||sessionStorage.getItem('bsmat.parent.mobile')||$('#mobile').value||'';lookupChildren().then(()=>{loadRequestHistory();say('');startSessionMonitor()}).catch(e=>{if(e?.status===401||e?.status===403)expireParentSession('تعذر التحقق من ارتباط هذا الجهاز. سجل الدخول مجددًا.');else say(e.message)})}
      else{$('#parentForm').classList.remove('hidden');$('#parentSessionBar').classList.add('hidden');$('#parentForm').classList.remove('compact')}
    };
    button.addEventListener('click',()=>{primeAlertAudio();openMode()});
  });

  $('[data-home]').addEventListener('click',showHome);
  $('#identity').addEventListener('input',e=>{e.target.value=digits(e.target.value).slice(0,10);clearFieldVerification()});
  $('#mobile').addEventListener('input',e=>{e.target.value=digits(e.target.value).slice(0,10);clearFieldVerification()});
  $('#delegateMobile').addEventListener('input',e=>{e.target.value=digits(e.target.value).slice(0,10)});
  $('#reason').addEventListener('input',e=>{$('#count').textContent=`${e.target.value.length} / 100`});
  $('#delegateCode').addEventListener('input',e=>{e.target.value=digits(e.target.value).slice(0,4)});

  $('#refreshParentHistory')?.addEventListener('click',loadRequestHistory);

  $('#toggleDelegateManagement').addEventListener('click',()=>{if(!validSession())return;const panel=$('#parentDelegateManagement'),opening=panel.classList.contains('hidden');panel.classList.toggle('hidden',!opening);$('#toggleDelegateManagement').setAttribute('aria-expanded',String(opening));if(opening)BsmatDelegation.loadParentDelegates()});

  $('#parentForm').addEventListener('submit',async event=>{
    event.preventDefault();primeAlertAudio();const identity=digits($('#identity').value),mobile=digits($('#mobile').value);
    if(!/^\d{9,10}$/.test(identity)||!/^05\d{8}$/.test(mobile)){say('تحققي من رقم الهوية (9 أو 10 أرقام) ورقم الجوال (05xxxxxxxx).');return}
    const button=$('#lookup');button.disabled=true;button.textContent='جارٍ التحقق…';
    try{
      const clientId=Bsmat.getClientId();const data=await Bsmat.request('parent-login',{body:{action:'parent_login',national_id:identity,mobile,parent_client_id:clientId},clientId});
      state.parent=data.parent||{};state.token=data.parent_session||data.session_token||data.token;if(!state.token)throw new Error('لم يُرجع الخادم جلسة ولي أمر.');
      const mobileMatch=data.mobile_match===true,loginMobileSlot=Number(data.login_mobile_slot||data.login_mobile);
      setFieldVerification('identityCheck','','');
      setFieldVerification('mobileCheck','','');
      localStorage.setItem(Bsmat.keys.parentSession,state.token);localStorage.setItem(Bsmat.keys.parentData,JSON.stringify({...state.parent,mobile_match:mobileMatch,login_mobile_slot:loginMobileSlot||null,national_id:identity}));localStorage.setItem('bsmat.parent.mobile',mobile);sessionStorage.removeItem(Bsmat.keys.parentSession);sessionStorage.removeItem(Bsmat.keys.parentData);sessionStorage.removeItem('bsmat.parent.mobile');
      state.children=mergeChildrenStable(data.students||data.children||[]);state.selected.clear();$('#parentGreeting').textContent=`${state.parent.display_name||'ولي الأمر'}${loginMobileSlot?` · رقم الجوال ${loginMobileSlot}`:''}`;$('#parentForm').classList.add('hidden');$('#parentSessionBar').classList.remove('hidden');drawChildren();loadRequestHistory();startSessionMonitor();setHeaderAction(true);
      say('');
    }catch(error){if(error?.data?.device_pending)say('هذا الحساب مرتبط بجهاز آخر. تمت إحالة الجهاز الجديد إلى إدارة المدرسة للمراجعة.');else say(error.message)}finally{button.disabled=false;button.textContent='عرض الأبناء المسجلين'}
  });

  $('#sendRequest').addEventListener('click',async event=>{
    const button=event.currentTarget;if(!validSession()||!state.selected.size)return;
    if(state.mode==='excuse'&&!$('#reason').value.trim()){say('اكتب سبب الاستئذان.');$('#reason').focus();return}
    primeAlertAudio();button.disabled=true;button.classList.add('is-sending');button.textContent='جارٍ الإرسال…';const status=$('#requestStatus');status.classList.remove('hidden');status.textContent='جاري إرسال الطلب للإدارة، يرجى الانتظار…';
    try{
      const clientId=Bsmat.getClientId();const data=await Bsmat.request('parent-multi-request',{body:{action:'create_request_multi',parent_session:state.token,parent_client_id:clientId,student_ids:[...state.selected].map(Number),request_type:state.mode==='excuse'?'excuse':'pickup',excuse_reason:state.mode==='excuse'?$('#reason').value.trim():''},token:state.token,clientId});
      const request=data.request||{};const seconds=240;sessionStorage.setItem(Bsmat.keys.parentCooldown,JSON.stringify({until:Date.now()+seconds*1000,student_ids:[...state.selected],request_token:request.request_token||null}));setRequestFeedback('pending','تم إرسال الطلب، بانتظار موافقة الإدارة.');say('');updateCooldownButton();renderParentUtility();loadRequestHistory();if(request.request_token)startPoll(request.request_token);
    }catch(error){
      if(error?.status===401||(error?.status===403&&/جهاز|جلسة/.test(error.message||''))){expireParentSession(error.message||'انتهى ارتباط هذا الجهاز. سجل الدخول بعد اعتماد الجهاز مجددًا.');return}
      if(error?.data?.duplicate){const seconds=Math.max(0,Number(error.data.retry_after_seconds)||0);if(seconds)sessionStorage.setItem(Bsmat.keys.parentCooldown,JSON.stringify({until:Date.now()+seconds*1000,student_ids:error.data.duplicate_student_ids||[...state.selected]}));updateCooldownButton()}
      if(error?.data?.rate_limited){const retry=Math.max(0,Number(error.data.retry_after_seconds)||0);button.classList.remove('is-sending');status.classList.remove('hidden');status.classList.add('request-status-feedback');status.dataset.state='rejected';status.textContent=error.message||'تم الوصول إلى الحد المسموح للطلبات خلال 4 ساعات.';if(retry){sessionStorage.setItem(Bsmat.keys.parentCooldown,JSON.stringify({until:Date.now()+retry*1000,student_ids:[...state.selected]}));updateCooldownButton()}else button.disabled=true;}else{status.textContent=error.message;button.disabled=false;button.textContent='تأكيد وإرسال الطلب';button.classList.remove('is-sending')}
    }
  });

  async function logoutParent(){
    try{if(state.token)await Bsmat.request('parent-session',{body:{action:'logout',parent_session:state.token,parent_client_id:Bsmat.getClientId()},token:state.token})}catch{}
    clearParentSessionUi();clearFieldVerification();$('#identity').value='';$('#mobile').value='';showHome();
  }
  const logoutDialog=$('#parentLogoutDialog');
  $('#headerPortalAction').addEventListener('click',event=>{
    const action=$('#headerPortalAction');
    if(action.dataset.action==='logout'){event.preventDefault();if(!logoutDialog.open)logoutDialog.showModal();return}
    if(action.dataset.action==='parent-login'){event.preventDefault();$('#parentForm').scrollIntoView({behavior:'smooth',block:'center'});$('#identity').focus({preventScroll:true});return}
    event.preventDefault();const shell=$('#adminPortalShell'),frame=$('#adminPortalFrame');if(!shell||!frame)return;
    sessionStorage.setItem('bsmat.adminFrameOpen','1');shell.hidden=false;frame.src='admin.html';
  });
  window.addEventListener('message',event=>{if(event.source!==$('#adminPortalFrame')?.contentWindow||event.data?.type!=='bsmat-close-admin')return;sessionStorage.removeItem('bsmat.adminFrameOpen');$('#adminPortalShell').hidden=true;$('#adminPortalFrame').src='about:blank'});
  if(sessionStorage.getItem('bsmat.adminFrameOpen')==='1'){$('#adminPortalShell').hidden=false;$('#adminPortalFrame').src='admin.html'}
  $('#cancelParentLogout').addEventListener('click',()=>logoutDialog.close());
  $('#confirmParentLogout').addEventListener('click',async()=>{logoutDialog.close();await logoutParent()});

  try{let storedToken=localStorage.getItem(Bsmat.keys.parentSession),storedData=localStorage.getItem(Bsmat.keys.parentData),storedMobile=localStorage.getItem('bsmat.parent.mobile');if(!storedToken){storedToken=sessionStorage.getItem(Bsmat.keys.parentSession);storedData=sessionStorage.getItem(Bsmat.keys.parentData);storedMobile=sessionStorage.getItem('bsmat.parent.mobile');if(storedToken){localStorage.setItem(Bsmat.keys.parentSession,storedToken);if(storedData)localStorage.setItem(Bsmat.keys.parentData,storedData);if(storedMobile)localStorage.setItem('bsmat.parent.mobile',storedMobile);sessionStorage.removeItem(Bsmat.keys.parentSession);sessionStorage.removeItem(Bsmat.keys.parentData);sessionStorage.removeItem('bsmat.parent.mobile')}}state.token=storedToken||null;state.parent=storedData?JSON.parse(storedData):null;if(validSession())$('#parentGreeting').textContent=`مرحبًا ${state.parent.display_name||'بعودتك'}`}catch{localStorage.removeItem(Bsmat.keys.parentSession);localStorage.removeItem(Bsmat.keys.parentData);localStorage.removeItem('bsmat.parent.mobile');sessionStorage.removeItem(Bsmat.keys.parentSession);sessionStorage.removeItem(Bsmat.keys.parentData);sessionStorage.removeItem('bsmat.parent.mobile')}
  updateCooldownButton();
  setHeaderAction(Boolean(screen && !screen.classList.contains('hidden') && validSession()));
  renderParentUtility();
})();
