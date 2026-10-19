import {core,mathA,engA} from './data.js';
export function normalize(code){return code.trim().toUpperCase().replace(/\s+/g,' ').replace(/^([A-Z]+)\s*(\d)/,'$1 $2');}
export function unique(courses){return [...new Map(courses.map(c=>[normalize(c.code),{...c,code:normalize(c.code)}])).values()];}
const range=(c,lo,hi)=>{const m=/^CS (\d+)$/.exec(c);return !!m && +m[1]>=lo && +m[1]<=hi;};
const upper=c=>range(c,340,398)||range(c,440,489);
// Maximum bipartite matching prevents a broad elective slot from consuming a
// course needed by a narrower slot, and prevents duplicate credit within a block.
export function allocate(rules,courses){
 const owner=new Map();
 function visit(i,seen){for(const c of courses){if(seen.has(c.code)||!rules[i].accept(c.code))continue;seen.add(c.code);if(!owner.has(c.code)||visit(owner.get(c.code),seen)){owner.set(c.code,i);return true;}}return false;}
 rules.forEach((_,i)=>visit(i,new Set()));
 return rules.map((r,i)=>({...r,matched:[...owner].find(([,n])=>n===i)?.[0]||null}));
}
export function evaluate(courses,ai=true){
 const cs=unique(courses);const rules=core.map(r=>({...r,accept:c=>r.codes.includes(c)}));
 for(let i=1;i<=3;i++)rules.push({id:`upper${i}`,label:`Upper-year CS elective ${i} (340–398 / 440–489)`,accept:upper});
 if(ai) rules.push({id:'ml',label:'Machine learning: CS 480 or CS 485',accept:c=>['CS 480','CS 485'].includes(c)},{id:'introai',label:'CS 486',accept:c=>c==='CS 486'},{id:'ethics',label:'CS 492',accept:c=>c==='CS 492'});
 else rules.push(...[1,2].map(i=>({id:`four${i}`,label:`400-level CS elective ${i} (440–489)`,accept:c=>range(c,440,489)})),{id:'advanced',label:'Advanced elective (see checklist)',accept:c=>range(c,440,498)||/^CS [67]\d\d$/.test(c)||['CS 499T','CO 487','STAT 440'].includes(c)});
 let list=[];
 if(ai){
  const has480=cs.some(c=>c.code==='CS 480');const has485=cs.some(c=>c.code==='CS 485');
  const eligible=cs.filter(c=>!(c.code==='CS 480'&&!has485)&&c.code!=='CS 485');
  // When both are present CS 485 fills the required ML slot; CS 480 may fill List A.
  const families=[['CS 479','AMATH 449'],['ECE 380','SE 380'],['SYDE 552','BIOL 487']];
  const seen=new Set();
  list=eligible.filter(c=>mathA.includes(c.code)||engA.includes(c.code)).filter(c=>{const key=families.find(f=>f.includes(c.code))?.[0]||c.code;if(seen.has(key))return false;seen.add(key);return true;});
 }
 const math=list.filter(c=>mathA.includes(c.code));const engineering=list.filter(c=>engA.includes(c.code));
 return {rows:allocate(rules,cs),units:cs.reduce((n,c)=>n+c.units,0),list:list.map(c=>c.code),math:math.length,engineering:engineering.length,listSatisfied:list.length>=4&&math.length>=1&&engineering.length>=1};
}
export function validateState(value){
 if(!value||value.version!==1||typeof value.ai!=='boolean'||!Array.isArray(value.courses))throw Error('Unsupported plan file.');
 const validTerms=['1A','1B','WT1','2A','WT2','2B','WT3','3A','WT4','3B','WT5','4A','WT6','4B'];
 const codes=new Set();
 for(const c of value.courses){c.code=normalize(String(c.code));if(!/^[A-Z]{2,8} \d{3}[A-Z]?$/.test(c.code)||codes.has(c.code)||!validTerms.includes(c.term)||!['planned','current','completed'].includes(c.status)||!Number.isFinite(c.units)||c.units<=0||c.units>1)throw Error('Plan contains an invalid or duplicate course.');codes.add(c.code);}
 if(value.courses.some(c=>c.code==='CS 136L'&&c.units!==0.25))throw Error('CS 136L must carry 0.25 units.');
 return value;
}
