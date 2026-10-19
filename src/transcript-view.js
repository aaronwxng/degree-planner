import {parseTranscript,prepareTranscriptReview,mergeTranscript} from './transcript.js';
import {terms} from './data.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const units=n=>Number.isFinite(n)?n.toFixed(2):'Not read';

export function setupTranscriptImport({getState,applyState}){
 const $=s=>document.querySelector(s),dialog=$('#transcript-dialog');
 let rows=[],busy=false,request=0;
 function reset(){request++;rows=[];busy=false;$('#transcript-file').value='';$('#transcript-text').value='';$('#transcript-results').innerHTML='';$('#transcript-status').textContent='';$('#apply-transcript').disabled=true;$('#apply-transcript').textContent='Import selected courses';}
 function close(){reset();dialog.close();}
 function updateButton(){
  let error='';try{mergeTranscript(getState(),rows);}catch(e){error=e.message;}
  const selected=rows.filter(r=>r.selected).length;
  $('#apply-transcript').disabled=busy||!!error;
  $('#apply-transcript').textContent=`Import ${selected} selected course${selected===1?'':'s'}`;
  $('#transcript-selection').textContent=error||`${selected} courses ready. Future courses not matched by these rows will be preserved.`;
 }
 function render(){
  if(!rows.length){$('#transcript-results').innerHTML='<p class="audit-warning">No course rows were recognized. Try copying the transcript text with its Attempted, Earned, and Grade headings, or enter courses in the planner manually.</p>';$('#apply-transcript').disabled=true;return;}
  $('#transcript-results').innerHTML=`<p>${rows.length} course rows found. Review the term, units, grade, and proposed status before importing. Unrecognized, non-credit, transfer, and repeated rows remain unselected.</p><div class="transcript-table-wrap"><table class="transcript-table"><thead><tr><th>Import</th><th>Course</th><th>Transcript term</th><th>Planner term</th><th>Attempted / earned</th><th>Grade</th><th>Proposed status</th><th>Review notes</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td><input type="checkbox" data-row="${i}" aria-label="Import ${esc(r.code)} attempt ${i+1}" ${r.selected?'checked':''} ${r.eligible?'':'disabled'}></td><td><strong>${esc(r.code)}</strong></td><td>${esc(r.termLabel||'Not read')}</td><td><select data-term-row="${i}" aria-label="Planner term for ${esc(r.code)} attempt ${i+1}" ${r.eligible?'':'disabled'}><option value="">Choose term</option>${terms.map(t=>`<option value="${t.id}" ${r.term===t.id?'selected':''}>${t.name} · ${t.date}</option>`).join('')}</select></td><td>${units(r.attempted)} / ${units(r.earned)}</td><td>${esc(r.grade??r.gradeCode)||'Not read'}</td><td>${!r.eligible?'Not imported':r.status==='completed'?'Completed':r.status==='current'?'In progress':'Not imported'}</td><td>${r.issues.length?r.issues.map(esc).join(' '):'Earned credit and grade agree.'}</td></tr>`).join('')}</tbody></table></div><p id="transcript-selection" role="status"></p>`;
  updateButton();
 }
 function parse(text){
  const parsed=parseTranscript(text);rows=prepareTranscriptReview(parsed,getState());render();
  $('#transcript-status').textContent=parsed.unreadable?'Some course rows could not be read reliably and are not selected. You can correct the pasted text and try again.':'Review ready. Your plan has not changed.';
 }
 $('#open-transcript').onclick=()=>{reset();dialog.showModal();};
 $('#close-transcript').onclick=close;
 // A queued close event from a previous visit must not cancel a newly opened review.
 dialog.addEventListener('close',()=>{if(!dialog.open)reset();});dialog.addEventListener('cancel',reset);
 $('#parse-transcript').onclick=()=>{if(busy)return;request++;rows=[];$('#transcript-results').innerHTML='';$('#apply-transcript').disabled=true;try{parse($('#transcript-text').value);}catch(error){$('#transcript-status').textContent=error.message;}};
 $('#transcript-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  const id=++request;busy=true;rows=[];$('#transcript-results').innerHTML='';$('#apply-transcript').disabled=true;$('#transcript-status').textContent='Reading PDF locally…';
  try{const {extractTranscriptPdf}=await import('./transcript-pdf.js');const text=await extractTranscriptPdf(file);if(id!==request)return;parse(text);}
  catch(error){if(id===request)$('#transcript-status').textContent=`PDF could not be read: ${error.message} You can use the paste-text option below.`;}
  finally{if(id===request){busy=false;if(rows.length)updateButton();}}
 };
 $('#transcript-results').onchange=e=>{
  if(e.target.matches('[data-row]'))rows[+e.target.dataset.row].selected=e.target.checked;
  if(e.target.matches('[data-term-row]'))rows[+e.target.dataset.termRow].term=e.target.value;
  updateButton();
 };
 $('#apply-transcript').onclick=()=>{
  if(busy)return;
  try{const next=mergeTranscript(getState(),rows);applyState(next);close();}
  catch(error){$('#transcript-selection').textContent=error.message;}
 };
}
