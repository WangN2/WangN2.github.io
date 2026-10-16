import argparse, json, os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base-url',default='http://127.0.0.1:8778')
base=parser.parse_args().base_url.rstrip('/')
origin=urlparse(base)
out=Path('artifacts');out.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH'),headless=True)
    context=browser.new_context(viewport={'width':1280,'height':1000})
    external=[];errors=[];failed=[]
    def local_only(route):
        u=urlparse(route.request.url)
        if (u.scheme,u.netloc)==(origin.scheme,origin.netloc):route.continue_()
        else:external.append(route.request.url);route.abort()
    context.route('**/*',local_only)
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None)
    page.goto(base+'/index.html#notes')
    page.locator('a.article-card[href="./notes/collision-envelope.html"]').click()
    root=page.locator('#collision-explorer[data-ready=true]');root.wait_for()
    assert page.locator('[data-sphere] option').count()==22
    assert '41.2 cm' in page.locator('[data-detail]').inner_text()
    canvas=page.locator('canvas[data-scene]')
    assert canvas.evaluate("c=>{let n=0;const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n}")>5000
    # Stable silhouette catches camera zoom; a small tolerance permits GPU edge rounding.
    top=lambda:canvas.evaluate("c=>{const a=c.getContext('2d').getImageData(0,0,c.width,Math.floor(c.height*.3)).data;let s='';for(let i=3;i<a.length;i+=4)s+=a[i]>32?'1':'0';return s}")
    before=top()
    page.locator('[data-inflation]').select_option('0.16')
    assert '52.2 cm' in page.locator('[data-detail]').inner_text()
    after=top()
    assert len(before)==len(after)
    changed=sum(a!=b for a,b in zip(before,after))
    assert changed<=max(10,len(before)*.002), f'Upper-body silhouette changed: {changed} pixels'
    page.locator('[data-sphere]').select_option('8')
    arm=page.locator('[data-detail]').inner_text()
    page.locator('[data-inflation]').select_option('0.05')
    assert arm==page.locator('[data-detail]').inner_text()
    page.get_by_role('button',name='正面',exact=True).click()
    assert page.get_by_role('button',name='正面',exact=True).get_attribute('aria-pressed')=='true'
    canvas.scroll_into_view_if_needed()
    previous=canvas.evaluate('c=>c.toDataURL()')
    box=canvas.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+90,y+30,steps=10);page.mouse.up()
    assert previous!=canvas.evaluate('c=>c.toDataURL()')
    page.get_by_role('button',name='立体',exact=True).click()
    page.screenshot(path=str(out/'collision-desktop.png'),full_page=True)
    for width in [1280,360]:
        page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(150)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert canvas.bounding_box()['width']>200
        if width==360:page.screenshot(path=str(out/'collision-mobile.png'),full_page=True)
    page.reload();root.wait_for()
    assert page.locator('[data-sphere]').input_value()=='8'
    assert page.locator('[data-inflation]').input_value()=='0.05'
    assert '16.0 cm' in page.locator('[data-detail]').inner_text()
    page.get_by_role('link',name='回到笔记列表').click();assert page.url.endswith('#notes')
    assert not external,external
    assert not errors,errors
    assert not failed,failed
    context.close()
    for setup in ["Object.defineProperty(window,'localStorage',{get(){throw Error('denied')}})",
                  "localStorage.setItem('wangn2:g2-collision:v1','broken')",
                  "localStorage.setItem('wangn2:g2-collision:v1',JSON.stringify({version:1,selectedSphere:999,baseInflationCm:99,yaw:1e300,elev:1e300}))"]:
        context=browser.new_context();context.add_init_script(setup)
        page=context.new_page();page.goto(base+'/notes/collision-envelope.html')
        page.locator('#collision-explorer[data-ready=true]').wait_for()
        page.locator('[data-inflation]').select_option('0.16')
        assert '52.2 cm' in page.locator('[data-detail]').inner_text()
        context.close()
    for content in ['broken','{"version":1,"originalBaseInflation":0.16,"spheres":[]}']:
        context=browser.new_context()
        context.route('**/collision-spheres.json',lambda route,request,body=content:route.fulfill(status=200,content_type='application/json',body=body))
        page=context.new_page();page.goto(base+'/notes/collision-envelope.html')
        assert '加载失败' in page.get_by_role('alert').inner_text()
        assert page.locator('#collision-explorer').get_attribute('data-ready')=='false'
        context.close()
    context=browser.new_context();prefix=base+'/preview/'
    def prefixed(route):
        assert route.request.url.startswith(prefix)
        response=route.fetch(url=base+'/'+route.request.url[len(prefix):]);route.fulfill(response=response)
    context.route('**/*',prefixed)
    page=context.new_page();page.goto(prefix+'notes/collision-envelope.html')
    page.locator('#collision-explorer[data-ready=true]').wait_for()
    assert page.locator('[data-sphere] option').count()==22
    context.close();browser.close()
result={'sphere_count':22,'radius_comparison':'52.2 → 41.2 cm','unchanged_arm_geometry':'passed',
        'stable_camera_scale':'passed','rotation':'passed','desktop_mobile':'passed',
        'storage_fallback':'passed','load_error':'passed','preview_prefix':'passed','external_requests':external,'page_errors':errors}
(out/'collision-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
