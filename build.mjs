import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {snapshot} from './data.mjs';
const out=new URL('./dist/',import.meta.url);
const url=process.env.SITE_URL||'';
if(url&&!/^https:\/\/[a-z0-9.-]+(?:\/[a-zA-Z0-9_/-]*)?$/.test(url))throw new Error('Invalid SITE_URL');
const data=await snapshot();
if(Object.values(data.chains).some(chain=>!chain.complete))throw Error('Task feed pagination did not finish; preserve the last deployed snapshot');
await mkdir(new URL('api/',out),{recursive:true});
await cp(new URL('./public/',import.meta.url),out,{recursive:true});
await writeFile(new URL('api/snapshot.json',out),JSON.stringify(data));
await mkdir(new URL('signal/',out),{recursive:true});
if(url){
  const html=new URL('index.html',out);
  const site=url.replace(/\/$/,'');
  const text=(await readFile(html,'utf8')).replace('content="/share.png"',`content="${site}/share.png"`).replace('</head>',`<meta property="og:url" content="${site}/"><link rel="canonical" href="${site}/"><meta name="twitter:card" content="summary_large_image"></head>`);
  await writeFile(html,text);
  const focused=text.replace('<html lang="en">','<html lang="en" data-view="signal">')
    .replace('<head>','<head><base href="../">')
    .replace('<title>Taskmarket Pulse</title>','<title>Bounty Signal | Taskmarket Pulse</title>')
    .replace('property="og:title" content="Taskmarket Pulse"','property="og:title" content="Where attention goes | Taskmarket Pulse"')
    .replace('property="og:description" content="Follow task creation, rewards, and activity across Base and Tempo."',
      'property="og:description" content="Compare posted reward pools and submission counts for open bounties on Base and Tempo."')
    .replace(`${site}/share.png`,`${site}/signal-share.png`)
    .replace(`content="${site}/"><link rel="canonical" href="${site}/"`,`content="${site}/signal/"><link rel="canonical" href="${site}/signal/"`);
  await writeFile(new URL('signal/index.html',out),focused);
}
if(!url){
  const src=await readFile(new URL('index.html',out),'utf8');
  await writeFile(new URL('signal/index.html',out),src.replace('<html lang="en">','<html lang="en" data-view="signal">').replace('<head>','<head><base href="../">'));
}
console.log('Built verified snapshot',data.asOf);
