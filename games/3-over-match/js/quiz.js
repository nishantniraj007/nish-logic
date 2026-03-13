// Global game state
let quizData = [];
let userAnswers = new Array(18).fill(null);
let currentQuestionIndex = 0;
let timerInterval = null;
let timeRemaining = 15 * 60;
let isTimerEnabled = false;
let startTime = null;

// DOM Elements
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
const PROJECT = 'nish-logic';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

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
        // Restore toggle state from cookie on page load
        const currentLang = getCookie('googtrans');
        if (currentLang === '/en/hi') langToggle.checked = true;

        langToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                setCookie('googtrans', '/en/hi');
            } else {
                setCookie('googtrans', '/en/en');
            }
            location.reload();
        });
    }

    document.getElementById('print-btn').addEventListener('click', () => { window.print(); });
});

function setCookie(name, value) {
    document.cookie = `${name}=${value};path=/`;
    document.cookie = `${name}=${value};domain=.github.io;path=/`;
    document.cookie = `${name}=${value};domain=.web.app;path=/`;
}

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

async function fetchCollection(collectionId) {
    const url = `${BASE_URL}/${collectionId}?pageSize=300`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${collectionId}`);
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents.map(doc => {
        const f = doc.fields;
        return {
            id: f.id ? f.id.stringValue : 'N/A',
            category: f.category ? f.category.stringValue : collectionId,
            topic: f.topic ? f.topic.stringValue : '',
            question: f.question.stringValue,
            options: f.options.arrayValue.values.map(v => v.stringValue),
            correct_answer: f.correct_answer.stringValue,
            explanation: f.explanation ? f.explanation.stringValue : '',
            trick: f.trick ? f.trick.stringValue : null
        };
    });
}

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

        // Pick: 6 QA, 6 LR, 3 SGK, 3 CA = 18
        const picks = [6, 6, 3, 3];
        quizData = [];
        allChunks.forEach((chunk, i) => {
            const shuffled = chunk.sort(() => 0.5 - Math.random());
            quizData.push(...shuffled.slice(0, picks[i]));
        });

        // Final shuffle so categories are mixed
        quizData = quizData.sort(() => 0.5 - Math.random());

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
            <div class="explanation"><strong>Explanation:</strong> ${q.explanation}</div>
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
