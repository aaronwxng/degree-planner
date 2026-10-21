import {createServer} from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,extname} from 'node:path';
import {spawn} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const chrome=process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile=await mkdtemp(join(tmpdir(),'degree-planner-browser-'));
const server=createServer(async(req,res)=>{
 try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+'/'))throw Error('Invalid path');const data=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript','.pdf':'application/pdf'})[extname(path)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let child,socket,errors='';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 child=spawn(chrome,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank']);
 const endpoint=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Chrome did not start.')),10000);
  child.once('error',reject);
  child.stderr.on('data',data=>{errors+=data;const match=errors.match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
 });
 socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 let sequence=0;const pending=new Map();
 socket.addEventListener('message',event=>{const response=JSON.parse(event.data);if(!response.id)return;const callback=pending.get(response.id);if(!callback)return;pending.delete(response.id);response.error?callback.reject(Error(response.error.message)):callback.resolve(response.result);});
 const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
 const {targetId}=await call('Target.createTarget',{url:`http://127.0.0.1:${server.address().port}/scripts/browser-smoke.html`});
 const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
 const deadline=Date.now()+25000;let result='RUNNING';
 while(Date.now()<deadline){
  const response=await call('Runtime.evaluate',{expression:'document.querySelector("#results")?.textContent',returnByValue:true},sessionId);
  result=response.result?.value||'RUNNING';if(result.startsWith('PASS')||result.startsWith('FAIL'))break;await sleep(150);
 }
 console.log(result);
 if(!result.startsWith('PASS')){console.error(errors.slice(-1200));process.exitCode=1;}
 if(result.startsWith('PASS')){
  const {targetId:printTarget}=await call('Target.createTarget',{url:`http://127.0.0.1:${server.address().port}/index.html`});
  const {sessionId:printSession}=await call('Target.attachToTarget',{targetId:printTarget,flatten:true});
  const printEvaluate=async expression=>{const value=await call('Runtime.evaluate',{expression,returnByValue:true},printSession);if(value.exceptionDetails)throw Error('Print browser evaluation failed.');return value.result?.value;};
  for(let i=0;i<100&&!await printEvaluate('!!document.querySelector(".term")');i++)await sleep(100);
  await call('Emulation.setEmulatedMedia',{media:'print'},printSession);
  const printStyles=await printEvaluate(`getComputedStyle(document.querySelector('aside')).display==='none'&&getComputedStyle(document.querySelector('.print-only')).display==='block'&&getComputedStyle(document.querySelector('#requirements')).display==='none'&&getComputedStyle(document.querySelector('.course')).display!=='none'`);
  if(!printStyles)throw Error('Print styles do not isolate the readable timeline.');
  const pdf=await call('Page.printToPDF',{preferCSSPageSize:true,printBackground:true},printSession);
  if(!pdf.data?.startsWith('JVBERi0')||pdf.data.length<1000)throw Error('Printing did not generate a PDF.');
  console.log('PASS: print media hides controls, retains courses, and generates a PDF.');
 }
 if(result.startsWith('PASS')&&process.argv[2]){
  // Optional private local PDF test: CDP sets a File input directly. The source
  // document is not copied into the checkout, served over HTTP, or logged.
  const {targetId:pdfTarget}=await call('Target.createTarget',{url:`http://127.0.0.1:${server.address().port}/index.html`});
  const {sessionId:pdfSession}=await call('Target.attachToTarget',{targetId:pdfTarget,flatten:true});
  const evaluate=async expression=>{const value=await call('Runtime.evaluate',{expression,returnByValue:true},pdfSession);if(value.exceptionDetails)throw Error('Private-PDF browser evaluation failed.');return value.result?.value;};
  for(let i=0;i<100&&!await evaluate('!!document.querySelector(".term")');i++)await sleep(100);
  await evaluate('document.querySelector("#open-transcript").click()');
  const {root:documentRoot}=await call('DOM.getDocument',{},pdfSession);
  const {nodeId}=await call('DOM.querySelector',{nodeId:documentRoot.nodeId,selector:'#transcript-file'},pdfSession);
  await call('DOM.setFileInputFiles',{nodeId,files:[resolve(process.argv[2])]},pdfSession);
  let count=0;
  for(let i=0;i<150;i++){count=await evaluate('document.querySelectorAll("[data-credit-row]").length');if(count)break;await sleep(100);}
  if(count!==10)throw Error(`Private PDF: expected 10 credit-confirmation controls; found ${count}.`);
  await evaluate('document.querySelector("[data-select-all]").click()');
  if(await evaluate('document.querySelector("#apply-transcript").disabled'))throw Error('Private PDF: import remains disabled after confirmation and selection.');
  await evaluate('document.querySelector("#apply-transcript").click()');
  const imported=await evaluate('JSON.parse(localStorage.getItem("waterloo-degree-plan-v1")).courses.filter(c=>c.source==="grade-report").length');
  if(imported!==10)throw Error('Private PDF: selected records were not merged.');
  console.log('PASS: private local PDF browser extraction, confirmation, selection, and import (10 courses). User browser data unchanged.');
 }
}finally{
 if(socket)socket.close();
 if(child&&child.exitCode===null){child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),sleep(3000)]);if(child.exitCode===null)child.kill('SIGKILL');}
 server.closeAllConnections();await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});
}
