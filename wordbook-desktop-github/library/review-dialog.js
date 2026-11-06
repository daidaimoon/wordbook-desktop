// Two explicit learning queues: untouched new words, and studied/starred words not mastered.
const sessionKey='wordbook-session-v2';
let activeSession=null,browsing=false;
try{const value=JSON.parse(localStorage.getItem(sessionKey)||'null');if(value&&Array.isArray(value.words)&&Array.isArray(value.completed))activeSession=value}catch{}
// Legacy stars also represent an intentional learning action. Removing a star must not make a word new again.
let migratedStars=false;
for(const word of Object.keys(saved))if(saved[word]&&!learned[word]){learned[word]={first:null,last:null};migratedStars=true}
if(migratedStars)try{localStorage.setItem('wordbook-learned-v1',JSON.stringify(learned))}catch{}
const newPool=()=>scopeWords().filter(x=>!learned[x.w]&&!saved[x.w]&&!mastered[x.w]);
const reviewPool=()=>scopeWords().filter(x=>(learned[x.w]||saved[x.w])&&!mastered[x.w]);
inPool=(x,mode)=>!mastered[x.w]&&(mode==='review'?!!(learned[x.w]||saved[x.w]):!learned[x.w]&&!saved[x.w]);
const shuffle=list=>{const result=[...list];if(setup.order==='random')for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result};
const validCount=()=>{const n=wanted();return n===Infinity||(Number.isInteger(n)&&n>0&&n<=3000)};
const replayIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 4v6h-6M20 10a8 8 0 1 0 .2 5"/></svg>';
updateSessionCount=function(){
 const fresh=newPool().length,review=reviewPool().length,valid=validCount();
 $('startSession').innerHTML=svg('play')+'<span>Continue</span><span class="session-count">'+fresh+'</span>';
 $('reviewSession').innerHTML=replayIcon+'<span>Review</span><span class="session-count">'+review+'</span>';
 $('startSession').disabled=!valid||fresh===0;$('reviewSession').disabled=!valid||review===0;
 const status=!valid?'Enter a whole number from 1 to 3000.':fresh===0&&review===0?'All words mastered. Browse All Words to revisit them.':'';
 $('sessionStatus').textContent=status;$('sessionStatus').hidden=!status;
};
function stripSetupTips(){
 $('setupView').querySelectorAll('[data-zh],[title]').forEach(el=>{el.removeAttribute('data-zh');el.removeAttribute('title');el.removeAttribute('aria-describedby')});
 $('setupView').querySelectorAll('legend[tabindex]').forEach(el=>el.removeAttribute('tabindex'));
 $('setupView').querySelectorAll('.touch-help').forEach(el=>el.remove());
 const inSetup=document.body.dataset.view==='setup';
 document.querySelectorAll('header [title],header [data-original-title]').forEach(el=>{if(inSetup){if(el.hasAttribute('title'))el.dataset.originalTitle=el.title;el.removeAttribute('title')}else if(el.dataset.originalTitle){el.title=el.dataset.originalTitle;delete el.dataset.originalTitle}});
}
const oldPaintSetup=paintSetup;paintSetup=function(){oldPaintSetup();stripSetupTips()};
window.addEventListener('hashchange',stripSetupTips);
function saveSession(){try{localStorage.setItem(sessionKey,JSON.stringify(activeSession))}catch{toast('当前浏览器不能保存本次学习列表')}}
function persistPosition(){if(!browsing&&activeSession&&!activeSession.done&&activeSession.words.includes(words[current].w)){activeSession.position=words[current].w;saveSession()}}
const originalSelect=select;select=function(i){originalSelect(i);persistPosition()};
const oldEnterStudy=enterStudy;enterStudy=function(selected){browsing=false;oldEnterStudy(selected)};
function startQueue(mode){
 if(!validCount()){updateSessionCount();return}
 const selected=shuffle(mode==='review'?reviewPool():newPool()).slice(0,wanted());
 if(!selected.length){updateSessionCount();return}
 setup.mode=mode;saveSetup();
 activeSession={kind:mode,words:selected.map(x=>x.w),completed:[],position:selected[0].w,done:false};
 saveSession();enterStudy(selected);
}
$('studyForm').onsubmit=e=>{e.preventDefault();startQueue('continue')};
$('reviewSession').onclick=()=>startQueue('review');
$('browseBook').onclick=()=>{const all=scopeWords();if(!all.length)return;studySession=all.map(x=>x.w);resetStudyFilters();current=words.findIndex(x=>x.w===studySession[0]);browsing=true;go('study')};
// Stars and mastery update both counters immediately without moving the current card.
const originalStar=$('saveWord').onclick;
$('saveWord').onclick=()=>{originalStar();if(saved[words[current].w])recordLearned(words[current].w);updateSessionCount()};
const originalMaster=$('mastered').onclick;
$('mastered').onclick=()=>{originalMaster();updateSessionCount()};
$('next').onclick=()=>{
 const w=words[current].w;recordLearned(w);
 if(!browsing&&activeSession&&!activeSession.done){if(!activeSession.completed.includes(w))activeSession.completed.push(w);saveSession()}
 updateSessionCount();
 const visible=visibleWords(),at=visible.findIndex(x=>x.i===current);
 const next=visible.slice(at+1).find(({x})=>(browsing||!mastered[x.w])&&(browsing||!activeSession||!activeSession.completed.includes(x.w)));
 if(next){select(next.i);return}
 if(!browsing&&activeSession){
  const remaining=activeSession.words.find(w=>!activeSession.completed.includes(w)&&!mastered[w]);
  if(remaining){resetStudyFilters();select(words.findIndex(x=>x.w===remaining));return}
  activeSession.done=true;saveSession();
 }
 go('setup');toast('本次学习已结束。');
};
if(location.hash==='#study'&&activeSession&&!activeSession.done){const valid=activeSession.words.filter(w=>words.some(x=>x.w===w));if(valid.length){studySession=valid;const i=words.findIndex(x=>x.w===activeSession.position);if(i>=0)current=i;render()}}
paintSetup();
