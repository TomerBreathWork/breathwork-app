import {test,expect,type Page} from '@playwright/test';
import he from '../src/locales/he.json' with{type:'json'};
import en from '../src/locales/en.json' with{type:'json'};
import ja from '../src/locales/ja.json' with{type:'json'};
const locales={he,en,ja};
async function open(page:Page,language='en',voice=false,mock=false){
 await page.addInitScript(({language,voice,mock})=>{
  if(!sessionStorage.getItem('bee-test-seeded')){
   localStorage.setItem('breath-flow-language',language);localStorage.setItem('breath-flow-analytics-consent','denied');
   localStorage.setItem('still-settings',JSON.stringify({preset:'custom',practiceId:'custom',rhythm:[6.5,1.5,8,.5],customRhythm:[6.5,1.5,8,.5],minutes:7,sound:'silent',volume:.6,audioOutputVersion:1,background:'photo-2'}));
   localStorage.setItem('breath-flow-kids-settings',JSON.stringify({version:1,flowerCandle:{rhythm:[4,0,8,0],minutes:3}}));
   localStorage.setItem('breath-flow-flower-candle-introduction',JSON.stringify({version:1,he:{enabled:false,acknowledged:true}}));
   if(!voice)localStorage.setItem('breath-flow-bee-introduction',JSON.stringify({version:1,he:{enabled:false}}));
   sessionStorage.setItem('bee-test-seeded','yes');
  }
  const w=window as any,NativeAudio=window.Audio;w.voiceAudios=[];w.Audio=function(src:string){const a=new NativeAudio(src);w.voiceAudios.push(a);return a;};w.Audio.prototype=NativeAudio.prototype;
  if(mock)HTMLMediaElement.prototype.play=function(){return Promise.resolve();};
 },{language,voice,mock});
 await page.goto('./');await page.locator('.explore-choice').click();
}
async function bee(page:Page,language='en'){
 const t=locales[language as keyof typeof locales];await page.getByRole('button',{name:t.categoryKids,exact:true}).click();await page.locator('[data-practice="bee-breathing"]').click();await expect(page.locator('[data-practice-detail="bee-breathing"]')).toBeVisible();
}
async function slider(page:Page,index:number,n:number){await page.locator(`#bee-phase-${index}`).focus();await page.keyboard.press('Home');for(let i=index===0?2:4;i<n;i++)await page.keyboard.press('ArrowRight');}
async function pose(page:Page){return page.locator('.bee-flyer').evaluate(n=>({left:parseFloat((n as HTMLElement).style.left),top:parseFloat((n as HTMLElement).style.top)}));}
for(const [language,t]of Object.entries(locales))for(const [width,height]of [[320,568],[360,640],[375,667],[390,844]])test(`${language} ${width}: Kids order, three steps, parent guidance and independent sliders`,async({page})=>{
 await page.setViewportSize({width,height});await page.clock.install();await open(page,language);await expect(page.locator('.category-filters button')).toHaveCount(4);await expect(page.locator('.practice-card')).toHaveCount(7);await expect(page.locator('.kids-group-title')).toHaveCount(1);
 await page.getByRole('button',{name:t.categoryKids,exact:true}).click();await expect(page.locator('.practice-card')).toHaveCount(2);expect(await page.locator('.practice-card').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-practice')))).toEqual(['flower-candle','bee-breathing']);
 await page.locator('[data-practice="bee-breathing"]').click();await expect(page.locator('.kids-step')).toHaveCount(3);
 for(const title of [t.beeStep1Title,t.beeStep2Title,t.beeStep3Title])await expect(page.locator('.kids-steps')).toContainText(title);
 await expect(page.locator('.app-page')).toHaveAttribute('dir',language==='he'?'rtl':'ltr');
 await page.locator('.kids-parent-information summary').click();await expect(page.locator('.kids-parent-information p')).toHaveText(t.beeParentBody);
 await page.locator('.kids-practice-settings summary').click();await expect(page.locator('input[type="range"]')).toHaveCount(2);
 for(const [index,min,max,value]of [[0,'2','6','3'],[2,'4','12','5']]){
  const input=page.locator(`#bee-phase-${index}`);await expect(input).toHaveAttribute('min',min);await expect(input).toHaveAttribute('max',max);await expect(input).toHaveAttribute('step','1');await expect(input).toHaveValue(value);
 }
 await expect(page.locator('#duration')).toHaveValue('1');await expect(page.locator('#phase-value-1,#phase-value-3')).toHaveCount(0);
 if(language!=='he')await expect(page.getByLabel(t.kidsVoice)).toHaveCount(0);
 for(const node of await page.locator('.kids-step p,.kids-parent-information p,#bee-phase-0,#bee-phase-2,#duration,.start-button').all()){await node.scrollIntoViewIfNeeded();await expect(node).toBeInViewport();}
 expect(await page.locator('.app-page').evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(1);
 if(language==='ja')for(const heading of await page.locator('.kids-step h3').all()){
  const fit=await heading.evaluate(n=>({h:n.clientHeight,line:parseFloat(getComputedStyle(n).lineHeight),w:n.clientWidth,scroll:n.scrollWidth}));expect(fit.h).toBeLessThanOrEqual(fit.line+2);expect(fit.scroll).toBeLessThanOrEqual(fit.w+1);
 }
 await page.locator('.start-button').click();await page.clock.runFor(3500);
 for(const extra of [0,3000]){
  if(extra)await page.clock.runFor(extra);
  const size=await page.locator('.app-page').evaluate(n=>({h:n.clientHeight,sh:n.scrollHeight,w:n.clientWidth,sw:n.scrollWidth}));expect(size.sh).toBeLessThanOrEqual(size.h+1);expect(size.sw).toBeLessThanOrEqual(size.w+1);
  await expect(page.getByRole('button',{name:t.stop,exact:true})).toBeInViewport();
 }

});
for(const seconds of[4,5,6,7,8,9,10,11,12])test(`${seconds}s exhale: one complete figure eight and a stable pause`,async({page})=>{
 await page.clock.install();await page.setViewportSize({width:320,height:568});await open(page);await bee(page);await page.locator('.kids-practice-settings summary').click();await slider(page,2,seconds);await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+60000));
 await page.locator('.start-button').click();await page.clock.runFor(6000);let previous=0;
 for(const [progress,x]of [[.25,82],[.5,50],[.75,18]]){
  await page.clock.runFor((progress-previous)*seconds*1000);previous=progress;expect(Math.abs((await pose(page)).left-x)).toBeLessThan(1);
  const boxes=await page.locator('.bee-flyer').evaluate(n=>{const bee=n.getBoundingClientRect(),circle=document.querySelector('.breath-circle')!.getBoundingClientRect(),count=document.querySelector('.phase-count')!.getBoundingClientRect();return{bee:bee.toJSON(),circle:circle.toJSON(),count:count.toJSON()};});
  expect(boxes.bee.left).toBeGreaterThan(boxes.circle.left);expect(boxes.bee.right).toBeLessThan(boxes.circle.right);expect(boxes.bee.bottom).toBeLessThan(boxes.count.top);
 }
 await page.getByRole('button',{name:en.pause,exact:true}).click();const frozen=await pose(page);await page.clock.runFor(5000);expect(await pose(page)).toEqual(frozen);
 await page.getByRole('button',{name:en.resume,exact:true}).click();await expect(page.locator('.breath-circle')).toHaveAttribute('data-status','running');await page.clock.runFor(seconds*250+32);await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase','0');expect((await pose(page)).left).toBeCloseTo(50,5);
 await page.getByRole('button',{name:en.restart,exact:true}).click();await expect(page.locator('.bee-flyer')).toHaveCount(0);await expect(page.locator('.phase-count')).toHaveText('3');
});
test('separate profiles survive reload and switching to Flower or adult Custom',async({page})=>{
 await open(page);const adult=await page.evaluate(()=>localStorage.getItem('still-settings'));const flower=await page.evaluate(()=>localStorage.getItem('breath-flow-kids-settings'));await bee(page);await page.locator('.kids-practice-settings summary').click();await slider(page,0,6);await slider(page,2,10);await page.locator('#duration').fill('2');
 expect(await page.evaluate(()=>localStorage.getItem('still-settings'))).toBe(adult);expect(await page.evaluate(()=>localStorage.getItem('breath-flow-kids-settings'))).toBe(flower);
 await page.reload();await page.locator('.explore-choice').click();await bee(page);await page.locator('.kids-practice-settings summary').click();await expect(page.locator('#bee-phase-0')).toHaveValue('6');await expect(page.locator('#bee-phase-2')).toHaveValue('10');await expect(page.locator('#duration')).toHaveValue('2');
 await page.locator('.discovery-back').click();await page.locator('[data-practice="flower-candle"]').click();await page.locator('.kids-practice-settings summary').click();await expect(page.locator('#kids-inhale')).toHaveValue('4');await expect(page.locator('#duration')).toHaveValue('3');
 await page.locator('.discovery-back').click();await page.locator('.discovery-back').click();await page.locator('[data-home-choice="custom"]').click();await expect(page.locator('#phase-value-0')).toHaveValue('6.5');await expect(page.locator('#duration')).toHaveValue('7');
});
test('complete cycles, protected Back, Stay, End and stale Forward reuse the existing lifecycle',async({page})=>{
 await page.clock.install();await open(page);await bee(page);await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+60000));await page.locator('.start-button').click();await expect(page.locator('.remaining-value')).toHaveText('01:04');await page.clock.runFor(4000);
 await page.goBack();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:en.stayInPractice,exact:true}).click();await expect(page.getByRole('button',{name:en.resume,exact:true})).toBeVisible();
 await page.getByRole('button',{name:en.resume,exact:true}).click();await page.clock.fastForward(65000);await page.clock.runFor(32);await expect(page.locator('.bee-details')).toBeVisible();await page.goForward();await expect(page.locator('.session-panel')).toHaveCount(0);
 await page.locator('.start-button').click();await page.goBack();await page.getByRole('button',{name:en.endPractice,exact:true}).click();await expect(page.locator('.bee-details')).toBeVisible();
});
for(const language of ['he','en','ja'])test(`${language}: enlarged text and reduced motion stay operable`,async({page})=>{
 await page.setViewportSize({width:320,height:568});await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install();await open(page,language);await bee(page,language);await page.locator('.start-button').click();await page.clock.runFor(7000);expect(await pose(page)).toEqual({left:50,top:50});await expect(page.locator('.bee-flight-guide')).toHaveCount(0);
 await page.getByRole('button',{name:locales[language as keyof typeof locales].stop,exact:true}).click();await page.addStyleTag({content:'html{font-size:32px!important}'});await page.locator('.kids-parent-information summary').click();await page.locator('.kids-practice-settings summary').click();
 for(const el of await page.locator('.kids-step p,#bee-phase-0,#bee-phase-2,.start-button').all()){await el.scrollIntoViewIfNeeded();await expect(el).toBeInViewport();}
 expect(await page.locator('.app-page').evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(1);
});
test('Bee Hebrew narration uses its own acknowledgment and confirmed three-step cues',async({page})=>{
 await page.clock.install();await open(page,'he',true,true);await bee(page,'he');await expect(page.getByLabel(he.kidsVoice)).toBeChecked();await page.locator('.start-button').click();await page.clock.runFor(10000);await expect(page.locator('.session-panel')).toHaveCount(0);
 for(const [at,cue]of [[0,'balanced'],[3,'inhale'],[7,'ears'],[13,'hum'],[29,'balanced']]){
  await page.evaluate(at=>{const a=(window as any).voiceAudios.at(-1);Object.defineProperty(a,'currentTime',{value:at,writable:true,configurable:true});a.dispatchEvent(new Event('timeupdate'));},at);await expect(page.locator('.kids-steps')).toHaveAttribute('data-narration-cue',cue);
 }
 await page.getByRole('button',{name:he.kidsSkipIntroduction,exact:true}).click();await expect(page.locator('.phase-count')).toHaveText('3');await page.getByRole('button',{name:he.stop,exact:true}).click();await page.getByRole('button',{name:he.kidsReplayIntroduction,exact:true}).click();
 await page.evaluate(()=>(window as any).voiceAudios.at(-1).dispatchEvent(new Event('ended')));await expect(page.locator('.bee-details')).toBeVisible();await expect(page.locator('.session-panel')).toHaveCount(0);
});

test('leaving Bee narration or changing language cancels stale audio callbacks',async({page})=>{
 await open(page,'he',true,true);await bee(page,'he');await page.locator('.start-button').click();await page.goBack();
 await page.evaluate(()=>(window as any).voiceAudios.at(-1).dispatchEvent(new Event('ended')));await expect(page.locator('.practice-list')).toBeVisible();await expect(page.locator('.session-panel')).toHaveCount(0);
 await page.locator('[data-practice="bee-breathing"]').click();await page.locator('.start-button').click();await page.locator('.language-picker select').selectOption('ja');
 await page.evaluate(()=>(window as any).voiceAudios.at(-1).dispatchEvent(new Event('ended')));await expect(page.getByLabel(ja.kidsVoice)).toHaveCount(0);await expect(page.locator('.session-panel')).toHaveCount(0);await page.locator('.start-button').click();await expect(page.locator('.phase-count')).toHaveText('3');
});
