import argparse, json, os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base-url',default='http://127.0.0.1:8765')
args=parser.parse_args()
base=args.base_url.rstrip('/')
origin=urlparse(base)
out=Path('artifacts');out.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH'),headless=True,
        args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    context=browser.new_context(viewport={'width':1440,'height':1080})
    external=[];errors=[];failed=[]
    def route(request):
        u=urlparse(request.request.url)
        if (u.scheme,u.netloc)==(origin.scheme,origin.netloc):request.continue_()
        else:external.append(request.request.url);request.abort()
    context.route('**/*',route)
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None)
    page.goto(base+'/index.html')
    assert page.locator('iframe').count()==0
    assert page.locator('.featured-grid a').count()==3
    page.screenshot(path=str(out/'homepage-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(out/'homepage-mobile.png'),full_page=True)
    page.locator('.featured-grid a[href*="g2-multi-agent"]').click()
    page.locator('.crumb [data-library]').click()
    page.locator('#query').fill('AprilTag')
    page.select_option('#topic','感知与定位')
    count=page.locator('.article-card:visible').count()
    page.locator('.article-card[href*="apriltag.html"]').click()
    page.locator('.crumb [data-library]').click()
    assert page.locator('#query').input_value()=='AprilTag'
    assert page.locator('.article-card:visible').count()==count
    page.goto(base+'/series/#engineering-route')
    page.locator('#engineering-route a[href*="tray-grasp"]').click()
    page.locator('[data-route="engineering"] a[href*="grasp-timeline"]').click()
    assert page.url.endswith('grasp-timeline.html?route=engineering')
    page.goto(base+'/index.html#lab')
    page.locator('#lab a[href*="/g2/"]').click()
    f=page
    f.locator('[data-ready=true]').wait_for(timeout=30000)
    # Nontransparent WebGL pixels establish actual rendering, not just a canvas tag.
    pixels=f.locator('canvas').evaluate("""c=>{
      const gl=c.getContext('webgl2')||c.getContext('webgl');
      const px=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
      gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,px);
      let n=0;for(let i=3;i<px.length;i+=4)if(px[i]>0)n++;return n;
    }""")
    assert pixels>5000,pixels
    f.locator('#g2-preset').select_option('bent')
    f.locator('[data-move="0,0.05"]').click()
    f.locator('[data-running=false]').wait_for(timeout=30000)
    assert '到达 ·' in f.locator('#g2-status').inner_text()
    result=f.locator('#g2-error').inner_text()
    assert not external,external
    assert not errors,errors
    assert not failed,failed
    context.close()
    # Denied storage and malformed stored JSON must not interrupt interaction.
    for setup in ["Object.defineProperty(window,'localStorage',{get(){throw Error('denied')}})",
                  "localStorage.setItem('wangn2:g2:v1','broken')"]:
        context=browser.new_context()
        context.add_init_script(setup)
        page=context.new_page();page.goto(base+'/demos/g2/')
        page.locator('[data-ready=true]').wait_for(timeout=30000)
        assert page.locator('#g2-preset').input_value()=='down'
        page.locator('#g2-nudge').click();page.locator('[data-running=false]').wait_for(timeout=10000)
        assert '一阶预测误差' in page.locator('#g2-error').inner_text()
        context.close()
    # Mount the same files under a preview prefix; relative assets must still resolve.
    context=browser.new_context()
    prefix=base+'/preview/'
    prefixed=[]
    def prefixed_route(route):
        url=route.request.url;prefixed.append(url)
        if not url.startswith(prefix):route.abort();return
        response=route.fetch(url=base+'/'+url[len(prefix):])
        route.fulfill(response=response)
    context.route('**/*',prefixed_route)
    page=context.new_page();page.goto(prefix+'index.html')
    page.locator('.featured-grid').wait_for()
    page.locator('.featured-grid a').first.click()
    page.wait_for_load_state('load')
    assert page.url.startswith(prefix+'notes/')
    assert all(url.startswith(prefix) for url in prefixed)
    context.close()
    browser.close()
result={'homepage_ik':result,'rendered_pixels':pixels,'external_requests':external,'page_errors':errors,
        'desktop_mobile_layout':'passed','route_navigation':'passed','storage_fallback':'passed','navigation':'passed'}
(out/'site-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
