import {test,expect} from '@playwright/test';
test('configure, persist, start, pause, resume and stop',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByRole('button',{name:'Box breathing'}).click();
 await page.reload();
 await expect(page.getByRole('spinbutton',{name:'Hold after inhale seconds'})).toHaveValue('4');
 await page.getByRole('button',{name:'Atmosphere & sound'}).click();
 await page.getByRole('combobox',{name:'Sound',exact:true}).selectOption('silent');
 await page.clock.install();
 await page.getByRole('button',{name:'Begin your practice'}).click();
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
 await page.getByRole('button',{name:'Stop session and return to settings'}).click();
 await expect(page.getByRole('heading',{name:'Make space for yourself'})).toBeVisible();
 expect(errors).toEqual([]);
});
test('zero phases skip and completion respects end of phase',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Evening unwind'}).click();
 await page.locator('#duration').fill('1');
 await page.clock.install();
 await page.getByRole('button',{name:'Begin your practice'}).click();
 await page.clock.fastForward(60050);
 await expect(page.locator('.phase-guidance')).not.toContainText('Session Complete');
 await page.clock.runFor(1100);
 await expect(page.locator('.phase-guidance')).toHaveText('Session Complete – Take a Moment');
});
test('invalid settings block start and image failure falls back safely',async({page})=>{
 await page.route('**/media/*.webp',r=>r.abort());await page.goto('/');
 for(const name of ['Inhale seconds','Exhale seconds'])await page.getByRole('spinbutton',{name,exact:true}).fill('0');
 await expect(page.getByRole('button',{name:'Begin your practice'})).toBeDisabled();
 await expect(page.getByRole('alert')).toBeVisible();
 await page.getByRole('button',{name:'Reset defaults'}).click();
 await page.getByRole('button',{name:'Begin your practice'}).click();
 await expect(page.getByRole('heading',{name:'Inhale',exact:true})).toBeVisible();
 await expect(page.locator('.scenery')).toHaveCount(0);
});
test('mobile fits viewport and preferences have no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:375,height:812});await page.goto('/');
 await page.getByRole('button',{name:'Atmosphere & sound'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/still-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Begin your practice'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/still-session.png',fullPage:true});
});
test('sound begins only on interaction, skips holds, and hidden tab pauses',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>{
  const Native=window.AudioContext;
  (window as any).cueCount=0;
  window.AudioContext=class extends Native {
   createOscillator(){(window as any).cueCount++;return super.createOscillator()}
  };
 });
 expect(await page.evaluate(()=>(window as any).cueCount)).toBe(0);
 await page.clock.install();
 await page.getByRole('button',{name:'Begin your practice'}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).cueCount)).toBe(3);
 await page.clock.runFor(4100);
 await expect(page.getByRole('heading',{name:'Exhale',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).cueCount)).toBe(6);
 await page.getByRole('button',{name:'Mute sound',exact:true}).click();
 await page.clock.runFor(6100);
 expect(await page.evaluate(()=>(window as any).cueCount)).toBe(6);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});
 await expect(page.getByRole('heading',{name:'Paused',exact:true})).toBeVisible();
});
