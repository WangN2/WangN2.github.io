const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../site');
test('LingBot note has a bandwidth-conscious accessible local player',()=>{
 const f=path.join(root,'notes/lingbot-vla2.html'); assert.ok(fs.existsSync(f),'tutorial note exists');
 const s=fs.readFileSync(f,'utf8');
 assert.match(s,/<video[^>]*controls[^>]*preload="metadata"[^>]*playsinline/);
 assert.ok(!/<video[^>]*autoplay/.test(s));
 for(const f of ['lingbot-vla2-tutorial.mp4','poster.jpg','captions.vtt','transcript.md']) assert.ok(fs.statSync(path.join(root,'assets/lingbot-vla2',f)).size>100,f);
 assert.match(s,/<track kind="captions"[^>]*srclang="zh-CN"/);
 const times=[...s.matchAll(/data-time="([\d.]+)"/g)].map(m=>+m[1]);
 assert.equal(times.length,26);assert.equal(times[0],0);assert.ok(times.every((v,i)=>v<562&&(!i||v>times[i-1])));
 assert.match(s,/be969b8fd117fb70550c5d4bf4bc328211b5b1b6/);
});
test('chapter navigation seeks without forcing autoplay and ignores invalid timestamps',()=>{
 const file=path.join(root,'assets/lingbot-vla2/chapters.js');assert.ok(fs.existsSync(file),'chapter behavior exists');
 const source=fs.readFileSync(file,'utf8');
 let handler; const video={currentTime:0,focus(){},scrollIntoView(){}};
 const document={querySelector:s=>s==='[data-video-chapters]'?{addEventListener:(e,f)=>handler=f}:video};
 vm.runInNewContext(source,{document});
 handler({target:{closest:()=>({dataset:{time:'120'}})}});assert.equal(video.currentTime,120);
 handler({target:{closest:()=>({dataset:{time:'NaN'}})}});assert.equal(video.currentTime,120);
 assert.ok(!source.includes('.play('),'chapter click must not force playback');
});

test('chapter script is safe on pages without its elements',()=>{
 const source=fs.readFileSync(path.join(root,'assets/lingbot-vla2/chapters.js'),'utf8');
 assert.doesNotThrow(()=>vm.runInNewContext(source,{document:{querySelector:()=>null}}));
});
