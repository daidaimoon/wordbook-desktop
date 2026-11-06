const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'.cache','verified');fs.mkdirSync(dir,{recursive:true});
const version=require('electron/package.json').version,name=`electron-v${version}-win32-x64.zip`,url=`https://github.com/electron/electron/releases/download/v${version}/${name}`;
const expected=require('electron/checksums.json')[name];if(!expected)throw Error('Official package checksum missing');
async function main(){
 const head=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(20000)});if(!head.ok)throw Error('HTTP '+head.status);const size=Number(head.headers.get('content-length'));if(!size)throw Error('Missing length');
 const downloadUrl=head.url; const chunk=512*1024,count=Math.ceil(size/chunk);let next=0,done=0;
 async function worker(){while(next<count){const i=next++,start=i*chunk,end=Math.min(size-1,start+chunk-1),part=path.join(dir,`part-${i}`);if(fs.existsSync(part)&&fs.statSync(part).size===end-start+1){done++;continue}
  for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(downloadUrl,{headers:{Range:`bytes=${start}-${end}`},signal:AbortSignal.timeout(45000)});if(r.status!==206||r.headers.get('content-range')!==`bytes ${start}-${end}/${size}`)throw Error('Unexpected range response');const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length!==end-start+1)throw Error('Incomplete range');fs.writeFileSync(part,bytes);done++;if(done%10===0||done===count)console.log('DOWNLOAD',done,'/',count);break}catch(e){if(attempt===2)throw e}}}}
 await Promise.all(Array.from({length:12},worker));
 const dest=path.join(dir,name),fd=fs.openSync(dest,'w');try{for(let i=0;i<count;i++)fs.writeSync(fd,fs.readFileSync(path.join(dir,`part-${i}`)))}finally{fs.closeSync(fd)}
 const hash=crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex');if(hash!==expected)throw Error('Official SHA256 mismatch');console.log('OFFICIAL SHA256 VERIFIED',hash);
 const extract=require('@electron-internal/extract-zip').default;await extract(dest,{dir:path.join(root,'node_modules/electron/dist')});fs.writeFileSync(path.join(root,'node_modules/electron/path.txt'),'electron.exe');
 console.log('RUNTIME READY');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});

