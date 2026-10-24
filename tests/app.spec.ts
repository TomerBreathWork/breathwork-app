import {test,expect,type Page} from '@playwright/test';
async function advanced(page:Page){const button=page.getByRole('button',{name:'Advanced Options',exact:true});if(await button.getAttribute('aria-expanded')!=='true')await button.click()}

test('configure, persist, start, pause, resume and stop',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');
 await page.getByRole('button',{name:'Box breathing'}).click();
 await page.reload();
 await expect(page.getByRole('spinbutton',{name:'Hold after inhale seconds'})).toHaveValue('4');
 await page.getByRole('button',{name:'Advanced Options'}).click();
 await page.getByRole('combobox',{name:'Sound',exact:true}).selectOption('silent');
 await page.clock.install();
 await page.getByRole('button',{name:'Start Session'}).click();
 await expect(page.locator('.session')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Inhale',exact:true})).toBeVisible();
 await page.clock.runFor(2000);
 await expect(page.locator('.water')).toHaveAttribute('style',/height: 5\d/);
 await page.getByRole('button',{name:'Pause',exact:false}).click();
 const frozen=await page.locator('.water').getAttribute('style');
 await page.clock.runFor(5000);
 await expect(page.locator('.water')).toHaveAttribute('style',frozen!);
 await page.getByRole('button',{name:'Resume'}).click();
 await page.clock.runFor(2200);
 await expect(page.getByRole('heading',{name:'Hold',exact:true})).toBeVisible();
 await expect(page.locator('.ring-progress')).toBeVisible();
 await page.getByRole('button',{name:'Stop'}).click();
 await expect(page.locator('.settings-panel')).toBeVisible();
 expect(errors).toEqual([]);
});
test('zero phases skip and completion respects end of phase',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Evening unwind'}).click();
 await page.locator('#duration').fill('1');
 await page.clock.install();
 await page.getByRole('button',{name:'Start Session'}).click();
 await expect(page.locator('.session')).toBeVisible();
 await page.clock.fastForward(60050);
 await expect(page.locator('.breath-circle')).not.toHaveAttribute('data-status','completed');
 await page.clock.runFor(1100);
 await expect(page.getByRole('heading',{name:'Session complete',exact:true})).toBeVisible();
 await expect(page.locator('.remaining-value')).toHaveText('00:00');
});
test('invalid settings block start and image failure falls back safely',async({page})=>{
 await page.route(/\/media\/.*\.webp$/,r=>r.abort());await page.goto('./');
 for(const name of ['Inhale seconds','Exhale seconds'])await page.getByRole('spinbutton',{name,exact:true}).fill('0');
 await expect(page.getByRole('button',{name:'Start Session'})).toBeDisabled();
 await expect(page.getByRole('alert')).toBeVisible();
 await advanced(page);
 await page.getByRole('button',{name:'Reset defaults'}).click();
 await page.getByRole('button',{name:'Start Session'}).click();
 await expect(page.locator('.session')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Inhale',exact:true})).toBeVisible();
 await expect(page.locator('.scenery')).toHaveCount(0);
});
test('mobile fits viewport and preferences have no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:375,height:812});await page.goto('./');
 await page.getByRole('button',{name:'Advanced Options'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/still-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Start Session'}).click();
 await expect(page.locator('.session')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/still-session.png',fullPage:true});
});
test('sound begins only on interaction, skips holds, and hidden tab pauses',async({page})=>{
 await page.goto('./');
 await page.evaluate(()=>{
  const Native=window.AudioContext;
  (window as any).cueCount=0;
  window.AudioContext=class extends Native {
   createBufferSource(){(window as any).cueCount++;return super.createBufferSource()}
  };
 });
 expect(await page.evaluate(()=>(window as any).cueCount)).toBe(0);
 await page.clock.install();
 await page.getByRole('button',{name:'Start Session'}).click();
 await expect(page.locator('.session')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as any).cueCount)).toBe(1);
 await page.clock.runFor(4100);
 await expect(page.getByRole('heading',{name:'Exhale',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).cueCount)).toBe(2);
 await advanced(page);
 await page.getByRole('button',{name:'Mute sound',exact:true}).click();
 await page.clock.runFor(6100);
 expect(await page.evaluate(()=>(window as any).cueCount)).toBe(2);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});
 await expect(page.getByRole('heading',{name:'Paused',exact:true})).toBeVisible();
});

test('repository subpath loads scripts, styles and both local images',async({page,request})=>{
 const failed:string[]=[];
 page.on('response',r=>{if(r.status()>=400)failed.push(r.url())});
 await page.goto('./');
 await expect(page).toHaveURL(/\/breathwork-app\/$/);
 await expect(page.locator('.settings-panel')).toBeVisible();
 await expect.poll(()=>page.locator('.scenery').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 for(const name of ['alpine','coast']){
  const response=await request.get(`media/${name}.webp`);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/webp');
 }
 expect(await page.locator('.start-button').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(25, 72, 74)');
 expect(failed).toEqual([]);
});

test('background stays fixed until changed; random mode avoids immediate repeats',async({page})=>{
 await page.goto('./');await page.clock.install();
 await page.getByRole('button',{name:'Start Session'}).click();
 await expect(page.locator('.session')).toBeVisible();
 const first=await page.locator('.scenery').getAttribute('src');
 await page.clock.runFor(11000);
 await expect(page.locator('.scenery')).toHaveAttribute('src',first!);
 await advanced(page);
 await page.getByRole('combobox',{name:'Background'}).selectOption('photo-4');
 await expect(page.locator('.scenery')).toHaveAttribute('src',/backgrounds\/4.webp$/);
 await expect(page.getByRole('combobox',{name:'Background'}).locator('option[value=gradient]')).toHaveCount(0);
 await page.getByRole('combobox',{name:'Background'}).selectOption('random');
 const previous=await page.locator('.scenery').getAttribute('src');
 await page.getByRole('button',{name:'Stop',exact:true}).click();
 await page.getByRole('button',{name:'Start Session'}).click();
 await expect(page.locator('.session')).toBeVisible();
 await expect(page.locator('.scenery')).not.toHaveAttribute('src',previous!);
});
test('resume and unmute restore phase audio; volume changes do not restart a voice',async({page})=>{
 await page.goto('./');
 await page.evaluate(()=>{
  const Native=window.AudioContext;(window as any).voices=[];
  window.AudioContext=class extends Native {
   createBufferSource(){const s=super.createBufferSource();(window as any).voices.push(s);return s}
  };
 });
 await page.clock.install();await page.getByRole('button',{name:'Start Session'}).click();
 await expect(page.locator('.session')).toBeVisible();
 await page.clock.runFor(1000);await page.getByRole('button',{name:'Pause',exact:true}).click();
 const count=await page.evaluate(()=>(window as any).voices.length);
 await page.clock.runFor(5000);expect(await page.evaluate(()=>(window as any).voices.length)).toBe(count);
 await page.getByRole('button',{name:'Resume',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).voices.length)).toBe(count+1);
 await advanced(page);
 await page.getByRole('slider',{name:'Volume'}).fill('0.1');
 expect(await page.evaluate(()=>(window as any).voices.length)).toBe(count+1);
 await advanced(page);
 await page.getByRole('button',{name:'Mute sound',exact:true}).click();
 await page.getByRole('button',{name:'Unmute sound',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).voices.length)).toBe(count+2);
 await page.getByRole('button',{name:'Stop',exact:true}).click();
 await page.clock.runFor(20000);expect(await page.evaluate(()=>(window as any).voices.length)).toBe(count+2);
});
test('unavailable Web Audio does not prevent silent breathing practice',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>Object.defineProperty(window,'AudioContext',{value:undefined,configurable:true}));
 await page.goto('./');await page.getByRole('button',{name:'Start Session'}).click();
 await expect(page.locator('.session')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Inhale',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 await page.getByRole('button',{name:'Resume',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Inhale',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});

test('all five uploaded photographs load and generated backgrounds are not selectable',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Advanced Options'}).click();
 await page.getByRole('combobox',{name:'Sound',exact:true}).selectOption('silent');
 await page.getByRole('button',{name:'Start Session'}).click();
 await expect(page.locator('.session')).toBeVisible();
 await advanced(page);
 const scenery=page.getByRole('combobox',{name:'Background'});
 for(let i=1;i<=5;i++){
  await scenery.selectOption(`photo-${i}`);
  await expect(page.locator('.scenery')).toHaveAttribute('src',`/breathwork-app/media/backgrounds/${i}.webp`);
  await expect.poll(()=>page.locator('.scenery').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 }
 for(const id of ['alpine','coast','mountain-lake','gradient'])await expect(scenery.locator(`option[value="${id}"]`)).toHaveCount(0);
});
test('the three uploaded MP3 recordings decode with spaces and uppercase extensions',async({page})=>{
 await page.goto('./');
 const results=await page.evaluate(async()=>{
  const context=new OfflineAudioContext(1,1,44100);
  return Promise.all(['inhale','hold','exhale'].map(async role=>{
   const response=await fetch(`media/audio/${role}%204.MP3`);
   if(!response.ok)throw new Error(`Audio HTTP ${response.status}`);
   const decoded=await context.decodeAudioData(await response.arrayBuffer());
   return{duration:decoded.duration,channels:decoded.numberOfChannels};
  }));
 });
 expect(results).toHaveLength(3);
 for(const result of results){expect(result.duration).toBeGreaterThan(0);expect(result.channels).toBeGreaterThan(0)}
});
test('missing recordings use synthesized fallback without blocking the session',async({page})=>{
 await page.route(/\/media\/audio\/.*\.MP3$/,route=>route.abort());
 await page.goto('./');
 await page.getByRole('button',{name:'Advanced Options'}).click();
 await page.getByRole('combobox',{name:'Sound',exact:true}).selectOption('recordings');
 await page.getByRole('button',{name:'Start Session'}).click();
 await expect(page.locator('.session')).toBeVisible();
 await page.getByRole('button',{name:'Stop',exact:true}).click();
 await advanced(page);
 await expect(page.getByRole('status')).toContainText('synthesized');
});

test('hiding the page during initial audio preparation starts paused without a cue',async({page})=>{
 await page.goto('./');
 await page.evaluate(()=>{
  const Native=window.AudioContext;(window as any).cueCount=0;
  window.AudioContext=class extends Native{createBufferSource(){(window as any).cueCount++;return super.createBufferSource()}};
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
 });
 await page.getByRole('button',{name:'Start Session'}).click();
 await expect(page.getByRole('heading',{name:'Paused',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).cueCount)).toBe(0);
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>false}));
 await page.getByRole('button',{name:'Resume',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Inhale',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as any).cueCount)).toBe(1);
});
