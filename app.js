(() => {
  const $ = (s) => document.querySelector(s);
  const list = $('#activity-list'), search = $('#search'), filter = $('#filter');
  const icons = ['▦','✳','△','□','●','▦','✳','✦','＋'];
  const state = { activities: [], isAdmin: false, user: null, adminPanelOpen: false };
  const configured = window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY;
  const db = configured ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const setMessage = (message) => { $('#auth-message').textContent = message; };

  function updateFilterOptions() {
    const current = filter.value;
    filter.innerHTML = '<option value="all">Todos los tipos</option>';
    [...new Set(state.activities.map(a => a.category).filter(Boolean))].forEach(type => {
      const option = document.createElement('option'); option.value = type; option.textContent = type; filter.append(option);
    });
    filter.value = [...filter.options].some(o => o.value === current) ? current : 'all';
  }
  function render() {
    const q = search.value.trim().toLowerCase(), type = filter.value;
    const rows = state.activities.filter(a => (!q || `${a.title} ${a.category || ''}`.toLowerCase().includes(q)) && (type === 'all' || type === a.category));
    list.innerHTML = rows.map((a, i) => {
      const url = a.content?.facebook_url || '';
      const tag = url ? 'a' : 'div';
      const href = url ? `href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"` : '';
      const edit = state.isAdmin ? `<button class="edit-activity" type="button" data-edit="${escapeHtml(a.id)}">EDIT</button><button class="delete-activity" type="button" data-delete="${escapeHtml(a.id)}">×</button>` : '';
      return `<${tag} class="activity-row" ${href}><span class="activity-symbol">${icons[i % icons.length]}</span><span class="activity-title">${escapeHtml(a.title)}</span><span class="type-pill">${escapeHtml(a.category || 'Activity')}</span><span class="activity-arrow">${url ? '→' : '—'}</span>${edit}</${tag}>`;
    }).join('') || `<p class="empty-state">${state.user ? 'No hay actividades disponibles para esta cuenta.' : 'Inicia sesión para acceder al Activity Board.'}</p>`;
    $('#result-count').textContent = String(rows.length).padStart(2, '0') + ' ACTIVIDADES';
    $('#admin-panel').hidden = !(state.isAdmin && state.adminPanelOpen);
    $('#admin-open').hidden = !state.isAdmin || state.adminPanelOpen;
    document.body.classList.toggle('admin-mode', state.isAdmin && state.adminPanelOpen);
    if (state.isAdmin) wireRowActions();
  }
  function wireRowActions() {
    document.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation(); const a = state.activities.find(x => x.id === button.dataset.edit); if (!a) return;
      $('#activity-id').value = a.id; $('#activity-title').value = a.title; $('#activity-category').value = a.category || 'Office’ prompts'; $('#activity-url').value = a.content?.facebook_url || ''; $('#activity-status').value = a.status; $('#activity-title').focus();
    }));
    document.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', async e => {
      e.preventDefault(); e.stopPropagation(); if (!confirm('¿Eliminar esta actividad?')) return;
      const { error } = await db.from('activities').delete().eq('id', button.dataset.delete);
      if (error) return setMessage('No se pudo eliminar: ' + error.message);
      await loadActivities(); setMessage('Actividad eliminada.');
    }));
  }
  async function loadActivities() {
    if (!state.user) { state.activities = []; updateFilterOptions(); render(); return; }
    const { data, error } = await db.from('activities').select('id,title,category,content,status,created_at').neq('status','draft').order('created_at',{ascending:false});
    if (error) { state.activities = []; setMessage('No se pudieron cargar las actividades: ' + error.message); }
    else state.activities = data || [];
    if (state.isAdmin) {
      const { data: adminRows, error: adminError } = await db.from('activities').select('id,title,category,content,status,created_at').order('created_at',{ascending:false});
      if (!adminError) state.activities = adminRows || state.activities;
    }
    updateFilterOptions(); render();
  }
  async function refreshSession() {
    if (!db) { setMessage('Falta la configuración de Supabase.'); return; }
    const { data: { session } } = await db.auth.getSession();
    state.user = session?.user || null;
    $('#login-controls').hidden = !!state.user; $('#register-controls').hidden = !!state.user; $('#session-controls').hidden = !state.user;
    $('#session-email').textContent = state.user?.email || state.user?.phone || '';
    state.isAdmin = false;
    state.adminPanelOpen = false;
    if (state.user) {
      const { data, error } = await db.rpc('is_admin');
      state.isAdmin = !error && data === true;
      state.adminPanelOpen = state.isAdmin;
      setMessage(state.isAdmin ? 'Sesión administrativa activa.' : 'Sesión iniciada. Acceso sujeto a aprobación.');
      if (state.isAdmin) await loadMemberRequests();
    } else setMessage('Inicia sesión para consultar el directorio privado.');
    await loadActivities();
  }
  function isPhone(value) { return /^\+[1-9]\d{7,14}$/.test(value); }
  function syncAuthMethod(prefix) {
    const method = document.querySelector('#' + prefix + '-method').value;
    const field = document.querySelector('#' + prefix + '-identifier');
    field.type = method === 'email' ? 'email' : 'tel';
    field.placeholder = method === 'email' ? 'Email' : 'Teléfono internacional (+519...)';
    field.setAttribute('aria-label', method === 'email' ? 'Email' : 'Número de teléfono');
    field.autocomplete = method === 'email' ? 'email' : 'tel';
  }
  $('#login-method').addEventListener('change', () => syncAuthMethod('login'));
  $('#register-method').addEventListener('change', () => { syncAuthMethod('register'); $('#register-otp-wrap').hidden = true; $('#register-button').hidden = false; });
  syncAuthMethod('login'); syncAuthMethod('register');
  $('#login-button').addEventListener('click', async () => {
    const method = $('#login-method').value, identifier = $('#login-identifier').value.trim(), password = $('#login-password').value;
    if (!identifier || !password) return setMessage('Introduce tu correo o teléfono y tu contraseña.');
    if (method === 'phone' && !isPhone(identifier)) return setMessage('Usa el formato internacional, por ejemplo +51987654321.');
    $('#login-button').disabled = true;
    const credentials = method === 'email' ? { email: identifier, password } : { phone: identifier, password };
    const { error } = await db.auth.signInWithPassword(credentials);
    $('#login-button').disabled = false;
    if (error) return setMessage('No se pudo iniciar sesión: ' + error.message);
    await refreshSession();
  });

  $('#register-button').addEventListener('click', async () => {
    if (!db) return setMessage('Falta la configuración de Supabase.');
    const method = $('#register-method').value, fullName = $('#register-name').value.trim();
    const identifier = $('#register-identifier').value.trim(), password = $('#register-password').value, confirmation = $('#register-password-confirm').value;
    if (!fullName || !identifier || !password || !confirmation) return setMessage('Completa todos los campos para solicitar acceso.');
    if (method === 'phone' && !isPhone(identifier)) return setMessage('Usa el formato internacional, por ejemplo +51987654321.');
    if (password.length < 8) return setMessage('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirmation) return setMessage('Las contraseñas no coinciden.');
    const button = $('#register-button'); button.disabled = true;
    const options = { data: { full_name: fullName } };
    const payload = method === 'email' ? { email: identifier, password, options } : { phone: identifier, password, options };
    const { error } = await db.auth.signUp(payload);
    button.disabled = false;
    if (error) return setMessage('No se pudo crear la cuenta: ' + error.message);
    $('#register-password').value = ''; $('#register-password-confirm').value = '';
    if (method === 'phone') {
      $('#register-otp-wrap').hidden = false; $('#register-button').hidden = true;
      setMessage('Te enviamos un código SMS. Verifica el número para completar la solicitud; después quedará pendiente de aprobación administrativa.');
    } else {
      setMessage('Solicitud recibida. Si la confirmación por correo está activada, revisa tu bandeja. El acceso al Activity Board requiere aprobación administrativa.');
    }
  });
  $('#verify-phone-button').addEventListener('click', async () => {
    const phone = $('#register-identifier').value.trim(), token = $('#register-otp').value.trim();
    if (!isPhone(phone) || !/^\d{6}$/.test(token)) return setMessage('Introduce el número internacional y el código SMS de 6 dígitos.');
    const button = $('#verify-phone-button'); button.disabled = true;
    const { error } = await db.auth.verifyOtp({ phone, token, type: 'sms' });
    button.disabled = false;
    if (error) return setMessage('No se pudo verificar el número: ' + error.message);
    $('#register-otp-wrap').hidden = true; $('#register-otp').value = '';
    setMessage('Número verificado. Tu solicitud queda pendiente de aprobación administrativa.');
    await refreshSession();
  });
  async function loadMemberRequests() {
    const host = $('#member-requests-list'); if (!host || !state.isAdmin) return;
    host.innerHTML = '<p class="admin-hint">Cargando solicitudes…</p>';
    const { data, error } = await db.from('access_requests').select('id,user_id,email,phone,full_name,status,created_at').order('created_at',{ascending:false});
    if (error) { host.innerHTML = '<p class="admin-hint">No se pudieron cargar las solicitudes: ' + escapeHtml(error.message) + '</p>'; return; }
    if (!data?.length) { host.innerHTML = '<p class="admin-hint">No hay solicitudes registradas.</p>'; return; }
    host.innerHTML = data.map(row => '<div class="member-request-row"><div><strong>' + escapeHtml(row.full_name || 'Member') + '</strong><span>' + escapeHtml(row.email || row.phone || '') + '</span><small>' + escapeHtml(row.status.toUpperCase()) + '</small></div>' + (row.status === 'pending' ? '<div class="member-request-actions"><button type="button" data-member-status="approved" data-member-id="' + escapeHtml(row.user_id) + '">APPROVE</button><button type="button" data-member-status="rejected" data-member-id="' + escapeHtml(row.user_id) + '">REJECT</button></div>' : '') + '</div>').join('');
  }
  $('#refresh-member-requests').addEventListener('click', loadMemberRequests);
  $('#member-requests-list').addEventListener('click', async e => {
    const button = e.target.closest('[data-member-status]'); if (!button || !state.isAdmin) return;
    button.disabled = true;
    const { error } = await db.from('access_requests').update({ status: button.dataset.memberStatus, reviewed_at: new Date().toISOString(), reviewed_by: state.user.id }).eq('user_id', button.dataset.memberId);
    if (error) { button.disabled = false; return setMessage('No se pudo actualizar la solicitud: ' + error.message); }
    await loadMemberRequests(); setMessage(button.dataset.memberStatus === 'approved' ? 'Miembro aprobado. Ya puede acceder cuando inicie sesión.' : 'Solicitud rechazada.');
  });

  $('#logout-button').addEventListener('click', async () => { await db.auth.signOut(); state.user = null; state.isAdmin = false; await refreshSession(); });
  $('#activity-form').addEventListener('submit', async e => {
    e.preventDefault(); if (!state.isAdmin) return;
    const id = $('#activity-id').value;
    const payload = { title: $('#activity-title').value.trim(), category: $('#activity-category').value, content: { facebook_url: $('#activity-url').value.trim() }, status: $('#activity-status').value, updated_at: new Date().toISOString() };
    const result = id ? await db.from('activities').update(payload).eq('id', id) : await db.from('activities').insert({ ...payload, created_by: state.user.id });
    if (result.error) return setMessage('No se pudo guardar: ' + result.error.message);
    $('#activity-form').reset(); $('#activity-id').value = ''; await loadActivities(); setMessage('Actividad guardada.');
  });
  $('#cancel-edit').addEventListener('click', () => { $('#activity-form').reset(); $('#activity-id').value = ''; });
  search.addEventListener('input', render); filter.addEventListener('change', render);
  $('#reset').addEventListener('click', () => { search.value = ''; filter.value = 'all'; render(); });

  const viewer = $('#viewer'), body = $('#viewer-body');
  function openViewer(title,node,mode='tab') {
    viewer.classList.remove('popup-window');if(mode==='popup')viewer.classList.add('popup-window');
    viewer.classList.add('open');viewer.setAttribute('aria-hidden','false');
    const heading=viewer.querySelector('.viewer-head span');if(heading)heading.textContent=title;
    body.replaceChildren();body.dataset.sourceId=node?.id||node?.dataset.customSection||'';body.dataset.sourceType=node?.dataset.customSection?'custom':(node?.id?'fixed':'');if(node){const clone=node.cloneNode(true);clone.querySelectorAll('button').forEach(b=>b.remove());if(clone.classList.contains('user-section')){clone.dataset.openInViewer='false';clone.dataset.displayMode='tab';}clone.hidden=false;body.append(clone);}
  }
  function openMagazine() {
    body.dataset.sourceId='';body.dataset.sourceType='';viewer.classList.remove('popup-window');viewer.classList.add('open'); viewer.setAttribute('aria-hidden','false'); const heading=viewer.querySelector('.viewer-head span');if(heading)heading.textContent='THE MAGAZINE / HEYZINE VIEWER'; const url = window.HEYZINE_URL || '';
    if (url && /^https:\/\//.test(url)) { body.innerHTML = ''; const frame = document.createElement('iframe'); frame.src = url; frame.title = 'The Magazine — Heyzine flipbook'; frame.allow = 'fullscreen'; frame.allowFullscreen = true; body.append(frame); }
    else body.innerHTML = '<p>No se ha configurado el enlace de la revista.</p>';
  }
  $('#open-magazine').addEventListener('click', openMagazine); $('#open-magazine-text').addEventListener('click', openMagazine);
  $('#about-open')?.addEventListener('click',()=>openViewer('ABOUT / 5PACE',document.querySelector('#about')));
  document.addEventListener('click',e=>{const team=e.target.closest('[data-open-team]');if(!team)return;e.preventDefault();const section=document.querySelector('#our-team');if(section)openViewer('OUR TEAM / 5PACE',section,'popup');});
  document.addEventListener('click',e=>{const about=e.target.closest('[data-open-about]');if(about){e.preventDefault();openViewer('ABOUT / 5PACE',document.querySelector('#about'));return;}});
  document.addEventListener('click',e=>{const button=e.target.closest('[data-open-custom]');if(!button)return;e.preventDefault();const section=document.querySelector('[data-custom-section="'+CSS.escape(button.dataset.openCustom)+'"]');if(section)openViewer((section.querySelector('h2')?.textContent||'5PACE SECTION')+' / 5PACE',section,section.dataset.displayMode||'tab');});
  $('#close-viewer').addEventListener('click', () => { viewer.classList.remove('open','popup-window'); viewer.setAttribute('aria-hidden','true'); body.innerHTML = '';body.dataset.sourceId='';body.dataset.sourceType='';const heading=viewer.querySelector('.viewer-head span');if(heading)heading.textContent='THE MAGAZINE / HEYZINE VIEWER'; });
  viewer.addEventListener('click', e => { if (e.target === viewer) $('#close-viewer').click(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#close-viewer').click(); });
  $('.menu-toggle').addEventListener('click', () => $('.nav').classList.toggle('nav-open'));
  $('#admin-close').addEventListener('click', () => {
    state.adminPanelOpen = false;
    $('#admin-panel').hidden = true;
    $('#admin-open').hidden = !state.isAdmin;
    document.body.classList.remove('admin-mode');
  });
  $('#admin-open').addEventListener('click', () => {
    if (!state.isAdmin) return;
    state.adminPanelOpen = true;
    $('#admin-panel').hidden = false;
    $('#admin-open').hidden = true;
    document.body.classList.add('admin-mode');
  });
  if (db) { db.auth.onAuthStateChange(() => { setTimeout(refreshSession, 0); }); refreshSession(); }
  else { setMessage('No se pudo cargar Supabase. Revisa la conexión.'); render(); }
})();
