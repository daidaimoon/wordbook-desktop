const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=process.argv[2]?path.resolve(process.argv[2]):path.resolve(root,'../outputs/wordbook-900-local/project/dist'),dest=path.join(root,'library');
fs.cpSync(source,dest,{recursive:true});
const data=JSON.parse(fs.readFileSync(path.join(dest,'content/american-oxford.json'),'utf8'));
if(data.words.length!==2979)throw Error('Unexpected word count');
const files=[];
function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())scan(p);else files.push({path:path.relative(dest,p).replaceAll('\\','/'),bytes:fs.statSync(p).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')})}}
scan(dest);fs.writeFileSync(path.join(root,'library-manifest.json'),JSON.stringify({words:data.words.length,files},null,2));
console.log('Prepared',data.words.length,'words;',files.length,'files');
