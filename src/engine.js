import {core,mathA,engA} from './data.js';
import {equivalentCourses} from './elective-data.js';
import {usableCourse} from './credit.js';
export function normalize(code){return code.trim().toUpperCase().replace(/\s+/g,' ').replace(/^([A-Z]+)\s*(\d)/,'$1 $2');}
export function courseIdentity(code){const normalized=normalize(code);return equivalentCourses.find(group=>group.includes(normalized))?.[0]||normalized;}
export function unique(courses){
 const result=new Map(),rank={planned:0,current:1,completed:2};
 for(const c of courses){const key=courseIdentity(c.code),previous=result.get(key);if(!previous||(rank[c.status]??0)>=(rank[previous.status]??0))result.set(key,{...c,code:normalize(c.code)});}
 return [...result.values()];
}
const range=(c,lo,hi)=>{const m=/^CS (\d+)$/.exec(c);return !!m && +m[1]>=lo && +m[1]<=hi;};
const upper=c=>range(c,340,398)||range(c,440,489);
// Maximum bipartite matching prevents a broad elective slot from consuming a
// course needed by a narrower slot, and prevents duplicate credit within a block.
export function allocate(rules,courses){
 const owner=new Map();
 function visit(i,seen){for(const c of courses){if(seen.has(c.code)||!rules[i].accept(c.code)||c.units<(rules[i].requiredUnits||0))continue;seen.add(c.code);if(!owner.has(c.code)||visit(owner.get(c.code),seen)){owner.set(c.code,i);return true;}}return false;}
 rules.forEach((_,i)=>visit(i,new Set()));
 return rules.map((r,i)=>({...r,matched:[...owner].find(([,n])=>n===i)?.[0]||null}));
}
export function evaluate(courses,ai=true){
 const cs=unique(courses.filter(usableCourse));const rules=core.map(r=>({...r,accept:c=>r.codes.includes(c)}));
 for(let i=1;i<=3;i++)rules.push({id:`upper${i}`,label:`Upper-year CS elective ${i} (340–398 / 440–489)`,accept:upper});
 if(ai) rules.push({id:'ml',label:'Machine learning: CS 480 or CS 485',accept:c=>['CS 480','CS 485'].includes(c)},{id:'introai',label:'CS 486',accept:c=>c==='CS 486'},{id:'ethics',label:'CS 492',accept:c=>c==='CS 492'});
 else rules.push(...[1,2].map(i=>({id:`four${i}`,label:`400-level CS elective ${i} (440–489)`,accept:c=>range(c,440,489)})),{id:'advanced',label:'Advanced elective (see checklist)',accept:c=>range(c,440,498)||/^CS [67]\d\d$/.test(c)||['CS 499T','CO 487','STAT 440'].includes(c)});
 let list=[];
 if(ai){
  const has480=cs.some(c=>c.code==='CS 480'&&c.units>=0.5);const has485=cs.some(c=>c.code==='CS 485'&&c.units>=0.5);
  const eligible=cs.filter(c=>c.units>=0.5&&!(c.code==='CS 480'&&!has485)&&c.code!=='CS 485');
  // When both are present CS 485 fills the required ML slot; CS 480 may fill List A.
  const families=[['CS 479','AMATH 449'],['ECE 380','SE 380'],['SYDE 552','BIOL 487']];
  const seen=new Set();
  list=eligible.filter(c=>mathA.includes(c.code)||engA.includes(c.code)).filter(c=>{const key=families.find(f=>f.includes(c.code))?.[0]||c.code;if(seen.has(key))return false;seen.add(key);return true;});
 }
 const math=list.filter(c=>mathA.includes(c.code));const engineering=list.filter(c=>engA.includes(c.code));
 return {rows:allocate(rules.map(r=>({...r,requiredUnits:r.id==='CS 136L'?0.25:0.5})),cs),units:cs.reduce((n,c)=>n+c.units,0),list:list.map(c=>c.code),math:math.length,engineering:engineering.length,listSatisfied:list.length>=4&&math.length>=1&&engineering.length>=1};
}
export function validateState(value){
 if(!value||value.version!==1||typeof value.ai!=='boolean'||!Array.isArray(value.courses))throw Error('Unsupported plan file.');
 const validTerms=['1A','1B','WT1','2A','WT2','2B','WT3','3A','WT4','3B','WT5','4A','WT6','4B'];
 const codes=new Set();
 for(const c of value.courses){
  c.code=normalize(String(c.code));const identity=courseIdentity(c.code);
  if(!/^[A-Z]{2,8} \d{3}[A-Z]?$/.test(c.code)||codes.has(identity)||!validTerms.includes(c.term)||!['planned','current','completed'].includes(c.status)||!Number.isFinite(c.units)||c.units<=0||c.units>1||!Number.isInteger(c.units*4))throw Error('Plan contains an invalid, duplicate, or known cross-listed course.');
  if(c.grade!=null&&(!Number.isFinite(c.grade)||c.grade<0||c.grade>100))throw Error('Grades must be between 0 and 100.');
  if(c.status==='completed'&&c.grade!=null&&c.grade<50)throw Error('Completed means credit earned. A failing grade cannot be marked completed.');
  if(c.excludeBreadthDepth!=null&&typeof c.excludeBreadthDepth!=='boolean')throw Error('Invalid breadth/depth exclusion.');
  if(c.creditType!=null&&!['auto','math','nonmath','excluded'].includes(c.creditType))throw Error('Invalid course credit classification.');
  if(c.origin!=null&&!['waterloo','transfer'].includes(c.origin))throw Error('Invalid credit origin.');
  if(c.transferApproved!=null&&typeof c.transferApproved!=='boolean')throw Error('Invalid transfer approval.');
  if(c.gradeCode!=null&&!['','CR','AEG'].includes(c.gradeCode))throw Error('Invalid completed-course grade code.');
  if(c.gradeCode&&c.grade!=null)throw Error('Enter either a numeric grade or a grade code.');
  codes.add(identity);
 }
 if(value.courses.some(c=>c.code==='CS 136L'&&c.units!==0.25))throw Error('CS 136L must carry 0.25 units.');
 validateAuditRecords(value,validTerms);
 return value;
}
function validateAuditRecords(value,validTerms){
 const boolean=(v)=>v===undefined||typeof v==='boolean';
 const validUnits=n=>Number.isFinite(n)&&n>0&&n<=3&&Number.isInteger(n*4);
 const histories=value.attemptHistory||[];
 if(!Array.isArray(histories)||histories.length>500)throw Error('Invalid attempt history.');
 const keys=new Set(value.courses.filter(c=>c.status==='completed').map(c=>`${courseIdentity(c.code)}|${c.term}`));
 for(const a of histories){
  a.code=normalize(String(a.code));const k=`${courseIdentity(a.code)}|${a.term}`;
  if(!/^[A-Z]{2,8} \d{3}[A-Z]?$/.test(a.code)||!validTerms.includes(a.term)||!validUnits(a.units)||keys.has(k)||!boolean(a.clc)||!boolean(a.excludedAttempt)||!boolean(a.unresolved))throw Error('Invalid or duplicate historical attempt.');
  if(a.grade!=null&&(!Number.isFinite(a.grade)||a.grade<0||a.grade>100))throw Error('Invalid attempt grade.');
  if(a.gradeCode&&!['CR','AEG','NCR','WD','WF','DNW','FTC','NMR','INC','IP','NG','MM','UR'].includes(a.gradeCode))throw Error('Invalid attempt grade code.');
  if(a.grade!=null&&a.gradeCode)throw Error('Enter a numeric grade or a grade code, not both.');
  if(a.grade==null&&!a.gradeCode&&!a.unresolved)throw Error('Each historical attempt needs a grade or grade code.');
  if(a.origin!=null&&!['waterloo','transfer'].includes(a.origin))throw Error('Invalid attempt origin.');
  if(a.creditType!=null&&!['auto','math','nonmath','excluded'].includes(a.creditType))throw Error('Invalid attempt classification.');
  keys.add(k);
 }
 const audit=value.audit||{};
 if(typeof audit!=='object'||Array.isArray(audit))throw Error('Invalid audit evidence.');
 for(const k of ['historyReviewed','classificationsReviewed','contentReviewed'])if(!boolean(audit[k]))throw Error('Invalid audit review flag.');
 for(const key of ['fullTimeTerms','workTerms'])if(audit[key]!=null&&(typeof audit[key]!=='object'||Array.isArray(audit[key])))throw Error('Invalid term evidence.');
 for(const [term,result] of Object.entries(audit.fullTimeTerms||{}))if(!validTerms.includes(term)||term.startsWith('WT')||!['unknown','confirmed','not-full-time'].includes(result))throw Error('Invalid full-time term evidence.');
 for(const [term,result] of Object.entries(audit.workTerms||{}))if(!validTerms.includes(term)||!term.startsWith('WT')||!['unknown','planned','standard','flexible','not-credited'].includes(result))throw Error('Invalid co-op term evidence.');
 if(!Array.isArray(value.pdCourses||[])||(value.pdCourses||[]).length>50)throw Error('Invalid PD records.');
 const pdCodes=new Set();
 for(const p of value.pdCourses||[]){if(!/^PD [1-9]\d?$/.test(p.code)||pdCodes.has(p.code)||!validTerms.includes(p.term)||!['planned','current','completed'].includes(p.status))throw Error('Invalid or duplicate PD course.');pdCodes.add(p.code);}
}
