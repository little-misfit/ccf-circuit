'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const window = {};
const context = {window, Intl, Date};
for (const file of ['conferences.js','venues.js','conference-brands.js']) {
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
assert(window.CCF_BRANDS?.ACL && window.CCF_BRANDS?.ICML, 'Missing default conference branding');
for (const [title, brand] of Object.entries(window.CCF_BRANDS)) {
  assert(/^\.\/assets\/conferences\//.test(brand.logo), 'Conference logo must be local: '+title);
  assert(fs.existsSync(brand.logo.split(/[?#]/)[0]), 'Missing conference logo: '+title);
  assert(/^#[0-9a-f]{6}$/i.test(brand.color), 'Invalid conference brand color: '+title);
}
const html = fs.readFileSync('index.html','utf8');
for (const [,path] of html.matchAll(/(?:href|src)="\.\/([^"]+)"/g)) {
  assert(fs.existsSync(path.split(/[?#]/)[0]),'Missing local asset '+path);
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
      verify(document.documentElement.lang === 'en', 'Document language must be English');
      verify(document.querySelector('.brand').textContent.trim() === 'CCF-Schedule', 'Unexpected site branding');
      verify(!/[\u3400-\u4dbf\u4e00-\u9fff]/u.test(document.body.innerText), 'Unexpected Chinese interface text');
      verify(get('mode-deadline').getAttribute('aria-pressed') === 'true', 'Submission deadlines must be the default mode');
      const futureAI = window.CCF_DATA.events.filter(e => e.rank === 'A' && e.category === 'AI')
        .flatMap(e => e.deadlines.map(d => Date.parse(d.at))).filter(at => at > Date.now());
      const currentYear = new Date(Date.now() + 8 * 3600000).getUTCFullYear();
      const preferredYear = new Date((futureAI.length ? Math.min(...futureAI) : Date.now()) + 8 * 3600000).getUTCFullYear();
      const availableYears = [...get('year').options].map(option => Number(option.value));
      const defaultYear = availableYears.includes(preferredYear) ? preferredYear : availableYears.includes(currentYear) ? currentYear : availableYears[0];
      verify(get('year').value === String(defaultYear), 'Default year must contain the next AI CCF A deadline');
      verify(get('rank').value === 'A' && get('category').value === 'AI', 'Initial filters must be CCF A and Artificial Intelligence');
      const hot = document.querySelector('.globe-tag.hot');
      if (hot) {
        const next = window.__qaGlobe.locations.find(point => point.hot)?.next;
        const title = next?.title.toUpperCase();
        const brand = window.CCF_BRANDS[`ID:${next?.id.toUpperCase()}`] || window.CCF_BRANDS[`${title}:${next?.year}`] || window.CCF_BRANDS[title];
        if (brand?.logo) {
          const logo = hot.querySelector('.globe-tag-logo');
          verify(logo && logo.src === new URL(brand.logo, document.baseURI).href, 'Expected the registered conference logo');
          await until(() => logo.complete && logo.naturalWidth > 0, 'Conference logo did not load');
        } else {
          const monogram = hot.querySelector('.globe-tag-monogram');
          verify(monogram && !monogram.hidden && monogram.textContent.trim(), 'Unregistered conference needs a monogram');
        }
        verify(parseFloat(getComputedStyle(hot.querySelector('.globe-countdown')).fontSize) >= 22, 'Floating countdown is too small');
      }
      const iccv = window.CCF_DATA.events.find(e => e.id === 'iccv27');
      if (iccv?.deadlines.some(d => !d.at)) {
        change('year', '2027');
        change('search', 'ICCV');
        verify(document.querySelector('[data-row="iccv27"]')?.textContent.includes('Deadline TBA'), 'ICCV with an unknown deadline disappeared');
        await until(() => document.querySelector('.globe-tag[data-open="iccv27"]:not([hidden])'), 'Undated ICCV did not appear on the globe');
        verify(!document.querySelector('.globe-tag.hot') && !document.querySelector('.spot-name'), 'Unknown deadline received a false countdown highlight');
        document.querySelector('.globe-tag[data-open="iccv27"]').click();
        verify(get('detail').open && get('detail-content').textContent.includes('To be announced'), 'Undated conference detail failed');
        get('detail-close').click();
        change('search', '');
        change('year', String(defaultYear));
      }
      change('rank', '');
      change('category', '');
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
      get('mode-meet').click();
      verify(get('agenda-label').textContent === 'Conference schedule', 'Conference date mode failed');
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
      verify(get('agenda-label').textContent === 'Submission deadlines', 'Deadline mode failed');
      const testYear = [...get('year').options].some(option => Number(option.value) === currentYear) ? currentYear : get('year').value;
      change('year', String(testYear));
      verify(document.querySelector('.event'), 'No deadline rows in an available year');
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
  const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2'};
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
