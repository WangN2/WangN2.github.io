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
    page.locator('a.guide-teaser').click()
    host=page.locator('.guide-lab[data-ready=true]');host.wait_for()

    # 默认权重必须复现来源仓库的排序与分数
    rows=page.locator('[data-tbody] tr')
    assert rows.count()==18,rows.count()
    first=rows.first.inner_text()
    assert 'AgiBot 精灵G2' in first and '4.60' in first,first
    assert page.locator('[data-rank] li').count()==8

    # 只有通过门槛且可排名的型号进入排名：差速底盘不应出现在前八之外却挤进来
    ranked=page.locator('[data-rank] li .nm').all_inner_texts()
    assert all('暂无' not in n for n in ranked)

    # 权重一动，分数就要变；恢复后必须回到 4.60
    top=lambda: page.locator('[data-rank] li .sc').first.inner_text()
    assert top()=='4.60'
    page.locator('[data-w=force]').fill('40');page.locator('[data-w=force]').dispatch_event('input')
    page.wait_for_timeout(120)
    assert top()!='4.60','拉高力控权重后排名必须变化'
    page.get_by_role('button',name='恢复默认权重').click()
    assert top()=='4.60'

    # 搜索
    page.locator('[data-search]').fill('逐际')
    page.wait_for_timeout(120)
    n=rows.count()
    assert 1<=n<18,f'搜索应筛掉大部分行，实际 {n}'
    assert '逐际' in page.locator('[data-tbody]').inner_text()
    page.locator('[data-search]').fill('绝对不存在的型号')
    page.wait_for_timeout(120)
    assert page.locator('.guide-empty').count()==1
    page.locator('[data-search]').fill('')
    page.wait_for_timeout(120)
    assert rows.count()==18

    # 门槛筛选
    page.get_by_role('button',name='已通过门槛 2').click()
    page.wait_for_timeout(120)
    assert rows.count()==2,rows.count()
    page.get_by_role('button',name='全部 18').click()
    page.wait_for_timeout(120)
    assert rows.count()==18

    # 排序：点两次「单臂负载」应反转首行
    page.locator('th[data-sort=payload]').click();page.wait_for_timeout(120)
    a=rows.first.inner_text()
    page.locator('th[data-sort=payload]').click();page.wait_for_timeout(120)
    b=rows.first.inner_text()
    assert a!=b,'同一列点两次应反转排序'
    assert page.locator('th[data-sort=payload]').get_attribute('aria-sort') in ('ascending','descending')

    # 缩略图真的加载了
    imgs=page.locator('.guide-table img')
    if imgs.count():
        assert imgs.first.evaluate('i=>i.complete&&i.naturalWidth>0'),'缩略图未能加载'

    # 手机端不横向溢出，表格可横向滚动
    page.set_viewport_size({'width':360,'height':800});page.wait_for_timeout(300)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')

    assert not external,external
    assert not errors,errors
    assert not failed,failed
    page.screenshot(path=str(out/'guide-mobile.png'),full_page=True)
    context.close();browser.close()

result={'rows':18,'ranking':'passed','weights':'passed','search':'passed','filter':'passed','sort':'passed','mobile':'passed',
        'external_requests':external,'page_errors':errors}
(out/'guide-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
