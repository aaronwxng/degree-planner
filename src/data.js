export const sources = {
  bcs: 'https://cs.uwaterloo.ca/sites/default/files/uploads/documents/2025-2026-bcs.pdf',
  ai: 'https://cs.uwaterloo.ca/sites/default/files/uploads/documents/2025-2026-bcs-artificial-intelligence-specialization.pdf',
  sequence: 'https://uwaterloo.ca/new-math-students/co-op/information',
  suggested: 'https://cs.uwaterloo.ca/sites/default/files/uploads/documents/scs-2022-2023-bcs.pdf',
  minor: 'https://uwaterloo.ca/math/undergraduate-studies/academics/customize-your-degree/plans-students-outside-mathematics',
  calendar: 'https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026',
  breadth: 'https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/programs/SJPJkCAih',
  communication: 'https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/programs/r1y1WO5ka',
  chain102: 'https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/courses/HkQyFEQth',
  chain201: 'https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog/archive/2025-2026#/courses/ByzmkYV7tn',
};
export const terms = ['1A','1B','WT1','2A','WT2','2B','WT3','3A','WT4','3B','WT5','4A','WT6','4B'].map((name,i)=>({id:name,name,date:`${['Fall','Winter','Spring'][i%3]} ${2025+Math.floor((i+2)/3)}`,work:name.startsWith('WT')}));
const group=(id,label,codes)=>({id,label,codes:codes.split(',')});
export const core = [
 group('cs1','Introductory CS I','CS 115,CS 135,CS 145'),group('cs2','Introductory CS II','CS 136,CS 146'),
 ...['CS 136L','CS 240','CS 241','CS 245','CS 246','CS 251','CS 341','CS 350'].map(c=>group(c,c,c)),
 group('alg','Algebra','MATH 135,MATH 145'),group('lin','Linear algebra','MATH 136,MATH 146'),
 group('cal1','Calculus I','MATH 127,MATH 137,MATH 147'),group('cal2','Calculus II','MATH 128,MATH 138,MATH 148'),
 group('comb','Combinatorics','MATH 239,MATH 249'),group('prob','Probability','STAT 230,STAT 240'),group('stat','Statistics','STAT 231,STAT 241'),
];
export const mathA = ['CO 367','CO 456','CO 463','CO 466','CS 452','CS 479','AMATH 449','CS 480','CS 484','CS 485','STAT 341','STAT 440','STAT 441','STAT 444'];
export const engA = ['ECE 380','SE 380','ECE 423','ECE 457C','ECE 481','ECE 486','ECE 488','ECE 495','MTE 544','SYDE 552','BIOL 487','SYDE 556','SYDE 572'];
export const catalog = [...new Set([...core.flatMap(r=>r.codes),...mathA,...engA,'CS 348','CS 360','CS 370','CS 486','CS 492','CO 487','CS 499T'])].sort();
// A starting suggestion, never a record of the student's actual enrolment.
export const starter = {'1A':['CS 135','MATH 135','MATH 137'],'1B':['CS 136','CS 136L','MATH 136','MATH 138'],'2A':['CS 245','CS 246','STAT 230'],'2B':['CS 240','CS 241','CS 251','MATH 239'],'3A':['CS 341','CS 350','STAT 231']};
export function initialState(){return {version:1,ai:true,courses:Object.entries(starter).flatMap(([term,codes])=>codes.map(code=>({code,term,status:'planned',units:code==='CS 136L'?0.25:0.5}))) };}
