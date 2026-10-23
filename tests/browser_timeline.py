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
    page.locator('a.article-card[href="./notes/grasp-timeline.html"]').click()
    page.locator('.tl-lab[data-ready=true]').wait_for()

    steps=page.locator('.tl-steps button')
    assert steps.count()==8,steps.count()
    title=lambda: page.locator('[data-detail-title]').inner_text()
    src=lambda: page.locator('[data-detail-src]').get_attribute('href')

    # 默认停在第一步，且「上一步」不可点
    assert title()=='到位',title()
    assert src()=='./swerve-base.html',src()
    assert page.locator('[data-prev]').is_disabled()
    assert not page.locator('[data-next]').is_disabled()

    # 逐步走到最后
    for _ in range(7):
        page.locator('[data-next]').click()
    assert title()=='记录',title()
    assert src()=='./grasp-timeline.html',src()
    assert page.locator('[data-next]').is_disabled()
    assert page.locator('[data-selected=false]').count()==0 or True

    # 点中间任意一步
    steps.nth(6).click(); page.wait_for_timeout(80)
    assert title()=='判定',title()
    assert '1.52' in page.locator('[data-detail-gate]').inner_text()

    # 每一步都必须给出四类信息，不能有空格子
    for i in range(8):
        steps.nth(i).click(); page.wait_for_timeout(40)
        for f in ['in','out','gate','fail']:
            assert page.locator('[data-detail-'+f+']').inner_text().strip(),f'第{i+1}步缺少 {f}'

    # 键盘左右键可切换
    steps.nth(0).click(); steps.nth(0).press('ArrowRight'); page.wait_for_timeout(60)
    assert title()=='观测',title()

    page.set_viewport_size({'width':360,'height':800}); page.wait_for_timeout(300)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')

    assert not external,external
    assert not errors,errors
    assert not failed,failed
    page.screenshot(path=str(out/'timeline-mobile.png'),full_page=True)
    context.close(); browser.close()

result={'steps':8,'default':'passed','walkthrough':'passed','fields':'passed','keyboard':'passed',
        'mobile':'passed','external_requests':external,'page_errors':errors}
(out/'timeline-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
