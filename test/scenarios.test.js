import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/data.js';
import {scenarioKey,legacyPlanKey,maxScenarios,createScenarios,validateScenarios,activeScenario,updateActiveScenario,duplicateScenario,renameScenario,switchScenario,deleteScenario,loadScenarios,persistScenarios,compareScenarios} from '../src/scenarios.js';
const storage=values=>{const data=new Map(Object.entries(values||{}));return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
const evidence=()=>({...initialState(),audit:{historyReviewed:true,fullTimeTerms:{'1A':'confirmed'},workTerms:{WT1:'standard'}},attemptHistory:[{code:'CS 136',term:'1A',units:0.5,grade:20}],pdCourses:[{code:'PD 1',term:'1B',status:'completed'}]});
test('legacy plan becomes Main plan without rewriting browser data on load',()=>{
 const old=evidence(),store=storage({[legacyPlanKey]:JSON.stringify(old)}),loaded=loadScenarios(store,initialState());
 assert.equal(activeScenario(loaded).name,'Main plan');assert.deepEqual(activeScenario(loaded).state,old);assert.equal(store.getItem(scenarioKey),null);
});
test('duplicate deeply isolates courses, history, PD and review evidence',()=>{
 const original=createScenarios(evidence()),copy=duplicateScenario(original,'AI exploration','ai');
 const state=activeScenario(copy).state;state.courses[0].term='4A';state.ai=false;state.audit.historyReviewed=false;state.audit.workTerms.WT1='not-credited';state.attemptHistory[0].grade=30;state.pdCourses[0].status='planned';
 assert.deepEqual(copy.plans[0].state,original.plans[0].state);assert.deepEqual(original.plans[0].state,evidence());
});
test('saving the active scenario never alters another scenario',()=>{
 const library=duplicateScenario(createScenarios(evidence()),'BCS only','bcs'),next=structuredClone(activeScenario(library).state);next.ai=false;
 const saved=updateActiveScenario(library,next);next.courses[0].term='4B';
 assert.equal(saved.plans[0].state.ai,true);assert.equal(activeScenario(saved).state.ai,false);assert.notEqual(activeScenario(saved).state.courses[0].term,'4B');
});
test('switch, rename and delete preserve other plans and always leave a valid active plan',()=>{
 let library=duplicateScenario(createScenarios(evidence()),'Other','other');library=renameScenario(library,'  BCS only  ');assert.equal(activeScenario(library).name,'BCS only');
 library=switchScenario(library,'main');assert.equal(activeScenario(library).name,'Main plan');library=deleteScenario(library,'main');assert.equal(library.activeId,'other');
 assert.throws(()=>deleteScenario(library,'other'),/at least one/);assert.throws(()=>switchScenario(library,'missing'),/does not exist/);
});
test('plan names reject blanks, excessive length and case-insensitive collisions',()=>{
 const library=createScenarios(initialState());
 for(const name of ['', '   ', 'x'.repeat(81),'MAIN PLAN'])assert.throws(()=>duplicateScenario(library,name,'copy'));
 assert.throws(()=>duplicateScenario(library,'Other','main'),/identifier/);
 assert.throws(()=>duplicateScenario(library,'Other','<unsafe>'),/identifier/);
});
test('backup round trip preserves every plan and optional record',()=>{
 const library=duplicateScenario(createScenarios(evidence()),'Alternative','alt'),store=storage();persistScenarios(store,library);
 assert.deepEqual(loadScenarios(store,initialState()),library);assert.deepEqual(JSON.parse(store.getItem(legacyPlanKey)),activeScenario(library).state);
 const parsed=JSON.parse(JSON.stringify(library));assert.deepEqual(validateScenarios(parsed),library);assert.notEqual(validateScenarios(parsed),parsed);
});
test('invalid backups cannot overwrite a stored valid library',()=>{
 const store=storage(),valid=createScenarios(initialState());persistScenarios(store,valid);const before=store.getItem(scenarioKey);
 for(const invalid of [{...valid,activeId:'missing'},{...valid,plans:[]},{...valid,plans:[valid.plans[0],valid.plans[0]]},{...valid,plans:[{...valid.plans[0],state:{version:2}}]}])assert.throws(()=>persistScenarios(store,invalid));
 assert.equal(store.getItem(scenarioKey),before);
});
test('scenario limit rejects an extra duplicate without mutating the existing library',()=>{
 let library=createScenarios(initialState());for(let i=1;i<maxScenarios;i++)library=duplicateScenario(library,'Plan '+i,'plan-'+i);
 assert.equal(library.plans.length,maxScenarios);assert.throws(()=>duplicateScenario(library,'Too many','extra'),/up to 12/);assert.equal(library.plans.length,maxScenarios);
});
test('corrupt scenario storage is rejected instead of silently falling back to a stale legacy mirror',()=>{
 const store=storage({[scenarioKey]:'{broken',[legacyPlanKey]:JSON.stringify(initialState())});assert.throws(()=>loadScenarios(store,initialState()));assert.equal(store.getItem(scenarioKey),'{broken');
});
test('failed authoritative writes preserve the previous saved library',()=>{
 const store=storage();const original=createScenarios(initialState());persistScenarios(store,original);const before=store.getItem(scenarioKey);store.setItem=()=>{throw Error('Quota exceeded');};
 assert.throws(()=>persistScenarios(store,duplicateScenario(original,'New','new')),/Quota/);assert.equal(store.getItem(scenarioKey),before);
});
test('a failed compatibility mirror does not lose the authoritative saved scenarios',()=>{
 const store=storage();store.setItem=(k,v)=>{if(k===legacyPlanKey)throw Error('Quota');store.data.set(k,v);};
 const library=duplicateScenario(createScenarios(initialState()),'Other','other');persistScenarios(store,library);assert.deepEqual(loadScenarios(store,initialState()),library);
});
test('authoritative scenario storage wins over an old active-plan mirror',()=>{
 const library=duplicateScenario(createScenarios(initialState()),'Other','other'),store=storage();persistScenarios(store,library);store.setItem(legacyPlanKey,JSON.stringify({...initialState(),ai:false}));assert.equal(activeScenario(loadScenarios(store,initialState())).state.ai,true);
});
test('comparison distinguishes added, removed, moved, changed-status and changed-record courses',()=>{
 const original=initialState(),other=structuredClone(original);other.ai=false;other.courses=other.courses.filter(c=>c.code!=='CS 350');other.courses.find(c=>c.code==='CS 341').term='4B';other.courses.find(c=>c.code==='CS 135').status='completed';other.courses.find(c=>c.code==='MATH 135').grade=75;other.courses.push({code:'CS 486',term:'4A',status:'planned',units:0.5});
 const result=compareScenarios(other,original);
 assert.deepEqual(result.differences.find(c=>c.code==='CS 350').changes,['Only in comparison plan']);assert.deepEqual(result.differences.find(c=>c.code==='CS 486').changes,['Only in active plan']);
 assert(result.differences.find(c=>c.code==='CS 341').changes.includes('Term differs'));assert(result.differences.find(c=>c.code==='CS 135').changes.includes('Status differs'));assert(result.differences.find(c=>c.code==='MATH 135').changes.includes('Grade or other record details differ'));
 assert.equal(result.active.ai,false);assert.equal(result.other.ai,true);assert.equal(result.workload.find(t=>t.id==='4B').active.units,0.5);assert.equal(result.workload.find(t=>t.id==='4B').other.units,0);
});
test('comparison uses eligible degree units separately from total scheduled workload',()=>{
 const original=initialState(),other=structuredClone(original);other.courses.push({code:'ECON 101',term:'4A',status:'planned',units:0.5,creditType:'excluded'});
 const result=compareScenarios(other,original);assert.equal(result.active.projectedUnits,result.other.projectedUnits);assert.equal(result.workload.find(t=>t.id==='4A').active.units,0.5);assert.equal(result.active.courses,result.other.courses+1);
});
test('comparison reports audit evidence changes and identical plans without mutating either',()=>{
 const original=evidence(),other=structuredClone(original);assert.equal(compareScenarios(other,original).differences.length,0);assert.equal(compareScenarios(other,original).evidenceDiffers,false);other.audit.historyReviewed=false;assert.equal(compareScenarios(other,original).evidenceDiffers,true);assert.equal(original.audit.historyReviewed,true);
});
