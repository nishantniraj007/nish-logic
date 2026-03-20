/**
 * marathon.js
 * Game engine only — timer, scoring, shuffle, render, UI events.
 * Calls window.getData(level) from marathon-data.js
 * Behavior: user selects answer, can change, clicks Next to lock and advance.
 * All feedback (correct/wrong/explanation) only in final review screen.
 */

function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
}

// ── Main state ────────────────────────────────────────────────────────────────
let level='ssc', len=25, quizData=[], idx=0, score=0;
let answers=[], timeLeft=600, timerId=null;

// ── Screen switcher ───────────────────────────────────────────────────────────
function showScr(id){
    document.querySelectorAll('.scr').forEach(s=>s.classList.remove('on'));
    document.getElementById(id).classList.add('on');
}

// ── Level / length selectors ──────────────────────────────────────────────────
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
        const pool = await window.getData(level);
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
        b.onclick=()=>handleAnswer(q.options[i],b);
        g.appendChild(b);
    });

    // Next button always visible, updates label
    const nb=document.getElementById('nxtbtn');
    nb.classList.add('on');
    nb.textContent=idx===quizData.length-1?'Finish Marathon ✓':'Next Question →';

    // Reset answer for this question
    answers[idx]=null;

    const c=document.getElementById('qcard');
    c.style.animation='none'; c.offsetHeight; c.style.animation='';
}

// ── Handle answer — select only, no lock, no feedback ────────────────────────
function handleAnswer(opt, btn){
    // Deselect all options
    document.getElementById('ogrid').querySelectorAll('.obtn').forEach(b=>{
        b.classList.remove('selected');
    });
    // Select clicked option
    btn.classList.add('selected');
    // Store tentative answer — not locked yet
    answers[idx]={user_ans: opt, is_correct: null};
}

// ── Next question — lock answer and advance ───────────────────────────────────
window.nextQ=function(){
    // Lock answer
    if(answers[idx] && answers[idx].user_ans){
        const q=quizData[idx];
        const isCorrect=answers[idx].user_ans===q.correct_answer;
        answers[idx].is_correct=isCorrect;
        if(isCorrect) score++;
    } else {
        // No answer selected — mark as skipped
        answers[idx]={user_ans:null, is_correct:false};
    }
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

// ── End quiz — lock any remaining unanswered ──────────────────────────────────
function endQuiz(){
    clearInterval(timerId);
    for(let i=0;i<quizData.length;i++){
        if(!answers[i] || answers[i].is_correct===null){
            answers[i]={user_ans: answers[i]?answers[i].user_ans:null, is_correct:false};
        }
    }

    // Recalculate score from locked answers
    score=answers.filter(a=>a && a.is_correct).length;

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

// ── Review — full feedback here only ─────────────────────────────────────────
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
        ex.innerHTML='<strong>Explanation:</strong> '+(q.explanation||'N/A');

        item.appendChild(hdr); item.appendChild(top); item.appendChild(ya);
        if(!ans.is_correct) item.appendChild(ca);
        item.appendChild(ex);
        list.appendChild(item);
    });
}

window.replayM=function(){ document.getElementById('go-btn').disabled=false; startM(); };
window.goHome=function(){ clearInterval(timerId); document.getElementById('go-btn').disabled=false; showScr('scr-setup'); };
