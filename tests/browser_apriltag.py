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

def set_range(locator,value):
    locator.evaluate("(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}",value)

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH'),headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1080})
    external=[];errors=[];failed=[]
    def route(request):
        url=urlparse(request.request.url)
        if (url.scheme,url.netloc)==(origin.scheme,origin.netloc):request.continue_()
        else:external.append(request.request.url);request.abort()
    context.route('**/*',route)
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:failed.append(r.url) if r.status>=400 else None)
    page.goto(base+'/demos/apriltag/index.html')
    lab=page.locator('#apriltag-lab')
    page.locator('#apriltag-lab[data-ready=true]').wait_for(timeout=10000)
    assert lab.get_attribute('data-decode-id')=='0'
    assert lab.get_attribute('data-hamming')=='0'
    pixels=page.locator('#tag-canvas').evaluate("""c=>{
      const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let dark=0,light=0;
      for(let i=0;i<d.length;i+=4){if(d[i]<30)dark++;if(d[i]>240)light++;}return {dark,light};
    }""")
    assert pixels['dark']>1000 and pixels['light']>1000,pixels

    page.locator('#tag-rotate').click()
    assert lab.get_attribute('data-decode-id')=='0'
    assert lab.get_attribute('data-hamming')=='0'
    assert '270°' in page.locator('#decode-rotation').inner_text()
    page.locator('.bit-cell').first.click()
    assert lab.get_attribute('data-hamming')=='1'
    assert lab.get_attribute('data-decode-accepted')=='true'
    assert page.locator('.bit-cell.changed').count()==1
    set_range(page.locator('#hamming-limit'),0)
    assert page.locator('#decode-status').inner_text()=='拒绝'
    set_range(page.locator('#hamming-limit'),5)
    page.locator('#tag-reset').click()
    assert lab.get_attribute('data-hamming')=='0'
    page.locator('#error-count').select_option('5')
    page.locator('#tag-corrupt').click()
    assert lab.get_attribute('data-decode-id')=='0'
    assert lab.get_attribute('data-hamming')=='5'
    assert lab.get_attribute('data-decode-accepted')=='true'
    page.locator('#tag-id').fill('42')
    assert lab.get_attribute('data-decode-id')=='42'
    assert lab.get_attribute('data-hamming')=='0'

    assert float(lab.get_attribute('data-position-error'))<.001
    assert float(lab.get_attribute('data-reprojection-error'))<.001
    set_range(page.locator('#pose-z'),80)
    assert abs(float(lab.get_attribute('data-pose-z'))-.8)<1e-9
    assert '0.800' in page.locator('#truth-position').inner_text()
    set_range(page.locator('#pose-noise'),20)
    first_noise=lab.get_attribute('data-position-error')
    page.locator('#pose-reseed').click()
    second_noise=lab.get_attribute('data-position-error')
    assert first_noise!=second_noise
    page.locator('#pose-play').click()
    page.locator('#pose-play[data-running=true]').wait_for()
    rz=page.locator('#pose-rz').input_value()
    page.wait_for_timeout(250)
    assert page.locator('#pose-rz').input_value()!=rz
    page.locator('#pose-play').click()
    assert page.locator('#pose-play').get_attribute('data-running')=='false'
    page.locator('#pose-reset').click()
    assert page.locator('#pose-z-value').inner_text()=='0.90 m'
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(out/'apriltag-desktop.png'),full_page=True)

    page.set_viewport_size({'width':360,'height':1000})
    page.wait_for_timeout(200)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(out/'apriltag-mobile.png'),full_page=True)

    page.goto(base+'/notes/apriltag.html')
    assert 'AprilTag 视觉定位详解' in page.locator('h1').inner_text()
    assert page.locator('a[href="../demos/apriltag/index.html"]').count()>=2
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.goto(base+'/index.html#notes')
    page.locator('a[href="./notes/apriltag.html"]').click()
    assert page.url.endswith('/notes/apriltag.html')
    page.locator('a[href="../demos/apriltag/index.html"]').first.click()
    page.locator('#apriltag-lab[data-ready=true]').wait_for(timeout=10000)

    assert not external,external
    assert not errors,errors
    assert not failed,failed
    context.close();browser.close()

result={'canvas_pixels':pixels,'decode_rotation_hamming_threshold':'passed','pose_noise_animation':'passed',
        'desktop_mobile_layout':'passed','navigation':'passed','external_requests':external,'page_errors':errors}
(out/'apriltag-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
