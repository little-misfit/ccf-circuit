#!/usr/bin/env python3
"""Behavioral QA for the geographic calendar using a real WebGL2 browser."""
import argparse
from datetime import datetime, timezone, timedelta
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CAPTURE = """Object.defineProperty(window,'CCFGlobe',{configurable:true,set(Adapter){
  Object.defineProperty(window,'CCFGlobe',{value:class extends Adapter{
    constructor(...args){super(...args);window.__qaGlobe=this;}
  }});
}});"""


def expected_nearest(events, year, now, rank='', category='', mode='meet', month=0):
    candidates = []
    for event in events:
        if rank and event['rank'] != rank or category and event['category'] != category:
            continue
        start = event.get('start') or ''
        if mode == 'meet':
            if int(start[:4] or event['year']) != year:
                continue
            if month and (not start or int(start[5:7]) != month):
                continue
        for deadline in event['deadlines']:
            if not deadline.get('at'):
                continue
            instant = datetime.fromisoformat(deadline['at'].replace('Z', '+00:00'))
            if instant.timestamp() * 1000 <= now:
                continue
            local = instant.astimezone(timezone(timedelta(hours=8)))
            if mode == 'deadline' and (local.year != year or month and local.month != month):
                continue
            candidates.append((instant, event['title'], event['id']))
    return sorted(candidates)[0][2] if candidates else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8769/')
    parser.add_argument('--browser', default=os.environ.get('CHROME_BIN'))
    args = parser.parse_args()
    report = {'checks': [], 'errors': [], 'httpErrors': []}
    output = ROOT / 'preview'
    output.mkdir(exist_ok=True)

    def check(name, passed, details=None):
        report['checks'].append({'name': name, 'pass': bool(passed), 'details': details})
        if not passed:
            print('FAIL:', name, details, flush=True)

    def ready(page):
        page.wait_for_function("window.__qaGlobe?.available && window.__qaGlobe.globe.globeMaterial().map?.image?.width>0")
        page.wait_for_function("document.querySelector('#schedule .event')")
        page.wait_for_timeout(1000)

    def pause(page):
        page.evaluate('window.__qaGlobe.stopRotation()')
        page.mouse.move(0, 0)

    def nearest(page, label):
        snapshot = page.evaluate("({events:CCF_DATA.events,year:Number(document.querySelector('#year').value),now:Date.now(),rank:document.querySelector('#rank').value,category:document.querySelector('#category').value,mode:document.querySelector('#mode-deadline').getAttribute('aria-pressed')==='true'?'deadline':'meet',month:Number(document.querySelector('#months [aria-pressed=true]').dataset.month)})")
        if page.locator('#nav-fav').get_attribute('aria-pressed') == 'true':
            saved = page.evaluate("JSON.parse(localStorage.getItem('ccf-circuit.saved.v1') || '[]')")
            snapshot['events'] = [event for event in snapshot['events'] if event['id'] in saved]
        expected = expected_nearest(**snapshot)
        actual = page.locator('.spot-name').get_attribute('data-open') if page.locator('.spot-name').count() else None
        marked = page.evaluate("__qaGlobe.locations.filter(p=>p.hot).map(p=>p.next?.id)")
        has_location = bool([e for e in snapshot['events'] if e['id'] == expected and page.evaluate('(place)=>CCF_GEO.lookup(place).length', e.get('place') or '')])
        check(label, actual == expected and (not has_location or bool(marked) and all(v == expected for v in marked)), {'expected': expected, 'actual': actual, 'marked': marked})

    with sync_playwright() as pw:
        options = {'args': ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}
        if args.browser:
            options['executable_path'] = args.browser
        browser = pw.chromium.launch(**options)
        context = browser.new_context(viewport={'width': 1440, 'height': 1050})
        context.add_init_script(CAPTURE)
        page = context.new_page()
        page.on('pageerror', lambda error: report['errors'].append(str(error)))
        page.on('response', lambda response: report['httpErrors'].append({'url': response.url, 'status': response.status}) if response.status >= 400 else None)
        page.goto(args.url, wait_until='networkidle')
        ready(page)
        pause(page)
        check('actual WebGL2 globe and locally loaded Earth texture', page.evaluate("__qaGlobe.globe.renderer().getContext() instanceof WebGL2RenderingContext && __qaGlobe.globe.globeMaterial().map.image.naturalWidth>=1024"))
        check('conference locations are actual sphere meshes', page.evaluate("__qaGlobe.globe.pointsData().length>0 && __qaGlobe.globe.scene().children.length>0"))
        nearest(page, 'nearest future deadline is highlighted initially')
        timer = page.locator('.globe-tag.hot .globe-countdown').first
        previous = timer.text_content()
        page.wait_for_timeout(1250)
        check('floating deadline counts down in real time', timer.text_content() != previous)
        page.locator('#globe-motion').click()
        page.mouse.move(0, 0)
        before = page.evaluate('__qaGlobe.globe.pointOfView().lng')
        page.wait_for_timeout(700)
        after = page.evaluate('__qaGlobe.globe.pointOfView().lng')
        check('play button resumes rotation after the pointer leaves', abs(after - before) > .01 and page.evaluate('__qaGlobe.playing'))
        pause(page)

        # User input must change the camera, not only a decorative CSS transform.
        bounds = page.locator('#globe canvas').bounding_box()
        before = page.evaluate('__qaGlobe.globe.pointOfView()')
        x, y = bounds['x'] + bounds['width'] * .48, bounds['y'] + bounds['height'] * .65
        page.mouse.move(x, y); page.mouse.down(); page.mouse.move(x + 120, y + 35, steps=12); page.mouse.up()
        page.wait_for_timeout(600)
        after = page.evaluate('__qaGlobe.globe.pointOfView()')
        check('dragging rotates the 3D geographic camera', abs(after['lng'] - before['lng']) > 5, {'before': before, 'after': after})
        before = after
        page.locator('#zoom-in').click(); page.wait_for_timeout(500)
        after = page.evaluate('__qaGlobe.globe.pointOfView()')
        check('zoom control changes the camera altitude', after['altitude'] < before['altitude'])
        page.locator('#globe').focus(); before = page.evaluate('__qaGlobe.globe.pointOfView()')
        page.keyboard.press('ArrowRight'); page.wait_for_timeout(400)
        after = page.evaluate('__qaGlobe.globe.pointOfView()')
        check('keyboard arrows rotate the globe', abs(after['lng'] - before['lng']) > 5)
        page.locator('#focus-deadline').click(); page.wait_for_timeout(1000)
        check('focus-nearest returns the selected deadline to the visible hemisphere', page.locator('.globe-tag.hot:not([hidden])').count() > 0)
        backside = page.evaluate("""() => {
          const g=__qaGlobe, c=g.globe.camera().position;
          const back=g.locations.filter(p=>{const v=g.globe.getCoords(p.lat,p.lng);return v.x*c.x+v.y*c.y+v.z*c.z<0;});
          return {count:back.length,hidden:back.every(p=>g.labels.get(p.key).button.hidden)};
        }""")
        check('far-side deadline cards are hidden by the Earth', backside['count'] > 0 and backside['hidden'], backside)

        # Real click on the highlighted surface marker opens its city collection.
        coordinates = page.evaluate("""() => {const g=__qaGlobe,p=g.locations.find(p=>p.hot);return g.globe.getScreenCoords(p.lat,p.lng,.035)}""")
        bounds = page.locator('#globe canvas').bounding_box()
        page.mouse.click(bounds['x'] + coordinates['x'], bounds['y'] + coordinates['y'])
        page.wait_for_timeout(250)
        check('surface marker opens its city conferences', page.locator('#city-pop').is_visible())
        if page.locator('#city-pop').is_visible():
            page.locator('#city-pop [data-open]').first.click()
            check('city conference opens complete deadline details', page.locator('#detail').is_visible() and page.locator('.detail-timeline li').count() > 0)
            page.keyboard.press('Escape')
        else:
            check('city conference opens complete deadline details', False)
        page.locator('.globe-tag.hot:not([hidden])').first.click()
        check('floating countdown opens its conference details', page.locator('#detail').is_visible())
        page.keyboard.press('Escape')

        page.locator('#rank').select_option('A'); page.wait_for_timeout(1100)
        nearest(page, 'nearest highlight follows CCF rank filter')
        page.locator('#category').select_option('AI'); page.wait_for_timeout(1000)
        nearest(page, 'nearest highlight follows subject filter')
        page.locator('#rank').select_option(''); page.locator('#category').select_option('')
        page.locator('#year').select_option('2026'); page.wait_for_timeout(1000)
        nearest(page, 'nearest highlight follows selected meeting year')
        page.locator('#mode-deadline').click(); page.wait_for_timeout(1000)
        nearest(page, 'nearest highlight follows submission-year scope')
        page.locator('#months [data-month="11"]').click(); page.wait_for_timeout(1000)
        nearest(page, 'nearest highlight follows submission-month scope')
        page.locator('#months [data-month="0"]').click(); page.locator('#mode-meet').click()
        page.locator('#search').fill('no-conference-has-this-name')
        check('empty filters clear globe markers, labels and nearest deadline', page.evaluate("__qaGlobe.locations.length===0 && document.querySelectorAll('.globe-tag').length===0 && !document.querySelector('.spot-name')"))
        page.locator('#clear-filter').click(); page.wait_for_timeout(1000)
        page.locator('#schedule [data-save]').first.click(); page.locator('#nav-fav').click()
        check('favorites isolate the agenda and globe', page.locator('#schedule .event').count() == 1 and page.evaluate('__qaGlobe.locations.every(p=>p.events.length===1)'))
        nearest(page, 'nearest highlight follows saved conference scope')
        page.reload(wait_until='networkidle'); ready(page); pause(page)
        check('favorites persist after reload', page.locator('#fav-count').text_content() == '1')

        for width in [1440, 768, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 1050 if width > 760 else 844})
            page.locator('#focus-deadline').click(); page.wait_for_timeout(1200)
            boxes = page.locator('.globe-tag:not([hidden])').evaluate_all("es=>es.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}})")
            overlap = any(a['left'] < b['right'] and a['right'] > b['left'] and a['top'] < b['bottom'] and a['bottom'] > b['top'] for i, a in enumerate(boxes) for b in boxes[i+1:])
            stage = page.locator('#map-stage').bounding_box()
            fits = all(b['left'] >= stage['x'] - 1 and b['right'] <= stage['x'] + stage['width'] + 1 and b['top'] >= stage['y'] - 1 and b['bottom'] <= stage['y'] + stage['height'] + 1 for b in boxes)
            check(f'{width}px: no page overflow or overlapping floating cards', not page.evaluate('document.documentElement.scrollWidth>innerWidth') and not overlap and fits, boxes)
            check(f'{width}px: nearest deadline remains visible and readable', page.locator('.globe-tag.hot:not([hidden])').count() > 0)
            if width in [1440, 390]:
                page.evaluate("scrollTo({top:0,behavior:'instant'})")
                page.screenshot(path=str(output / f'globe-qa-{width}.png'), full_page=True)
        page.evaluate('__qaGlobe.globe.renderer().forceContextLoss()')
        page.wait_for_function("document.querySelector('#map-stage').dataset.renderer==='map'")
        check('WebGL context loss restores usable map markers', page.locator('#map').is_visible() and page.locator('#markers [data-city]').count() > 0)
        context.close()

        context = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        context.add_init_script(CAPTURE); page=context.new_page(); page.goto(args.url); ready(page)
        before=page.evaluate('__qaGlobe.globe.pointOfView()'); page.wait_for_timeout(700)
        after=page.evaluate('__qaGlobe.globe.pointOfView()')
        check('reduced motion starts without rotation or repeating rings', abs(before['lng']-after['lng']) < .01 and page.evaluate('__qaGlobe.globe.ringsData().length===0'))
        context.close()

        context = browser.new_context(viewport={'width': 390, 'height': 844})
        context.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.includes('webgl'))return null;return original.call(this,type,...args)}")
        page=context.new_page();page.goto(args.url,wait_until='networkidle')
        check('unsupported WebGL retains the interactive map and agenda', page.locator('#map').is_visible() and page.locator('#schedule .event').count()>0)
        if page.locator('#map').is_visible() and page.locator('#markers [data-city]').count():
            page.locator('#markers [data-city]').first.click()
        check('fallback map markers still open city conferences', page.locator('#city-pop').is_visible())
        context.close()

        # Small deterministic dataset validates deadline rollover and missing places.
        context=browser.new_context(viewport={'width':1440,'height':1050})
        context.add_init_script(CAPTURE)
        context.add_init_script('window.__clockOffset=0;const realNow=Date.now;Date.now=()=>realNow()+window.__clockOffset;')
        def fixture(route):
            now=datetime.now(timezone.utc)
            records=[]
            for i,(title,place,rank,seconds) in enumerate([('First','Tianjin, China','A',120),('Second','Seattle, USA','B',600),('Third','Paris, France','C',1200),('Fourth','Paris, France','A',3600),('Unlocated','TBD','A',7200)]):
                at=(now+timedelta(seconds=seconds)).isoformat().replace('+00:00','Z')
                records.append({'id':str(i),'title':title,'name':title,'year':2027,'rank':rank,'category':'AI','place':place,'date':'May 1-3, 2027','start':'2027-05-01','end':'2027-05-03','link':'https://example.com/','deadlines':[{'at':at,'type':'paper','local':at,'timezone':'UTC','round':1,'note':''}]})
            records[0]['deadlines'][0]['type'] = 'abstract'
            later = (now + timedelta(days=40)).isoformat().replace('+00:00', 'Z')
            records[0]['deadlines'].append({'at':later,'type':'paper','local':later,'timezone':'UTC','round':1,'note':''})
            route.fulfill(content_type='text/javascript',body='window.CCF_DATA='+json.dumps({'events':records,'updatedAt':now.isoformat()})+';')
        context.route('**/conferences.js',fixture)
        page=context.new_page();page.goto(args.url);ready(page);pause(page)
        check('multiple conferences in one city share a geographic location', page.evaluate("__qaGlobe.locations.find(p=>p.name==='Paris').events.length===2"))
        check('unlocated conference stays in the schedule with a notice', page.locator('#schedule .event').count()==5 and '1' in page.locator('#unmapped').text_content())
        check('fixture starts with the earliest future deadline',page.locator('.spot-name').get_attribute('data-open')=='0')
        page.locator('#mode-deadline').click()
        later = datetime.fromisoformat(page.evaluate("CCF_DATA.events[0].deadlines[1].at").replace('Z', '+00:00')).astimezone(timezone(timedelta(hours=8)))
        page.locator('#year').select_option(str(later.year))
        page.locator(f'#months [data-month="{later.month}"]').click()
        page.evaluate('__qaGlobe.globe.onPointClick()(__qaGlobe.locations[0])')
        check('city popup uses the deadline in the selected submission month', '全文截止' in page.locator('#city-pop').text_content() and '摘要截止' not in page.locator('#city-pop').text_content())
        page.locator('#mode-meet').click(); page.locator('#year').select_option('2027'); page.locator('#months [data-month="0"]').click()
        page.evaluate('window.__clockOffset=180000');page.wait_for_timeout(1400)
        check('expired deadline advances highlight and never shows negative time',page.locator('.spot-name').get_attribute('data-open')=='1' and page.evaluate("__qaGlobe.locations.filter(p=>p.hot).every(p=>p.next.id==='1')") and '-' not in page.locator('.globe-tag.hot .globe-countdown').text_content())
        context.close();browser.close()

    check('no unexpected JavaScript errors', not report['errors'], report['errors'])
    check('all application assets loaded', not report['httpErrors'], report['httpErrors'])
    report['summary']={'passed':sum(c['pass'] for c in report['checks']),'total':len(report['checks'])}
    (output/'globe-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'summary':report['summary'],'failures':[c for c in report['checks'] if not c['pass']]},ensure_ascii=False,indent=2))
    raise SystemExit(0 if all(c['pass'] for c in report['checks']) else 1)


if __name__=='__main__':
    main()
