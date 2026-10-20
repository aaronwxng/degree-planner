import {terms} from './data.js';
import {normalize} from './engine.js';
import {prerequisiteSources} from './prerequisite-sources.js';
const course=(code,min=50)=>({code,min});
const any=(...rules)=>({any:rules});
const all=(...rules)=>({all:rules});
const one=(...codes)=>any(...codes.map(code=>course(code)));
const intro=any(course('CS 115',90),course('CS 116',70),course('CS 135',60),course('CS 145'));
const algebra=any(course('MATH 135',60),course('MATH 145'));
const probability=one('STAT 206','STAT 230','STAT 240');
const statistics=one('STAT 206','STAT 231','STAT 241');
const calculus=one('MATH 118','MATH 119','MATH 128','MATH 138','MATH 148');
// Rules below encode course/grade conditions for the BCS profile. Program,
// high-school, override and standing conditions remain separate review items.
export const prerequisiteRules={
 'CS 135':{},
 'CS 136':{pre:intro,co:course('CS 136L')},
 'CS 136L':{pre:intro,co:one('CS 136','CS 146')},
 'CS 240':{pre:all(one('CS 245','CS 245E','SE 212'),one('CS 241','CS 241E','CS 246','CS 246E','CS 247'),probability)},
 'CS 241':{pre:any(course('CS 138'),all(course('CS 136L'),any(course('CS 136',85),course('CS 146',85))),all(course('CS 136L'),one('CS 246','CS 246E')))},
 'CS 245':{pre:all(one('CS 136','CS 138','CS 146'),one('MATH 135','MATH 145'))},
 'CS 246':{pre:any(all(course('CS 136L'),course('CS 146')),course('CS 138',60),all(course('CS 136L'),course('CS 136',60)))},
 'CS 251':{pre:one('CS 136','CS 138','CS 146')},
 'CS 341':{pre:all(one('CS 240','CS 240E'),one('CS 245','CS 245E','SE 212'),one('MATH 239','MATH 249'),probability)},
 'CS 350':{pre:all(one('CS 240','CS 240E'),one('CS 241','CS 241E'),one('CS 246','CS 246E'),one('CS 251','CS 251E','ECE 222'))},
 'MATH 135':{review:'High-school prerequisites and admission conditions need review.'},
 'MATH 136':{pre:algebra},
 'MATH 137':{review:'4U Calculus and Vectors or approved equivalent needs review.'},
 'MATH 138':{pre:any(course('MATH 147'),course('MATH 116',70),course('MATH 117',70),course('MATH 127',70),course('MATH 137',60))},
 'MATH 239':{pre:all(any(course('MATH 106',70),one('MATH 136','MATH 146')),algebra)},
 'STAT 230':{pre:any(course('MATH 116',80),course('MATH 117',80),course('MATH 137',80),course('MATH 147',80),course('MATH 128',60),one('MATH 118','MATH 119','MATH 138','MATH 148'))},
 'STAT 231':{pre:all(calculus,any(course('STAT 220',70),one('STAT 230','STAT 240')))},
 'CS 480':{pre:all(course('CS 341'),statistics)},
 'CS 485':{pre:all(course('CS 341'),probability)},
 'CS 486':{pre:course('CS 341'),co:statistics},
 'CS 492':{pre:one('CS 240','CS 240E')},
};
const labels={met:'Recorded prerequisites',projected:'Prerequisites planned',review:'Needs review',missing:'Plan issue',unreviewed:'Not checked'};
const ranks={met:0,projected:1,review:2,missing:3};
const termIndex=term=>terms.findIndex(t=>t.id===term);
export function describeRule(rule){
 if(rule.code)return rule.code+(rule.min>50?` (≥${rule.min}%)`:'');
 const children=rule.all||rule.any;
 return '('+children.map(describeRule).join(rule.all?' AND ':' OR ')+')';
}
function check(rule,target,records,concurrent=false){
 if(rule.all||rule.any){
  const values=(rule.all||rule.any).map(r=>check(r,target,records,concurrent));
  return values.reduce((best,v)=>(rule.all?ranks[v]>ranks[best]:ranks[v]<ranks[best])?v:best);
 }
 const eligible=records.filter(c=>normalize(c.code)===rule.code&&termIndex(c.term)>=0&&termIndex(c.term)<termIndex(target.term)+(concurrent?1:0)&&c.units>=(rule.code==='CS 136L'?0.25:0.5));
 const results=eligible.map(c=>{
  if(c.origin==='transfer'&&!c.transferApproved)return 'review';
  if(c.status!=='completed')return 'projected'; // Future grades are never evidence.
  if(c.grade!=null)return c.grade>=rule.min?'met':'missing';
  return rule.min>50?'review':'met'; // Earned credit proves a pass, not a higher grade.
 });
 return results.length?results.reduce((a,b)=>ranks[a]<ranks[b]?a:b):'missing';
}
export function evaluatePrerequisites(state){
 const records=[...state.courses,...(state.attemptHistory||[]).filter(a=>!a.clc&&!a.excludedAttempt&&!a.unresolved&&(a.grade>=50||['CR','AEG'].includes(a.gradeCode))).map(a=>({...a,status:'completed'}))];
 return state.courses.map(c=>{
  const code=normalize(c.code),rule=prerequisiteRules[code],source=prerequisiteSources[code];
  if(!rule)return {code,term:c.term,status:'unreviewed',label:labels.unreviewed,notes:['No reviewed prerequisite rule yet. Check the official calendar.']};
  const checks=[];
  if(rule.pre)checks.push({status:check(rule.pre,c,records),text:'Before this term: '+describeRule(rule.pre)});
  if(rule.co)checks.push({status:check(rule.co,c,records,true),text:'Before or in this term: '+describeRule(rule.co)});
  if(rule.review)checks.push({status:'review',text:rule.review});
  const conflicts=records.filter(other=>normalize(other.code)!==code&&source.antirequisites.includes(normalize(other.code)));
  if(conflicts.length)checks.push({status:'missing',text:'Antirequisite in your record or plan: '+[...new Set(conflicts.map(x=>x.code))].join(', ')});
  const status=checks.reduce((s,c)=>ranks[c.status]>ranks[s]?c.status:s,'met');
  return {code,term:c.term,status,label:labels[status],checks,source:`https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/courses/${source.pid}`};
 });
}
