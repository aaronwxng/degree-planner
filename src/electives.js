import {breadthCategories,communication1,communication2,depthChains} from './elective-data.js';
import {unique,normalize} from './engine.js';
import {engA,terms} from './data.js';
import {usableCourse,creditType} from './credit.js';

const subject=c=>c.code.split(' ')[0];
const sum=cs=>cs.reduce((n,c)=>n+c.units,0);
const commCode=code=>code==='MTHEL 300'?'ENGL 378':code;
const inList1=c=>communication1.includes(commCode(c.code));
const inCommunication=c=>inList1(c)||communication2.includes(commCode(c.code));
const knownSubject=c=>breadthCategories.some(b=>b.subjects.includes(subject(c)))||subject(c)==='EMLS'||c.code==='MTHEL 300';

// Each course goes into at most one breadth category. Capped quarter-unit states
// find the best allocation without splitting one course between science buckets.
export function allocateBreadth(courses){
 const targets=breadthCategories.map(b=>b.required*4);
 let states=new Map([['0,0,0,0',{units:[0,0,0,0],groups:[[],[],[],[]]}]]);
 for(const c of courses){
  const next=new Map(states);
  for(const state of states.values()) breadthCategories.forEach((b,i)=>{
   if(!b.subjects.includes(subject(c))||(b.id==='humanities'&&inList1(c))||state.units[i]>=targets[i])return;
   const units=[...state.units];units[i]=Math.min(targets[i],units[i]+c.units*4);
   const groups=state.groups.map(g=>[...g]);groups[i].push(c.code);
   const key=units.join(',');if(!next.has(key))next.set(key,{units,groups});
  });
  states=next;
 }
 const best=[...states.values()].sort((a,b)=>b.units.reduce((n,v)=>n+v,0)-a.units.reduce((n,v)=>n+v,0)||b.units[2]-a.units[2])[0];
 return breadthCategories.map((b,i)=>({...b,units:best.units[i]/4,courses:best.groups[i],eligibleCourses:courses.filter(c=>b.subjects.includes(subject(c))&&!(b.id==='humanities'&&inList1(c))).map(c=>c.code),satisfied:best.units[i]>=targets[i]}));
}

function communication(courses,projected){
 // Only the first course needs 60%. A different additional List I course can
 // satisfy the second slot with earned credit even if its grade is below 60%.
 const firstChoices=courses.filter(c=>inList1(c)&&c.units>=0.5&&(c.status!=='completed'?projected:Number.isFinite(c.grade)&&c.grade>=60)).sort((a,b)=>terms.findIndex(t=>t.id===a.term)-terms.findIndex(t=>t.id===b.term));
 let first=null,second=null;
 for(const candidate of firstChoices){const other=courses.find(c=>c.code!==candidate.code&&c.units>=0.5&&inCommunication(c));if(!first||other){first=candidate;second=other||null;}if(other)break;}
 const missingGrade=courses.filter(c=>inList1(c)&&c.status==='completed'&&c.grade==null).map(c=>c.code);
 const lowGrade=courses.filter(c=>inList1(c)&&c.status==='completed'&&c.grade!=null&&c.grade<60).map(c=>c.code);
 const firstIndex=first?terms.findIndex(t=>t.id===first.term):-1;
 return {first:first?.code||null,second:second?.code||null,satisfied:!!first&&!!second,missingGrade,lowGrade,
  firstTiming:first?(firstIndex<terms.findIndex(t=>t.id==='2A')?'before-2A':'late'):null,
  conditional:!!first&&first.status!=='completed'};
}

export function evaluateElectives(input,{ai=true,projected=true}={}){
 const courses=unique(input.filter(c=>usableCourse(c)&&(projected||c.status==='completed')));
 const excluded=courses.filter(c=>c.excludeBreadthDepth||ai&&engA.includes(c.code));
 const eligible=courses.filter(c=>knownSubject(c)&&creditType(c)==='nonmath'&&!excluded.includes(c));
 const unknown=courses.filter(c=>!knownSubject(c)&&!['ACTSC','AMATH','CO','CS','MATBUS','MATH','PMATH','STAT','MTHEL','PD','COOP','WKRPT','SEQ','ECE','SE','MTE','SYDE'].includes(subject(c)));
 const grouped=Map.groupBy?Map.groupBy(eligible,subject):eligible.reduce((m,c)=>m.set(subject(c),[...(m.get(subject(c))||[]),c]),new Map());
 const depth=[...grouped].map(([name,cs])=>{
  const units=sum(cs),upper=sum(cs.filter(c=>Number.parseInt(c.code.split(' ')[1],10)>=300));
  const chain=depthChains.find(chain=>chain.every(code=>cs.some(c=>c.code===code&&c.units>=0.5)));
  return {subject:name,units,upper,courses:cs.map(c=>c.code),chain:chain||null,satisfied:units>=1.5&&(upper>=0.5||!!chain),
   missingUnits:Math.max(0,1.5-units),needsUpper:upper<0.5&&!chain,chainNeedsReview:units>=1.5&&upper<0.5&&!chain};
 }).sort((a,b)=>Number(b.satisfied)-Number(a.satisfied)||b.units-a.units||a.subject.localeCompare(b.subject));
 return {breadth:allocateBreadth(eligible),depth,depthSatisfied:depth.some(d=>d.satisfied),communication:communication(courses.map(c=>({...c,code:commCode(c.code)})),projected),
  nonMathUnits:sum(courses.filter(c=>creditType(c)==='nonmath'&&!(ai&&engA.includes(c.code)))),excluded:excluded.map(c=>c.code),unknown:unknown.map(c=>normalize(c.code))};
}
