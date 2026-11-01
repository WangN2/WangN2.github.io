"""Calibration note: numerical UI, canvas rendering, local assets and mobile layout."""
import argparse, os
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
    context=browser.new_context(viewport={'width':1440,'height':1000})
    errors=[];failed=[];external=[]
    def local_only(route):
        u=urlparse(route.request.url)
        if (u.scheme,u.netloc)==(origin.scheme,origin.netloc):route.continue_()
        else:external.append(route.request.url);route.abort()
    context.route('**/*',local_only)
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None)
    page.goto(base+'/notes/calibration.html')
    assert page.locator('.calib-lab[data-ready=true]').count()==2
    he=page.locator('.handeye-lab');ti=page.locator('.timeoff-lab')
    def set_slider(root,name,value):
        node=root.locator(f'[data-in={name}]');node.fill(str(value));node.dispatch_event('input')
    def read(root,name):return root.locator(f'[data-read={name}]').inner_text()
    set_slider(he,'spread',0)
    assert read(he,'lmin')=='0.0000'
    assert read(he,'cond')=='∞'
    set_slider(he,'spread',90)
    assert float(read(he,'lmin'))>0.1
    ratio=read(he,'lmin');info=float(read(he,'info'))
    set_slider(he,'angle',15)
    assert read(he,'lmin')==ratio
    assert abs(float(read(he,'info'))-info/4)<.0002
    assert read(ti,'err')=='12.6 mm'
    set_slider(ti,'dt',-10);assert read(ti,'err')=='12.6 mm'
    set_slider(ti,'dt',0);assert read(ti,'err')=='0.0 mm'
    set_slider(ti,'dt',10)
    for canvas in page.locator('.calib-lab canvas').all():
        assert canvas.evaluate('c=>c.getContext("2d").getImageData(0,0,c.width,c.height).data.some(v=>v!==0)')
    for width in [1440,360]:
        page.set_viewport_size({'width':width,'height':1000})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        page.screenshot(path=str(out/f'calibration-{width}.png'),full_page=True)
    assert not errors,errors
    assert not failed,failed
    assert not external,external
    browser.close()
print('PASS: numerical controls, canvas, desktop/mobile layout, local assets, no page errors')
