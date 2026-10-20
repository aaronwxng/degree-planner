import {evaluate,unique,courseIdentity} from './engine.js';
import {evaluateElectives} from './electives.js';
import {academicCourse,usableCourse,creditType,gradeCode,knownIneligible} from './credit.js';
import {engA,terms} from './data.js';

const sum=rows=>rows.reduce((n,c)=>n+c.units,0);
const failureCodes=new Set(['DNW','FTC','NCR','NMR','WF']);
const fixed32=new Set(['DNW','FTC','NMR','WF']);
const finalCodes=new Set(['CR','AEG','WD','NCR',...fixed32]);
const termIndex=term=>terms.findIndex(t=>t.id===term);
export const auditSources={
 degree:'https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/programs/r1y1WO5ka',
 major:'https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/programs/SJPJkCAih',
 definitions:'https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/policy/SJP3vv7pp',
 averages:'https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/policy/Sk2s2wXT6',
 grades:'https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/policy/rkrb6r5V6',
 repeats:'https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/policy/BktTku7p6',
};
export function isMajorCourse(code){
 const match=/^CS (\d{3})[A-Z]?$/.exec(code),n=match?Number(match[1]):0;
 return ['CS 136','CS 138','CS 146','AMATH 242','CO 481','CO 487','ECE 222','ECE 451','ECE 452','ECE 453','FINE 383','PHYS 467','SE 212','SE 350','SE 463','SE 464','SE 465','STAT 440'].includes(code)||!!match&&((n>=240&&n<=299)||(n>=340&&n<=399)||(n>=440&&n<=499)||(n>=600&&n<=799));
}
export function averageOf(attempts,{major=false}={}){
 let numerator=0,denominator=0,count=0;const missing=[];
 for(const a of attempts){
  if(!academicCourse(a)||knownIneligible.has(a.code)||a.creditType==='excluded'||a.excludedAttempt||a.origin==='transfer'||major&&!isMajorCourse(a.code))continue;
  const code=gradeCode(a);let grade=null;
  if(Number.isFinite(a.grade))grade=Math.max(32,a.grade);
  else if(fixed32.has(code))grade=32;
  else if(!['CR','AEG','NCR','WD'].includes(code))missing.push(a.code);
  if(grade!==null){numerator+=grade*a.units;denominator+=a.units;count++;}
 }
 return {value:denominator?numerator/denominator:null,count,missing};
}
export function evaluateAudit(state){
 const settings=state.audit||{},reviewed=!!settings.historyReviewed,classified=!!settings.classificationsReviewed;
 const all=unique(state.courses.filter(usableCourse)),done=all.filter(c=>c.status==='completed');
 const records=state.courses.filter(c=>c.status==='completed'&&academicCourse(c)).map(c=>({...c,clc:false}));
 const recordKeys=new Set(records.map(a=>`${courseIdentity(a.code)}|${a.term}`));
 const attempts=[...records,...(state.attemptHistory||[]).filter(a=>!recordKeys.has(`${courseIdentity(a.code)}|${a.term}`))];
 const failed=attempts.filter(a=>academicCourse(a)&&(Number.isFinite(a.grade)&&a.grade<50||failureCodes.has(gradeCode(a))));
 const clc=attempts.filter(a=>academicCourse(a)&&a.clc===true&&!failed.includes(a));
 const unresolved=attempts.filter(a=>!Number.isFinite(a.grade)&&!finalCodes.has(gradeCode(a)));
 const passCounts=new Map();for(const a of attempts)if(a.grade>=50||['CR','AEG'].includes(gradeCode(a)))passCounts.set(courseIdentity(a.code),(passCounts.get(courseIdentity(a.code))||0)+1);
 const repeatReview=[...passCounts].filter(([code,count])=>count>1&&clc.filter(a=>courseIdentity(a.code)===code).length<count-1).map(([code])=>code);
 const rows=[];
 const row=(id,label,status,detail,source='degree')=>rows.push({id,label,status,detail,source:auditSources[source]});
 const minimum=(id,label,current,projected,target,needsReview=false,source='degree')=>row(id,label,current>=target?(needsReview?'review':'satisfied'):'missing',`${current.toFixed(2)} completed · ${projected.toFixed(2)} projected / ${target.toFixed(2)} required${needsReview?' · eligibility review needed':''}`,source);
 const creditReview=!classified||state.courses.some(c=>c.origin==='transfer'&&!c.transferApproved);
 minimum('total','Total degree credit',sum(done),sum(all),20,creditReview);
 minimum('math','Math course credit',sum(done.filter(c=>creditType(c)==='math')),sum(all.filter(c=>creditType(c)==='math')),11.25,creditReview,'major');
 const nonmath=cs=>cs.filter(c=>creditType(c)==='nonmath'&&!(state.ai&&engA.includes(c.code)));
 minimum('nonmath','Non-math elective credit',sum(nonmath(done)),sum(nonmath(all)),5,creditReview,'major');
 const coreDone=evaluate(done,state.ai),corePlan=evaluate(all,state.ai);
 const missing=coreDone.rows.filter(r=>!r.matched);
 row('courses','Required courses and distinct CS electives',missing.length?'missing':creditReview?'review':'satisfied',`${coreDone.rows.length-missing.length} completed · ${corePlan.rows.filter(r=>r.matched).length} projected / ${coreDone.rows.length} slots. ${missing.length?`Missing: ${missing.map(r=>r.label).join('; ')}`:'Every slot has distinct completed credit.'}`,'major');
 const electivesDone=evaluateElectives(state.courses,{ai:state.ai,projected:false}),electivesPlan=evaluateElectives(state.courses,{ai:state.ai});
 row('breadth','Breadth categories',electivesDone.breadth.every(r=>r.satisfied)?settings.contentReviewed&&classified?'satisfied':'review':'missing',electivesDone.breadth.map(b=>`${b.label}: ${b.units.toFixed(2)}/${b.required.toFixed(2)}`).join(' · '),'major');
 row('depth','Depth',electivesDone.depthSatisfied?settings.contentReviewed&&classified?'satisfied':'review':electivesDone.depth.some(d=>d.chainNeedsReview)?'review':'missing',electivesDone.depthSatisfied?'Completed courses meet a checked depth pathway.':electivesPlan.depthSatisfied?'Covered by planned courses; not completed.':'Needs 1.5 same-subject units with 0.5 at 300+, or a verified three-course chain.','major');
 const communication=electivesDone.communication;
 row('communication','Two communication courses',communication.satisfied?'satisfied':communication.missingGrade.length?'review':'missing',communication.satisfied?`${communication.first} + ${communication.second}`:'Needs a verified List I grade ≥60% plus a distinct additional List I/II course.');
 row('communication-timing','First communication course before 2A',communication.firstTiming==='before-2A'?'satisfied':communication.firstTiming==='late'?'review':'missing',communication.firstTiming==='late'?'The recorded first qualifying course is in 2A or later; an advisor must review this.':'First List I course must be completed with ≥60% before 2A. On-campus guidance is shown in communication details.');
 for(const [id,label,major] of [['cav','Cumulative average ≥60%',false],['mav','CS major average ≥60%',true]]){
  const avg=averageOf(attempts,{major}),enough=avg.count>=(major?2:1);
  row(id,label,!enough||!reviewed||!classified||avg.missing.length||repeatReview.length||unresolved.length?'review':avg.value<60?'missing':'satisfied',`${avg.value===null?'No numeric grades':`${(Math.floor(avg.value*1000)/1000).toFixed(3)}% from ${avg.count} graded attempts`} · unit weighted; grades below 32 count as 32. ${avg.missing.length?`Missing grades: ${avg.missing.join(', ')}.`:''} ${!reviewed?'Complete-history confirmation needed.':''}`,'averages');
 }
 const excluded=attempts.filter(a=>academicCourse(a)&&a.excludedAttempt&&!failed.includes(a));
 const failureUnits=sum(failed)+sum(excluded),unusableUnits=sum(failed)+sum(clc);
 row('failures','Failed/excluded unit limit',failureUnits>2?'missing':!reviewed||unresolved.length||excluded.length?'review':'satisfied',`${failureUnits.toFixed(2)} / maximum 2.00 units. WD does not count as a failure. Historical exclusions and exceptions need advisor review.`);
 row('unusable','Unusable-attempt limit',unusableUnits>5?'missing':!reviewed||unresolved.length||repeatReview.length?'review':'satisfied',`${unusableUnits.toFixed(2)} / maximum 5.00 units (failures + CLC). ${repeatReview.length?`Confirm CLC designations for repeated passes: ${repeatReview.join(', ')}.`:''}`,'definitions');
 const attemptCounts=new Map();for(const a of attempts)attemptCounts.set(courseIdentity(a.code),(attemptCounts.get(courseIdentity(a.code))||0)+1);
 const over=[...attemptCounts].filter(([,n])=>n>3);
 row('repeat-limit','Maximum three attempts per course',over.length?'review':reviewed?'satisfied':'review',over.length?`Advisor review required: ${over.map(([code,n])=>`${code} (${n})`).join(', ')}. Known cross-listings share an identity.`:'WD counts as an attempt. Antirequisite equivalencies and exceptions need review.','repeats');
 const fullTime=settings.fullTimeTerms||{},confirmed=Object.values(fullTime).filter(v=>v==='confirmed').length;
 const projected=terms.filter(t=>!t.work&&(fullTime[t.id]==='confirmed'||sum(all.filter(c=>c.term===t.id&&c.origin!=='transfer'))>=1.5)).length;
 row('residency','Eight full-time terms',confirmed>=8?'satisfied':'missing',`${confirmed} confirmed · ${projected} projected / 8 terms. Projected load uses ≥1.5 academic units; confirm official full-time enrolment separately.`);
 const work=settings.workTerms||{},credited=Object.values(work).filter(v=>['standard','flexible'].includes(v)),standard=credited.filter(v=>v==='standard');
 row('work','Five credited co-op terms',credited.length>=5?'satisfied':'missing',`${credited.length}/5 credited. A scheduled WT alone does not count.`);
 row('standard-work','Three standard co-op terms',standard.length>=3?'satisfied':'missing',`${standard.length}/3 standard credited work terms; flexible work terms do not fill this minimum.`);
 const pd=state.pdCourses||[],pdDone=pd.filter(p=>p.status==='completed'),codes=new Set(pdDone.map(p=>p.code));
 row('pd','Five distinct PD courses',codes.size>=5?'satisfied':'missing',`${codes.size}/5 completed · ${new Set(pd.map(p=>p.code)).size} projected. Required: PD 1, PD 11, PD 10, plus two other distinct PD courses.`);
 const requiredPd=['PD 1','PD 11','PD 10'];
 row('pd-core','PD 1, PD 11 and PD 10',requiredPd.every(c=>codes.has(c))?'satisfied':'missing',`Missing: ${requiredPd.filter(c=>!codes.has(c)).join(', ')||'none'}.`);
 const first=pdDone.find(p=>p.code==='PD 1'),eleven=pdDone.find(p=>p.code==='PD 11');
 const pdTiming=first&&!terms.find(t=>t.id===first.term)?.work&&termIndex(first.term)<termIndex('WT1')&&eleven?.term==='WT1';
 const guidance=pdDone.filter(p=>p.code!=='PD 1'&&!terms.find(t=>t.id===p.term)?.work);
 row('pd-timing','PD sequence and term placement',!first||!eleven?'missing':!pdTiming||guidance.length?'review':'satisfied',`PD 1: academic term before WT1. PD 11: WT1. PD 10 and additional PD normally taken on work terms. ${guidance.length?'Nonstandard study-term PD placement needs advisor review.':''}`);
 if(state.ai)row('ai','AI List A and faculty mix',coreDone.listSatisfied?settings.contentReviewed?'satisfied':'review':'missing',`${coreDone.list.length}/4 List A courses · ${coreDone.math} Math · ${coreDone.engineering} Engineering. CS 480/485 exclusion and paired alternatives are applied.`,'major');
 row('credit-review','Course eligibility and transfer/cross-listing review',creditReview?'review':'satisfied','Confirm course eligibility, non-math classification, barred courses and transfer approvals. An override in the course editor must follow the calendar.','definitions');
 row('history-review','Complete prior-attempt history',reviewed&&!unresolved.length&&!repeatReview.length?'satisfied':'review','Include failures, WD, repeats and CLC designations. Importing a subset or grade report alone does not establish a complete history.','definitions');
 return {rows,counts:{satisfied:rows.filter(r=>r.status==='satisfied').length,missing:rows.filter(r=>r.status==='missing').length,review:rows.filter(r=>r.status==='review').length},attempts,failedUnits:failureUnits,unusableUnits};
}
