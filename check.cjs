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
  const http = require('node:http');
  const path = require('node:path');
  const os = require('node:os');
  const {spawn} = require('node:child_process');
  const root = process.cwd();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ccf-browser-'));
  // Capture the public adapter in the test document, without shipping a test hook.
  const capture = () => Object.defineProperty(window, 'CCFGlobe', {
    configurable: true,
    set(Adapter) {
      Object.defineProperty(window, 'CCFGlobe', {value: class extends Adapter {
        constructor(...args) { super(...args); window.__qaGlobe = this; }
      }});
    }
  });
  const probe = async () => {
    const get = id => document.getElementById(id);
    const verify = (test, message) => { if (!test) throw new Error(message); };
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const until = async (test, message) => {
      for (let i = 0; i < 100; i++) { if (test()) return; await sleep(100); }
      throw new Error(message);
    };
    const change = (id, value) => {
      get(id).value = value;
      get(id).dispatchEvent(new Event(id === 'search' ? 'input' : 'change', {bubbles: true}));
    };
    try {
      await until(() => window.__qaGlobe?.available, 'WebGL globe did not initialize');
      const globe = window.__qaGlobe.globe;
      verify(globe.renderer().getContext() instanceof WebGL2RenderingContext, 'Expected a real WebGL2 renderer');
      await until(() => globe.globeMaterial().map?.image?.width > 0, 'Earth texture did not load');
      verify(globe.pointsData().length > 0, 'No conference locations on the globe');
      verify(get('year').options.length > 1, 'Missing season options');
      window.__qaGlobe.stopRotation();
      const location = globe.pointsData().find(p => p.hot) || globe.pointsData()[0];
      globe.onPointClick()(location);
      verify(!get('city-pop').hidden, 'City selection failed');
      get('city-pop').querySelector('[data-open]').click();
      verify(get('detail').open, 'City-to-detail failed');
      get('detail-close').click();
      const before = globe.pointOfView().altitude;
      get('zoom-in').click();
      await sleep(600);
      verify(globe.pointOfView().altitude < before, 'Globe zoom did not change perspective');
      get('map-reset').click();
      change('rank', 'A');
      const badges = [...document.querySelectorAll('.rows .badge')];
      verify(badges.length > 0 && badges.every(b => b.textContent === 'CCF A'), 'Rank filter failed');
      change('rank', '');
      const entry = document.querySelector('.event-name');
      verify(entry, 'No agenda rows');
      change('search', entry.textContent);
      verify(document.querySelector('.event-name'), 'Search returned no matching row');
      document.querySelector('[data-save]').click();
      get('nav-fav').click();
      verify(document.querySelectorAll('.event').length === 1, 'Favorite isolation failed');
      get('nav-all').click();
      get('mode-deadline').click();
      verify(get('agenda-label').textContent === '投稿日程', 'Deadline mode failed');
      change('year', String(new Date().getFullYear()));
      verify(document.querySelector('.event'), 'No deadline rows in current year');
      change('search', 'no-such-conference-zzz');
      verify(get('clear-filter'), 'Empty search state failed');
      verify(globe.pointsData().length === 0, 'Empty filter left stale globe locations');
      get('clear-filter').click();
      verify(document.querySelector('.event'), 'Reset failed');
      document.body.dataset.smoke = 'passed';
    } catch (error) {
      document.body.dataset.smoke = 'failed';
      document.body.dataset.failure = String(error.message);
    }
  };
  const testHtml = html.replace('<head>', '<head><script>(' + capture.toString() + ')()</script>')
    .replace('</body>', '<script>(' + probe.toString() + ')()</script></body>');
  const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.woff2':'font/woff2'};
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/' || pathname === '/index.html') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(testHtml); return; }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  (async () => {
    let child;
    let timer;
    try {
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
      const result = await new Promise((resolve, reject) => {
        child = spawn(process.env.CHROME_BIN || 'google-chrome', [
          '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
          '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
          '--user-data-dir=' + profile, '--virtual-time-budget=18000', '--dump-dom',
          'http://127.0.0.1:' + server.address().port + '/'
        ]);
        let stdout = '', stderr = '';
        child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.once('error', reject);
        child.once('close', code => resolve({code, stdout, stderr}));
        timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Browser smoke test timed out')); }, 90000);
      });
      assert.equal(result.code, 0, result.stderr.slice(-2000));
      assert(result.stdout.includes('data-smoke="passed"'), result.stdout.match(/data-failure="([^"]*)"/)?.[1] || 'Browser did not complete checks: ' + result.stderr.slice(-1500));
      console.log('Passed WebGL2 globe, texture, zoom, location details, filters, favorites and submission calendar checks.');
    } finally {
      clearTimeout(timer);
      if (child && child.exitCode === null) child.kill('SIGKILL');
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      fs.rmSync(profile, {recursive: true, force: true});
    }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
