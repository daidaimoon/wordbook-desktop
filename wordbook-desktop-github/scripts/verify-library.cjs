const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'library'),source=path.resolve(process.argv[2]);
const manifest=[];function digest(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else{const rel=path.relative(source,p),copy=path.join(dest,rel),hash=digest(p);if(!fs.existsSync(copy)||digest(copy)!==hash)throw Error('Library copy differs: '+rel);manifest.push({path:rel.replaceAll('\\','/'),bytes:fs.statSync(p).size,sha256:hash})}}}
walk(source);
const data=JSON.parse(fs.readFileSync(path.join(dest,'content/american-oxford.json'),'utf8'));
if(data.words.length!==2979)throw Error('Word count differs');
fs.writeFileSync(path.join(root,'library-manifest.json'),JSON.stringify({words:2979,sourceCopyHashVerified:true,files:manifest},null,2));
console.log('Verified identical library copy:',manifest.length,'files,',data.words.length,'words');
