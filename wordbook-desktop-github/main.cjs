const {app,BrowserWindow,Menu,protocol,session,dialog,shell} = require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {Readable}=require('node:stream');
const {resolveAsset,byteRange,MIME}=require('./lib/assets.cjs');

// Stable origin and profile keep learning data independent of the executable path.
app.setName('Wordbook');

const testProfile=process.argv.find(x=>x.startsWith('--qa-profile='));
const profile=testProfile?path.resolve(testProfile.slice('--qa-profile='.length)):path.join(app.getPath('appData'),'WordbookDesktop'); fs.mkdirSync(profile,{recursive:true}); app.setPath('userData',profile);
protocol.registerSchemesAsPrivileged([{scheme:'wordbook',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
let win,closing=false;
const library=app.isPackaged ? path.join(process.resourcesPath,'library') : path.join(__dirname,'library');
function log(message){try{fs.appendFileSync(path.join(app.getPath('userData'),'desktop.log'),new Date().toISOString()+' '+message+'\n')}catch{}}
async function snapshot(){
  if(!win || win.isDestroyed() || !win.webContents.getURL().startsWith('wordbook://app/'))return;
  const values=await win.webContents.executeJavaScript(`JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('wordbook-')).map(k=>[k,localStorage.getItem(k)])))`);
  const parsed=JSON.parse(values);
  const backup=path.join(app.getPath('userData'),'backups');fs.mkdirSync(backup,{recursive:true});
  const dest=path.join(backup,'learning-state-latest.json');
  if(fs.existsSync(dest))fs.copyFileSync(dest,path.join(backup,'learning-state-previous.json'));
  fs.writeFileSync(dest+'.tmp',JSON.stringify({schema:1,appVersion:app.getVersion(),savedAt:new Date().toISOString(),storage:parsed},null,2));
  fs.renameSync(dest+'.tmp',dest);
  await session.defaultSession.flushStorageData();
}
async function createWindow(){
  win=new BrowserWindow({title:'Wordbook · 离线词书',width:1280,height:850,minWidth:760,minHeight:600,backgroundColor:'#f7f7f6',icon:path.join(__dirname,'icon.ico'),show:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.webContents.on('console-message',event=>{if(event.level==='error')log('renderer: '+event.message)}); if(testProfile){win.webContents.on('media-started-playing',()=>log('media-started-playing'));win.webContents.on('media-paused',()=>log('media-paused'))};
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('wordbook://app/'))event.preventDefault()});
  win.webContents.on('render-process-gone',(_e,details)=>log('renderer exited: '+details.reason));
  win.webContents.on('did-fail-load',(_e,code,text,url)=>log('load failed '+code+' '+text+' '+url));
  win.on('page-title-updated',event=>event.preventDefault());
  win.once('ready-to-show',()=>win.show());
  win.on('close',event=>{if(closing)return;event.preventDefault();closing=true;snapshot().catch(e=>log('backup failed: '+e.message)).finally(()=>win.destroy())});
  await win.loadURL('wordbook://app/'); win.show(); win.focus(); if(testProfile)log('window-ready '+JSON.stringify({visible:win.isVisible(),bounds:win.getBounds()}));
}
if(!app.requestSingleInstanceLock()){app.quit()}else{
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus()}});
 app.whenReady().then(async()=>{
  app.setAccessibilitySupportEnabled(true); fs.mkdirSync(app.getPath('userData'),{recursive:true});
  if(!fs.existsSync(path.join(library,'index.html')))throw new Error('未找到离线词库，请保留程序旁的 resources 文件夹。');
  protocol.handle('wordbook',request=>{
   const file=resolveAsset(library,request.url);
   if(!file)return new Response('Not found',{status:404});
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
   if(testProfile && path.extname(file)==='.mp3')log('audio request '+path.relative(library,file)+' '+(request.headers.get('range')||'full'));
   const size=fs.statSync(file).size,range=byteRange(request.headers.get('range'),size);
   if(range===false)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
   const start=range?range.start:0,end=range?range.end:size-1;
   const headers={'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':String(end-start+1),'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'"};
   if(range)headers['Content-Range']=`bytes ${start}-${end}/${size}`;
   return new Response(request.method==='HEAD'||!size?null:Readable.toWeb(fs.createReadStream(file,{start,end})),{status:range?206:200,headers});
  });
  session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(details,callback)=>callback({cancel:!details.url.startsWith('wordbook://app/')}));
  session.defaultSession.on('will-download',(_event,item)=>{
   const downloads=app.getPath('downloads');item.setSaveDialogOptions({defaultPath:path.join(downloads,item.getFilename())});
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
   {label:'文件',submenu:[{label:'保存学习记录备份',click:()=>snapshot().then(()=>dialog.showMessageBox(win,{type:'info',message:'学习记录已备份',detail:path.join(app.getPath('userData'),'backups')})).catch(e=>dialog.showErrorBox('备份失败',e.message))},{label:'打开记录文件夹',click:()=>shell.openPath(app.getPath('userData'))},{type:'separator'},{label:'退出',accelerator:'Alt+F4',click:()=>win.close()}]},
   {label:'视图',submenu:[{role:'reload',label:'刷新页面'},{role:'resetZoom',label:'实际大小'},{role:'zoomIn',label:'放大'},{role:'zoomOut',label:'缩小'},{role:'togglefullscreen',label:'全屏'}]},
   {label:'帮助',submenu:[{label:'关于 Wordbook',click:()=>dialog.showMessageBox(win,{type:'info',message:'Wordbook 0.1.0 · 离线预览版',detail:'内置 2,979 词，支持搜索、学习、收藏、已掌握标记和录音播放。词包导入暂未开放。'})}]}]));
  await createWindow();
  const timer=setInterval(()=>snapshot().catch(e=>log('backup failed: '+e.message)),60000);timer.unref();
 }).catch(error=>{dialog.showErrorBox('Wordbook 启动失败',error.message);app.quit()});
 app.on('window-all-closed',()=>app.quit());
}




