const path=require('node:path');
const {packager}=require('@electron/packager');
const root=path.resolve(__dirname,'..');
packager({dir:root,name:'Wordbook',icon:path.join(root,'icon.ico'),platform:'win32',arch:'x64',out:path.join(root,'release-v0.1.0'),overwrite:true,electronZipDir:path.join(root,'.cache/verified'),asar:true,prune:false,extraResource:[path.join(root,'library')],ignore:[/^\/node_modules(?:\/|$)/,/^\/library(?:\/|$)/,/^\/(?:test|scripts|release[^/]*|\.cache|qa[^/]*|test-artifacts)(?:\/|$)/,/(?:library-manifest|dependency-audit)\.json$/,/\.log$/],appBundleId:'local.wordbook.desktop',appVersion:'0.1.0',win32metadata:{CompanyName:'Wordbook',FileDescription:'Wordbook Offline Vocabulary',ProductName:'Wordbook'}}).then(paths=>console.log(paths.join('\n'))).catch(e=>{console.error(e.message);process.exitCode=1});





