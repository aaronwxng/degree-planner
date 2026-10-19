import {sources,terms,catalog,initialState} from './data.js';
import {evaluate,normalize,validateState} from './engine.js';
const $=s=>document.querySelector(s),key='waterloo-degree-plan-v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=initialState(),editing=null;
function message(s){$('#message').textContent=s;}
try{const saved=localStorage.getItem(key);if(saved)state=validateState(JSON.parse(saved));}catch{message('Saved plan could not be loaded. Starting suggestion shown; export before making changes if you need a backup.');}
function save(){try{localStorage.setItem(key,JSON.stringify(state));message('Plan saved in this browser.');}catch{message('Browser storage is unavailable. Export your plan to save it.');}render();}
function render(){
 const completed=evaluate(state.courses.filter(c=>c.status==='completed'),state.ai),projected=evaluate(state.courses,state.ai);
 $('#stats').innerHTML=[['Earned units',`${completed.units.toFixed(2)}<small> / 20.00</small>`],['Planned + earned units',`${projected.units.toFixed(2)}<small> / 20.00</small>`],['Core & elective slots',`${completed.rows.filter(r=>r.matched).length}<small> completed · ${projected.rows.filter(r=>r.matched).length} projected / ${projected.rows.length}</small>`]].map(([a,b])=>`<article><span>${a}</span><strong>${b}</strong></article>`).join('');
 $('#terms').innerHTML=terms.filter(t=>$('#work').checked||!t.work).map(t=>{const courses=state.courses.filter(c=>c.term===t.id);return `<article class="term ${t.work?'work':''}"><div class="term-top"><h3>${t.name}</h3><span>${t.work?'CO-OP':'STUDY'}</span></div><p>${t.date}</p>${t.work?'<div class="work-label">↗ Work experience</div>':''}${courses.map(c=>`<button class="course ${c.status}" data-edit="${esc(c.code)}"><strong>${esc(c.code)}</strong><span>${c.units.toFixed(2)} units · ${c.status==='current'?'In progress':c.status}</span></button>`).join('')}${!t.work?`<button class="add-slot" data-term="${t.id}">+ Add course</button>`:''}<small>${courses.reduce((s,c)=>s+c.units,0).toFixed(2)} units in plan</small></article>`;}).join('');
 $('#requirements-content').innerHTML=`<div class="check-header"><span>Course requirement</span><span>Completed / Projected</span></div>`+projected.rows.map((r,i)=>`<div class="requirement"><div><strong>${esc(r.label)}</strong><small>${r.codes?esc(r.codes.join(' / ')):'One distinct course per slot; no reuse within this block.'}</small></div><span class="${completed.rows[i].matched?'green':''}">${completed.rows[i].matched?`✓ ${esc(completed.rows[i].matched)}`:`— / ${r.matched?esc(r.matched):'Missing'}`}</span></div>`).join('');
 $('#ai').checked=state.ai;
 $('#ai-progress').innerHTML=state.ai?`<p><strong>${completed.list.length} completed · ${projected.list.length} projected List A courses / 4</strong></p><div class="progress"><i style="width:${Math.min(100,projected.list.length/4*100)}%"></i></div><p>Projected mix: ${projected.math} Math · ${projected.engineering} Engineering<br>${projected.listSatisfied?'✓ List A course count and mix satisfied in plan':'Needs four List A courses, including Math and Engineering.'}</p><p>${projected.list.map(esc).join(' · ')||'No List A courses planned yet.'}</p><small>CS 480/485 counts toward List A only if both are taken. Engineering List A courses cannot satisfy non-math electives. Prerequisites need separate review.</small>`:'<p>Enable to preview AI requirements alongside your BCS plan.</p>';
}
$('#source-links').innerHTML=Object.entries(sources).map(([name,url])=>`<a href="${url}" target="_blank" rel="noopener">${{bcs:'BCS checklist · 2025–26',ai:'AI checklist · 2025–26',sequence:'Co-op sequence 1',suggested:'Suggested CS course placement · 2022–23 onward',minor:'Minor eligibility information',calendar:'Official archived calendar · 2025–26'}[name]} ↗</a>`).join('');
$('#ai-source').href=sources.ai;$('#minor-source').href=sources.minor;
$('#courses').innerHTML=catalog.map(c=>`<option value="${c}">`).join('');
const form=$('#course-form');
form.elements.term.innerHTML=terms.map(t=>`<option value="${t.id}">${t.name} · ${t.date}</option>`).join('');
function openEditor(code=null,term='1A'){
 editing=code;const c=state.courses.find(c=>c.code===code)||{code:'',term,status:'planned',units:0.5};
 for(const k of ['code','term','status','units'])form.elements[k].value=c[k];
 $('#editor-title').textContent=code?'Edit course':'Add a course';$('#delete').hidden=!code;$('#form-error').textContent='';$('#editor').showModal();
}
$('#add').onclick=()=>openEditor();$('#close').onclick=()=>$('#editor').close();
$('#terms').onclick=e=>{const edit=e.target.closest('[data-edit]'),add=e.target.closest('[data-term]');if(edit)openEditor(edit.dataset.edit);if(add)openEditor(null,add.dataset.term);};
form.onsubmit=e=>{e.preventDefault();const c={code:normalize(form.elements.code.value),term:form.elements.term.value,status:form.elements.status.value,units:+form.elements.units.value};if(c.code==='CS 136L'&&c.units!==0.25){$('#form-error').textContent='CS 136L carries 0.25 units.';return;}try{const next={...state,courses:[...state.courses.filter(c=>c.code!==editing),c]};validateState(next);state=next;save();$('#editor').close();}catch(err){$('#form-error').textContent=err.message;}};
$('#delete').onclick=()=>{state.courses=state.courses.filter(c=>c.code!==editing);save();$('#editor').close();};
$('#ai').onchange=e=>{state.ai=e.target.checked;save();};$('#work').onchange=render;
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='waterloo-degree-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1000000)throw Error('Plan file is too large.');const next=validateState(JSON.parse(await file.text()));if(confirm('Replace this browser’s plan with the imported plan? Export first if you need a backup.')){state=next;save();}}catch(err){message(`Import failed: ${err.message}`);}e.target.value='';};
render();
