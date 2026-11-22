'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const data = window.CCF_DATA;
  const geo = window.CCF_GEO;
  if (!data?.events?.length || !geo) {
    $('boot-error').hidden = false;
    $('boot-error').textContent = '会议数据或地图资源未加载成功。请刷新页面重试。';
    return;
  }
  const fields = {AI:'人工智能',CG:'图形学与多媒体',DB:'数据库与数据挖掘',DS:'体系结构与分布计算',NW:'计算机网络',SC:'网络与信息安全',SE:'软件工程',CT:'计算机科学理论',HI:'人机交互',MX:'交叉与新兴方向'};
  const enMonth = ['','JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const pad = n => String(n).padStart(2,'0');
  const cst = value => new Date(+new Date(value) + 8 * 3600000).toISOString().slice(0,16).replace('T',' ');
  const typeName = d => d.type === 'abstract' ? '摘要截止' : '全文截止';
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
    return {...e, year:Number(e.year), points, deadlines, search};
  });
  const eventById = new Map(events.map(e => [e.id,e]));
  const today = cst(Date.now());
  const currentYear = Number(today.slice(0,4));
  const seasons = [...new Set(events.map(e => e.year))].sort((a,b) => b-a);
  const plannedYear = Number(today.slice(5,7)) >= 10 && seasons.includes(currentYear + 1) ? currentYear + 1 : currentYear;
  const state = {year:seasons.includes(plannedYear) ? plannedYear : seasons[0], month:0, mode:'meet', rank:'', category:'', query:'', favOnly:false, limit:32, saved:readSaved()};
  let rows = [], spotlight = null, cityMap = new Map(), openCity = null;
  let zoom = 1, center = [500,223];
  let lastNow = Date.now();

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
        if (e.year !== state.year) continue;
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
    if (nextDeadline(e,now)) return '待截止';
    return !e.deadlines.length || e.deadlines.some(d => !Number.isFinite(d.ts)) ? '截稿待公布' : '投稿已截止';
  }
  function delta(ts, now = Date.now()) {
    const seconds = Math.max(0,Math.floor((ts-now)/1000));
    return [Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];
  }
  function relative(ts,now=Date.now()) {
    if (ts <= now) return '已截止';
    const [d,h,m] = delta(ts,now);
    return d ? `剩 ${d} 天 ${h} 小时` : h ? `剩 ${h} 小时 ${m} 分` : m ? `剩 ${m} 分钟` : '不足 1 分钟';
  }
  function makeSpotlight(now) {
    const entries = rows.map(({e,d}) => ({e,d:d || nextDeadline(e,now)})).filter(s => s.d && s.d.ts > now);
    return entries.sort((a,b) => a.d.ts-b.d.ts || byName(a.e.title,b.e.title))[0] || null;
  }
  function renderSpot() {
    if (!spotlight) {
      $('spot-body').innerHTML = '<p class="small-empty"><b>暂无待截止投稿</b>当前范围内没有已公布的未来投稿截止时间。</p>';
      return;
    }
    const {e,d} = spotlight;
    $('spot-body').innerHTML = `<div><div class="spot-meta">${rankBadge(e)} · ${esc(fields[e.category] || e.category)}</div><button data-open="${esc(e.id)}" class="spot-name">${esc(e.title)} <span>${e.year}</span></button><div class="spot-location">${icon('pin')} ${esc(e.place || '地点待公布')}</div></div><div class="countdown" role="timer" aria-label="距离投稿截止">${['天','时','分','秒'].map((s,i) => `<div><b id="tick-${i}">00</b><small>${s}</small></div>`).join('')}</div><div class="spot-when"><b>${typeName(d)}</b><span>${esc(cst(d.ts))} 北京时间</span></div>`;
    renderClock();
  }
  function renderClock() {
    if (!spotlight) return;
    delta(spotlight.d.ts).forEach((v,i) => { $('tick-'+i).textContent = pad(v); });
  }
  function renderSchedule() {
    const blocks = [];
    let group = null, chunk = [];
    function finish() {
      if (!chunk.length) return;
      const label = group ? `${group} 月` : '会期待公布';
      blocks.push(`<div class="group-title"><b>${label}</b><span>${enMonth[group] || ''}</span></div><div class="rows">${chunk.join('')}</div>`);
      chunk = [];
    }
    for (const {e,date,d} of rows.slice(0,state.limit)) {
      const month = Number(date.slice(5,7)) || 0;
      if (month !== group) { finish(); group = month; }
      const next = d || nextDeadline(e,Date.now());
      const day = date ? date.slice(8,10) : '—';
      const subDate = d ? cst(d.ts).slice(11) : month ? pad(month)+' 月' : '待定';
      const shortDate = next ? cst(next.ts).slice(5,16) : '';
      const status = next ? relative(next.ts) : deadlineStatus(e,Date.now());
      const second = d ? typeName(d) : next ? typeName(next) : '投稿状态';
      const saved = state.saved.has(e.id);
      chunk.push(`<article class="event" data-row="${esc(e.id)}"><div class="date-block"><strong>${day}</strong><small>${subDate}</small></div><div class="cell"><div class="event-title"><button class="event-name" data-open="${esc(e.id)}">${esc(e.title)}</button>${rankBadge(e)}</div><small>${e.year} · ${esc(fields[e.category] || e.category)}</small></div><div class="cell location-cell"><span class="place-text">${esc(e.place || '地点待公布')}</span><small>${esc(e.date || '会期待公布')}</small></div><div class="cell"><span class="deadline-text ${next && next.ts>Date.now() ? 'active-deadline':''}" ${next ? `data-relative="${next.ts}"` : ''}>${status}</span><small>${second} ${esc(shortDate)}</small></div><button class="save" data-save="${esc(e.id)}" aria-pressed="${saved}" aria-label="${saved?'取消收藏':'收藏'} ${esc(e.title)} ${e.year}">${icon('star')}</button></article>`);
    }
    finish();
    $('schedule').innerHTML = blocks.join('') || `<div class="empty">${state.favOnly ? '当前范围没有已收藏会议。点击日程中的星标即可收藏。' : '当前筛选范围没有匹配的会议。'} <button id="clear-filter">重置筛选</button></div>`;
    $('more').hidden = rows.length <= state.limit;
    $('more').textContent = `显示更多（剩余 ${Math.max(0,rows.length-state.limit)} 条）`;
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
      const color = p.hot ? '#c4ff71' : '#83d7c8';
      const title = p.name+' · '+p.events.length+' 场会议';
      const label = labelPoints.has(p.key);
      const leftward = labelPoints.get(p.key);
      svg.push(`<g transform="translate(${x} ${y})" data-city="${esc(p.key)}" class="map-pin" tabindex="0" role="button" aria-label="${esc(title)}"><title>${esc(title)}</title><circle r="${radius+5}" fill="transparent"/>${p.hot ? `<circle r="${radius+4}" fill="none" stroke="${color}" opacity=".6"/>` : ''}<circle class="dot" r="${radius}" fill="${color}" stroke="#173638" stroke-width="1.1"/>${label ? `<text x="${leftward?-9:9}" y="-6" text-anchor="${leftward?'end':'start'}" fill="${p.hot?'#ddffa4':'#e1f1ec'}" font-family="Arial,sans-serif" font-size="12.4" font-weight="650" paint-order="stroke" stroke="#172a35" stroke-width="2.8">${esc(p.name)}</text>`:''}</g>`);
    }
    $('markers').innerHTML=svg.join('');
    $('map-count').textContent=cityMap.size+' 个城市';
    $('unmapped').textContent=missing ? missing+' 场未标点' : '';
    $('unmapped').title='地点待定、线上举办或无法可靠定位的会议仍保留在日程中';
    $('city-pop').hidden=true; openCity=null;
    mapView();
  }
  function showCity(key) {
    const p=cityMap.get(key);
    if(!p)return;
    openCity=key;
    $('city-pop').innerHTML=`<div class="pop-title">${esc(p.name)} · ${p.events.length} 场<button id="pop-close" aria-label="关闭城市会议">${icon('close')}</button></div>${p.events.sort((a,b)=>dateKey(a).localeCompare(dateKey(b))||byName(a.title,b.title)).map(e=>`<button class="pop-event" data-open="${esc(e.id)}">${esc(e.title)} ${e.year}</button>`).join('')}`;
    $('city-pop').hidden=false;
    $('pop-close').focus({preventScroll:true});
  }
  function render() {
    lastNow=Date.now();
    rows=computeRows(); spotlight=makeSpotlight(lastNow);
    const unique=[...new Set(rows.map(r=>r.e))];
    $('title').textContent=state.favOnly?'我的收藏':'全球会议赛历';
    $('agenda-label').textContent=state.mode==='meet'?'赛季日程':'投稿日程';
    $('result-count').textContent=unique.length+' 场会议'+(state.mode==='deadline'?' · '+rows.length+' 个截稿节点':'');
    $('fav-count').textContent=state.saved.size;
    $('nav-fav').setAttribute('aria-pressed',state.favOnly);
    $('nav-all').setAttribute('aria-pressed',!state.favOnly);
    $('mode-meet').setAttribute('aria-pressed',state.mode==='meet');
    $('mode-deadline').setAttribute('aria-pressed',state.mode==='deadline');
    $('months').innerHTML=Array.from({length:13},(_,i)=>`<button data-month="${i}" aria-pressed="${i===state.month}">${i?i+' 月':'全年'}</button>`).join('');
    renderSpot();renderMap(unique);renderSchedule();
  }
  function showDetail(id) {
    const e=eventById.get(id);if (!e) return;
    const saved=state.saved.has(id);
    $('detail-content').innerHTML=`<div class="detail-top"><div>${rankBadge(e)} <span class="meta">${esc(fields[e.category]||e.category)}</span></div><button id="detail-close" autofocus aria-label="关闭会议详情">${icon('close')}</button></div><h2 id="detail-title" class="detail-name">${esc(e.title)} ${e.year}</h2><p class="detail-long">${esc(e.name)}</p><div class="detail-info"><div>${icon('calendar')}${esc(e.date||'会期待公布')}</div><div>${icon('pin')}${esc(e.place||'举办地点待公布')}</div></div><h3 class="detail-section-title">投稿时间线 <small>北京时间 UTC+8</small></h3><ul class="detail-timeline">${e.deadlines.length ? e.deadlines.map(d => `<li><div><strong>${typeName(d)}</strong>${d.note?`<small>${esc(d.note)}</small>`:''}</div><div>${Number.isFinite(d.ts)?esc(cst(d.ts)):'待公布'}<small>${esc(d.local||'')} ${esc(d.timezone||'')}</small></div></li>`).join('') : '<li>投稿时间待公布</li>'}</ul><div class="detail-actions">${validUrl(e.link)?`<a class="primary-btn" href="${esc(e.link)}" target="_blank" rel="noopener">会议官网 ${icon('link')}</a>`:''}<button class="secondary-btn" data-save="${esc(id)}" aria-pressed="${saved}">${icon('star')} ${saved?'已收藏':'收藏会议'}</button></div>`;
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
      case 'map-reset':zoom=1;center=[500,223];renderMap([...new Set(rows.map(r=>r.e))]);break;
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
  if(data.updatedAt && Number.isFinite(Date.parse(data.updatedAt))) $('updated').textContent='数据更新 '+cst(data.updatedAt).slice(0,10);
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
