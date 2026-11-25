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
const site=url.replace(/\/$/,'');
const html=new URL('index.html',out);
const raw=await readFile(html,'utf8');
const decorate=(text,slug,title,desc,image)=>{
  const canonical=site+'/'+(slug?slug+'/':'');
  return text.replace('content="Taskmarket Pulse"',`content="${title}"`)
    .replace('<title>Taskmarket Pulse</title>',`<title>${title}</title>`)
    .replace('Follow task creation, rewards, and activity across Base and Tempo.',desc)
    .replace('content="/share.png"',`content="${site}/${image}"`)
    .replace('</head>',`<meta property="og:url" content="${canonical}"><link rel="canonical" href="${canonical}"><meta name="twitter:card" content="summary_large_image"></head>`);
};
if(site)await writeFile(html,decorate(raw,'','Taskmarket Pulse','Follow task creation, rewards, and activity across Base and Tempo.','share.png'));
const views=[
  ['signal','Where attention goes | Taskmarket Pulse','Compare posted reward pools and submissions for open bounties on Base and Tempo.','signal-share.png'],
  ['outcomes','Which bounties found a winner? | Taskmarket Pulse','See how seven completed deadline cohorts resolved on Base and Tempo.','outcomes-share.png']
];
for(const [slug,title,desc,image] of views){
  await mkdir(new URL(slug+'/',out),{recursive:true});
  const focused=raw.replace('<html lang="en">',`<html lang="en" data-view="${slug}">`).replace('<head>','<head><base href="../">');
  await writeFile(new URL(slug+'/index.html',out),site?decorate(focused,slug,title,desc,image):focused);
}
console.log('Built verified snapshot',data.asOf);
