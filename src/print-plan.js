// Printing changes only the visible timeline, never saved course records.
export function setupPrintPlan({render}){
 const search=document.querySelector('#course-search'),status=document.querySelector('#course-status'),work=document.querySelector('#work');
 let previous=null;
 window.addEventListener('beforeprint',()=>{
  if(previous)return;
  previous={query:search.value,status:status.value,work:work.checked};
  search.value='';status.value='';work.checked=true;
  document.querySelector('#print-date').textContent=new Date().toLocaleString();
  render();
 });
 window.addEventListener('afterprint',()=>{
  if(!previous)return;
  search.value=previous.query;status.value=previous.status;work.checked=previous.work;previous=null;render();
 });
 document.querySelector('#print-plan').onclick=()=>window.print();
}
