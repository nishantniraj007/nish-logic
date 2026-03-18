import fallbackData from "./fallback_data.js";
// ── Firebase SDK (CDN module imports handled in index.html) ──────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4LVCOG7sWN3SJS4-ygFeAlfocyBissTY",
  authDomain: "nish-logic.firebaseapp.com",
  projectId: "nish-logic",
  storageBucket: "nish-logic.firebasestorage.app",
  messagingSenderId: "673867776160",
  appId: "1:673867776160:web:7d72b4e50c569fb55489c5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Global game state ────────────────────────────────────────────────────────
let quizData = [];
let userAnswers = new Array(18).fill(null);
let currentQuestionIndex = 0;
let timerInterval = null;
let timeRemaining = 15 * 60;
let isTimerEnabled = false;
let startTime = null;

// ── DOM Elements ─────────────────────────────────────────────────────────────
const introScreen = document.getElementById('intro-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const loadingState = document.getElementById('loading-state');
const timerToggle = document.getElementById('timer-toggle');
const qText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const qCounter = document.getElementById('q-counter');
const categoryBadge = document.getElementById('category-badge');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const timerDisplay = document.getElementById('timer');

const DIFF_MAP = { easy: 'e', medium: 'm', ssc: 's', upsc: 'u' };
const CHUNK_TYPES = ['qa', 'lr', 'sgk', 'ca'];

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadingState.style.display = 'none';
        introScreen.style.display = 'flex';
    }, 1000);

    document.getElementById('start-btn').addEventListener('click', startGame);
    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));
    submitBtn.addEventListener('click', finishGame);

    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        const currentLang = getCookie('googtrans');
        if (currentLang === '/en/hi') langToggle.checked = true;
        langToggle.addEventListener('change', (e) => {
            if (e.target.checked) { setCookie('googtrans', '/en/hi'); }
            else { setCookie('googtrans', '/en/en'); }
            location.reload();
        });
    }

    document.getElementById('print-btn').addEventListener('click', () => { window.print(); });
});

// ── Cookie helpers ────────────────────────────────────────────────────────────
function setCookie(name, value) {
    document.cookie = `${name}=${value};path=/`;
    document.cookie = `${name}=${value};domain=.github.io;path=/`;
    document.cookie = `${name}=${value};domain=.web.app;path=/`;
}

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

// ── Strip (a) (b) (c) (d) prefixes ───────────────────────────────────────────
function strip(s) {
    return (s || '').replace(/^\([a-d]\)\s*/i, '').trim();
}

// ── Fetch collection using Firebase SDK — NO 300 doc limit ───────────────────
async function fetchCollection(collectionId) {
    const snap = await getDocs(collection(db, collectionId));
    const parsed = [];
    snap.forEach(docSnap => {
        try {
            const d = docSnap.data();
            if (!d.question || (!d.correct_answer && !d.answer)) return;
            if (d.question.toLowerCase().includes('template')) return;
            if ((d.explanation || '').toLowerCase().includes('template')) return;
            if ((d.correct_answer || d.answer || '').toLowerCase() === 'calculated') return;

            let opts = [];
            if (Array.isArray(d.options)) opts = d.options.map(o => strip(o));
            else if (typeof d.options === 'string') opts = d.options.split(',').map(o => strip(o));
            if (opts.length === 0) return;

            const ans = strip(d.correct_answer || d.answer || '');

            parsed.push({
                id: d.id || 'N/A',
                category: d.category || d.topic || collectionId,
                topic: d.topic || '',
                question: d.question,
                options: opts,
                correct_answer: ans,
                explanation: d.explanation || '',
                trick: d.trick || null
            });
        } catch (err) {
            console.warn(`Skipped malformed doc in ${collectionId}`, err);
        }
    });
    console.log(`  ${collectionId} → ${parsed.length} valid docs`);
    return parsed;
}

// ── Start Game ────────────────────────────────────────────────────────────────
async function startGame() {
    isTimerEnabled = timerToggle.checked;
    const diff = document.querySelector('input[name="difficulty"]:checked').value;
    const suffix = DIFF_MAP[diff];

    loadingState.style.display = 'flex';
    introScreen.style.display = 'none';

    try {
        console.log(`Loading ${diff} questions from 4 collections...`);
        const allChunks = await Promise.all(
            CHUNK_TYPES.map(type => fetchCollection(`${type}_${suffix}`))
        );

        // Pick: 4 QA, 4 LR, 4 SGK, 6 CA = 18
        const picks = [4, 4, 4, 6];
        quizData = [];
        allChunks.forEach((chunk, i) => {
            for (let j = chunk.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [chunk[j], chunk[k]] = [chunk[k], chunk[j]];
            }
            quizData.push(...chunk.slice(0, picks[i]));
        });

        const seen = new Set();
        quizData = quizData.filter(q => {
            if (seen.has(q.question)) return false;
            seen.add(q.question);
            return true;
        });

        for (let j = quizData.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [quizData[j], quizData[k]] = [quizData[k], quizData[j]];
        }

        if (quizData.length === 0) throw new Error('No questions loaded');
        console.log(`✅ Loaded ${quizData.length} live questions for ${diff}`);

    } catch (e) {
        console.warn('Firestore fetch failed, using local fallback.', e);
        if (typeof fallbackData !== 'undefined' && fallbackData[diff]) {
            quizData = [...fallbackData[diff]].sort(() => 0.5 - Math.random());
        } else {
            console.error('Fatal: No live data and fallback missing.');
        }
    }

    userAnswers = new Array(quizData.length).fill(null);
    loadingState.style.display = 'none';
    gameScreen.style.display = 'flex';
    startTime = Date.now();

    if (isTimerEnabled) {
        timeRemaining = 15 * 60;
        timerDisplay.classList.remove('hidden');
        startTimer();
    }

    renderQuestion();
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        if (timeRemaining <= 0) { clearInterval(timerInterval); finishGame(); }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const s = (timeRemaining % 60).toString().padStart(2, '0');
    timerDisplay.innerText = `${m}:${s}`;
    if (timeRemaining < 60) {
        timerDisplay.style.color = '#ff3333';
        timerDisplay.style.animation = 'pulse 1s infinite';
    }
}

// ── Render Question ───────────────────────────────────────────────────────────
function renderQuestion() {
    const q = quizData[currentQuestionIndex];
    qCounter.innerText = `Q: ${currentQuestionIndex + 1}/${quizData.length}`;
    categoryBadge.innerText = q.category;
    qText.innerText = q.question;
    optionsContainer.innerHTML = '';
    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        if (userAnswers[currentQuestionIndex] === opt) btn.classList.add('selected');
        btn.innerText = opt;
        btn.onclick = () => selectOption(opt);
        optionsContainer.appendChild(btn);
    });
    prevBtn.disabled = currentQuestionIndex === 0;
    if (currentQuestionIndex === quizData.length - 1) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
    }
}

function selectOption(selected) {
    userAnswers[currentQuestionIndex] = selected;
    renderQuestion();
}

function navigate(dir) {
    currentQuestionIndex += dir;
    renderQuestion();
}

// ── Finish Game ───────────────────────────────────────────────────────────────
function finishGame() {
    if (timerInterval) clearInterval(timerInterval);
    let score = 0;
    const timeTakenMs = Date.now() - startTime;
    const m = Math.floor(timeTakenMs / 60000);
    const s = Math.floor((timeTakenMs % 60000) / 1000);
    const ansSheet = document.getElementById('answer-sheet');
    ansSheet.innerHTML = '';
    quizData.forEach((q, i) => {
        const userA = userAnswers[i];
        const isCorrect = userA === q.correct_answer;
        if (isCorrect) score++;
        const card = document.createElement('div');
        card.className = `answer-card ${isCorrect ? 'correct' : 'incorrect'}`;
        card.innerHTML = `
            <div class="ans-q"><span class="ans-tag">Q${i + 1}</span> ${q.question}</div>
            <div class="user-ans ${isCorrect ? '' : 'incorrect'}">Your Answer: ${userA || 'Not Attempted'}</div>
            ${!isCorrect ? `<div class="correct-ans">Correct Answer: ${q.correct_answer}</div>` : ''}
            <div class="explanation"><strong>Explanation:</strong><br>${q.explanation.replace(/WHAT:|WHEN:|WHY:|CONTEXT:/g, (m) => `<br><strong>${m}</strong>`)}</div>
            ${q.trick ? `<div class="trick">💡 Trick: ${q.trick}</div>` : ''}
        `;
        ansSheet.appendChild(card);
    });
    document.getElementById('final-score').innerText = `${score}/${quizData.length}`;
    document.getElementById('cert-date').innerText = new Date().toLocaleDateString();
    document.getElementById('cert-time').innerText = isTimerEnabled ? `${m}m ${s}s` : 'Untimed';
    let msg = 'Keep Practicing!';
    if (score > 14) msg = 'Excellent Performance!';
    else if (score > 10) msg = 'Good Job!';
    document.getElementById('cert-message').innerText = msg;
    gameScreen.style.display = 'none';
    resultScreen.style.display = 'flex';
}
