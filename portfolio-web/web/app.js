'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  const DEFAULT_NODE = 'project:reforma-educativa';
  const quick = { area: '', term: '', page: 0, size: 6 };
  const state = { projects: [], capabilities: [], topics: [], nodes: [], edges: [], mode: 'project', focus: null, page: 0, area: '', capability: '', term: '', selectedProject: null, generation: false, busy: false, request: 0 };
  const nodeMap = new Map();
  const projectMap = new Map();
  const typeNames = { explora_capacidad: 'Explora una capacidad', trata_idea: 'Trata una idea', contrasta_con: 'Contraste', comparte_enfoque: 'Enfoque compartido', posible_transferencia: 'Posible transferencia' };
  const kindNames = { project: 'PROYECTO DOCUMENTADO', capability: 'CAPACIDAD INTERPRETADA', topic: 'IDEA EN LOS TEXTOS' };
  const attributionNames = { javier_descrito: 'Javier, según lo descrito en el texto', asistente: 'Asistente de IA', no_confirmado: 'Atribución no confirmada' };
  const claimNames = { propuesta: 'Propuesta', razonamiento_documentado: 'Razonamiento documentado', actuacion_declarada: 'Actuación declarada' };
  const runningMotion = new Set();
  function animate(element, frames, options = {}) {
    if (!element || document.documentElement.dataset.motion !== 'on' || !element.animate || document.hidden) return;
    const animation = element.animate(frames, { duration: 480, easing: 'cubic-bezier(.2,.7,.2,1)', ...options });
    runningMotion.add(animation);
    animation.finished.then(() => runningMotion.delete(animation), () => runningMotion.delete(animation));
  }
  function setupMotion() {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const toggle = $('motion-toggle');
    let userPaused = false;
    try { userPaused = sessionStorage.getItem('portfolio-motion') === 'paused'; } catch {}
    const update = () => {
      const enabled = !preference.matches && !userPaused;
      document.documentElement.dataset.motion = enabled ? 'on' : 'off';
      toggle.textContent = preference.matches ? 'Movimiento reducido' : enabled ? 'Animaciones: activas' : 'Animaciones: pausadas';
      if (preference.matches) toggle.textContent = 'Movimiento reducido';
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.disabled = preference.matches;
      if (!enabled) { runningMotion.forEach(a => a.cancel()); runningMotion.clear(); }
    };
    toggle.addEventListener('click', () => { userPaused = !userPaused; try { sessionStorage.setItem('portfolio-motion', userPaused ? 'paused' : 'active'); } catch {} update(); });
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', () => {
      document.documentElement.dataset.pageHidden = String(document.hidden);
      if (document.hidden) { runningMotion.forEach(a => a.cancel()); runningMotion.clear(); }
    });
    update();
    let scrollFrame = false;
    const progress = () => { const range = document.documentElement.scrollHeight - innerHeight; $('reading-progress').style.transform = `scaleX(${range > 0 ? Math.min(1, scrollY / range) : 0})`; scrollFrame = false; };
    addEventListener('scroll', () => { if (!scrollFrame) { scrollFrame = true; requestAnimationFrame(progress); } }, { passive: true });
    addEventListener('resize', progress); progress();
    if ('IntersectionObserver' in window) {
      const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animate(entry.target, [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 680 });
        reveal.unobserve(entry.target);
      }), { threshold: .08 });
      document.querySelectorAll('.hero-editorial,.hero-visual,.visitor-guide,.section-heading,.entry-bar,.ask-intro,.ask-workspace').forEach(e => reveal.observe(e));
      const visibility = new IntersectionObserver(entries => entries.forEach(entry => { entry.target.dataset.inView = String(entry.isIntersecting); }), { threshold: 0 });
      visibility.observe($('area-mosaic'));
    }
    ['project-detail', 'answer-region', 'graph'].forEach(id => {
      const element = $(id); let frame;
      new MutationObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          if (id === 'graph') {
            element.querySelectorAll('.graph-edge line:not(.edge-hit)').forEach((line, i) => {
              const length = Math.hypot(line.x2.baseVal.value - line.x1.baseVal.value, line.y2.baseVal.value - line.y1.baseVal.value);
              animate(line, [{ strokeDasharray: `${length}`, strokeDashoffset: `${length}`, opacity: 0 }, { strokeDasharray: `${length}`, strokeDashoffset: '0', opacity: 1 }], { duration: 650, delay: Math.min(i * 35, 210) });
            });
            element.querySelectorAll('.graph-node').forEach((node, i) => animate(node, [{ opacity: 0 }, { opacity: 1 }], { duration: 430, delay: Math.min(i * 45, 240) }));
          } else animate(element, [{ opacity: .35, transform: 'translateY(9px)' }, { opacity: 1, transform: 'translateY(0)' }]);
        });
      }).observe(element, { childList: true });
    });
  }
  function buildAreaMosaic() {
    const gallery = $('area-mosaic'); gallery.replaceChildren();
    const preferences = { clinicos: 'smarthandover', educacion: 'reforma-educativa', gobierno: 'gobierno-ia' };
    const areas = new Map();
    state.projects.forEach(project => { if (!areas.has(project.area) || preferences[project.area] === project.id) areas.set(project.area, project); });
    const order = ['clinicos', 'tecnologicos', 'educacion', 'creacion', 'gobierno', 'finanzas', 'negocios', 'metodologia', 'desarrollo-profesional'];
    order.forEach((area, index) => {
      const project = areas.get(area); if (!project) return;
      const tile = el('a', 'area-tile'); tile.href = '#proyectos'; tile.setAttribute('aria-label', `Explorar todos los proyectos de ${project.area_label}`);
      tile.style.setProperty('--tile-index', index); tile.style.setProperty('--tile-phase', `${index * -.8}s`);
      const image = el('img'); image.src = `/media/thumb/${encodeURIComponent(project.id)}.webp`; image.alt = ''; image.width = 640; image.height = 426; image.decoding = 'async'; image.loading = index < 3 ? 'eager' : 'lazy';
      append(tile, image, el('span', 'area-tile-label', project.area_label), el('span', 'area-tile-arrow', '↗'));
      tile.addEventListener('click', event => { event.preventDefault(); openQuickArea(area); });
      gallery.append(tile);
      animate(tile, [{ opacity: 0, transform: 'translateY(18px) scale(.96)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 650, delay: index * 45 });
    });
  }
  function el(tag, className, content) { const e = document.createElement(tag); if (className) e.className = className; if (content !== undefined && content !== null) e.textContent = String(content); return e; }
  function append(parent, ...children) { children.filter(Boolean).forEach((child) => parent.append(child)); return parent; }
  function button(label, action, className = '') { const b = el('button', className, label); b.type = 'button'; b.addEventListener('click', action); return b; }
  function normalize(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es'); }
  function safeLocalURL(value, fallback = '#') { try { const u = new URL(value, location.origin); return u.origin === location.origin && ['http:', 'https:'].includes(u.protocol) ? u.pathname + u.search + u.hash : fallback; } catch { return fallback; } }
  async function json(url, options) { let response; try { response = await fetch(url, options); } catch { throw new Error('No se puede conectar con el servicio local. Comprueba que continúa en ejecución.'); } if (!response.ok) { let body = {}; try { body = await response.json(); } catch {} const messages = { generation_busy: 'Hay otra respuesta en curso. Puedes seguir explorando el mapa.', project_not_found: 'No se ha encontrado este proyecto.', invalid_request: 'La consulta no tiene un formato válido.', frontend_not_ready: 'Los archivos de la interfaz todavía no están disponibles.' }; const message = typeof body.message === 'string' && body.message.trim() ? body.message : messages[body.error] || (String(body.error || '').startsWith('generation_') ? 'No se pudo generar una respuesta verificada. Puedes seguir buscando pasajes.' : `El servicio no pudo completar la solicitud (estado ${response.status}).`); const error = new Error(message); error.sources = Array.isArray(body.sources) ? body.sources : []; throw error; } try { return await response.json(); } catch { throw new Error('El servicio ha devuelto datos que no se pueden interpretar.'); } }
  function related(nodeId) { return state.edges.filter((e) => e.source === nodeId || e.target === nodeId); }
  function otherNode(edge, nodeId = state.focus) { return nodeMap.get(edge.source === nodeId ? edge.target : edge.source); }
  function matchesProject(p) { if (!p) return false; const skillTerms = state.capabilities.filter(c => (p.capability_ids || []).includes(c.id)).flatMap(c => [c.label, c.label_en, ...(c.aliases || [])]); return (!state.area || p.area === state.area) && (!state.capability || (p.capability_ids || []).includes(state.capability)) && (!state.term || normalize([p.title, p.area_label, ...Object.values(p.summary || {}), ...skillTerms].join(' ')).includes(normalize(state.term))); }
  function nodeAllowed(n) { if (!n) return false; return n.kind !== 'project' || matchesProject(projectMap.get(n.project_id || n.id.replace(/^project:/, ''))) ; }
  function filteredEdges() { return related(state.focus).filter((edge) => nodeAllowed(otherNode(edge))); }
  function themeRecords() { return state.mode === 'capability' ? state.capabilities : state.mode === 'topic' ? state.topics : state.projects; }
  function refreshEntrySelect() { const select = $('entry-select'); select.replaceChildren(); themeRecords().forEach((item) => { const option = el('option', '', item.label || item.title || item.id); option.value = `${state.mode}:${item.id}`; select.append(option); }); select.value = state.focus; }
  function updateScope() { const scopes = []; if (state.area) scopes.push($('area-filter').selectedOptions[0].textContent); if (state.capability) scopes.push($('capability-filter').selectedOptions[0].textContent); $('query-scope').textContent = scopes.length ? `Ámbito de consulta: ${scopes.join(' · ')}.` : 'Consulta en todo el corpus público.'; }
  function renderCatalog() { const list = $('catalog-list'); const focusedProject = list.contains(document.activeElement) ? document.activeElement.dataset.projectId : null; list.replaceChildren(); const projects = state.projects.filter(matchesProject); $('catalog-count').textContent = String(projects.length); $('catalog-description').textContent = projects.length === state.projects.length ? `${state.projects.length} dossiers disponibles · orden alfabético` : `${projects.length} de ${state.projects.length} dossiers con estos filtros`; projects.forEach((p) => { const item = el('li'); const b = button('', () => selectNode(`project:${p.id}`), 'catalog-item'); b.setAttribute('aria-current', String(state.selectedProject === p.id)); b.dataset.projectId = p.id; append(b, el('strong', '', p.title), el('small', '', p.area_label || p.area)); item.append(b); list.append(item); }); if (!projects.length) list.append(el('li', 'catalog-no-results', 'No se han encontrado proyectos. Prueba con otro término o ámbito.')); updateScope(); if (focusedProject) { const retained = [...list.querySelectorAll('button')].find(b => b.dataset.projectId === focusedProject); (retained || $('catalog-search')).focus({ preventScroll: true }); } }
  function clearFilters() {
    state.area = ''; state.capability = ''; state.term = ''; state.page = 0;
    $('area-filter').value = ''; $('capability-filter').value = ''; $('catalog-search').value = '';
  }
  function quickMatches(project) {
    const skills = state.capabilities.filter(c => project.capability_ids.includes(c.id)).flatMap(c => [c.label, c.label_en, ...(c.aliases || [])]);
    const text = normalize([project.title, project.area_label, ...Object.values(project.summary), ...skills].join(' '));
    return (!quick.area || project.area === quick.area) && (!quick.term || text.includes(normalize(quick.term.trim())));
  }
  function quickOrder() {
    const areas = [...new Set(['tecnologicos', 'clinicos', 'educacion', 'negocios', 'creacion', 'gobierno', 'finanzas', 'metodologia', 'desarrollo-profesional', ...state.projects.map(project => project.area)])];
    const entryProjects = { tecnologicos: 'council', clinicos: 'smarthandover', educacion: 'reforma-educativa', negocios: 'comercio-local-virtual', creacion: 'lidia', gobierno: 'gobierno-ia', finanzas: 'finanzas-personales-app', metodologia: 'preparacion-proyectos', 'desarrollo-profesional': 'busqueda-empleo' };
    const queues = areas.map(area => state.projects.filter(project => project.area === area && quickMatches(project)).sort((a,b) => Number(b.id === entryProjects[area]) - Number(a.id === entryProjects[area])));
    const result = [];
    while (queues.some(queue => queue.length)) queues.forEach(queue => { if (queue.length) result.push(queue.shift()); });
    return result;
  }
  function renderQuickProjects() {
    const projects = quickOrder(), pages = Math.max(1, Math.ceil(projects.length / quick.size));
    quick.page = Math.max(0, Math.min(quick.page, pages - 1));
    const start = quick.page * quick.size, list = $('quick-project-list'); list.replaceChildren();
    projects.slice(start, start + quick.size).forEach(project => {
      const item = el('li', 'quick-project-card'), image = el('img');
      item.dataset.projectId = project.id;
      image.src = `/media/thumb/${encodeURIComponent(project.id)}.webp`; image.alt = ''; image.width = 640; image.height = 426; image.loading = 'lazy'; image.decoding = 'async';
      const content = el('div', 'quick-card-content');
      const briefNames = { council: 'Council', smarthandover: 'SmartHandover', 'reforma-educativa': 'Reforma educativa', 'comercio-local-virtual': 'Comercio local virtual', lidia: 'LidIA', 'gobierno-ia': 'Gobierno por IA' };
      const heading = el('h3', '', briefNames[project.id] || project.title); heading.title = project.title;
      append(content, el('p', 'quick-card-area', project.area_label), heading);
      [['Qué busca', 'purpose'], ['Qué se aporta', 'contribution'], ['Trabajo documentado', 'evidence']].forEach(([label, key]) => {
        const block = el('div', 'quick-card-summary'); append(block, el('strong', '', label), el('p', '', project.summary[key])); content.append(block);
      });
      const limits = el('details', 'quick-card-limits'); append(limits, el('summary', '', 'Resultados y límites'), el('p', '', project.summary.limits)); content.append(limits);
      const actions = el('div', 'quick-card-actions'), source = el('a', '', 'Ver ficha completa ↗'), map = el('a', '', 'Ver conexiones');
      source.href = safeLocalURL(project.source_url); source.target = '_blank'; source.rel = 'noopener';
      source.setAttribute('aria-label', `Ver ficha completa: ${project.title}`);
      map.href = `/?project=${encodeURIComponent(project.id)}#project-detail`; map.dataset.entryNode = `project:${project.id}`;
      append(actions, source, map); append(content, actions); append(item, image, el('span', 'quick-image-label', 'Ilustración conceptual'), content); list.append(item);
    });
    if (!projects.length) list.append(el('li', 'quick-empty', 'No hay fichas con estos filtros. Prueba otro tema o elige todos los ámbitos.'));
    $('quick-count').textContent = projects.length ? `${start + 1}–${Math.min(start + quick.size, projects.length)} de ${projects.length} ${projects.length === 1 ? 'ficha' : 'fichas'}${projects.length < state.projects.length ? ` · ${state.projects.length} en total` : ' · distintos estados de desarrollo'}` : `0 coincidencias · ${state.projects.length} fichas disponibles`;
    $('quick-page').textContent = `${quick.page + 1} / ${pages}`; $('quick-prev').disabled = quick.page === 0; $('quick-next').disabled = quick.page === pages - 1;
  }
  function openQuickArea(area = '') {
    quick.area = area; quick.term = ''; quick.page = 0;
    $('quick-area').value = area; $('quick-search').value = ''; renderQuickProjects();
    $('quick-title').focus({ preventScroll: true }); $('proyectos').scrollIntoView({ block: 'start', behavior: document.documentElement.dataset.motion === 'on' ? 'smooth' : 'auto' });
  }
  function wireQuickProjects() {
    $('quick-search').addEventListener('input', event => { quick.term = event.target.value; quick.page = 0; renderQuickProjects(); });
    $('quick-area').addEventListener('change', event => { quick.area = event.target.value; quick.page = 0; renderQuickProjects(); });
    [['quick-prev', -1], ['quick-next', 1]].forEach(([id, direction]) => $(id).addEventListener('click', () => { quick.page += direction; renderQuickProjects(); $('quick-title').focus({ preventScroll: true }); $('quick-title').scrollIntoView({ block: 'start' }); }));
    document.querySelectorAll('[data-quick-reset]').forEach(link => link.addEventListener('click', event => { if (!state.projects.length || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); openQuickArea(); }));
  }
  function wireVisitorEntries() {
    document.addEventListener('click', event => {
      const link = event.target.closest('[data-entry-node],[data-entry-all]'); if (!link) return;
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const id = link.dataset.entryNode || DEFAULT_NODE;
      if (!nodeMap.has(id)) return;
      event.preventDefault(); clearFilters(); selectNode(id);
      const target = link.dataset.entryNode ? (id.startsWith('project:') ? $('project-detail').querySelector('h3') : $('map-title')) : $('catalog-title');
      const currentURL = new URL(location.href); currentURL.hash = link.dataset.entryNode ? (id.startsWith('project:') ? 'project-detail' : 'map-title') : 'catalog-title';
      history.replaceState(null, '', currentURL.pathname + currentURL.search + currentURL.hash);
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start', behavior: document.documentElement.dataset.motion === 'on' ? 'smooth' : 'auto' });
    });
  }
  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(name, attrs = {}, text) { const e = document.createElementNS(NS, name); Object.entries(attrs).forEach(([key, value]) => e.setAttribute(key, value)); if (text !== undefined) e.textContent = text; return e; }
  function svgActivate(e, action) { e.addEventListener('click', action); e.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); action(); } }); }
  function measuredLines(label, width, measure) {
    const lines=[]; let line='';
    for (const word of String(label).trim().split(/\s+/)) {
      const candidate=line ? line+' '+word : word;
      if (measure(candidate)<=width) { line=candidate; continue; }
      if (line) { lines.push(line); line=''; }
      for (const character of Array.from(word)) {
        if (line && measure(line+character)>width) { lines.push(line); line=''; }
        line+=character;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  function svgLabel(group, label, x, y, center = false, above = false) {
    const chartWidth=Math.max(1,$('graph-container').clientWidth), scale=640/chartWidth;
    const font=(center ? (/\s/.test(label)?13:12) : 11.5)*scale, lineHeight=(center ? 16 : 15)*scale;
    const text=svgEl('text',{'text-anchor':'middle',class:center?'center-label':''});
    text.style.fontSize=font+'px';
    group.append(text);
    if (!group.isConnected) $('graph').append(group);
    const probe=svgEl('tspan',{x,y},''); text.append(probe);
    const measure=value=>{probe.textContent=value;return probe.getComputedTextLength();};
    let lines=[],maxLines=center?3:2,width;
    const radius=center?Number(group.querySelector('circle').getAttribute('r')):0;
    if (center) {
      for (let count=1;count<=3;count++) {
        const halfHeight=(count-1)*lineHeight/2+font*.7;
        width=2*Math.sqrt(Math.max(64,(radius-10)**2-halfHeight**2));
        lines=measuredLines(label,width,measure);
        if(lines.length<=count || count===3){maxLines=count;break;}
      }
    } else {
      width=Math.max(70,Math.min(176,2*(x-14),2*(626-x)));
      if (above && chartWidth<420) maxLines=1;
      lines=measuredLines(label,width,measure);
    }
    const truncated=lines.length>maxLines;
    lines=lines.slice(0,maxLines);
    if (truncated) {
      let last=lines.at(-1).replace(/[.,;:]$/,'');
      while(last && measure(last+'…')>width)last=Array.from(last).slice(0,-1).join('');
      lines[lines.length-1]=last+'…';
    }
    text.replaceChildren();
    lines.forEach((line,i)=>text.append(svgEl('tspan',{x,y:center?y+(i-(lines.length-1)/2)*lineHeight:y+(above?i-lines.length+1:i)*lineHeight},line)));
    const bounds=text.getBBox();
    let dx=0,dy=center?y-(bounds.y+bounds.height/2):0;
    if(!center){
      if(bounds.x<12)dx=12-bounds.x;
      if(bounds.x+bounds.width+dx>628)dx=628-bounds.x-bounds.width;
      if(bounds.y<12)dy=12-bounds.y;
      if(bounds.y+bounds.height+dy>588)dy=588-bounds.y-bounds.height;
    }
    text.setAttribute('transform',`translate(${dx} ${dy})`);
    text.dataset.truncated=String(truncated);
  }
  function renderGraph() { const node = nodeMap.get(state.focus); if (!node) return; $('map-title').textContent = node.label; $('map-kind').textContent = kindNames[node.kind] || 'CONEXIONES DOCUMENTADAS'; const svg = $('graph'); const hadGraphFocus = svg.contains(document.activeElement); svg.replaceChildren(svgEl('title', { id: 'graph-title' }, `Conexiones de ${node.label}`), svgEl('desc', { id: 'graph-desc' }, 'Selecciona un nodo para recorrer sus relaciones o una línea para consultar la evidencia. Las mismas conexiones están disponibles en la lista inferior.')); const edges = filteredEdges(); const grouped = new Map(); edges.forEach((edge) => { const other = otherNode(edge); if (!other) return; if (!grouped.has(other.id)) grouped.set(other.id, { node: other, edges: [] }); grouped.get(other.id).edges.push(edge); }); const neighbors = [...grouped.values()].sort((a, b) => a.node.label.localeCompare(b.node.label, 'es')); const chartWidth = $('graph-container').clientWidth; const pageSize = chartWidth < 420 ? 4 : chartWidth < 580 ? 6 : 8; const pages = Math.max(1, Math.ceil(neighbors.length / pageSize)); state.page = Math.min(state.page, pages - 1); const visible = neighbors.slice(state.page * pageSize, (state.page + 1) * pageSize); const cx = 320, cy = 270; const centerRadius = Math.max(80,50*640/Math.max(260,chartWidth)); const neighborHit = Math.max(20,14*640/Math.max(260,chartWidth)); visible.forEach((item, index) => { const angle = -Math.PI / 2 + (2 * Math.PI * index / Math.max(visible.length, 1)); const x = cx + 212 * Math.cos(angle), y = cy + 190 * Math.sin(angle); const distance = Math.hypot(x-cx,y-cy); const sx=cx+(x-cx)*(centerRadius+5)/distance, sy=cy+(y-cy)*(centerRadius+5)/distance, ex=x-(x-cx)*(neighborHit+3)/distance, ey=y-(y-cy)*(neighborHit+3)/distance; const group = svgEl('g', { class: 'graph-edge', role: 'button', tabindex: '0', 'aria-label': `Fundamento: ${node.label} — ${item.node.label}` }); append(group, svgEl('title', {}, item.edges[0].label || typeNames[item.edges[0].type]), svgEl('line', { x1: sx, y1: sy, x2: ex, y2: ey }), svgEl('line', { class: 'edge-hit', x1: sx, y1: sy, x2: ex, y2: ey }), svgEl('circle', { cx: (sx+ex)/2, cy: (sy+ey)/2, r: Math.max(17, 14*640/Math.max(260,chartWidth)), fill: 'transparent', class: 'edge-point-hit' }), svgEl('circle', { cx: (sx+ex)/2, cy: (sy+ey)/2, r: 3.5, fill: '#6e9e94', class: 'edge-point' })); svgActivate(group, () => renderRelation(item.edges[0])); svg.append(group); }); svg.append(svgEl('circle', { cx, cy, r: centerRadius+12, fill: '#e9f2eb', opacity: '.7', 'pointer-events': 'none' })); const center = svgEl('g', { class: 'graph-node', role: 'button', tabindex: '0', 'aria-label': `Ver detalle de ${node.label}` }); center.append(svgEl('circle', { cx, cy, r: centerRadius, fill: '#176f72' })); const brandedName=node.kind==='project' ? /^(SmartHandover|Chiarezza|Council|LidIA|Zeclana|Triaje)\b/.exec(node.label)?.[1] : null; svgLabel(center, brandedName || node.label, cx, cy, true); svgActivate(center, () => node.kind === 'project' ? showProject(node.project_id || node.id.slice(8)) : renderTheme(node)); svg.append(center); visible.forEach((item, index) => { const angle = -Math.PI / 2 + (2 * Math.PI * index / Math.max(visible.length, 1)); const x = cx + 212 * Math.cos(angle), y = cy + 190 * Math.sin(angle); const n = item.node; const color = n.kind === 'project' ? '#7c9d92' : n.kind === 'topic' ? '#ae9465' : '#147e7e'; const group = svgEl('g', { class: 'graph-node', role: 'button', tabindex: '0', 'aria-label': `${n.kind === 'project' ? 'Proyecto' : n.kind === 'topic' ? 'Idea' : 'Capacidad'}: ${n.label}` }); append(group, svgEl('title', {}, n.label), svgEl('circle', { cx: x, cy: y, r: neighborHit, fill: 'transparent' }), svgEl('circle', { cx: x, cy: y, r: 20, fill: '#f0f5ef' }), svgEl('circle', { cx: x, cy: y, r: 9, fill: color })); svgLabel(group, n.label, x, y < cy - 75 ? y - 29 : y + 34, false, y < cy - 75); svgActivate(group, () => selectNode(n.id)); svg.append(group); }); $('map-empty').hidden = neighbors.length > 0; $('map-description').textContent = neighbors.length ? `${neighbors.length} conexiones · selecciona una línea para ver su evidencia.` : 'Este punto no tiene conexiones que coincidan con los filtros.'; $('neighbor-page').textContent = `${state.page + 1} / ${pages}`; $('prev-neighbors').disabled = state.page === 0; $('next-neighbors').disabled = state.page >= pages - 1; $('connections-count').textContent = `(${edges.length})`; const list = $('connections'); list.replaceChildren(); edges.forEach((edge) => { const n = otherNode(edge); const li = el('li'); append(li, button(n.label, () => selectNode(n.id)), button(typeNames[edge.type] || 'Ver fundamento', () => renderRelation(edge), 'relation-link')); list.append(li); }); if (hadGraphFocus) svg.querySelector('.graph-node')?.focus({ preventScroll: true }); }
  function selectNode(id) { const previousFocus = document.activeElement; const n = nodeMap.get(id); if (!n) return; state.focus = id; state.page = 0; state.mode = n.kind; const currentURL = new URL(location.href); ['project', 'capability', 'topic'].forEach((key) => currentURL.searchParams.delete(key)); currentURL.searchParams.set(n.kind, n.kind === 'project' ? n.project_id || n.id.slice(8) : n.id.slice(n.kind.length + 1)); history.replaceState(null, '', currentURL.pathname + currentURL.search + currentURL.hash); document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode))); refreshEntrySelect(); renderGraph(); if (n.kind === 'project') showProject(n.project_id || id.slice(8)); else renderTheme(n); if (previousFocus && previousFocus !== document.body && !previousFocus.isConnected && document.activeElement === document.body) $('graph').querySelector('.graph-node')?.focus({ preventScroll: true }); }
  function detailBase(eyebrow, title, subtitle) { const panel = $('project-detail'); const restoreHeading = panel.contains(document.activeElement); panel.replaceChildren(); const heading=el('h3', '', title); heading.tabIndex=-1; append(panel, el('p', 'eyebrow', eyebrow), heading); if (restoreHeading) heading.focus({preventScroll:true}); if (subtitle) panel.append(el('p', 'detail-subtitle', subtitle)); return panel; }
  function renderTheme(node) { state.request++; state.selectedProject = null; renderCatalog(); const record = [...state.capabilities, ...state.topics].find((x) => `${node.kind}:${x.id}` === node.id); const panel = detailBase(kindNames[node.kind], node.label, 'Interpretación de IA · Revisión de Javier pendiente'); if (node.kind === 'capability' && record?.label_en) { panel.append(el('p', 'relation-meta', `${record.label_en} · ${record.category}`)); if (record.original_label !== record.label) panel.append(el('p', 'small', `En estos proyectos: ${record.original_label.toLocaleLowerCase('es')}.`)); } panel.append(el('p', 'small', record?.description || (node.kind === 'capability' ? 'Esta entrada permite explorar razonamientos descritos en los dossiers. Su relación con una capacidad no acredita experiencia, autonomía ni desempeño.' : 'Esta idea agrupa pasajes relacionados por su contenido. Consulta cada conexión para comprobar el fundamento.'))); if (record?.recruiting_context) { const context = record.recruiting_context; const extra = el('details', 'recruiting-context'); append(extra, el('summary', '', 'Relación con puestos de trabajo'), el('p', 'small', context.roles), el('p', 'small', context.text), el('p', 'relation-meta', `Comparación editorial · requisitos consultados el ${context.date}. Los enlaces ilustran requisitos; no confirman vacantes abiertas.`)); const sources = el('ul'); (context.sources || []).forEach(item => { const url = new URL(item.url); if (url.protocol !== 'https:') return; const link = el('a', '', item.label + ' ↗'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; const row = el('li'); row.append(link); sources.append(row); }); extra.append(sources); panel.append(extra); } const links = el('div', 'detail-connections'); append(links, el('h4', '', 'Proyectos y fundamentos')); related(node.id).forEach((edge) => { const n = otherNode(edge, node.id); if (n) links.append(button(`${n.label} ↗`, () => renderRelation(edge))); }); panel.append(links); }
  function renderProject(project, edges, error) { const panel = detailBase('PROYECTO / ' + (project.area_label || project.area || ''), project.title, `Fuente · versión ${project.version || 'no indicada'}`); if (project.image_url) { const figure = el('figure'); figure.style.margin = '0 0 18px'; const img = el('img', 'project-image'); img.src = safeLocalURL(project.image_url); img.alt = `Ilustración conceptual de ${project.title}`; img.loading = 'lazy'; img.addEventListener('error', () => { img.hidden = true; }); append(figure, img, el('figcaption', 'image-caption', project.image_caption || 'Ilustración conceptual. No representa una implantación real.')); panel.append(figure); } const labels = { purpose: 'Qué busca', contribution: 'Qué se aporta', evidence: 'Qué está documentado', limits: 'Hasta dónde llega' }; Object.entries(labels).forEach(([key, label]) => { const section = el('section', 'summary-block'); append(section, el('h4', '', label), el('p', '', project.summary?.[key] || 'No resumido en el corpus. Consulta el dossier.')); panel.append(section); }); const source = el('a', 'detail-source', 'Leer el dossier completo ↗'); source.href = safeLocalURL(project.source_url || `/tesis/${encodeURIComponent(project.id)}`); source.target = '_blank'; source.rel = 'noopener'; panel.append(source); if (error) panel.append(el('p', 'small muted', 'Detalle mostrado desde el corpus local. No se pudo actualizar el endpoint del proyecto: ' + error)); const connections = el('div', 'detail-connections'); append(connections, el('h4', '', `Conexiones con evidencia (${edges.length})`)); edges.forEach((edge) => { const n = otherNode(edge, `project:${project.id}`); connections.append(button(`${n?.label || edge.target} · ${typeNames[edge.type] || 'Relación'}`, () => renderRelation(edge))); }); if (!edges.length) connections.append(el('p', 'small muted', 'No hay relaciones anotadas para este dossier.')); panel.append(connections); }
  async function showProject(id) { const project = projectMap.get(id); if (!project) return; const request = ++state.request; state.selectedProject = id; renderCatalog(); renderProject(project, related(`project:${id}`)); try { const response = await json(`/api/project/${encodeURIComponent(id)}`); if (request !== state.request) return; const current = response.project || response; renderProject(current, response.edges || related(`project:${id}`)); } catch (error) { if (request === state.request) renderProject(project, related(`project:${id}`), error.message); } }
  function citationFromEvidence(ev) { const p = projectMap.get(ev.project_id); const section = p?.sections?.find((s) => s.id === ev.section_id); return { ...ev, title: p?.title || ev.project_id, heading: section?.heading || 'Pasaje de la fuente', version: ev.source_version || ev.version, source_url: p?.source_url || `/tesis/${encodeURIComponent(ev.project_id)}` }; }
  function renderRelation(edge) { state.request++; const source = nodeMap.get(edge.source), target = nodeMap.get(edge.target); const panel = detailBase('POR QUÉ EXISTE ESTA CONEXIÓN', typeNames[edge.type] || 'Relación interpretada', `${source?.label || edge.source} ↔ ${target?.label || edge.target}`); panel.append(el('p', 'small', edge.label || 'Relación descrita a partir de los pasajes citados.')); panel.append(el('p', 'relation-meta', `Origen: ${edge.origin === 'interpretacion_ia' ? 'interpretación de IA' : edge.origin || 'no indicado'} · Revisión de Javier: ${edge.user_review === 'pending' ? 'pendiente' : edge.user_review || 'no indicada'}.`)); if (edge.attribution) panel.append(el('p', 'relation-meta', `Atribución: ${attributionNames[edge.attribution] || edge.attribution}. ${edge.claim_type ? `Tipo: ${claimNames[edge.claim_type] || edge.claim_type}.` : ''}`)); panel.append(el('p', 'small muted', 'Esta relación permite explorar el texto. No acredita una habilidad ni valida resultados externos.')); (edge.evidence || []).forEach((ev, index) => { const c = citationFromEvidence(ev); const block = el('div', 'evidence-card'); append(block, el('p', 'small muted', `${c.title} · ${c.heading}`), el('blockquote', '', c.quote), button(`Abrir pasaje ${index + 1} · v${c.version || 'no indicada'}`, () => openCitation(c))); panel.append(block); }); if (!edge.evidence?.length) panel.append(el('p', 'error-banner', 'No hay pasajes adjuntos a esta relación. Su fundamento queda sin verificar.')); if (source) panel.append(button(`Explorar ${source.label} ↗`, () => selectNode(source.id), 'text-button')); if (target) panel.append(button(`Explorar ${target.label} ↗`, () => selectNode(target.id), 'text-button')); }
  function openCitation(citation) { const project = projectMap.get(citation.project_id); const section = project?.sections?.find((s) => s.id === citation.section_id); $('citation-title').textContent = citation.title || project?.title || citation.project_id; const version = citation.version || citation.source_version; $('citation-meta').textContent = `${citation.citation_id ? citation.citation_id + ' · ' : ''}${citation.heading || section?.heading || 'Sección no identificada'} · versión citada ${version || 'no indicada'}`; $('citation-quote').textContent = citation.quote || 'El servicio no ha devuelto el pasaje.'; $('citation-section').textContent = section?.text || 'No se ha localizado esta sección en el corpus cargado. Puedes consultar el dossier completo.'; const same = version && project?.version && String(version) === String(project.version); $('citation-version-note').textContent = project ? (same ? `La versión citada coincide con la fuente cargada (${project.version}).` : `Fuente cargada: ${project.version || 'versión no indicada'}. La coincidencia con la versión citada no está confirmada.`) : 'No se ha podido contrastar esta cita con el corpus cargado.'; const sourceURL = citation.source_url || project?.source_url || `/tesis/${encodeURIComponent(citation.project_id)}`; const url = new URL(safeLocalURL(sourceURL), location.origin); if (citation.section_id) url.hash = citation.section_id; $('citation-source').href = url.pathname + url.search + url.hash; const dialog = $('citation-dialog'); if (!dialog.open) dialog.showModal(); }
  function setBusy(busy) { state.busy = busy; $('search-button').disabled = busy; $('ask-button').disabled = busy || !state.generation; $('search-button').textContent = busy ? 'Consultando…' : 'Buscar pasajes'; }
  function addSources(parent, sources) { if (!sources.length) return; parent.append(el('h3', '', 'Pasajes de las fuentes')); const list = el('ol', 'sources-list'); sources.forEach((source, index) => { const li = el('li', 'source-item'); const b = button('', () => openCitation(source)); append(b, el('strong', '', `[${source.citation_id || index + 1}] ${source.title || source.project_id}`), el('p', '', source.quote), el('small', '', `${source.heading || 'Pasaje'} · v${source.version || source.source_version || 'no indicada'} · Abrir fuente ↗`)); li.append(b); list.append(li); }); parent.append(list); }
  async function querySources(generate) { const input = $('question'); if (!input.reportValidity() || state.busy) return; const query = input.value.trim(); if (!query) return; if (generate && !state.generation) return; setBusy(true); const region = $('answer-region'); region.replaceChildren(el('p', 'small muted', generate ? 'Recuperando pasajes y consultando el generador conectado…' : 'Buscando pasajes en los dossiers…')); const body = { query }; if (state.area) body.area = state.area; if (state.capability) body.capability = state.capability; if (!generate) body.limit = 8; try { const data = await json(generate ? '/api/ask' : '/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); region.replaceChildren(); if (generate) { const sources = Array.isArray(data.sources) ? data.sources : []; region.append(el('p', 'answer-meta', data.abstained ? 'El servicio se ha abstenido de generar una respuesta sustentada.' : data.grounded ? 'Respuesta del generador · fundamentación declarada por el servicio' : 'El servicio no confirma que la respuesta esté fundamentada.')); if (data.answer) region.append(el('p', 'answer-text', data.answer)); const byID = new Map(sources.map((s) => [s.citation_id, s])); if (Array.isArray(data.claims) && data.claims.length) { region.append(el('h3', '', 'Afirmaciones y referencias')); data.claims.forEach((claim) => { const block = el('div', 'claim'); block.append(el('p', '', claim.text)); (claim.citation_ids || []).forEach((id) => { if (byID.has(id)) block.append(button(`[${id}]`, () => openCitation(byID.get(id)), 'citation-button')); else block.append(el('span', 'small muted', ` [${id}: fuente no devuelta] `)); }); region.append(block); }); } region.append(el('p', 'answer-meta', `Proveedor: ${data.provider || 'no informado'} · Modelo: ${data.model || 'no confirmado'}.`)); addSources(region, sources); } else { const results = Array.isArray(data.results) ? data.results : []; region.append(el('p', 'answer-meta', results.length ? `${results.length} pasajes recuperados. La recuperación de texto no equivale a una respuesta generada.` : 'No se han recuperado pasajes para esta consulta. Prueba con términos más concretos o amplía los filtros.')); addSources(region, results); } } catch (error) { region.replaceChildren(el('p', 'error-banner', `No se ha podido completar la consulta. ${error.message}`)); if (error.sources?.length) { region.append(el('p', 'answer-meta', 'La generación no ha producido una respuesta verificada. Estos son los pasajes recuperados:')); addSources(region, error.sources); } } finally { setBusy(false); } }
  async function checkStatus() { try { const status = await json('/api/status'); state.generation = status.generation?.available === true; $('provider-dot').classList.toggle('available', state.generation); $('provider-status').textContent = state.generation ? 'Generador conectado' : 'Generador no disponible'; $('provider-description').textContent = state.generation ? `${status.generation.provider || 'Proveedor no indicado'} · ${status.generation.model || 'modelo no confirmado'}. Las respuestas usan pasajes del corpus.` : 'Puedes buscar pasajes. Para elaborar respuestas es necesario conectar un generador real.'; } catch { state.generation = false; $('provider-status').textContent = 'Estado del servicio no disponible'; $('provider-description').textContent = 'No se pudo comprobar el generador. Puedes intentar buscar pasajes en el servicio local.'; } $('ask-button').disabled = state.busy || !state.generation; }
  function wire() { let resizeTimer; window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (state.focus) renderGraph(); }, 120); }); document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { const first = state.nodes.find((n) => n.kind === b.dataset.mode); if (first) selectNode(first.id); })); $('entry-select').addEventListener('change', (event) => selectNode(event.target.value)); $('catalog-search').addEventListener('input', (event) => { state.term = event.target.value; state.page = 0; renderCatalog(); renderGraph(); }); $('area-filter').addEventListener('change', (event) => { state.area = event.target.value; state.page = 0; renderCatalog(); renderGraph(); }); $('capability-filter').addEventListener('change', (event) => { state.capability = event.target.value; state.page = 0; renderCatalog(); renderGraph(); }); $('map-reset').addEventListener('click', () => { state.area = ''; state.capability = ''; state.term = ''; $('area-filter').value = ''; $('capability-filter').value = ''; $('catalog-search').value = ''; const initial = nodeMap.get(DEFAULT_NODE) || state.nodes[0]; if (initial) selectNode(initial.id); }); $('prev-neighbors').addEventListener('click', () => { state.page--; renderGraph(); }); $('next-neighbors').addEventListener('click', () => { state.page++; renderGraph(); }); $('close-citation').addEventListener('click', () => $('citation-dialog').close()); $('citation-dialog').addEventListener('click', (event) => { if (event.target === $('citation-dialog')) { const rect = event.target.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close(); } }); $('ask-form').addEventListener('submit', (event) => { event.preventDefault(); querySources(false); }); $('ask-button').addEventListener('click', () => querySources(true)); document.querySelectorAll('.quick-questions button').forEach((b) => b.addEventListener('click', () => { $('question').value = b.textContent; querySources(state.generation); })); }
  async function init() { setupMotion(); wire(); wireVisitorEntries(); wireQuickProjects(); const statusPromise = checkStatus(); try { const [corpus, graph] = await Promise.all([json('/data/corpus.json'), json('/data/graph.json')]); state.projects = (corpus.projects || []).sort((a, b) => a.title.localeCompare(b.title, 'es')); state.capabilities = corpus.capabilities || []; state.topics = corpus.topics || []; state.nodes = graph.nodes || []; state.edges = graph.edges || []; buildAreaMosaic(); state.projects.forEach((p) => projectMap.set(p.id, p)); state.nodes.forEach((n) => nodeMap.set(n.id, n)); const areas = new Map(); state.projects.forEach((p) => areas.set(p.area, p.area_label || p.area)); [...areas].sort((a, b) => a[1].localeCompare(b[1], 'es')).forEach(([id, label]) => { const option = el('option', '', label); option.value = id; $('area-filter').append(option); const quickOption = el('option', '', label); quickOption.value = id; $('quick-area').append(quickOption); }); renderQuickProjects(); state.capabilities.forEach((c) => { const option = el('option', '', c.label); option.value = c.id; $('capability-filter').append(option); }); const first = nodeMap.get(DEFAULT_NODE) || state.nodes.find((n) => n.kind === 'project') || state.nodes[0]; if (!first) throw new Error('El corpus no contiene nodos navegables.'); const params = new URLSearchParams(location.search); const requestedNode = ['project', 'capability', 'topic'].map((kind) => { const value = params.get(kind); return value ? nodeMap.get(`${kind}:${value}`) : null; }).find(Boolean); selectNode(requestedNode ? requestedNode.id : first.id);  if (state.projects.length !== 82 || areas.size !== 9) { $('load-error').hidden = false; $('load-error').textContent = `El corpus cargado contiene ${state.projects.length} proyectos y ${areas.size} ámbitos. La cabecera describe el alcance previsto de 82 dossiers y 9 ámbitos.`; } } catch (error) { $('load-error').hidden = false; $('load-error').textContent = `No se ha podido cargar el corpus público. ${error.message}`; $('catalog-description').textContent = 'Datos no disponibles.'; $('map-title').textContent = 'El mapa no está disponible'; } await statusPromise; }
  init();
})();
