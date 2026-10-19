// Pinned to catalog 663290e835aff7001cc62323 (2025–26), not the current calendar.
// Verified against the public Kuali /program/.../SJPJkCAih and /r1y1WO5ka responses.
export const breadthCategories = [
  {id:'humanities',label:'Humanities',required:1,subjects:'CHINA CLAS CMW COMMST CROAT DAC DUTCH EASIA ENGL FINE FR GER GRK HIST HUMSC ITAL ITALST JAPAN JS KOREA LAT MEDVL MUSIC PHIL PORT RCS REES RUSS SI SPAN THPERF VCULT'.split(' ')},
  {id:'social',label:'Social Sciences',required:1,subjects:'AFM ANTH APPLS ARBUS BET BUS COMM ECON ENBUS GEOG GSJ HRM INDEV INDG INTST LS MSE PACS PSCI PSYCH REC SDS SRF SOC SOCWK STV'.split(' ')},
  {id:'pure',label:'Pure Sciences',required:0.5,subjects:'BIOL CHEM EARTH PHYS SCI'.split(' ')},
  {id:'applied',label:'Pure / Applied Sciences',required:0.5,subjects:'BIOL CHEM EARTH ENVS ERS HEALTH KIN MNS PHYS PLAN SCI'.split(' ')},
];
export const communication1 = ['COMMST 100','COMMST 223','EMLS 101R','EMLS 102R','EMLS 129R','ENGL 109','ENGL 129R'];
export const communication2 = ['COMMST 225','COMMST 227','COMMST 228','EMLS 103R','EMLS 104R','EMLS 110R','ENGL 101B','ENGL 108B','ENGL 108D','ENGL 119','ENGL 208B','ENGL 209','ENGL 210E','ENGL 210F','ENGL 378'];
// Reviewed aliases only; the app does not claim a complete equivalence catalog.
export const equivalentCourses = [['EMLS 129R','ENGL 129R'],['ENGL 378','MTHEL 300'],['PHIL 205','ECON 261'],['SYDE 552','BIOL 487']];
// Two links independently checked in the archived JAPAN102R and JAPAN201R entries.
// Alternatives in those entries also yield these three-course paths.
export const depthChains = [
  ['JAPAN 101R','JAPAN 102R','JAPAN 201R'],
  ['JAPAN 111R','JAPAN 102R','JAPAN 201R'],
];
