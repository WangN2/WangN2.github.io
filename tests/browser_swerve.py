import argparse, json, os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base-url',default='http://127.0.0.1:8765')
base=parser.parse_args().base_url.rstrip('/')
origin=urlparse(base)
out=Path('artifacts');out.mkdir(exist_ok=True)

def row(page,n):
    return [c.inner_text() for c in page.locator('[data-body] tr').nth(n).locator('td').all()]

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
    page.locator('a.article-card[href="./notes/swerve-base.html"]').click()
    root=page.locator('.swerve-lab[data-ready=true]');root.wait_for()

    canvas=page.locator('canvas[data-canvas]')
    assert canvas.evaluate("c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n}")>4000

    # 纯前进：四轮同角、同速、不反转
    assert page.locator('[data-body] tr').count()==4
    front_left=row(page,0)
    assert front_left[1]=='0.0°',front_left
    assert front_left[2]=='2.857',front_left
    assert front_left[3]=='正常'

    # 纯横移：等价角被选成 −90°，轮速取反，底盘照样横着走
    page.locator('[data-in=vy]').fill('0.2');page.locator('[data-in=vy]').dispatch_event('input')
    page.locator('[data-in=vx]').fill('0');page.locator('[data-in=vx]').dispatch_event('input')
    lateral=row(page,0)
    assert abs(abs(float(lateral[1].rstrip('°')))-90)<0.11,lateral
    assert abs(abs(float(lateral[2]))-2.857)<0.01,lateral

    # 不许反转时，接近 −X 的指令必须被限位挡住，并且给出明确提示
    page.get_by_role('button',name='复位朝向').click()
    page.get_by_role('button',name='不许反转').click()
    page.locator('[data-in=vy]').fill('0');page.locator('[data-in=vy]').dispatch_event('input')
    page.locator('[data-in=vx]').fill('-0.3');page.locator('[data-in=vx]').dispatch_event('input')
    page.wait_for_timeout(100)
    blocked=[row(page,i)[3] for i in range(4)]
    assert all(s=='超出 ±170° 限位' for s in blocked),blocked
    assert page.locator('[data-status]').get_attribute('data-warn')=='true'
    assert '反转' in page.locator('[data-status]').inner_text()

    # 允许反转后同一个指令必须重新可用
    page.get_by_role('button',name='允许 180° 反转').click()
    page.locator('[data-in=vx]').fill('-0.2');page.locator('[data-in=vx]').dispatch_event('input')
    page.wait_for_timeout(100)
    assert page.locator('[data-status]').get_attribute('data-warn')=='false'
    for i in range(4):
        a=abs(float(row(page,i)[1].rstrip('°')))
        assert a<=170.3,f'wheel {i} outside steering limit: {a}'

    # 原地自转：四个模块速度应两两不同号
    page.locator('[data-in=vx]').fill('0');page.locator('[data-in=vx]').dispatch_event('input')
    page.locator('[data-in=w]').fill('0.3');page.locator('[data-in=w]').dispatch_event('input')
    page.wait_for_timeout(100)
    speeds=[float(row(page,i)[2]) for i in range(4)]
    assert any(s>0 for s in speeds) and any(s<0 for s in speeds),speeds

    # 手机端不横向溢出，画布重绘
    page.set_viewport_size({'width':360,'height':800});page.wait_for_timeout(300)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert canvas.evaluate("c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n}")>1500

    assert not external,external
    assert not errors,errors
    assert not failed,failed
    context.close();browser.close()

result={'forward':'passed','lateral':'passed','steer_limit':'passed','reverse_needed':'passed','spin':'passed',
        'mobile':'passed','external_requests':external,'page_errors':errors}
(out/'swerve-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
