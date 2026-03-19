/**
 * Nish-Logic GK/CA Marathon Engine
 * Data source: Zoho Function → Firestore (no SDK needed)
 */

const ZOHO_API = '/server/nish_logic_function';
const CACHE_EXPIRY_MS = 4 * 24 * 60 * 60 * 1000; // 4 days

function strip(s){ return (s||'').replace(/^\([a-d]\)\s*/i,'').trim(); }

function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
}

function normalizeQ(q){
    let opts=[];
    if(Array.isArray(q.options)) opts=q.options.map(o=>strip(o));
    else if(typeof q.options==='string') opts=q.options.split(',').map(o=>strip(o));
    if(opts.length===0) return null;
    const ans=strip(q.correct_answer||q.answer||'');
    if(!ans) return null;
    if((q.question||'').toLowerCase().includes('template')) return null;
    if((q.explanation||'').toLowerCase().includes('template')) return null;
    const src=q._sourceCol||q.id||'';
    return {
        category: src.startsWith('ca') ? 'Current Affairs' : 'Static GK',
        question: q.question,
        options: opts,
        correct_answer: ans,
        explanation: q.explanation||''
    };
}

async function getBundleForLevel(level){
    const cacheKey=`nish_bundle_${level}`;
    try{
        const cached=localStorage.getItem(cacheKey);
        if(cached){
            const parsed=JSON.parse(cached);
            if(Date.now()-parsed.fetchedAt<CACHE_EXPIRY_MS){
                console.log(`✅ Using cached bundle for ${level}`);
                return parsed.questions;
            }
            console.log(`⏰ Cache expired for ${level}, fetching fresh...`);
        }
    }catch(e){ console.warn('Cache read error:',e); }

    const levelParam=level==='ssc'?'s':'u';
    const res=await fetch(`${ZOHO_API}?level=${levelParam}`);
    if(!res.ok) throw new Error(`Zoho API error: ${res.status}`);
    const data=await res.json();
    const questions=data.questions||[];
    console.log(`📦 Fetched ${questions.length} questions via Zoho API`);

    try{
        localStorage.setItem(cacheKey,JSON.stringify({questions,fetchedAt:Date.now()}));
    }catch(e){ console.warn('Cache write error:',e); }

    return questions;
}

// ── Main state ────────────────────────────────────────────────────────────────
let level='ssc', len=25, pool=[], quizData=[], idx=0, score=0;
let answers=[], timeLeft=600, timerId=null;

// ── Screen switcher ───────────────────────────────────────────────────────────
function showScr(id){
    document.querySelectorAll('.scr').forEach(s=>s.classList.remove('on'));
    document.getElementById(id).classList.add('on');
}

// ── Level / length selectors (called from HTML onclick) ───────────────────────
window.selLevel=function(l){
    level=l==='s'?'ssc':'upsc';
    document.querySelectorAll('.lbtn2').forEach(b=>b.classList.remove('on'));
    document.getElementById('lv-'+l).classList.add('on');
};

window.selLen=function(n){
    len=n;
    document.querySelectorAll('.qbtn').forEach(b=>b.classList.remove('on'));
    document.getElementById('ql-'+n).classList.add('on');
};

// ── Start ─────────────────────────────────────────────────────────────────────
window.startM=async function(){
    document.getElementById('err').classList.remove('on');
    document.getElementById('go-btn').disabled=true;
    showScr('scr-load');
    try{
        const bundle=await getBundleForLevel(level);
        pool=bundle.map(q=>normalizeQ(q)).filter(Boolean);
        console.log(`✅ Pool ready: ${pool.length} questions`);

        if(pool.length<len){
            showScr('scr-setup');
            document.getElementById('go-btn').disabled=false;
            const e=document.getElementById('err');
            e.textContent=`Only ${pool.length} questions available. Add more via Admin Panel.`;
            e.classList.add('on');
            return;
        }

        const gkPool=shuffle(pool.filter(q=>q.category==='Static GK'));
        const caPool=shuffle(pool.filter(q=>q.category==='Current Affairs'));
        const ratios={25:{gk:12,ca:13},50:{gk:20,ca:30},100:{gk:50,ca:50}};
        const ratio=ratios[len]||ratios[25];
        quizData=shuffle([...gkPool.slice(0,ratio.gk),...caPool.slice(0,ratio.ca)]);

        idx=0; score=0; answers=[];
        timeLeft={25:600,50:1200,100:2400}[len]||600;

        document.getElementById('qtot').textContent=len;
        showScr('scr-quiz');
        renderQ();
        startTimer();
    }catch(e){
        showScr('scr-setup');
        document.getElementById('go-btn').disabled=false;
        const eb=document.getElementById('err');
        eb.textContent='Error: '+(e.message||'Could not load questions.');
        eb.classList.add('on');
    }
};

// ── Render question ───────────────────────────────────────────────────────────
function renderQ(){
    const q=quizData[idx];
    document.getElementById('qcur').textContent=idx+1;
    document.getElementById('pbar').style.width=(idx/quizData.length*100)+'%';

    const tt=document.getElementById('qttype');
    tt.textContent=q.category==='Current Affairs'?'CA':'GK';
    tt.className='qtag'+(q.category==='Current Affairs'?' ca':'');
    document.getElementById('qttopic').textContent=q.category;
    document.getElementById('qtxt').textContent=q.question;

    const g=document.getElementById('ogrid');
    g.innerHTML='';
    ['A','B','C','D'].forEach((lt,i)=>{
        const b=document.createElement('button');
        b.className='obtn';
        b.innerHTML=`<span class="olt">${lt}</span>${q.options[i]||''}`;
        b.onclick=()=>handleAnswer(q.options[i],b,q);
        g.appendChild(b);
    });

    document.getElementById('expbox').classList.remove('on');
    document.getElementById('nxtbtn').classList.remove('on');
    const c=document.getElementById('qcard');
    c.style.animation='none'; c.offsetHeight; c.style.animation='';
}

// ── Handle answer ─────────────────────────────────────────────────────────────
function handleAnswer(opt, btn, q){
    if(answers[idx]) return;
    const isCorrect=opt===q.correct_answer;
    answers[idx]={user_ans:opt, is_correct:isCorrect};

    document.getElementById('ogrid').querySelectorAll('.obtn').forEach(b=>b.disabled=true);

    if(isCorrect){
        btn.classList.add('cor');
        score++;
    } else {
        btn.classList.add('wrg');
        document.getElementById('ogrid').querySelectorAll('.obtn').forEach(b=>{
            if(b.textContent.slice(1).trim()===q.correct_answer) b.classList.add('cor');
        });
    }

    // Show explanation
    if(q.explanation){
        document.getElementById('exptxt').innerHTML=q.explanation.replace(
            /WHAT:|WHEN:|WHY:|CONTEXT:|CONCEPT:|APPLICATION:|NCERT:|EXAM TIP:/g,
            m=>`<br><strong>${m}</strong>`
        );
        document.getElementById('expbox').classList.add('on');
    }

    const nb=document.getElementById('nxtbtn');
    nb.classList.add('on');
    nb.textContent=idx===quizData.length-1?'Finish Marathon ✓':'Next Question →';

    setTimeout(()=>nextQ(), 1200);
}

// ── Next question ─────────────────────────────────────────────────────────────
window.nextQ=function(){
    if(!answers[idx]) answers[idx]={user_ans:null,is_correct:false};
    idx++;
    if(idx<quizData.length) renderQ();
    else endQuiz();
};

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer(){
    clearInterval(timerId);
    updateTimer();
    timerId=setInterval(()=>{
        timeLeft--;
        updateTimer();
        if(timeLeft<=0){ clearInterval(timerId); endQuiz(); }
    },1000);
}

function updateTimer(){
    const m=Math.floor(timeLeft/60), s=timeLeft%60;
    const el=document.getElementById('tdsp');
    el.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    el.className='tdsp'+(timeLeft<=60?' dng':timeLeft<=180?' warn':'');
}

// ── End quiz ──────────────────────────────────────────────────────────────────
function endQuiz(){
    clearInterval(timerId);
    for(let i=0;i<quizData.length;i++) if(!answers[i]) answers[i]={user_ans:null,is_correct:false};

    const pct=Math.round(score/quizData.length*100);
    document.getElementById('rpct').textContent=pct+'%';
    document.getElementById('rcircle').style.setProperty('--pct',pct+'%');
    document.getElementById('sc-c').textContent=score;
    document.getElementById('sc-w').textContent=quizData.length-score;

    const totalSecs=({25:600,50:1200,100:2400}[len]||600)-timeLeft;
    const tm=Math.floor(totalSecs/60), ts=totalSecs%60;
    document.getElementById('sc-t').textContent=`${tm}:${String(ts).padStart(2,'0')}`;

    let title='Keep Practising!';
    if(pct>=90) title='Outstanding! 🏆';
    else if(pct>=75) title='Excellent! ⚡';
    else if(pct>=60) title='Good Effort! 👍';
    document.getElementById('rtitle').textContent=title;
    document.getElementById('rsub').textContent=`${len} Qs · ${level.toUpperCase()} · ${pct}% Accuracy`;

    const now=new Date();
    document.getElementById('pcdate').textContent='Completed: '+now.toLocaleDateString('en-IN');
    document.getElementById('pcscore').textContent=`${score}/${quizData.length}`;
    document.getElementById('pcverd').textContent=title.replace(/[🏆⚡👍]/g,'').trim();

    buildReview();
    showScr('scr-res');
}

// ── Review ────────────────────────────────────────────────────────────────────
function buildReview(){
    const list=document.getElementById('revlist');
    list.innerHTML='';
    quizData.forEach((q,i)=>{
        const ans=answers[i]||{user_ans:null,is_correct:false};
        const item=document.createElement('div');
        item.className='ritem'+(ans.is_correct?' ok':'');

        const hdr=document.createElement('div'); hdr.className='ritem-hdr';
        const num=document.createElement('span'); num.className='rqnum'; num.textContent='Q'+(i+1);
        const qt=document.createElement('div'); qt.className='rqtxt'; qt.textContent=q.question;
        hdr.appendChild(num); hdr.appendChild(qt);

        const top=document.createElement('div'); top.className='rtopic'; top.textContent=q.category;

        const ya=document.createElement('div'); ya.className='ryans';
        if(!ans.user_ans){ ya.classList.add('sk'); ya.textContent='Your Answer: Not Attempted'; }
        else if(ans.is_correct){ ya.classList.add('ok'); ya.textContent='Your Answer: '+ans.user_ans+' ✓'; }
        else { ya.classList.add('ng'); ya.textContent='Your Answer: '+ans.user_ans+' ✗'; }

        const ca=document.createElement('div'); ca.className='rcans'; ca.textContent='Correct: '+q.correct_answer;
        const ex=document.createElement('div'); ex.className='rexp';
        ex.innerHTML='<strong>Explanation:</strong> '+q.explanation;

        item.appendChild(hdr); item.appendChild(top); item.appendChild(ya);
        if(!ans.is_correct) item.appendChild(ca);
        item.appendChild(ex);
        list.appendChild(item);
    });
}

window.replayM=function(){ document.getElementById('go-btn').disabled=false; startM(); };
window.goHome=function(){ clearInterval(timerId); document.getElementById('go-btn').disabled=false; showScr('scr-setup'); };