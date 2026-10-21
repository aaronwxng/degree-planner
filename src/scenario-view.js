import {activeScenario,duplicateScenario,renameScenario,switchScenario,deleteScenario,compareScenarios,maxScenarios} from './scenarios.js';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unit=n=>n.toFixed(2);
export function setupScenarios({getLibrary,applyLibrary,message}){
 let compareId='',mode='duplicate';
 const nameForm=$('#scenario-name-form'),dialog=$('#scenario-name-dialog');
 function comparison(){
  const library=getLibrary(),active=activeScenario(library),other=library.plans.find(p=>p.id===compareId&&p.id!==active.id),root=$('#scenario-comparison');
  if(!other){root.innerHTML='<p class="hint">Duplicate your plan to explore another schedule, then choose a plan to compare.</p>';return;}
  const result=compareScenarios(active.state,other.state),heading=`<tr><th scope="col">Measure</th><th scope="col">${esc(active.name)} (active)</th><th scope="col">${esc(other.name)}</th></tr>`;
  const metrics=[['AI specialization',s=>s.ai?'Included':'Not included'],['Courses',s=>s.courses],['Earned eligible units',s=>unit(s.earnedUnits)],['Projected eligible units',s=>unit(s.projectedUnits)],['Completed course slots',s=>`${s.completedSlots} / ${s.totalSlots}`],['Projected course slots',s=>`${s.projectedSlots} / ${s.totalSlots}`]];
  const cell=c=>c?`${esc(c.code)} · ${esc(c.term)} · ${esc(c.status==='current'?'in progress':c.status)} · ${unit(c.units)} units`:'Not included';
  root.innerHTML=`<h3>${esc(active.name)} compared with ${esc(other.name)}</h3><p class="hint">Each plan is evaluated with its own specialization choice. Slot totals can differ; projected coverage is conditional, not graduation approval.</p><div class="scenario-table-wrap" tabindex="0" role="region" aria-label="Plan comparison"><table><caption>Plan totals and course requirement coverage</caption><thead>${heading}</thead><tbody>${metrics.map(([label,value])=>`<tr><th scope="row">${label}</th><td>${value(result.active)}</td><td>${value(result.other)}</td></tr>`).join('')}</tbody></table></div><h4>Course differences</h4>${result.differences.length?`<ul class="scenario-differences">${result.differences.map(r=>`<li><strong>${esc(r.code)}</strong> · ${r.changes.map(esc).join('; ')}<div>Active: ${cell(r.active)}</div><div>Comparison: ${cell(r.other)}</div></li>`).join('')}</ul>`:'<p class="hint">The course records match. Specialization and audit evidence are compared separately.</p>'}<p class="hint">${result.evidenceDiffers?'Attempt history, PD records or audit evidence differ. Review each plan’s degree progress for the details.':'Attempt history, PD records and audit evidence match.'}</p><h4>Term workloads</h4><p class="hint">All scheduled course units are shown, including courses excluded from degree credit. Work-term course load does not establish permission to study during co-op.</p><div class="scenario-table-wrap" tabindex="0" role="region" aria-label="Term workload comparison"><table><caption>Courses and scheduled units by term</caption><thead><tr><th scope="col">Term</th><th scope="col">${esc(active.name)}</th><th scope="col">${esc(other.name)}</th></tr></thead><tbody>${result.workload.map(t=>`<tr class="${t.active.count!==t.other.count||t.active.units!==t.other.units?'workload-difference':''}"><th scope="row">${t.name}<small>${t.date}</small></th><td>${t.active.count} courses · ${unit(t.active.units)} units</td><td>${t.other.count} courses · ${unit(t.other.units)} units</td></tr>`).join('')}</tbody></table></div>`;
 }
 function render(){
  const library=getLibrary(),active=activeScenario(library);
  if(compareId===active.id||!library.plans.some(p=>p.id===compareId))compareId='';
  $('#scenario-select').innerHTML=library.plans.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');$('#scenario-select').value=active.id;
  $('#scenario-compare').innerHTML='<option value="">Choose another plan</option>'+library.plans.filter(p=>p.id!==active.id).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');$('#scenario-compare').value=compareId;
  $('#scenario-delete').disabled=library.plans.length===1;$('#scenario-duplicate').disabled=library.plans.length>=maxScenarios;
  $('#scenario-current').textContent=`Editing ${active.name}. Changes affect this plan only.`;
  $('#print-scenario').textContent=active.name;
  comparison();
 }
 function change(next,notice){try{applyLibrary(next);message(notice);return true;}catch(err){message(`Plan change not saved: ${err.message}`);render();return false;}}
 $('#scenario-select').onchange=e=>{
  const old=activeScenario(getLibrary());const next=switchScenario(getLibrary(),e.target.value);
  compareId=old.id;change(next,`Switched to ${activeScenario(next).name}.`);
 };
 $('#scenario-compare').onchange=e=>{compareId=e.target.value;comparison();};
 for(const action of ['duplicate','rename'])$(`#scenario-${action}`).onclick=()=>{
  mode=action;nameForm.reset();$('#scenario-name-title').textContent=action==='duplicate'?'Duplicate this plan':'Rename this plan';
  nameForm.elements.planName.value=action==='rename'?activeScenario(getLibrary()).name:'';
  $('#scenario-name-error').textContent='';dialog.showModal();nameForm.elements.planName.focus();
 };
 $('#scenario-name-close').onclick=()=>dialog.close();
 nameForm.onsubmit=e=>{
  e.preventDefault();try{
   const old=activeScenario(getLibrary()),next=mode==='duplicate'?duplicateScenario(getLibrary(),nameForm.elements.planName.value,crypto.randomUUID()):renameScenario(getLibrary(),nameForm.elements.planName.value);
   if(mode==='duplicate')compareId=old.id;
   if(change(next,`${mode==='duplicate'?'Created':'Renamed'} ${activeScenario(next).name}.`))dialog.close();
  }catch(err){$('#scenario-name-error').textContent=err.message;}
 };
 $('#scenario-delete').onclick=()=>{
  const active=activeScenario(getLibrary());if(!confirm(`Delete “${active.name}”? This removes its saved courses and evidence. Export a backup first if you need to keep it. Other plans will remain.`))return;
  change(deleteScenario(getLibrary(),active.id),`Deleted ${active.name}.`);
 };
 return {render};
}
