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
if(url){
  const html=new URL('index.html',out);
  const site=url.replace(/\/$/,'');
  const text=(await readFile(html,'utf8')).replace('content="/share.png"',`content="${site}/share.png"`).replace('</head>',`<meta property="og:url" content="${site}/"><link rel="canonical" href="${site}/"><meta name="twitter:card" content="summary_large_image"></head>`);
  await writeFile(html,text);
}
console.log('Built verified snapshot',data.asOf);
