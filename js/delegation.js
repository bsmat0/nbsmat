(()=>{
  'use strict';
  const $=selector=>document.querySelector(selector),dialog=$('#delegateDialog');
  const state={token:sessionStorage.getItem(Bsmat.keys.delegateSession),data:null,selected:new Set(),parentToken:null,poll:null,completed:false};
  const delegateMessage=(text,ok=false)=>{const m=$('#delegateMessage');m.textContent=text||'';m.classList.toggle('ok',ok)};
  const parentMessage=(text,ok=false)=>{const m=$('#parentDelegateMessage');m.textContent=text||'';m.classList.toggle('ok',ok)};
  const setRequestStatus=(stateKey,text)=>{const status=$('#delegateStatus');status.textContent=text||'';status.dataset.state=stateKey;status.classList.add('delegate-request-status');status.classList.remove('hidden')};
  const studentId=s=>String(s.id??s.student_id??s.school_student_id??'');

  function stopPoll(){if(state.poll)clearInterval(state.poll);state.poll=null;if(state.pollToken){window.BsmatRealtime?.stopRequest?.(state.pollToken).catch?.(()=>{});state.pollToken=null}}
  function renderSession(payload){
    const delegation=payload.delegation||payload.session||payload;const students=payload.students||payload.children||[];state.data={delegation,students};state.selected.clear();
    $('#delegateIdentity').textContent=`${delegation.delegate_name||'المفوض'} — ${payload.parent_name||'الأسرة'}`;
    $('#delegateExpiry').textContent=delegation.expires_at?`ينتهي التفويض: ${new Date(delegation.expires_at).toLocaleString('ar-SA')}`:delegation.delegation_type==='permanent'?'تفويض دائم':'';
    const box=$('#delegateStudents');box.replaceChildren();students.forEach(student=>{const id=studentId(student);if(!id)return;const label=document.createElement('label');label.className='student delegate-student';const input=document.createElement('input');input.type='checkbox';input.value=id;input.addEventListener('change',()=>input.checked?state.selected.add(id):state.selected.delete(id));const text=document.createElement('span');text.innerHTML=`<strong>${Bsmat.escape(student.student_name||student.name||'طالب')}</strong><small>${Bsmat.escape(student.class_name||student.grade||'')}</small>`;label.append(input,text);box.append(label)});
    state.completed=false;$('#delegateLogout').textContent='تسجيل خروج';$('#delegateSession').classList.remove('hidden');$('#delegateLoginForm').classList.add('hidden');$('#delegateStatus').classList.add('hidden');$('#delegateStatus').classList.remove('delegate-request-status');$('#delegateStatus').removeAttribute('data-state');
  }

  async function loadParentDelegates(){
    state.parentToken=localStorage.getItem(Bsmat.keys.parentSession);if(!state.parentToken){parentMessage('سجلي دخول ولي الأمر لإدارة المفوضين.');return}
    const list=$('#parentDelegations');list.classList.remove('hidden');list.replaceChildren();parentMessage('جارٍ تحميل المفوضين…');
    try{
      const data=await Bsmat.request('delegation-api',{body:{action:'list_delegates',parent_session:state.parentToken},token:state.parentToken});const delegates=data.delegates||[];const active=data.active_sessions||[];
      if(!delegates.length){list.innerHTML='<div class="delegate-empty"><strong>لا يوجد مفوضون حتى الآن</strong><small>يمكنك إضافة أول مفوض من النموذج أعلاه.</small></div>'}
      else delegates.forEach(delegate=>{
        const row=document.createElement('article');row.className='parent-delegate-card';const activeSession=active.find(s=>String(s.delegate_contact_id)===String(delegate.id));
        const identity=document.createElement('div');identity.className='parent-delegate-card-identity';const avatar=document.createElement('span');avatar.className='parent-delegate-avatar';avatar.textContent=(delegate.delegate_name||'م').trim().charAt(0);const details=document.createElement('span');details.className='parent-delegate-details';const name=document.createElement('strong');name.textContent=delegate.delegate_name||'مفوض';const mobile=document.createElement('small');mobile.textContent=delegate.delegate_mobile||'';const type=document.createElement('span');type.className='parent-delegate-type';type.textContent=activeSession?(activeSession.delegation_type==='permanent'?'تفويض دائم':'تفويض مؤقت'):'غير مفعل';details.append(name,mobile,type);identity.append(avatar,details);
        const actions=document.createElement('div');actions.className='delegate-row-actions';
        if(activeSession){const code=document.createElement('button');code.type='button';code.className='button quiet delegate-code';code.textContent=`الكود: ${activeSession.access_code||'—'}`;code.addEventListener('click',async()=>{try{await navigator.clipboard?.writeText(String(activeSession.access_code||''));parentMessage('تم نسخ كود التفويض.',true)}catch{parentMessage(`كود التفويض: ${activeSession.access_code||'—'}`,true)}});actions.append(code);const toggle=document.createElement('button');toggle.className='button reject';toggle.type='button';toggle.textContent='تعطيل التفويض';toggle.addEventListener('click',async()=>{toggle.disabled=true;try{await Bsmat.request('delegation-api',{body:{action:'set_delegate_status',delegate_id:delegate.id,enabled:false},token:state.parentToken});parentMessage('تم تعطيل التفويض.',true);await loadParentDelegates()}catch(e){parentMessage(e.message);toggle.disabled=false}});actions.append(toggle)}else{const toggle=document.createElement('button');toggle.className='button primary';toggle.type='button';toggle.textContent='تنشيط التفويض';toggle.addEventListener('click',async()=>{toggle.disabled=true;try{await Bsmat.request('delegation-api',{body:{action:'set_delegate_status',delegate_id:delegate.id,enabled:true},token:state.parentToken});parentMessage('تم تنشيط التفويض. تم إصدار كود جديد.',true);await loadParentDelegates()}catch(e){parentMessage(e.message);toggle.disabled=false}});actions.append(toggle)}
        row.append(identity,actions);list.append(row);
      });
      parentMessage('');
    }catch(e){list.classList.add('hidden');parentMessage(e.message)}
  }

  window.BsmatDelegation={
    open(){delegateMessage('');$('#delegateSession').classList.add('hidden');$('#delegateLoginForm').classList.remove('hidden');if(!dialog.open)dialog.showModal();if(state.token)this.restore()},
    loadParentDelegates,
    async restore(){try{const data=await Bsmat.request('delegate-api',{body:{action:'get_students'},token:state.token});renderSession(data);delegateMessage('',true)}catch(e){state.token=null;state.data=null;sessionStorage.removeItem(Bsmat.keys.delegateSession);$('#delegateSession').classList.add('hidden');$('#delegateLoginForm').classList.remove('hidden');delegateMessage(e.message)}},
    async redeem(){const code=$('#delegateCode').value.replace(/\D/g,'');if(!/^\d{4}$/.test(code)){delegateMessage('أدخلي كودًا من أربعة أرقام.');return}const button=$('#redeem');button.disabled=true;try{const data=await Bsmat.request('delegate-api',{body:{action:'redeem_code',access_code:code}});state.token=data.delegate_session||data.session_token||data.token;if(!state.token)throw new Error(data.message||'لم يُرجع الخادم جلسة مفوض.');sessionStorage.setItem(Bsmat.keys.delegateSession,state.token);renderSession(data);delegateMessage('تم التحقق من التفويض.',true)}catch(e){delegateMessage(e.message)}finally{button.disabled=false}},
    async logout({preserveStatus=false}={}){stopPoll();state.token=null;state.data=null;state.selected.clear();sessionStorage.removeItem(Bsmat.keys.delegateSession);if(preserveStatus){state.completed=true;$('#delegateStudents').querySelectorAll('input').forEach(input=>input.disabled=true);$('#delegateSend').disabled=true;$('#delegateLogout').textContent='إغلاق';return}state.completed=false;$('#delegateStudents').replaceChildren();$('#delegateSession').classList.add('hidden');$('#delegateLoginForm').classList.remove('hidden');$('#delegateCode').value='';$('#delegateStatus').classList.add('hidden');$('#delegateStatus').classList.remove('delegate-request-status');$('#delegateStatus').removeAttribute('data-state');delegateMessage('تم تسجيل الخروج.')}
  };

  $('#delegateLoginForm').addEventListener('submit',e=>{e.preventDefault();BsmatDelegation.redeem()});
  $('#delegateClose').addEventListener('click',()=>dialog.close());

  $('#delegateManageForm').addEventListener('submit',async event=>{
    event.preventDefault();state.parentToken=localStorage.getItem(Bsmat.keys.parentSession);if(!state.parentToken){parentMessage('انتهت جلسة ولي الأمر. سجلي الدخول مجددًا لإدارة المفوضين.');return}
    const name=$('#delegateName').value.trim(),mobile=$('#delegateMobile').value.replace(/\D/g,''),type=$('#delegationType').value;if(name.length<3){parentMessage('اسم المفوض مطلوب.');return}if(!/^05\d{8}$/.test(mobile)){parentMessage('أدخلي رقم جوال صحيحًا يبدأ بـ 05.');return}
    const submit=event.submitter;submit.disabled=true;try{
      const identity=$('#identity').value.replace(/\D/g,''),parentMobile=$('#mobile').value.replace(/\D/g,'');
      const data=await Bsmat.request('delegation-api',{body:{action:'add_delegate',parent_session:state.parentToken,parent_national_id:identity,parent_mobile:parentMobile,delegate_name:name,delegate_mobile:mobile},token:state.parentToken});
      const delegate=data.delegate;if(delegate?.id){await Bsmat.request('delegation-api',{body:{action:'create_session',parent_session:state.parentToken,delegate_id:delegate.id,delegation_type:type},token:state.parentToken})}
      $('#delegateManageForm').reset();parentMessage(data.message||'تم حفظ المفوض وتفعيل التفويض.',true);await loadParentDelegates();
    }catch(e){parentMessage(e.message)}finally{submit.disabled=false}
  });

  $('#delegateSend').addEventListener('click',async event=>{
    if(!state.selected.size){delegateMessage('اختاري طالبًا واحدًا على الأقل.');return}
    const button=event.currentTarget;button.disabled=true;setRequestStatus('pending','جارٍ إرسال طلب الاستلام للإدارة…');
    try{
      const data=await Bsmat.request('delegate-api',{body:{action:'create_request_multi',student_ids:[...state.selected].map(Number)},token:state.token});
      const req=data.request||{};setRequestStatus('pending','تم إرسال الطلب، بانتظار موافقة الإدارة.');delegateMessage('',true);
      if(req.request_token){
        stopPoll();state.pollToken=String(req.request_token);let checking=false,closed=false,lastFinalSound='';
        const applyLiveState=(status,reason='')=>{
          const next=String(status||'').toLowerCase();if(!['approved','rejected'].includes(next)||closed)return;
          setRequestStatus(next,next==='approved'?'تمت الموافقة على طلب الاستلام.':`تم رفض الطلب${reason?` — ${reason}`:''}`);
          if(lastFinalSound===next)return;lastFinalSound=next;if(next==='approved')window.BsmatParentFeedback?.approved?.();else window.BsmatParentFeedback?.rejected?.();
        };
        const check=async()=>{
          if(closed||checking||!state.token)return;checking=true;
          try{
            const x=await Bsmat.request('delegate-api',{body:{action:'get_request_status',request_token:req.request_token},token:state.token}),r=x.request||{};
            if(r.status==='approved'){applyLiveState('approved');closed=true;window.BsmatRealtime?.stopRequest?.(req.request_token);stopPoll();if(x.auto_logged_out)BsmatDelegation.logout({preserveStatus:true})}
            else if(r.status==='rejected'){applyLiveState('rejected',r.reject_reason);closed=true;window.BsmatRealtime?.stopRequest?.(req.request_token);stopPoll()}
          }catch(e){if(e?.status===401||e?.status===403){setRequestStatus('rejected','انتهت جلسة التفويض قبل تحديث حالة الطلب.');closed=true;window.BsmatRealtime?.stopRequest?.(req.request_token);stopPoll()}}finally{checking=false}
        };
        window.BsmatRealtime?.subscribeRequest?.(req.request_token,async payload=>{const liveStatus=String(payload?.status||'').toLowerCase();if(['approved','rejected'].includes(liveStatus)){applyLiveState(liveStatus,String(payload?.reject_reason||''));await check()}}).catch?.(()=>{});
        check();state.poll=setInterval(check,30000);
      }
    }catch(e){setRequestStatus('rejected',e.message||'تعذر إرسال طلب الاستلام.');delegateMessage(e.message)}finally{button.disabled=state.completed?true:false}
  });
  $('#delegateLogout').addEventListener('click',()=>state.completed?dialog.close():BsmatDelegation.logout());
})();
