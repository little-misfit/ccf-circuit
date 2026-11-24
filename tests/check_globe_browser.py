#!/usr/bin/env python3
"""Behavioral QA for the geographic calendar using the actual browser renderer."""
import argparse
from datetime import datetime, timezone, timedelta
import json
import os
from pathlib import Path
import re

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CAPTURE = """window.__qaContexts=new WeakMap();
const getContext=HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext=function(type,...args){
  const context=getContext.call(this,type,...args);
  if(context && ['webgl','webgl2','experimental-webgl'].includes(type) && !__qaContexts.has(this)){
    const record={context,draws:0}; __qaContexts.set(this,record);
    for(const name of ['drawArrays','drawElements']){
      const draw=context[name]; context[name]=function(...args){record.draws++;return draw.apply(this,args);};
    }
  }
  return context;
};
Object.defineProperty(window,'CCFGlobe',{configurable:true,set(Adapter){
  Object.defineProperty(window,'CCFGlobe',{value:class extends Adapter{
    constructor(...args){super(...args);window.__qaGlobe=this;window.__qaOnSelect=args[1].onSelect;}
  }});
}});"""
READY = "window.__qaGlobe?.available && __qaContexts.get(__qaGlobe.canvas)?.draws>0 && __qaGlobe.stage.dataset.renderer==='cobe'"


def expected_nearest(events, year, now, rank='', category='', mode='meet', month=''):
    candidates = []
    rolling = str(year) in {'upcoming', '90d', '180d'}
    horizon = now + (90 if str(year) == '90d' else 180) * 86400000 if str(year) in {'90d', '180d'} else float('inf')
    today_iso = datetime.fromtimestamp(now / 1000, timezone(timedelta(hours=8))).strftime('%Y-%m-%d')
    horizon_iso = datetime.fromtimestamp(horizon / 1000, timezone(timedelta(hours=8))).strftime('%Y-%m-%d') if horizon != float('inf') else '9999-12-31'
    month_str = '' if str(month) in {'', '0'} else str(month)
    for event in events:
        if rank and event['rank'] != rank or category and event['category'] != category:
            continue
        start = event.get('start') or ''
        end = event.get('end') or start
        if mode == 'meet':
            if rolling:
                if end:
                    if end < today_iso or (horizon != float('inf') and (start or end) > horizon_iso):
                        continue
                elif str(year) != 'upcoming' or int(event['year']) < int(today_iso[:4]):
                    continue
            elif int(start[:4] or event['year']) != int(year):
                continue
            if month_str:
                if not start:
                    continue
                if '-' in month_str and start[:7] != month_str:
                    continue
                if '-' not in month_str and int(start[5:7]) != int(month_str):
                    continue
            if start:
                instant = datetime.fromisoformat(f'{start}T00:00:00+08:00')
                if instant.timestamp() * 1000 > now:
                    candidates.append((instant, event['title'], event['id']))
            continue
        for deadline in event['deadlines']:
            if not deadline.get('at'):
                continue
            instant = datetime.fromisoformat(deadline['at'].replace('Z', '+00:00'))
            ms = instant.timestamp() * 1000
            if ms <= now:
                continue
            local = instant.astimezone(timezone(timedelta(hours=8)))
            if mode == 'deadline':
                if rolling:
                    if ms > horizon:
                        continue
                elif local.year != int(year):
                    continue
                if month_str:
                    if '-' in month_str and local.strftime('%Y-%m') != month_str:
                        continue
                    if '-' not in month_str and local.month != int(month_str):
                        continue
            candidates.append((instant, event['title'], event['id']))
    return sorted(candidates)[0][2] if candidates else None


def check_fse_branding(browser, url, check, errors, http_errors):
    """Render both FSE editions while their deadlines are still upcoming."""
    context = browser.new_context(viewport={'width':1440,'height':1050})
    context.add_init_script(CAPTURE)
    context.add_init_script("const realNow=Date.now,start=realNow(),baseline=Date.parse('2026-06-01T00:00:00Z');Date.now=()=>baseline+realNow()-start;")
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: http_errors.append({'url':response.url,'status':response.status}) if response.status >= 400 else None)
    try:
        page.goto(url, wait_until='networkidle')
        page.wait_for_function(READY)
        page.evaluate('__qaGlobe.stopRotation()')
        page.locator('#mode-meet').click(); page.locator('#year').select_option('2027')
        page.locator('#rank').select_option(''); page.locator('#search').fill('FSE')
        for category, event_id in [('SC','iacr-fse27'),('SE','fse27')]:
            page.locator('#category').select_option(category)
            page.locator('#globe').scroll_into_view_if_needed(); page.wait_for_timeout(1100)
            card = page.locator(f'.globe-tag[data-open="{event_id}"]')
            card.wait_for(state='visible')
            state = card.evaluate("""card => {
              const logo=card.querySelector('.globe-tag-logo'), monogram=card.querySelector('.globe-tag-monogram');
              return {source:logo.currentSrc || logo.getAttribute('src'),loaded:logo.complete && logo.naturalWidth>0,
                imageHidden:logo.hidden,monogram:monogram.textContent,monogramVisible:!monogram.hidden,
                expected:new URL(CCF_BRANDS['ID:IACR-FSE27'].logo,document.baseURI).href};
            }""")
            selected = page.locator('.spot-name').get_attribute('data-open') == event_id
            if category == 'SC':
                check('Fast Software Encryption uses its event-specific official logo', selected and state['loaded']
                      and not state['imageHidden'] and state['source'] == state['expected'], state)
            else:
                check('ACM Foundations of Software Engineering does not inherit the encryption logo', selected
                      and state['imageHidden'] and state['monogramVisible'] and state['monogram'] == 'FSE'
                      and state['source'] != state['expected'], state)
    finally:
        context.close()


def check_mobile_controls(browser, url, check, errors, http_errors):
    context = browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    context.add_init_script(CAPTURE)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: http_errors.append({'url':response.url,'status':response.status}) if response.status >= 400 else None)
    try:
        page.goto(url,wait_until='networkidle');page.wait_for_function(READY)
        page.evaluate('__qaGlobe.stopRotation()');page.locator('#globe').scroll_into_view_if_needed();page.wait_for_timeout(300)
        size = page.evaluate("""() => {const g=__qaGlobe;return {width:g.width,height:g.height,bufferWidth:g.canvas.width,bufferHeight:g.canvas.height,dpr:devicePixelRatio};}""")
        check('mobile DPR2 renders at the correct backing-buffer size', size['dpr']==2
              and size['bufferWidth']==round(size['width']*2) and size['bufferHeight']==round(size['height']*2), size)
        session = context.new_cdp_session(page)
        def touch_targets():
            return page.evaluate("""() => {
              const canvas=__qaGlobe.canvas,b=canvas.getBoundingClientRect(),x=b.left+b.width/2;
              for(const f of [.72,.62,.82]){const y=b.top+b.height*f;
                if([-70,-40,40,70].every(dx=>document.elementFromPoint(x+dx,y)===canvas))return {x,y};}
              throw new Error('No unobstructed canvas area for touch interaction');
            }""")
        at = touch_targets(); before = page.evaluate('__qaGlobe.view')
        session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':at['x']-40,'y':at['y'],'id':1}]})
        session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':at['x']+40,'y':at['y']-15,'id':1}]})
        session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        after = page.evaluate('__qaGlobe.view')
        check('actual mobile touch dragging rotates the globe', abs(after['phi']-before['phi'])>.05 or abs(after['theta']-before['theta'])>.05)
        at = touch_targets(); before = page.evaluate('__qaGlobe.view.scale')
        session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':at['x']-40,'y':at['y'],'id':1},{'x':at['x']+40,'y':at['y'],'id':2}]})
        session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':at['x']-70,'y':at['y'],'id':1},{'x':at['x']+70,'y':at['y'],'id':2}]})
        session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        check('actual mobile pinch zoom increases scale and releases pointers', page.evaluate('__qaGlobe.view.scale')>before*1.2 and page.evaluate('__qaGlobe.pointers.size===0'))
        page.evaluate('__qaGlobe.focusNearest()');page.wait_for_timeout(1000)
        projection = page.evaluate("""() => {
          const g=__qaGlobe,b=g.stage.getBoundingClientRect(),vars=getComputedStyle(document.documentElement),native=g.nativeAnchors;
          g.nativeAnchors=false;
          const samples=g.locations.map(p=>{const a=g.labels.get(p.key).anchor.getBoundingClientRect(),at=g.projectLocation(p);
            const visible=!!vars.getPropertyValue('--cobe-visible-'+p.markerId).trim();
            return {name:p.name,error:Math.hypot(at.x-(a.left-b.left),at.y-(a.top-b.top)),visible,matches:at.visible===visible};});
          g.nativeAnchors=native;return samples;
        }""")
        check('CSS-anchor fallback projection matches native front and rear markers', any(p['visible'] for p in projection)
              and any(not p['visible'] for p in projection) and all(p['error']<2 and p['matches'] for p in projection), projection)
    finally:
        context.close()


def check_static_resume(page, check):
    page.evaluate('__qaGlobe.stopRotation()')
    page.locator('#globe').scroll_into_view_if_needed();page.wait_for_timeout(1700)
    page.locator('footer').scroll_into_view_if_needed()
    page.wait_for_function('__qaGlobe.visible===false')
    before = page.evaluate('({draws:__qaContexts.get(__qaGlobe.canvas).draws,view:{...__qaGlobe.view}})')
    page.locator('#globe').scroll_into_view_if_needed();page.wait_for_timeout(350)
    after = page.evaluate('({draws:__qaContexts.get(__qaGlobe.canvas).draws,view:{...__qaGlobe.view},visible:__qaGlobe.visible})')
    check('reduced-motion globe repaints after returning onscreen without moving', after['visible']
          and after['draws']>before['draws'] and after['view']==before['view'], {'before':before,'after':after})


def check_gl_capabilities(browser, url, check, errors, http_errors):
    """Exercise actual GL capability failures that COBE otherwise handles silently."""
    force_webgl1 = "const previousContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:previousContext.call(this,type,...args)};"
    invalid_shader = """window.__qaFaultHits=0;
      for(const type of [WebGLRenderingContext,WebGL2RenderingContext]){
        const originalSource=type.prototype.shaderSource;
        type.prototype.shaderSource=function(shader,source){__qaFaultHits++;return originalSource.call(this,shader,'deliberately invalid GLSL');};
      }"""
    no_instancing = """window.__qaFaultHits=0;
      const originalExtension=WebGLRenderingContext.prototype.getExtension;
      WebGLRenderingContext.prototype.getExtension=function(name){
        if(name==='ANGLE_instanced_arrays'){__qaFaultHits++;return null;}
        return originalExtension.call(this,name);
      };"""
    for mode, injection in [('WebGL2',''),('WebGL1',force_webgl1),
                            ('failed shader compilation',invalid_shader),
                            ('WebGL1 without marker instancing',force_webgl1+no_instancing)]:
        context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
        context.add_init_script(CAPTURE)
        if injection:
            context.add_init_script(injection)
        page=context.new_page()
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('response',lambda response:http_errors.append({'url':response.url,'status':response.status}) if response.status>=400 else None)
        try:
            page.goto(url,wait_until='networkidle')
            if mode in ['WebGL1','WebGL2']:
                page.wait_for_function(READY)
                state=page.evaluate("""() => {
                  const g=__qaGlobe,record=__qaContexts.get(g.canvas),gl=record.context,program=gl.getParameter(gl.CURRENT_PROGRAM);
                  return {version:gl instanceof WebGL2RenderingContext?'WebGL2':'WebGL1',draws:record.draws,
                    markers:g.markers.length,linked:!!program && gl.getProgramParameter(program,gl.LINK_STATUS),
                    instanced:!!gl.drawArraysInstanced || !!gl.getExtension('ANGLE_instanced_arrays'),error:gl.getError()};
                }""")
                check(f'native COBE renders with healthy {mode}',state['version']==mode and state['draws']>0
                      and state['markers']>0 and state['linked'] and state['instanced'] and state['error']==0,state)
            else:
                page.wait_for_function("document.querySelector('#map-stage').dataset.renderer==='map'")
                state=page.evaluate("""() => ({injected:__qaFaultHits>0,context:!!__qaContexts.get(__qaGlobe.canvas)?.context,
                  available:__qaGlobe.available,renderer:__qaGlobe.stage.dataset.renderer})""")
                map_ready=page.locator('#map').is_visible() and page.locator('#schedule .event').count()>0
                if map_ready and page.locator('#markers [data-city]').count():
                    page.locator('#markers [data-city]').first.click()
                interactive=page.locator('#city-pop').is_visible()
                page.locator('#search').fill('ICCV')
                searchable=page.locator('#schedule [data-row="iccv27"]').count()==1
                check(f'{mode} restores the interactive map and searchable schedule',state['injected']
                      and state['context'] and not state['available'] and state['renderer']=='map'
                      and map_ready and interactive and searchable,state)
        finally:
            context.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8769/')
    parser.add_argument('--browser', default=os.environ.get('CHROME_BIN'))
    parser.add_argument('--only', choices=['fse-branding','mobile-controls','motion-resume','gl-capabilities'], help='Run one focused regression without the full globe suite.')
    args = parser.parse_args()
    report = {'checks': [], 'errors': [], 'httpErrors': []}
    output = ROOT / 'preview'
    output.mkdir(exist_ok=True)

    def check(name, passed, details=None):
        report['checks'].append({'name': name, 'pass': bool(passed), 'details': details})
        if not passed:
            print('FAIL:', name, details, flush=True)

    def finish():
        check('no unexpected JavaScript errors', not report['errors'], report['errors'])
        check('all application assets loaded', not report['httpErrors'], report['httpErrors'])
        report['summary']={'passed':sum(c['pass'] for c in report['checks']),'total':len(report['checks'])}
        report_name = {'fse-branding':'globe-fse-report.json','mobile-controls':'globe-mobile-report.json','motion-resume':'globe-resume-report.json','gl-capabilities':'globe-capabilities-report.json'}.get(args.only,'globe-browser-report.json')
        (output/report_name).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps({'summary':report['summary'],'failures':[c for c in report['checks'] if not c['pass']]},ensure_ascii=False,indent=2))
        raise SystemExit(0 if all(c['pass'] for c in report['checks']) else 1)

    def ready(page):
        page.wait_for_function(READY)
        page.wait_for_function("document.querySelector('#schedule .event')")
        page.wait_for_timeout(1000)

    def pause(page):
        page.evaluate('window.__qaGlobe.stopRotation()')
        page.mouse.move(0, 0)

    def english_ui(page, label):
        content = page.evaluate("""() => ({
          language: document.documentElement.lang,
          brand: document.querySelector('.brand').textContent.trim(),
          title: document.title,
          text: document.body.innerText,
          attributes: [...document.querySelectorAll('[aria-label],[placeholder],[title]')]
            .flatMap(e => ['aria-label','placeholder','title'].map(a => e.getAttribute(a) || '')).join(' ')
        })""")
        unexpected = re.findall(r'[\u3400-\u4dbf\u4e00-\u9fff]+', content['text'] + content['attributes'])
        check(label, content['language'] == 'en' and content['brand'] == 'CCF-Schedule'
              and 'CCF-Schedule' in content['title'] and not unexpected
              and 'CCF Circuit' not in content['text'], {'unexpected_text': unexpected})

    def fits_viewport(page, selector):
        return page.locator(selector).evaluate("""e => {
          const r=e.getBoundingClientRect();
          return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0
            && r.bottom <= innerHeight + 1 && e.scrollWidth <= e.clientWidth + 1;
        }""")

    def marker_clearance(page, label):
        geometry = page.evaluate("""() => {
          const g=__qaGlobe, bounds=g.canvas.getBoundingClientRect();
          const offset=g.offset || [0,0],origin={x:bounds.left+bounds.width/2+offset[0]*g.view.scale/2,y:bounds.top+bounds.height/2+offset[1]*g.view.scale/2};
          const variables=getComputedStyle(document.documentElement);
          const anchors=new Map([...document.querySelectorAll('#globe [style*="anchor-name"]')]
            .map(e=>[getComputedStyle(e).anchorName,e]));
          const cards=[...document.querySelectorAll('.globe-tag:not([hidden])')];
          const boxes=cards.flatMap(card=>{
            const r=card.getBoundingClientRect(), title=card.querySelector('.globe-tag-heading').textContent;
            const result=[{left:r.left,right:r.right,top:r.top,bottom:r.bottom,title}];
            const caption=getComputedStyle(card,'::before');
            if(caption.content!=='none' && caption.content!=='normal'){
              const left=r.left+(parseFloat(caption.left)||0),top=r.top+(parseFloat(caption.top)||0);
              result.push({left,top,right:left+(parseFloat(caption.width)||r.width),
                bottom:top+(parseFloat(caption.height)||parseFloat(caption.fontSize)*1.3),title:title+' caption'});
            }
            return result;
          });
          const projectionErrors=[];
          const markers=g.locations.flatMap(point=>{
            const native=anchors.get('--cobe-'+point.markerId);
            if(!native || !variables.getPropertyValue('--cobe-visible-'+point.markerId).trim())return [];
            const r=native.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
            // Stay inside the globe's rim; elevated rear markers can peek over the horizon.
            if(Math.hypot(x-origin.x,y-origin.y)>g.globeRadius*.85)return [];
            if(x<bounds.left+16||x>bounds.right-16||y<bounds.top+16||y>bounds.bottom-16)return [];
            const projected=g.projectLocation(point);
            if(!projected.visible || Math.hypot(projected.x+bounds.left-x,projected.y+bounds.top-y)>2)
              projectionErrors.push(point.name);
            return [{name:point.name,x,y,hot:point.hot}];
          });
          const violations=[];
          let minimum=Infinity;
          for(const marker of markers)for(const box of boxes){
            const distance=Math.hypot(Math.max(box.left-marker.x,0,marker.x-box.right),Math.max(box.top-marker.y,0,marker.y-box.bottom));
            minimum=Math.min(minimum,distance);
            const required=marker.hot?12:4;
            if(distance<required-.5)violations.push({marker:marker.name,card:box.title,clearance:distance,required});
          }
          return {markers:markers.length,cards:cards.length,minimumClearance:Number.isFinite(minimum)?minimum:null,violations,projectionErrors};
        }""")
        check(label, geometry['markers'] > 0 and geometry['cards'] > 0 and not geometry['violations'] and not geometry['projectionErrors'], geometry)

    def nearest(page, label):
        snapshot = page.evaluate("({events:CCF_DATA.events,year:document.querySelector('#year').value,now:Date.now(),rank:document.querySelector('#rank').value,category:document.querySelector('#category').value,mode:document.querySelector('#mode-deadline').getAttribute('aria-pressed')==='true'?'deadline':'meet',month:document.querySelector('#months [aria-pressed=true]')?.dataset.month || ''})")
        if page.locator('#nav-fav').get_attribute('aria-pressed') == 'true':
            saved = page.evaluate("JSON.parse(localStorage.getItem('ccf-circuit.saved.v1') || '[]')")
            snapshot['events'] = [event for event in snapshot['events'] if event['id'] in saved]
        expected = expected_nearest(**snapshot)
        actual = page.locator('.spot-name').get_attribute('data-open') if page.locator('.spot-name').count() else None
        marked = page.evaluate("__qaGlobe.locations.filter(p=>p.hot).map(p=>p.next?.id)")
        rendered = page.evaluate("__qaGlobe.markers.flatMap(m=>__qaGlobe.locations.filter(p=>p.markerId===m.id && p.hot).map(p=>p.next?.id))")
        rings = page.locator('.globe-ripple').evaluate_all("es=>es.filter(e=>!e.hidden || __qaGlobe.locations.find(p=>p.key===e.dataset.city)?.hot).map(e=>__qaGlobe.locations.find(p=>p.key===e.dataset.city)?.next?.id)")
        hot_labels = page.locator('.globe-tag.hot').evaluate_all('es=>es.map(e=>e.dataset.open)')
        has_location = bool([e for e in snapshot['events'] if e['id'] == expected and page.evaluate('(place)=>CCF_GEO.lookup(place).length', e.get('place') or '')])
        consistent = (bool(marked) and all(v == expected for v in marked)) if has_location else not marked
        check(label, actual == expected and consistent and all(sorted(ids, key=str) == sorted(marked, key=str) for ids in [rendered,rings,hot_labels]),
              {'expected': expected, 'actual': actual, 'marked': marked, 'rendered': rendered, 'rings': rings, 'hotLabels': hot_labels})

    with sync_playwright() as pw:
        options = {'args': ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}
        if args.browser:
            options['executable_path'] = args.browser
        browser = pw.chromium.launch(**options)
        if args.only == 'fse-branding':
            check_fse_branding(browser, args.url, check, report['errors'], report['httpErrors'])
            browser.close()
            finish()
        if args.only == 'mobile-controls':
            check_mobile_controls(browser, args.url, check, report['errors'], report['httpErrors'])
            browser.close()
            finish()
        if args.only == 'gl-capabilities':
            check_gl_capabilities(browser,args.url,check,report['errors'],report['httpErrors'])
            browser.close()
            finish()
        if args.only == 'motion-resume':
            context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
            context.add_init_script(CAPTURE)
            page=context.new_page()
            page.on('pageerror',lambda error:report['errors'].append(str(error)))
            page.on('response',lambda response:report['httpErrors'].append({'url':response.url,'status':response.status}) if response.status>=400 else None)
            page.goto(args.url,wait_until='networkidle');ready(page)
            check_static_resume(page,check)
            context.close();browser.close();finish()
        context = browser.new_context(viewport={'width': 1440, 'height': 1050})
        context.add_init_script(CAPTURE)
        page = context.new_page()
        page.on('pageerror', lambda error: report['errors'].append(str(error)))
        page.on('response', lambda response: report['httpErrors'].append({'url': response.url, 'status': response.status}) if response.status >= 400 else None)
        page.goto(args.url, wait_until='networkidle')
        ready(page)
        pause(page)
        english_ui(page, 'overview uses English and exact CCF-Schedule branding')
        initial = page.evaluate('({events:CCF_DATA.events,now:Date.now()})')
        check('initial scope is cross-year upcoming deadlines', page.locator('#mode-deadline').get_attribute('aria-pressed') == 'true'
              and page.locator('#year').input_value() == 'upcoming')
        check('initial filters are CCF A and all research areas', page.locator('#rank').input_value() == 'A' and page.locator('#category').input_value() == '')
        logo_assets = page.evaluate("""async () => {
          const sources=[...new Set(Object.values(CCF_BRANDS).map(brand=>brand.logo))];
          const results=await Promise.all(sources.map(source=>new Promise(resolve=>{
            const image=new Image(),timer=setTimeout(()=>resolve({source,loaded:false}),5000);
            const done=loaded=>{clearTimeout(timer);resolve({source,loaded});};
            image.onload=()=>done(image.naturalWidth>0 && image.naturalHeight>0 && new URL(image.src).origin===location.origin);
            image.onerror=()=>done(false); image.src=source;
          })));
          return {count:results.length,failed:results.filter(result=>!result.loaded).map(result=>result.source)};
        }""")
        check('all registered conference logos decode from local files', logo_assets['count'] > 0 and not logo_assets['failed'], logo_assets)
        nearest(page, 'nearest future deadline respects the initial AI and CCF A filters')
        iccv = page.locator('#schedule [data-row="iccv27"]')
        check('ICCV 2027 remains listed when its submission date is unknown', iccv.count() == 1 and 'Deadline TBA' in iccv.text_content())
        page.locator('#search').fill('ICCV'); page.wait_for_timeout(1000)
        iccv_card = page.locator('.globe-tag[data-open="iccv27"]')
        check('search focuses the undated ICCV conference in Hong Kong', iccv_card.is_visible()
              and page.evaluate("__qaGlobe.locations.length===1 && __qaGlobe.locations[0].name==='Hong Kong'"))
        check('ICCV TBA has no invented countdown or nearest-deadline highlight',
              iccv_card.locator('.globe-countdown').text_content() == 'Deadline TBA'
              and page.locator('.globe-tag.hot').count() == 0 and page.locator('.spot-name').count() == 0
              and page.evaluate("CCF_DATA.events.find(e=>e.id==='iccv27').deadlines.every(d=>d.at===null)"))
        check('undated ICCV uses its official edition logo', iccv_card.locator('.globe-tag-logo').evaluate("image=>image.complete && image.naturalWidth>0 && image.src===new URL(CCF_BRANDS['ICCV:2027'].logo,document.baseURI).href"))
        iccv_card.click()
        check('ICCV detail preserves the unpublished submission date', page.locator('#detail').is_visible()
              and 'ICCV 2027' in page.locator('#detail-title').text_content()
              and 'To be announced' in page.locator('.detail-timeline').text_content())
        page.keyboard.press('Escape')
        page.locator('#months [data-month="10"]').click()
        check('a conference month does not supply an unknown submission month',
              page.locator('#schedule [data-row="iccv27"]').count() == 0 and page.evaluate('__qaGlobe.locations.length===0'))
        page.locator('#months [data-month="0"]').click(); page.locator('#year').select_option('2026')
        check('ICCV 2027 TBA does not leak into another submission year', page.locator('#schedule [data-row="iccv27"]').count() == 0)
        page.locator('#year').select_option('upcoming'); page.locator('#search').fill('')
        brand_cards = []
        for conference in ['ACL', 'ICML']:
            page.locator('#search').fill(conference)
            page.wait_for_timeout(1000)
            card = page.locator('.globe-tag.hot:not([hidden])').first
            brand = card.evaluate("""(card, conference) => {
              const logo=card.querySelector('.globe-tag-logo');
              const style=getComputedStyle(card);
              return {heading:card.querySelector('.globe-tag-heading').textContent,
                source:logo?.currentSrc || logo?.src || '', loaded:!!logo && logo.complete && logo.naturalWidth>0,
                local:!!logo && new URL(logo.src).origin===location.origin,
                expectedSource:new URL(CCF_BRANDS[conference].logo,document.baseURI).href,
                expectedAccent:CCF_BRANDS[conference].color,
                accent:style.getPropertyValue('--tag-accent').trim(), border:style.borderTopColor,
                surface:style.backgroundColor, ink:getComputedStyle(card.querySelector('.globe-countdown')).color};
            }""", conference)
            check(f'{conference}: official local logo and brand accent are applied', brand['loaded'] and brand['local']
                  and brand['source'] == brand['expectedSource'] and brand['heading'].startswith(conference)
                  and brand['accent'].lower() == brand['expectedAccent'].lower(), brand)
            brand_cards.append(brand)
        check('ACL and ICML apply distinct conference palettes to the highlighted card',
              bool(brand_cards[0]['accent']) and brand_cards[0]['accent'] != brand_cards[1]['accent']
              and brand_cards[0]['source'] != brand_cards[1]['source']
              and any(brand_cards[0][key] != brand_cards[1][key] for key in ['border', 'surface', 'ink']), brand_cards)
        page.locator('#search').fill('')
        page.locator('#rank').select_option(''); page.locator('#category').select_option('')
        page.wait_for_timeout(1000)
        pause(page)
        inactive_acl = page.locator('.globe-tag').evaluate_all("""cards => {
          const card=cards.find(e=>e.querySelector('.globe-tag-heading').textContent.startsWith('ACL '));
          if(!card)return null;
          return {hot:card.classList.contains('hot'),surface:getComputedStyle(card).backgroundColor,
            ink:getComputedStyle(card.querySelector('.globe-countdown')).color,
            logo:card.querySelector('.globe-tag-logo').currentSrc};
        }""")
        check('non-nearest ACL retains its logo without the active card styling', inactive_acl and not inactive_acl['hot']
              and inactive_acl['surface'] == 'rgb(247, 249, 252)' and inactive_acl['ink'] == 'rgb(70, 85, 107)'
              and inactive_acl['logo'] == brand_cards[0]['source'], inactive_acl)
        check('native COBE renders through a real locally loaded WebGL module', page.evaluate("""() => {
          const g=__qaGlobe,record=__qaContexts.get(g.canvas),context=record?.context;
          return typeof g.globe.update==='function' && typeof g.globe.destroy==='function'
            && record.draws>0 && context.getParameter(context.VERSION).startsWith('WebGL') && context.getError()===context.NO_ERROR
            && performance.getEntriesByType('resource').some(r=>new URL(r.name).pathname.includes('/vendor/cobe/'));
        }"""))
        check('conference markers have native COBE geographic anchors', page.evaluate("""() => {
          const g=__qaGlobe,names=new Set([...document.querySelectorAll('#globe [style*="anchor-name"]')].map(e=>getComputedStyle(e).anchorName));
          return g.markers.length>0 && g.markers.length===g.locations.length
            && g.markers.every(m=>Array.isArray(m.location) && m.location.length===2 && names.has('--cobe-'+m.id));
        }"""))
        ripple = page.evaluate("""() => {
          const rings=[...document.querySelectorAll('.globe-ripple:not([hidden])')];
          return {count:rings.length,onlyNearest:rings.every(e=>__qaGlobe.locations.find(p=>p.key===e.dataset.city)?.hot),
            sizes:rings.map(e=>parseFloat(getComputedStyle(e,'::before').width)),
            animations:rings.flatMap(e=>['::before','::after'].map(p=>{const s=getComputedStyle(e,p);return {name:s.animationName,duration:parseFloat(s.animationDuration),repeat:s.animationIterationCount};}))};
        }""")
        check('normal motion renders a larger repeating nearest-deadline ripple', ripple['count'] > 0 and ripple['onlyNearest']
              and min(ripple['sizes']) >= 40 and all(a['name'] != 'none' and a['duration'] > 0 and a['repeat'] == 'infinite' for a in ripple['animations']), ripple)
        nearest(page, 'nearest future deadline is highlighted initially')
        timer = page.locator('.globe-tag.hot .globe-countdown').first
        previous = timer.text_content()
        page.wait_for_timeout(1250)
        check('floating deadline counts down in real time', timer.text_content() != previous)
        page.locator('#globe-motion').click()
        page.mouse.move(0, 0)
        before = page.evaluate('__qaGlobe.view.phi')
        page.wait_for_timeout(700)
        after = page.evaluate('__qaGlobe.view.phi')
        check('play button resumes rotation after the pointer leaves', abs(after - before) > .001 and page.evaluate('__qaGlobe.playing'))
        pause(page)

        # User input must change the camera, not only a decorative CSS transform.
        bounds = page.locator('#globe canvas').bounding_box()
        before = page.evaluate('__qaGlobe.view')
        x, y = bounds['x'] + bounds['width'] * .48, bounds['y'] + bounds['height'] * .65
        page.mouse.move(x, y); page.mouse.down(); page.mouse.move(x + 120, y + 35, steps=12); page.mouse.up()
        page.wait_for_timeout(600)
        after = page.evaluate('__qaGlobe.view')
        check('dragging rotates the geographic view', abs(after['phi'] - before['phi']) > .05 or abs(after['theta'] - before['theta']) > .05, {'before': before, 'after': after})
        marker_clearance(page, 'dragging keeps projected markers clear of floating cards')
        before = after
        page.locator('#zoom-in').click(); page.wait_for_timeout(500)
        after = page.evaluate('__qaGlobe.view')
        check('zoom control increases the globe scale', after['scale'] > before['scale'])
        page.locator('#globe').focus(); before = page.evaluate('__qaGlobe.view')
        page.keyboard.press('ArrowRight'); page.wait_for_timeout(400)
        after = page.evaluate('__qaGlobe.view')
        check('keyboard arrows rotate the globe', abs(after['phi'] - before['phi']) > .05)
        page.locator('#focus-deadline').click(); page.wait_for_timeout(1000)
        check('focus-nearest returns the selected deadline to the visible hemisphere', page.locator('.globe-tag.hot:not([hidden])').count() > 0)
        backside = page.evaluate("""() => {
          const g=__qaGlobe,variables=getComputedStyle(document.documentElement);
          const back=g.locations.filter(p=>!variables.getPropertyValue('--cobe-visible-'+p.markerId).trim());
          return {count:back.length,hidden:back.every(p=>g.labels.get(p.key).button.hidden)};
        }""")
        check('far-side deadline cards are hidden by the Earth', backside['count'] > 0 and backside['hidden'], backside)

        # Real click on the highlighted surface marker opens its city collection.
        coordinates = page.evaluate("""() => {const g=__qaGlobe,p=g.locations.find(p=>p.hot);return g.projectLocation(p)}""")
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
        english_ui(page, 'conference details and controls use English')
        page.keyboard.press('Escape')

        page.locator('#rank').select_option('A'); page.wait_for_timeout(1100)
        nearest(page, 'nearest highlight follows CCF rank filter')
        page.locator('#category').select_option('AI'); page.wait_for_timeout(1000)
        nearest(page, 'nearest highlight follows subject filter')
        for category in page.locator('#category option').evaluate_all("es=>es.map(e=>e.value).filter(Boolean)"):
            page.locator('#category').select_option(category)
            nearest(page, f'{category}: category changes replace the spotlight, highlighted points and rings')
        page.locator('#category').select_option('AI')
        for rank in ['B', 'C', 'A']:
            page.locator('#rank').select_option(rank)
            nearest(page, f'AI rank {rank}: no previous-category highlight survives')
        page.locator('#rank').select_option(''); page.locator('#category').select_option('')
        page.locator('#mode-meet').click()
        page.locator('#year').select_option('2026'); page.wait_for_timeout(1000)
        nearest(page, 'nearest highlight follows selected meeting year')
        page.locator('#mode-deadline').click(); page.wait_for_timeout(1000)
        nearest(page, 'nearest highlight follows submission-year scope')
        page.locator('#months [data-month="11"]').click(); page.wait_for_timeout(1000)
        nearest(page, 'nearest highlight follows submission-month scope')
        page.locator('#months [data-month="0"]').click(); page.locator('#mode-meet').click()
        page.locator('#search').fill('no-conference-has-this-name')
        check('empty filters clear globe markers, labels and nearest deadline', page.evaluate("__qaGlobe.locations.length===0 && document.querySelectorAll('.globe-tag').length===0 && !document.querySelector('.spot-name')"))
        english_ui(page, 'empty search state and reset control use English')
        page.locator('#clear-filter').click(); page.wait_for_timeout(1000)
        page.locator('#schedule [data-save]').first.click(); page.locator('#nav-fav').click()
        check('favorites isolate the agenda and globe', page.locator('#schedule .event').count() == 1 and page.evaluate('__qaGlobe.locations.every(p=>p.events.length===1)'))
        nearest(page, 'nearest highlight follows saved conference scope')
        page.reload(wait_until='networkidle'); ready(page); pause(page)
        check('favorites persist after reload', page.locator('#fav-count').text_content() == '1')
        page.locator('#rank').select_option(''); page.locator('#category').select_option('')

        for width in [1440, 768, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 1050 if width > 760 else 844})
            page.locator('#focus-deadline').click()
            page.locator('#globe').scroll_into_view_if_needed(); page.wait_for_timeout(1200)
            boxes = page.locator('.globe-tag:not([hidden])').evaluate_all("es=>es.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}})")
            overlap = any(a['left'] < b['right'] and a['right'] > b['left'] and a['top'] < b['bottom'] and a['bottom'] > b['top'] for i, a in enumerate(boxes) for b in boxes[i+1:])
            stage = page.locator('#map-stage').bounding_box()
            fits = all(b['left'] >= stage['x'] - 1 and b['right'] <= stage['x'] + stage['width'] + 1 and b['top'] >= stage['y'] - 1 and b['bottom'] <= stage['y'] + stage['height'] + 1 for b in boxes)
            check(f'{width}px: no page overflow or overlapping floating cards', not page.evaluate('document.documentElement.scrollWidth>innerWidth') and not overlap and fits, boxes)
            compact = stage['width'] < 600
            footprint = page.evaluate("""() => {
              const diameter=__qaGlobe.globeRadius*2;
              return {diameter,boxes:[...document.querySelectorAll('.globe-tag:not([hidden])')].map(e=>({width:e.offsetWidth,height:e.offsetHeight}))};
            }""")
            check(f'{width}px: cards have a smaller footprint relative to Earth', bool(footprint['boxes'])
                  and all(b['width'] <= (178 if compact else 196) + 1 and b['height'] <= (84 if compact else 100) + 1
                          and b['width'] / footprint['diameter'] < .72 for b in footprint['boxes']), footprint)
            marker_clearance(page, f'{width}px: visible projected markers retain clearance from cards')
            check(f'{width}px: nearest deadline remains visible and readable', page.locator('.globe-tag.hot:not([hidden])').count() > 0)
            check(f'{width}px: English labels fit their cards', page.locator('.globe-tag:not([hidden])').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)'))
            timer_sizes = page.locator('.globe-tag.has-deadline:not([hidden]) .globe-countdown').evaluate_all('es=>es.map(e=>parseFloat(getComputedStyle(e).fontSize))')
            check(f'{width}px: floating countdown text is enlarged', bool(timer_sizes) and min(timer_sizes) >= (22 if width >= 768 else 19), timer_sizes)
            if width in [1440, 390]:
                page.evaluate("scrollTo({top:0,behavior:'instant'})")
                page.screenshot(path=str(output / f'globe-qa-{width}.png'), full_page=True)
            page.locator('.spot-name').click()
            check(f'{width}px: detail dialog fits the viewport', fits_viewport(page, '#detail'))
            page.keyboard.press('Escape')
            page.locator('#globe').scroll_into_view_if_needed()
            for longitude in [-100, 30]:
                page.evaluate('(angle)=>__qaGlobe.setView({phi:angle*Math.PI/180,theta:.35},false)', longitude)
                page.wait_for_timeout(200)
                marker_clearance(page, f'{width}px: markers stay clear after rotating to {longitude} degrees')
        page.locator('#search').fill('no-conference-has-this-name')
        check('320px: empty search state fits without page overflow', not page.evaluate('document.documentElement.scrollWidth>innerWidth') and page.locator('#clear-filter').is_visible())
        page.locator('#clear-filter').click()
        page.evaluate("__qaContexts.get(__qaGlobe.canvas).context.getExtension('WEBGL_lose_context').loseContext()")
        page.wait_for_function("document.querySelector('#map-stage').dataset.renderer==='map'")
        check('WebGL context loss restores usable map markers', page.locator('#map').is_visible() and page.locator('#markers [data-city]').count() > 0)
        context.close()

        context = browser.new_context(viewport={'width': 390, 'height': 844})
        context.add_init_script(CAPTURE)
        context.route(re.compile(r'/assets/conferences/acl\.svg(?:\?.*)?$'), lambda route: route.abort())
        page = context.new_page(); page.goto(args.url, wait_until='networkidle'); ready(page); pause(page)
        page.locator('#category').select_option('AI')
        page.locator('#rank').select_option('A')
        check('failed logo remains a readable monogram after rendering again',
              page.locator('.globe-tag.hot .globe-tag-monogram').is_visible()
              and not page.locator('.globe-tag.hot .globe-tag-logo').is_visible())
        context.close()

        context = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        context.add_init_script(CAPTURE); page=context.new_page(); page.goto(args.url); ready(page)
        page.locator('#rank').select_option(''); page.locator('#category').select_option('')
        before=page.evaluate('__qaGlobe.view'); page.wait_for_timeout(700)
        after=page.evaluate('__qaGlobe.view')
        check('reduced motion starts without rotation or repeating rings', abs(before['phi']-after['phi']) < .0001 and page.evaluate("[...document.querySelectorAll('.globe-ripple:not([hidden])')].every(e=>['::before','::after'].every(p=>getComputedStyle(e,p).animationName==='none' || parseFloat(getComputedStyle(e,p).animationDuration)===0))"))
        check_static_resume(page,check)
        context.close()

        check_gl_capabilities(browser,args.url,check,report['errors'],report['httpErrors'])

        context = browser.new_context(viewport={'width': 390, 'height': 844})
        context.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.includes('webgl'))return null;return original.call(this,type,...args)}")
        page=context.new_page();page.goto(args.url,wait_until='networkidle')
        check('unsupported WebGL retains the interactive map and agenda', page.locator('#map').is_visible() and page.locator('#schedule .event').count()>0)
        english_ui(page, 'fallback map status and controls use English')
        if page.locator('#map').is_visible() and page.locator('#markers [data-city]').count():
            page.locator('#markers [data-city]').first.click()
        check('fallback map markers still open city conferences', page.locator('#city-pop').is_visible())
        english_ui(page, 'fallback city popup uses English')
        context.close()

        context = browser.new_context(viewport={'width':390,'height':844})
        context.route(re.compile(r'/vendor/cobe/[^?]+\.js(?:\?.*)?$'), lambda route: route.abort())
        page=context.new_page();page.goto(args.url,wait_until='networkidle')
        page.locator('#search').fill('ICCV')
        check('a failed COBE module preserves the searchable schedule and map', page.locator('#map').is_visible()
              and page.locator('#schedule [data-row="iccv27"]').count()==1 and not page.locator('#boot-error').is_visible())
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
        context.route(re.compile(r'/conferences\.js(?:\?.*)?$'),fixture)
        page=context.new_page();page.goto(args.url);ready(page);pause(page)
        page.locator('#rank').select_option(''); page.locator('#category').select_option('')
        page.locator('#mode-deadline').click(); page.locator('#year').select_option('upcoming')
        check('multiple conferences in one city share a geographic location', page.evaluate("__qaGlobe.locations.find(p=>p.name==='Paris').events.length===2"))
        check('unlocated conference stays in the schedule with a notice', page.locator('#schedule .event').count()==6 and '1' in page.locator('#unmapped').text_content())
        check('fixture starts with the earliest future deadline',page.locator('.spot-name').get_attribute('data-open')=='0')
        fallback = page.locator('.globe-tag.hot').evaluate("""card => {
          const logo=card.querySelector('.globe-tag-logo'), monogram=card.querySelector('.globe-tag-monogram');
          return {heading:card.querySelector('.globe-tag-heading').textContent,
            monogram:monogram?.textContent.trim(), visible:!!monogram && monogram.getClientRects().length>0 && getComputedStyle(monogram).display!=='none',
            noBrokenImage:!logo || !logo.getClientRects().length || logo.complete && logo.naturalWidth>0};
        }""")
        check('unknown conference uses a readable monogram without a broken image', fallback['heading'].startswith('First')
              and fallback['monogram'] and fallback['visible'] and fallback['noBrokenImage'], fallback)
        page.locator('#mode-deadline').click()
        later = datetime.fromisoformat(page.evaluate("CCF_DATA.events[0].deadlines[1].at").replace('Z', '+00:00')).astimezone(timezone(timedelta(hours=8)))
        page.locator('#year').select_option(str(later.year))
        page.locator(f'#months [data-month="{later.month}"]').click()
        page.evaluate('__qaOnSelect(__qaGlobe.locations[0].key)')
        check('city popup uses the deadline in the selected submission month', 'Paper deadline' in page.locator('#city-pop').text_content() and 'Abstract deadline' not in page.locator('#city-pop').text_content())
        page.locator('#mode-deadline').click(); page.locator('#year').select_option('upcoming'); page.locator('#months [data-month="0"]').click()
        page.evaluate('window.__clockOffset=180000');page.wait_for_timeout(1400)
        check('expired deadline advances highlight and never shows negative time',page.locator('.spot-name').get_attribute('data-open')=='1' and page.evaluate("__qaGlobe.locations.filter(p=>p.hot).every(p=>p.next.id==='1')") and '-' not in page.locator('.globe-tag.hot .globe-countdown').text_content())
        context.close()

        # A known abstract date and an unpublished paper date must keep separate scopes.
        context = browser.new_context(viewport={'width':1440,'height':1050})
        context.add_init_script(CAPTURE)
        context.add_init_script("const realNow=Date.now,start=realNow(),baseline=Date.parse('2026-06-01T00:00:00Z');Date.now=()=>baseline+realNow()-start;")
        def scope_fixture(route):
            specs = [
                ('mixed', 'Mixed', 2027, 'Paris, France', [('abstract', '2026-12-02T12:00:00Z'), ('paper', None)]),
                ('dated', 'Dated', 2028, 'Seattle, USA', [('paper', '2027-01-12T12:00:00Z')]),
                ('empty', 'Empty', 2027, 'Berlin, Germany', []),
                ('multiple', 'Multiple', 2027, 'Tokyo, Japan', [('abstract', None), ('paper', None)]),
                ('other', 'Other', 2028, 'London, UK', [('paper', None)]),
            ]
            records = [{'id':key,'title':title,'name':title,'year':year,'rank':'A','category':'AI',
                        'place':place,'date':f'May 1-3, {year}','start':f'{year}-05-01','end':f'{year}-05-03',
                        'link':'https://example.com/','deadlines':[{'type':kind,'at':at,'local':at or 'TBD','timezone':'UTC','round':1,'note':''} for kind,at in dates]}
                       for key,title,year,place,dates in specs]
            route.fulfill(content_type='text/javascript',body='window.CCF_DATA='+json.dumps({'events':records,'updatedAt':'2026-06-01T00:00:00Z'})+';')
        context.route(re.compile(r'/conferences\.js(?:\?.*)?$'), scope_fixture)
        page = context.new_page(); page.goto(args.url); ready(page); pause(page)
        check('mixed fixture initially opens in cross-year upcoming scope',
              page.locator('#year').input_value() == 'upcoming' and page.locator('#schedule [data-row="mixed"]').count() >= 1
              and page.locator('#schedule [data-row="dated"]').count() == 1)
        page.locator('#year').select_option('2026')
        check('selecting 2026 shows only the dated milestone in its submission year',
              page.locator('#schedule .event').count() == 1
              and page.locator('#schedule [data-row="mixed"] .deadline-text').text_content() != 'Deadline TBA')
        page.locator('#year').select_option('2027')
        ids = page.locator('#schedule .event').evaluate_all('es=>es.map(e=>e.dataset.row).sort()')
        check('undated conferences use their meeting year while dated milestones use submission year', ids == ['dated','empty','mixed','multiple'], ids)
        check('missing and multiple unknown dates create one TBA row per conference',
              all(page.locator(f'#schedule [data-row="{key}"]').count() == 1
                  and page.locator(f'#schedule [data-row="{key}"] .deadline-text').text_content() == 'Deadline TBA'
                  for key in ['mixed','empty','multiple']))
        check('TBA group and counts are separate from confirmed deadlines',
              'Deadlines to be announced' in page.locator('#schedule').text_content()
              and '1 deadline' in page.locator('#result-count').text_content()
              and '3 TBA' in page.locator('#result-count').text_content())
        check('a mixed TBA entry cannot borrow an out-of-scope future countdown',
              page.locator('.spot-name').get_attribute('data-open') == 'dated'
              and page.evaluate("__qaGlobe.locations.find(p=>p.name==='Paris').next===null && !__qaGlobe.locations.find(p=>p.name==='Paris').hot"))
        page.locator('#months [data-month="1"]').click()
        check('month filtering includes only confirmed milestones in that month',
              page.locator('#schedule .event').count() == 1 and page.locator('#schedule [data-row="dated"]').count() == 1)
        page.locator('#months [data-month="0"]').click(); page.locator('#year').select_option('2028')
        check('a year with only unpublished deadlines remains selectable without a fake countdown',
              page.locator('#schedule .event').count() == 1 and page.locator('#schedule [data-row="other"]').count() == 1
              and page.locator('.spot-name').count() == 0 and page.evaluate('__qaGlobe.locations.every(p=>!p.next && !p.hot)'))
        context.close()
        check_mobile_controls(browser, args.url, check, report['errors'], report['httpErrors'])
        check_fse_branding(browser, args.url, check, report['errors'], report['httpErrors'])
        browser.close()

    finish()


if __name__=='__main__':
    main()
