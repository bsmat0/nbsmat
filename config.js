window.APP_CONFIG=Object.freeze({
  tenant:Object.freeze({
    schoolName:'روضة وابتدائية بسمات الوعد الأهلية',
    subtitle:'نظام النداء الذكي بالطلاب',
    staff:'إخلاص الحضيري'
  }),
  development:Object.freeze({mock:false}),
  api:Object.freeze({
    baseUrl:'https://gtbgfndskfofcxgtgqlc.supabase.co/functions/v1',
    publicKey:'sb_publishable_goqkOuoBt-PJ9gLJB7ttYw_cpfgV4qB',
    timeoutMs:15000,
    endpoints:Object.freeze({
      'parent-login':'parent-login',
      'parent-api':'parent-api',
      'parent-multi-request':'parent-multi-request',
      'parent-session':'parent-session',
      'admin-api':'parent-api',
      'admin-account':'admin-account',
      'admin-log-action':'admin-log-action',
      'admin-delegations':'admin-delegations',
      'delegation-api':'parent-delegation',
      'delegate-api':'delegate-api'
    })
  })
});
