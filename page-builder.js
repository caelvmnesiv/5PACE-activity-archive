(() => {
  const root = document.getElementById('page-builder');
  if (!root || !window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
  const db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const $ = (s, scope=document) => scope.querySelector(s);
  const state = { config:null, isAdmin:false, dragId:null, preview:false };
  const sectionDefs = [
    {id:'hero',label:'HERO / PORTADA',selector:'.hero',group:'main'},
    {id:'magazine',label:'THE MAGAZINE',selector:'#magazine',group:'panels'},
    {id:'activity-board',label:'ACTIVITY BOARD',selector:'#activity-board',group:'panels'},
    {id:'bottom-strip',label:'EDITORIAL STRIP',selector:'.bottom-strip',group:'main'},
    {id:'about',label:'ABOUT',selector:'.about',group:'main'}
  ];
  const editable = [
    ['brand.wordmark','.wordmark'],['nav.home','.nav nav a[href="#home"]'],['nav.magazine','.nav nav a[href="#magazine"]'],
    ['nav.board','.nav nav a[href="#activity-board"]'],['nav.archive','.nav nav a[href="#archive"]'],['nav.about','.nav nav a[href="#about"]'],
    ['nav.meta','.nav-side span:first-child'],['hero.left','.hero-left'],['hero.left_note','.hero-left small'],
    ['hero.right','.hero-right'],['hero.caption','.hero-caption'],['magazine.title','#magazine .panel-heading h2'],
    ['magazine.volume','#magazine .panel-heading span'],['magazine.stamp','.cover-stamp'],['magazine.issue','.cover-issue'],
    ['magazine.headline','.magazine-copy h3'],['magazine.description','.magazine-copy p:not(.heyzine-note)'],
    ['magazine.button','#open-magazine-text'],['magazine.note','#heyzine-status'],['board.title','#activity-board .panel-heading h2'],
    ['board.label','#activity-board .panel-heading span'],['board.access_title','.access-copy strong'],['board.access_note','#auth-message'],
    ['board.login','#login-button'],['board.reset','#reset'],['strip.label','.strip-label'],['strip.words','.strip-words'],
    ['strip.note','.strip-texture span'],['about.label','.about>span'],['about.title','.about h3'],['about.copy','.about p'],
    ['about.mark','.about b'],['footer.brand','.footer a'],['footer.tagline','.footer span:nth-child(2)'],
    ['footer.copyright','.footer span:nth-child(3)'],['viewer.title','.viewer-head span'],['viewer.close','#close-viewer']
  ];
  const defaults = {
    theme:{paper:'#f2f0ec',white:'#fbfaf7',ink:'#090909',red:'#f20d19',line:'#aaa7a0',displayFont:'Barlow Condensed',bodyFont:'Manrope',navInk:'#090909',navAccent:'#f20d19'},
    sections:Object.fromEntries(sectionDefs.map((s,i)=>[s.id,{visible:true,order:i+1}])),
    images:{},copy:{},customSections:[]
  };
  const clone = x => JSON.parse(JSON.stringify(x));
  const safe = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mergeConfig(raw){
    const c={...clone(defaults),...(raw||{})};
    c.theme={...defaults.theme,...(c.theme||{})};c.sections={...defaults.sections,...(c.sections||{})};
    c.images={...(c.images||{})};c.copy={...(c.copy||{})};c.customSections=Array.isArray(c.customSections)?c.customSections:[];
    return c;
  }
  function applyConfig(){
    const t=state.config.theme,style=document.documentElement.style;
    Object.entries({paper:t.paper,white:t.white,ink:t.ink,red:t.red,line:t.line}).forEach(([k,v])=>style.setProperty('--'+k,v));
    style.setProperty('--nav-ink',t.navInk||t.ink);style.setProperty('--nav-accent',t.navAccent||t.red);
    if(t.displayFont)style.setProperty('--display',"'"+t.displayFont.replace(/[';]/g,'')+"', Impact, sans-serif");
    if(t.bodyFont)style.setProperty('--sans',"'"+t.bodyFont.replace(/[';]/g,'')+"', Arial, sans-serif");
    sectionDefs.forEach(s=>{const el=$(s.selector),cfg=state.config.sections[s.id]||{};if(el){el.hidden=cfg.visible===false;el.style.order=String(Number(cfg.order)||1);}});
    const main=$('#home');if(main){main.style.display='flex';main.style.flexDirection='column';}
    const panels=$('.panels');if(panels){panels.style.display='grid';panels.style.order='2';}
    ['magazine','activity-board'].forEach(id=>{const el=$('#'+id);if(el)el.style.order=String(Number(state.config.sections[id]?.order)||(id==='magazine'?1:2));});
    editable.forEach(([key,selector])=>{const el=$(selector);if(el&&Object.prototype.hasOwnProperty.call(state.config.copy,key)){el.textContent=state.config.copy[key];if(String(state.config.copy[key]).includes('\n'))el.style.whiteSpace='pre-line';}});
    Object.entries(state.config.images).forEach(([key,url])=>{const img=$('[data-site-image="'+key+'"]');if(img&&url)img.src=url;});
    renderCustomSections();
  }
  function renderCustomSections(){
    let host=$('#custom-sections');
    if(!host){host=document.createElement('div');host.id='custom-sections';host.className='custom-sections';$('#home')?.appendChild(host);}
    host.replaceChildren();
    state.config.customSections.forEach(section=>{
      const el=document.createElement('section');el.className='user-section';el.dataset.customSection=section.id;
      el.style.background=section.background||'var(--white)';el.style.color=section.color||'var(--ink)';
      el.style.padding=(Number(section.padding)||24)+'px';el.hidden=section.visible===false;
      if(section.title){const h=document.createElement('h2');h.textContent=section.title;el.appendChild(h);}
      (section.blocks||[]).forEach(block=>{
        let node;
        if(block.type==='heading'){node=document.createElement(block.level||'h3');node.textContent=block.text||'';}
        else if(block.type==='text'){node=document.createElement('p');node.textContent=block.text||'';}
        else if(block.type==='image'){node=document.createElement('img');node.src=block.src||'';node.alt=block.alt||'';node.loading='lazy';}
        else if(block.type==='button'){node=document.createElement('a');node.textContent=block.text||'OPEN';node.href=block.url||'#';node.target='_blank';node.rel='noopener noreferrer';node.className='user-section-button';}
        else if(block.type==='divider'){node=document.createElement('hr');}
        else if(block.type==='spacer'){node=document.createElement('div');node.style.height=(Number(block.height)||32)+'px';}
        else if(block.type==='columns'){node=document.createElement('div');node.className='user-columns';(block.items||['','']).forEach(item=>{const p=document.createElement('p');p.textContent=item;node.appendChild(p);});}
        if(node){if(block.align)node.style.textAlign=block.align;if(block.color)node.style.color=block.color;if(block.size)node.style.fontSize=block.size+'px';el.appendChild(node);}
      });
      host.appendChild(el);
    });
  }
  function renderSectionRows(){
    return sectionDefs.map(s=>{const cfg=state.config.sections[s.id]||{},vis=cfg.visible!==false;return '<div class="pb-section" draggable="true" data-section="'+s.id+'"><span class="pb-grip">⠿</span><span class="pb-section-name">'+s.label+'</span><span class="pb-state">'+(vis?'VISIBLE':'HIDDEN')+'</span><button type="button" data-toggle="'+s.id+'">'+(vis?'HIDE':'SHOW')+'</button></div>';}).join('')+
      state.config.customSections.map(s=>'<div class="pb-section" data-custom-row="'+safe(s.id)+'"><span class="pb-grip">＋</span><span class="pb-section-name">'+safe(s.title||'NEW SECTION')+'</span><span class="pb-state">CUSTOM</span><button type="button" data-remove-section="'+safe(s.id)+'">DELETE</button></div>').join('');
  }
  function renderCopyFields(){
    return editable.map(([key,selector])=>{const el=$(selector),fallback=el?.innerText||el?.textContent||'';const val=Object.prototype.hasOwnProperty.call(state.config.copy,key)?state.config.copy[key]:fallback;return '<label class="pb-copy-field"><span>'+safe(key.replace(/[._]/g,' / ').toUpperCase())+'</span><textarea data-copy="'+key+'" rows="'+(String(val).length>90?4:2)+'">'+safe(val)+'</textarea></label>';}).join('');
  }
  function renderCustomEditors(){
    return state.config.customSections.map((s,i)=>'<article class="pb-custom" data-editor-section="'+safe(s.id)+'"><div class="pb-custom-head"><strong>'+safe(s.title||'NEW SECTION')+'</strong><button type="button" data-remove-section="'+safe(s.id)+'">REMOVE SECTION ×</button></div><label>Section title<input data-section-title="'+safe(s.id)+'" value="'+safe(s.title||'')+'"></label><div class="pb-inline-fields"><label>Background<input type="color" data-section-style="background" data-id="'+safe(s.id)+'" value="'+safe(s.background||'#fbfaf7')+'"></label><label>Text color<input type="color" data-section-style="color" data-id="'+safe(s.id)+'" value="'+safe(s.color||'#090909')+'"></label><label>Padding (px)<input type="number" min="0" max="160" data-section-style="padding" data-id="'+safe(s.id)+'" value="'+(Number(s.padding)||24)+'"></label></div><div class="pb-blocks">'+(s.blocks||[]).map((b,j)=>'<div class="pb-block" data-block="'+j+'"><span>'+safe(b.type.toUpperCase())+'</span><textarea data-block-text="'+safe(s.id)+'" data-index="'+j+'" rows="2">'+safe(b.text||b.items?.join(' | ')||'')+'</textarea><button type="button" data-remove-block="'+safe(s.id)+'" data-index="'+j+'">×</button></div>').join('')+'</div><div class="pb-add-blocks"><button type="button" data-add-block="heading" data-id="'+safe(s.id)+'">+ HEADING</button><button type="button" data-add-block="text" data-id="'+safe(s.id)+'">+ TEXT</button><button type="button" data-add-block="button" data-id="'+safe(s.id)+'">+ BUTTON</button><button type="button" data-add-block="image" data-id="'+safe(s.id)+'">+ IMAGE URL</button><button type="button" data-add-block="divider" data-id="'+safe(s.id)+'">+ DIVIDER</button><button type="button" data-add-block="spacer" data-id="'+safe(s.id)+'">+ SPACER</button></div></article>').join('');
  }
  function render(){
    root.innerHTML='<div class="pb-top"><div><strong>PAGE BUILDER</strong><small>EDIT EVERY DETAIL · BUILD YOUR OWN SECTIONS</small></div><span class="pb-status">ADMIN WORKSPACE</span></div>'+
      '<div class="pb-tabs"><button class="active" data-tab="content">CONTENT</button><button data-tab="structure">STRUCTURE</button><button data-tab="design">DESIGN</button></div>'+
      '<section class="pb-tab-panel" data-panel="content"><h4>01 / TEXT EDITOR</h4><p>Modifica titulares, descripciones, etiquetas, navegación, botones y microtextos. Los saltos de línea se conservan.</p><div class="pb-copy-grid">'+renderCopyFields()+'</div></section>'+
      '<section class="pb-tab-panel" data-panel="structure" hidden><h4>02 / PAGE STRUCTURE</h4><p>Oculta o muestra las secciones actuales y crea secciones propias con bloques independientes.</p><div class="pb-list">'+renderSectionRows()+'</div><div class="pb-new-section"><label>Nombre de la nueva sección<input id="pb-new-title" placeholder="Ej. CONTACT / CONTRIBUTORS"></label><button type="button" id="pb-add-section">CREATE SECTION +</button></div><div class="pb-custom-editors">'+renderCustomEditors()+'</div></section>'+
      '<section class="pb-tab-panel" data-panel="design" hidden><h4>03 / GLOBAL DESIGN</h4><div class="pb-fields"><label>Fondo principal<input type="color" data-theme="paper"></label><label>Fondo de paneles<input type="color" data-theme="white"></label><label>Texto general<input type="color" data-theme="ink"></label><label>Color de acento<input type="color" data-theme="red"></label><label>Líneas y bordes<input type="color" data-theme="line"></label><label>Texto de navegación<input type="color" data-theme="navInk"></label><label>Acento de navegación<input type="color" data-theme="navAccent"></label><label>Tipografía de títulos<select data-font="displayFont"><option>Barlow Condensed</option><option>Oswald</option><option>Archivo Black</option><option>Montserrat</option><option>Arial</option></select></label><label>Tipografía de texto<select data-font="bodyFont"><option>Manrope</option><option>Inter</option><option>DM Sans</option><option>Arial</option></select></label></div><h4 class="pb-subhead">04 / MEDIA LIBRARY</h4><label class="pb-upload">Subir imagen o reemplazar portada<input type="file" id="pb-image" accept="image/png,image/jpeg,image/webp,image/gif,image/avif"></label><select id="pb-image-target"><option value="hero">Imagen principal</option><option value="magazine">Portada de The Magazine</option><option value="strip">Imagen de la franja editorial</option></select><p class="pb-note">Imágenes de hasta 10 MB. Se guardan en Supabase Storage.</p></section>'+
      '<div class="pb-actions"><button type="button" id="pb-preview">PREVIEW</button><button type="button" id="pb-save">SAVE DRAFT</button><button type="button" id="pb-publish">PUBLISH CHANGES ↗</button><span id="pb-message" role="status"></span></div><p class="pb-footnote">El borrador se guarda por separado. Publicar aplica los cambios a todos los visitantes.</p>';
    root.querySelectorAll('[data-theme]').forEach(el=>el.value=state.config.theme[el.dataset.theme]||'#090909');
    root.querySelectorAll('[data-font]').forEach(el=>el.value=state.config.theme[el.dataset.font]);
    bind();
  }
  function message(s){const el=$('#pb-message');if(el)el.textContent=s;}
  function bind(){
    root.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{root.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));root.querySelectorAll('[data-panel]').forEach(x=>x.hidden=x.dataset.panel!==btn.dataset.tab);}));
    root.querySelectorAll('[data-copy]').forEach(el=>el.addEventListener('input',()=>{state.config.copy[el.dataset.copy]=el.value;applyConfig();}));
    root.querySelectorAll('[data-theme]').forEach(el=>el.addEventListener('input',()=>{state.config.theme[el.dataset.theme]=el.value;applyConfig();}));
    root.querySelectorAll('[data-font]').forEach(el=>el.addEventListener('change',()=>{state.config.theme[el.dataset.font]=el.value;applyConfig();}));
    root.querySelectorAll('[data-toggle]').forEach(el=>el.addEventListener('click',()=>{const id=el.dataset.toggle;state.config.sections[id].visible=!state.config.sections[id].visible;applyConfig();render();}));
    root.querySelectorAll('[data-remove-section]').forEach(el=>el.addEventListener('click',()=>{state.config.customSections=state.config.customSections.filter(s=>s.id!==el.dataset.removeSection);applyConfig();render();}));
    $('#pb-add-section')?.addEventListener('click',()=>{const title=$('#pb-new-title').value.trim();if(!title){message('Escribe un nombre para la sección.');return;}state.config.customSections.push({id:'custom-'+Date.now(),title,visible:true,background:'#fbfaf7',color:'#090909',padding:24,blocks:[]});applyConfig();render();root.querySelector('[data-tab="structure"]')?.click();});
    root.querySelectorAll('[data-section-title]').forEach(el=>el.addEventListener('input',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.sectionTitle);if(s){s.title=el.value;applyConfig();}}));
    root.querySelectorAll('[data-section-style]').forEach(el=>el.addEventListener('input',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.id);if(s){s[el.dataset.sectionStyle]=el.value;applyConfig();}}));
    root.querySelectorAll('[data-block-text]').forEach(el=>el.addEventListener('input',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.blockText),b=s?.blocks[Number(el.dataset.index)];if(!b)return;if(b.type==='columns')b.items=el.value.split('|').map(x=>x.trim());else if(b.type==='image')b.src=el.value;else if(b.type==='button'){const parts=el.value.split('|');b.text=parts[0]?.trim()||'OPEN';b.url=parts[1]?.trim()||'#';}else b.text=el.value;applyConfig();}));
    root.querySelectorAll('[data-add-block]').forEach(el=>el.addEventListener('click',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.id);if(!s)return;const type=el.dataset.addBlock;s.blocks.push(type==='divider'?{type}:type==='spacer'?{type,height:32}:type==='image'?{type,src:'',alt:''}:type==='button'?{type,text:'OPEN',url:'#'}:{type,text:type==='heading'?'NEW HEADING':'Write your text here'});render();root.querySelector('[data-tab="structure"]')?.click();}));
    root.querySelectorAll('[data-remove-block]').forEach(el=>el.addEventListener('click',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.removeBlock);if(s){s.blocks.splice(Number(el.dataset.index),1);applyConfig();render();root.querySelector('[data-tab="structure"]')?.click();}}));
    $('#pb-preview').addEventListener('click',()=>{applyConfig();message('Vista previa aplicada en esta sesión. Aún no se publicó.');});
    $('#pb-save').addEventListener('click',()=>save(false));$('#pb-publish').addEventListener('click',()=>save(true));$('#pb-image').addEventListener('change',uploadImage);
  }
  async function save(publish){
    message('Guardando…');const payload={id:1,config:state.config,updated_at:new Date().toISOString()};
    const result=publish?await db.from('page_settings').upsert(payload):await db.from('page_settings_drafts').upsert(payload);
    if(result.error){message('Error: '+result.error.message);return;}
    if(publish){const draft=await db.from('page_settings_drafts').upsert(payload);if(draft.error){message('Publicado; no se pudo sincronizar el borrador: '+draft.error.message);return;}}
    message(publish?'Cambios publicados.':'Borrador guardado.');
  }
  async function uploadImage(e){
    const file=e.target.files?.[0];if(!file)return;if(file.size>10*1024*1024){message('La imagen supera 10 MB.');return;}
    const target=$('#pb-image-target').value,key={hero:'hero',magazine:'magazine',strip:'strip'}[target],ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg',path=key+'/'+Date.now()+'.'+ext;
    message('Subiendo imagen…');const {error}=await db.storage.from('site-media').upload(path,file,{upsert:false,contentType:file.type});
    if(error){message('No se pudo subir: '+error.message);return;}const {data}=db.storage.from('site-media').getPublicUrl(path);
    state.config.images[key]=data.publicUrl;applyConfig();message('Imagen cargada. Guarda o publica para conservar el cambio.');e.target.value='';
  }
  async function init(){
    const {data,error}=await db.from('page_settings').select('config').eq('id',1).maybeSingle();if(error){console.warn('5PACE page settings:',error.message);return;}
    const {data:{session}}=await db.auth.getSession();let isAdmin=false;
    if(session?.user){const {data:admin,error:adminError}=await db.rpc('is_admin');isAdmin=!adminError&&admin===true;}
    state.isAdmin=isAdmin;let draftConfig=null;
    if(isAdmin){const draft=await db.from('page_settings_drafts').select('config').eq('id',1).maybeSingle();if(!draft.error)draftConfig=draft.data?.config;}
    state.config=mergeConfig(isAdmin?(draftConfig||data?.config):data?.config);applyConfig();if(isAdmin)render();
  }
  init();db.auth.onAuthStateChange((_event,session)=>{if(session?.user)init();else{state.isAdmin=false;root.innerHTML='';}});
})();