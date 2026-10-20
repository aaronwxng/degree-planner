import {evaluateAudit} from './audit.js';
import {terms} from './data.js';
import {normalize,validateState} from './engine.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const termOptions=selected=>terms.map(t=>`<option value="${t.id}" ${selected===t.id?'selected':''}>${t.id} · ${t.date}</option>`).join('');
const selectOptions=(values,selected)=>values.map(([value,label])=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`).join('');
export function renderAudit(state){
 const audit=evaluateAudit(state),root=document.querySelector('#graduation-audit');
 const openDetails=new Set([...root.querySelectorAll('details[open]')].map(d=>d.dataset.section));
 root.innerHTML=`<div class="section-heading"><div><h3>Graduation audit · BCS co-op</h3><p>2025–26 calendar · Completed results are separate from projections</p></div></div><div class="audit-overview">${Object.entries(audit.counts).map(([k,n])=>`<span><strong>${n}</strong> ${k==='review'?'need review':k}</span>`).join('')}</div><p class="hint">Each result uses the records and confirmations entered below. “Satisfied” describes that check only; this tool does not certify graduation or apply unrecorded advisor exceptions.</p><div class="graduation-checks">${audit.rows.map(r=>`<article class="graduation-check"><div><strong>${esc(r.label)}</strong><span class="audit-badge ${r.status==='satisfied'?'done':r.status==='review'?'projected':'missing'}">${r.status==='review'?'Needs review':r.status==='satisfied'?'Satisfied':'Missing'}</span></div><p>${esc(r.detail)}</p><a href="${r.source}" target="_blank" rel="noopener">2025–26 source ↗</a></article>`).join('')}</div>
 <details data-section="evidence"><summary>Review course history & eligibility</summary><div class="audit-evidence">${[['historyReviewed','I have entered my complete prior-attempt history, including failures, withdrawals, repeats and CLC designations.'],['classificationsReviewed','I have reviewed degree-credit eligibility, cross-listings and classifications for these courses.'],['contentReviewed','I have reviewed breadth/depth content exceptions and excluded substantial math/CS content where needed.']].map(([key,label])=>`<label class="audit-checkbox"><input type="checkbox" data-audit-flag="${key}" ${state.audit?.[key]?'checked':''}>${label}</label>`).join('')}<p class="hint">These are your confirmations, not automatic verification by Waterloo. Course-level math/non-math, transfer approval, and exclusion controls are in the course editor. A new import or course edit clears affected confirmations.</p></div></details>
 <details data-section="terms"><summary>Full-time enrolment & credited work terms</summary><p class="hint">Confirm full-time status from your academic record. Work terms count only when credited, not merely scheduled.</p><div class="term-evidence-grid">${terms.map(t=>`<label>${t.id} · ${t.date}<select data-${t.work?'work-evidence':'fulltime-evidence'}="${t.id}">${t.work?selectOptions([['unknown','Not reviewed'],['planned','Planned work term'],['standard','Credited · standard'],['flexible','Credited · flexible'],['not-credited','Not credited']],state.audit?.workTerms?.[t.id]||'unknown'):selectOptions([['unknown','Not reviewed'],['confirmed','Full-time enrolment confirmed'],['not-full-time','Not a full-time term']],state.audit?.fullTimeTerms?.[t.id]||'unknown')}</select></label>`).join('')}</div></details>
 <details data-section="attempts"><summary>Prior attempts, failures & repeats (${(state.attemptHistory||[]).length})</summary><p class="hint">Record prior attempts here, including failures, WD and repeated passes. The completed courses above already count as current final attempts: do not enter the same course and term twice. History entries do not add degree credit; add the credited course to your plan.</p><div class="audit-history">${(state.attemptHistory||[]).map((a,i)=>`<div><span>${esc(a.code)} · ${esc(a.term)} · ${a.units.toFixed(2)} units · ${esc(a.grade??(a.gradeCode||'Grade not recorded'))} ${a.clc?'· CLC':''}</span><button type="button" data-remove-attempt="${i}">Remove</button></div>`).join('')||'<p>No prior attempts recorded. This does not establish that there were no failures.</p>'}</div><form id="attempt-form" class="audit-record-form"><label>Course<input name="code" placeholder="CS 136" required></label><label>Term<select name="term">${termOptions('1A')}</select></label><label>Attempted units<select name="units">${[0.25,0.5,0.75,1,1.5,2,3].map(n=>`<option value="${n}" ${n===0.5?'selected':''}>${n.toFixed(2)}</option>`).join('')}</select></label><label>Numeric grade<input type="number" name="grade" min="0" max="100" step="0.1"></label><label>Or grade code<select name="gradeCode">${selectOptions(['','CR','AEG','NCR','WD','WF','DNW','FTC','NMR','INC','IP','NG','MM','UR'].map(x=>[x,x||'Numeric grade above']), '')}</select></label><label>Average eligibility<select name="creditType"><option value="auto">Eligible Waterloo attempt</option><option value="excluded">Barred / not eligible for degree averages</option></select></label><label class="audit-checkbox"><input type="checkbox" name="clc">CLC shown on academic record (no degree credit)</label><button class="primary">Add prior attempt</button><p class="audit-form-error" role="alert"></p></form></details>
 <details data-section="pd"><summary>Professional development courses (${(state.pdCourses||[]).length})</summary><div class="audit-history">${(state.pdCourses||[]).map((p,i)=>`<div><span>${esc(p.code)} · ${p.term} · ${p.status}</span><button type="button" data-remove-pd="${i}">Remove</button></div>`).join('')||'<p>No PD records. These are separate from the 20.0 degree units.</p>'}</div><form id="pd-form" class="audit-record-form"><label>PD course<input name="code" placeholder="PD 1" required></label><label>Term<select name="term">${termOptions('1B')}</select></label><label>Status<select name="status">${selectOptions([['planned','Planned'],['current','In progress'],['completed','Completed · credit earned']],'planned')}</select></label><button class="primary">Add PD course</button><p class="audit-form-error" role="alert"></p></form></details>`;
 for(const detail of root.querySelectorAll('details'))detail.open=openDetails.has(detail.dataset.section);
}

export function setupAudit({getState,applyState}){
 const root=document.querySelector('#graduation-audit');
 const commit=next=>applyState(validateState(next));
 root.addEventListener('change',e=>{
  const state=getState(),audit=structuredClone(state.audit||{}),target=e.target;
  if(target.dataset.auditFlag)audit[target.dataset.auditFlag]=target.checked;
  else if(target.dataset.workEvidence){audit.workTerms||={};audit.workTerms[target.dataset.workEvidence]=target.value;}
  else if(target.dataset.fulltimeEvidence){audit.fullTimeTerms||={};audit.fullTimeTerms[target.dataset.fulltimeEvidence]=target.value;}
  else return;
  commit({...state,audit});
 });
 root.addEventListener('submit',e=>{
  e.preventDefault();const form=e.target,state=getState(),fields=form.elements;
  try{
   if(form.id==='attempt-form'){
    const attempt={code:normalize(fields.code.value),term:fields.term.value,units:+fields.units.value,grade:fields.grade.value===''?null:+fields.grade.value,gradeCode:fields.gradeCode.value,clc:fields.clc.checked,creditType:fields.creditType.value};
    commit({...state,attemptHistory:[...(state.attemptHistory||[]),attempt],audit:{...state.audit,historyReviewed:false}});
   }else if(form.id==='pd-form'){
    const pd={code:normalize(fields.code.value),term:fields.term.value,status:fields.status.value};
    commit({...state,pdCourses:[...(state.pdCourses||[]),pd]});
   }
  }catch(error){form.querySelector('.audit-form-error').textContent=error.message;}
 });
 root.addEventListener('click',e=>{
  const attempt=e.target.closest('[data-remove-attempt]'),pd=e.target.closest('[data-remove-pd]');if(!attempt&&!pd)return;
  const state=getState();
  if(attempt)commit({...state,attemptHistory:state.attemptHistory.filter((_,i)=>i!==+attempt.dataset.removeAttempt),audit:{...state.audit,historyReviewed:false}});
  if(pd)commit({...state,pdCourses:state.pdCourses.filter((_,i)=>i!==+pd.dataset.removePd)});
 });
}
