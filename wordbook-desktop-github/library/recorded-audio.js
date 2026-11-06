const batch010AudioRevision='batch010-boundary-v2';
function recordingAssetUrl(path){if(typeof path==='string'&&path.startsWith('audio/Batch-013/'))return path+(path.includes('?')?'&':'?')+'v=batch013-boundary-v4';if(typeof path==='string'&&path.startsWith('audio/Batch-012/'))return path+(path.includes('?')?'&':'?')+'v=batch012-boundary-v2';return typeof path==='string'&&path.startsWith('audio/Batch-010/')?path+(path.includes('?')?'&':'?')+'v='+batch010AudioRevision:path}
// Recorded assets only. No browser speech or paid synthesis requests.
const recordingPlayer=new Audio();
recordingPlayer.preload='none';
recordingPlayer.id='recordedAudio';recordingPlayer.hidden=true;document.body.append(recordingPlayer);
let recordingButton=null,recordingRequest=0;
function clearRecordingState(){if(recordingButton){recordingButton.classList.remove('is-playing');recordingButton.removeAttribute('aria-busy')}recordingButton=null;const el=document.getElementById('status');if(el)el.textContent=''}
function stopRecording(){recordingRequest++;recordingPlayer.pause();clearRecordingState()}
async function playRecording(path,rate=1,button){
 stopRecording();const request=recordingRequest;
 if(!path){toast('这条录音暂未提供');return}
 recordingButton=button||null;if(button){button.classList.add('is-playing');button.setAttribute('aria-busy','true')}
 recordingPlayer.src=recordingAssetUrl(path);recordingPlayer.playbackRate=rate;recordingPlayer.preservesPitch=true;
 const status=document.getElementById('status');if(status)status.textContent='正在播放';
 try{await recordingPlayer.play()}catch(e){if(request!==recordingRequest)return;clearRecordingState();if(e.name!=='AbortError')toast('录音加载失败，请重试')}
}
recordingPlayer.addEventListener('ended',clearRecordingState);
recordingPlayer.addEventListener('error',()=>{clearRecordingState()});
window.addEventListener('pagehide',stopRecording);
// ZIP (stored entries) keeps the original MP3 assets and filenames intact.
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0}
function zipStored(files){
 const chunks=[],directory=[];let offset=0,centralSize=0;const enc=new TextEncoder();
 for(const file of files){const name=enc.encode(file.name),bytes=file.bytes,crc=crc32(bytes),local=new Uint8Array(30+name.length),l=new DataView(local.buffer);l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint32(14,crc,true);l.setUint32(18,bytes.length,true);l.setUint32(22,bytes.length,true);l.setUint16(26,name.length,true);local.set(name,30);chunks.push(local,bytes);
 const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);directory.push(central);centralSize+=central.length;offset+=local.length+bytes.length}
 const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);return new Blob([...chunks,...directory,end],{type:'application/zip'})
}
async function collectRecordingFiles(selected){
 const paths=new Set();for(const w of selected){Object.values(w.audio).filter(Boolean).forEach(p=>paths.add(p));for(const pronunciation of w.pronunciations||[])Object.values(pronunciation.audio||{}).filter(Boolean).forEach(p=>paths.add(p));w.sense_ids.forEach(sid=>{const definition=wordbookBatch.audio.definitions[sid+'-definition'];if(definition)paths.add(definition);(w.examples[sid]||[]).forEach(e=>{if(e.audio)paths.add(e.audio)})})}
 const files=[];for(const path of paths){const response=await fetch(recordingAssetUrl(path));if(!response.ok)throw new Error('Audio fetch failed');files.push({name:path,bytes:new Uint8Array(await response.arrayBuffer())})}
 return files;
}
