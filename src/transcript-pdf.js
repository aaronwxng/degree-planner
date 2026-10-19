import {textItemsToLines} from './transcript.js';

export async function extractTranscriptPdf(file){
 if(file.size>10*1024*1024)throw Error('Choose a PDF smaller than 10 MB.');
 const data=new Uint8Array(await file.arrayBuffer());
 if(new TextDecoder().decode(data.slice(0,5))!=='%PDF-')throw Error('This file is not a PDF.');
 const pdfjs=await import('../node_modules/pdfjs-dist/build/pdf.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs',import.meta.url).href;
 const task=pdfjs.getDocument({data,isEvalSupported:false,useSystemFonts:true,stopAtErrors:true});
 try{
  const pdf=await task.promise;
  if(pdf.numPages>50)throw Error('This PDF has more than 50 pages. Choose the unofficial transcript only.');
  const lines=[];
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n);const text=await page.getTextContent();lines.push(...textItemsToLines(text.items));page.cleanup();
   if(lines.join('\n').length>1_000_000)throw Error('Transcript text is too large.');
  }
  const text=lines.join('\n');if(!text.trim())throw Error('No selectable text was found. Scanned PDFs need OCR; paste transcript text instead.');
  return text;
 }catch(error){
  if(error.name==='PasswordException')throw Error('Password-protected PDFs are not supported. Use an unlocked copy or paste transcript text.');
  throw error;
 }finally{await task.destroy();}
}
