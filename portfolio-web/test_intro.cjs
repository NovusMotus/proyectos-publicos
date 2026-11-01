'use strict';
const assert = require('node:assert/strict');
const { IntroClock, motionPose } = require('./web/intro.js');
function harness() {
  let sequence = 0, ended = 0; const pending = new Map(), frames = [];
  const clock = new IntroClock({ request: fn => { pending.set(++sequence, fn); return sequence; }, cancel: id => pending.delete(id), frame: (time, running) => frames.push({time, running}), end: () => ended++ });
  return { clock, frames, ended: () => ended, tick: time => { const work = [...pending.values()]; pending.clear(); work.forEach(fn => fn(time)); }, queued: () => pending.size };
}
{
  const h = harness(); h.clock.permit(true); h.clock.play(); h.tick(0); h.tick(11999);
  assert.equal(h.ended(),0); h.tick(12000); assert.equal(h.ended(),1); assert.equal(h.clock.elapsed,12000); assert.equal(h.queued(),0);
}
{
  const h=harness(); h.clock.permit(true);h.clock.play();h.tick(100);h.tick(3100);h.clock.pause();h.tick(90000);
  assert.equal(h.clock.elapsed,3000);assert.equal(h.queued(),0);h.clock.play();h.tick(100000);assert.equal(h.clock.elapsed,3000);h.tick(101000);assert.equal(h.clock.elapsed,4000);
}
{
  const h=harness();h.clock.permit(true);h.clock.play();h.tick(0);h.tick(1000);h.clock.permit(false);h.tick(90000);
  assert.equal(h.clock.elapsed,1000);h.clock.permit(true);h.tick(100000);assert.equal(h.clock.elapsed,1000);h.tick(101000);assert.equal(h.clock.elapsed,2000);
}
{
  const h=harness();h.clock.permit(true);h.clock.play();h.tick(0);h.clock.seek(6000);assert.equal(h.clock.elapsed,6000);assert.equal(h.clock.running,false);assert.equal(h.queued(),0);
  h.clock.seek(-1);assert.equal(h.clock.elapsed,0);h.clock.seek(13000);assert.equal(h.clock.elapsed,12000);h.clock.play();assert.equal(h.clock.elapsed,0);
}
{
  const h=harness();h.clock.permit(true);h.clock.play();h.tick(0);h.clock.pause();h.clock.permit(false);h.clock.permit(true);assert.equal(h.clock.running,false);assert.equal(h.queued(),0);
}
{
  // Within the same scene, the object and project images must actually move.
  assert.notEqual(motionPose(800,1177,480).capsule.yaw,motionPose(1600,1177,480).capsule.yaw);
  assert.notDeepEqual(motionPose(6400,1177,480).cards,motionPose(7100,1177,480).cards);
  assert.deepEqual(motionPose(7100,1177,480),motionPose(7100,1177,480));
  for (const [w,h,mobile] of [[288,285,true],[351,584,true],[706,650,false],[1177,480,false]]) {
    for(let t=0;t<=12000;t+=100) {
      const p=motionPose(t,w,h,mobile);
      p.cards.forEach(card=>Object.values(card).forEach(value=>assert.ok(Number.isFinite(value))));
    }
    const p=motionPose(10700,w,h,mobile);
    p.cards.forEach(card=>{
      assert.ok(card.x-card.width/2>=0 && card.x+card.width/2<=w,'Final image stays within stage width');
      assert.ok(card.y-card.height/2>=0 && card.y+card.height/2<=h,'Final image stays within stage height');
    });
  }
}
console.log('PASS: clock completion,pause/resume,permissions,manual scenes,replay;continuous within-scene motion,determinism,finite poses and final image fit');
