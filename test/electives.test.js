import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateElectives} from '../src/electives.js';
import {validateState,evaluate} from '../src/engine.js';
const course=(code,extra={})=>({code,units:0.5,term:'1A',status:'planned',...extra});
const audit=(codes,options)=>evaluateElectives(codes.map(c=>typeof c==='string'?course(c):c),options);

test('SCI 206 can fill either science category but never both',()=>{
 const r=audit(['SCI 206']);assert.equal(r.breadth.filter(b=>b.satisfied).length,1);
 assert.equal(r.breadth.reduce((n,b)=>n+b.units,0),0.5);
 const pure=r.breadth.find(b=>b.id==='pure'),applied=r.breadth.find(b=>b.id==='applied');
 assert.ok(pure.subjects.includes('SCI')&&applied.subjects.includes('SCI'));
});
test('science allocation finds both slots regardless of course input order',()=>{
 for(const codes of [['SCI 206','HEALTH 101'],['HEALTH 101','SCI 206'],['SCI 206','PHYS 121']]){
  const r=audit(codes);assert.ok(r.breadth.find(b=>b.id==='pure').satisfied);assert.ok(r.breadth.find(b=>b.id==='applied').satisfied);
 }
});
test('even a one-unit science course cannot be split between two breadth buckets',()=>{
 assert.equal(audit([course('SCI 206',{units:1})]).breadth.filter(b=>b.satisfied).length,1);
});
test('quarter-unit courses accumulate; units, rather than number of codes, control breadth',()=>{
 const r=audit([course('PHYS 121L',{units:0.25}),course('PHYS 122L',{units:0.25})]);assert.equal(r.breadth.find(b=>b.id==='pure').units,0.5);assert.equal(r.breadth.find(b=>b.id==='applied').units,0);
});
test('List I is excluded from humanities, while List II can overlap with communication',()=>{
 const r=audit(['ENGL 109','COMMST 100','ENGL 119']);assert.equal(r.breadth[0].units,0.5);assert.deepEqual(r.breadth[0].courses,['ENGL 119']);assert.ok(r.communication.satisfied);
});
test('List I course still counts toward depth',()=>{
 const r=audit(['ENGL 109','ENGL 119','ENGL 378']);assert.ok(r.depthSatisfied);assert.equal(r.breadth[0].units,1);
});
test('depth requires a single subject and enough upper-level credit',()=>{
 assert.equal(audit(['ECON 101','PSYCH 207','HIST 300']).depthSatisfied,false);
 assert.equal(audit(['PSYCH 101','PSYCH 207','PSYCH 307']).depthSatisfied,true);
 assert.equal(audit(['PSYCH 101','PSYCH 207',course('PSYCH 307',{units:0.25})]).depthSatisfied,false);
});
test('same-subject courses without upper-level credit do not imply a prerequisite chain',()=>{
 const r=audit(['ECON 101','ECON 102','ECON 201']);assert.equal(r.depthSatisfied,false);assert.ok(r.depth[0].chainNeedsReview);
});
test('reviewed prerequisite chain supports depth below the 300 level',()=>{
 const r=audit(['JAPAN 101R','JAPAN 102R','JAPAN 201R']);assert.ok(r.depthSatisfied);assert.equal(r.depth[0].upper,0);
 assert.equal(audit(['JAPAN 101R','JAPAN 201R']).depthSatisfied,false);
});
test('completed and projected progress do not mix',()=>{
 const courses=[course('PSYCH 101',{status:'completed'}),course('PSYCH 207',{status:'current'}),course('PSYCH 307')];
 assert.equal(audit(courses,{projected:false}).depthSatisfied,false);assert.equal(audit(courses).depthSatisfied,true);
});
test('first communication course requires a known grade of at least 60',()=>{
 for(const grade of [null,59.9])assert.equal(audit([course('ENGL 109',{status:'completed',grade}),course('ENGL 119',{status:'completed'})],{projected:false}).communication.satisfied,false);
 assert.equal(audit([course('ENGL 109',{status:'completed',grade:60}),course('ENGL 119',{status:'completed'})],{projected:false}).communication.satisfied,true);
});
test('two List I courses work, with the 60% minimum applied only to the first slot',()=>{
 const r=audit([course('ENGL 109',{status:'completed',grade:55}),course('COMMST 100',{status:'completed',grade:80})],{projected:false});
 assert.equal(r.communication.first,'COMMST 100');assert.equal(r.communication.second,'ENGL 109');assert.ok(r.communication.satisfied);
});
test('one course or two List II courses cannot fill both communication slots',()=>{
 assert.equal(audit(['ENGL 109']).communication.satisfied,false);assert.equal(audit(['ENGL 119','ENGL 210F']).communication.satisfied,false);
});
test('planned first communication course is conditional and a late placement is flagged',()=>{
 const r=audit([course('ENGL 109',{term:'2A'}),'ENGL 119']);assert.equal(r.communication.conditional,true);assert.equal(r.communication.firstTiming,'late');
});
test('math/CS content exclusions and unknown subjects never satisfy breadth or depth',()=>{
 const r=audit([course('PHIL 240',{excludeBreadthDepth:true}),'XYZ 300','CS 480']);assert.equal(r.breadth[0].units,0);assert.equal(r.depthSatisfied,false);assert.deepEqual(r.unknown,['XYZ 300']);assert.deepEqual(r.excluded,['PHIL 240']);
});
test('Engineering List A course cannot be a non-math elective while AI is selected',()=>{
 assert.equal(audit(['BIOL 487']).nonMathUnits,0);assert.equal(audit(['BIOL 487'],{ai:false}).nonMathUnits,0.5);
});
test('known cross-listings award one credit and cannot fill two communication slots',()=>{
 assert.equal(audit(['EMLS 129R','ENGL 129R']).communication.satisfied,false);
 assert.equal(evaluate([course('PHIL 205'),course('ECON 261')]).units,0.5);
 assert.throws(()=>validateState({version:1,ai:true,courses:[course('EMLS 129R'),course('ENGL 129R')]}));
});
test('v1 exports remain valid; grades and exclusions round-trip with validation',()=>{
 assert.doesNotThrow(()=>validateState({version:1,ai:true,courses:[course('ENGL 109')]}));
 const data={version:1,ai:true,courses:[course('ENGL 109',{grade:85,excludeBreadthDepth:true})]};assert.deepEqual(validateState(JSON.parse(JSON.stringify(data))),data);
 for(const grade of [-1,101,'80'])assert.throws(()=>validateState({version:1,ai:true,courses:[course('ENGL 109',{grade})]}));
 assert.throws(()=>validateState({version:1,ai:true,courses:[course('ENGL 109',{status:'completed',grade:40})]}));
});
