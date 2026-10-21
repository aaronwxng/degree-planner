import {validateState,evaluate,courseIdentity} from './engine.js';
import {terms} from './data.js';
export const scenarioKey='waterloo-degree-scenarios-v1';
export const legacyPlanKey='waterloo-degree-plan-v1';
export const maxScenarios=12;
const clone=value=>structuredClone(value);
function nameFor(name,plans,exceptId){
 if(typeof name!=='string'||!name.trim()||name.trim().length>80)throw Error('Use a plan name between 1 and 80 characters.');
 const trimmed=name.trim();
 if(plans.some(p=>p.id!==exceptId&&p.name.toLowerCase()===trimmed.toLowerCase()))throw Error('Another plan already has that name.');
 return trimmed;
}
export function createScenarios(state){return {kind:'waterloo-degree-scenarios',version:1,activeId:'main',plans:[{id:'main',name:'Main plan',state:validateState(clone(state))}]};}
export function validateScenarios(value){
 const next=clone(value);
 if(!next||next.kind!=='waterloo-degree-scenarios'||next.version!==1||!Array.isArray(next.plans)||!next.plans.length||next.plans.length>maxScenarios)throw Error('Unsupported alternative-plan backup.');
 const ids=new Set(),names=new Set();
 for(const plan of next.plans){
  if(!plan||typeof plan.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(plan.id)||ids.has(plan.id))throw Error('Invalid or duplicate plan identifier.');
  plan.name=nameFor(plan.name,[],plan.id);const name=plan.name.toLowerCase();
  if(names.has(name))throw Error('Duplicate plan names.');
  ids.add(plan.id);names.add(name);plan.state=validateState(plan.state);
 }
 if(!ids.has(next.activeId))throw Error('The active plan is missing from this backup.');
 return next;
}
export function activeScenario(library){return library.plans.find(p=>p.id===library.activeId);}
export function updateActiveScenario(library,state){
 const next=clone(library);activeScenario(next).state=validateState(clone(state));return next;
}
export function duplicateScenario(library,name,id){
 if(library.plans.length>=maxScenarios)throw Error(`You can save up to ${maxScenarios} plans. Export a backup before deleting an old plan.`);
 const next=clone(library),copy=clone(activeScenario(library));copy.name=nameFor(name,next.plans);copy.id=id;
 next.plans.push(copy);next.activeId=id;return validateScenarios(next);
}
export function renameScenario(library,name){const next=clone(library);activeScenario(next).name=nameFor(name,next.plans,next.activeId);return next;}
export function switchScenario(library,id){
 if(!library.plans.some(p=>p.id===id))throw Error('That plan does not exist.');
 return {...clone(library),activeId:id};
}
export function deleteScenario(library,id){
 if(library.plans.length===1)throw Error('Keep at least one saved plan.');
 if(!library.plans.some(p=>p.id===id))throw Error('That plan does not exist.');
 const next=clone(library);next.plans=next.plans.filter(p=>p.id!==id);if(next.activeId===id)next.activeId=next.plans[0].id;return next;
}
// The complete library is the authoritative single-write backup. The old active
// plan key is a compatibility mirror for earlier versions, never a recovery source
// if the library exists but fails validation.
export function loadScenarios(storage,fallback){
 const saved=storage.getItem(scenarioKey);
 if(saved!==null)return validateScenarios(JSON.parse(saved));
 const legacy=storage.getItem(legacyPlanKey);
 return createScenarios(legacy===null?fallback:validateState(JSON.parse(legacy)));
}
export function persistScenarios(storage,library){
 const next=validateScenarios(library);
 storage.setItem(scenarioKey,JSON.stringify(next)); // Failure leaves the last saved library intact.
 try{storage.setItem(legacyPlanKey,JSON.stringify(activeScenario(next).state));}catch{/* Library is safely saved even if the compatibility mirror is full. */}
 return next;
}
function summary(state){
 const earned=evaluate(state.courses.filter(c=>c.status==='completed'),state.ai),projected=evaluate(state.courses,state.ai);
 return {ai:state.ai,courses:state.courses.length,earnedUnits:earned.units,projectedUnits:projected.units,completedSlots:earned.rows.filter(r=>r.matched).length,projectedSlots:projected.rows.filter(r=>r.matched).length,totalSlots:projected.rows.length};
}
const details=c=>Object.fromEntries(Object.entries(c).filter(([key])=>!['code','term','status','units'].includes(key)).sort(([a],[b])=>a.localeCompare(b)));
export function compareScenarios(active,other){
 const left=new Map(active.courses.map(c=>[courseIdentity(c.code),c])),right=new Map(other.courses.map(c=>[courseIdentity(c.code),c]));
 const differences=[];
 for(const id of [...new Set([...left.keys(),...right.keys()])].sort()){
  const a=left.get(id),b=right.get(id),changes=[];
  if(!a||!b)changes.push(a?'Only in active plan':'Only in comparison plan');
  else{
   for(const key of ['code','term','status','units'])if(a[key]!==b[key])changes.push(key==='code'?'Course code differs':`${key[0].toUpperCase()+key.slice(1)} differs`);
   if(JSON.stringify(details(a))!==JSON.stringify(details(b)))changes.push('Grade or other record details differ');
  }
  if(changes.length)differences.push({code:a?.code||b.code,active:a||null,other:b||null,changes});
 }
 const workload=terms.map(term=>{
  const inTerm=state=>{const rows=state.courses.filter(c=>c.term===term.id);return {count:rows.length,units:rows.reduce((s,c)=>s+c.units,0)};};
  return {...term,active:inTerm(active),other:inTerm(other)};
 });
 const evidenceDiffers=JSON.stringify({attemptHistory:active.attemptHistory||[],pdCourses:active.pdCourses||[],audit:active.audit||{}})!==JSON.stringify({attemptHistory:other.attemptHistory||[],pdCourses:other.pdCourses||[],audit:other.audit||{}});
 return {active:summary(active),other:summary(other),differences,workload,evidenceDiffers};
}
