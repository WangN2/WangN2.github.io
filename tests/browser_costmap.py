import argparse, json, os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser(); parser.add_argument('--base-url',default='http://127.0.0.1:8765')
base=parser.parse_args().base_url.rstrip('/'); origin=urlparse(base)
out=Path('artifacts'); out.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH'),headless=True)
    context=browser.new_context(viewport={'width':1280,'height':1000})
    external=[];errors=[];failed=[]
    def local_only(route):
        u=urlparse(route.request.url)
        if (u.scheme,u.netloc)==(origin.scheme,origin.netloc): route.continue_()
        else: external.append(route.request.url); route.abort()
    context.route('**/*',local_only)
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r: failed.append(r.url) if r.status>=400 else None)
    page.goto(base+'/index.html#notes')
    page.locator('a.article-card[href="./notes/costmap.html"]').click()
    page.locator('.cost-lab[data-ready=true]').wait_for()

    canvas=page.locator('canvas[data-canvas]')
    assert canvas.evaluate("c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n}")>10000
    verdict=lambda: page.locator('[data-read=verdict]').inner_text()
    cost=lambda: int(page.locator('[data-read=cost]').inner_text())

    # 默认位置在膨胀区：有代价但不是碰撞
    assert 0<cost()<253,cost()
    assert verdict()=='高代价·可行',verdict()

    # 点进障碍中心 → lethal
    canvas.scroll_into_view_if_needed();page.wait_for_timeout(200)
    box=canvas.bounding_box()
    k=min(box['width']/6.0, box['height']/4.0)
    ox=(box['width']-6.0*k)/2; oy=(box['height']-4.0*k)/2
    at=lambda x,y: (box['x']+ox+x*k, box['y']+oy+y*k)
    page.mouse.click(*at(1.5,0.95))
    page.wait_for_timeout(120)
    assert cost()==254,cost()
    assert verdict()=='碰撞',verdict()

    # 点进内切区 → 253
    page.mouse.click(*at(1.5,0.40))
    page.wait_for_timeout(120)
    assert cost()==253,cost()
    assert verdict()=='内切区·不可达',verdict()

    # 点回自由空间 → 0
    page.mouse.click(*at(5.6,3.7))
    page.wait_for_timeout(120)
    assert cost()==0,cost()
    assert verdict()=='自由空间',verdict()

    # 内切半径必须不超过膨胀半径：把膨胀调小，会被夹到内切值
    page.locator('[data-in=inflation]').fill('0.16');page.locator('[data-in=inflation]').dispatch_event('input')
    page.wait_for_timeout(120)
    assert page.locator('[data-out=inflation]').inner_text()=='0.28 m',page.locator('[data-out=inflation]').inner_text()

    page.set_viewport_size({'width':360,'height':800}); page.wait_for_timeout(300)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert canvas.evaluate("c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n}")>3000

    assert not external,external
    assert not errors,errors
    assert not failed,failed
    page.screenshot(path=str(out/'costmap-mobile.png'),full_page=True)
    context.close(); browser.close()

result={'canvas':'passed','lethal':'passed','inscribed':'passed','free':'passed','inflation':'passed',
        'mobile':'passed','external_requests':external,'page_errors':errors}
(out/'costmap-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
