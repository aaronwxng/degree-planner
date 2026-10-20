import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAudit,averageOf,isMajorCourse} from '../src/audit.js';
import {creditType} from '../src/credit.js';
import {evaluate,validateState} from '../src/engine.js';
import {core,initialState,terms} from '../src/data.js';
import {mergeTranscript,parseTranscript,prepareTranscriptReview} from '../src/transcript.js';
const course=(code,extra={})=>({code,term:'1A',status:'completed',units:code==='CS 136L'?0.25:0.5,grade:80,...extra});
const checked={historyReviewed:true,classificationsReviewed:true,contentReviewed:true};
const state=(courses=[],extra={})=>({version:1,ai:false,courses,audit:{...checked},...extra});
const check=(audit,id)=>audit.rows.find(r=>r.id===id);

test('legacy v1 plans load and missing evidence never becomes clean-history confirmation',()=>{
 const s=initialState();assert.doesNotThrow(()=>validateState(s));
 const a=evaluateAudit(s);assert.equal(check(a,'failures').status,'review');assert.equal(check(a,'cav').status,'review');assert.equal(check(a,'work').status,'missing');
});
test('classification includes COMM/MTHEL, reviewed math cross-listings, exclusions and transfer approval',()=>{
 assert.equal(creditType(course('MTHEL 131')),'nonmath');assert.equal(creditType(course('COMM 101')),'nonmath');assert.equal(creditType(course('PHYS 467')),'math');
 assert.equal(creditType(course('PHIL 240',{creditType:'math'})),'math');
 assert.equal(evaluate([course('CS 136L'),course('CS 240',{creditType:'excluded'}),course('MATH 135',{origin:'transfer'})]).units,0.25);
 assert.equal(evaluate([course('MATH 135',{origin:'transfer',transferApproved:true})]).units,0.5);
});
test('PD and administrative credit do not inflate degree unit totals',()=>{
 assert.equal(evaluate([course('CS 135'),course('PD 100'),course('COOP 100'),course('MTHEL 99')]).units,0.5);
});
test('required course slots reject insufficient quarter-unit credit and accept enriched courses',()=>{
 const a=evaluate([course('CS 240E'),course('CS 241',{units:0.25})]);
 assert.equal(a.rows.find(r=>r.id==='CS 240').matched,'CS 240E');assert.equal(a.rows.find(r=>r.id==='CS 241').matched,null);
});
test('averages are weighted by attempted units with a floor of 32',()=>{
 const a=averageOf([course('CS 136',{grade:10,units:0.5}),course('CS 240',{grade:100,units:1}),course('CS 136L',{grade:null,gradeCode:'CR'})]);
 assert.equal(a.value,(32*0.5+100)/1.5);assert.equal(a.count,2);assert.equal(a.missing.length,0);
});
test('WF/DNW/FTC/NMR count as 32; NCR and WD do not enter averages',()=>{
 const a=averageOf(['WF','DNW','FTC','NMR','NCR','WD'].map(gradeCode=>course('CS 136',{grade:null,gradeCode})));
 assert.equal(a.value,32);assert.equal(a.count,4);
});
test('MAV uses the archived CS course set and needs two graded courses',()=>{
 assert.equal(isMajorCourse('CS 135'),false);assert.equal(isMajorCourse('CS 136L'),false);assert.ok(isMajorCourse('CS 245E'));assert.ok(isMajorCourse('ECE 452'));assert.equal(isMajorCourse('CS 330'),false);
 assert.equal(check(evaluateAudit(state([course('CS 136')])),'mav').status,'review');
 assert.equal(check(evaluateAudit(state([course('CS 136'),course('CS 240')])),'mav').status,'satisfied');
});
test('planned numeric grades are never used to project actual CAV or MAV',()=>{
 const a=evaluateAudit(state([course('CS 136',{grade:55}),course('CS 240',{status:'planned',grade:100})]));assert.equal(check(a,'cav').status,'missing');assert.equal(check(a,'mav').status,'review');
});
test('missing numeric grade is unresolved while explicit CR is excluded from averages',()=>{
 let a=evaluateAudit(state([course('CS 136'),course('CS 240'),course('MATH 135',{grade:null})]));assert.equal(check(a,'cav').status,'review');
 a=evaluateAudit(state([course('CS 136'),course('CS 240'),course('MATH 135',{grade:null,gradeCode:'CR'})]));assert.equal(check(a,'cav').status,'satisfied');
});
test('failure limit is inclusive at 2 units and unusable limit is inclusive at 5',()=>{
 const failed=Array.from({length:4},(_,i)=>({code:`HIST ${100+i}`,term:'1A',units:0.5,grade:40,clc:false}));
 const a=evaluateAudit(state([],{attemptHistory:failed}));assert.equal(a.failedUnits,2);assert.equal(check(a,'failures').status,'satisfied');
 failed.push({code:'HIST 105',term:'1A',units:0.5,grade:null,gradeCode:'NCR'});assert.equal(check(evaluateAudit(state([],{attemptHistory:failed})),'failures').status,'missing');
 const clc=Array.from({length:10},(_,i)=>({code:`HIST ${200+i}`,term:'1A',units:0.5,grade:80,clc:true}));
 assert.equal(check(evaluateAudit(state([],{attemptHistory:clc})),'unusable').status,'satisfied');clc.push({code:'HIST 299',term:'1A',units:0.5,grade:80,clc:true});assert.equal(check(evaluateAudit(state([],{attemptHistory:clc})),'unusable').status,'missing');
});
test('WD does not count as failure/unusable but counts toward the three-attempt review',()=>{
 const attempts=['1A','1B','2A','2B'].map(term=>({code:'CS 136',term,units:0.5,gradeCode:'WD'}));
 const a=evaluateAudit(state([],{attemptHistory:attempts}));assert.equal(a.failedUnits,0);assert.equal(a.unusableUnits,0);assert.equal(check(a,'repeat-limit').status,'review');
});
test('repeat passes require CLC evidence, count credit once, and keep both grades',()=>{
 const s=state([course('CS 136',{term:'1B',grade:90})],{attemptHistory:[{code:'CS 136',term:'1A',units:0.5,grade:50,clc:false}]});
 let a=evaluateAudit(s);assert.equal(check(a,'unusable').status,'review');assert.equal(averageOf(a.attempts).value,70);assert.equal(evaluate(s.courses).units,0.5);
 s.attemptHistory[0].clc=true;a=evaluateAudit(s);assert.equal(a.unusableUnits,0.5);assert.equal(check(a,'unusable').status,'satisfied');
});
test('scheduled work terms and load projections do not count as credited terms or confirmed residency',()=>{
 const s=state([course('CS 135'),course('MATH 135'),course('MATH 137')],{audit:{...checked,workTerms:{WT1:'planned'}}});const a=evaluateAudit(s);
 assert.equal(check(a,'work').status,'missing');assert.equal(check(a,'residency').status,'missing');assert.ok(check(a,'residency').detail.includes('1 projected'));
});
test('five credited co-ops require three standard terms separately',()=>{
 const workTerms={WT1:'standard',WT2:'standard',WT3:'flexible',WT4:'flexible',WT5:'flexible'};
 let a=evaluateAudit(state([],{audit:{...checked,workTerms}}));assert.equal(check(a,'work').status,'satisfied');assert.equal(check(a,'standard-work').status,'missing');
 workTerms.WT3='standard';a=evaluateAudit(state([],{audit:{...checked,workTerms}}));assert.equal(check(a,'standard-work').status,'satisfied');
});
test('PD count, required codes, distinctness and timing are separate checks',()=>{
 const pdCourses=[['PD 1','1B'],['PD 11','WT1'],['PD 10','WT2'],['PD 3','WT3'],['PD 4','WT4']].map(([code,term])=>({code,term,status:'completed'}));
 let a=evaluateAudit(state([],{pdCourses}));assert.equal(check(a,'pd').status,'satisfied');assert.equal(check(a,'pd-core').status,'satisfied');assert.equal(check(a,'pd-timing').status,'satisfied');
 pdCourses[0].term='WT1';a=evaluateAudit(state([],{pdCourses}));assert.equal(check(a,'pd-timing').status,'review');
 pdCourses[0].status='planned';a=evaluateAudit(state([],{pdCourses}));assert.equal(check(a,'pd').status,'missing');assert.equal(check(a,'pd-core').status,'missing');
});
test('audit evidence round-trips in v1 export and rejects invalid/duplicate records',()=>{
 const s=state([course('CS 136')],{attemptHistory:[{code:'CS 136',term:'1B',units:0.5,grade:40}],pdCourses:[{code:'PD 1',term:'1B',status:'completed'}]});assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
 const bad=structuredClone(s);bad.attemptHistory[0].term='1A';assert.throws(()=>validateState(bad));
 const badPd=structuredClone(s);badPd.pdCourses.push(badPd.pdCourses[0]);assert.throws(()=>validateState(badPd));
 assert.throws(()=>validateState(state([],{audit:{fullTimeTerms:{WT1:'confirmed'}}})));
});
test('importing another passed attempt preserves prior grade and invalidates old audit confirmations',()=>{
 const s=state([course('CS 136',{term:'1A',grade:70})]);
 const parsed=parseTranscript('Winter 2026\nCourse Description Attempted Earned Grade\nCS 136 Algorithms 0.50 0.50 90');const rows=prepareTranscriptReview(parsed,s);rows[0].selected=true;
 const result=mergeTranscript(s,rows);assert.equal(result.attemptHistory.length,1);assert.equal(result.attemptHistory[0].grade,70);assert.equal(result.audit.historyReviewed,false);assert.equal(s.attemptHistory,undefined);
});
test('a fully evidenced synthetic BCS record can satisfy every displayed check',()=>{
 const courses=[...core.map(r=>course(r.codes[0])),...['CS 348','CS 360','CS 370','CS 452','CS 480','CS 486'].map(c=>course(c)),...['ENGL 109','ENGL 119','HIST 101','HIST 200','HIST 300','PSYCH 101','PSYCH 207','SCI 206','HEALTH 101','MTHEL 131','ECON 101','ECON 102','ECON 201','FR 151','FR 152','CHEM 120','BIOL 130','PHYS 121'].map(c=>course(c))];
 const s=state(courses,{audit:{...checked,fullTimeTerms:Object.fromEntries(terms.filter(t=>!t.work).map(t=>[t.id,'confirmed'])),workTerms:{WT1:'standard',WT2:'standard',WT3:'standard',WT4:'flexible',WT5:'flexible'}},pdCourses:[['PD 1','1B'],['PD 11','WT1'],['PD 10','WT2'],['PD 3','WT3'],['PD 4','WT4']].map(([code,term])=>({code,term,status:'completed'}))});
 const a=evaluateAudit(s);assert.deepEqual(a.rows.filter(r=>r.status!=='satisfied').map(r=>r.id),[]);assert.equal(a.readyToGraduate,undefined);
});
test('moving a legacy completed record with an unknown grade preserves unresolved evidence',()=>{
 const s=state([course('CS 136',{term:'1A',grade:null})]);
 const parsed=parseTranscript('Winter 2026\nCourse Description Attempted Earned Grade\nCS 136 Algorithms 0.50 0.50 90');const rows=prepareTranscriptReview(parsed,s);rows[0].selected=true;
 const result=mergeTranscript(s,rows);assert.equal(result.attemptHistory[0].unresolved,true);assert.equal(check(evaluateAudit(result),'history-review').status,'review');
});
test('known barred courses and undersized ML credit cannot inflate checks',()=>{
 assert.equal(evaluate([course('ECON 211')]).units,0);assert.equal(averageOf([course('ECON 211')]).count,0);
 assert.equal(evaluate([course('CS 480'),course('CS 485',{units:0.25})],true).list.length,0);
});
