import fallbackData from "./fallback_data.js";
// ── Firebase SDK ─────────────────────────────────────────────────────────────
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

const DIFF_MAP = { easy: 'easy', medium: 'medium', ssc: 'ssc', upsc: 'upsc' };
const CACHE_EXPIRY_MS = 4 * 24 * 60 * 60 * 1000; // 4 days

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

// ── Fisher-Yates shuffle ──────────────────────────────────────────────────────
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ── Get type from question (_sourceCol or id prefix) ─────────────────────────
function getType(q) {
    const src = q._sourceCol || q.id || '';
    return src.split('_')[0]; // qa, lr, sgk, ca
}

// ── Normalize question for game use ──────────────────────────────────────────
function normalizeQ(q, colHint) {
    let opts = [];
    if (Array.isArray(q.options)) opts = q.options.map(o => strip(o));
    else if (typeof q.options === 'string') opts = q.options.split(',').map(o => strip(o));
    if (opts.length === 0) return null;
    const ans = strip(q.correct_answer || q.answer || '');
    if (!ans) return null;
    if (q.question && q.question.toLowerCase().includes('template')) return null;
    if ((q.explanation || '').toLowerCase().includes('template')) return null;
    return {
        id: q.id || 'N/A',
        category: q.category || q.topic || colHint || '',
        topic: q.topic || '',
        question: q.question,
        options: opts,
        correct_answer: ans,
        explanation: q.explanation || '',
        trick: q.trick || null,
        _sourceCol: q._sourceCol || ''
    };
}

// ── 4-Day Cache: get bundle from localStorage or Firestore ───────────────────
async function getBundleForLevel(level) {
    const cacheKey = `nish_bundle_${level}`;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            const age = Date.now() - parsed.fetchedAt;
            if (age < CACHE_EXPIRY_MS) {
                console.log(`✅ Using cached bundle for ${level} (${Math.floor(age/3600000)}h old)`);
                return parsed.questions;
            }
            console.log(`⏰ Cache expired for ${level}, fetching fresh bundle...`);
        }
    } catch(e) {
        console.warn('Cache read error:', e);
    }

    // Fetch from Firestore — pick a random bundle doc
    const bundleCol = `bundle_${level}`;
    const snap = await getDocs(collection(db, bundleCol));
    const docs = snap.docs.filter(d => d.id !== '_template');
    if (docs.length === 0) throw new Error(`No bundles found in ${bundleCol}`);

    // Pick random bundle
    const randomDoc = docs[Math.floor(Math.random() * docs.length)];
    const data = randomDoc.data();
    const questions = data.questions || [];
    console.log(`📦 Fetched ${questions.length} questions from ${bundleCol}/${randomDoc.id}`);

    // Save to cache
    try {
        localStorage.setItem(cacheKey, JSON.stringify({
            questions,
            fetchedAt: Date.now(),
            bundleId: randomDoc.id
        }));
    } catch(e) {
        console.warn('Cache write error (storage full?):', e);
    }

    return questions;
}

// ── Pick questions by type from bundle ───────────────────────────────────────
function pickFromBundle(bundle, typePrefix, count) {
    const pool = shuffle(bundle.filter(q => getType(q) === typePrefix));
    return pool.slice(0, count).map(q => normalizeQ(q, typePrefix)).filter(Boolean);
}

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

// ── Start Game ────────────────────────────────────────────────────────────────
async function startGame() {
    isTimerEnabled = timerToggle.checked;
    const diff = document.querySelector('input[name="difficulty"]:checked').value;
    const level = DIFF_MAP[diff]; // easy, medium, ssc, upsc

    loadingState.style.display = 'flex';
    introScreen.style.display = 'none';

    try {
        console.log(`Loading ${level} bundle...`);
        const bundle = await getBundleForLevel(level);

        // Pick 4 QA + 4 LR + 4 SGK + 6 CA = 18
        const qa  = pickFromBundle(bundle, 'qa',  4);
        const lr  = pickFromBundle(bundle, 'lr',  4);
        const sgk = pickFromBundle(bundle, 'sgk', 4);
        const ca  = pickFromBundle(bundle, 'ca',  6);

        quizData = shuffle([...qa, ...lr, ...sgk, ...ca]);

        // Deduplicate
        const seen = new Set();
        quizData = quizData.filter(q => {
            if (seen.has(q.question)) return false;
            seen.add(q.question);
            return true;
        });

        if (quizData.length === 0) throw new Error('No questions loaded from bundle');
        console.log(`✅ Loaded ${quizData.length} questions for ${level}`);

    } catch (e) {
        console.warn('Bundle fetch failed, using fallback.', e);
        if (typeof fallbackData !== 'undefined' && fallbackData[diff]) {
            quizData = shuffle([...fallbackData[diff]]);
        } else {
            console.error('Fatal: No bundle and no fallback.');
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