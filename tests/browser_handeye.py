import argparse, json, os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base-url',default='http://127.0.0.1:8765')
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
    page.on('response',lambda r: failed.append(r.url) if r.status>=400 else None)
    page.goto(base+'/index.html#notes')
    page.locator('a.article-card[href="./notes/hand-eye.html"]').click()
    root=page.locator('.eye-lab[data-ready=true]');root.wait_for()

    canvas=page.locator('canvas[data-canvas]')
    assert canvas.evaluate("c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n}")>2000

    gap=lambda: page.locator('[data-read=gap]').inner_text()
    verdict=lambda: page.locator('[data-read=verdict]').inner_text()

    # 无误差时两条路径必须重合
    assert gap()=='0.0 mm / 0.0°',gap()
    assert verdict()=='一致',verdict()

    # 只加角度误差：平移残差仍为 0，角度残差等于输入
    page.locator('[data-in=dth]').fill('3');page.locator('[data-in=dth]').dispatch_event('input')
    page.wait_for_timeout(120)
    assert gap()=='0.0 mm / 3.0°',gap()
    assert verdict()=='明显分叉'

    # 只加平移误差：角度残差回到 0，平移残差等于输入
    page.locator('[data-in=dth]').fill('0');page.locator('[data-in=dth]').dispatch_event('input')
    page.locator('[data-in=dt]').fill('22');page.locator('[data-in=dt]').dispatch_event('input')
    page.wait_for_timeout(120)
    assert gap()=='22.0 mm / 0.0°',gap()

    # 改变机器人姿态不应自己产生残差
    page.locator('[data-in=dt]').fill('0');page.locator('[data-in=dt]').dispatch_event('input')
    page.locator('[data-in=ax]').fill('0.55');page.locator('[data-in=ax]').dispatch_event('input')
    page.locator('[data-in=ath]').fill('120');page.locator('[data-in=ath]').dispatch_event('input')
    page.wait_for_timeout(150)
    assert gap()=='0.0 mm / 0.0°',gap()

    # 相机观测读数随姿态变化
    b1=page.locator('[data-read=b]').inner_text()
    page.locator('[data-in=ath]').fill('-60');page.locator('[data-in=ath]').dispatch_event('input')
    page.wait_for_timeout(150)
    assert page.locator('[data-read=b]').inner_text()!=b1,'相机观测应随末端姿态变化'

    page.set_viewport_size({'width':360,'height':800});page.wait_for_timeout(300)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert canvas.evaluate("c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n}")>800

    assert not external,external
    assert not errors,errors
    assert not failed,failed
    page.screenshot(path=str(out/'hand-eye-mobile.png'),full_page=True)
    context.close();browser.close()

result={'canvas':'passed','zero_error':'passed','angle_only':'passed','translation_only':'passed',
        'pose_independence':'passed','mobile':'passed','external_requests':external,'page_errors':errors}
(out/'hand-eye-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
