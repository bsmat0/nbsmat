(()=>{
  'use strict';

  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=Bsmat.escape;
  const login=$('#loginPanel'),dashboard=$('#dashboard'),content=$('#adminContent'),loginForm=$('#loginForm'),nationalId=$('#nationalId'),password=$('#password'),loginMessage=$('#loginMessage'),dialog=$('#adminDialog'),dialogForm=$('#adminDialogForm'),toast=$('#adminToast'),printRoot=$('#printOnlyReport');
  const localSettingsKey='bsmat.admin.preferences.v5';
  let token=sessionStorage.getItem(Bsmat.keys.adminSession), activeTab='stats', dialogSave=null, requestAuditMap=new Map();

  const school={
    name:'روضة وابتدائية بسمات الوعد الأهلية',
    subtitle:'نظام النداء الذكي بالطلاب',
    staff:'إخلاص الحضيري',
    role:'وكيلة المدرسة',
    logo:'assets/logo.png'
  };
  const sessionAdminClaims=()=>{try{const payload=token?.split('.')?.[1];if(!payload)return null;return JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g,'+').replace(/_/g,'/')))))}catch{return null}};
  const sessionAdminName=()=>sessionAdminClaims()?.display_name||school.staff;
  const canManageStaff=()=>{const current=sessionAdminClaims();return current?.role_name==='super_admin'||current?.permissions?.includes('manage_staff')===true};
  const ADMIN_PERMISSION_OPTIONS=[['view_dashboard','نظرة عامة'],['manage_requests','إدارة الطلبات'],['manage_students','إدارة الطلاب'],['manage_parents','إدارة أولياء الأمور'],['manage_reports','التقارير والسجلات'],['manage_settings','الإعدادات'],['manage_staff','إدارة الموظفين'],['view_audit','عرض سجل العمليات']];

  const defaultSettings={sound:true,soundPreset:'signal-1',confirmDelete:true,dayStartTime:'06:00',dismissalTime:'15:00'};
  const defaultSiteContent={
    privacy:{
      collect:'تجمع المنظومة الحد الأدنى من البيانات اللازمة لتقديم خدمات النداء والانصراف والاستئذان، مثل بيانات ولي الأمر والأبناء وبيانات الطلبات المرتبطة بالخدمة.',
      use:'تُستخدم البيانات للتحقق من هوية ولي الأمر أو المفوض، وربط الطلب بالطالب الصحيح، وتشغيل خدمات النداء والاستئذان وإدارة الطلبات والسجلات المدرسية.',
      storage:'تُحفظ البيانات في قاعدة بيانات النظام وتُتاح فقط ضمن الصلاحيات اللازمة لتشغيل الخدمة وإدارتها. لا يتم عرض بيانات أولياء الأمور أو الطلاب بشكل عام خارج نطاق الخدمة.',
      retention:'تحتفظ المنظومة بسجلات الطلبات وفق آلية الأرشفة المعتمدة لدى المدرسة، ويجري تنظيف الأرشيف القديم وفق سياسة الاحتفاظ المحددة للنظام.',
      updates:'قد تُحدَّث هذه السياسة عند الحاجة. للاستفسارات المتعلقة بالخصوصية أو البيانات، يمكن التواصل مع المدرسة عبر بيانات التواصل المنشورة في صفحة تواصل معنا.'
    },
    terms:{
      scope:'يُستخدم النظام لخدمات النداء والانصراف والاستئذان وإدارة التفويضات والطلبات التابعة للمدرسة.',
      user:'يلتزم المستخدم بإدخال بيانات صحيحة واستخدام حسابه وبيانات الدخول الخاصة به وعدم مشاركة رموز الوصول مع غير المصرح لهم.',
      services:'تُرسل الطلبات من خلال النظام إلى إدارة المدرسة، وتخضع الموافقة أو الرفض لإجراءات المدرسة وصلاحيات الإدارة المعتمدة.',
      support:'تملك المدرسة حق تحديث الخدمات والشروط عند الحاجة. يمكن رفع الاستفسارات أو الملاحظات من خلال صفحة تواصل معنا.'
    },
    contact:{phone:'',email:'',social:'',social_url:''}
  };
  const settings=()=>{
    try{
      const v={...defaultSettings,...JSON.parse(localStorage.getItem(localSettingsKey)||'{}')};
      if(v.dayStartTime==='07:00'&&v.dismissalTime==='11:20'){v.dayStartTime='06:00';v.dismissalTime='15:00';}
      return v;
    }catch{return {...defaultSettings}}
  };
  const saveSettings=x=>{try{localStorage.setItem(localSettingsKey,JSON.stringify(x))}catch{}};

  const SOUND_PRESETS=[
    {id:'signal-1',name:'تنبيه حازم',desc:'ثلاث نبضات قوية وواضحة',tones:[[880,0,.16,'square',.22],[660,.08,.16,'square',.22],[990,.16,.22,'square',.25]]},
    {id:'signal-2',name:'تنبيه مزدوج',desc:'نبضتان ممتلئتان وسريعتان',tones:[[740,0,.24,'sawtooth',.24],[920,.28,.28,'sawtooth',.25]]},
    {id:'signal-3',name:'جرس إداري',desc:'نغمة جرس مرتفعة مع نهاية حادة',tones:[[523,0,.18,'triangle',.24],[659,.2,.18,'triangle',.24],[784,.4,.32,'triangle',.26]]},
    {id:'signal-4',name:'صفارة تنبيه',desc:'صعود ثم هبوط سريع',tones:[[620,0,.14,'square',.24],[980,.14,.18,'square',.26],[620,.34,.22,'square',.24]]},
    {id:'signal-5',name:'نبضة قوية',desc:'إشارة قصيرة متتابعة',tones:[[700,0,.12,'sawtooth',.26],[700,.16,.12,'sawtooth',.26],[880,.32,.18,'sawtooth',.28]]},
    {id:'signal-6',name:'جرس ثلاثي',desc:'ثلاث درجات صاعدة',tones:[[440,0,.2,'triangle',.24],[554,.22,.2,'triangle',.24],[659,.44,.26,'triangle',.26]]},
    {id:'signal-7',name:'إنذار متناوب',desc:'نغمتان متبادلتان بقوة',tones:[[960,0,.18,'square',.24],[540,.2,.18,'square',.24],[960,.4,.18,'square',.24],[540,.6,.18,'square',.24]]},
    {id:'signal-8',name:'تنبيه سريع',desc:'أربع نبضات سريعة',tones:[[840,0,.1,'square',.22],[840,.14,.1,'square',.22],[840,.28,.1,'square',.22],[1100,.42,.18,'square',.25]]},
    {id:'signal-9',name:'تنبيه ذهبي',desc:'صعود موسيقي قصير وواضح',tones:[[392,0,.18,'triangle',.22],[494,.2,.18,'triangle',.22],[587,.4,.18,'triangle',.24],[784,.6,.3,'triangle',.26]]},
    {id:'signal-10',name:'نداء طوارئ',desc:'إشارة قوية ومتكررة للانتباه',tones:[[1000,0,.12,'square',.26],[500,.15,.12,'square',.26],[1000,.3,.12,'square',.26],[500,.45,.12,'square',.26],[1000,.6,.22,'square',.28]]}
  ];

  let soundContext=null;
  async function primeSoundContext(){
    try{
      const C=window.AudioContext||window.webkitAudioContext;
      if(!C)return null;
      soundContext=soundContext&&soundContext.state!=='closed'?soundContext:new C();
      if(soundContext.state==='suspended')await soundContext.resume();
      return soundContext;
    }catch{return null}
  }
  function getSoundContext(){return soundContext&&soundContext.state!=='closed'?soundContext:null}
  async function playPreset(id){
    const pref=settings();
    if(pref.sound===false && id===undefined)return;
    const preset=SOUND_PRESETS.find(x=>x.id===(id||pref.soundPreset))||SOUND_PRESETS[0];
    const ctx=getSoundContext()||await primeSoundContext();
    if(!ctx)return;
    const master=ctx.createGain();master.gain.value=.48;master.connect(ctx.destination);
    const now=ctx.currentTime;
    preset.tones.forEach(([freq,offset,duration,wave,volume])=>{
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type=wave;osc.frequency.setValueAtTime(freq,now+offset);
      gain.gain.setValueAtTime(0.0001,now+offset);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),now+offset+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,now+offset+duration);
      osc.connect(gain);gain.connect(master);osc.start(now+offset);osc.stop(now+offset+duration+.03);
    });
    setTimeout(()=>{try{master.disconnect()}catch{}},900);
  }

  async function clearTemporaryCache(){
    let removed=0;
    try{
      if('caches' in window){
        const names=await caches.keys();
        for(const name of names){
          if(/^bsmat(?:[-_.]|$)/i.test(name)){
            if(await caches.delete(name))removed++;
          }
        }
      }
    }catch{}
    try{performance.clearResourceTimings?.()}catch{}
    notify(removed?`تم تنظيف ${removed} من ذاكرة الكاش المؤقتة بدون المساس ببيانات الحسابات.`:'تم تنظيف الذاكرة المؤقتة المتاحة. لم يتم حذف الجلسات أو إعدادات الموقع.');
  }
  const notify=(text,error=false)=>{if(!toast)return;toast.textContent=text;toast.classList.toggle('error',error);toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600)};
  document.addEventListener('pointerdown',()=>{primeSoundContext()}, {once:true,passive:true});
  document.addEventListener('keydown',()=>{primeSoundContext()}, {once:true});
  const setLoggedIn=logged=>{
    login.classList.toggle('hidden',logged); dashboard.classList.toggle('hidden',!logged);
    $('.admin-tabs')?.classList.toggle('hidden',!logged); $('#staff')?.classList.toggle('hidden',!logged);
    if(!logged){$('#staffCard')?.classList.add('hidden');$('#staff')?.setAttribute('aria-expanded','false')}
  };
  function expire(){stopLiveRequestMonitor();token=null;sessionStorage.removeItem(Bsmat.keys.adminSession);setLoggedIn(false);loginMessage.textContent='انتهت جلسة الإدارة. سجل الدخول من جديد.'}
  async function call(action,extra={}){
    if(!token)throw new Error('انتهت جلسة الإدارة.');
    try{return await Bsmat.request('admin-api',{body:{action,...extra},token})}
    catch(e){if(e.status===401)expire();throw e}
  }

  function heading(icon,title,sub=''){return `<div class="admin-section-title"><div><h2><span class="admin-section-icon" aria-hidden="true">${icon}</span><span>${esc(title)}</span></h2>${sub?`<p>${esc(sub)}</p>`:''}</div></div>`}
  function activateTab(tab){
    const valid=new Set($$('[data-tab]').map(b=>b.dataset.tab));
    const next=valid.has(tab)?tab:'stats';
    activeTab=next;
    $$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===next));
    load(next);
  }

  function statusLabel(s){return s==='approved'?'تمت الموافقة':s==='rejected'?'مرفوض':'بانتظار الإجراء'}
  function typeLabel(s){return s==='excuse'?'استئذان مبكر':'نداء انصراف'}
  function sourceLabel(s){return s==='delegate'?'مفوض':'ولي أمر'}
  function dateLabel(value){try{return value?new Date(value).toLocaleString('ar-SA'):'—'}catch{return '—'}}
  function isoDate(value){try{return new Date(value).toISOString().slice(0,10)}catch{return ''}}
  function studentNames(row){
    if(Array.isArray(row.students)&&row.students.length)return row.students.map(x=>x.student_name||x.name).filter(Boolean).join('، ');
    if(Array.isArray(row.student_names)&&row.student_names.length)return row.student_names.join('، ');
    return row.student_name||'طالب';
  }
  function isInRange(row,from,to){
    const d=new Date(row.created_at||0); if(Number.isNaN(d.getTime())) return false;
    const day=isoDate(d); return (!from||day>=from)&&(!to||day<=to);
  }

  async function load(tab){
    activeTab=tab; content.innerHTML='<div class="loading-state"><span class="loading-dot"></span> جارٍ تحميل البيانات من الخادم…</div>';
    try{
      if(tab==='stats')await renderStats();
      else if(tab==='requests')await renderRequests();
      else if(tab==='students')await renderStudents();
      else if(tab==='parents')await renderParents();
      else if(tab==='delegations')await renderDelegations();
      else if(tab==='reports')await renderReports();
      else await renderSettings();
    }catch(e){content.innerHTML=`<div class="error admin-error"><strong>تعذر تحميل القسم</strong><span>${esc(e.message||'خطأ غير معروف.')}</span></div>`}
  }

  function metricCard(label,value,kind='default',icon='•'){return `<article class="admin-stat-card ${kind}"><span class="admin-stat-icon" aria-hidden="true">${icon}</span><div><small>${esc(label)}</small><strong>${esc(value)}</strong></div></article>`}

  async function renderStats(){
    const d=await call('admin_get_today_stats'),rows=d.requests||[];
    const total=Number(d.total)||rows.length,pending=Number(d.pending)||rows.filter(r=>r.status==='pending').length,approved=Number(d.approved)||rows.filter(r=>r.status==='approved').length,rejected=Number(d.rejected)||rows.filter(r=>r.status==='rejected').length;
    const pendingRows=rows.filter(r=>r.status==='pending').slice(0,10);
    content.innerHTML=`${heading('◈','نظرة عامة','لوحة متابعة فورية من قاعدة البيانات')}<div class="admin-stat-grid">
      ${metricCard('إجمالي الطلبات',total,'purple','↗')}${metricCard('بانتظار الإجراء',pending,'gold','!')}${metricCard('تمت الموافقة',approved,'success','✓')}${metricCard('مرفوضة',rejected,'danger','×')}
    </div>
    <div class="admin-toolbar admin-toolbar-wrap"><div class="toolbar-copy"><strong>حالة النظام</strong><span>آخر مزامنة: ${dateLabel(new Date().toISOString())}</span></div><button id="statsRefresh" class="button quiet" type="button">تحديث الآن</button></div>
    <section class="admin-nested-panel"><div class="admin-panel-head"><div><h3>الطلبات المعلقة الآن</h3><p>${pendingRows.length} معروضة من أصل ${pending}</p></div><button class="link-button" data-go-tab="requests" type="button">عرض كل الطلبات</button></div><div class="request-list">${pendingRows.map(renderRequestCard).join('')||'<div class="empty-state">لا توجد طلبات معلقة حاليًا.</div>'}</div></section>`;
    $('#statsRefresh').onclick=()=>load('stats'); bindRequestActions(); $$('[data-go-tab]').forEach(b=>b.onclick=()=>activateTab(b.dataset.goTab));
  }

  function renderRequestCard(row){
    requestAuditMap.set(String(row.id),row);
    return `<article class="request-card admin-request-card" data-id="${esc(row.id)}" data-status="${esc(row.status||'')}" data-search="${esc([studentNames(row),row.parent_name,row.parent_mobile,row.delegate_name,row.delegate_mobile].filter(Boolean).join(' ')).toLowerCase()}">
      <div class="request-top"><div><strong>${esc(studentNames(row))}</strong><span class="request-meta">${typeLabel(row.request_type)} · ${sourceLabel(row.request_source)}</span>${Array.isArray(row.student_classes)&&row.student_classes.length?`<span class="request-meta">الصف: ${esc(row.student_classes.join('، '))}</span>`:''}</div><span class="badge ${esc(row.status||'pending')}">${statusLabel(row.status)}</span></div>
      <div class="request-details"><span>ولي الأمر: ${esc(row.parent_name||'—')}</span><span dir="ltr">${esc(row.parent_mobile||'')}</span>${row.delegate_name?`<span>المفوض: ${esc(row.delegate_name)}</span><span dir="ltr">${esc(row.delegate_mobile||'')}</span>`:''}${row.excuse_reason?`<span>السبب: ${esc(row.excuse_reason)}</span>`:''}</div>
      <p class="muted request-time">${dateLabel(row.created_at)}</p>
      ${row.status==='pending'?'<div class="actions request-actions"><button class="button primary" data-status-action="approved" type="button">موافقة</button><button class="button reject" data-status-action="rejected" type="button">رفض</button></div>':''}
    </article>`;
  }

  async function renderRequests(){
    const d=await call('admin_get_all_requests'),rows=d.requests||[];
    content.innerHTML=`${heading('◉','الطلبات الحية','مراجعة الطلبات الحالية والطلبات السابقة مع تصفية واضحة')}
      <div class="admin-toolbar admin-filter-toolbar"><input id="requestSearch" placeholder="بحث باسم الطالب أو ولي الأمر أو الجوال" aria-label="بحث في الطلبات"><select id="requestFilter" aria-label="تصفية الحالة"><option value="all">كل الحالات</option><option value="pending">بانتظار الإجراء</option><option value="approved">تمت الموافقة</option><option value="rejected">مرفوض</option></select><select id="requestTypeFilter" aria-label="تصفية النوع"><option value="all">كل الأنواع</option><option value="pickup">نداء انصراف</option><option value="excuse">استئذان مبكر</option></select><button id="requestRefresh" class="button quiet" type="button">تحديث</button></div>
      <div class="results-summary"><strong id="requestCount">${rows.length}</strong><span>طلبًا في العرض الحالي</span></div><div id="requestList" class="request-list">${rows.map(renderRequestCard).join('')||'<div class="empty-state">لا توجد طلبات.</div>'}</div>`;
    const filter=()=>{
      const q=$('#requestSearch').value.trim().toLowerCase(),s=$('#requestFilter').value,t=$('#requestTypeFilter').value;let shown=0;
      $$('#requestList [data-id]').forEach(card=>{const okQ=!q||card.dataset.search.includes(q),okS=s==='all'||s===card.dataset.status,okT=t==='all'||card.querySelector('.request-meta')?.textContent.includes(typeLabel(t));const show=okQ&&okS&&okT;card.classList.toggle('hidden',!show);if(show)shown++});$('#requestCount').textContent=shown;
    };
    $('#requestSearch').oninput=filter;$('#requestFilter').onchange=filter;$('#requestTypeFilter').onchange=filter;$('#requestRefresh').onclick=()=>load('requests');bindRequestActions();
  }

  function bindRequestActions(){
    $$('[data-status-action]').forEach(button=>button.onclick=async()=>{
      const card=button.closest('[data-id]');if(!card)return;let reason='';
      if(button.dataset.statusAction==='rejected'){reason=prompt('اكتب سبب الرفض:');if(reason===null)return;if(!reason.trim()){alert('سبب الرفض مطلوب.');return}}
      button.disabled=true;
      try{
        const before=requestAuditMap.get(String(card.dataset.id))||null;
        const result=await call('admin_update_request',{request_id:card.dataset.id,status:button.dataset.statusAction,reject_reason:reason.trim()});
        const after=result.request||null;
        await logDetailedChange(button.dataset.statusAction==='approved'?'admin_approve_request':'admin_reject_request','request','الطلب #'+card.dataset.id,before,after,{request_id:Number(card.dataset.id),student_id:Number(before?.student_id)||null,student_name:studentNames(before||{}),recipient_name:before?.recipient_name||before?.delegate_name||before?.parent_name||'',method:button.dataset.statusAction==='approved'?'تمت الموافقة على الطلب من تبويب الطلبات الحية.':'تم رفض الطلب من تبويب الطلبات الحية.',reason:reason.trim(),actor_name:school.staff});
        requestAuditMap.set(String(card.dataset.id),after||before);
        stopRequestAlert(card.dataset.id);
        notify(button.dataset.statusAction==='approved'?'تمت الموافقة على الطلب.':'تم رفض الطلب.');
        await load(activeTab);
      }catch(e){alert(e.message);button.disabled=false}
    });
  }

  function openDialog(title,body,onSave,saveText='حفظ',danger=false){
    $('#adminDialogTitle').textContent=title;$('#adminDialogBody').innerHTML=body;
    const b=$('#adminDialogSave');b.textContent=saveText;b.classList.toggle('reject',danger);b.classList.toggle('primary',!danger);b.classList.remove('hidden');dialogSave=onSave;dialog.showModal();
  }
  function closeDialog(){if(dialog.open)dialog.close();dialogSave=null}
  $('#adminDialogClose').onclick=closeDialog;$('#adminDialogCancel').onclick=closeDialog;dialog.addEventListener('click',e=>{if(e.target===dialog)closeDialog()});dialogForm.addEventListener('submit',async e=>{e.preventDefault();if(dialogSave)await dialogSave(new FormData(dialogForm))});

  async function renderStudents(){
    const d=await call('admin_get_students'),rows=d.students||[];
    content.innerHTML=`${heading('◇','الطلاب','السجل الفعلي للطلاب مع ربط ولي الأمر والبيانات الأساسية')}
      <div class="admin-toolbar admin-filter-toolbar"><input id="studentSearch" placeholder="بحث باسم الطالب أو الهوية أو ولي الأمر"><button id="addStudent" class="button primary" type="button">إضافة طالب</button><button id="studentRefresh" class="button quiet" type="button">تحديث</button></div>
      <div class="results-summary"><strong id="studentCount">${rows.length}</strong><span>طالبًا</span></div>
      <div class="table-wrap admin-table-card"><table class="admin-table"><thead><tr><th>الطالب</th><th>هوية الطالب</th><th>المرحلة</th><th>الصف</th><th>ولي الأمر</th><th>هوية ولي الأمر</th><th>الجوال</th><th>إجراء</th></tr></thead><tbody id="studentRows">${rows.map(r=>`<tr data-search="${esc([r.student_name,r.student_national_id,r.parent_display_name,r.parent_national_id,r.parent_mobile,r.class_name,r.stage].join(' ').toLowerCase())}"><td><strong>${esc(r.student_name||'—')}</strong></td><td dir="ltr">${esc(r.student_national_id||'—')}</td><td>${esc(r.stage||'—')}</td><td>${esc(r.class_name||'—')}</td><td>${esc(r.parent_display_name||'—')}</td><td dir="ltr">${esc(r.parent_national_id||'—')}</td><td dir="ltr">${esc(r.parent_mobile||'—')}</td><td><div class="actions"><button class="button quiet compact-action" data-edit-student="${esc(r.id)}" type="button">تعديل</button><button class="button reject compact-action" data-delete-student="${esc(r.id)}" type="button">حذف</button></div></td></tr>`).join('')||'<tr><td colspan="8"><div class="empty-state">لا توجد بيانات طلاب.</div></td></tr>'}</tbody></table></div>`;
    const filter=()=>{const q=$('#studentSearch').value.trim().toLowerCase();let n=0;$$('#studentRows tr').forEach(r=>{const show=r.dataset.search.includes(q);r.classList.toggle('hidden',!show);if(show)n++});$('#studentCount').textContent=n};
    $('#studentSearch').oninput=filter;$('#studentRefresh').onclick=()=>load('students');$('#addStudent').onclick=()=>openStudentDialog();
    const rowsMap=new Map(rows.map(r=>[String(r.id),r]));
    $$('[data-edit-student]').forEach(b=>b.onclick=()=>openStudentEdit(rowsMap.get(String(b.dataset.editStudent))));
    $$('[data-delete-student]').forEach(b=>b.onclick=async()=>{if(!confirm('هل أنت متأكد من حذف الطالب؟'))return;const before=rowsMap.get(String(b.dataset.deleteStudent));try{await call('admin_delete_student',{student_id:b.dataset.deleteStudent});await logDetailedChange('admin_delete_student','student','الطالب '+(before?.student_name||b.dataset.deleteStudent),before||null,null,{method:'تم حذف الطالب من قائمة الطلاب في لوحة الإدارة.'});notify('تم حذف الطالب.');await load('students')}catch(e){alert(e.message)}});
  }


  function openStudentDialog(){
    openDialog('إضافة طالب','<div class="dialog-form-grid"><label>اسم الطالب<input name="student_name" required maxlength="200"></label><label>رقم هوية الطالب<input name="student_national_id" inputmode="numeric" maxlength="10" required></label><label>المرحلة<select name="stage" required><option value="روضة">روضة</option><option value="ابتدائي">ابتدائي</option></select></label><label>الصف<input name="class_name" required maxlength="100"></label><label>رقم هوية ولي الأمر<input name="parent_national_id" inputmode="numeric" maxlength="10" required></label><label>رقم جوال ولي الأمر<input name="parent_mobile" inputmode="numeric" maxlength="10" required placeholder="05xxxxxxxx"></label></div>',async form=>{try{const data=Object.fromEntries(form.entries());const result=await call('admin_add_student',data);await logDetailedChange('admin_add_student','student','الطالب '+(data.student_name||result.student?.student_name||''),null,{student:data,parent:{national_id:data.parent_national_id,mobile:data.parent_mobile}},{method:'تمت إضافة الطالب وربطه بولي الأمر من نموذج إدارة الطلاب.'});closeDialog();notify('تمت إضافة الطالب وربطه بولي الأمر.');await load('students')}catch(e){alert(e.message)}},'إضافة الطالب');
  }

  function openStudentEdit(row){
    const body=`<div class="dialog-form-grid"><label>اسم الطالب<input name="student_name" required maxlength="200" value="${esc(row?.student_name||'')}"></label><label>رقم هوية الطالب<input name="student_national_id" inputmode="numeric" maxlength="10" required value="${esc(row?.student_national_id||'')}"></label><label>المرحلة<select name="stage" required><option value="روضة" ${row?.stage==='روضة'?'selected':''}>روضة</option><option value="ابتدائي" ${row?.stage==='ابتدائي'?'selected':''}>ابتدائي</option></select></label><label>الصف<input name="class_name" required maxlength="100" value="${esc(row?.class_name||'')}"></label><label>ولي الأمر<input name="parent_display_name" readonly value="${esc(row?.parent_display_name||'')}"></label><label>هوية ولي الأمر<input name="parent_national_id" inputmode="numeric" maxlength="10" required value="${esc(row?.parent_national_id||'')}"></label><label>جوال ولي الأمر<input name="parent_mobile" inputmode="numeric" maxlength="10" required placeholder="05xxxxxxxx" value="${esc(row?.parent_mobile||'')}"></label></div>`;
    openDialog('تعديل بيانات الطالب',body,async form=>{try{const after=Object.fromEntries(form.entries());await call('admin_update_student',{student_id:row.id,...after});await logDetailedChange('admin_edit_student','student','الطالب '+(row.student_name||row.id),{student_name:row.student_name||'',student_national_id:row.student_national_id||'',stage:row.stage||'',class_name:row.class_name||'',parent_national_id:row.parent_national_id||'',parent_mobile:row.parent_mobile||''},{student_name:after.student_name||'',student_national_id:after.student_national_id||'',stage:after.stage||'',class_name:after.class_name||'',parent_national_id:after.parent_national_id||'',parent_mobile:after.parent_mobile||''},{method:'تم تعديل بيانات الطالب وبيانات ولي أمره من نموذج إدارة الطلاب.'});closeDialog();notify('تم تحديث بيانات الطالب وولي الأمر بنجاح.');await load('students')}catch(e){alert(e.message)}},'حفظ التعديل');
  }

  async function renderParents(){
    const [d,reg]=await Promise.all([call('admin_get_parent_management'),call('admin_get_parent_registrations')]);
    const rows=d.parents||[],devices=d.devices||[],registrations=reg.registrations||[];
    const pendingDevices=devices.filter(x=>x.status==='pending');
    content.innerHTML=`${heading('◎','أولياء الأمور','إدارة الحسابات والأبناء والأجهزة وتسجيلات الدخول')}
      <div class="nested-stack">
        <details class="admin-nested-panel nested-item" open><summary><span>حسابات أولياء الأمور</span><em>${rows.length}</em></summary><div class="nested-body">
          <div class="admin-toolbar"><input id="parentSearch" placeholder="بحث بالاسم أو رقم الهوية"><button id="addParent" class="button primary" type="button">إضافة ولي أمر</button><button id="parentRefresh" class="button quiet" type="button">تحديث</button></div>
          <div class="table-wrap admin-table-card"><table class="admin-table"><thead><tr><th>الاسم</th><th>رقم الهوية</th><th>الأبناء</th><th>الحالة</th><th>الجهاز</th><th>إجراء</th></tr></thead><tbody id="parentRows">${rows.map(r=>{const pd=devices.filter(dv=>String(dv.parent_id)===String(r.id));const activeDevice=pd.find(dv=>dv.status==='approved');const active=Boolean(activeDevice);const pending=pd.filter(dv=>dv.status==='pending').length;const deviceText=active?'جهاز مرتبط':pending?'جهاز بانتظار الاعتماد':'لا يوجد جهاز';const deviceClass=active?'active':pending?'pending attention-red':'muted';return `<tr data-search="${esc([r.display_name,r.national_id].join(' ').toLowerCase())}"><td><strong>${esc(r.display_name||'—')}</strong><small>${esc(r.relationship||'')}</small></td><td dir="ltr">${esc(r.national_id||'—')}</td><td>${(r.students||[]).length} أبناء</td><td><span class="status-chip ${esc(r.status||'')}">${esc(r.status==='active'?'فعال':r.status==='blocked'?'موقوف':'مراجعة')}</span></td><td><span class="status-chip ${deviceClass}">${deviceText}</span>${active?`<button class="button reject compact-action" data-device-action="${esc(activeDevice.id)}" data-device-status="rejected" data-unlink-device="${esc(activeDevice.id)}" type="button">فك الارتباط</button>`:''}${pending?`<small class="device-pending-note">يوجد جهاز جديد ينتظر الاعتماد</small>`:''}</td><td><div class="actions"><button class="button quiet compact-action" data-edit-parent="${esc(r.id)}" type="button">تعديل</button><button class="button reject compact-action" data-delete-parent="${esc(r.id)}" type="button">حذف</button></div></td></tr>`}).join('')||'<tr><td colspan="6"><div class="empty-state">لا توجد حسابات.</div></td></tr>'}</tbody></table></div>
        </div></details>
        <details class="admin-nested-panel nested-item" ${pendingDevices.length?'open':''}><summary><span>طلبات ربط الأجهزة</span><em>${pendingDevices.length}</em></summary><div class="nested-body">${renderDeviceRequests(pendingDevices)}</div></details>
        <details class="admin-nested-panel nested-item"><summary><span>سجل تسجيلات أولياء الأمور</span><em>${registrations.length}</em></summary><div class="nested-body">${renderRegistrations(registrations.slice(0,100))}</div></details>
      </div>`;
    const rowsMap=new Map(rows.map(r=>[String(r.id),r]));
    $('#parentSearch').oninput=e=>$$('#parentRows tr').forEach(r=>r.classList.toggle('hidden',!r.dataset.search.includes(e.target.value.trim().toLowerCase())));
    $('#parentRefresh').onclick=()=>load('parents');$('#addParent').onclick=()=>openParentDialog();
    $$('[data-edit-parent]').forEach(b=>b.onclick=()=>openParentEdit(rowsMap.get(String(b.dataset.editParent))));
    $$('[data-delete-parent]').forEach(b=>b.onclick=async()=>{if(!confirm('قد يؤدي حذف ولي الأمر إلى رفض العملية إذا كانت له سجلات مرتبطة. هل تريد المتابعة؟'))return;const before=rowsMap.get(String(b.dataset.deleteParent));try{await call('admin_delete_parent',{parent_id:b.dataset.deleteParent});await logDetailedChange('admin_delete_parent','parent','ولي الأمر '+(before?.display_name||b.dataset.deleteParent),before||null,null,{method:'تم حذف حساب ولي الأمر من لوحة الإدارة بعد التحقق من السجلات المرتبطة.'});notify('تم حذف ولي الأمر.');await load('parents')}catch(e){alert(e.message)}});
    $$('[data-device-action]').forEach(b=>b.onclick=async()=>{if(b.hasAttribute('data-unlink-device')&&!confirm('سيتم فك ارتباط هذا الجهاز، ويمكن بعد ذلك اعتماد جهاز آخر لولي الأمر. هل تريد المتابعة؟'))return;b.disabled=true;const before=devices.find(x=>String(x.id)===String(b.dataset.deviceAction));try{await call('admin_update_parent_device',{device_id:b.dataset.deviceAction,status:b.dataset.deviceStatus});await logDetailedChange('admin_edit_parent_device','device','جهاز ولي الأمر '+b.dataset.deviceAction,{status:before?.status||'pending',device_id:before?.id||b.dataset.deviceAction},{status:b.dataset.deviceStatus,device_id:b.dataset.deviceAction},{method:b.hasAttribute('data-unlink-device')?'تم فك ارتباط جهاز ولي الأمر من لوحة الإدارة.':b.dataset.deviceStatus==='approved'?'تم اعتماد الجهاز من لوحة الإدارة.':'تم رفض جهاز ولي الأمر من لوحة الإدارة.'});notify(b.hasAttribute('data-unlink-device')?'تم فك ارتباط الجهاز.':b.dataset.deviceStatus==='approved'?'تم اعتماد الجهاز.':'تم رفض الجهاز.');await load('parents')}catch(e){alert(e.message);b.disabled=false}});
    $$('[data-verify-mobile]').forEach(b=>b.onclick=async()=>{
      if(!confirm('هل أنت متأكد أن هذا رقم ولي الأمر؟'))return;
      b.disabled=true;
      try{
        const result=await call('admin_verify_parent_registration',{registration_id:b.dataset.verifyMobile});
        notify(result.message||'تم توثيق رقم الجوال وربطه بولي الأمر.');
        await load('parents');
      }catch(e){alert(e.message);b.disabled=false}
    });
  }
  function renderDeviceRequests(devices){
    if(!devices.length)return '<div class="empty-state">لا توجد طلبات أجهزة معلقة.</div>';
    return `<div class="device-request-grid">${devices.map(d=>`<article class="device-request data-device-pending"><div><strong>${esc(d.display_name||'ولي أمر')}</strong><small dir="ltr">${esc(d.national_id||'')}</small></div><strong class="device-alert-title">✕ جهاز جديد ينتظر التحقق</strong><span class="muted">${dateLabel(d.created_at)}</span><p class="device-pending-help">لن يُسمح بربطه إذا كان هناك جهاز آخر مرتبط حاليًا. يجب تسجيل خروج ولي الأمر أولًا.</p><div class="actions"><button class="button primary" data-device-action="${esc(d.id)}" data-device-status="approved" type="button">اعتماد وربط الجهاز</button><button class="button reject" data-device-action="${esc(d.id)}" data-device-status="rejected" type="button">رفض</button></div></article>`).join('')}</div>`;
  }
  function renderRegistrations(rows){
    if(!rows.length)return '<div class="empty-state">لا توجد تسجيلات.</div>';
    return `<div class="table-wrap admin-table-card"><table class="admin-table registration-table"><thead><tr><th>ولي الأمر</th><th>الجوال المدخل</th><th>الحالة</th><th>وقت التسجيل</th></tr></thead><tbody>${rows.map(r=>{
      const match=r.mobile_match===true||r.status==='auto_approved'||r.status==='approved';
      const status=match?'<span class="registration-status verified">✓ مطابق</span>':`<button class="registration-status needs-review" type="button" data-verify-mobile="${esc(r.id)}">✕ يرجى التحقق</button>`;
      return `<tr><td><strong>${esc(r.parent_name||'ولي أمر')}</strong><small dir="ltr">${esc(r.parent_national_id||'—')}</small></td><td dir="ltr">${esc(r.entered_mobile||'—')}</td><td>${status}</td><td>${dateLabel(r.created_at)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  function openParentDialog(){openDialog('إضافة ولي أمر','<div class="dialog-form-grid"><label>الاسم<input name="display_name" required maxlength="200"></label><label>رقم الهوية<input name="national_id" inputmode="numeric" maxlength="10" required></label><label>رقم الجوال<input name="mobile" inputmode="numeric" maxlength="10" placeholder="05xxxxxxxx" required></label><label>صلة القرابة<input name="relationship" maxlength="80" value="ولي أمر"></label></div>',async form=>{try{const data=Object.fromEntries(form.entries());await call('admin_create_parent',data);await logDetailedChange('admin_add_parent','parent','ولي الأمر '+(data.display_name||''),null,{display_name:data.display_name,national_id:data.national_id,mobile:data.mobile,relationship:data.relationship},{method:'تمت إضافة حساب ولي الأمر من لوحة الإدارة.'});closeDialog();notify('تمت إضافة ولي الأمر.');await load('parents')}catch(e){alert(e.message)}},'إضافة ولي الأمر')}
  function openParentEdit(row){const body=`<div class="dialog-form-grid"><label>الاسم<input name="display_name" required maxlength="200" value="${esc(row?.display_name||'')}"></label><label>رقم الهوية<input name="national_id" inputmode="numeric" maxlength="10" required value="${esc(row?.national_id||'')}"></label><label>رقم الجوال<input name="mobile" inputmode="numeric" maxlength="10" required placeholder="05xxxxxxxx" value="${esc(row?.mobile||'')}"></label><label>صلة القرابة<input name="relationship" maxlength="80" value="${esc(row?.relationship||'ولي أمر')}"></label><label>الحالة<select name="status"><option value="active" ${row?.status==='active'?'selected':''}>فعال</option><option value="blocked" ${row?.status==='blocked'?'selected':''}>موقوف</option><option value="pending_review" ${row?.status==='pending_review'?'selected':''}>مراجعة</option></select></label></div><p class="muted">يجب إدخال رقم الجوال الأساسي عند التعديل.</p>`;openDialog('تعديل ولي الأمر',body,async form=>{try{const after=Object.fromEntries(form.entries());await call('admin_update_parent',{parent_id:row.id,...after});await logDetailedChange('admin_edit_parent','parent','ولي الأمر '+(row.display_name||row.id),{display_name:row.display_name,national_id:row.national_id,mobile:row.mobile,relationship:row.relationship,status:row.status},{display_name:after.display_name,national_id:after.national_id,mobile:after.mobile,relationship:after.relationship,status:after.status},{method:'تم تعديل بيانات ولي الأمر من نموذج إدارة أولياء الأمور.'});closeDialog();notify('تم تحديث بيانات ولي الأمر.');await load('parents')}catch(e){alert(e.message)}},'حفظ التعديل')}

  async function renderDelegations(){
    let d;try{d=await Bsmat.request('admin-delegations',{body:{action:'admin_get_delegations'},token})}catch(e){if(e.status===401)expire();throw e}
    const sessions=d.sessions||[],requests=d.requests||[];
    const grouped=new Map();
    sessions.forEach(s=>{
      const key=String(s.delegate_contact_id||'')+'|'+String(s.parent_id||s.parent_name||'')+'|'+String(s.delegate_name||'');
      if(!grouped.has(key))grouped.set(key,{name:s.delegate_name||'مفوض',mobile:s.delegate_mobile||'',parent:s.parent_name||'ولي أمر',sessions:[],requests:[]});
      grouped.get(key).sessions.push(s);
    });
    requests.forEach(r=>{
      const keyName=String(r.delegate_name||'');
      const g=[...grouped.values()].find(x=>x.name===keyName || (r.parent_name&&x.parent===r.parent_name&&x.name===keyName));
      if(g)g.requests.push(r);
    });
    const cards=[...grouped.values()];
    content.innerHTML=`${heading('◇','التفويضات','بطاقة واحدة لكل مفوض مع سجل جلسات التفويض المرتبطة به')}
      <div class="delegate-grid-admin">${cards.map((g,idx)=>{
        const visibleSessions=g.sessions.filter(x=>x.status==='active'||x.status==='revoked'),active=visibleSessions.filter(x=>x.status==='active').length,revoked=visibleSessions.filter(x=>x.status==='revoked').length;
        return `<article class="delegate-admin-card" data-delegate-card="${idx}"><button type="button" class="delegate-card-toggle"><span><strong>${esc(g.name)}</strong><small>${esc(g.parent)}</small></span><span class="status-chip ${active?'active':'muted'}">${active?'فعال':'غير فعال'}</span></button><div class="delegate-card-summary"><span>عدد مرات التفويض: <b>${visibleSessions.length}</b></span><span>فعالة: <b>${active}</b></span><span>فك/إلغاء التفويض: <b>${revoked}</b></span></div><div class="delegate-card-details hidden"><p dir="ltr">${esc(g.mobile||'')}</p><div class="delegate-history">${visibleSessions.slice().sort((a,b)=>new Date(b.created_at||b.starts_at||0)-new Date(a.created_at||a.starts_at||0)).map((x,i)=>`<div class="delegate-history-row"><strong>#${i+1} ${esc(x.delegation_type==='permanent'?'دائم':'مؤقت')}</strong><span>${esc(x.status==='active'?'فعال':'تم فك التفويض')}</span><time>${dateLabel(x.starts_at||x.created_at)}</time></div>`).join('')||'<div class="empty-state">لا يوجد سجل.</div>'}</div></div></article>`;
      }).join('')||'<div class="empty-state">لا توجد تفويضات مسجلة.</div>'}</div>
      <section class="admin-nested-panel" style="margin-top:14px"><div class="admin-panel-head"><div><h3>طلبات الاستلام عبر المفوضين</h3><p>تظهر أسفل سجل المفوضين دون تكرار بطاقاته.</p></div></div><div class="table-wrap admin-table-card"><table class="admin-table"><thead><tr><th>المفوض</th><th>الطلاب</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>${requests.map(r=>`<tr><td><strong>${esc(r.delegate_name||'مفوض')}</strong><small>${esc(r.parent_name||'ولي أمر')}</small></td><td>${esc((r.student_names||[]).join('، ')||'—')}</td><td><span class="status-chip ${esc(r.status||'')}">${esc(statusLabel(r.status))}</span></td><td>${dateLabel(r.created_at)}</td></tr>`).join('')||'<tr><td colspan="4"><div class="empty-state">لا توجد طلبات عبر المفوضين.</div></td></tr>'}</tbody></table></div></section>`;
    $$('.delegate-card-toggle').forEach(btn=>btn.onclick=()=>btn.parentElement.querySelector('.delegate-card-details')?.classList.toggle('hidden'));
  }

  const auditActionLabels={
    add_student:'إضافة طالب',update_student:'تعديل بيانات طالب',delete_student:'حذف طالب',
    add_parent:'إضافة ولي أمر',update_parent:'تعديل بيانات ولي أمر',delete_parent:'حذف ولي أمر',
    update_parent_device:'تحديث حالة جهاز ولي الأمر',approve_request:'الموافقة على طلب',
    reject_request:'رفض طلب',archive_request:'أرشفة طلب',update_site_content:'تعديل محتوى الموقع',
    update_admin_sound_setting:'تعديل إعدادات صوت الإدارة',update_school_schedule:'تعديل مواعيد اليوم',
    admin_edit_student:'تعديل بيانات طالب',admin_add_student:'إضافة طالب',admin_delete_student:'حذف طالب',
    admin_add_parent:'إضافة ولي أمر',admin_edit_parent:'تعديل بيانات ولي أمر',admin_delete_parent:'حذف ولي أمر',
    admin_edit_parent_device:'تعديل جهاز ولي الأمر',admin_approve_request:'الموافقة على طلب',admin_reject_request:'رفض طلب'
  };
  const prettyJson=value=>{try{return JSON.stringify(value,null,2)}catch{return String(value??'')}};
  const auditFieldLabels={student_name:'اسم الطالب',student_national_id:'رقم هوية الطالب',parent_national_id:'رقم هوية ولي الأمر',parent_mobile:'جوال ولي الأمر',mobile:'رقم الجوال',display_name:'الاسم',relationship:'صلة القرابة',class_name:'الصف',stage:'المرحلة',section:'الفصل',status:'الحالة',request_type:'نوع الطلب',request_source:'مصدر الطلب',reject_reason:'سبب الرفض',excuse_reason:'سبب الاستئذان',delegation_id:'معرّف التفويض',delegate_name:'اسم المفوض',delegate_mobile:'جوال المفوض',national_id:'رقم الهوية',device_id:'معرّف الجهاز',permissions:'الصلاحيات',role:'الدور',phone:'رقم الجوال',email:'البريد الإلكتروني',social:'وسيلة التواصل'};
  const auditDisplayValue=value=>value==null?'—':typeof value==='object'?prettyJson(value):String(value);
  function auditSummary(log){
    const d=log?.details&&typeof log.details==='object'?log.details:{};
    const action=auditActionLabels[log?.action]||String(log?.action||'عملية غير معروفة');
    const entity=d.entity_label||d.entity_type||'';
    const method=d.method||'تم تنفيذ العملية من لوحة الإدارة بعد التحقق من جلسة الإدارة.';
    const before=d.before&&typeof d.before==='object'?d.before:null,after=d.after&&typeof d.after==='object'?d.after:null;
    const changes=d.changes&&typeof d.changes==='object'?d.changes:{};
    const keys=[...new Set([...Object.keys(before||{}),...Object.keys(after||{})])];
    for(const key of keys){const a=before?.[key]??null,b=after?.[key]??null;if(JSON.stringify(a)!==JSON.stringify(b)&&!changes[key])changes[key]={before:a,after:b}}
    const changed=Array.isArray(d.changed_fields)&&d.changed_fields.length?d.changed_fields:Object.keys(changes);
    const student=d.student_name||(after||before||{}).student_name||((d.student_names||(after||before||{}).student_names||[]).join('، '));
    const recipient=(after||before||{}).recipient_name||(after||before||{}).delegate_name||(after||before||{}).parent_name;
    const processed=(after||before||{}).processed_at||log?.created_at;
    const rejectAction=String(log?.action||'').includes('reject');
    const methodDetail=rejectAction?`تم رفض طلب ${student||entity}${recipient?` الذي كان سيستلمه ${recipient}`:''} بواسطة ${d.actor_name||log?.actor||'الإدارة'} في ${dateLabel(processed)}.${d.reason?` السبب: ${d.reason}`:''}`:method;
    return {action,entity,method:methodDetail,changed,changes,before,after,reason:d.reason||d.note||'',actor:d.actor_name||log?.actor||'الإدارة'};
  }
  function renderAuditLogs(rows){
    if(!Array.isArray(rows)||!rows.length)return '<div class="empty-state">لا توجد عمليات مسجلة حتى الآن.</div>';
    return `<div class="audit-log-list">${rows.slice(0,300).map(log=>{const x=auditSummary(log);const changed=x.changed.length?x.changed.map(key=>auditFieldLabels[key]||key).join('، '):'لم يتم تحديد حقول منفصلة';const details=Object.entries(x.changes).map(([key,value])=>`<li><strong>${esc(auditFieldLabels[key]||key)}</strong><span><code>${esc(auditDisplayValue(value?.before))}</code><b aria-hidden="true"> ← </b><code>${esc(auditDisplayValue(value?.after))}</code></span></li>`).join('');return `<details class="audit-log-row"><summary><div><strong>${esc(x.action)}</strong><p>${esc(x.entity||'سجل إداري')}</p></div><div class="audit-log-meta"><span>${esc(x.actor==='admin'?'الإدارة':x.actor)}</span><time>${dateLabel(log.created_at)}</time></div></summary><div class="audit-log-detail"><div><strong>ماذا حدث؟</strong><p>${esc(x.action)}${x.entity?` — ${esc(x.entity)}`:''}.</p></div><div><strong>من نفّذ العملية؟</strong><p>${esc(x.actor)}</p></div><div><strong>متى؟</strong><p>${esc(dateLabel(log.created_at))}</p></div><div><strong>كيف؟</strong><p>${esc(x.method)}</p></div><div><strong>البيانات التي تغيّرت</strong><p>${esc(changed)}</p>${details?`<ul class="audit-change-list">${details}</ul>`:''}</div>${x.reason?`<div><strong>الملاحظة / السبب</strong><p>${esc(x.reason)}</p></div>`:''}${x.before!==null?`<div><strong>قبل العملية</strong><pre>${esc(prettyJson(x.before))}</pre></div>`:''}${x.after!==null?`<div><strong>بعد العملية</strong><pre>${esc(prettyJson(x.after))}</pre></div>`:''}</div></details>`}).join('')}</div>`;
  }

  async function renderSettings(){
    const pref=settings();
    let site=JSON.parse(JSON.stringify(defaultSiteContent));
    let auditLogs=[];
    try{
      const [remote,audit]=await Promise.all([call('admin_get_site_content'),call('admin_get_audit_logs')]);
      site={privacy:{...site.privacy,...(remote.privacy||{})},terms:{...site.terms,...(remote.terms||{})},contact:{...site.contact,...(remote.contact||{})}};
      auditLogs=audit.logs||[];
    }catch{}
    const staffAdmin=canManageStaff();
    const permissionInputs=ADMIN_PERMISSION_OPTIONS.map(([value,label],index)=>`<label class="toggle-line"><input type="checkbox" name="employeePermissions" value="${value}" ${index===0||index===1?'checked':''}><span>${label}</span></label>`).join('');
    const roleOptions=`<option value="staff">موظف</option><option value="manager">مدير</option><option value="admin">مسؤول</option>${sessionAdminClaims()?.role_name==='super_admin'?'<option value="super_admin">مدير أعلى</option>':''}`;
    content.innerHTML=`${heading('⚙','الإعدادات','اختيار صوت التنبيه وأوقات النظام وإدارة محتوى صفحات الموقع دون المساس بالجلسات أو البيانات')}
      <details class="settings-panel admin-nested-panel settings-accordion"><summary><strong>حسابي · تغيير كلمة المرور</strong><span>تحديث كلمة مرور الحساب الحالي</span></summary><div class="settings-accordion-body">
        <form id="currentPasswordForm"><div class="site-content-grid"><label class="site-content-field">كلمة المرور الحالية<input id="currentAdminPassword" type="password" autocomplete="current-password" required></label><label class="site-content-field">كلمة المرور الجديدة<input id="newAdminPassword" type="password" autocomplete="new-password" minlength="8" required></label><label class="site-content-field">تأكيد كلمة المرور الجديدة<input id="confirmAdminPassword" type="password" autocomplete="new-password" minlength="8" required></label></div><div class="settings-save-row"><button id="changeAdminPassword" class="button primary" type="submit">تغيير كلمة المرور</button><span id="passwordChangeMessage" class="message" role="status" aria-live="polite"></span></div></form>
      </div></details>
      ${staffAdmin?`<details class="settings-panel admin-nested-panel settings-accordion"><summary><strong>إضافة حساب موظف</strong><span>إنشاء حساب وصلاحياته</span></summary><div class="settings-accordion-body"><form id="createStaffForm"><div class="site-content-grid"><label class="site-content-field">رقم الهوية / اسم الدخول (10 أرقام)<input name="national_id" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" autocomplete="off" required></label><label class="site-content-field">الاسم<input name="display_name" maxlength="120" required></label><label class="site-content-field">كلمة المرور<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label class="site-content-field">الدور<select name="role">${roleOptions}</select></label></div><fieldset class="admin-nested-panel"><legend>الصلاحيات</legend><div class="site-content-grid">${permissionInputs}</div></fieldset><div class="settings-save-row"><button id="createStaffAccount" class="button primary" type="submit">إضافة حساب الموظف</button><span id="staffCreateMessage" class="message" role="status" aria-live="polite"></span></div></form></div></details>`:''}
      <details class="settings-panel admin-nested-panel settings-accordion"><summary><strong>أوقات اليوم</strong><span>بداية اليوم ووقت الانصراف</span></summary><div class="settings-accordion-body">
        <div class="admin-panel-head"><div><h3>أوقات اليوم</h3><p>وقت بداية اليوم الافتراضي ووقت انصراف الطلاب الظاهر في بوابة الأهالي.</p></div></div>
        <div class="school-schedule-settings"><label>بداية اليوم<input id="dayStartTime" type="time" value="${esc(pref.dayStartTime||'06:00')}"></label><label>انصراف الطلاب<input id="dismissalTime" type="time" value="${esc(pref.dismissalTime||'15:00')}"></label><button id="saveSchedule" class="button primary" type="button">حفظ أوقات اليوم</button></div>
      </div></details>
      <details class="settings-panel admin-nested-panel settings-accordion"><summary><strong>أصوات التنبيه</strong><span>إدارة أصوات التنبيه ومعاينتها</span></summary><div class="settings-accordion-body">
        <div class="admin-panel-head"><div><h3>أصوات التنبيه</h3><p>اختر واحدًا من 10 أصوات قوية. زر المعاينة يشغّل الصوت فورًا، والاختيار محفوظ على هذا الجهاز.</p></div></div>
        <div class="sound-settings-head"><label class="toggle-line"><input id="adminSoundEnabled" type="checkbox" ${pref.sound!==false?'checked':''}><span><strong>تفعيل أصوات التنبيه</strong><small>السماح بتشغيل الصوت من لوحة الإدارة.</small></span></label><span class="sound-current">الصوت الحالي: <strong>${esc((SOUND_PRESETS.find(x=>x.id===pref.soundPreset)||SOUND_PRESETS[0]).name)}</strong></span></div>
        <div class="sound-grid">${SOUND_PRESETS.map((sound,index)=>{const checked=(pref.soundPreset||'signal-1')===sound.id;return `<label class="sound-choice ${checked?'is-selected':''}"><input type="radio" name="adminSoundPreset" value="${esc(sound.id)}" ${checked?'checked':''}><span class="sound-index">${index+1}</span><span class="sound-choice-copy"><strong>${esc(sound.name)}</strong><small>${esc(sound.desc)}</small></span><button type="button" class="button quiet sound-preview" data-sound-preview="${esc(sound.id)}">معاينة</button></label>`}).join('')}</div>
      </div></details>
      <details class="settings-panel admin-nested-panel settings-accordion"><summary><strong>سياسة الخصوصية وشروط الاستخدام</strong><span>تعديل النصوص المنشورة</span></summary><div class="settings-accordion-body">
        <div class="admin-panel-head"><div><h3>سياسة الخصوصية وشروط الاستخدام</h3><p>يمكن تعديل النصوص المنشورة في الصفحات العامة وحفظها مباشرة في قاعدة البيانات.</p></div></div>
        <div class="site-content-settings">
          <div class="site-content-grid">
            <label class="site-content-field">المعلومات التي يتم جمعها<textarea id="privacyCollect" maxlength="5000">${esc(site.privacy.collect||'')}</textarea></label>
            <label class="site-content-field">كيفية استخدام المعلومات<textarea id="privacyUse" maxlength="5000">${esc(site.privacy.use||'')}</textarea></label>
            <label class="site-content-field">حفظ المعلومات ومشاركتها<textarea id="privacyStorage" maxlength="5000">${esc(site.privacy.storage||'')}</textarea></label>
            <label class="site-content-field">مدة الاحتفاظ وحقوق المستخدم<textarea id="privacyRetention" maxlength="5000">${esc(site.privacy.retention||'')}</textarea></label>
            <label class="site-content-field">التحديثات والاستفسارات<textarea id="privacyUpdates" maxlength="5000">${esc(site.privacy.updates||'')}</textarea></label>
            <label class="site-content-field">نطاق الاستخدام<textarea id="termsScope" maxlength="5000">${esc(site.terms.scope||'')}</textarea></label>
            <label class="site-content-field">مسؤولية المستخدم<textarea id="termsUser" maxlength="5000">${esc(site.terms.user||'')}</textarea></label>
            <label class="site-content-field">الخدمات والطلبات<textarea id="termsServices" maxlength="5000">${esc(site.terms.services||'')}</textarea></label>
            <label class="site-content-field">التحديثات والدعم<textarea id="termsSupport" maxlength="5000">${esc(site.terms.support||'')}</textarea></label>
          </div>
          <div class="settings-save-row"><button id="saveSiteContent" class="button primary" type="button">حفظ سياسة الخصوصية والشروط</button></div>
        </div>
      </div></details>
      <details class="settings-panel admin-nested-panel settings-accordion"><summary><strong>تواصل معنا</strong><span>بيانات التواصل الرسمية</span></summary><div class="settings-accordion-body">
        <div class="admin-panel-head"><div><h3>تواصل معنا</h3><p>أدخل بيانات التواصل الرسمية هنا لتظهر مباشرة في صفحة «تواصل معنا» في بوابة الأهالي.</p></div></div>
        <div class="site-content-grid">
          <label class="site-content-field">رقم الجوال<input id="contactPhone" maxlength="80" inputmode="tel" value="${esc(site.contact.phone||'')}" placeholder="مثال: 05xxxxxxxx"></label>
          <label class="site-content-field">البريد الإلكتروني<input id="contactEmail" maxlength="160" type="email" value="${esc(site.contact.email||'')}" placeholder="example@school.sa"></label>
          <label class="site-content-field">وسائل التواصل / اسم الحساب<input id="contactSocial" maxlength="300" value="${esc(site.contact.social||'')}" placeholder="مثال: واتساب المدرسة"></label>
          <label class="site-content-field">رابط وسائل التواصل (اختياري)<input id="contactSocialUrl" maxlength="500" type="url" value="${esc(site.contact.social_url||'')}" placeholder="https://..."></label>
        </div>
        <div class="settings-save-row"><button id="saveContactContent" class="button primary" type="button">حفظ بيانات التواصل</button></div>
      </div></details>
      <details class="settings-panel admin-nested-panel settings-accordion"><summary><strong>سجل التعديلات والعمليات</strong><span>تفاصيل تغييرات البيانات والطلبات</span></summary><div class="settings-accordion-body">
        <div class="admin-panel-head"><div><h3>سجل التعديلات والعمليات</h3><p>يوضح الطالب أو الحساب المعني، القيم قبل التعديل وبعده، منفذ العملية ووقتها، وبيانات الطلب والمستلم عند الرفض.</p></div><div class="actions"><button id="printAuditLog" class="button quiet" type="button">طباعة السجل</button><button id="refreshAuditLog" class="button quiet" type="button">تحديث السجل</button></div></div>
        <div id="adminAuditLog">${renderAuditLogs(auditLogs)}</div>
      </div></details>
      <section class="settings-panel admin-nested-panel cache-settings-always">
        <div class="admin-panel-head"><div><h3>مسح ذاكرة الكاش</h3><p>ينظف فقط CacheStorage المؤقت المرتبط بالموقع وذاكرة موارد الصفحة. لا يحذف جلسة الإدارة، ولا بيانات أولياء الأمور، ولا إعدادات المظهر، ولا بيانات الطلاب أو الطلبات.</p></div></div>
        <button id="clearCache" class="button primary cache-clear-btn" type="button">مسح ذاكرة الكاش</button>
      </section>`;
    $$('.settings-accordion').forEach(item=>item.addEventListener('toggle',()=>{if(item.open)$$('.settings-accordion').forEach(other=>{if(other!==item)other.open=false})}));
    $('#currentPasswordForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,current=$('#currentAdminPassword').value,newPass=$('#newAdminPassword').value,confirmPass=$('#confirmAdminPassword').value,message=$('#passwordChangeMessage'),button=$('#changeAdminPassword');message.textContent='';if(newPass.length<8){message.textContent='كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.';return}if(newPass!==confirmPass){message.textContent='تأكيد كلمة المرور غير مطابق.';return}button.disabled=true;try{const result=await Bsmat.request('admin-account',{body:{action:'change_password',current_password:current,new_password:newPass},token});message.textContent=result.message||'تم تغيير كلمة المرور بنجاح.';form.reset()}catch(error){if(error?.status===401&&/جلسة|حساب/.test(error.message||''))expire();message.textContent=error.message||'تعذر تغيير كلمة المرور.'}finally{button.disabled=false}};
    $('#createStaffForm')?.addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=$('#createStaffAccount'),message=$('#staffCreateMessage'),data=new FormData(form),national_id=String(data.get('national_id')||'').replace(/\D/g,'').slice(0,10),display_name=String(data.get('display_name')||'').trim(),password=String(data.get('password')||''),role=String(data.get('role')||'staff'),permissions=[...form.querySelectorAll('[name="employeePermissions"]:checked')].map(input=>input.value);message.textContent='';if(!/^\d{10}$/.test(national_id)){message.textContent='رقم الهوية يجب أن يتكون من 10 أرقام.';return}if(password.length<8){message.textContent='كلمة المرور يجب أن تكون 8 أحرف على الأقل.';return}if(!permissions.length&&role!=='super_admin'){message.textContent='اختر صلاحية واحدة على الأقل.';return}button.disabled=true;try{const result=await call('admin_create_staff',{national_id,display_name,password,role,permissions});message.textContent=result.message||'تم إنشاء الحساب بنجاح.';form.reset()}catch(error){message.textContent=error.message||'تعذر إنشاء حساب الموظف.'}finally{button.disabled=false}});
    $('#createStaffForm [name="national_id"]')?.addEventListener('input',event=>{event.currentTarget.value=event.currentTarget.value.replace(/\D/g,'').slice(0,10)});
    const commit=patch=>saveSettings({...settings(),...patch});
  const logAdminChange=async(action,details)=>{try{await Bsmat.request('admin-log-action',{body:{logged_action:action,details},token})}catch{}};
  const logDetailedChange=async(action,entityType,entityLabel,before,after,extra={})=>{
    const b=before&&typeof before==='object'?before:null,a=after&&typeof after==='object'?after:null;
    const keys=[...new Set([...Object.keys(b||{}),...Object.keys(a||{})])];
    const changes={};const changed=[];
    keys.forEach(k=>{const bv=b?.[k]??null,av=a?.[k]??null;if(JSON.stringify(bv)!==JSON.stringify(av)){changed.push(k);changes[k]={before:bv,after:av}}});
    const requestId=Number(extra.request_id)||Number((String(entityLabel).match(/#(\d+)/)||[])[1])||null;
    return logAdminChange(action,{entity_type:entityType,entity_label:entityLabel,entity_id:extra.entity_id||b?.id||a?.id||null,request_id:requestId,student_id:Number(extra.student_id)||null,student_name:extra.student_name||b?.student_name||a?.student_name||'',student_names:extra.student_names||b?.student_names||a?.student_names||[],recipient_name:extra.recipient_name||b?.recipient_name||a?.recipient_name||b?.delegate_name||a?.delegate_name||'',actor_name:extra.actor_name||school.staff,method:extra.method||'تم تنفيذ العملية من لوحة الإدارة بعد تسجيل الدخول.',changed_fields:changed,changes,before:b,after:a,reason:extra.reason||''});
  };
    $('#adminSoundEnabled').onchange=e=>{commit({sound:e.target.checked});if(e.target.checked)playPreset();logAdminChange('update_admin_sound_setting',{setting:'sound',after:e.target.checked});};
    $$('input[name=adminSoundPreset]').forEach(r=>r.onchange=()=>{const before=settings().soundPreset;commit({soundPreset:r.value});$$('.sound-choice').forEach(x=>x.classList.toggle('is-selected',x.querySelector('input')?.checked));playPreset(r.value);logAdminChange('update_admin_sound_setting',{setting:'soundPreset',before,after:r.value});});
    $$('[data-sound-preview]').forEach(btn=>btn.onclick=()=>playPreset(btn.dataset.soundPreview));
    $('#refreshAuditLog').onclick=async()=>{const b=$('#refreshAuditLog');b.disabled=true;try{const d=await call('admin_get_audit_logs');$('#adminAuditLog').innerHTML=renderAuditLogs(d.logs||[]);notify('تم تحديث سجل التعديلات.')}catch(e){notify(e.message||'تعذر تحديث السجل.',true)}finally{b.disabled=false}};
    $('#printAuditLog').onclick=()=>{const popup=window.open('','_blank');if(!popup){notify('يرجى السماح بفتح نافذة الطباعة.',true);return}const currentName=sessionAdminName(),auditMarkup=$('#adminAuditLog').innerHTML.replace(/<details class="audit-log-row"/g,'<details open class="audit-log-row"');popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>سجل التعديلات والعمليات</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#241a30;position:relative}body:before{content:'${esc(currentName)}';position:fixed;inset:38% 0 auto;text-align:center;font-size:58px;font-weight:900;color:rgba(74,46,111,.08);transform:rotate(-28deg);z-index:-1;pointer-events:none}.print-head{display:flex;align-items:center;gap:14px;border-bottom:3px solid #c18a20;padding-bottom:12px;margin-bottom:16px}.print-head img{width:72px;height:72px;object-fit:contain}.print-head h1{font-size:19px;color:#4a2e6f;margin:0}.print-head p{font-size:12px;margin:4px 0}.print-meta{margin-inline-start:auto;text-align:left;font-size:11px}details{border:1px solid #ccc;border-radius:8px;margin:8px 0;padding:10px;break-inside:avoid}summary{font-weight:bold}.audit-log-meta{color:#555}.audit-log-detail{padding:8px}.audit-change-list{line-height:2}pre{white-space:pre-wrap;direction:ltr;text-align:left;border:1px solid #ddd;padding:8px}button{display:none}.print-foot{text-align:center;border-top:1px solid #ccc;padding-top:8px;margin-top:18px;font-size:10px}@media print{body{padding:0}}</style></head><body><header class="print-head"><img src="${new URL(school.logo,location.href).href}" alt="شعار المدرسة"><div><h1>${esc(school.name)}</h1><p>${esc(school.subtitle)}</p></div><div class="print-meta"><strong>سجل التعديلات والعمليات</strong><br>تاريخ الطباعة: ${esc(dateLabel(new Date().toISOString()))}<br>إعداد: ${esc(currentName)} — ${esc(school.role)}</div></header>${auditMarkup}<footer class="print-foot">منظومة النداء والاستئذان المدرسي المعتمدة</footer></body></html>`);popup.document.close();popup.focus();popup.print()};
    $('#clearCache').onclick=clearTemporaryCache;
    $('#saveSchedule').onclick=()=>{
      const dayStart=$('#dayStartTime').value||'06:00',dismissal=$('#dismissalTime').value||'15:00';
      const before=settings();commit({dayStartTime:dayStart,dismissalTime:dismissal});
      try{localStorage.setItem('bsmat.school.schedule.v1',JSON.stringify({dayStartTime:dayStart,dismissalTime:dismissal}))}catch{}
      notify('تم حفظ أوقات اليوم.');logAdminChange('update_school_schedule',{before:{dayStartTime:before.dayStartTime,dismissalTime:before.dismissalTime},after:{dayStartTime:dayStart,dismissalTime:dismissal}});
    };
    $('#saveSiteContent').onclick=async()=>{
      const button=$('#saveSiteContent');button.disabled=true;
      try{
        const before={privacy:typeof structuredClone==='function'?structuredClone(site.privacy):{...site.privacy},terms:typeof structuredClone==='function'?structuredClone(site.terms):{...site.terms},contact:typeof structuredClone==='function'?structuredClone(site.contact):{...site.contact}};
        const after={privacy:{collect:$('#privacyCollect').value,use:$('#privacyUse').value,storage:$('#privacyStorage').value,retention:$('#privacyRetention').value,updates:$('#privacyUpdates').value},terms:{scope:$('#termsScope').value,user:$('#termsUser').value,services:$('#termsServices').value,support:$('#termsSupport').value},contact:{phone:$('#contactPhone').value,email:$('#contactEmail').value,social:$('#contactSocial').value,social_url:$('#contactSocialUrl').value}};
        await call('admin_update_site_content',after);
        await logDetailedChange('admin_edit_site_content','site_settings','سياسة الخصوصية وشروط الاستخدام وبيانات التواصل',before,after,{method:'تم تعديل محتوى الصفحات العامة وبيانات التواصل من تبويب الإعدادات.'});
        notify('تم حفظ سياسة الخصوصية وشروط الاستخدام.');
      }catch(e){notify(e.message||'تعذر حفظ المحتوى.',true)}
      finally{button.disabled=false}
    };
    $('#saveContactContent').onclick=async()=>{
      const button=$('#saveContactContent');button.disabled=true;
      try{
        const before={privacy:{...site.privacy},terms:{...site.terms},contact:{...site.contact}};
        const after={privacy:{collect:$('#privacyCollect').value,use:$('#privacyUse').value,storage:$('#privacyStorage').value,retention:$('#privacyRetention').value,updates:$('#privacyUpdates').value},terms:{scope:$('#termsScope').value,user:$('#termsUser').value,services:$('#termsServices').value,support:$('#termsSupport').value},contact:{phone:$('#contactPhone').value,email:$('#contactEmail').value,social:$('#contactSocial').value,social_url:$('#contactSocialUrl').value}};
        await call('admin_update_site_content',after);
        await logDetailedChange('admin_edit_contact','site_settings','بيانات التواصل معانا',before.contact,after.contact,{method:'تم تعديل بيانات التواصل من تبويب الإعدادات.'});
        notify('تم حفظ بيانات التواصل.');
      }catch(e){notify(e.message||'تعذر حفظ بيانات التواصل.',true)}
      finally{button.disabled=false}
    };
  }

  function reportRowsToMatrix(rows){return rows.map(r=>[studentNames(r),Array.isArray(r.student_classes)?r.student_classes.join('، '):(r.student_class||'—'),typeLabel(r.request_type),statusLabel(r.status),dateLabel(r.created_at),dateLabel(r.processed_at||r.archived_at),r.recipient_name||r.delegate_name||r.parent_name||'—',r.excuse_reason||r.reject_reason||'—'])}
  function isCurrentRiyadhMonth(value){if(!value)return false;const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit'});return fmt.format(new Date(value))===fmt.format(new Date())}
  function reportTitle(){return 'تقرير الطلبات المدرسية'}
  async function renderReports(){
    const [archive,live]=await Promise.all([call('admin_get_archive'),call('admin_get_all_requests')]);
    const archiveRows=archive.records||[];
    const completedRows=[...new Map((live.requests||[]).filter(r=>['approved','rejected'].includes(r.status)&&isCurrentRiyadhMonth(r.created_at)).map(r=>[String(r.id),r])).values()];
    const unique=[...new Map([...archiveRows,...completedRows].map(r=>[String(r.id),r])).values()];
    const sources=[...new Set(unique.map(r=>r.request_source).filter(Boolean))];
    let activeReportTab='archive';
    let activeRows=archiveRows;
    content.innerHTML=`${heading('▤','التقارير','السجل المكتمل يعرض الشهر الحالي؛ وتنقل الأرشفة الشهرية السجلات الأقدم إلى قاعدة الأرشيف')}
      <div class="report-tab-bar"><button class="button primary" data-report-tab="archive" type="button">الأرشيف <span>${archiveRows.length}</span></button><button class="button quiet" data-report-tab="completed" type="button">سجل الطلبات المكتملة <span>${completedRows.length}</span></button></div>
      <div class="report-tools admin-nested-panel"><div class="report-tool-row"><label>من تاريخ<input id="reportFrom" type="date"></label><label>إلى تاريخ<input id="reportTo" type="date"></label><label>نوع الطلب<select id="reportType"><option value="all">كل الأنواع</option><option value="pickup">نداء انصراف</option><option value="excuse">استئذان مبكر</option></select></label><label>المصدر<select id="reportSource"><option value="all">كل المصادر</option>${sources.map(s=>`<option value="${esc(s)}">${esc(sourceLabel(s))}</option>`).join('')}</select></label><button id="clearReportFilters" class="button quiet" type="button">مسح الفلاتر</button></div><div class="report-export-actions"><button id="printReport" class="button primary" type="button">طباعة / PDF</button><button id="exportWord" class="button quiet" type="button">Word</button><button id="exportExcel" class="button quiet" type="button">Excel</button></div></div>
      <div id="reportPreview" class="report-preview"></div>`;
    const getFiltered=()=>activeRows.filter(r=>{const from=$('#reportFrom')?.value||'',to=$('#reportTo')?.value||'',type=$('#reportType')?.value||'all',source=$('#reportSource')?.value||'all';return isInRange(r,from,to)&&(type==='all'||r.request_type===type)&&(source==='all'||r.request_source===source)});
    const draw=()=>{const rows=getFiltered();$('#reportPreview').innerHTML=`<div class="report-print-head"><div class="report-brand"><img src="${school.logo}" alt="شعار المدرسة"><div><h1>${esc(school.name)}</h1><p>${esc(school.subtitle)}</p></div></div><div class="report-meta"><div><strong>${esc(activeReportTab==='archive'?'تقرير أرشيف الطلبات':'سجل الطلبات المكتملة')}</strong><span>عدد السجلات: ${rows.length}</span></div><div><strong>إعداد التقرير</strong><span>${esc(school.staff)} — ${esc(school.role)}</span></div></div></div>${buildReportTable(rows)}`};
    const setTab=(name)=>{activeReportTab=name;activeRows=name==='archive'?archiveRows:completedRows;$$('[data-report-tab]').forEach(b=>{const on=b.dataset.reportTab===name;b.classList.toggle('primary',on);b.classList.toggle('quiet',!on)});draw()};
    $$('[data-report-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.reportTab));
    ['reportFrom','reportTo','reportType','reportSource'].forEach(id=>$('#'+id).addEventListener('input',draw));
    $('#clearReportFilters').onclick=()=>{$('#reportFrom').value='';$('#reportTo').value='';$('#reportType').value='all';$('#reportSource').value='all';draw()};
    $('#printReport').onclick=()=>openPrintReport(getFiltered(),activeReportTab);
    $('#exportWord').onclick=()=>exportWord(getFiltered(),activeReportTab);
    $('#exportExcel').onclick=()=>exportExcel(getFiltered(),activeReportTab);
    draw();
  }

  function buildReportTable(rows){return `<div class="report-summary-bar"><span>السجلات المطابقة: <strong>${rows.length}</strong></span><span>الفترة حسب المرشح المحدد أعلاه</span></div><div class="table-wrap admin-table-card report-table"><table class="admin-table"><thead><tr><th>اسم الطالب</th><th>الصف</th><th>نوع الطلب</th><th>الحالة</th><th>وقت الطلب</th><th>وقت المعالجة</th><th>اسم المستلم</th><th>السبب / الملاحظة</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(studentNames(r))}</td><td>${esc(Array.isArray(r.student_classes)?r.student_classes.join('، '):(r.student_class||'—'))}</td><td>${esc(typeLabel(r.request_type))}</td><td><span class="status-chip ${esc(r.status||'')}">${esc(statusLabel(r.status))}</span></td><td>${dateLabel(r.created_at)}</td><td>${dateLabel(r.processed_at||r.archived_at)}</td><td>${esc(r.recipient_name||r.delegate_name||r.parent_name||'—')}</td><td>${esc(r.excuse_reason||r.reject_reason||'—')}</td></tr>`).join('')||'<tr><td colspan="8"><div class="empty-state">لا توجد سجلات مطابقة للفلاتر.</div></td></tr>'}</tbody></table></div>`}

  function buildPrintDocument(rows,reportTab='archive'){
    const currentName=sessionAdminName();
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(reportTitle())}</title><style>
      @page{size:A4 landscape;margin:9mm}body{font-family:Tahoma,Arial,sans-serif;color:#231a35;margin:0;direction:rtl;position:relative}*{box-sizing:border-box}.watermark{position:fixed;inset:40% 0 auto;z-index:0;text-align:center;transform:rotate(-28deg);font-size:58px;font-weight:900;color:rgba(74,46,111,.08);pointer-events:none}.head,.summary,table,.foot{position:relative;z-index:1}.head{border-bottom:3px solid #c18a20;padding-bottom:8px;margin-bottom:9px}.brand{display:flex;align-items:center;gap:12px}.brand img{display:block;width:64px;height:64px;object-fit:contain}.brand h1{margin:0;font-size:18px;color:#4a2e6f}.brand p{margin:4px 0 0;font-size:11px;color:#6f647d}.meta{display:flex;justify-content:space-between;gap:12px;margin-top:8px;font-size:10px}.meta div{display:grid;gap:3px}.summary{margin:8px 0;padding:6px 8px;border:1px solid #d9caea;background:#f7f4fb;border-radius:6px;font-size:10px}table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:8px;line-height:1.25}th,td{border:1px solid #d8d0e1;padding:4px 5px;text-align:right;vertical-align:top;white-space:normal!important;overflow-wrap:anywhere;word-break:normal}th{background:#eee8f6;color:#4a2e6f;font-weight:800}.status{font-weight:700}.approved{color:#177a45}.rejected{color:#b3343f}.foot{margin-top:9px;border-top:1px solid #ddd5e6;padding-top:5px;font-size:8px;color:#72687d;text-align:center}</style></head><body>
      <div class="watermark">${esc(currentName)}</div><div class="head"><div class="brand"><img src="${new URL(school.logo,location.href).href}" alt=""><div><h1>${esc(school.name)}</h1><p>${esc(school.subtitle)}</p></div></div><div class="meta"><div><strong>${esc(reportTab==='archive'?'تقرير أرشيف الطلبات':'سجل الطلبات المكتملة')}</strong><span>وقت الطباعة: ${dateLabel(new Date().toISOString())}</span></div><div><strong>إعداد التقرير</strong><span>${esc(currentName)} — ${esc(school.role)}</span></div></div></div>
      <div class="summary">عدد السجلات: <strong>${rows.length}</strong></div>
      <table><thead><tr><th>اسم الطالب</th><th>الصف</th><th>النوع</th><th>الحالة</th><th>وقت الطلب</th><th>وقت المعالجة</th><th>اسم المستلم</th><th>السبب/الملاحظة</th></tr></thead><tbody>${rows.map(r=>{const m=reportRowsToMatrix([r])[0];return `<tr>${m.map((v,i)=>`<td class="${i===3?'status '+(r.status==='approved'?'approved':'rejected'):''}">${esc(v)}</td>`).join('')}</tr>`}).join('')||'<tr><td colspan="8">لا توجد سجلات مطابقة.</td></tr>'}</tbody></table>
      <div class="foot">منظومة النداء والاستئذان المدرسي المعتمدة · ${esc(school.role)}</div>
    </body></html>`;
  }
  function openPrintReport(rows,reportTab='archive'){
    if(!printRoot){notify('تعذر تجهيز قالب الطباعة.',true);return}
    const source=buildPrintDocument(rows,reportTab),body=source.match(/<body>([\s\S]*)<\/body>/i)?.[1]||'';
    const styles=source.match(/<style>([\s\S]*?)<\/style>/i)?.[1]||'';
    printRoot.innerHTML=`<style>${styles}</style>${body}`;
    printRoot.setAttribute('aria-hidden','false');
    const cleanup=()=>{printRoot.innerHTML='';printRoot.setAttribute('aria-hidden','true')};
    const logo=printRoot.querySelector('.brand img');
    const ready=logo?.decode?logo.decode().catch(()=>{}):Promise.resolve();
    ready.then(()=>setTimeout(()=>{window.print();setTimeout(cleanup,600)},100));
  }

  const zip={
    u16(a,n,v){a[n]=v&255;a[n+1]=(v>>>8)&255},
    u32(a,n,v){a[n]=v&255;a[n+1]=(v>>>8)&255;a[n+2]=(v>>>16)&255;a[n+3]=(v>>>24)&255},
    crc32(data){let c=0xffffffff;for(let i=0;i<data.length;i++){c^=data[i];for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0},
    build(entries){
      const files=entries.map(([name,text])=>[new TextEncoder().encode(name),typeof text==='string'?new TextEncoder().encode(text):text]);let total=0;const parts=[],central=[];let offset=0;
      for(const [name,data] of files){const crc=this.crc32(data),h=new Uint8Array(30+name.length);this.u32(h,0,0x04034b50);this.u16(h,4,20);this.u16(h,6,0);this.u16(h,8,0);this.u16(h,10,0);this.u16(h,12,0);this.u32(h,14,crc);this.u32(h,18,data.length);this.u32(h,22,data.length);this.u16(h,26,name.length);this.u16(h,28,0);h.set(name,30);parts.push(h,data);const c=new Uint8Array(46+name.length);this.u32(c,0,0x02014b50);this.u16(c,4,20);this.u16(c,6,20);this.u16(c,8,0);this.u16(c,10,0);this.u16(c,12,0);this.u16(c,14,0);this.u32(c,16,crc);this.u32(c,20,data.length);this.u32(c,24,data.length);this.u16(c,28,name.length);this.u16(c,30,0);this.u16(c,32,0);this.u16(c,34,0);this.u16(c,36,0);this.u32(c,38,0);this.u32(c,42,offset);c.set(name,46);central.push(c);offset+=h.length+data.length;total+=h.length+data.length}
      const centralSize=central.reduce((s,x)=>s+x.length,0),end=new Uint8Array(22);this.u32(end,0,0x06054b50);this.u16(end,4,0);this.u16(end,6,0);this.u16(end,8,files.length);this.u16(end,10,files.length);this.u32(end,12,centralSize);this.u32(end,16,total);this.u16(end,20,0);return new Blob([...parts,...central,end],{type:'application/octet-stream'})
    }
  };

  function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200)}
  function xmlEsc(v){return esc(v).replace(/&#39;/g,"&apos;")}
  async function exportWord(rows,reportTab='archive'){
    const header=['اسم الطالب','الصف','النوع','الحالة','وقت الطلب','وقت المعالجة','اسم المستلم','السبب / الملاحظة'];
    const tableRows=rows.map(r=>`<w:tr>${reportRowsToMatrix([r])[0].map(v=>`<w:tc><w:p><w:r><w:t xml:space="preserve">${xmlEsc(v)}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`).join('');
    const documentXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:jc w:val="center"/><w:bidi/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>${xmlEsc(school.name)}</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/><w:bidi/></w:pPr><w:r><w:t>${xmlEsc(school.subtitle)}</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/><w:bidi/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>${xmlEsc(reportTab==='archive'?'أرشيف الطلبات':'سجل الطلبات المكتملة')}</w:t></w:r></w:p><w:p><w:pPr><w:bidi/></w:pPr><w:r><w:t>إعداد التقرير: ${xmlEsc(school.staff)} — ${xmlEsc(school.role)} | التاريخ: ${xmlEsc(dateLabel(new Date().toISOString()))}</w:t></w:r></w:p><w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="6" w:color="4A2E6F"/><w:left w:val="single" w:sz="6" w:color="4A2E6F"/><w:bottom w:val="single" w:sz="6" w:color="4A2E6F"/><w:right w:val="single" w:sz="6" w:color="4A2E6F"/><w:insideH w:val="single" w:sz="4" w:color="D8D0E1"/><w:insideV w:val="single" w:sz="4" w:color="D8D0E1"/></w:tblBorders><w:bidiVisual/></w:tblPr><w:tr>${header.map(h=>`<w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${xmlEsc(h)}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>${tableRows}</w:tbl><w:p><w:pPr><w:jc w:val="center"/><w:bidi/></w:pPr><w:r><w:t>منظومة النداء والاستئذان المدرسي المعتمدة</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/><w:bidi/></w:pPr><w:r><w:t>تم إنشاء وتطوير النظام من قبل أ. إخلاص الحضيري | وكيلة مدرسة بسمات الوعد الأهلية</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900"/></w:sectPr></w:body></w:document>`;
    downloadBlob(zip.build([['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],['word/document.xml',documentXml]]),'bsmat-'+reportTab+'-report.docx');notify('تم إنشاء ملف Word.');
  }

  function exportExcel(rows,reportTab='archive'){
    const header=['اسم الطالب','الصف','النوع','الحالة','وقت الطلب','وقت المعالجة','اسم المستلم','السبب / الملاحظة'];
    const sheetRows=[header,...reportRowsToMatrix(rows)];
    const xRows=[[school.name],[school.subtitle],[reportTab==='archive'?'أرشيف الطلبات':'سجل الطلبات المكتملة'],[`إعداد التقرير: ${school.staff} — ${school.role}`],[`تاريخ التصدير: ${dateLabel(new Date().toISOString())}`],[],...sheetRows];
    const colName=n=>{let s='';do{s=String.fromCharCode(65+(n%26))+s;n=Math.floor(n/26)-1}while(n>=0);return s};
    const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xRows.map((row,i)=>`<row r="${i+1}">${row.map((v,j)=>`<c r="${colName(j)}${i+1}" t="inlineStr"><is><t>${xmlEsc(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
    const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="تقرير الطلبات" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const wbRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
    const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
    downloadBlob(zip.build([['[Content_Types].xml',ct],['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],['xl/workbook.xml',workbook],['xl/_rels/workbook.xml.rels',wbRels],['xl/worksheets/sheet1.xml',sheet]]),'bsmat-'+reportTab+'-report.xlsx');notify('تم إنشاء ملف Excel.');
  }
  let livePoll=null,liveInitialized=false,liveSyncInFlight=false,seenPendingRequestIds=new Set();
  let activeRequestAlerts=new Set(),requestAlertTimer=null;
  async function playNewRequestAlert(){
    const pref=settings(); if(pref.sound===false)return;
    await playPreset(pref.soundPreset);
    setTimeout(()=>playPreset(pref.soundPreset),260);
    setTimeout(()=>playPreset(pref.soundPreset),520);
  }
  function stopRequestAlert(requestId){
    activeRequestAlerts.delete(String(requestId));
    if(!activeRequestAlerts.size&&requestAlertTimer){
      clearInterval(requestAlertTimer);
      requestAlertTimer=null;
    }
  }
  function stopAllRequestAlerts(){
    activeRequestAlerts.clear();
    if(requestAlertTimer){clearInterval(requestAlertTimer);requestAlertTimer=null}
  }
  function startRequestAlert(requestId){
    const id=String(requestId);
    activeRequestAlerts.add(id);
    if(requestAlertTimer)return;
    playNewRequestAlert();
    requestAlertTimer=setInterval(()=>{
      if(!activeRequestAlerts.size){clearInterval(requestAlertTimer);requestAlertTimer=null;return}
      playNewRequestAlert();
    },3000);
  }
  function stopLiveRequestMonitor(){
    if(livePoll)clearInterval(livePoll);
    livePoll=null;liveInitialized=false;seenPendingRequestIds=new Set();
    stopAllRequestAlerts();
  }
  async function syncLiveRequests(silent=false){
    if(!token||liveSyncInFlight)return;liveSyncInFlight=true;
    try{
      const d=await call('admin_get_all_requests');
      const pending=(d.requests||[]).filter(r=>r.status==='pending');
      const ids=new Set(pending.map(r=>String(r.id)));
      if(!liveInitialized){seenPendingRequestIds=ids;liveInitialized=true;return;}

      for(const id of [...activeRequestAlerts]){
        if(!ids.has(id))stopRequestAlert(id);
      }
      const newIds=[...ids].filter(id=>!seenPendingRequestIds.has(id));
      seenPendingRequestIds=ids;
      if(!silent&&newIds.length){
        newIds.forEach(startRequestAlert);
        notify(newIds.length===1?'وصل طلب نداء جديد.':`وصلت ${newIds.length} طلبات نداء جديدة.`);
        if(activeTab==='requests')await load('requests');
      }
    }catch{}finally{liveSyncInFlight=false}
  }
  function startLiveRequestMonitor(){
    stopLiveRequestMonitor();
    syncLiveRequests(true);
    livePoll=setInterval(()=>syncLiveRequests(false),2000);
  }

  nationalId?.addEventListener('input',()=>{nationalId.value=String(nationalId.value||'').replace(/\D/g,'').slice(0,10)});
  loginForm.addEventListener('submit',async event=>{
    event.preventDefault();
    primeSoundContext();
    const nid=String(nationalId?.value||'').trim();
    const pass=String(password.value||'').trim();
    if(!/^\d{10}$/.test(nid)){loginMessage.textContent='أدخل رقم الهوية المكون من 10 أرقام.';nationalId?.focus();return}
    if(!pass){loginMessage.textContent='أدخل الرقم السري.';password.focus();return}
    const button=$('#loginButton');button.disabled=true;loginMessage.textContent='جارٍ التحقق…';
    try{
      const data=await Bsmat.request('admin-api',{body:{action:'admin_login',national_id:nid,password:pass}});
      token=data.session_token||data.token||'';
      if(!token)throw new Error('لم يُرجع الخادم جلسة إدارة.');
      sessionStorage.setItem(Bsmat.keys.adminSession,token);
      setLoggedIn(true);
      loginMessage.textContent='تم تسجيل الدخول بنجاح.';
      nationalId.value='';
      password.value='';
      activateTab('stats');
      startLiveRequestMonitor();
    }catch(error){
      loginMessage.textContent=error.message||'تعذر تسجيل الدخول.';
      setLoggedIn(false);
    }finally{button.disabled=false}
  });
  $('#logout').onclick=()=>{stopLiveRequestMonitor();sessionStorage.removeItem(Bsmat.keys.adminSession);token=null;setLoggedIn(false);nationalId.value='';password.value='';loginMessage.textContent='تم تسجيل الخروج.';notify('تم تسجيل الخروج')};
  $$('[data-tab]').forEach(button=>button.addEventListener('click',()=>{if(token)activateTab(button.dataset.tab)}));
  $$('[data-go-tab]').forEach(button=>button.addEventListener('click',()=>{if(token)activateTab(button.dataset.goTab)}));
  $('#staff').onclick=()=>{const card=$('#staffCard'),opened=card.classList.toggle('hidden')===false;$('#staff').setAttribute('aria-expanded',String(opened))};
  setLoggedIn(Boolean(token));if(token){activateTab('stats');startLiveRequestMonitor();}
})();
