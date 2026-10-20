const mathSubjects=new Set('ACTSC AMATH CO CS MATBUS MATH PMATH STAT'.split(' '));
const administrative=new Set(['PD','COOP','WKRPT','SEQ']);
// Reviewed examples; other cross-listings are covered by the explicit review and
// per-course classification controls, never guessed from a faculty name.
const mathAliases=new Set(['PHYS 467','AMATH 242','CS 371']);
export const knownIneligible=new Set(['ECON 211']); // Explicit example in archived Math CAV policy.
export function academicCourse(c){return !administrative.has(c.code.split(' ')[0])&&!/^MTHEL 99$/.test(c.code)&&/^[A-Z]{2,8} \d{3}[A-Z]?$/.test(c.code);}
export function usableCourse(c){return academicCourse(c)&&!knownIneligible.has(c.code)&&c.creditType!=='excluded'&&(c.origin!=='transfer'||c.transferApproved===true);}
export function creditType(c){
 if(!usableCourse(c))return 'excluded';
 if(['math','nonmath'].includes(c.creditType))return c.creditType;
 return mathSubjects.has(c.code.split(' ')[0])||mathAliases.has(c.code)?'math':'nonmath';
}
export function gradeCode(c){return c.gradeCode||(/^[A-Z]+$/.test(c.transcriptGrade||'')?c.transcriptGrade:'');}
