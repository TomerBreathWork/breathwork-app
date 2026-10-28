import { configureBreathing } from "./configure-breathing";
import {test, expect} from '@playwright/test';
import en from '../src/locales/en.json' with {type:'json'};

const cases: [number,[number,number][]][] = [
 [0.5,[[0,.5]]],
 [3,[[0,3],[1000,2],[2000,1]]],
 [3.5,[[0,3.5],[500,3],[1500,2],[2500,1]]],
 [4,[[0,4],[1000,3],[2000,2],[3000,1]]],
 [5.5,[[0,5.5],[500,5],[1500,4],[2500,3],[3500,2],[4500,1]]],
 [10.5,[[0,10.5],[500,10],[1500,9],[2500,8],[3500,7],[4500,6],[5500,5],[6500,4],[7500,3],[8500,2],[9500,1]]],
];
test.beforeEach(async({page})=>{
 await page.clock.install({time:new Date('2026-10-24T12:00:00Z')});
 await page.clock.pauseAt(new Date('2026-10-24T12:00:01Z'));
});
for(const [duration,timeline] of cases){
 test(`${duration}s circle changes only at the initial fraction and whole-second countdown boundaries`,async({page})=>{
  await page.addInitScript(duration=>localStorage.setItem('still-settings',JSON.stringify({rhythm:[duration,0,2,0],minutes:1,sound:'silent'})),duration);
  await page.goto('./');await configureBreathing(page,{rhythm:[duration,0,2,0],minutes:1});await page.getByRole('button',{name:en.start,exact:true}).click();
  await page.evaluate(()=>{
   const count=document.querySelector('.phase-count')!,circle=document.querySelector('.breath-circle')!;
   const beginning=performance.now()+3000;
   (window as any).changes=[];
   new MutationObserver(()=>{
    if(circle.getAttribute('data-phase')==='0')
     (window as any).changes.push({value:Number(count.textContent),at:performance.now()-beginning});
   }).observe(count,{childList:true,subtree:true,characterData:true});
  });
  await expect(page.locator('.phase-count')).toHaveText('3'); // Three-second silent preparation.
  await page.clock.runFor(3000+duration*1000+48);
  const changes: {value:number;at:number}[]=await page.evaluate(()=>(window as any).changes);
  expect(changes.map(change=>change.value)).toEqual(timeline.map(([,value])=>value));
  changes.forEach((change,index)=>{
   expect(change.at).toBeGreaterThanOrEqual(timeline[index][0]);
   expect(change.at).toBeLessThan(timeline[index][0]+40); // Only the normal frame-render delay.
  });
  await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase','2');
  await expect(page.getByRole('heading',{name:en.exhale,exact:true})).toBeVisible();
  await expect(page.locator('.phase-count')).toHaveText('2');
 });
}
test('pause freezes the initial fraction; resume, restart and stop preserve their behavior',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('still-settings',JSON.stringify({rhythm:[5.5,0,5.5,0],minutes:1,sound:'silent'})));
 await page.goto('./');await page.getByRole('button',{name:en.start,exact:true}).click();
 await page.clock.runFor(3220);await expect(page.locator('.phase-count')).toHaveText('5.5');
 await page.getByRole('button',{name:en.pause,exact:true}).click();
 const timer=await page.locator('.remaining-value').innerText();
 await page.clock.runFor(8000);await expect(page.locator('.phase-count')).toHaveText('5.5');await expect(page.locator('.remaining-value')).toHaveText(timer);
 await page.getByRole('button',{name:en.resume,exact:true}).click();await expect(page.getByRole('button',{name:en.pause,exact:true})).toBeVisible();
 await page.clock.runFor(400);await expect(page.locator('.phase-count')).toHaveText('5');
 await page.clock.runFor(1000);await expect(page.locator('.phase-count')).toHaveText('4');
 await page.getByRole('button',{name:en.restart,exact:true}).click();await expect(page.locator('.phase-count')).toHaveText('3');await expect(page.locator('.breath-circle')).toHaveAttribute('data-phase','preparation');
 await page.getByRole('button',{name:en.stop,exact:true}).click();await expect(page.locator('.settings-panel')).toBeVisible();
});
