import argparse, json, os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base-url',default='http://127.0.0.1:8765')
base=parser.parse_args().base_url.rstrip('/')
origin=urlparse(base)
out=Path('artifacts');out.mkdir(exist_ok=True)

def opacity(canvas):
    return canvas.evaluate("c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n}")

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
    page.locator('a.article-card[href="./notes/tray-grasp.html"]').click()
    root=page.locator('.tray-lab[data-ready=true]');root.wait_for()

    canvas=page.locator('canvas[data-canvas]')
    assert opacity(canvas)>4000,'canvas must actually draw the tray'
    assert '锁定' in page.locator('[data-read=rollout]').inner_text()

    # Sliders must move the readouts, not just the picture.
    center_before=page.locator('[data-read=center]').inner_text()
    page.locator('[data-in=yaw]').fill('-30');page.locator('[data-in=yaw]').dispatch_event('input')
    page.locator('[data-in=tilt]').fill('9');page.locator('[data-in=tilt]').dispatch_event('input')
    axis=page.locator('[data-read=axis]').inner_text()
    assert abs(float(axis.split(' / ')[2]))>0.1,'tilting the bore must change the reported axis'
    assert page.locator('[data-out=yaw]').inner_text()=='-30°'
    assert page.locator('[data-read=center]').inner_text()==center_before

    # The whole point: copying the observed pose imports the roll, locking does not.
    groove_locked=page.locator('[data-read=groove]').inner_text()
    page.get_by_role('button',name='照抄观测 · 带滚转').click()
    page.locator('[data-in=roll]').fill('135');page.locator('[data-in=roll]').dispatch_event('input')
    assert '135°' in page.locator('[data-read=rollout]').inner_text()
    assert page.locator('[data-status]').get_attribute('data-copy')=='true'
    assert '带走' in page.locator('[data-status]').inner_text()
    page.get_by_role('button',name='最小旋转 · 锁滚转').click()
    assert '锁定' in page.locator('[data-read=rollout]').inner_text()
    # Roll must never move the target itself: it is a rotation about the bore axis.
    assert page.locator('[data-read=groove]').inner_text()==groove_locked

    # Dragging the tray must transport the stations without changing the bore direction.
    canvas.scroll_into_view_if_needed();page.wait_for_timeout(200)
    box=canvas.bounding_box()
    page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
    page.mouse.down();page.mouse.move(box['x']+box['width']/2+60,box['y']+box['height']/2+30,steps=6);page.mouse.up()
    assert page.locator('[data-read=center]').inner_text()!=center_before,'dragging must translate the tray'
    assert page.locator('[data-read=axis]').inner_text()==axis,'translation must not rotate the bore'
    page.get_by_role('button',name='复位料盘').click()
    assert page.locator('[data-read=center]').inner_text()=='0.800 / 0.100 / 1.100 m'

    # Mobile: no horizontal overflow, controls stay reachable.
    page.set_viewport_size({'width':360,'height':800})
    page.wait_for_timeout(300)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert opacity(canvas)>2000,'canvas must redraw after resize'
    page.screenshot(path=str(out/'tray-grasp-mobile.png'),full_page=True)

    assert not external,external
    assert not errors,errors
    assert not failed,failed
    context.close();browser.close()

result={'canvas':'passed','sliders':'passed','roll_lock':'passed','drag':'passed','mobile':'passed',
        'external_requests':external,'page_errors':errors}
(out/'tray-grasp-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
