(() => {
  const $ = (s) => document.querySelector(s);
  const list = $('#activity-list'), search = $('#search'), filter = $('#filter');
  const icons = ['▦','✳','△','□','●','▦','✳','✦','＋'];
  const state = { activities: [], isAdmin: false, user: null };
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
    $('#admin-panel').hidden = !state.isAdmin;
    $('#admin-open').hidden = !state.isAdmin || !$('#admin-panel').hidden;
    document.body.classList.toggle('admin-mode', state.isAdmin && !$('#admin-panel').hidden);
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
    $('#login-controls').hidden = !!state.user; $('#session-controls').hidden = !state.user;
    $('#session-email').textContent = state.user?.email || '';
    state.isAdmin = false;
    if (state.user) {
      const { data, error } = await db.rpc('is_admin');
      state.isAdmin = !error && data === true;
      setMessage(state.isAdmin ? 'Sesión administrativa activa.' : 'Sesión iniciada. Acceso sujeto a aprobación.');
    } else setMessage('Inicia sesión para consultar el directorio privado.');
    await loadActivities();
  }
  $('#login-button').addEventListener('click', async () => {
    const email = $('#login-email').value.trim(), password = $('#login-password').value;
    if (!email || !password) return setMessage('Introduce tu email y contraseña.');
    $('#login-button').disabled = true;
    const { error } = await db.auth.signInWithPassword({ email, password });
    $('#login-button').disabled = false;
    if (error) return setMessage('No se pudo iniciar sesión: ' + error.message);
    await refreshSession();
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
  function openMagazine() {
    viewer.classList.add('open'); viewer.setAttribute('aria-hidden','false'); const url = window.HEYZINE_URL || '';
    if (url && /^https:\/\//.test(url)) { body.innerHTML = ''; const frame = document.createElement('iframe'); frame.src = url; frame.title = 'The Magazine — Heyzine flipbook'; frame.allow = 'fullscreen'; frame.allowFullscreen = true; body.append(frame); }
    else body.innerHTML = '<p>No se ha configurado el enlace de la revista.</p>';
  }
  $('#open-magazine').addEventListener('click', openMagazine); $('#open-magazine-text').addEventListener('click', openMagazine);
  $('#close-viewer').addEventListener('click', () => { viewer.classList.remove('open'); viewer.setAttribute('aria-hidden','true'); body.innerHTML = ''; });
  viewer.addEventListener('click', e => { if (e.target === viewer) $('#close-viewer').click(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#close-viewer').click(); });
  $('.menu-toggle').addEventListener('click', () => $('.nav').classList.toggle('nav-open'));
  $('#admin-close').addEventListener('click', () => {
    $('#admin-panel').hidden = true;
    $('#admin-open').hidden = false;
    document.body.classList.remove('admin-mode');
  });
  $('#admin-open').addEventListener('click', () => {
    if (!state.isAdmin) return;
    $('#admin-panel').hidden = false;
    $('#admin-open').hidden = true;
    document.body.classList.add('admin-mode');
  });
  if (db) { db.auth.onAuthStateChange(() => { setTimeout(refreshSession, 0); }); refreshSession(); }
  else { setMessage('No se pudo cargar Supabase. Revisa la conexión.'); render(); }
})();
