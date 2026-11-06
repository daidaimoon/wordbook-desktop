// Homepage count follows the loaded word dataset.
$('bookWordCount').textContent=`${words.length} words · A1–B2`;
// The current learning edition contains the first 100 reference-checked A1 headwords.
icons.home='<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>';
icons.setup='<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="white"/><circle cx="15" cy="17" r="3" fill="white"/>';
icons.lock='<rect x="6" y="10" width="12" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>';
$('flowHome').innerHTML=svg('home');$('flowSetup').innerHTML=svg('setup');document.querySelector('.book-chevron').innerHTML=svg('arrow');
let setup={mode:'continue',level:'all',count:null,order:'ordered',custom:20};
let learned={};
try{learned=JSON.parse(localStorage.getItem('wordbook-learned-v1')||'{}');if(!learned||typeof learned!=='object'||Array.isArray(learned))learned={}}catch{learned={}}
// Preserve all legacy mastery flags and remember them as learned if unmarked later.
for(const word of Object.keys(mastered))if(mastered[word]&&!learned[word])learned[word]={first:null,last:null};
try{localStorage.setItem('wordbook-learned-v1',JSON.stringify(learned))}catch{}
try{const stored=JSON.parse(localStorage.getItem('wordbook-study-setup-v2')||'null');if(stored)setup={...setup,...stored}}catch{}
if(!['all','A1','A2','B1','B2'].includes(setup.level))setup.level='all';
if(![null,10,20,30,'custom'].includes(setup.count))setup.count=null;
setup.mode='continue';
if(!['ordered','random'].includes(setup.order))setup.order='ordered';
const scopeWords=()=>words.filter(x=>setup.level==='all'||(x.levels||[x.level]).includes(setup.level));
const wanted=()=>setup.count===null?Infinity:setup.count==='custom'?Number($('customCount').value):Number(setup.count);
let inPool=(x,mode)=>!mastered[x.w]&&(mode==='review'?!!learned[x.w]:!learned[x.w]);
const eligible=()=>scopeWords().filter(x=>inPool(x,setup.mode));
function saveSetup(){try{localStorage.setItem('wordbook-study-setup-v2',JSON.stringify(setup))}catch{}}
function updateSessionCount(){const available=eligible().length,n=wanted(),valid=n===Infinity||(Number.isInteger(n)&&n>0&&n<=3000);const actual=valid?Math.min(n,available):0;const label=setup.mode==='review'?'Review':'Continue';$('startSession').innerHTML=svg('play')+`<span>${label}${setup.count===null?'':` · ${actual} Words`}</span>`;$('startSession').disabled=!actual;$('sessionStatus').textContent=!valid?'Enter a whole number from 1 to 3000.':!available?(setup.mode==='review'?'No words to review in this selection.':'No new words in this selection. Try Review or Browse All Words.'):`${available} ${available===1?'word':'words'} ${setup.mode==='review'?'to review':'available to learn'}.`;}
function paintSetup(){
 if($('modeChoices'))$('modeChoices').innerHTML=[['continue','Continue'],['review','Review']].map(([mode,label])=>`<button type="button" data-mode="${mode}" aria-pressed="${setup.mode===mode}">${label}<span class="pool-count">${scopeWords().filter(x=>inPool(x,mode)).length}</span></button>`).join('');
 $('levelChoices').innerHTML=['all','A1','A2','B1','B2'].map(l=>`<button type="button" data-level="${l}" aria-pressed="${setup.level===l}" ${!words.some(w=>(w.levels||[w.level]).includes(l)) && l!=='all'?'disabled title="Content not available yet"':''}>${l==='all'?'All':l}${!words.some(w=>(w.levels||[w.level]).includes(l)) && l!=='all'?svg('lock'):''}</button>`).join('');
 $('countChoices').innerHTML=[null,10,20,30,'custom'].map(n=>`<button type="button" data-count="${n===null?'unlimited':n}" aria-pressed="${setup.count===n}">${n===null?'No Limit':n==='custom'?'Custom':n}</button>`).join('');
 $('customCountWrap').hidden=setup.count!=='custom';$('customCount').value=setup.custom;
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{setup.mode=b.dataset.mode;saveSetup();paintSetup()});
 document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{setup.level=setup.level===b.dataset.level?'all':b.dataset.level;saveSetup();paintSetup()});
 document.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{const next=b.dataset.count==='unlimited'?null:b.dataset.count==='custom'?'custom':Number(b.dataset.count);setup.count=setup.count===next?null:next;saveSetup();paintSetup();if(setup.count==='custom')$('customCount').focus()});
 document.querySelectorAll('[name=studyOrder]').forEach(r=>r.checked=r.value===setup.order);updateSessionCount();
}
function showView(){const route=location.hash.slice(1);const view=route==='study'?'study':route==='setup'?'setup':'library';for(const [id,v]of[['libraryView','library'],['setupView','setup'],['studyView','study']])$(id).hidden=view!==v;document.body.dataset.view=view;$('flowHome').hidden=view==='library';$('flowSetup').hidden=view!=='study';stopRecording();if(view==='setup')paintSetup();if(view==='study')render();window.scrollTo({top:0,behavior:'instant'});}
function go(view){if(location.hash==='#'+view)showView();else location.hash=view;}
function resetStudyFilters(){filter='all';$('search').value='';paintCollection();closeCollection();}
function enterStudy(selected){studySession=selected.map(x=>x.w);resetStudyFilters();current=words.findIndex(x=>x.w===studySession[0]);try{sessionStorage.setItem('wordbook-active-session-v1',JSON.stringify(studySession));sessionStorage.setItem('wordbook-session-position-v1',studySession[0])}catch{}go('study');}
$('openBook').onclick=()=>go('setup');$('flowHome').onclick=()=>go('library');$('flowSetup').onclick=()=>go('setup');
$('studyForm').onsubmit=e=>{e.preventDefault();let candidates=eligible();const n=wanted();if(!(n===Infinity||(Number.isInteger(n)&&n>=1&&n<=3000))||!candidates.length){updateSessionCount();return}if(setup.order==='random'){for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]]}}enterStudy(candidates.slice(0,n));};
$('browseBook').onclick=()=>{const all=scopeWords();if(all.length)enterStudy(all)};
$('customCount').oninput=()=>{setup.custom=Number($('customCount').value);saveSetup();updateSessionCount()};
document.querySelectorAll('[name=studyOrder]').forEach(r=>r.onchange=()=>{setup.order=r.value;saveSetup();updateSessionCount()});
function recordLearned(word){const now=new Date().toISOString();learned[word]={first:learned[word]?.first||now,last:now};try{localStorage.setItem('wordbook-learned-v1',JSON.stringify(learned))}catch{toast('当前浏览器不能保存学习记录')}}
const baseSelect=select;select=function(i){baseSelect(i);try{sessionStorage.setItem('wordbook-session-position-v1',words[i].w)}catch{}};
const baseMastered=$('mastered').onclick;$('mastered').onclick=()=>{recordLearned(words[current].w);baseMastered()};
$('next').onclick=()=>{recordLearned(words[current].w);const visible=visibleWords(),at=visible.findIndex(v=>v.i===current);const next=visible.slice(at+1).find(({x})=>filter==='mastered'||!mastered[x.w]);if(next){select(next.i);return}stopRecording();go('setup');toast('本次浏览已结束；未掌握的词已保留在 Review。')};
try{const stored=JSON.parse(sessionStorage.getItem('wordbook-active-session-v1')||'null');if(Array.isArray(stored)){const valid=stored.filter(w=>words.some(x=>x.w===w));studySession=valid.length?valid:null;}const position=sessionStorage.getItem('wordbook-session-position-v1');const at=words.findIndex(x=>x.w===position);if(at>=0&&(!studySession||studySession.includes(position)))current=at;}catch{}
window.addEventListener('hashchange',showView);paintSetup();showView();
