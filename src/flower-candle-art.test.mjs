import test from 'node:test';
import assert from 'node:assert/strict';
import { flameAnchor, flameLayers, flameStages, flamePose, illustrationOpacity } from './flower-candle-art.ts';
const matrix = ({angle,x,y}) => {
  const a=angle*Math.PI/180;return [Math.cos(a)*x,Math.sin(a)*x,-Math.sin(a)*y,Math.cos(a)*y];
};
const read = value => value.slice(7,-1).split(',').map(Number);
const product = ([a,b,c,d],[u,v,w,z]) => [a*u+c*v,b*u+d*v,a*w+c*z,b*w+d*z];
test('every blend has unit weight and no more than two neighboring source paintings',()=>{
 for(let i=0;i<=1000;i++) {
  const layers=flameLayers(i/1000),active=layers.map((l,j)=>l.opacity>0?j:-1).filter(j=>j>=0);
  assert.ok(Math.abs(layers.reduce((s,l)=>s+l.opacity,0)-1)<1e-12);
  assert.ok(active.length<=2);if(active.length===2)assert.equal(active[1]-active[0],1);
 }
});
test('simultaneously visible stages register to the same silhouette pose and fixed wick anchor',()=>{
 assert.deepEqual(flameAnchor,{x:130/420,y:330/420});
 for(const p of [.1,.21,.3,.44,.5,.64,.73,.83,.9]) {
  const layers=flameLayers(p),poses=layers.flatMap((l,i)=>l.opacity>0?[product(read(l.transform),matrix(flameStages[i]))]:[]);
  for(const pose of poses)for(let i=0;i<4;i++)assert.ok(Math.abs(pose[i]-poses[0][i])<1e-12);
  for(const l of layers)assert.deepEqual(read(l.transform).slice(4),[0,0]);
 }
});
test('source stage poses are reached without jumps and final bend remains stable during extinguishing',()=>{
 for(let i=0;i<5;i++)assert.equal(flameLayers(flameStages[i].at)[i].opacity,1);
 for(const s of flameStages.slice(1)) {
  const before=flameLayers(s.at-1e-7),after=flameLayers(s.at+1e-7);
  for(let i=0;i<5;i++)assert.ok(Math.abs(before[i].opacity-after[i].opacity)<1e-9);
 }
 assert.deepEqual(flameLayers(.84),flameLayers(.95));
 assert.deepEqual(flameLayers(-1),flameLayers(0));assert.deepEqual(flameLayers(5),flameLayers(1));
});
test('phase-owned appearance fades have no independent animation time',()=>{
 assert.equal(illustrationOpacity(0),0);assert.equal(illustrationOpacity(.06),1);
 assert.equal(illustrationOpacity(.95),1);assert.equal(illustrationOpacity(1),0);
 assert.equal(illustrationOpacity(.99),illustrationOpacity(.99));
});

test('bending has continuous nonzero velocity across interior stage boundaries',()=>{
 const epsilon=1e-6;
 for(const stage of flameStages.slice(1,-1)) {
  const before=(flamePose(stage.at).angle-flamePose(stage.at-epsilon).angle)/epsilon;
  const after=(flamePose(stage.at+epsilon).angle-flamePose(stage.at).angle)/epsilon;
  assert.ok(before>1);assert.ok(Math.abs(before-after)<.02);
 }
});
test('continuous pose remains monotone without angle or size overshoot',()=>{
 let last=flamePose(0);
 for(let i=1;i<=2000;i++) {
  const pose=flamePose(i/2000);
  assert.ok(pose.angle>=last.angle-1e-10);assert.ok(pose.x<=last.x+1e-10);assert.ok(pose.y<=last.y+1e-10);
  assert.ok(pose.angle>=0&&pose.angle<=flameStages[4].angle);
  assert.ok(pose.x>=flameStages[4].x&&pose.y>=flameStages[4].y);
  last=pose;
 }
 for(const stage of flameStages)assert.deepEqual(flamePose(stage.at),{angle:stage.angle,x:stage.x,y:stage.y});
});
