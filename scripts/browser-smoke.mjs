import {createServer} from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,extname} from 'node:path';
import {spawn} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const chrome=process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile=await mkdtemp(join(tmpdir(),'degree-planner-browser-'));
const server=createServer(async(req,res)=>{
 try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+'/'))throw Error('Invalid path');const data=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{
 const child=spawn(chrome,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--dump-dom','--virtual-time-budget=15000',`http://127.0.0.1:${server.address().port}/scripts/browser-smoke.html`]);
 let output='',errors='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>errors+=d);
 const timer=setTimeout(()=>child.kill('SIGKILL'),30000);
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});clearTimeout(timer);
 const result=output.match(/<pre id="results">([\s\S]*?)<\/pre>/)?.[1]||'No browser result';
 console.log(result.replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&amp;/g,'&'));
 if(code!==0||!result.startsWith('PASS')){console.error(errors.slice(-2000));process.exitCode=1;}
}finally{await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});}
