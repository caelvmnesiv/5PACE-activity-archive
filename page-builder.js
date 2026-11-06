(() => {
  const root = document.getElementById('page-builder');
  if (!root || !window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
  const db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const $ = (s, scope=document) => scope.querySelector(s);
  const state = { config:null, isAdmin:false, dragId:null, preview:false, activeTab:'content' };
  const sectionDefs = [
    {id:'hero',label:'HERO / PORTADA',selector:'.hero',group:'main'},
    {id:'magazine',label:'THE MAGAZINE',selector:'#magazine',group:'panels'},
    {id:'activity-board',label:'ACTIVITY BOARD',selector:'#activity-board',group:'panels'},
    {id:'bottom-strip',label:'EDITORIAL STRIP',selector:'.bottom-strip',group:'main'},
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
    images:{},copy:{},copyLinks:{},customSections:[]
  };
  const clone = x => JSON.parse(JSON.stringify(x));
  const safe = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mergeConfig(raw){
    const c={...clone(defaults),...(raw||{})};
    c.theme={...defaults.theme,...(c.theme||{})};c.sections={...defaults.sections,...(c.sections||{})};
    c.navVisibility={...defaults.navVisibility,...(c.navVisibility||{})};c.images={...(c.images||{})};c.copy={...(c.copy||{})};c.copyLinks={...(c.copyLinks||{})};c.customSections=Array.isArray(c.customSections)?c.customSections:[];c.customSections.forEach(s=>{s.displayMode=s.displayMode||(s.openInViewer===false?'page':'tab');if(s.navVisible===undefined)s.navVisible=true;});
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
    state.config.customSections.forEach((s,i)=>{const el=document.querySelector('[data-custom-section="'+s.id+'"]');if(el){el.style.order=String(Number(s.order)||sectionDefs.length+i+1);el.hidden=s.visible===false;}});
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
    let host=$('#custom-sections');
    if(!host){host=document.createElement('div');host.id='custom-sections';host.className='custom-sections';$('#home')?.appendChild(host);}
    host.replaceChildren();
    state.config.customSections.forEach(section=>{
      const el=document.createElement('section');el.className='user-section';el.dataset.customSection=section.id;el.dataset.openInViewer=section.displayMode==='tab'?'true':'false';el.dataset.displayMode=section.displayMode||'page';
      el.style.background=section.background||'var(--white)';el.style.color=section.color||'var(--ink)';
      el.style.padding=(Number(section.padding)||24)+'px';el.hidden=section.visible===false||section.displayMode==='tab';el.style.order=String(Number(section.order)||sectionDefs.length+1);
      const h=document.createElement('h2');h.textContent=section.title||'UNTITLED SECTION';el.appendChild(h);
      const open=document.createElement('button');open.type='button';open.className='user-section-open';open.dataset.openCustom=section.id;open.textContent='OPEN SECTION ↗';el.appendChild(open);
      let activeTeamGrid=null;
      (section.blocks||[]).forEach(block=>{
        let node;
        if(block.type!=='team-grid')activeTeamGrid=null;
        if(block.type==='heading'){node=document.createElement(block.level||'h3');node.textContent=block.text||'';if(block.url){const link=document.createElement('a');link.href=block.url;link.target='_blank';link.rel='noopener noreferrer';link.appendChild(node);node=link;}}
        else if(block.type==='text'){node=document.createElement('p');node.textContent=block.text||'';if(block.url){const link=document.createElement('a');link.href=block.url;link.target='_blank';link.rel='noopener noreferrer';link.appendChild(node);node=link;}}
        else if(block.type==='image'){node=document.createElement('img');node.src=block.src||'';node.alt=block.alt||'';node.loading='lazy';if(block.url){const link=document.createElement('a');link.href=block.url;link.target='_blank';link.rel='noopener noreferrer';link.appendChild(node);node=link;}}
        else if(block.type==='button'){node=document.createElement('a');node.textContent=block.text||'OPEN';node.href=block.url||'#';node.target='_blank';node.rel='noopener noreferrer';node.className='user-section-button';}
        else if(block.type==='team-grid'){if(!activeTeamGrid){activeTeamGrid=document.createElement('div');activeTeamGrid.className='user-team-grid';activeTeamGrid.style.setProperty('--team-columns',4);el.appendChild(activeTeamGrid);}node=activeTeamGrid;(block.items||[]).forEach(card=>{const article=document.createElement('article');article.className='user-team-card';const photo=document.createElement('div');photo.className='user-team-photo';if(card.image){const img=document.createElement('img');img.src=card.image;img.alt=card.name||'Team member';img.loading='lazy';photo.appendChild(img);}else photo.textContent='5PACE';article.appendChild(photo);const info=document.createElement('div');info.className='user-team-info';if(card.role){const role=document.createElement('span');role.className='user-team-role';role.textContent=card.role;info.appendChild(role);}const name=document.createElement('h3');name.textContent=card.name||'TEAM MEMBER';info.appendChild(name);if(card.description){const desc=document.createElement('p');desc.textContent=card.description;info.appendChild(desc);}if(card.url&&card.url.indexOf('http')===0){const link=document.createElement('a');link.href=card.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='MORE ↗';info.appendChild(link);}article.appendChild(info);node.appendChild(article);});}
        else if(block.type==='divider'){node=document.createElement('hr');}
        else if(block.type==='spacer'){node=document.createElement('div');node.style.height=(Number(block.height)||32)+'px';}
        else if(block.type==='columns'){node=document.createElement('div');node.className='user-columns';(block.items||['','']).forEach(item=>{const p=document.createElement('p');p.textContent=item;node.appendChild(p);});}
        if(node){if(block.align)node.style.textAlign=block.align;if(block.color)node.style.color=block.color;if(block.size)node.style.fontSize=block.size+'px';if(block.type!=='team-grid')el.appendChild(node);}
      });
      host.appendChild(el);
    });
    const nav=$('.nav nav');if(nav){nav.querySelectorAll('[data-custom-nav]').forEach(a=>a.remove());state.config.customSections.filter(s=>(s.displayMode||'page')==='tab'&&s.visible!==false&&s.navVisible!==false).sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999)).forEach(s=>{const a=document.createElement('a');a.href='#';a.dataset.openCustom=s.id;a.dataset.customNav='true';a.textContent=(s.title||'NEW PAGE').toUpperCase();nav.appendChild(a);});}
  }
  function renderSectionRows(){
    const movableDefs=sectionDefs.filter(s=>s.id!=='hero'&&s.group!=='panels');
    const items=[
      ...sectionDefs.map(s=>({id:s.id,label:s.label,order:Number(state.config.sections[s.id]?.order)||2,custom:false})),
      ...state.config.customSections.map(s=>({id:s.id,label:s.title||'NEW SECTION',order:Number(s.order)||sectionDefs.length+1,custom:true,visible:s.visible!==false}))
    ].sort((a,b)=>a.order-b.order);
    return items.map(item=>{
      if(!item.custom){const cfg=state.config.sections[item.id]||{},vis=cfg.visible!==false;return '<div class="pb-section" draggable="true" data-sort-id="'+item.id+'"><span class="pb-grip">⠿</span><span class="pb-section-name">'+item.label+'</span><span class="pb-state">'+(vis?'VISIBLE':'HIDDEN')+'</span><button type="button" data-toggle="'+item.id+'">'+(vis?'HIDE':'VIEW')+'</button></div>';}
      const sec=state.config.customSections.find(x=>x.id===item.id);
      return '<div class="pb-section pb-section-custom" draggable="true" data-sort-id="'+safe(sec.id)+'"><span class="pb-grip">⠿</span><span class="pb-section-name">'+safe(sec.title||'NEW SECTION')+'</span><select aria-label="Section display mode" data-section-mode="'+safe(sec.id)+'"><option value="page" '+((sec.displayMode||'page')==='page'?'selected':'')+'>HOME PAGE</option><option value="popup" '+(sec.displayMode==='popup'?'selected':'')+'>POP-UP</option><option value="tab" '+(sec.displayMode==='tab'?'selected':'')+'>NAV TAB</option></select><label class="pb-nav-inline"><input type="checkbox" data-section-nav="'+safe(sec.id)+'" '+(sec.navVisible!==false?'checked':'')+'> NAV</label><span class="pb-state">'+(sec.visible===false?'HIDDEN':({page:'HOME PAGE',popup:'POP-UP',tab:'NAV TAB'}[sec.displayMode||'page']))+'</span><button type="button" data-custom-toggle="'+safe(sec.id)+'">'+(sec.visible===false?'VIEW':'HIDE')+'</button><button type="button" data-remove-section="'+safe(sec.id)+'">DELETE</button></div>';
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
      return '<details class="pb-copy-group" '+(index===0?'open':'')+'><summary><span class="pb-copy-group-title">'+safe(group.title)+'</span><span class="pb-copy-group-hint">'+safe(group.hint)+'</span><span class="pb-copy-group-count">'+group.keys.length+' TEXTOS</span></summary><div class="pb-copy-grid">'+fields+'</div></details>';
    }).join('');
  }
  function renderCustomEditors(){
    return state.config.customSections.map((s)=>'<details class="pb-custom" data-editor-section="'+safe(s.id)+'"><summary class="pb-custom-head"><strong>'+safe(s.title||'NEW SECTION')+'</strong></summary><div class="pb-custom-content"><button type="button" data-remove-section="'+safe(s.id)+'">REMOVE SECTION ×</button><label>Section title<input data-section-title="'+safe(s.id)+'" value="'+safe(s.title||'')+'"></label><div class="pb-inline-fields"><label>Background<input type="color" data-section-style="background" data-id="'+safe(s.id)+'" value="'+safe(s.background||'#fbfaf7')+'"></label><label>Text color<input type="color" data-section-style="color" data-id="'+safe(s.id)+'" value="'+safe(s.color||'#090909')+'"></label><label>Padding (px)<input type="number" min="0" max="160" data-section-style="padding" data-id="'+safe(s.id)+'" value="'+(Number(s.padding)||24)+'"></label></div><div class="pb-blocks">'+(s.blocks||[]).map((b,j)=>{if(b.type==='team-grid'){const items=b.items||[];return '<details class="pb-block pb-team-block" open><summary><strong>TEAM CARDS · '+items.length+'</strong><span class="pb-team-columns-note">FIXED GRID · 4 COLUMNS</span><span class="pb-collapse-indicator">＋</span></summary><div class="pb-team-grid-edit">'+items.map((c,k)=>'<details class="pb-team-card-editor"><summary><strong>CARD '+(k+1)+'</strong><span class="pb-collapse-indicator">＋</span></summary><div class="pb-team-card-fields"><label>PHOTO URL<input data-team-prop="image" data-section-id="'+safe(s.id)+'" data-index="'+j+'" data-card-index="'+k+'" value="'+safe(c.image||'')+'"></label><label>UPLOAD PHOTO<input type="file" data-team-file data-section-id="'+safe(s.id)+'" data-index="'+j+'" data-card-index="'+k+'" accept="image/*"></label><label>NAME<input data-team-prop="name" data-section-id="'+safe(s.id)+'" data-index="'+j+'" data-card-index="'+k+'" value="'+safe(c.name||'')+'"></label><label>ROLE<input data-team-prop="role" data-section-id="'+safe(s.id)+'" data-index="'+j+'" data-card-index="'+k+'" value="'+safe(c.role||'')+'"></label><label>DESCRIPTION<textarea data-team-prop="description" data-section-id="'+safe(s.id)+'" data-index="'+j+'" data-card-index="'+k+'">'+safe(c.description||'')+'</textarea></label><label>LINK<input data-team-prop="url" data-section-id="'+safe(s.id)+'" data-index="'+j+'" data-card-index="'+k+'" value="'+safe(c.url||'')+'"></label><div><button type="button" data-team-move="-1" data-section-id="'+safe(s.id)+'" data-index="'+j+'" data-card-index="'+k+'" '+(k===0?'disabled':'')+'>↑</button><button type="button" data-team-move="1" data-section-id="'+safe(s.id)+'" data-index="'+j+'" data-card-index="'+k+'" '+(k===items.length-1?'disabled':'')+'>↓</button><button type="button" data-team-remove="'+safe(s.id)+'" data-index="'+j+'" data-card-index="'+k+'">REMOVE</button></div></div></details>').join('')+'<button type="button" data-team-add="'+safe(s.id)+'" data-index="'+j+'">+ ADD MEMBER</button><button type="button" data-remove-block="'+safe(s.id)+'" data-index="'+j+'">REMOVE GRID</button></div></details>';}const fields=b.type==='image'?'<label>IMAGE URL<input data-block-prop="src" data-section-id="'+safe(s.id)+'" data-index="'+j+'" value="'+safe(b.src||'')+'" placeholder="https://..."></label><label>ALT TEXT<input data-block-prop="alt" data-section-id="'+safe(s.id)+'" data-index="'+j+'" value="'+safe(b.alt||'')+'"></label><label>IMAGE LINK (OPTIONAL)<input data-block-prop="url" data-section-id="'+safe(s.id)+'" data-index="'+j+'" value="'+safe(b.url||'')+'" placeholder="https://..."></label><label>UPLOAD IMAGE<input type="file" data-block-file data-section-id="'+safe(s.id)+'" data-index="'+j+'" accept="image/png,image/jpeg,image/webp,image/gif,image/avif"></label>':b.type==='button'?'<label>BUTTON TEXT<input data-block-prop="text" data-section-id="'+safe(s.id)+'" data-index="'+j+'" value="'+safe(b.text||'OPEN')+'"></label><label>BUTTON LINK<input data-block-prop="url" data-section-id="'+safe(s.id)+'" data-index="'+j+'" value="'+safe(b.url||'')+'" placeholder="https://..."></label>':b.type==='divider'||b.type==='spacer'?'<span>'+safe(b.type.toUpperCase())+'</span>':'<label>TEXT / HEADING<textarea data-block-text="'+safe(s.id)+'" data-index="'+j+'" rows="2">'+safe(b.text||'')+'</textarea></label><label>LINK URL (OPTIONAL)<input data-block-prop="url" data-section-id="'+safe(s.id)+'" data-index="'+j+'" value="'+safe(b.url||'')+'" placeholder="https://..."></label>';return '<div class="pb-block" data-block="'+j+'"><span>'+safe(b.type.toUpperCase())+'</span><div class="pb-block-fields">'+fields+'</div><button type="button" data-remove-block="'+safe(s.id)+'" data-index="'+j+'">×</button></div>';}).join('')+'</div><div class="pb-add-blocks pb-team-only"><button type="button" data-add-block="team-grid" data-id="'+safe(s.id)+'">+ TEAM CARDS</button></div></div></details>').join('');
  }
  function captureAccordionState(){
    return [...root.querySelectorAll('details')].map(details=>{
      const path=[];let node=details;
      while(node&&node!==root){const parent=node.parentElement;if(!parent)break;path.unshift(Array.prototype.indexOf.call(parent.children,node));node=parent;}
      return {path,open:details.open};
    });
  }
  function restoreAccordionState(snapshot){
    snapshot.forEach(({path,open})=>{
      let node=root;
      path.forEach(index=>{node=node?.children[index];});
      if(node?.tagName==='DETAILS')node.open=open;
    });
  }
  function render(){
    const accordionState=captureAccordionState();
    root.innerHTML='<div class="pb-top"><div><strong>PAGE BUILDER</strong><small>EDIT EVERY DETAIL · BUILD YOUR OWN SECTIONS</small></div><span class="pb-status">ADMIN WORKSPACE</span></div>'+
      '<div class="pb-tabs"><button class="'+(state.activeTab==='content'?'active':'')+'" data-tab="content">CONTENT</button><button class="'+(state.activeTab==='structure'?'active':'')+'" data-tab="structure">STRUCTURE</button><button class="'+(state.activeTab==='design'?'active':'')+'" data-tab="design">DESIGN</button></div>'+
      '<section class="pb-tab-panel" data-panel="content" '+(state.activeTab==='content'?'':'hidden')+'><h4>01 / CONTENT EDITOR</h4><p>Edita los textos del sitio y el contenido de cada sección personalizada. Los cambios se reflejan en la vista previa.</p><div class="pb-copy-groups">'+renderCopyFields()+'</div><h4 class="pb-subhead">CUSTOM SECTIONS / CONTENT</h4><div class="pb-custom-editors">'+(state.config.customSections.length?renderCustomEditors():'<p class="pb-note">Todavía no hay secciones nuevas. Crea una desde STRUCTURE para editarla aquí.</p>')+'</div></section>'+
      '<section class="pb-tab-panel" data-panel="structure" '+(state.activeTab==='structure'?'':'hidden')+'><h4>02 / PAGE STRUCTURE</h4><p>Oculta o muestra las secciones actuales y crea secciones propias con bloques independientes.</p><div class="pb-list">'+renderSectionRows()+'</div><div class="pb-new-section"><label>Nombre de la nueva sección<input id="pb-new-title" placeholder="Ej. CONTACT / CONTRIBUTORS"></label><button type="button" id="pb-add-section">CREATE SECTION +</button></div><p class="pb-note">El contenido de las secciones se edita en CONTENT. Aquí puedes crear, ocultar, reorganizar o eliminar secciones.</p></section>'+
      '<section class="pb-tab-panel" data-panel="design" '+(state.activeTab==='design'?'':'hidden')+'><h4>03 / GLOBAL DESIGN</h4><div class="pb-fields"><label>Fondo principal<input type="color" data-theme="paper"></label><label>Fondo de paneles<input type="color" data-theme="white"></label><label>Texto general<input type="color" data-theme="ink"></label><label>Color de acento<input type="color" data-theme="red"></label><label>Líneas y bordes<input type="color" data-theme="line"></label><label>Texto de navegación<input type="color" data-theme="navInk"></label><label>Acento de navegación<input type="color" data-theme="navAccent"></label><label>Color de enlaces y textos vinculados<input type="color" data-theme="linkInk"></label><label>Tipografía de títulos<select data-font="displayFont"><option>Barlow Condensed</option><option>Oswald</option><option>Archivo Black</option><option>Montserrat</option><option>Arial</option></select></label><label>Tipografía de texto<select data-font="bodyFont"><option>Manrope</option><option>Inter</option><option>DM Sans</option><option>Arial</option></select></label></div><h4 class="pb-subhead">04 / MEDIA LIBRARY</h4><label class="pb-upload">Subir imagen o reemplazar portada<input type="file" id="pb-image" accept="image/png,image/jpeg,image/webp,image/gif,image/avif"></label><select id="pb-image-target"><option value="hero">Imagen principal</option><option value="magazine">Portada de The Magazine</option><option value="strip">Imagen de la franja editorial</option></select><p class="pb-note">Imágenes de hasta 10 MB. Se guardan en Supabase Storage.</p></section>'+
      '<div class="pb-actions"><button type="button" id="pb-preview">PREVIEW</button><button type="button" id="pb-save">SAVE DRAFT</button><button type="button" id="pb-publish">PUBLISH CHANGES ↗</button><span id="pb-message" role="status"></span></div><p class="pb-footnote">El borrador se guarda por separado. Publicar aplica los cambios a todos los visitantes.</p>';
    restoreAccordionState(accordionState);
    root.querySelectorAll('[data-theme]').forEach(el=>el.value=state.config.theme[el.dataset.theme]||'#090909');
    root.querySelectorAll('[data-font]').forEach(el=>el.value=state.config.theme[el.dataset.font]);
    bind();
  }
  function message(s){const el=$('#pb-message');if(el)el.textContent=s;}
  function bind(){
    root.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{state.activeTab=btn.dataset.tab;root.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));root.querySelectorAll('[data-panel]').forEach(x=>x.hidden=x.dataset.panel!==state.activeTab);}));
    root.querySelectorAll('[data-copy]').forEach(el=>el.addEventListener('input',()=>{state.config.copy[el.dataset.copy]=el.value;applyConfig();}));
    root.querySelectorAll('[data-nav-visible]').forEach(el=>el.addEventListener('change',()=>{state.config.navVisibility[el.dataset.navVisible]=el.checked;applyConfig();}));
    root.querySelectorAll('[data-link-text],[data-link-url]').forEach(el=>el.addEventListener('input',()=>{const key=el.dataset.linkText||el.dataset.linkUrl;if(!Object.prototype.hasOwnProperty.call(state.config.copy,key)){const pair=editable.find(item=>item[0]===key),target=pair?$(pair[1]):null;state.config.copy[key]=target?.textContent||'';}state.config.copyLinks[key]=state.config.copyLinks[key]||{};if(el.dataset.linkText)state.config.copyLinks[key].text=el.value;else state.config.copyLinks[key].url=el.value;applyConfig();}));
    root.querySelectorAll('[data-sort-id]').forEach(row=>{row.addEventListener('dragstart',e=>{state.dragId=row.dataset.sortId;e.dataTransfer.effectAllowed='move';});row.addEventListener('dragover',e=>e.preventDefault());row.addEventListener('drop',e=>{e.preventDefault();const target=row.dataset.sortId;if(!state.dragId||state.dragId===target)return;const movable=[...sectionDefs.filter(x=>x.id!=='hero'&&x.group!=='panels').map(x=>x.id),...state.config.customSections.map(x=>x.id)];movable.sort((x,y)=>{const ox=state.config.sections[x]?.order??state.config.customSections.find(s=>s.id===x)?.order??2;const oy=state.config.sections[y]?.order??state.config.customSections.find(s=>s.id===y)?.order??2;return ox-oy;});const from=movable.indexOf(state.dragId),to=movable.indexOf(target);if(from<0||to<0)return;movable.splice(to,0,movable.splice(from,1)[0]);movable.forEach((id,i)=>{const order=i+2;if(state.config.sections[id])state.config.sections[id].order=order;else{const item=state.config.customSections.find(x=>x.id===id);if(item)item.order=order;}});state.dragId=null;applyConfig();render();root.querySelector('[data-tab="structure"]')?.click();});});
    root.querySelectorAll('[data-theme]').forEach(el=>el.addEventListener('input',()=>{state.config.theme[el.dataset.theme]=el.value;applyConfig();}));
    root.querySelectorAll('[data-font]').forEach(el=>el.addEventListener('change',()=>{state.config.theme[el.dataset.font]=el.value;applyConfig();}));
    root.querySelectorAll('[data-toggle]').forEach(el=>el.addEventListener('click',()=>{const id=el.dataset.toggle;state.config.sections[id].visible=!state.config.sections[id].visible;applyConfig();render();}));
    root.querySelectorAll('[data-custom-toggle]').forEach(el=>el.addEventListener('click',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.customToggle);if(s){s.visible=s.visible===false;applyConfig();render();root.querySelector('[data-tab="structure"]')?.click();}}));
    root.querySelectorAll('[data-remove-section]').forEach(el=>el.addEventListener('click',()=>{state.config.customSections=state.config.customSections.filter(s=>s.id!==el.dataset.removeSection);applyConfig();render();}));
    $('#pb-add-section')?.addEventListener('click',()=>{const title=$('#pb-new-title').value.trim();if(!title){message('Escribe un nombre para la sección.');return;}const order=Math.max(0,...sectionDefs.map(x=>Number(state.config.sections[x.id]?.order)||0),...state.config.customSections.map(x=>Number(x.order)||0))+1;state.config.customSections.push({id:'custom-'+Date.now(),title,visible:true,order,openInViewer:false,displayMode:'page',background:'#fbfaf7',color:'#090909',padding:24,blocks:[{type:'text',text:'Write your text here'}]});state.activeTab='content';applyConfig();render();});
    root.querySelectorAll('[data-section-title]').forEach(el=>el.addEventListener('input',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.sectionTitle);if(s){s.title=el.value;applyConfig();}}));
    root.querySelectorAll('[data-section-style]').forEach(el=>el.addEventListener('input',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.id);if(s){s[el.dataset.sectionStyle]=el.value;applyConfig();}}));
    root.querySelectorAll('[data-section-mode]').forEach(el=>el.addEventListener('change',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.sectionMode);if(s){s.displayMode=el.value;s.openInViewer=el.value==='tab';applyConfig();render();}}));
    root.querySelectorAll('[data-section-nav]').forEach(el=>el.addEventListener('change',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.sectionNav);if(s){s.navVisible=el.checked;applyConfig();render();}}));
    root.querySelectorAll('[data-block-prop]').forEach(el=>el.addEventListener('input',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.sectionId),b=s?.blocks[Number(el.dataset.index)];if(!b)return;b[el.dataset.blockProp]=el.value;applyConfig();}));
    root.querySelectorAll('[data-block-text]').forEach(el=>el.addEventListener('input',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.blockText),b=s?.blocks[Number(el.dataset.index)];if(!b)return;b.text=el.value;applyConfig();}));
    root.querySelectorAll('[data-team-prop]').forEach(el=>el.addEventListener('input',()=>{const sec=state.config.customSections.find(x=>x.id===el.dataset.sectionId),block=sec?.blocks[Number(el.dataset.index)],card=block?.items?.[Number(el.dataset.cardIndex)];if(card){card[el.dataset.teamProp]=el.value;applyConfig();}}));
    root.querySelectorAll('[data-team-columns]').forEach(el=>el.addEventListener('change',()=>{const sec=state.config.customSections.find(x=>x.id===el.dataset.teamColumns),block=sec?.blocks[Number(el.dataset.index)];if(block){block.columns=Number(el.value);applyConfig();}}));
    root.querySelectorAll('[data-team-add]').forEach(el=>el.addEventListener('click',()=>{const sec=state.config.customSections.find(x=>x.id===el.dataset.teamAdd),block=sec?.blocks[Number(el.dataset.index)];if(block){block.items.push({name:'TEAM MEMBER',role:'ROLE',description:'',image:'',url:''});render();}}));
    root.querySelectorAll('[data-team-remove]').forEach(el=>el.addEventListener('click',()=>{const sec=state.config.customSections.find(x=>x.id===el.dataset.teamRemove),block=sec?.blocks[Number(el.dataset.index)];if(block){block.items.splice(Number(el.dataset.cardIndex),1);applyConfig();render();}}));
    root.querySelectorAll('[data-team-move]').forEach(el=>el.addEventListener('click',()=>{const sec=state.config.customSections.find(x=>x.id===el.dataset.sectionId),block=sec?.blocks[Number(el.dataset.index)],i=Number(el.dataset.cardIndex),j=i+Number(el.dataset.teamMove);if(!block||j<0||j>=block.items.length)return;[block.items[i],block.items[j]]=[block.items[j],block.items[i]];applyConfig();render();}));
    root.querySelectorAll('[data-team-file]').forEach(el=>el.addEventListener('change',async()=>{const file=el.files?.[0];if(!file)return;if(file.size>10*1024*1024){message('La imagen supera 10 MB.');return;}const sid=el.dataset.sectionId,index=Number(el.dataset.index),cardIndex=Number(el.dataset.cardIndex),sec=state.config.customSections.find(x=>x.id===sid),card=sec?.blocks[index]?.items?.[cardIndex];if(!card)return;const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg',path='team/'+sid+'/'+Date.now()+'.'+ext;message('Subiendo fotografía…');const result=await db.storage.from('site-media').upload(path,file,{upsert:false,contentType:file.type});if(result.error){message('No se pudo subir: '+result.error.message);return;}card.image=db.storage.from('site-media').getPublicUrl(path).data.publicUrl;applyConfig();message('Fotografía añadida. Guarda el borrador para conservarla.');}));
    root.querySelectorAll('[data-block-file]').forEach(el=>el.addEventListener('change',async()=>{const file=el.files?.[0];if(!file)return;if(file.size>10*1024*1024){message('La imagen supera 10 MB.');el.value='';return;}const sid=el.dataset.sectionId,index=Number(el.dataset.index),section=state.config.customSections.find(x=>x.id===sid),block=section?.blocks[index];if(!block)return;const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg',path='sections/'+sid+'/'+Date.now()+'.'+ext;message('Subiendo imagen…');const {error}=await db.storage.from('site-media').upload(path,file,{upsert:false,contentType:file.type});if(error){message('No se pudo subir: '+error.message);return;}const {data}=db.storage.from('site-media').getPublicUrl(path);block.src=data.publicUrl;applyConfig();const srcInput=root.querySelector('[data-block-prop="src"][data-section-id="'+sid+'"][data-index="'+index+'"]');if(srcInput)srcInput.value=block.src;message('Imagen añadida. Guarda el borrador para conservarla.');el.value='';}));
    root.querySelectorAll('[data-add-block]').forEach(el=>el.addEventListener('click',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.id);if(!s)return;const type=el.dataset.addBlock;s.blocks.push(type==='team-grid'?{type,columns:3,items:[{name:'TEAM MEMBER',role:'ROLE',description:'',image:'',url:''}]}:type==='divider'?{type}:type==='spacer'?{type,height:32}:type==='image'?{type,src:'',alt:'',url:''}:type==='button'?{type,text:'OPEN',url:'#'}:{type,text:type==='heading'?'NEW HEADING':'Write your text here',url:''});applyConfig();render();}));
    root.querySelectorAll('[data-remove-block]').forEach(el=>el.addEventListener('click',()=>{const s=state.config.customSections.find(x=>x.id===el.dataset.removeBlock);if(s){s.blocks.splice(Number(el.dataset.index),1);applyConfig();render();}}));
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