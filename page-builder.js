(() => {
  const root = document.getElementById('page-builder');
  if (!root || !window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
  const db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const $ = (s, scope=document) => scope.querySelector(s);
  const state = { config:null, isAdmin:false, dragId:null, preview:false, activeTab:'content', accordionState:new Map() };
  const sectionDefs = [
    {id:'hero',label:'HERO / PORTADA',selector:'.hero',group:'main'},
    {id:'magazine',label:'THE MAGAZINE',selector:'#magazine',group:'panels'},
    {id:'activity-board',label:'ACTIVITY BOARD',selector:'#activity-board',group:'panels'},
    {id:'bottom-strip',label:'EDITORIAL STRIP',selector:'.bottom-strip',group:'main'},
    {id:'our-team',label:'OUR TEAM',selector:'#our-team',group:'main'},
    {id:'about',label:'ABOUT',selector:'.about',group:'main'}
  ];
  const editable = [
    ['nav.home','.nav nav a[href="#home"]'],['nav.magazine','.nav nav a[href="#magazine"]'],
    ['nav.board','.nav nav a[href="#activity-board"]'],['nav.archive','.nav nav a[href="#archive"]'],['nav.about','.nav nav a[href="#about"]'],
    ['nav.meta','.nav-side span:first-child'],['hero.left','.hero-left-main'],['hero.left_note','.hero-left small'],
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
    theme:{paper:'#f2f0ec',white:'#fbfaf7',ink:'#090909',red:'#f20d19',line:'#aaa7a0',displayFont:'Barlow Condensed',bodyFont:'Manrope',navInk:'#090909',navAccent:'#f20d19',linkInk:'#090909'},
    sections:Object.fromEntries(sectionDefs.map((s,i)=>[s.id,{visible:true,order:i+1}])),
    navVisibility:{home:true,magazine:true,board:true,archive:true,about:true},
    images:{},copy:{},copyLinks:{},teamMembers:[],customSections:[]
  };
  const clone = x => JSON.parse(JSON.stringify(x));
  const safe = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mergeConfig(raw){
    const c={...clone(defaults),...(raw||{})};
    c.theme={...defaults.theme,...(c.theme||{})};c.sections={...defaults.sections,...(c.sections||{})};
    c.navVisibility={...defaults.navVisibility,...(c.navVisibility||{})};c.images={...(c.images||{})};c.copy={...(c.copy||{})};c.copyLinks={...(c.copyLinks||{})};
    const legacy=[];
    (Array.isArray(c.customSections)?c.customSections:[]).forEach(section=>{
      if(Array.isArray(section.members)&&section.members.length)legacy.push(...section.members);
      else (section.blocks||[]).filter(block=>block.type==='team-grid').forEach(block=>legacy.push(...(block.items||[])));
    });
    c.teamMembers=Array.isArray(c.teamMembers)?c.teamMembers:legacy;
    c.teamMembers=c.teamMembers.map(member=>({...member,_editorId:member._editorId||'member-'+Math.random().toString(36).slice(2,10)}));
    c.customSections=[];
    return c;
  }
  function applyConfig(){
    const t=state.config.theme,style=document.documentElement.style;
    Object.entries({paper:t.paper,white:t.white,ink:t.ink,red:t.red,line:t.line}).forEach(([k,v])=>style.setProperty('--'+k,v));
    style.setProperty('--nav-ink',t.navInk||t.ink);style.setProperty('--nav-accent',t.navAccent||t.red);style.setProperty('--link-ink',t.linkInk||t.ink);
    if(t.displayFont)style.setProperty('--display',"'"+t.displayFont.replace(/[';]/g,'')+"', Impact, sans-serif");
    if(t.bodyFont)style.setProperty('--sans',"'"+t.bodyFont.replace(/[';]/g,'')+"', Arial, sans-serif");
    sectionDefs.forEach(s=>{const el=$(s.selector),cfg=state.config.sections[s.id]||{};if(el){el.hidden=cfg.visible===false;if(s.id==='hero')el.style.order='0';else if(s.group==='panels')el.style.order='0';else el.style.order=String(Math.max(2,Number(cfg.order)||2));}});
    const main=$('#home');if(main){main.style.display='flex';main.style.flexDirection='column';}
    const panels=$('.panels');if(panels){panels.style.display='grid';panels.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';panels.style.order='1';}
    const customHost=$('#custom-sections');if(customHost){customHost.style.display='contents';}
    const aboutSource=$('#about');if(aboutSource)aboutSource.hidden=true;
    const navSelectors={home:'.nav nav a[href="#home"]',magazine:'.nav nav a[href="#magazine"]',board:'.nav nav a[href="#activity-board"]',archive:'.nav nav a[href="#archive"]',about:'[data-open-about]'};Object.entries(navSelectors).forEach(([key,selector])=>{const link=$(selector);if(link)link.hidden=state.config.navVisibility[key]===false;});const aboutButton=$('#about-open');if(aboutButton)aboutButton.hidden=state.config.sections.about?.visible===false;

    editable.forEach(([key,selector])=>{const el=$(selector);if(el&&Object.prototype.hasOwnProperty.call(state.config.copy,key)){const value=String(state.config.copy[key]??''),link=state.config.copyLinks[key]||{},phrase=String(link.text||''),url=String(link.url||'');if(phrase&&url&&/^https?:\/\//i.test(url)&&value.includes(phrase)){const parts=value.split(phrase);el.innerHTML=parts.map((part,i)=>safe(part)+(i<parts.length-1?'<a href="'+safe(url)+'" target="_blank" rel="noopener noreferrer">'+safe(phrase)+'</a>':'')).join('');}else el.textContent=value;if(value.includes('\n'))el.style.whiteSpace='pre-line';}});
    Object.entries(state.config.images).forEach(([key,url])=>{const img=$('[data-site-image="'+key+'"]');if(img&&url)img.src=url;});
    renderCustomSections();
    refreshOpenViewer();
  }
  function refreshOpenViewer(){
    const body=$('#viewer-body'),viewer=$('#viewer');if(!body||!viewer?.classList.contains('open'))return;
    const id=body.dataset.sourceId,type=body.dataset.sourceType;if(!id||!type)return;
    const source=type==='fixed'?document.getElementById(id):document.querySelector('[data-custom-section="'+CSS.escape(id)+'"]');
    if(!source)return;
    const clone=source.cloneNode(true);clone.querySelectorAll('button').forEach(b=>b.remove());
    if(clone.classList.contains('user-section')){clone.dataset.openInViewer='false';clone.dataset.displayMode='tab';}
    clone.hidden=false;body.replaceChildren(clone);
  }
  function renderCustomSections(){
    const legacyHost=$('#custom-sections');if(legacyHost)legacyHost.replaceChildren();
    const grid=$('#our-team-grid');if(!grid)return;
    grid.replaceChildren();
    state.config.teamMembers.forEach(member=>{
      const article=document.createElement('article');article.className='user-team-card';
      const photo=document.createElement('div');photo.className='user-team-photo';
      if(member.image){const img=document.createElement('img');img.src=member.image;img.alt=member.name||'Team member';img.loading='lazy';photo.appendChild(img);}else photo.textContent='5PACE';
      article.appendChild(photo);
      const info=document.createElement('div');info.className='user-team-info';
      if(member.role){const role=document.createElement('span');role.className='user-team-role';role.textContent=member.role;info.appendChild(role);}
      const name=document.createElement('h3');name.textContent=member.name||'TEAM MEMBER';info.appendChild(name);
      if(member.description){const desc=document.createElement('p');desc.textContent=member.description;info.appendChild(desc);}
      if(member.url&&/^https?:\\/\\//i.test(member.url)){const link=document.createElement('a');link.href=member.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='MORE ↗';info.appendChild(link);}
      article.appendChild(info);grid.appendChild(article);
    });
  }
  function renderSectionRows(){
    return sectionDefs.map(item=>{
      const cfg=state.config.sections[item.id]||{},visible=cfg.visible!==false;
      return '<div class="pb-section pb-section-fixed" draggable="true" data-sort-id="'+item.id+'"><span class="pb-grip">⠿</span><span class="pb-section-name">'+item.label+'</span><span class="pb-state">'+(visible?'VISIBLE':'HIDDEN')+'</span><button type="button" data-toggle="'+item.id+'">'+(visible?'HIDE':'VIEW')+'</button></div>';
    }).join('');
  }
  function renderCopyFields(){
    const groups=[
      {id:'brand',title:'IDENTIDAD Y NAVEGACIÓN',hint:'Textos, visibilidad y datos de la barra superior',keys:['nav.home','nav.magazine','nav.board','nav.archive','nav.about','nav.meta']},
      {id:'hero',title:'HERO / PORTADA',hint:'Mensajes principales de la portada',keys:['hero.left','hero.left_note','hero.right','hero.caption']},
      {id:'magazine',title:'THE MAGAZINE',hint:'Titulares, descripción, edición y llamada a la acción',keys:['magazine.title','magazine.volume','magazine.stamp','magazine.issue','magazine.headline','magazine.description','magazine.button','magazine.note']},
      {id:'board',title:'ACTIVITY BOARD',hint:'Encabezado y mensajes de acceso',keys:['board.title','board.label','board.access_title','board.access_note','board.login','board.reset']},
      {id:'strip',title:'EDITORIAL STRIP',hint:'Textos de la franja gráfica inferior',keys:['strip.label','strip.words','strip.note']},
      {id:'about',title:'ABOUT',hint:'Presentación y texto informativo',keys:['about.label','about.title','about.copy','about.mark']},
      {id:'footer',title:'FOOTER / PIE DE PÁGINA',hint:'Identificación y cierre del sitio',keys:['footer.brand','footer.tagline','footer.copyright']},
      {id:'viewer',title:'VISUALIZADOR',hint:'Textos de la ventana de The Magazine',keys:['viewer.title','viewer.close']}
    ];
    return groups.map((group,index)=>{
      const fields=group.keys.map(key=>{
        const pair=editable.find(item=>item[0]===key),el=pair?$(pair[1]):null;
        const fallback=el?.innerText||el?.textContent||'';
        const val=Object.prototype.hasOwnProperty.call(state.config.copy,key)?state.config.copy[key]:fallback,link=state.config.copyLinks[key]||{};
        const navKey=key.startsWith('nav.')?key.slice(4):null;const navControl=({home:'home',magazine:'magazine',board:'board',archive:'archive',about:'about'}[navKey]);return '<label class="pb-copy-field"><span>'+safe(key.split('.').slice(1).join(' / ').replace(/_/g,' ').toUpperCase())+'</span><textarea data-copy="'+key+'" rows="'+(String(val).length>90?4:2)+'">'+safe(val)+'</textarea>'+(navControl?'<label class="pb-nav-visibility"><input type="checkbox" data-nav-visible="'+navControl+'" '+(state.config.navVisibility[navControl]!==false?'checked':'')+'> SHOW IN NAVIGATION BAR</label>':'')+'<span>FRASE ENLAZADA (OPCIONAL)</span><input data-link-text="'+key+'" value="'+safe(link.text||'')+'" placeholder="Ej. conoce al equipo"><span>URL EXTERNA</span><input data-link-url="'+key+'" value="'+safe(link.url||'')+'" placeholder="https://..." type="url"></label>';
      }).join('');
      return '<details class="pb-copy-group" data-accordion-key="copy-'+safe(group.id)+'" '+(index===0?'open':'')+'><summary><span class="pb-copy-group-title">'+safe(group.title)+'</span><span class="pb-copy-group-hint">'+safe(group.hint)+'</span><span class="pb-copy-group-count">'+group.keys.length+' TEXTOS</span></summary><div class="pb-copy-grid">'+fields+'</div></details>';
    }).join('');
  }
  function memberEditorMarkup(member,index){
    return '<article class="pb-team-member-editor"><div class="pb-team-member-top"><strong>MEMBER '+String(index+1).padStart(2,'0')+'</strong><button type="button" data-team-remove="'+index+'">REMOVE ×</button></div><div class="pb-team-card-fields"><label>PHOTO URL<input data-team-prop="image" data-member-index="'+index+'" value="'+safe(member.image||'')+'"></label><label>UPLOAD PHOTO<input type="file" data-team-file data-member-index="'+index+'" accept="image/*"></label><label>NAME<input data-team-prop="name" data-member-index="'+index+'" value="'+safe(member.name||'')+'"></label><label>ROLE<input data-team-prop="role" data-member-index="'+index+'" value="'+safe(member.role||'')+'"></label><label>DESCRIPTION<textarea data-team-prop="description" data-member-index="'+index+'">'+safe(member.description||'')+'</textarea></label><label>LINK<input data-team-prop="url" data-member-index="'+index+'" value="'+safe(member.url||'')+'"></label></div></article>';
  }
  function renderCustomEditors(){
    return '<details class="pb-our-team" data-accordion-key="our-team-roster" open><summary><strong>OUR TEAM</strong><span class="pb-collapse-indicator">＋</span><small>'+state.config.teamMembers.length+' MEMBERS</small></summary><div class="pb-our-team-content"><p class="pb-note">Añade y edita integrantes. Las tarjetas se ordenan automáticamente en cuatro columnas en la página.</p><div class="pb-team-editors-list">'+state.config.teamMembers.map(memberEditorMarkup).join('')+'</div><button type="button" class="pb-team-add-member" data-team-add>+ ADD MEMBER</button></div></details>';
  }
  function refreshCustomEditorList(){
    const host=$('.pb-team-editors-list');if(!host)return;
    host.innerHTML=state.config.teamMembers.map(memberEditorMarkup).join('');
    const count=root.querySelector('.pb-our-team summary small');if(count)count.textContent=state.config.teamMembers.length+' MEMBERS';
    bindTeamEditorActions();
  }
  function bindTeamEditorActions(){
    root.querySelectorAll('[data-team-prop]').forEach(el=>el.addEventListener('input',()=>{
      const member=state.config.teamMembers[Number(el.dataset.memberIndex)];
      if(member){member[el.dataset.teamProp]=el.value;applyConfig();}
    }));
    root.querySelectorAll('[data-team-add]').forEach(el=>{if(el.dataset.bound==='true')return;el.dataset.bound='true';el.addEventListener('click',()=>{
      state.config.teamMembers.push({_editorId:'member-'+Math.random().toString(36).slice(2,10),name:'TEAM MEMBER',role:'ROLE',description:'',image:'',url:''});
      refreshCustomEditorList();
      const roster=root.querySelector('.pb-our-team');if(roster)roster.open=true;
    });});
    root.querySelectorAll('[data-team-remove]').forEach(el=>el.addEventListener('click',()=>{
      state.config.teamMembers.splice(Number(el.dataset.teamRemove),1);
      refreshCustomEditorList();applyConfig();
      const roster=root.querySelector('.pb-our-team');if(roster)roster.open=true;
    }));
    root.querySelectorAll('[data-team-file]').forEach(el=>el.addEventListener('change',async()=>{
      const file=el.files?.[0];if(!file)return;if(file.size>10*1024*1024){message('La imagen supera 10 MB.');return;}
      const member=state.config.teamMembers[Number(el.dataset.memberIndex)];if(!member)return;
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg',path='team/'+member._editorId+'/'+Date.now()+'.'+ext;
      message('Subiendo fotografía…');const result=await db.storage.from('site-media').upload(path,file,{upsert:false,contentType:file.type});
      if(result.error){message('No se pudo subir: '+result.error.message);return;}
      member.image=db.storage.from('site-media').getPublicUrl(path).data.publicUrl;applyConfig();
      const input=root.querySelector('[data-team-prop="image"][data-member-index="'+el.dataset.memberIndex+'"]');if(input)input.value=member.image;
      message('Fotografía añadida. Guarda el borrador para conservarla.');
    }));
  }
  function captureAccordionState(){
    // Refresh the persistent map from the live editor before rebuilding its DOM.
    root.querySelectorAll('details[data-accordion-key]').forEach(details=>{
      state.accordionState.set(details.dataset.accordionKey,details.open);
    });
    return new Map(state.accordionState);
  }
  function restoreAccordionState(snapshot){
    // Keep keys for temporarily removed cards; their identity must not shift by index.
    state.accordionState=new Map(snapshot);
    root.querySelectorAll('details[data-accordion-key]').forEach(details=>{
      const key=details.dataset.accordionKey;
      if(state.accordionState.has(key))details.open=state.accordionState.get(key);
      else state.accordionState.set(key,details.open);
    });
  }
  function render(){
    const accordionState=captureAccordionState();
    root.innerHTML='<div class="pb-top"><div><strong>PAGE BUILDER</strong><small>EDIT EVERY DETAIL · BUILD YOUR OWN SECTIONS</small></div><span class="pb-status">ADMIN WORKSPACE</span></div>'+
      '<div class="pb-tabs"><button class="'+(state.activeTab==='content'?'active':'')+'" data-tab="content">CONTENT</button><button class="'+(state.activeTab==='structure'?'active':'')+'" data-tab="structure">STRUCTURE</button><button class="'+(state.activeTab==='design'?'active':'')+'" data-tab="design">DESIGN</button></div>'+
      '<section class="pb-tab-panel" data-panel="content" '+(state.activeTab==='content'?'':'hidden')+'><h4>01 / CONTENT EDITOR</h4><p>Edita los textos del sitio y el contenido de cada sección personalizada. Los cambios se reflejan en la vista previa.</p><div class="pb-copy-groups">'+renderCopyFields()+'</div><h4 class="pb-subhead">OUR TEAM / MEMBERS</h4><div class="pb-team-editors">'+renderCustomEditors()+'</div></section>'+
      '<section class="pb-tab-panel" data-panel="structure" '+(state.activeTab==='structure'?'':'hidden')+'><h4>02 / PAGE STRUCTURE</h4><p>Organiza las secciones fijas de la página. OUR TEAM contiene una única lista de integrantes.</p><div class="pb-list">'+renderSectionRows()+'</div></section>'+
      '<section class="pb-tab-panel" data-panel="design" '+(state.activeTab==='design'?'':'hidden')+'><h4>03 / GLOBAL DESIGN</h4><div class="pb-fields"><label>Fondo principal<input type="color" data-theme="paper"></label><label>Fondo de paneles<input type="color" data-theme="white"></label><label>Texto general<input type="color" data-theme="ink"></label><label>Color de acento<input type="color" data-theme="red"></label><label>Líneas y bordes<input type="color" data-theme="line"></label><label>Texto de navegación<input type="color" data-theme="navInk"></label><label>Acento de navegación<input type="color" data-theme="navAccent"></label><label>Color de enlaces y textos vinculados<input type="color" data-theme="linkInk"></label><label>Tipografía de títulos<select data-font="displayFont"><option>Barlow Condensed</option><option>Oswald</option><option>Archivo Black</option><option>Montserrat</option><option>Arial</option></select></label><label>Tipografía de texto<select data-font="bodyFont"><option>Manrope</option><option>Inter</option><option>DM Sans</option><option>Arial</option></select></label></div><h4 class="pb-subhead">04 / MEDIA LIBRARY</h4><label class="pb-upload">Subir imagen o reemplazar portada<input type="file" id="pb-image" accept="image/png,image/jpeg,image/webp,image/gif,image/avif"></label><select id="pb-image-target"><option value="hero">Imagen principal</option><option value="magazine">Portada de The Magazine</option><option value="strip">Imagen de la franja editorial</option></select><p class="pb-note">Imágenes de hasta 10 MB. Se guardan en Supabase Storage.</p></section>'+
      '<div class="pb-actions"><button type="button" id="pb-preview">PREVIEW</button><button type="button" id="pb-save">SAVE DRAFT</button><button type="button" id="pb-publish">PUBLISH CHANGES ↗</button><span id="pb-message" role="status"></span></div><p class="pb-footnote">El borrador se guarda por separado. Publicar aplica los cambios a todos los visitantes.</p>';
    restoreAccordionState(accordionState);
    root.querySelectorAll('[data-theme]').forEach(el=>el.value=state.config.theme[el.dataset.theme]||'#090909');
    root.querySelectorAll('[data-font]').forEach(el=>el.value=state.config.theme[el.dataset.font]);
    bind();
  }
  function message(s){const el=$('#pb-message');if(el)el.textContent=s;}
  function bind(){
    // Track native disclosure changes immediately, not only when a render happens.
    root.querySelectorAll('details[data-accordion-key]').forEach(details=>details.addEventListener('toggle',()=>{
      state.accordionState.set(details.dataset.accordionKey,details.open);
    }));
    root.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{state.activeTab=btn.dataset.tab;root.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));root.querySelectorAll('[data-panel]').forEach(x=>x.hidden=x.dataset.panel!==state.activeTab);}));
    root.querySelectorAll('[data-copy]').forEach(el=>el.addEventListener('input',()=>{state.config.copy[el.dataset.copy]=el.value;applyConfig();}));
    root.querySelectorAll('[data-nav-visible]').forEach(el=>el.addEventListener('change',()=>{state.config.navVisibility[el.dataset.navVisible]=el.checked;applyConfig();}));
    root.querySelectorAll('[data-link-text],[data-link-url]').forEach(el=>el.addEventListener('input',()=>{const key=el.dataset.linkText||el.dataset.linkUrl;if(!Object.prototype.hasOwnProperty.call(state.config.copy,key)){const pair=editable.find(item=>item[0]===key),target=pair?$(pair[1]):null;state.config.copy[key]=target?.textContent||'';}state.config.copyLinks[key]=state.config.copyLinks[key]||{};if(el.dataset.linkText)state.config.copyLinks[key].text=el.value;else state.config.copyLinks[key].url=el.value;applyConfig();}));
    root.querySelectorAll('[data-sort-id]').forEach(row=>{row.addEventListener('dragstart',e=>{state.dragId=row.dataset.sortId;e.dataTransfer.effectAllowed='move';});row.addEventListener('dragover',e=>e.preventDefault());row.addEventListener('drop',e=>{e.preventDefault();const target=row.dataset.sortId;if(!state.dragId||state.dragId===target)return;const movable=sectionDefs.filter(x=>x.id!=='hero'&&x.group!=='panels').map(x=>x.id);movable.sort((x,y)=>{const ox=state.config.sections[x]?.order??2;const oy=state.config.sections[y]?.order??2;return ox-oy;});const from=movable.indexOf(state.dragId),to=movable.indexOf(target);if(from<0||to<0)return;movable.splice(to,0,movable.splice(from,1)[0]);movable.forEach((id,i)=>{const order=i+2;if(state.config.sections[id])state.config.sections[id].order=order;});state.dragId=null;applyConfig();render();root.querySelector('[data-tab="structure"]')?.click();});});
    root.querySelectorAll('[data-theme]').forEach(el=>el.addEventListener('input',()=>{state.config.theme[el.dataset.theme]=el.value;applyConfig();}));
    root.querySelectorAll('[data-font]').forEach(el=>el.addEventListener('change',()=>{state.config.theme[el.dataset.font]=el.value;applyConfig();}));
    root.querySelectorAll('[data-toggle]').forEach(el=>el.addEventListener('click',()=>{const id=el.dataset.toggle;state.config.sections[id].visible=!state.config.sections[id].visible;applyConfig();render();}));

    bindTeamEditorActions();
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