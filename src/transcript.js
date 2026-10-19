import {normalize,courseIdentity,validateState} from './engine.js';
import {terms} from './data.js';

const nonCredit=new Set(['WD','WF','NCR','INC','IP','FTC','DNW','NMR','NG','AEG','AUD','UR']);
const adminSubjects=new Set(['PD','COOP','WKRPT','SEQ']);
const gradePattern=/^(?:\d{1,3}(?:\.\d+)?|[A-Z]{1,4})$/;
const unitPattern=/^\d{1,2}\.\d{1,3}$/;
const numericGrade=value=>/^\d{1,3}(?:\.\d+)?$/.test(value)?Number(value):null;
export function termForDate(season,year){return terms.find(t=>t.date===`${season} ${year}`)?.id||'';}

// Coordinates retain column order even when PDF internal text objects are out of
// order. The input is text-content items, not rendered pixels; no OCR is attempted.
export function textItemsToLines(items,{preserveColumns=false}={}){
 const rows=[];
 for(const item of items){
  if(!item.str?.trim()||!Array.isArray(item.transform))continue;
  const y=item.transform[5],x=item.transform[4];
  let row=rows.find(r=>Math.abs(r.y-y)<=2);if(!row){row={y,items:[]};rows.push(row);}
  row.items.push({x,text:item.str.trim()});
 }
 return rows.sort((a,b)=>b.y-a.y).map(row=>row.items.sort((a,b)=>a.x-b.x).map(item=>item.text).join(preserveColumns?'\t':' '));
}

export function parseTranscript(text){
 if(typeof text!=='string'||text.length>1_000_000)throw Error('Transcript text is too large.');
 const lines=text.replace(/\u00a0/g,' ').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 const gradeReport=lines.some(line=>/^UNOFFICIAL\s+GRADE\s+REPORT$/i.test(line));
 const rows=[];let term='',termLabel='',transfer=false,headers=false,unreadable=0;
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  const date=/^(?:(Fall|Winter|Spring)\s+(20\d{2})|(20\d{2})\s+(Fall|Winter|Spring))\b/i.exec(line);
  if(date){const season=(date[1]||date[4]).toLowerCase().replace(/^./,c=>c.toUpperCase()),year=date[2]||date[3];term=termForDate(season,year);termLabel=`${season} ${year}`;transfer=false;continue;}
  if(/transfer credits?|test credits?|advanced standing/i.test(line)&&!/^\w+\s+\d{3}/.test(line)){transfer=true;term='';termLabel='Transfer credit';}
  // Only the explicitly labelled attempted/earned/grade column order is supported.
  // Never infer earned credit from a grade or a single unlabeled unit number.
  const header=lines.slice(Math.max(0,i-4),i+1).join(' ');
  if(/(?:Course|Subject).*Attempted\s*(?:Units)?\s*\/?\s*Earned\s*(?:Units)?\s*Grade/i.test(header)&&!/^[A-Z]{2,8}\s*\d{1,3}[A-Z]?\b/.test(line))headers=true;
  const match=/^([A-Z]{2,8})\s*(\d{1,3}[A-Z]?)\b\s*(.*)$/.exec(line);
  if(!match)continue;
  const code=normalize(`${match[1]} ${match[2]}`),tail=match[3].trim().split(/\s+/);
  if(gradeReport){
   // A grade report has no earned-unit evidence. Preserve PDF cell boundaries so
   // course-title numbers cannot be mistaken for grades, and require user credit
   // confirmation rather than silently assigning completion from a numeric grade.
   const cells=line.split(/\t+| {2,}/).map(c=>c.trim()).filter(Boolean);
   const last=cells.at(-1)||'',token=cells.length>=3&&gradePattern.test(last)?last:'';
   const grade=token?numericGrade(token):null,gradeCode=grade===null?token:'';
   const administrative=adminSubjects.has(match[1])||match[2].length<3;
   const canConfirmCredit=!administrative&&!transfer&&(grade!==null&&grade>=50&&grade<=100||gradeCode==='CR');
   const issues=['This grade report contains no attempted or earned units. Confirm earned credit and the suggested units before importing.'];
   if(!token)issues.push('No separate grade cell was found; this row is not imported.');
   else if(!canConfirmCredit&&!administrative)issues.push('This grade does not establish passing credit.');
   if(administrative)issues.push('Readiness, PD, co-op and administrative entries are not supported as degree courses.');
   if(transfer)issues.push('Transfer credit requires manual equivalency review.');
   if(!term)issues.push('Choose a planner term.');
   rows.push({id:`row-${rows.length}`,code,term,termLabel,attempted:null,earned:null,units:code==='CS 136L'?0.25:0.5,
    grade,gradeCode,status:canConfirmCredit?'completed':'',eligible:false,transfer,reviewRequired:true,
    gradeReport:true,canConfirmCredit,creditConfirmed:false,issues});
   continue;
  }
  const issues=[];let attempted=null,earned=null,gradeToken='',reviewRequired=false;
  // Find adjacent unit columns, allowing "0.50 / 0.50" as well as "0.50 0.50".
  const tokens=tail.filter(token=>token!=='/');
  const isUnit=token=>unitPattern.test(token||'')&&Number(token)<=10;
  const positions=tokens.flatMap((token,n)=>isUnit(token)&&isUnit(tokens[n+1])?[n]:[]);
  if(headers&&positions.length===1){
   const at=positions[0];attempted=Number(tokens[at]);earned=Number(tokens[at+1]);gradeToken=tokens[at+2]||'';if(!gradePattern.test(gradeToken))gradeToken='';
   if(tokens.slice(at+3).some(token=>/[A-Za-z]/.test(token))){reviewRequired=true;issues.push('Additional transcript notations need review before selecting this row.');}
  }
  else {issues.push(headers?'Unit columns are missing or ambiguous.':'Attempted / Earned / Grade column header was not recognized.');unreadable++;}
  const grade=gradeToken?numericGrade(gradeToken):null,gradeCode=grade===null?gradeToken:'';
  let status='',eligible=false;
  if(attempted!==null&&(attempted<0||attempted>10||earned<0||earned>attempted))issues.push('Attempted and earned units conflict.');
  else if(earned>0&&(grade!==null&&grade>=50&&grade<=100||gradeCode==='CR')){status='completed';eligible=true;}
  else if(earned===0&&gradeCode==='IP'&&attempted>0){status='current';eligible=true;}
  else if(gradeCode&&nonCredit.has(gradeCode))issues.push(`${gradeCode}: no earned credit; not imported as completed.`);
  else if(grade!==null&&grade<50)issues.push('Failing grade: not imported as completed.');
  else if(earned===0)issues.push('No earned credit and no explicit IP grade; status needs review.');
  else issues.push('Grade and earned credit do not establish completion.');
  const units=status==='completed'?earned:attempted;
  if(eligible&&(!units||units>1||!Number.isInteger(units*4))){eligible=false;issues.push('Units are unsupported by the planner.');}
  if(code==='CS 136L'&&units!==0.25){eligible=false;issues.push('CS 136L must carry 0.25 units.');}
  if(adminSubjects.has(match[1])||match[2].length<3){eligible=false;issues.push('PD, work-term, and administrative rows are not supported by the course planner.');}
  if(transfer){eligible=false;issues.push('Transfer/test credit needs manual equivalency review.');}
  if(!term)issues.push('Choose a planner term before importing.');
  rows.push({id:`row-${rows.length}`,code,term,termLabel,attempted,earned,units,grade,gradeCode,status,eligible,transfer,reviewRequired,issues});
 }
 const counts=new Map();for(const row of rows)counts.set(courseIdentity(row.code),(counts.get(courseIdentity(row.code))||0)+1);
 for(const row of rows)if(counts.get(courseIdentity(row.code))>1){row.repeated=true;row.issues.push('Repeated or cross-listed course: select at most one attempt.');}
 return {rows,unreadable,gradeReport};
}

export function prepareTranscriptReview(parsed,state){
 return parsed.rows.map(row=>{
  const existing=state.courses.find(c=>courseIdentity(c.code)===courseIdentity(row.code));
  const issues=[...row.issues];
  if(existing?.status==='completed')issues.push('Already completed in your plan. Select only if you intend to update this record.');
  if(existing&&existing.status!=='completed')issues.push(`Will update existing ${existing.status} course; its content exclusion is preserved.`);
  return {...row,issues,selected:row.eligible&&!!row.term&&!row.repeated&&!row.reviewRequired&&existing?.status!=='completed',existing:existing?.status||null};
 });
}

export function mergeTranscript(state,rows){
 const selected=rows.filter(row=>row.selected);if(!selected.length)throw Error('Select at least one supported course to import.');
 const courses=state.courses.map(c=>({...c})),seen=new Set();
 for(const row of selected){
  if(!row.eligible||row.transfer||!['completed','current'].includes(row.status))throw Error(`Review ${row.code}: this row cannot be imported automatically.`);
  if(row.gradeReport&&(!row.canConfirmCredit||!row.creditConfirmed))throw Error(`Confirm earned credit and units for ${row.code} first.`);
  const identity=courseIdentity(row.code);if(seen.has(identity))throw Error(`Select only one attempt of ${row.code}.`);seen.add(identity);
  const index=courses.findIndex(c=>courseIdentity(c.code)===identity),existing=index<0?null:courses[index];
  if(existing?.status==='completed'&&row.status!=='completed')throw Error(`Cannot replace completed ${existing.code} with an in-progress attempt.`);
  const course={...existing,code:existing?.code||row.code,term:row.term,status:row.status,units:row.units,grade:row.grade,
   transcriptGrade:row.gradeCode||String(row.grade),transcriptTerm:row.termLabel,source:row.gradeReport?'grade-report':'transcript',
   ...(row.gradeReport?{creditEvidence:'user-confirmed'}:{})};
  if(index<0)courses.push(course);else courses[index]=course;
 }
 return validateState({...state,courses});
}
