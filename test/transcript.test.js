import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTranscript,prepareTranscriptReview,mergeTranscript,textItemsToLines} from '../src/transcript.js';
import {initialState} from '../src/data.js';
const header='Course Description Attempted Earned Grade';
const text=lines=>`Undergraduate Unofficial Transcript\nFall 2025\n${header}\n${lines}`;
const review=(value,state=initialState())=>prepareTranscriptReview(parseTranscript(value),state);

test('extracts earned course credit, grades, and term without retaining identity text',()=>{
 const rows=review(text('CS 135 Designing Functional Programs 0.50 0.50 88\nCS 136L Tools 0.25 0.25 CR'));
 assert.equal(rows[0].grade,88);assert.equal(rows[0].term,'1A');assert.equal(rows[0].status,'completed');assert.ok(rows[0].selected);
 assert.equal(rows[1].gradeCode,'CR');assert.equal(rows[1].units,0.25);assert.ok(!JSON.stringify(rows).includes('Undergraduate'));
});
test('ungraded rows never become completed, but explicit IP may be current',()=>{
 const rows=review(text('CS 135 Functional Programs 0.50 0.00\nMATH 135 Algebra 0.50 0.00 IP\nMATH 137 Calculus 0.50 0.50'));
 assert.equal(rows[0].eligible,false);assert.equal(rows[1].status,'current');assert.ok(rows[1].selected);assert.equal(rows[2].eligible,false);
});
test('no-credit grade codes and failures never enter projected or completed credit',()=>{
 for(const grade of ['WD','WF','NCR','INC','FTC','DNW','NMR','49']){
  const row=review(text(`CS 135 Course 0.50 0.00 ${grade}`))[0];assert.equal(row.eligible,false,grade);assert.equal(row.selected,false,grade);
 }
});
test('numeric pass without earned credit, and failing grade with earned credit, are conflicts',()=>{
 for(const line of ['CS 135 Course 0.50 0.00 88','CS 135 Course 0.50 0.50 40'])assert.equal(review(text(line))[0].eligible,false);
});
test('unit columns must be labelled, adjacent, and unambiguous',()=>{
 assert.equal(review('Fall 2025\nCS 135 Course 0.50 0.50 90')[0].eligible,false);
 assert.equal(review(text('CS 135 Course 0.50 90'))[0].eligible,false);
 assert.equal(review(text('CS 135 Course 0.50 / 0.50 90'))[0].eligible,true);
});
test('term mapping uses calendar dates, including study and work terms',()=>{
 const rows=review(`${text('CS 135 Course 0.50 0.50 88')}\n2026 Winter\nMATH 136 Algebra 0.50 0.50 80\nSpring 2026\nSCI 206 Science 0.50 0.50 85`);
 assert.deepEqual(rows.map(r=>r.term),['1A','1B','WT1']);
});
test('unmapped dates require explicit term selection',()=>{
 const rows=review(`Fall 2024\n${header}\nCS 135 Course 0.50 0.50 88`);
 assert.equal(rows[0].selected,false);rows[0].selected=true;assert.throws(()=>mergeTranscript(initialState(),rows));
 rows[0].term='1A';assert.equal(mergeTranscript(initialState(),rows).courses.find(c=>c.code==='CS 135').status,'completed');
});
test('transfer and administrative rows are flagged instead of assumed degree credit',()=>{
 const rows=review(`Transfer Credits\n${header}\nMATH 135 Equivalency 0.50 0.50 CR\nFall 2025\nPD 1 Career Fundamentals 0.00 0.00 CR`);
 assert.ok(rows[0].transfer);assert.equal(rows[0].eligible,false);assert.equal(rows[1].eligible,false);
});
test('repeats and cross-listings need one explicitly selected attempt',()=>{
 const rows=review(text('CS 135 Course 0.50 0.50 80\nCS 135 Course 0.50 0.50 90'));
 assert.ok(rows.every(r=>r.repeated&&!r.selected));rows.forEach(r=>r.selected=true);assert.throws(()=>mergeTranscript(initialState(),rows),/one attempt/);
 rows[0].selected=false;assert.equal(mergeTranscript(initialState(),rows).courses.find(c=>c.code==='CS 135').grade,90);
 const aliases=review(text('ENGL 129R Writing 0.50 0.50 CR\nEMLS 129R Writing 0.50 0.50 CR'));assert.ok(aliases.every(r=>r.repeated));
});
test('merge updates a planned course, preserves future courses, AI setting, and exclusion',()=>{
 const state=initialState();state.ai=false;state.courses.find(c=>c.code==='CS 135').excludeBreadthDepth=true;
 const before=JSON.stringify(state),rows=review(text('CS 135 Course 0.50 0.50 88'),state),next=mergeTranscript(state,rows);
 assert.equal(JSON.stringify(state),before);assert.equal(next.ai,false);assert.ok(next.courses.some(c=>c.code==='CS 350'&&c.status==='planned'));
 const imported=next.courses.find(c=>c.code==='CS 135');assert.ok(imported.excludeBreadthDepth);assert.equal(imported.grade,88);assert.equal(imported.source,'transcript');
});
test('completed records stay unchecked and cannot be downgraded by IP',()=>{
 const state=initialState();state.courses[0].status='completed';state.courses[0].grade=80;
 const rows=review(text('CS 135 Course 0.50 0.00 IP'),state);assert.equal(rows[0].selected,false);rows[0].selected=true;assert.throws(()=>mergeTranscript(state,rows),/Cannot replace/);
});
test('quarter-unit lab credit is respected and unsupported units are blocked',()=>{
 assert.ok(review(text('CS 136L Tools 0.25 0.25 90'))[0].eligible);
 assert.equal(review(text('CS 136L Tools 0.50 0.50 90'))[0].eligible,false);
 assert.equal(review(text('CS 135 Course 0.50 1.00 90'))[0].eligible,false);
});
test('PDF text extraction groups by baseline and sorts columns independently of object order',()=>{
 const item=(str,x,y)=>({str,transform:[1,0,0,1,x,y]});
 assert.deepEqual(textItemsToLines([item('88',200,50),item('Fall 2025',10,80),item('CS 135',10,50),item('0.50',100,50.5)]),['Fall 2025','CS 135 0.50 88']);
});
test('empty and unrelated documents make no changes',()=>{
 assert.deepEqual(parseTranscript('Student Name\nNot a transcript').rows,[]);
 assert.throws(()=>mergeTranscript(initialState(),[]),/Select/);
});
test('decimal grades and grade points do not become extra unit columns',()=>{
 const row=review(text('CS 135 Course 0.50 0.50 84.50 42.25'))[0];assert.ok(row.eligible);assert.equal(row.grade,84.5);
});
test('additional grade annotations require explicit review rather than automatic selection',()=>{
 const row=review(text('CS 135 Course 0.50 0.50 88 EXC'))[0];assert.ok(row.reviewRequired);assert.equal(row.selected,false);
});
test('grade reports expose grades but require confirmation because earned units are absent',()=>{
 const rows=review('UNOFFICIAL GRADE REPORT\nFall 2025\nCS\t135\tFunctional Programs\t87\nCS\t136L\tTools\tCR');
 assert.equal(rows[0].grade,87);assert.equal(rows[0].attempted,null);assert.equal(rows[0].earned,null);assert.equal(rows[0].units,0.5);
 assert.ok(rows.every(r=>r.canConfirmCredit&&!r.selected&&!r.eligible));
 rows[0].selected=true;rows[0].eligible=true;assert.throws(()=>mergeTranscript(initialState(),rows),/Confirm earned/);
 rows[0].creditConfirmed=true;const next=mergeTranscript(initialState(),rows);assert.equal(next.courses.find(c=>c.code==='CS 135').creditEvidence,'user-confirmed');
 assert.equal(rows[1].units,0.25);
});
test('ungraded grade-report rows and numeric course titles do not establish completion',()=>{
 const rows=review('UNOFFICIAL GRADE REPORT\nFall 2026\nMATH\t237\tCalculus 3\nECON\t201\tMicroeconomics\nSEQ\t1\tCo-op Sequence 1\nPD\t11\tReport Writing\tCR');
 assert.ok(rows.every(r=>!r.canConfirmCredit&&!r.selected));assert.equal(rows[0].grade,null);
});
test('grade-report failures and creditless codes cannot be confirmed as earned credit',()=>{
 for(const token of ['WD','WF','NCR','INC','IP','49'])assert.equal(review(`UNOFFICIAL GRADE REPORT\nFall 2025\nCS\t135\tFunctional Programs\t${token}`)[0].canConfirmCredit,false);
});
