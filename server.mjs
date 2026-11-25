import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {api} from './worker.mjs';
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',png:'image/png',svg:'image/svg+xml',woff2:'font/woff2',ttf:'font/ttf',txt:'text/plain'};
const port=Number(process.env.PORT||4177);
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost:'+port);
    if(url.pathname.startsWith('/api/')){
      const out=await api(new Request(url,{method:req.method}));
      res.writeHead(out.status,Object.fromEntries(out.headers));res.end(await out.text());return;
    }
    const focused=url.pathname==='/signal/';
    const name=url.pathname==='/'||focused?'index.html':url.pathname.slice(1);
    if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)){res.writeHead(404).end();return}
    let body=await readFile(fileURLToPath(new URL('public/'+name,import.meta.url)));
    if(focused)body=body.toString('utf8').replace('<html lang="en">','<html lang="en" data-view="signal">').replace('<head>','<head><base href="../">');
    res.writeHead(200,{'content-type':types[name.split('.').at(-1)]||'application/octet-stream','x-content-type-options':'nosniff'}).end(body);
  }catch(e){res.writeHead(e.code==='ENOENT'?404:500).end('Unavailable')}
}).listen(port,process.env.HOST||'127.0.0.1',()=>console.log('Taskmarket Pulse: http://127.0.0.1:'+port));
