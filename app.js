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
  const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const rankOrder = {A:1, B:2, C:3};
  const countLabel = (count, singular, plural = singular + 's') => `${count} ${count === 1 ? singular : plural}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const pad = n => String(n).padStart(2,'0');
  const cst = value => new Date(+new Date(value) + 8 * 3600000).toISOString().slice(0,16).replace('T',' ');
  const typeName = d => d.type === 'abstract' ? 'Abstract deadline' : 'Paper deadline';
  const kindLabel = d => d.type === 'abstract' ? 'Abstract' : 'Paper';
  const rankBadge = e => `<span class="badge ${esc(e.rank.toLowerCase())}">CCF ${esc(e.rank)}</span>`;
  const byName = (a,b) => a.localeCompare(b,'en',{numeric:true});
  const dateKey = e => e.start || '9999-12-31';
  const validUrl = url => /^https?:\/\//i.test(url || '');
  const cityKeyFor = p => p.lon.toFixed(2) + ',' + p.lat.toFixed(2);
  const monogramFor = title => {
    const clean = String(title || '').trim();
    if (clean.length <= 4) return clean.toUpperCase();
    const parts = clean.split(/[\s-]+/).filter(Boolean);
    if (parts.length > 1) return parts.map(p => p[0]).join('').slice(0, 4).toUpperCase();
    return clean.slice(0, 4).toUpperCase();
  };
  const brandForEvent = e => {
    const title = e.title.toUpperCase();
    return window.CCF_BRANDS?.[`ID:${e.id.toUpperCase()}`] || window.CCF_BRANDS?.[`${title}:${e.year}`] || window.CCF_BRANDS?.[title] || null;
  };
  const brandThumb = (e, size = '') => {
    const brand = brandForEvent(e);
    const cls = size ? ` ${size}` : '';
    const mono = esc(monogramFor(e.title));
    if (brand?.logo) {
      const bg = brand.background ? ` style="--logo-bg:${esc(brand.background)}"` : '';
      return `<span class="conf-logo-frame${cls}"${bg} aria-hidden="true"><img class="conf-logo-img" src="${esc(brand.logo)}" alt="" loading="lazy" decoding="async"><span class="conf-logo-mono" hidden>${mono}</span></span>`;
    }
    return `<span class="conf-logo-frame is-monogram${cls}" aria-hidden="true"><span class="conf-logo-mono">${mono}</span></span>`;
  };

  function readSaved() {
    try {
      const list = JSON.parse(localStorage.getItem('ccf-circuit.saved.v1') || '[]');
      return new Set(Array.isArray(list) ? list : []);
    } catch { return new Set(); }
  }
  function readTheme() {
    try { return localStorage.getItem('ccf-schedule.theme.v1') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
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
  const nextInitialDeadline = events.filter(e => e.rank === 'A')
    .flatMap(e => e.deadlines).filter(d => d.ts > initialNow).sort((a,b) => a.ts-b.ts)[0];
  const initialYear = nextInitialDeadline ? Number(cst(nextInitialDeadline.ts).slice(0,4)) : currentYear;
  const state = {
    year:initialYear, month:0, mode:'deadline', rank:'A', category:'', query:'',
    favOnly:false, hidePassed:false, sort:'date', tz:'UTC+8', theme:readTheme(), limit:32, saved:readSaved()
  };
  let rows = [], yearRows = [], spotlight = null, cityMap = new Map(), openCity = null;
  let zoom = 1, center = [500,223];
  let lastNow = Date.now();
  let globeView = null;
  const hasUnannouncedDeadline = e => !e.deadlines.length || e.deadlines.some(d => !Number.isFinite(d.ts));

  function formatTz(value, tz = state.tz) {
    const ms = +new Date(value);
    if (!Number.isFinite(ms)) return '';
    if (tz === 'AoE') return new Date(ms - 12 * 3600000).toISOString().slice(0,16).replace('T',' ');
    if (tz === 'LOCAL') {
      const d = new Date(ms);
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return cst(ms);
  }
  function tzLabel(tz = state.tz) {
    if (tz === 'LOCAL') {
      const offsetMin = -new Date().getTimezoneOffset();
      const sign = offsetMin >= 0 ? '+' : '-';
      const h = Math.floor(Math.abs(offsetMin) / 60);
      const m = Math.abs(offsetMin) % 60;
      return `Local (UTC${sign}${h}${m ? ':' + pad(m) : ''})`;
    }
    return tz;
  }
  function weekdayFor(isoDate) {
    if (!isoDate || isoDate.length < 10) return '';
    const d = new Date(`${isoDate}T12:00:00Z`);
    return Number.isFinite(d.getTime()) ? weekdays[d.getUTCDay()] : '';
  }
  function applyTheme(theme) {
    state.theme = theme === 'dark' ? 'dark' : 'light';
    if (state.theme === 'dark') document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    const btn = $('theme-toggle');
    if (btn) {
      const dark = state.theme === 'dark';
      btn.innerHTML = icon(dark ? 'sun' : 'moon');
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      btn.title = btn.getAttribute('aria-label');
    }
  }
  function populateYears() {
    const years = state.mode === 'meet' ? seasons : [...new Set(events.flatMap(e => [
      ...e.deadlines.filter(d => Number.isFinite(d.ts)).map(d => Number(cst(d.ts).slice(0,4))),
      ...(hasUnannouncedDeadline(e) ? [e.meetingYear] : [])
    ]))].sort((a,b) => b-a);
    if (!years.includes(state.year) && years.length) state.year = years.includes(currentYear) ? currentYear : years[0];
    $('year').innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    $('year').value = state.year;
  }
  function computeYearRows(now = Date.now()) {
    const q = normalize(state.query).trim().split(/\s+/).filter(Boolean);
    const items = [];
    for (const e of events) {
      if ((state.rank && e.rank !== state.rank) || (state.category && state.category !== e.category) ||
          (state.favOnly && !state.saved.has(e.id)) || !q.every(s => e.search.includes(s))) continue;
      if (state.mode === 'meet') {
        if (e.meetingYear !== state.year) continue;
        if (state.hidePassed && !nextDeadline(e, now) && !hasUnannouncedDeadline(e)) continue;
        items.push({e, date:e.start || '', d:null});
      } else {
        for (const d of e.deadlines) {
          if (!Number.isFinite(d.ts)) continue;
          if (state.hidePassed && d.ts <= now) continue;
          const dt = cst(d.ts);
          if (Number(dt.slice(0,4)) === state.year) items.push({e, date:dt.slice(0,10), d});
        }
        // Keep unannounced submissions visible under their conference year,
        // without assigning them an invented submission date or month.
        if (e.meetingYear === state.year && hasUnannouncedDeadline(e)) {
          items.push({e, date:'', d:null, undated:true});
        }
      }
    }
    return items.sort((a,b) => {
      if (state.sort === 'rank') return (rankOrder[a.e.rank]||9)-(rankOrder[b.e.rank]||9) || (a.date||'9999').localeCompare(b.date||'9999') || byName(a.e.title,b.e.title);
      if (state.sort === 'name') return byName(a.e.title,b.e.title) || (a.date||'9999').localeCompare(b.date||'9999');
      return (a.date || '9999').localeCompare(b.date || '9999') || (a.d?.ts || 0)-(b.d?.ts || 0) || byName(a.e.title,b.e.title);
    });
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
  function liveCountdown(ts, now = Date.now()) {
    if (ts <= now) return 'Closed';
    const [d, h, m, s] = delta(ts, now);
    const clock = `${pad(h)}:${pad(m)}:${pad(s)}`;
    return d ? `${d}d ${clock}` : clock;
  }
  function urgencyClass(ts, now = Date.now()) {
    if (!Number.isFinite(ts)) return 'urgency-tba';
    const diffDays = (ts - now) / 86400000;
    if (diffDays <= 0) return 'urgency-closed';
    if (diffDays <= 7) return 'urgency-urgent';
    if (diffDays <= 30) return 'urgency-soon';
    return 'urgency-calm';
  }
  function pendingSubmissions(now = Date.now()) {
    const entries = rows.filter(r => !r.undated).map(({e,d}) => ({e,d:d || nextDeadline(e,now)})).filter(s => s.d && s.d.ts > now);
    const unique = new Map(entries.map(s => [`${s.e.id}:${s.d.ts}:${s.d.type}`, s]));
    return [...unique.values()].sort((a,b) => a.d.ts-b.d.ts || byName(a.e.title,b.e.title));
  }
  function makeSpotlight(now) {
    return pendingSubmissions(now)[0] || null;
  }
  function renderActiveBar() {
    const chips = [];
    if (state.favOnly) chips.push({key:'favOnly', label:'Saved only'});
    if (state.rank) chips.push({key:'rank', label:`CCF ${state.rank}`});
    if (state.category) chips.push({key:'category', label:fields[state.category] || state.category});
    if (state.query.trim()) chips.push({key:'query', label:`Search: ${state.query.trim()}`});
    if (state.month) chips.push({key:'month', label:monthNames[state.month]});
    if (state.hidePassed) chips.push({key:'hidePassed', label:'Active only'});
    $('active-chips').innerHTML = chips.length
      ? chips.map(c => `<button class="filter-chip" data-clear-chip="${esc(c.key)}" aria-label="Remove ${esc(c.label)} filter">${esc(c.label)}${icon('close')}</button>`).join('') +
        `<button class="filter-reset-inline" id="inline-reset">${icon('reset')}Reset all</button>`
      : '<span class="active-empty-hint">Showing all conferences in this year</span>';
    $('toggle-passed').setAttribute('aria-pressed', String(state.hidePassed));
    $('sort-by').value = state.sort;
    $('tz-select').value = state.tz;
    $('spot-tz').textContent = state.tz === 'LOCAL' ? 'Local' : state.tz;
    $('upcoming-tz').textContent = state.tz === 'LOCAL' ? 'Local' : state.tz;
  }
  function renderUpcoming() {
    const upcoming = pendingSubmissions().slice(1,4);
    $('upcoming-list').innerHTML = upcoming.length ? upcoming.map(({e,d}) => {
      const cityKey = e.points.length ? cityKeyFor(e.points[0]) : '';
      return `<div class="upcoming-item-wrap"${cityKey ? ` data-hover-city="${esc(cityKey)}"` : ''}><button class="upcoming-item" data-open="${esc(e.id)}">${brandThumb(e, 'is-sm')}<span class="upcoming-item-body"><span class="upcoming-main"><strong>${esc(e.title)} <small>${e.year}</small></strong>${rankBadge(e)}</span><span class="upcoming-meta-row"><span class="upcoming-time">${kindLabel(d)} · ${esc(formatTz(d.ts).slice(5))}</span><span class="upcoming-relative ${urgencyClass(d.ts)}" data-relative="${d.ts}">${relative(d.ts)}</span></span></span></button>${cityKey ? `<button class="upcoming-locate" data-locate="${esc(cityKey)}" aria-label="Locate ${esc(e.title)} on globe" title="Locate on globe">${icon('focus')}</button>` : ''}</div>`;
    }).join('') : '<p class="upcoming-empty">No further deadlines match these filters.</p>';
  }
  function renderSpot() {
    $('focus-deadline').disabled = !spotlight?.e.points.length;
    $('focus-deadline').innerHTML = icon('focus') + (spotlight && !spotlight.e.points.length ? 'Location unavailable' : 'Locate on globe');
    $('spot-ics').hidden = !spotlight;
    if (spotlight) $('spot-ics').dataset.ics = spotlight.e.id;
    if (!spotlight) {
      $('spot-body').innerHTML = '<p class="small-empty"><b>No upcoming deadlines</b>No announced future deadlines match these filters.</p>';
      return;
    }
    const {e,d} = spotlight;
    $('spot-body').innerHTML = `<div class="spot-identity">${brandThumb(e)}<div class="spot-identity-text"><div class="spot-meta">${rankBadge(e)} <span>${esc(fields[e.category] || e.category)}</span></div><button data-open="${esc(e.id)}" class="spot-name">${esc(e.title)} <span>${e.year}</span></button><div class="spot-location">${icon('pin')} ${esc(e.place || 'Location TBA')}</div></div></div><div class="countdown" role="timer" aria-label="Time until submission deadline">${['Days','Hrs','Min','Sec'].map((s,i) => `<div><b id="tick-${i}">00</b><small>${s}</small></div>`).join('')}</div><div class="spot-when"><b>${typeName(d)}</b><span>${esc(formatTz(d.ts))} ${esc(state.tz === 'LOCAL' ? 'Local' : state.tz)}</span></div>`;
    renderClock();
  }
  function renderClock(now = Date.now()) {
    globeView?.updateCountdowns();
    if (spotlight) {
      delta(spotlight.d.ts, now).forEach((v,i) => { const el = $('tick-'+i); if (el) el.textContent = pad(v); });
    }
    document.querySelectorAll('[data-live-countdown]').forEach(el => {
      const ts = Number(el.dataset.liveCountdown);
      el.textContent = liveCountdown(ts, now);
    });
  }
  function renderMonths() {
    const counts = new Array(13).fill(0);
    counts[0] = yearRows.length;
    for (const r of yearRows) {
      const m = Number(r.date.slice(5,7)) || 0;
      if (m >= 1 && m <= 12) counts[m]++;
    }
    $('months').innerHTML = Array.from({length:13},(_,i)=>{
      const label = i ? monthNames[i].slice(0,3) : 'All year';
      const empty = i > 0 && counts[i] === 0;
      return `<button data-month="${i}" aria-pressed="${i===state.month}"${empty ? ' class="is-empty"' : ''}>${label}${counts[i] && i > 0 ? `<span class="m-count">${counts[i]}</span>` : ''}</button>`;
    }).join('');
  }
  function renderSchedule() {
    const blocks = [];
    const now = Date.now();
    const useDateGroups = state.sort === 'date';
    let group = null, chunk = [];
    function finish() {
      if (!chunk.length) return;
      if (!useDateGroups) {
        const heading = state.sort === 'rank' ? `CCF ${group}` : 'All matching conferences';
        blocks.push(`<div class="group-title"><b>${heading}</b><span>${countLabel(chunk.length, 'entry', 'entries')}</span></div><div class="rows">${chunk.join('')}</div>`);
      } else {
        const pendingDates = !group && state.mode === 'deadline';
        const label = group ? monthNames[group] : pendingDates ? 'Deadlines to be announced' : 'Dates to be announced';
        blocks.push(`<div class="group-title"><b>${label}</b><span>${group ? state.year : pendingDates ? state.year+' conference editions' : ''}</span></div><div class="rows">${chunk.join('')}</div>`);
      }
      chunk = [];
    }
    for (const {e,date,d,undated} of rows.slice(0,state.limit)) {
      const nextGroup = !useDateGroups ? (state.sort === 'rank' ? e.rank : 'all') : (Number(date.slice(5,7)) || 0);
      if (nextGroup !== group) { finish(); group = nextGroup; }
      const next = undated ? null : d || nextDeadline(e,now);
      const displayTime = d ? formatTz(d.ts) : '';
      const day = displayTime ? displayTime.slice(8,10) : date ? date.slice(8,10) : '—';
      const wk = displayTime ? weekdayFor(displayTime.slice(0,10)) : date ? weekdayFor(date) : '';
      const subDate = displayTime ? displayTime.slice(11) : (date && Number(date.slice(5,7)) ? monthNames[Number(date.slice(5,7))].slice(0,3) : 'TBA');
      const status = undated ? 'Deadline TBA' : next ? (next.ts > now ? liveCountdown(next.ts, now) : 'Closed') : deadlineStatus(e,now);
      const isClosed = !undated && (!next || next.ts <= now);
      const isLive = !undated && Boolean(next && next.ts > now);
      const urgency = undated ? 'urgency-tba' : next ? urgencyClass(next.ts, now) : 'urgency-closed';
      const kindPill = undated
        ? '<span class="kind-pill tba">TBA</span>'
        : d ? `<span class="kind-pill ${d.type}">${kindLabel(d)}</span>`
        : next ? `<span class="kind-pill ${next.type}">${kindLabel(next)}</span>`
        : '<span class="kind-pill tba">Status</span>';
      const noteText = d?.note ? `<span class="note-pill" title="${esc(d.note)}">${esc(d.note)}</span>` : '';
      const saved = state.saved.has(e.id);
      const nearest = !undated && e.id === spotlight?.e.id && (!d || d.ts === spotlight.d.ts);
      const cityKey = e.points.length ? cityKeyFor(e.points[0]) : '';
      chunk.push(`<article class="event${nearest ? ' is-next' : ''}${isClosed ? ' is-closed' : ''}" data-row="${esc(e.id)}"${cityKey ? ` data-hover-city="${esc(cityKey)}"` : ''}><div class="date-block"><span class="date-block-top"><strong>${day}</strong>${wk ? `<span class="weekday">${wk}</span>` : ''}</span><small>${subDate}</small></div><div class="identity-cell">${brandThumb(e, 'is-sm')}<div class="cell"><div class="event-title"><button class="event-name" data-open="${esc(e.id)}">${esc(e.title)}</button>${rankBadge(e)}</div><div class="event-submeta"><small>${e.year} · ${esc(fields[e.category] || e.category)}</small>${noteText}</div></div></div><div class="cell location-cell"><span class="place-text">${esc(e.place || 'Location TBA')}</span><small>${esc(e.date || 'Dates TBA')}</small></div><div class="cell deadline-cell"><span class="deadline-text ${isLive ? 'active-deadline is-live ' : ''}${urgency}" ${isLive ? `data-live-countdown="${next.ts}"` : next ? `data-relative="${next.ts}"` : ''}>${status}</span><div class="deadline-sub">${kindPill}${!d && next ? `<small>${esc(formatTz(next.ts).slice(5,16))}</small>` : ''}</div></div><div class="row-actions">${cityKey ? `<button class="row-btn is-desktop-only" data-locate="${esc(cityKey)}" aria-label="Locate ${esc(e.title)} on globe" title="Locate on globe">${icon('focus')}</button>` : ''}${validUrl(e.link) ? `<a class="row-btn is-desktop-only" href="${esc(e.link)}" target="_blank" rel="noopener" aria-label="Open ${esc(e.title)} website" title="Official website" data-ext="1">${icon('link')}</a>` : ''}<button class="save" data-save="${esc(e.id)}" aria-pressed="${saved}" aria-label="${saved?'Unsave':'Save'} ${esc(e.title)} ${e.year}">${icon('star')}</button></div></article>`);
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
        const key = cityKeyFor(p);
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
      const now = Date.now();
      const undated = new Set(rows.filter(r => r.undated || (state.mode === 'meet' && hasUnannouncedDeadline(r.e))).map(r => r.e));
      globeView.setLocations([...cityMap.values()].map(p => {
        const first = pending.find(({e}) => p.events.includes(e));
        const waiting = !first && p.events.find(e => undated.has(e));
        const ordered = !first && !waiting
          ? [...p.events].sort((a,b) => Number(hasUnannouncedDeadline(b))-Number(hasUnannouncedDeadline(a)) || b.year-a.year || dateKey(a).localeCompare(dateKey(b)) || byName(a.title,b.title))
          : [];
        const primary = ordered[0] || null;
        return {...p, lng:p.lon, hot:p.events.some(e => e.id === spotlight?.e.id),
          next:first ? {id:first.e.id,title:first.e.title,year:first.e.year,at:first.d.ts,type:first.d.type} : null,
          undated:waiting ? {id:waiting.id,title:waiting.title,year:waiting.year} : null,
          primary:primary ? {id:primary.id,title:primary.title,year:primary.year,status:deadlineStatus(primary, now)} : null};
      }));
      return;
    }
    const svg = [];
    const groups = [...cityMap.values()].map(p => ({...p,xy:geo.project(p.lon,p.lat),hot:p.events.some(e => e.id === spotlight?.e.id)}))
      .sort((a,b) => Number(b.hot)-Number(a.hot) || b.events.length-a.events.length || byName(a.name,b.name));
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
      const confSummary = p.events.slice(0, 3).map(e => `${e.title} ${e.year}`).join(', ') + (p.events.length > 3 ? ` +${p.events.length - 3} more` : '');
      const title = `${p.name} · ${confSummary}`;
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
    $('city-pop').innerHTML=`<div class="pop-title"><span>${esc(p.name)} · ${countLabel(p.events.length,'conference')}</span><button id="pop-close" aria-label="Close city conferences">${icon('close')}</button></div>${p.events.sort((a,b)=>dateKey(a).localeCompare(dateKey(b))||byName(a.title,b.title)).map(e=>{const next=pending.find(s=>s.e===e)?.d;const status=rows.some(r=>r.e===e&&r.undated)?'Deadline TBA':nextDeadline(e,Date.now())?'No upcoming deadlines in this range':deadlineStatus(e,Date.now());return `<button class="pop-event" data-open="${esc(e.id)}">${brandThumb(e, 'is-sm')}<span class="pop-event-body"><span class="pop-event-head"><strong>${esc(e.title)} ${e.year}</strong>${rankBadge(e)}</span><span class="pop-sub">${next?typeName(next)+' · '+relative(next.ts):status}</span></span></button>`;}).join('')}`;
    $('city-pop').hidden=false;
    $('pop-close').focus({preventScroll:true});
  }
  function render() {
    lastNow=Date.now();
    yearRows=computeYearRows(lastNow);
    rows=yearRows.filter(r => !state.month || Number(r.date.slice(5,7)) === state.month);
    spotlight=makeSpotlight(lastNow);
    const unique=[...new Set(rows.map(r=>r.e))];
    $('title').textContent=state.favOnly?'Saved conferences':'CCF-Schedule';
    $('agenda-label').textContent=state.mode==='meet'?'Conference schedule':'Submission deadlines';
    const undatedCount = rows.filter(r => r.undated).length;
    $('result-count').textContent=countLabel(unique.length,'conference')+(state.mode==='deadline'?' · '+countLabel(rows.length-undatedCount,'deadline')+(undatedCount?' · '+undatedCount+' TBA':''):'');
    $('fav-count').textContent=state.saved.size;
    $('nav-fav').setAttribute('aria-pressed',state.favOnly);
    $('nav-all').setAttribute('aria-pressed',!state.favOnly);
    $('mode-meet').setAttribute('aria-pressed',state.mode==='meet');
    $('mode-deadline').setAttribute('aria-pressed',state.mode==='deadline');
    renderActiveBar();
    renderMonths();
    renderSpot();renderUpcoming();renderMap(unique);renderSchedule();
  }
  function exportIcs(id) {
    const e = eventById.get(id);
    if (!e) return;
    const icsEsc = s => String(s || '').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
    const utcStamp = ms => new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const nowStamp = utcStamp(Date.now());
    const vevents = [];
    for (const d of e.deadlines) {
      if (!Number.isFinite(d.ts)) continue;
      vevents.push([
        'BEGIN:VEVENT',
        `UID:${e.id}-${d.type}-${d.round || 1}-${d.ts}@ccf-schedule`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${utcStamp(d.ts)}`,
        `DTEND:${utcStamp(d.ts + 3600000)}`,
        `SUMMARY:${icsEsc(`${e.title} ${e.year} — ${typeName(d)}`)}`,
        `DESCRIPTION:${icsEsc([e.name, d.note ? `Note: ${d.note}` : '', `Original: ${d.local || ''} ${d.timezone || ''}`, e.link || ''].filter(Boolean).join('\n'))}`,
        `LOCATION:${icsEsc(e.place || '')}`,
        'BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(`${e.title} ${e.year} ${typeName(d)} in 7 days`)}`, 'END:VALARM',
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(`${e.title} ${e.year} ${typeName(d)} tomorrow`)}`, 'END:VALARM',
        'END:VEVENT'
      ].join('\r\n'));
    }
    if (e.start) {
      const startCompact = e.start.replace(/-/g,'');
      const endDate = new Date((e.end || e.start) + 'T00:00:00Z');
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      const endCompact = endDate.toISOString().slice(0,10).replace(/-/g,'');
      vevents.push([
        'BEGIN:VEVENT',
        `UID:${e.id}-conf@ccf-schedule`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${startCompact}`,
        `DTEND;VALUE=DATE:${endCompact}`,
        `SUMMARY:${icsEsc(`${e.title} ${e.year}`)}`,
        `DESCRIPTION:${icsEsc([e.name, e.link || ''].filter(Boolean).join('\n'))}`,
        `LOCATION:${icsEsc(e.place || '')}`,
        'END:VEVENT'
      ].join('\r\n'));
    }
    if (!vevents.length) return;
    const payload = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CCF-Schedule//Calendar//EN','CALSCALE:GREGORIAN',...vevents,'END:VCALENDAR'].join('\r\n');
    const blob = new Blob([payload], {type:'text/calendar;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${e.id}.ics`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function showDetail(id) {
    const e=eventById.get(id);if (!e) return;
    const saved=state.saved.has(id);
    const now=Date.now();
    const nextD=nextDeadline(e, now);
    const brand=brandForEvent(e);
    const cityKey=e.points.length ? cityKeyFor(e.points[0]) : '';
    const hasCalendarData=e.deadlines.some(d => Number.isFinite(d.ts)) || Boolean(e.start);
    globeView?.stopRotation();
    $('detail-content').innerHTML=`<div class="detail-accent-bar"${brand?.color ? ` style="--detail-accent:${esc(brand.color)}"` : ''}></div><div class="detail-body"><div class="detail-top"><div class="meta">${rankBadge(e)} <span>${esc(fields[e.category]||e.category)}</span></div><button id="detail-close" autofocus aria-label="Close conference details">${icon('close')}</button></div><div class="detail-header-row">${brandThumb(e, 'is-lg')}<div><h2 id="detail-title" class="detail-name">${esc(e.title)} ${e.year}</h2><p class="detail-long">${esc(e.name)}</p></div></div><div class="detail-info"><div>${icon('calendar')}<span>${esc(e.date||'Dates TBA')}</span></div><div>${icon('pin')}<span>${esc(e.place||'Location TBA')}</span></div></div><h3 class="detail-section-title">Submission timeline <small>${esc(tzLabel())}</small></h3><ul class="detail-timeline">${e.deadlines.length ? e.deadlines.map(d => {
      const known = Number.isFinite(d.ts);
      const isNext = known && nextD && d.ts === nextD.ts && d.type === nextD.type;
      const cls = !known ? '' : isNext ? 'is-next' : d.ts > now ? 'is-future' : 'is-past';
      const formatted = known ? formatTz(d.ts) : 'To be announced';
      return `<li class="${cls}"><div><strong>${typeName(d)}</strong>${d.note?`<small>${esc(d.note)}</small>`:''}</div><div><span class="detail-time-line"><span>${esc(formatted)}</span>${known ? `<button class="copy-time-btn" data-copy="${esc(`${e.title} ${e.year} ${typeName(d)}: ${formatted} ${state.tz}`)}" aria-label="Copy deadline time" title="Copy deadline">${icon('copy')}</button>` : ''}</span><small>${known ? `${relative(d.ts, now)} · ` : ''}${esc(d.local||'')} ${esc(d.timezone||'')}</small></div></li>`;
    }).join('') : '<li>Submission dates to be announced</li>'}</ul><div class="detail-actions">${validUrl(e.link)?`<a class="primary-btn" href="${esc(e.link)}" target="_blank" rel="noopener">Conference website ${icon('link')}</a>`:''}<button class="secondary-btn" data-save="${esc(id)}" aria-pressed="${saved}">${icon('star')} ${saved?'Saved':'Save conference'}</button>${hasCalendarData ? `<button class="secondary-btn" data-ics="${esc(id)}">${icon('calendar-plus')} Calendar</button>` : ''}${cityKey ? `<button class="secondary-btn" data-locate-detail="${esc(cityKey)}">${icon('focus')} Locate</button>` : ''}</div></div>`;
    if (!$('detail').open) $('detail').showModal();
  }
  function toggleSave(id) {
    if (state.saved.has(id)) state.saved.delete(id);else state.saved.add(id);
    try {localStorage.setItem('ccf-circuit.saved.v1',JSON.stringify([...state.saved]));} catch{}
    render();
    if ($('detail').open) showDetail(id);
  }
  function resetFilters() {
    Object.assign(state,{rank:'',category:'',query:'',month:0,hidePassed:false,limit:32});
    $('rank').value='';$('category').value='';$('search').value='';
  }
  function focusCityOnMap(key) {
    if (globeView?.available) {
      globeView.focusCity(key);
      $('map-stage').scrollIntoView({behavior:'smooth', block:'nearest'});
      return;
    }
    const p = cityMap.get(key);
    if (p) {
      center = geo.project(p.lon, p.lat);
      zoom = Math.max(zoom, 2.2);
      renderMap([...new Set(rows.map(r => r.e))]);
      showCity(key);
    }
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
    if (el.closest('[data-ext]')) return;
    const action=el.closest('[data-save],[data-ics],[data-copy],[data-locate],[data-locate-detail],[data-clear-chip],[data-open],[data-city],[data-month],[data-row],button');
    if(!action) return;
    if(action.hasAttribute('data-save')) return toggleSave(action.dataset.save);
    if(action.hasAttribute('data-ics')) return exportIcs(action.dataset.ics);
    if(action.hasAttribute('data-copy')) {
      const text = action.dataset.copy;
      navigator.clipboard?.writeText(text).catch(()=>{});
      action.innerHTML = icon('check');
      setTimeout(() => { if (action.isConnected) action.innerHTML = icon('copy'); }, 1400);
      return;
    }
    if(action.hasAttribute('data-locate')) return focusCityOnMap(action.dataset.locate);
    if(action.hasAttribute('data-locate-detail')) {
      const key = action.dataset.locateDetail;
      if ($('detail').open) $('detail').close();
      focusCityOnMap(key);
      return;
    }
    if(action.hasAttribute('data-clear-chip')) {
      const key = action.dataset.clearChip;
      if (key === 'favOnly') state.favOnly = false;
      else if (key === 'rank') { state.rank = ''; $('rank').value = ''; }
      else if (key === 'category') { state.category = ''; $('category').value = ''; }
      else if (key === 'query') { state.query = ''; $('search').value = ''; }
      else if (key === 'month') state.month = 0;
      else if (key === 'hidePassed') state.hidePassed = false;
      state.limit = 32;
      render();
      return;
    }
    if(action.hasAttribute('data-open')) return showDetail(action.dataset.open);
    if(action.hasAttribute('data-row')) return showDetail(action.dataset.row);
    if(action.hasAttribute('data-city')) {if(!suppressClick)showCity(action.dataset.city);return;}
    if(action.hasAttribute('data-month')){
      state.month=Number(action.dataset.month);state.limit=32;render();
      const activeMonth = $('months').querySelector(`[data-month="${state.month}"]`);
      activeMonth?.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
      return;
    }
    switch(action.id){
      case 'detail-close':$('detail').close();break;
      case 'pop-close':$('city-pop').hidden=true;openCity=null;break;
      case 'zoom-in':zoomBy(1.65);break;
      case 'zoom-out':zoomBy(1/1.65);break;
      case 'map-reset':if(globeView?.available){globeView.reset();break;}zoom=1;center=[500,223];renderMap([...new Set(rows.map(r=>r.e))]);break;
      case 'globe-motion':globeView?.toggleRotation();break;
      case 'focus-deadline':if(globeView?.available)globeView.focusNearest();else if(spotlight?.e.points.length){const p=spotlight.e.points[0];showCity(cityKeyFor(p));zoomBy(2);}break;
      case 'nav-all':case 'nav-fav':state.favOnly=action.id==='nav-fav';resetFilters();render();break;
      case 'mode-meet':case 'mode-deadline':state.mode=action.id==='mode-meet'?'meet':'deadline';state.month=0;state.limit=32;populateYears();render();break;
      case 'clear-filter':case 'inline-reset':state.favOnly=false;resetFilters();render();break;
      case 'toggle-passed':state.hidePassed=!state.hidePassed;state.limit=32;render();break;
      case 'theme-toggle':
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
        try { localStorage.setItem('ccf-schedule.theme.v1', state.theme); } catch {}
        break;
      case 'more':state.limit+=40;renderSchedule();break;
    }
  });

  // Fallback to crisp monogram if any local conference logo fails to load.
  document.addEventListener('error', evt => {
    const img = evt.target;
    if (img instanceof HTMLImageElement && img.classList.contains('conf-logo-img')) {
      img.hidden = true;
      if (img.nextElementSibling) img.nextElementSibling.hidden = false;
      img.parentElement?.classList.add('is-monogram');
    }
  }, true);

  // Bidirectional hover highlight between schedule/upcoming rows and globe markers.
  let hoveredRowCity = null;
  document.addEventListener('pointerover', evt => {
    const target = evt.target.closest?.('[data-hover-city]');
    const key = target ? target.dataset.hoverCity : null;
    if (key !== hoveredRowCity) {
      hoveredRowCity = key;
      globeView?.highlightCity(key);
    }
  });
  document.addEventListener('pointerleave', () => {
    if (hoveredRowCity) {
      hoveredRowCity = null;
      globeView?.highlightCity(null);
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
  $('sort-by').addEventListener('change',()=>{state.sort=$('sort-by').value;state.limit=32;render();});
  $('tz-select').addEventListener('change',()=>{state.tz=$('tz-select').value;render();if($('detail').open){const openBtn=$('detail-content').querySelector('[data-save]');if(openBtn)showDetail(openBtn.dataset.save);}});
  $('category').insertAdjacentHTML('beforeend',Object.entries(fields).map(([key,name])=>`<option value="${key}">${name}</option>`).join(''));
  $('rank').value=state.rank;
  $('category').value=state.category;
  applyTheme(state.theme);
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
    const expiredLive = [...document.querySelectorAll('[data-live-countdown]')].some(el => Number(el.dataset.liveCountdown) <= now);
    if((spotlight && spotlight.d.ts<=now) || expiredLive){render();return;}
    renderClock(now);
    if(Math.floor(now/60000)!==Math.floor(lastNow/60000)){
      document.querySelectorAll('[data-relative]').forEach(el=>{el.textContent=relative(Number(el.dataset.relative),now);});
      lastNow=now;
    }
  },1000);
})();
