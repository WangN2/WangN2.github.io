import argparse, os
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:8765')
parser.add_argument('--errors-only', action='store_true')
args = parser.parse_args()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROME_PATH'), headless=True,
        args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    for failure in ['webgl', 'decompression', 'model']:
        context = browser.new_context()
        if failure == 'webgl':
            context.add_init_script("HTMLCanvasElement.prototype.getContext=()=>null")
        elif failure == 'decompression':
            context.add_init_script("window.DecompressionStream=undefined")
        else:
            def corrupt(route):
                response = route.fetch()
                import re
                body = re.sub(r'(<script[^>]+id="g2-model">)[^<]+', r'\1broken', response.text())
                route.fulfill(response=response, body=body)
            context.route('**/demos/g2/', corrupt)
        page = context.new_page()
        page.goto(args.base_url + '/demos/g2/')
        alert = page.get_by_role('alert')
        alert.wait_for(timeout=10000)
        assert '加载失败' in alert.inner_text(), failure
        assert page.locator('#g2-whole-learning').get_attribute('data-ready') != 'true'
        context.close()
    if not args.errors_only:
        import json
        from pathlib import Path
        here = Path('artifacts'); here.mkdir(exist_ok=True)
        page=browser.new_page(viewport={'width':1040,'height':1400})
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.on('requestfailed',lambda r: print('REQUEST FAILED',r.url,r.failure,flush=True))
        page.goto(args.base_url+'/demos/g2/',wait_until='domcontentloaded')
        f=page
        f.locator('#g2-whole-learning[data-ready=true]').wait_for(timeout=30000)
        page.screenshot(path=str(here/'preview.png'),full_page=True)
        def done():
            f.locator('#g2-whole-learning[data-running=false]').wait_for(timeout=30000)
        def slider(i,value):
            f.locator('#g2-joints input').nth(i).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input"));e.dispatchEvent(new Event("change"));}',str(value))
        outcomes={}
        for side in ['left','right']:
            f.locator('#g2-preset').select_option('bent')
            f.locator('#g2-group').select_option(side)
            assert f.locator('#g2-joints input').count()==7
            f.locator('[data-move="0,0.05"]').click()
            done()
            outcomes[side]=f.locator('#g2-status').inner_text()+' '+f.locator('#g2-error').inner_text()
            assert '到达 ·' in outcomes[side],outcomes[side]
            assert '目标误差' in f.locator('#g2-error').inner_text(), 'state echo erased completed motion evidence'
        f.locator('#g2-group').select_option('body')
        assert f.locator('#g2-joints input').count()==5
        before=f.locator('#g2-position').inner_text()
        slider(4,20)
        assert before!=f.locator('#g2-position').inner_text()
        f.locator('#g2-group').select_option('head')
        assert f.locator('#g2-joints input').count()==3
        before=f.locator('#g2-position').inner_text()
        slider(0,30)
        assert before==f.locator('#g2-position').inner_text()
        assert '0.000 / 0.000 / 0.000' in f.locator('#g2-column').inner_text()
        for side in ['l','r']:
            f.locator('#g2-group').select_option('gripper_'+side)
            assert f.locator('#g2-joints input').count()==0
            assert not f.locator('#g2-actions').is_visible()
            f.locator('#g2-grip').fill('90')
            assert '45.0°' in f.locator('#g2-grip-value').inner_text()
            f.locator('#g2-close').click()
            page.screenshot(path=str(here/f'gripper-{side}.png'),full_page=True)
        f.locator('#g2-preset').select_option('down')
        f.locator('#g2-group').select_option('base')
        f.locator('[data-base="0,0.2,0"]').click()
        done()
        outcomes['base']=f.locator('#g2-wheel-values').inner_text()
        assert '0.00 / 0.20 m' in outcomes['base'],outcomes['base']
        f.locator('[data-base="0,0,0.2617993878"]').click()
        done()
        assert '15.0°' in f.locator('#g2-wheel-values').inner_text()
        # Rapid action replacement and stop must leave no stale animation loop.
        f.locator('[data-base="0.2,0,0"]').click()
        f.locator('[data-base="0,-0.2,0"]').click()
        f.locator('#g2-stop').click()
        stopped=f.locator('#g2-position').inner_text()
        page.wait_for_timeout(500)
        assert stopped==f.locator('#g2-position').inner_text()
        f.locator('#g2-preset').select_option('down')
        f.locator('#g2-group').select_option('left')
        page.set_viewport_size({'width':360,'height':1450})
        page.wait_for_timeout(300)
        frame=page.main_frame
        assert frame.evaluate('document.documentElement.scrollWidth<=window.innerWidth'), 'mobile overflow'
        page.screenshot(path=str(here/'preview-mobile.png'),full_page=True)
        page.evaluate("""localStorage.setItem('wangn2:g2:v1',JSON.stringify({version:2,q:{},base:[10.2,0,10.2],group:'base',tool:'gripper_l_center_link',selected:0,preset:'bent'}))""")
        page.reload()
        f.locator('#g2-whole-learning[data-ready=true]').wait_for(timeout=30000)
        restore_failures=[]
        if '10.20 / 0.00 m / 584.4°' not in f.locator('#g2-wheel-values').inner_text():restore_failures.append('restored base pose was clamped')
        if f.locator('#g2-preset').input_value()!='bent':restore_failures.append('preset selection not restored')
        assert not restore_failures,restore_failures
        assert page.evaluate("THREE.REVISION")=='128'
        assert not errors,errors
        outcomes['browser_errors']=errors
        (here/'browser-results.json').write_text(json.dumps(outcomes,ensure_ascii=False,indent=2))
        print(json.dumps(outcomes,ensure_ascii=False,indent=2))
    browser.close()
print('PASS: WebGL, decompression and corrupt-model failures are visible in Chinese')
