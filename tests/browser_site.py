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
    f=page.frame_locator('#g2-demo')
    f.locator('[data-ready=true]').wait_for(timeout=30000)
    assert f.locator('#g2-preset').input_value()=='down'
    assert f.locator('[data-running=false]').count()==1
    # Nontransparent WebGL pixels establish actual rendering, not just a canvas tag.
    pixels=f.locator('canvas').evaluate("""c=>{
      const gl=c.getContext('webgl2')||c.getContext('webgl');
      const px=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
      gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,px);
      let n=0;for(let i=3;i<px.length;i+=4)if(px[i]>0)n++;return n;
    }""")
    assert pixels>5000,pixels
    # 卡片样式必须真的生效，而不只是标签还在（曾整段被误删过一次）
    card=page.locator('a.article-card').first
    assert card.evaluate("e=>getComputedStyle(e).backgroundColor")=='rgb(255, 255, 255)',card.evaluate("e=>getComputedStyle(e).backgroundColor")
    assert card.evaluate("e=>getComputedStyle(e).borderRadius")=='14px'
    assert '80px' in card.evaluate("e=>getComputedStyle(e).gridTemplateColumns")
    page.screenshot(path=str(out/'homepage-desktop.png'),full_page=True)
    for width in [1440,360]:
        page.set_viewport_size({'width':width,'height':1080})
        page.wait_for_timeout(400)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        child=page.frames[1]
        assert child.evaluate('document.documentElement.scrollWidth<=innerWidth')
        # Controls and footer must fit in the resized frame without an inner vertical scrollbar.
        assert child.evaluate('document.body.getBoundingClientRect().height<=innerHeight+1')
        height=page.locator('#g2-demo').evaluate('(e)=>e.getBoundingClientRect().height')
        page.wait_for_timeout(300)
        assert abs(height-page.locator('#g2-demo').evaluate('(e)=>e.getBoundingClientRect().height'))<1
        page.evaluate("""()=>{
         const w=document.querySelector('#g2-demo').contentWindow;
         for(const event of [
          {origin:location.origin,source:window,data:{type:'wangn2:g2:resize',height:5000}},
          {origin:'https://invalid.example',source:w,data:{type:'wangn2:g2:resize',height:5000}},
          {origin:location.origin,source:w,data:{type:'wangn2:g2:resize',height:Infinity}}
         ])window.dispatchEvent(new MessageEvent('message',event));
        }""")
        assert height==page.locator('#g2-demo').evaluate('(e)=>e.getBoundingClientRect().height')
        if width==360:page.screenshot(path=str(out/'homepage-mobile.png'),full_page=True)
    f.locator('#g2-preset').select_option('bent')
    f.locator('[data-move="0,0.05"]').click()
    f.locator('[data-running=false]').wait_for(timeout=30000)
    assert '到达 ·' in f.locator('#g2-status').inner_text()
    result=f.locator('#g2-error').inner_text()
    # Every group can resize the embed without clipping or height feedback.
    for group in ['head','gripper_l','base','right']:
        f.locator('#g2-group').select_option(group)
        page.wait_for_timeout(180)
        assert page.frames[1].evaluate('document.body.getBoundingClientRect().height<=innerHeight+1')
    page.get_by_role('link',name='独立大屏').click()
    page.locator('[data-ready=true]').wait_for(timeout=30000)
    page.get_by_role('link',name='返回主页').click()
    page.get_by_role('link',name='先读一篇入门笔记').click()
    assert '正运动学与雅可比' in page.locator('h1').inner_text()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.get_by_role('link',name='回到实验室，动手试试').click()
    assert page.url.endswith('#lab')
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
    page.frame_locator('#g2-demo').locator('[data-ready=true]').wait_for(timeout=30000)
    page.get_by_role('link',name='先读一篇入门笔记').click()
    page.wait_for_load_state('load')
    assert page.url.startswith(prefix+'notes/')
    assert all(url.startswith(prefix) for url in prefixed)
    context.close()
    browser.close()
result={'homepage_ik':result,'rendered_pixels':pixels,'external_requests':external,'page_errors':errors,
        'desktop_mobile_layout':'passed','resize_validation':'passed','storage_fallback':'passed','navigation':'passed'}
(out/'site-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
