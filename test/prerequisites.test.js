import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePrerequisites} from '../src/prerequisites.js';
import {initialState} from '../src/data.js';
const c=(code,term='1A',status='completed',grade=80)=>({code,term,status,grade,units:code==='CS 136L'?0.25:0.5});
const evaluate=(courses,code,attemptHistory=[])=>evaluatePrerequisites({courses,attemptHistory}).find(r=>r.code===code);
test('starter plan has conditional prerequisites and no missing direct course requirements',()=>{
 const rows=evaluatePrerequisites(initialState());assert(!rows.some(r=>r.status==='missing'));assert.equal(rows.find(r=>r.code==='CS 350').status,'projected');
});
test('same-term prerequisite is missing but concurrent CS136 lab is allowed',()=>{
 assert.equal(evaluate([c('CS 135','1B'),c('CS 136','1B'),c('CS 136L','1B')],'CS 136').status,'missing');
 assert.equal(evaluate([c('CS 135'),c('CS 136','1B'),c('CS 136L','1B')],'CS 136').status,'met');
});
test('grade thresholds require numeric evidence; unknown grade and CR never prove 60%',()=>{
 for(const grade of [null,59])assert.equal(evaluate([c('MATH 135','1A','completed',grade),c('MATH 136','1B')],'MATH 136').status,grade===null?'review':'missing');
 assert.equal(evaluate([c('MATH 135','1A','completed',60),c('MATH 136','1B')],'MATH 136').status,'met');
});
test('future hypothetical grades cannot prove a threshold',()=>{
 assert.equal(evaluate([c('MATH 135','1A','planned',100),c('MATH 136','1B','planned')],'MATH 136').status,'projected');
});
test('CS241 accepts the 85 percent shortcut or the separate software path',()=>{
 const base=[c('CS 136L'),c('CS 241','2A')];
 assert.equal(evaluate([...base,c('CS 136','1A','completed',84)],'CS 241').status,'missing');
 assert.equal(evaluate([...base,c('CS 136','1A','completed',85)],'CS 241').status,'met');
 assert.equal(evaluate([...base,c('CS 246','1B')],'CS 241').status,'met');
});
test('CS246 advanced and engineering alternatives do not incorrectly require the lab',()=>{
 assert.equal(evaluate([c('CS 138'),c('CS 246','1B')],'CS 246').status,'met');
 assert.equal(evaluate([c('CS 146'),c('CS 246','1B')],'CS 246').status,'missing');
});
test('antirequisites conflict even when both courses are planned',()=>{
 const result=evaluate([c('CS 135','1A','planned'),c('CS 145','1B','planned')],'CS 135');assert.equal(result.status,'missing');assert(result.checks.some(r=>r.text.includes('Antirequisite')));
});
test('advanced alternatives are accepted without inventing reviewed coverage for their own rules',()=>{
 const courses=[c('MATH 145'),c('MATH 136','1B')];assert.equal(evaluate(courses,'MATH 136').status,'met');assert.equal(evaluate(courses,'MATH 145').status,'unreviewed');
});
test('a valid alternate branch wins over missing or unknown grades',()=>{
 assert.equal(evaluate([c('MATH 137','1A','completed',null),c('MATH 147'),c('MATH 138','1B')],'MATH 138').status,'met');
});
test('approved transfer and passing historical attempts can supply evidence; failure and undersized credit cannot',()=>{
 const target=c('MATH 136','1B');
 assert.equal(evaluate([{...c('MATH 135'),origin:'transfer'},target],'MATH 136').status,'review');
 assert.equal(evaluate([{...c('MATH 135'),origin:'transfer',transferApproved:true},target],'MATH 136').status,'met');
 assert.equal(evaluate([target],'MATH 136',[c('MATH 135')]).status,'met');
 assert.equal(evaluate([target],'MATH 136',[c('MATH 135','1A','completed',20)]).status,'missing');
 assert.equal(evaluate([{...c('MATH 135'),units:0.25},target],'MATH 136').status,'missing');
});
test('CS486 statistics may be concurrent but CS341 must be earlier',()=>{
 assert.equal(evaluate([c('CS 341'),c('STAT 231','1B'),c('CS 486','1B')],'CS 486').status,'met');
 assert.equal(evaluate([c('CS 341','1B'),c('STAT 231','1B'),c('CS 486','1B')],'CS 486').status,'missing');
});
test('CR proves a pass but not a 60 percent grade threshold',()=>{
 const pass={...c('CS 145','1A','completed',null),gradeCode:'CR'};
 assert.equal(evaluate([pass,c('CS 136','1B'),c('CS 136L','1B')],'CS 136').status,'met');
 assert.equal(evaluate([{...c('MATH 135','1A','completed',null),gradeCode:'CR'},c('MATH 136','1B')],'MATH 136').status,'review');
});
test('CLC, failed and unresolved historical attempts do not supply prerequisite evidence',()=>{
 for(const extra of [{clc:true},{unresolved:true},{excludedAttempt:true},{grade:20}])assert.equal(evaluate([c('MATH 136','1B')],'MATH 136',[{...c('MATH 135'),...extra}]).status,'missing');
});
