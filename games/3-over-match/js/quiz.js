// Global game state
let quizData = [];
let userAnswers = new Array(18).fill(null);
let currentQuestionIndex = 0;
let timerInterval = null;
let timeRemaining = 15 * 60; // 15 minutes in seconds
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

// Dummy Data Fallback for Development/Testing
// 72 full-length questions are injected by fallback_data.js before this script runs.

document.addEventListener('DOMContentLoaded', () => {
    // Attempt to load current data based on difficulty
    // For now, bypass actual fetch unless server is running, use fallback.
    setTimeout(() => {
        loadingState.style.display = 'none';
        introScreen.style.display = 'flex';
    }, 1000); // simulated load

    document.getElementById('start-btn').addEventListener('click', startGame);
    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));
    submitBtn.addEventListener('click', finishGame);

    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        langToggle.addEventListener('change', (e) => {
            const tryTranslate = () => {
                const select = document.querySelector('.goog-te-combo');
                if (select) {
                    select.value = e.target.checked ? 'hi' : 'en';
                    select.dispatchEvent(new Event('change'));
                } else {
                    // If widget not ready, retry in 500ms
                    setTimeout(tryTranslate, 500);
                }
            };
            tryTranslate();
        });
    }

    document.getElementById('print-btn').addEventListener('click', () => {
        window.print();
    });
});

async function startGame() {
    isTimerEnabled = timerToggle.checked;
    const diff = document.querySelector('input[name="difficulty"]:checked').value;

    loadingState.style.display = 'flex';
    introScreen.style.display = 'none';

    try {
        console.log(`Procuring ${diff} pool from Firestore...`);
        const url = `https://firestore.googleapis.com/v1/projects/nish-logic/databases/(default)/documents:runQuery`;
        const query = {
            structuredQuery: {
                from: [{ collectionId: 'vault' }],
                where: {
                    fieldFilter: {
                        field: { fieldPath: 'vault_difficulty' },
                        op: 'EQUAL',
                        value: { stringValue: diff }
                    }
                }
            }
        };

        const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(query)
        });

        if (!res.ok) throw new Error("Database offline");

        const results = await res.json();
        quizData = results
            .filter(r => r.document)
            .map(r => {
                const f = r.document.fields;
                return {
                    id: f.id ? f.id.stringValue : 'N/A',
                    category: f.category.stringValue,
                    topic: f.topic.stringValue,
                    question: f.question.stringValue,
                    options: f.options.arrayValue.values.map(v => v.stringValue),
                    correct_answer: f.correct_answer.stringValue,
                    explanation: f.explanation.stringValue,
                    trick: f.trick ? f.trick.stringValue : null
                };
            });

        if (quizData.length === 0) throw new Error(`No live data for ${diff}`);

        // Scramble and limit to 18 (the game loop expects 18)
        quizData = quizData.sort(() => 0.5 - Math.random()).slice(0, 18);
        console.log(`Successfully loaded ${quizData.length} live questions.`);

    } catch (e) {
        console.warn("Firestore fetch failed, using local fallback.", e);
        if (typeof fallbackData !== 'undefined' && fallbackData[diff]) {
            quizData = [...fallbackData[diff]].sort(() => 0.5 - Math.random());
        } else {
            console.error("Fatal: No live data and fallback data is missing.");
        }
    }

    loadingState.style.display = 'none';
    gameScreen.style.display = 'flex';
    startTime = Date.now();

    if (isTimerEnabled) {
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

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            finishGame();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const s = (timeRemaining % 60).toString().padStart(2, '0');
    timerDisplay.innerText = `${m}:${s}`;

    // Pulse red when less than 1 min
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
        if (userAnswers[currentQuestionIndex] === opt) {
            btn.classList.add('selected');
        }
        btn.innerText = opt;
        btn.onclick = () => selectOption(opt);
        optionsContainer.appendChild(btn);
    });

    // Nav button states
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
    renderQuestion(); // Re-render to show selected visually
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

    // Populate Certificate
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
