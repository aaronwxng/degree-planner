// Synthetic data only. This PDF tests extraction, not fidelity to a real Quest PDF.
import {mkdir,writeFile} from 'node:fs/promises';
const escape=s=>s.replace(/([\\()])/g,'\\$1');
const line=(y,cells)=>cells.map(([x,text])=>`BT /F1 10 Tf ${x} ${y} Td (${escape(text)}) Tj ET`).join('\n');
const row=(y,code,title,attempted,earned,grade)=>line(y,[[40,code],[130,title],[375,attempted],[440,earned],[510,grade]]);
const content=[line(760,[[40,'Synthetic Undergraduate Unofficial Transcript']]),line(735,[[40,'Fall 2025']]),line(710,[[40,'Course Description Attempted Earned Grade']]),
 row(685,'CS 135','Designing Functional Programs','0.50','0.50','88'),
 row(660,'MATH 135','Algebra','0.50','0.50','84.50'),
 row(635,'SCI 206','Physics of How Things Work','0.50','0.50','CR'),
 row(610,'ECON 101','Microeconomics','0.50','0.00','WD'),
 row(585,'PSYCH 101','Psychology','0.50','0.00',''),
].join('\n');
const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`];
let pdf='%PDF-1.4\n',offsets=[0];
objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${object}\nendobj\n`;});
const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(o=>`${String(o).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
const directory=new URL('./fixtures/',import.meta.url);await mkdir(directory,{recursive:true});await writeFile(new URL('transcript-synthetic.pdf',directory),pdf);
