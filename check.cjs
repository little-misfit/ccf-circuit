'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const window = {};
const context = {window, Intl, Date};
for (const file of ['conferences.js','venues.js']) {
  vm.runInNewContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const {events} = window.CCF_DATA;
assert(events.length > 100,'Expected the full CCFDDL snapshot');
assert.equal(new Set(events.map(e => e.id)).size,events.length,'Edition IDs must be unique');
assert.equal(new Set(events.map(e => e.rank)).size,3);
for (const e of events) {
  assert(e.title && e.id && /^[ABC]$/.test(e.rank));
  assert(Number.isInteger(+e.year));
  for (const d of e.deadlines) {
    assert(['paper','abstract'].includes(d.type));
    assert(!d.at || Number.isFinite(Date.parse(d.at)));
  }
  for (const p of window.CCF_GEO.lookup(e.place || '')) {
    assert(Number.isFinite(p.lat) && Number.isFinite(p.lon));
    assert(Math.abs(p.lat)<=90 && Math.abs(p.lon)<=180);
  }
}
const html = fs.readFileSync('index.html','utf8');
for (const [,path] of html.matchAll(/(?:href|src)="\.\/([^"]+)"/g)) {
  assert(fs.existsSync(path),'Missing local asset '+path);
}
console.log('Validated '+events.length+' meeting editions.');

if (process.argv.includes('--browser')) {
  const os = require('node:os');
  const path = require('node:path');
  const {pathToFileURL} = require('node:url');
  const {spawnSync} = require('node:child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'ccf-browser-'));
  const probe = () => {
    const get = id => document.getElementById(id);
    const verify = (test, message) => { if (!test) throw new Error(message); };
    const change = (id,value) => {
      get(id).value = value;
      get(id).dispatchEvent(new Event(id === 'search' ? 'input':'change',{bubbles:true}));
    };
    try {
      verify(get('year').options.length > 1,'Missing season options');
      const pin = document.querySelector('[data-city]');
      verify(pin,'No plotted cities');
      pin.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      verify(!get('city-pop').hidden,'City selection failed');
      get('city-pop').querySelector('[data-open]').click();
      verify(get('detail').open,'Map-to-detail failed');
      get('detail-close').click();
      get('zoom-in').click();
      verify(!get('zoom-out').disabled,'Map zoom failed');
      get('map-reset').click();
      change('rank','A');
      verify([...document.querySelectorAll('.rows .badge')].every(b=>b.textContent==='CCF A'),'Rank filter failed');
      change('rank','');
      let entry=document.querySelector('.event-name');
      verify(entry,'No agenda rows');
      const title=entry.textContent;
      change('search',title);
      verify(document.querySelector('.event-name'),'Search returned no matching row');
      document.querySelector('[data-save]').click();
      get('nav-fav').click();
      verify(document.querySelectorAll('.event').length===1,'Favorite isolation failed');
      get('nav-all').click();
      get('mode-deadline').click();
      verify(get('agenda-label').textContent==='投稿日程','Deadline mode failed');
      change('year',String(new Date().getFullYear()));
      verify(document.querySelector('.event'),'No deadline rows in current year');
      change('search','no-such-conference-zzz');
      verify(get('clear-filter'),'Empty search state failed');
      get('clear-filter').click();
      verify(document.querySelector('.event'),'Reset failed');
      document.body.dataset.smoke='passed';
    } catch (error) {
      document.body.dataset.smoke='failed';
      document.body.dataset.failure=String(error.message);
    }
  };
  try {
    for(const filename of ['style.css','app.js','conferences.js','venues.js','world.svg']) {
      fs.copyFileSync(filename,path.join(tmp,filename));
    }
    fs.writeFileSync(path.join(tmp,'index.html'),html.replace('</body>','<script>('+probe.toString()+')()</script></body>'));
    const result=spawnSync('google-chrome',['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--user-data-dir='+path.join(tmp,'profile'),'--dump-dom',pathToFileURL(path.join(tmp,'index.html')).href],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:60000});
    assert(!result.error,String(result.error));
    assert(result.stdout.includes('data-smoke="passed"'),result.stdout.match(/data-failure="([^"]*)"/)?.[1] || result.stderr.slice(-2000));
    console.log('Passed browser checks for filtered agendas, favorites, maps, and deadlines.');
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
}
