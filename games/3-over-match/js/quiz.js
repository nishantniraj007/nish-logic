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

    document.getElementById('print-btn').addEventListener('click', () => {
        window.print();
    });
});

async function startGame() {
    isTimerEnabled = timerToggle.checked;
    const diff = document.querySelector('input[name="difficulty"]:checked').value;

    let batchRange = [0, 0];
    if (diff === 'easy') batchRange = [0, 1];
    else if (diff === 'medium') batchRange = [2, 4];
    else if (diff === 'ssc') batchRange = [5, 7];
    else if (diff === 'upsc') batchRange = [8, 9];

    // Rolling Pool Selection:
    // We have 5 days of data (0-4). 
    // Instead of one random slot, we'll try up to 3 random slots from the pool before falling back.
    const maxAttempts = 3;
    let success = false;
    const cacheBuster = Date.now();

    for (let i = 0; i < maxAttempts; i++) {
        const randomDay = Math.floor(Math.random() * 5);
        const selectedBatch = batchRange[0] + Math.floor(Math.random() * (batchRange[1] - batchRange[0] + 1));
        const poolSlot = (randomDay * 10) + selectedBatch;

        try {
            console.log(`Attempting to load slot_${poolSlot}...`);
            const res = await fetch(`data/slot_${poolSlot}.json?t=${cacheBuster}`);
            if (res.ok) {
                const data = await res.json();
                quizData = data.questions || data;
                success = true;
                break;
            }
        } catch (e) {
            console.warn(`Failed to load slot_${poolSlot}`, e);
        }
    }

    if (!success) {
        // Robust Online Fallback: Try EVERY single valid batch for this difficulty
        // If the pool is still building up on day 1, this guarantees we find the newly generated AI data
        for (let batch = batchRange[0]; batch <= batchRange[1]; batch++) {
            try {
                console.log(`Attempting fallback to batch_${batch}...`);
                const res = await fetch(`data/batch_${batch}.json?t=${cacheBuster}`);
                if (res.ok) {
                    const data = await res.json();
                    quizData = data.questions || data;
                    success = true;

                    // Shuffle the questions slightly so even if we hit the same fallback repeatedly, it feels fresh
                    quizData.sort(() => Math.random() - 0.5);
                    break;
                }
            } catch (e) {
                console.warn(`Fallback batch_${batch} failed`, e);
            }
        }
    }

    if (!success) {
        // Fall to the 72-question static fallback file based on difficulty
        if (fallbackData && fallbackData[diff]) {
            quizData = [...fallbackData[diff]];
            console.warn(`Using local offline fallback for difficulty: ${diff}`);
        } else {
            console.error("Fatal: failed to load JSON and offline defaults are missing.");
        }
    }

    introScreen.style.display = 'none';
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
