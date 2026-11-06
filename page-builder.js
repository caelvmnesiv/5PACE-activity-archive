(() => {
  const root = document.getElementById('page-builder');
  if (!root || !window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
  const db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const $ = (s) => root.querySelector(s);
  const state = { config: null, isAdmin: false, dragId: null };
  const sectionDefs = [
    { id: 'hero', label: 'HERO / PORTADA', selector: '.hero', group: 'main' },
    { id: 'magazine', label: 'THE MAGAZINE', selector: '#magazine', group: 'panels' },
    { id: 'activity-board', label: 'ACTIVITY BOARD', selector: '#activity-board', group: 'panels' },
    { id: 'bottom-strip', label: 'EDITORIAL STRIP', selector: '.bottom-strip', group: 'main' },
    { id: 'about', label: 'ABOUT', selector: '.about', group: 'main' }
  ];
  const defaults = {
    theme: { paper:'#f2f0ec', white:'#fbfaf7', ink:'#090909', red:'#f20d19', line:'#aaa7a0', displayFont:'Barlow Condensed', bodyFont:'Manrope' },
    sections: Object.fromEntries(sectionDefs.map((s,i)=>[s.id,{visible:true,order:i+1}])),
    images: {}
  };
  const clone = x => JSON.parse(JSON.stringify(x));
  const safe = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mergeConfig(raw) {
    const c = {...clone(defaults), ...(raw || {})};
    c.theme = {...defaults.theme, ...(c.theme || {})};
    c.sections = {...defaults.sections, ...(c.sections || {})};
    c.images = {...(c.images || {})};
    return c;
  }
  function applyConfig() {
    const t = state.config.theme, style = document.documentElement.style;
    style.setProperty('--paper', t.paper); style.setProperty('--white', t.white);
    style.setProperty('--ink', t.ink); style.setProperty('--red', t.red);
    style.setProperty('--line', t.line);
    if (t.displayFont) style.setProperty('--display', "'" + t.displayFont.replace(/[';]/g,'') + "', Impact, sans-serif");
    if (t.bodyFont) style.setProperty('--sans', "'" + t.bodyFont.replace(/[';]/g,'') + "', Arial, sans-serif");
    sectionDefs.forEach(s => {
      const el = document.querySelector(s.selector), cfg = state.config.sections[s.id] || {};
      if (el) { el.hidden = cfg.visible === false; el.style.order = String(Number(cfg.order) || 1); }
    });
    document.querySelector('.panels')?.style.setProperty('display','grid');
    const panels = document.querySelector('.panels');
    if (panels) {
      panels.style.display = 'grid';
      ['magazine','activity-board'].forEach(id => {
        const def = sectionDefs.find(s=>s.id===id), el = document.querySelector(def.selector);
        if (el) el.style.order = String(Number(state.config.sections[id]?.order) || (id==='magazine'?1:2));
      });
    }
    Object.entries(state.config.images).forEach(([key,url]) => {
      if (!url) return;
      const img = document.querySelector('[data-site-image="'+key+'"]');
      if (img) img.src = url;
    });
  }
  function sectionList(group) {
    return sectionDefs.filter(s=>s.group===group).sort((a,b)=>(state.config.sections[a.id]?.order||0)-(state.config.sections[b.id]?.order||0));
  }
  function renderSections(group) {
    return sectionList(group).map(s => {
      const visible = state.config.sections[s.id]?.visible !== false;
      return '<div class="pb-section" draggable="true" data-section="'+s.id+'"><span class="pb-grip">⠿</span><span class="pb-section-name">'+s.label+'</span><span class="pb-state">'+(visible?'VISIBLE':'HIDDEN')+'</span><button type="button" data-toggle="'+s.id+'">'+(visible?'HIDE':'SHOW')+'</button></div>';
    }).join('');
  }
  function render() {
    root.innerHTML = `
      <div class="pb-top"><div><strong>PAGE BUILDER</strong><small>STRUCTURE · DESIGN · MEDIA</small></div><span class="pb-status">DRAFT EDITOR</span></div>
      <div class="pb-columns">
        <section class="pb-card"><h4>01 / PAGE STRUCTURE</h4><p>Arrastra las secciones para cambiar su orden. Puedes ocultarlas sin borrar su contenido.</p><div class="pb-list" data-group="main">${renderSections('main')}</div><h4 class="pb-subhead">02 / FEATURE PANELS</h4><div class="pb-list" data-group="panels">${renderSections('panels')}</div></section>
        <section class="pb-card"><h4>03 / DESIGN STUDIO</h4><div class="pb-fields">
          <label>Fondo principal <input type="color" data-theme="paper"></label><label>Fondo de paneles <input type="color" data-theme="white"></label>
          <label>Texto <input type="color" data-theme="ink"></label><label>Color de acento <input type="color" data-theme="red"></label>
          <label>Líneas y bordes <input type="color" data-theme="line"></label>
          <label>Tipografía de títulos<select data-font="displayFont"><option>Barlow Condensed</option><option>Oswald</option><option>Archivo Black</option><option>Montserrat</option><option>Arial</option></select></label>
          <label>Tipografía de texto<select data-font="bodyFont"><option>Manrope</option><option>Inter</option><option>DM Sans</option><option>Arial</option></select></label>
        </div><h4 class="pb-subhead">04 / MEDIA LIBRARY</h4><label class="pb-upload">Subir imagen o reemplazar portada<input type="file" id="pb-image" accept="image/png,image/jpeg,image/webp,image/gif,image/avif"></label><select id="pb-image-target"><option value="hero">Imagen principal</option><option value="magazine">Portada de The Magazine</option><option value="strip">Imagen de la franja editorial</option></select><p class="pb-note">Imágenes de hasta 10 MB. Se guardan en Supabase Storage.</p></section>
      </div>
      <div class="pb-actions"><button type="button" id="pb-preview">PREVIEW</button><button type="button" id="pb-save">SAVE DRAFT</button><button type="button" id="pb-publish">PUBLISH CHANGES ↗</button><span id="pb-message" role="status"></span></div>
      <p class="pb-footnote">Los cambios publicados afectan a la página para todos los visitantes. El borrador se guarda por separado.</p>`;
    root.querySelectorAll('[data-theme]').forEach(el=>el.value=state.config.theme[el.dataset.theme]);
    root.querySelectorAll('[data-font]').forEach(el=>el.value=state.config.theme[el.dataset.font]);
    bind();
  }
  function message(s){const el=$('#pb-message');if(el)el.textContent=s;}
  function renumber(group) { sectionList(group).forEach((s,i)=>state.config.sections[s.id].order=i+1); }
  function bind() {
    root.querySelectorAll('[data-theme]').forEach(el=>el.addEventListener('input',()=>{state.config.theme[el.dataset.theme]=el.value;applyConfig();}));
    root.querySelectorAll('[data-font]').forEach(el=>el.addEventListener('change',()=>{state.config.theme[el.dataset.font]=el.value;applyConfig();}));
    root.querySelectorAll('[data-toggle]').forEach(el=>el.addEventListener('click',()=>{const id=el.dataset.toggle;state.config.sections[id].visible=!state.config.sections[id].visible;applyConfig();render();}));
    root.querySelectorAll('.pb-section').forEach(el=>{
      el.addEventListener('dragstart',e=>{state.dragId=el.dataset.section;e.dataTransfer.effectAllowed='move';});
      el.addEventListener('dragover',e=>{e.preventDefault();});
      el.addEventListener('drop',e=>{e.preventDefault();const target=el.dataset.section,source=state.dragId;if(!source||source===target)return;
        const a=sectionDefs.find(x=>x.id===source),b=sectionDefs.find(x=>x.id===target);if(!a||!b||a.group!==b.group)return;
        const arr=sectionList(a.group).map(x=>x.id),from=arr.indexOf(source),to=arr.indexOf(target);arr.splice(from,1);arr.splice(to,0,source);arr.forEach((id,i)=>state.config.sections[id].order=i+1);applyConfig();render();
      });
    });
    $('#pb-preview').addEventListener('click',()=>{applyConfig();message('Vista previa aplicada en esta sesión. Aún no se publicó.');});
    $('#pb-save').addEventListener('click',()=>save(false));
    $('#pb-publish').addEventListener('click',()=>save(true));
    $('#pb-image').addEventListener('change',uploadImage);
  }
  async function save(publish) {
    message('Guardando…');
    const key=publish?'published':'draft';
    const payload = publish
      ? {id:1,config:state.config,draft_config:state.config,updated_at:new Date().toISOString()}
      : {id:1,draft_config:state.config,updated_at:new Date().toISOString()};
    const {error}=await db.from('page_settings').upsert(payload);
    if(error){message('Error: '+error.message);return;}
    message(publish?'Cambios publicados.':'Borrador guardado.');
  }
  async function uploadImage(e) {
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>10*1024*1024){message('La imagen supera 10 MB.');return;}
    const target=$('#pb-image-target').value, key={hero:'hero',magazine:'magazine',strip:'strip'}[target];
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const path=key+'/'+Date.now()+'.'+ext;
    message('Subiendo imagen…');
    const {error}=await db.storage.from('site-media').upload(path,file,{upsert:false,contentType:file.type});
    if(error){message('No se pudo subir: '+error.message);return;}
    const {data}=db.storage.from('site-media').getPublicUrl(path);
    state.config.images[key]=data.publicUrl;
    const img=document.querySelector('[data-site-image="'+key+'"]');
    if(img)img.src=data.publicUrl;
    message('Imagen cargada. Guarda o publica para conservar el cambio.');
    e.target.value='';
  }
  async function init() {
    const {data,error}=await db.from('page_settings').select('config,draft_config').eq('id',1).maybeSingle();
    if(error){console.warn('5PACE page settings:',error.message);return;}
    const {data:{session}}=await db.auth.getSession();
    let isAdmin=false;
    if(session?.user){const {data:admin,error:adminError}=await db.rpc('is_admin');isAdmin=!adminError&&admin===true;}
    state.isAdmin=isAdmin;
    state.config=mergeConfig(isAdmin ? (data?.draft_config || data?.config) : data?.config);
    applyConfig();
    if(!isAdmin)return;
    render();
  }
  init();
})();