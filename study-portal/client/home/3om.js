/**
 * 3om.js
 * Game engine only — render, navigate, timer, finish.
 * Calls window.getOMData(levelParam) from 3om-data.js
 */

let quizData=[], userAnswers=[], currentIdx=0;
let timerInterval=null, timeRemaining=900, isTimerEnabled=false, startTime=null;

function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
}

function pickByType(pool, typePrefix, count){
    const filtered=shuffle(pool.filter(q=>{
        const cat=q.category||'';
        if(typePrefix==='qa') return cat==='Quantitative';
        if(typePrefix==='lr') return cat==='Reasoning';
        if(typePrefix==='ca') return cat==='Current Affairs';
        return cat==='General Knowledge';
    }));
    return filtered.slice(0,count);
}

function showScr(id){
    ['intro-screen','game-screen','result-screen'].forEach(s=>{
        document.getElementById(s).style.display='none';
    });
    document.getElementById(id).style.display='flex';
}

window.startGame = async function(){
    isTimerEnabled = document.getElementById('timer-toggle').checked;
    const diff = document.querySelector('input[name="difficulty"]:checked').value;
    const levelParam = window.OM_CONFIG.LEVEL_MAP[diff];

    document.getElementById('loading-state').style.display='flex';
    document.getElementById('intro-screen').style.display='none';

    try{
        const pool = await window.getOMData(levelParam);
        const qa  = pickByType(pool,'qa',4);
        const lr  = pickByType(pool,'lr',4);
        const sgk = pickByType(pool,'sgk',4);
        const ca  = pickByType(pool,'ca',6);
        quizData = shuffle([...qa,...lr,...sgk,...ca]);

        const seen=new Set();
        quizData=quizData.filter(q=>{
            if(seen.has(q.question)) return false;
            seen.add(q.question); return true;
        });

        if(quizData.length===0) throw new Error('No questions loaded');
        console.log(`✅ ${quizData.length} questions ready`);
    }catch(e){
        console.error('Load failed:',e);
        document.getElementById('loading-state').style.display='none';
        document.getElementById('intro-screen').style.display='flex';
        alert('Failed to load questions. Please try again.');
        return;
    }

    userAnswers=new Array(quizData.length).fill(null);
    currentIdx=0;
    startTime=Date.now();

    document.getElementById('loading-state').style.display='none';
    showScr('game-screen');

    if(isTimerEnabled){
        timeRemaining=900;
        document.getElementById('timer').classList.remove('hidden');
        startTimer();
    } else {
        document.getElementById('timer').classList.add('hidden');
    }

    renderQuestion();
};

function renderQuestion(){
    const q=quizData[currentIdx];
    document.getElementById('q-counter').textContent=`Q: ${currentIdx+1}/${quizData.length}`;
    document.getElementById('category-badge').textContent=q.category;
    document.getElementById('question-text').textContent=q.question;

    const pbar=document.getElementById('pbar');
    if(pbar) pbar.style.width=(currentIdx/quizData.length*100)+'%';

    const grid=document.getElementById('options-container');
    grid.innerHTML='';
    q.options.forEach(opt=>{
        const btn=document.createElement('button');
        btn.className='option-btn'+(userAnswers[currentIdx]===opt?' selected':'');
        btn.textContent=opt;
        btn.onclick=()=>{ userAnswers[currentIdx]=opt; renderQuestion(); };
        grid.appendChild(btn);
    });

    document.getElementById('prev-btn').disabled=currentIdx===0;
    const isLast=currentIdx===quizData.length-1;
    document.getElementById('next-btn').style.display=isLast?'none':'inline-block';
    document.getElementById('submit-btn').style.display=isLast?'inline-block':'none';
}

window.navigate=function(dir){ currentIdx+=dir; renderQuestion(); };

function startTimer(){
    updateTimerDisplay();
    timerInterval=setInterval(()=>{
        timeRemaining--;
        updateTimerDisplay();
        if(timeRemaining<=0){ clearInterval(timerInterval); finishGame(); }
    },1000);
}

function updateTimerDisplay(){
    const m=Math.floor(timeRemaining/60).toString().padStart(2,'0');
    const s=(timeRemaining%60).toString().padStart(2,'0');
    const el=document.getElementById('timer');
    el.textContent=`${m}:${s}`;
    el.style.color=timeRemaining<60?'#ff3366':timeRemaining<180?'#f59e0b':'#00e5ff';
}

window.finishGame=function(){
    if(timerInterval) clearInterval(timerInterval);
    let score=0;
    const ms=Date.now()-startTime;
    const m=Math.floor(ms/60000), s=Math.floor((ms%60000)/1000);

    const sheet=document.getElementById('answer-sheet');
    sheet.innerHTML='';
    quizData.forEach((q,i)=>{
        const ua=userAnswers[i];
        const ok=ua===q.correct_answer;
        if(ok) score++;
        const card=document.createElement('div');
        card.className='answer-card '+(ok?'correct':'incorrect');
        card.innerHTML=`
            <div class="ans-q"><span class="ans-tag">Q${i+1}</span> ${q.question}</div>
            <div class="user-ans ${ok?'ok':'ng'}">Your Answer: ${ua||'Not Attempted'}</div>
            ${!ok?`<div class="correct-ans">Correct: ${q.correct_answer}</div>`:''}
            <div class="explanation"><strong>Explanation:</strong> ${q.explanation}</div>
        `;
        sheet.appendChild(card);
    });

    document.getElementById('final-score').textContent=`${score}/${quizData.length}`;
    document.getElementById('cert-date').textContent=new Date().toLocaleDateString('en-IN');
    document.getElementById('cert-time').textContent=isTimerEnabled?`${m}m ${s}s`:'Untimed';
    let msg='Keep Practicing!';
    if(score>14) msg='Excellent Performance! 🏆';
    else if(score>10) msg='Good Job! ⚡';
    document.getElementById('cert-message').textContent=msg;
    showScr('result-screen');
};
