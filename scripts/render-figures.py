#!/usr/bin/env python3
"""Regenerate the two rendered figures in site/assets from the published model.

    python3 -m http.server 8765 --bind 127.0.0.1 --directory site &
    python3 scripts/render-figures.py --base-url http://127.0.0.1:8765

Outputs (overwritten in place, then checked by `npm test`):
  site/assets/hero-g2.webp   homepage hero still, transparent background
  site/assets/og.png         1200x630 link-preview card

Needs Playwright and a Chromium/Chrome binary (CHROME_PATH honours a local install).
The 3D still is rendered by the same Three.js build and the same model file the
demo uses, so the hero image can never drift away from what the laboratory shows.
"""
import argparse, base64, io, os, sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--base-url", default="http://127.0.0.1:8765")
parser.add_argument("--chrome", default=os.environ.get("CHROME_PATH"))
args = parser.parse_args()
base = args.base_url.rstrip("/")
root = Path(__file__).resolve().parent.parent
tmp = root / "site" / ".render-figures.html"

HERO_TEMPLATE = """<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:transparent;overflow:hidden}</style>
<script src="/assets/vendor/three-r128.min.js"></script>
<script src="/assets/g2/kinematics.cjs"></script>
<script>
(async()=>{
 const b64=await (await fetch('/assets/g2/model.b64')).text();
 const bytes=Uint8Array.from(atob(b64.trim()),c=>c.charCodeAt(0));
 const model=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
 const W=760,H=900;
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(30,W/H,.05,60);camera.up.set(0,0,1);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(2);renderer.setSize(W,H);renderer.outputEncoding=THREE.sRGBEncoding;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 document.body.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0x7c8fa1,.5));
 const key=new THREE.DirectionalLight(0xffffff,.9);key.position.set(3.5,-4.5,6);scene.add(key);
 const fill=new THREE.DirectionalLight(0xd7e6f5,.45);fill.position.set(-4.5,3.5,1.5);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xffffff,.55);rim.position.set(-1.5,4.5,-3);scene.add(rim);
 const tone=link=>/^(?:base_link|chassis_)/.test(link)?'#4b5763':/^gripper_/.test(link)?'#39434d':'#d9dfe5';
 // Same "arms down" preset the laboratory opens with.
 const q={...model.home};
 const members=g=>model.joints.filter(j=>j.type==='revolute'&&j.name.includes(g)).map(j=>j.name).sort();
 for(const side of ['left','right']){const ns=members(side==='left'?'_arm_l_':'_arm_r_');
  q[ns[0]]=side==='left'?1.5708:-1.5708;q[ns[1]]=-1.0472;q[ns[3]]=-.6981;}
 for(const g of model.grippers)Object.assign(q,g.samples[0].q);
 const f=G2K.fk(model,q,[0,0,0]);
 for(const mesh of model.meshes){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(mesh.vertices.flat(),3));
  g.setIndex(mesh.faces.flat());g.computeVertexNormals();
  const m=new THREE.MeshStandardMaterial({color:new THREE.Color(tone(mesh.link)).convertSRGBToLinear(),
   roughness:.62,metalness:.08,side:THREE.DoubleSide});
  const o=new THREE.Mesh(g,m);o.matrixAutoUpdate=false;o.matrix.set(...f.links[mesh.link]);scene.add(o);
 }
 const three=new THREE.Vector3(0,0,.9),az=0.45,el=0.08,dist=4.4;
 camera.position.set(three.x+dist*Math.cos(el)*Math.cos(az),three.y+dist*Math.cos(el)*Math.sin(az),three.z+dist*Math.sin(el));
 camera.lookAt(three);
 renderer.render(scene,camera);
 window.__figure=()=>{const c=renderer.domElement,gl=c.getContext('webgl2')||c.getContext('webgl');
  const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,px=new Uint8Array(w*h*4);
  gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);
  const c2=document.createElement('canvas');c2.width=w;c2.height=h;
  const x=c2.getContext('2d'),img=x.createImageData(w,h);
  for(let y=0;y<h;y++)img.data.set(px.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);
  x.putImageData(img,0,0);return c2.toDataURL('image/png');};
 window.__ready=true;
})();
</script>
"""

OG_TEMPLATE = """<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:system-ui,-apple-system,"PingFang SC","Noto Sans CJK SC",sans-serif;color:#19334d;
 background:radial-gradient(120% 140% at 100% 0%,#e3eef8 0%,#f7f9fc 55%,#f7f9fc 100%);display:flex;position:relative}
.grid-lines{position:absolute;inset:0;background-image:linear-gradient(#19334d0a 1px,transparent 1px),linear-gradient(90deg,#19334d0a 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(120% 90% at 20% 40%,#000 30%,transparent 78%)}
.left{position:relative;z-index:2;width:660px;padding:56px 0 48px 72px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:14px;font-size:20px;font-weight:750}
.mark{width:46px;height:46px;border-radius:13px;background:#19334d;color:#fff;display:grid;place-items:center;font-size:25px;letter-spacing:-.02em}
.sub{display:block;font-size:11px;font-weight:500;letter-spacing:.16em;color:#5d7083;margin-top:3px}
.eyebrow{margin-top:64px;font-size:12px;letter-spacing:.2em;font-weight:650;color:#5d7083}
h1{margin-top:20px;font-size:66px;line-height:1.16;letter-spacing:-.03em;font-weight:760}
h1 span{color:#176dae}
p.lead{margin-top:22px;font-size:21px;color:#3c5670;line-height:1.55}
.tags{margin-top:auto;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.tag{font-size:14px;color:#33506b;border:1px solid #c8d8e6;background:#ffffffc9;border-radius:999px;padding:6px 14px}
.url{margin-top:18px;font-size:15px;color:#5d7083;letter-spacing:.04em}
.figure{position:absolute;right:34px;bottom:0;height:600px;width:520px;display:flex;align-items:flex-end;justify-content:center;z-index:1}
.figure img{height:100%;width:auto;filter:drop-shadow(0 26px 44px #19334d29)}
.ring{position:absolute;right:-40px;bottom:120px;width:430px;height:430px;border-radius:50%;border:1px dashed #b9cfe1;opacity:.75}
.ring2{position:absolute;right:10px;bottom:170px;width:290px;height:290px;border-radius:50%;border:1px solid #cfe0ec;opacity:.8}
</style>
<div class="grid-lines"></div><div class="ring"></div><div class="ring2"></div>
<div class="left">
 <div class="brand"><span class="mark">W.</span><span>WangN2<span class="sub">机器人技术笔记</span></span></div>
 <div class="eyebrow">ROBOTICS · LEARNING IN MOTION</div>
 <h1>让机器人知识，<br><span>动起来。</span></h1>
 <p class="lead">在浏览器里操作 G2 全身模型<br>把运动学、碰撞与视觉定位变成可动手的实验</p>
 <div class="tags"><span class="tag">全身运动学</span><span class="tag">碰撞包络</span><span class="tag">AprilTag</span></div>
 <div class="url">wangn2.github.io</div>
</div>
<div class="figure"><img src="/assets/hero-g2.webp" alt=""></div>
</html>
"""


def main():
    from playwright.sync_api import sync_playwright
    from PIL import Image

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=args.chrome, headless=True,
                                        args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
            tmp.write_text(HERO_TEMPLATE, encoding="utf-8")
            esc = browser.new_context(viewport={"width": 760, "height": 900}, device_scale_factor=1)
            page = esc.new_page()
            page.goto(f"{base}/.render-figures.html")
            page.wait_for_function("window.__ready===true", timeout=30000)
            data = page.evaluate("window.__figure()").split(",", 1)[1]
            hero = Image.open(io.BytesIO(base64.b64decode(data))).convert("RGBA")
            esc.close()

            box = hero.getbbox()
            pad = 28
            hero = hero.crop((max(0, box[0] - pad), max(0, box[1] - pad),
                              min(hero.width, box[2] + pad), min(hero.height, box[3] + pad)))
            width = 620
            hero = hero.resize((width, round(width * hero.height / hero.width)), Image.LANCZOS)
            hero.save(root / "site/assets/hero-g2.webp", "WEBP", quality=86, method=6)

            tmp.write_text(OG_TEMPLATE, encoding="utf-8")
            ctx = browser.new_context(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
            page = ctx.new_page()
            page.goto(f"{base}/.render-figures.html", wait_until="networkidle")
            page.wait_for_timeout(400)
            page.screenshot(path=str(root / "site/assets/og.png"))
            ctx.close()
            browser.close()
    finally:
        tmp.unlink(missing_ok=True)

    for name in ("hero-g2.webp", "og.png"):
        size = (root / "site/assets" / name).stat().st_size
        print(f"site/assets/{name}: {size // 1024} KiB")


if __name__ == "__main__":
    sys.exit(main())
