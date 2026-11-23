'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const data = window.CCF_DATA;
  const geo = window.CCF_GEO;
  if (!data?.events?.length || !geo) {
    $('boot-error').hidden = false;
    $('boot-error').textContent = 'Conference data or map resources could not be loaded. Please refresh the page.';
    return;
  }
  const fields = {AI:'Artificial Intelligence',CG:'Graphics & Multimedia',DB:'Databases & Data Mining',DS:'Architecture & Distributed Computing',NW:'Computer Networks',SC:'Network & Information Security',SE:'Software Engineering',CT:'Theoretical Computer Science',HI:'Human–Computer Interaction',MX:'Interdisciplinary Computing'};
  const monthNames = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
  const countLabel = (count, singular, plural = singular + 's') => `${count} ${count === 1 ? singular : plural}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const pad = n => String(n).padStart(2,'0');
  const cst = value => new Date(+new Date(value) + 8 * 3600000).toISOString().slice(0,16).replace('T',' ');
  const typeName = d => d.type === 'abstract' ? 'Abstract deadline' : 'Paper deadline';
  const rankBadge = e => `<span class="badge ${esc(e.rank.toLowerCase())}">CCF ${esc(e.rank)}</span>`;
  const byName = (a,b) => a.localeCompare(b,'en',{numeric:true});
  const dateKey = e => e.start || '9999-12-31';
  const validUrl = url => /^https?:\/\//i.test(url || '');
  function readSaved() {
    try {
      const list = JSON.parse(localStorage.getItem('ccf-circuit.saved.v1') || '[]');
      return new Set(Array.isArray(list) ? list : []);
    } catch { return new Set(); }
  }

  const events = data.events.map(e => {
    const deadlines = (e.deadlines || []).map(d => ({...d, ts:d.at ? Date.parse(d.at) : NaN}))
      .sort((a,b) => (a.ts || Infinity) - (b.ts || Infinity));
    const points = geo.lookup(e.place || '');
    const search = normalize([e.title,e.name,e.year,e.place,e.rank,fields[e.category],...points.map(p => p.name)].join(' '));
    return {...e, year:Number(e.year), meetingYear:e.start ? Number(e.start.slice(0,4)) : Number(e.year), points, deadlines, search};
  });
  const eventById = new Map(events.map(e => [e.id,e]));
  const initialNow = Date.now();
  const today = cst(initialNow);
  const currentYear = Number(today.slice(0,4));
  const seasons = [...new Set(events.map(e => e.meetingYear))].sort((a,b) => b-a);
  const nextInitialDeadline = events.filter(e => e.rank === 'A' && e.category === 'AI')
    .flatMap(e => e.deadlines).filter(d => d.ts > initialNow).sort((a,b) => a.ts-b.ts)[0];
  const initialYear = nextInitialDeadline ? Number(cst(nextInitialDeadline.ts).slice(0,4)) : currentYear;
  const state = {year:initialYear, month:0, mode:'deadline', rank:'A', category:'AI', query:'', favOnly:false, limit:32, saved:readSaved()};
  let rows = [], spotlight = null, cityMap = new Map(), openCity = null;
  let zoom = 1, center = [500,223];
  let lastNow = Date.now();
  let globeView = null;

  function populateYears() {
    const years = state.mode === 'meet' ? seasons : [...new Set(events.flatMap(e => e.deadlines.filter(d => Number.isFinite(d.ts)).map(d => Number(cst(d.ts).slice(0,4)))))].sort((a,b) => b-a);
    if (!years.includes(state.year) && years.length) state.year = years.includes(currentYear) ? currentYear : years[0];
    $('year').innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    $('year').value = state.year;
  }
  function computeRows() {
    const q = normalize(state.query).trim().split(/\s+/).filter(Boolean);
    const items = [];
    for (const e of events) {
      if ((state.rank && e.rank !== state.rank) || (state.category && state.category !== e.category) ||
          (state.favOnly && !state.saved.has(e.id)) || !q.every(s => e.search.includes(s))) continue;
      if (state.mode === 'meet') {
        if (e.meetingYear !== state.year) continue;
        items.push({e, date:e.start || '', d:null});
      } else {
        for (const d of e.deadlines) {
          if (!Number.isFinite(d.ts)) continue;
          const dt = cst(d.ts);
          if (Number(dt.slice(0,4)) === state.year) items.push({e, date:dt.slice(0,10), d});
        }
      }
    }
    return items.filter(r => !state.month || Number(r.date.slice(5,7)) === state.month)
      .sort((a,b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.d?.ts || 0)-(b.d?.ts || 0) || byName(a.e.title,b.e.title));
  }
  function nextDeadline(e, now) { return e.deadlines.find(d => d.ts > now); }
  function deadlineStatus(e,now) {
    if (nextDeadline(e,now)) return 'Upcoming deadline';
    return !e.deadlines.length || e.deadlines.some(d => !Number.isFinite(d.ts)) ? 'Deadline TBA' : 'Submissions closed';
  }
  function delta(ts, now = Date.now()) {
    const seconds = Math.max(0,Math.floor((ts-now)/1000));
    return [Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];
  }
  function relative(ts,now=Date.now()) {
    if (ts <= now) return 'Closed';
    const [d,h,m] = delta(ts,now);
    return d ? `${d}d ${h}h left` : h ? `${h}h ${m}m left` : m ? `${m} min left` : 'Under 1 min';
  }
  function pendingSubmissions(now = Date.now()) {
    const entries = rows.map(({e,d}) => ({e,d:d || nextDeadline(e,now)})).filter(s => s.d && s.d.ts > now);
    const unique = new Map(entries.map(s => [`${s.e.id}:${s.d.ts}:${s.d.type}`, s]));
    return [...unique.values()].sort((a,b) => a.d.ts-b.d.ts || byName(a.e.title,b.e.title));
  }
  function makeSpotlight(now) {
    return pendingSubmissions(now)[0] || null;
  }
  function renderUpcoming() {
    const upcoming = pendingSubmissions().slice(1,4);
    $('upcoming-list').innerHTML = upcoming.length ? upcoming.map(({e,d}) => `<button class="upcoming-item" data-open="${esc(e.id)}"><span class="upcoming-main"><strong>${esc(e.title)} <small>${e.year}</small></strong>${rankBadge(e)}</span><span class="upcoming-time">${typeName(d)} · ${esc(cst(d.ts))}</span><span class="upcoming-relative" data-relative="${d.ts}">${relative(d.ts)}</span></button>`).join('') : '<p class="upcoming-empty">No further deadlines match these filters.</p>';
  }
  function renderSpot() {
    $('focus-deadline').disabled = !spotlight?.e.points.length;
    $('focus-deadline').innerHTML = icon('focus') + (spotlight && !spotlight.e.points.length ? 'Location unavailable' : 'Locate on globe');
    if (!spotlight) {
      $('spot-body').innerHTML = '<p class="small-empty"><b>No upcoming deadlines</b>No announced future deadlines match these filters.</p>';
      return;
    }
    const {e,d} = spotlight;
    $('spot-body').innerHTML = `<div><div class="spot-meta">${rankBadge(e)} · ${esc(fields[e.category] || e.category)}</div><button data-open="${esc(e.id)}" class="spot-name">${esc(e.title)} <span>${e.year}</span></button><div class="spot-location">${icon('pin')} ${esc(e.place || 'Location TBA')}</div></div><div class="countdown" role="timer" aria-label="Time until submission deadline">${['Days','Hrs','Min','Sec'].map((s,i) => `<div><b id="tick-${i}">00</b><small>${s}</small></div>`).join('')}</div><div class="spot-when"><b>${typeName(d)}</b><span>${esc(cst(d.ts))} UTC+8</span></div>`;
    renderClock();
  }
  function renderClock() {
    globeView?.updateCountdowns();
    if (!spotlight) return;
    delta(spotlight.d.ts).forEach((v,i) => { $('tick-'+i).textContent = pad(v); });
  }
  function renderSchedule() {
    const blocks = [];
    let group = null, chunk = [];
    function finish() {
      if (!chunk.length) return;
      const label = group ? monthNames[group] : 'Dates to be announced';
      blocks.push(`<div class="group-title"><b>${label}</b><span>${group ? state.year : ''}</span></div><div class="rows">${chunk.join('')}</div>`);
      chunk = [];
    }
    for (const {e,date,d} of rows.slice(0,state.limit)) {
      const month = Number(date.slice(5,7)) || 0;
      if (month !== group) { finish(); group = month; }
      const next = d || nextDeadline(e,Date.now());
      const day = date ? date.slice(8,10) : '—';
      const subDate = d ? cst(d.ts).slice(11) : month ? monthNames[month].slice(0,3) : 'TBA';
      const shortDate = next ? cst(next.ts).slice(5,16) : '';
      const status = next ? relative(next.ts) : deadlineStatus(e,Date.now());
      const second = d ? typeName(d) : next ? typeName(next) : 'Submission status';
      const saved = state.saved.has(e.id);
      const nearest = e.id === spotlight?.e.id && (!d || d.ts === spotlight.d.ts);
      chunk.push(`<article class="event${nearest ? ' is-next' : ''}" data-row="${esc(e.id)}"><div class="date-block"><strong>${day}</strong><small>${subDate}</small></div><div class="cell"><div class="event-title"><button class="event-name" data-open="${esc(e.id)}">${esc(e.title)}</button>${rankBadge(e)}</div><small>${e.year} · ${esc(fields[e.category] || e.category)}</small></div><div class="cell location-cell"><span class="place-text">${esc(e.place || 'Location TBA')}</span><small>${esc(e.date || 'Dates TBA')}</small></div><div class="cell"><span class="deadline-text ${next && next.ts>Date.now() ? 'active-deadline':''}" ${next ? `data-relative="${next.ts}"` : ''}>${status}</span><small>${second} ${esc(shortDate)}</small></div><button class="save" data-save="${esc(e.id)}" aria-pressed="${saved}" aria-label="${saved?'Unsave':'Save'} ${esc(e.title)} ${e.year}">${icon('star')}</button></article>`);
    }
    finish();
    $('schedule').innerHTML = blocks.join('') || `<div class="empty">${state.favOnly ? 'No saved conferences match these filters. Use the star beside a conference to save it.' : 'No conferences match these filters.'} <button id="clear-filter">Reset filters</button></div>`;
    $('more').hidden = rows.length <= state.limit;
    $('more').textContent = `Show more (${Math.max(0,rows.length-state.limit)} remaining)`;
  }
  function mapView() {
    const width = 1000/zoom, height = 410/zoom;
    center[0] = Math.min(1000-width/2,Math.max(width/2,center[0]));
    center[1] = Math.min(428-height/2,Math.max(18+height/2,center[1]));
    $('map').setAttribute('viewBox',[center[0]-width/2,center[1]-height/2,width,height].join(' '));
    $('zoom-out').disabled=zoom<=1; $('zoom-in').disabled=zoom>=8;
  }
  function renderMap(list) {
    cityMap=new Map(); let missing=0;
    for (const e of list) {
      if (!e.points.length) missing++;
      for (const p of e.points) {
        const key = p.lon.toFixed(2)+','+p.lat.toFixed(2);
        if (!cityMap.has(key)) cityMap.set(key,{...p, key, events:[]});
        const city = cityMap.get(key);
        if (!city.events.includes(e)) city.events.push(e);
      }
    }
    $('map-count').textContent=countLabel(cityMap.size,'city','cities');
    $('unmapped').textContent=missing ? missing+' unmapped' : '';
    $('unmapped').title='Online conferences and conferences without a confirmed map location remain in the schedule.';
    $('city-pop').hidden=true; openCity=null;
    const pending = pendingSubmissions();
    if (globeView?.available) {
      globeView.setLocations([...cityMap.values()].map(p => {
        const first = pending.find(({e}) => p.events.includes(e));
        return {...p, lng:p.lon, hot:p.events.some(e => e.id === spotlight?.e.id),
          next:first ? {id:first.e.id,title:first.e.title,year:first.e.year,at:first.d.ts,type:first.d.type} : null};
      }));
      return;
    }
    const svg = [];
    const groups = [...cityMap.values()].map(p => ({...p,xy:geo.project(p.lon,p.lat),hot:p.events.some(e => e.id === spotlight?.e.id)}))
      .sort((a,b) => Number(b.hot)-Number(a.hot) || b.events.length-a.events.length || byName(a.name,b.name));
    // Place a few collision-free city labels while keeping every venue clickable.
    const labels = [];
    const labelPoints = new Map();
    for (const p of groups) {
      if (labels.length >= 5) break;
      const [x,y] = p.xy;
      const leftward = x>830;
      const advance = Math.max(30,p.name.length*6.8);
      const box = [leftward ? x-9-advance:x+9,y-17,leftward ? x-9:x+9+advance,y+1];
      if (box[0]<0 || box[2]>1000 || labels.some(([l,t,r,b]) => box[0]<r+22 && box[2]>l-22 && box[1]<b+13 && box[3]>t-13)) continue;
      labels.push(box);labelPoints.set(p.key,leftward);
    }
    for (const p of groups.reverse()) {
      const [x,y] = p.xy, radius = (p.hot ? 5.7 : Math.min(5.2,3.7+Math.log(p.events.length)))/Math.sqrt(zoom);
      const color = p.hot ? '#dfa0a6' : '#b5c8e3';
      const title = p.name+' · '+countLabel(p.events.length,'conference');
      const label = labelPoints.has(p.key);
      const leftward = labelPoints.get(p.key);
      svg.push(`<g transform="translate(${x} ${y})" data-city="${esc(p.key)}" class="map-pin" tabindex="0" role="button" aria-label="${esc(title)}"><title>${esc(title)}</title><circle r="${radius+5}" fill="transparent"/>${p.hot ? `<circle r="${radius+4}" fill="none" stroke="${color}" opacity=".6"/>` : ''}<circle class="dot" r="${radius}" fill="${color}" stroke="#23344e" stroke-width="1.1"/>${label ? `<text x="${leftward?-9:9}" y="-6" text-anchor="${leftward?'end':'start'}" fill="${p.hot?'#f1cbd0':'#e1e8f3'}" font-family="Arial,sans-serif" font-size="12.4" font-weight="650" paint-order="stroke" stroke="#23344e" stroke-width="2.8">${esc(p.name)}</text>`:''}</g>`);
    }
    $('markers').innerHTML=svg.join('');
    $('map-count').textContent=countLabel(cityMap.size,'city','cities');
    $('city-pop').hidden=true; openCity=null;
    mapView();
  }
  function showCity(key) {
    const p=cityMap.get(key);
    if(!p)return;
    openCity=key;
    const pending = pendingSubmissions();
    $('city-pop').innerHTML=`<div class="pop-title">${esc(p.name)} · ${countLabel(p.events.length,'conference')}<button id="pop-close" aria-label="Close city conferences">${icon('close')}</button></div>${p.events.sort((a,b)=>dateKey(a).localeCompare(dateKey(b))||byName(a.title,b.title)).map(e=>{const next=pending.find(s=>s.e===e)?.d;const status=nextDeadline(e,Date.now())?'No upcoming deadlines in this range':deadlineStatus(e,Date.now());return `<button class="pop-event" data-open="${esc(e.id)}"><strong>${esc(e.title)} ${e.year}</strong><span>${next?typeName(next)+' · '+relative(next.ts):status}</span></button>`;}).join('')}`;
    $('city-pop').hidden=false;
    $('pop-close').focus({preventScroll:true});
  }
  function render() {
    lastNow=Date.now();
    rows=computeRows(); spotlight=makeSpotlight(lastNow);
    const unique=[...new Set(rows.map(r=>r.e))];
    $('title').textContent=state.favOnly?'Saved conferences':'CCF-Schedule';
    $('agenda-label').textContent=state.mode==='meet'?'Conference schedule':'Submission deadlines';
    $('result-count').textContent=countLabel(unique.length,'conference')+(state.mode==='deadline'?' · '+countLabel(rows.length,'deadline'):'');
    $('fav-count').textContent=state.saved.size;
    $('nav-fav').setAttribute('aria-pressed',state.favOnly);
    $('nav-all').setAttribute('aria-pressed',!state.favOnly);
    $('mode-meet').setAttribute('aria-pressed',state.mode==='meet');
    $('mode-deadline').setAttribute('aria-pressed',state.mode==='deadline');
    $('months').innerHTML=Array.from({length:13},(_,i)=>`<button data-month="${i}" aria-pressed="${i===state.month}">${i?monthNames[i].slice(0,3):'All year'}</button>`).join('');
    renderSpot();renderUpcoming();renderMap(unique);renderSchedule();
  }
  function showDetail(id) {
    const e=eventById.get(id);if (!e) return;
    const saved=state.saved.has(id);
    globeView?.stopRotation();
    $('detail-content').innerHTML=`<div class="detail-top"><div>${rankBadge(e)} <span class="meta">${esc(fields[e.category]||e.category)}</span></div><button id="detail-close" autofocus aria-label="Close conference details">${icon('close')}</button></div><h2 id="detail-title" class="detail-name">${esc(e.title)} ${e.year}</h2><p class="detail-long">${esc(e.name)}</p><div class="detail-info"><div>${icon('calendar')}${esc(e.date||'Dates TBA')}</div><div>${icon('pin')}${esc(e.place||'Location TBA')}</div></div><h3 class="detail-section-title">Submission timeline <small>UTC+8</small></h3><ul class="detail-timeline">${e.deadlines.length ? e.deadlines.map(d => `<li><div><strong>${typeName(d)}</strong>${d.note?`<small>${esc(d.note)}</small>`:''}</div><div>${Number.isFinite(d.ts)?esc(cst(d.ts)):'To be announced'}<small>${esc(d.local||'')} ${esc(d.timezone||'')}</small></div></li>`).join('') : '<li>Submission dates to be announced</li>'}</ul><div class="detail-actions">${validUrl(e.link)?`<a class="primary-btn" href="${esc(e.link)}" target="_blank" rel="noopener">Conference website ${icon('link')}</a>`:''}<button class="secondary-btn" data-save="${esc(id)}" aria-pressed="${saved}">${icon('star')} ${saved?'Saved':'Save conference'}</button></div>`;
    if (!$('detail').open) $('detail').showModal();
  }
  function toggleSave(id) {
    if (state.saved.has(id)) state.saved.delete(id);else state.saved.add(id);
    try {localStorage.setItem('ccf-circuit.saved.v1',JSON.stringify([...state.saved]));} catch{}
    render();
    if ($('detail').open) showDetail(id);
  }
  function resetFilters() {
    Object.assign(state,{rank:'',category:'',query:'',month:0,limit:32});
    $('rank').value='';$('category').value='';$('search').value='';
  }
  function zoomBy(multiplier) {
    if (globeView?.available) { globeView.zoom(multiplier); return; }
    const anchor=openCity && cityMap.get(openCity);
    if (anchor && multiplier>1) center=geo.project(anchor.lon,anchor.lat);
    zoom=Math.min(8,Math.max(1,zoom*multiplier));
    renderMap([...new Set(rows.map(r=>r.e))]);
  }

  document.addEventListener('click',evt=>{
    const el=evt.target;
    const action=el.closest('[data-save],[data-open],[data-city],[data-month],[data-row],button');
    if(!action) return;
    if(action.hasAttribute('data-save')) return toggleSave(action.dataset.save);
    if(action.hasAttribute('data-open')) return showDetail(action.dataset.open);
    if(action.hasAttribute('data-row')) return showDetail(action.dataset.row);
    if(action.hasAttribute('data-city')) {if(!suppressClick)showCity(action.dataset.city);return;}
    if(action.hasAttribute('data-month')){state.month=Number(action.dataset.month);state.limit=32;render();return;}
    switch(action.id){
      case 'detail-close':$('detail').close();break;
      case 'pop-close':$('city-pop').hidden=true;openCity=null;break;
      case 'zoom-in':zoomBy(1.65);break;
      case 'zoom-out':zoomBy(1/1.65);break;
      case 'map-reset':if(globeView?.available){globeView.reset();break;}zoom=1;center=[500,223];renderMap([...new Set(rows.map(r=>r.e))]);break;
      case 'globe-motion':globeView?.toggleRotation();break;
      case 'focus-deadline':if(globeView?.available)globeView.focusNearest();else if(spotlight?.e.points.length){const p=spotlight.e.points[0];showCity(p.lon.toFixed(2)+','+p.lat.toFixed(2));zoomBy(2);}break;
      case 'nav-all':case 'nav-fav':state.favOnly=action.id==='nav-fav';resetFilters();render();break;
      case 'mode-meet':case 'mode-deadline':state.mode=action.id==='mode-meet'?'meet':'deadline';state.month=0;state.limit=32;populateYears();render();break;
      case 'clear-filter':resetFilters();render();break;
      case 'more':state.limit+=40;renderSchedule();break;
    }
  });
  $('detail').addEventListener('click',ev=>{if(ev.target===$('detail')){const b=$('detail').getBoundingClientRect();if(ev.clientX<b.left||ev.clientX>b.right||ev.clientY<b.top||ev.clientY>b.bottom)$('detail').close();}});
  $('map').addEventListener('keydown',ev=>{
    if ((ev.key==='Enter'||ev.key===' ')&&ev.target.closest('[data-city]')){ev.preventDefault();showCity(ev.target.closest('[data-city]').getAttribute('data-city'));}
  });
  let drag=null,suppressClick=false;
  $('map').addEventListener('pointerdown',ev=>{
    if(zoom===1||ev.button!==0)return;
    const size=$('map').getBoundingClientRect(),scale=Math.min(size.width/(1000/zoom),size.height/(410/zoom));
    drag={x:ev.clientX,y:ev.clientY,center:[...center],scale,id:ev.pointerId};suppressClick=false;
  });
  $('map').addEventListener('pointermove',ev=>{
    if(!drag||drag.id!==ev.pointerId)return;
    const dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;
    if(!suppressClick && Math.hypot(dx,dy)<4)return;
    suppressClick=true;$('map').setPointerCapture(ev.pointerId);$('map').classList.add('drag');
    center=[drag.center[0]-dx/drag.scale,drag.center[1]-dy/drag.scale];mapView();
  });
  function stopDrag(){drag=null;$('map').classList.remove('drag');setTimeout(()=>{suppressClick=false;},0);}
  $('map').addEventListener('pointerup',stopDrag);$('map').addEventListener('pointercancel',stopDrag);
  $('year').addEventListener('change',()=>{state.year=Number($('year').value);state.month=0;state.limit=32;render();});
  ['rank','category'].forEach(id=>$(id).addEventListener('change',()=>{state[id]=$(id).value;state.limit=32;render();}));
  $('search').addEventListener('input',()=>{state.query=$('search').value;state.limit=32;render();});
  $('category').insertAdjacentHTML('beforeend',Object.entries(fields).map(([key,name])=>`<option value="${key}">${name}</option>`).join(''));
  $('rank').value=state.rank;
  $('category').value=state.category;
  if(data.updatedAt && Number.isFinite(Date.parse(data.updatedAt))) $('updated').textContent='Updated '+cst(data.updatedAt).slice(0,10);
  if (window.CCFGlobe) {
    globeView = new CCFGlobe($('globe'), {
      onSelect: showCity,
      onUnavailable: () => { if (rows.length) renderMap([...new Set(rows.map(r=>r.e))]); }
    });
  } else {
    $('map').removeAttribute('hidden');$('globe').hidden=true;
    $('map-stage').dataset.renderer='map';
    $('globe-status').textContent='2D map shown on this device';
    $('globe-hint').textContent='Zoom in to pan the map';
    $('globe-motion').hidden=true;
  }
  populateYears();render();
  setInterval(()=>{
    const now=Date.now();
    if(spotlight && spotlight.d.ts<=now){render();return;}
    renderClock();
    if(Math.floor(now/60000)!==Math.floor(lastNow/60000)){
      document.querySelectorAll('[data-relative]').forEach(el=>{el.textContent=relative(Number(el.dataset.relative),now);});
      lastNow=now;
    }
  },1000);
})();
