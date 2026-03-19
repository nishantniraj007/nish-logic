/**
 * Nish-Logic GK/CA Marathon Engine
 * Data source: Firestore bundle collections with 4-day localStorage cache
 */

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

const CACHE_EXPIRY_MS = 4 * 24 * 60 * 60 * 1000; // 4 days

// ── Strip (a)(b)(c)(d) prefixes ───────────────────────────────────────────────
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

// ── Get type from question ────────────────────────────────────────────────────
function getType(q) {
    const src = q._sourceCol || q.id || '';
    return src.split('_')[0]; // qa, lr, sgk, ca
}

// ── Normalize question ────────────────────────────────────────────────────────
function normalizeQ(q) {
    let opts = [];
    if (Array.isArray(q.options)) opts = q.options.map(o => strip(o));
    else if (typeof q.options === 'string') opts = q.options.split(',').map(o => strip(o));
    if (opts.length === 0) return null;
    const ans = strip(q.correct_answer || q.answer || '');
    if (!ans) return null;
    if ((q.question || '').toLowerCase().includes('template')) return null;
    if ((q.explanation || '').toLowerCase().includes('template')) return null;
    return {
        category: getType(q) === 'ca' ? 'Current Affairs' : 'Static GK',
        question: q.question,
        options: opts,
        correct_answer: ans,
        explanation: q.explanation || ''
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
                console.log(`✅ Using cached bundle for ${level}`);
                return parsed.questions;
            }
            console.log(`⏰ Cache expired for ${level}, fetching fresh...`);
        }
    } catch(e) {
        console.warn('Cache read error:', e);
    }

    const bundleCol = `bundle_${level}`;
    const snap = await getDocs(collection(db, bundleCol));
    const docs = snap.docs.filter(d => d.id !== '_template');
    if (docs.length === 0) throw new Error(`No bundles found in ${bundleCol}`);

    const randomDoc = docs[Math.floor(Math.random() * docs.length)];
    const questions = randomDoc.data().questions || [];
    console.log(`📦 Fetched ${questions.length} questions from ${bundleCol}/${randomDoc.id}`);

    try {
        localStorage.setItem(cacheKey, JSON.stringify({
            questions,
            fetchedAt: Date.now(),
            bundleId: randomDoc.id
        }));
    } catch(e) {
        console.warn('Cache write error:', e);
    }

    return questions;
}

class MarathonEngine {
    constructor() {
        this.config = JSON.parse(localStorage.getItem('marathonConfig')) || {
            length: 25,
            timeMins: 10,
            level: 'ssc'
        };
        this.pool = [];
        this.quizData = [];
        this.currentIndex = 0;
        this.score = 0;
        this.answers = [];
        this.timeLeft = this.config.timeMins * 60;
        this.timerId = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadData();
        this.startQuiz();
    }

    setupEventListeners() {
        document.getElementById('next-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('download-cert').addEventListener('click', () => this.generateCertificate());
    }

    async loadData() {
        try {
            const bundle = await getBundleForLevel(this.config.level);
            this.pool = bundle.map(q => normalizeQ(q)).filter(Boolean);
            console.log(`✅ Pool ready: ${this.pool.length} questions`);
        } catch(e) {
            console.error('Bundle load failed:', e);
            this.generateMockData();
        }
        this.prepareQuizData();
    }

    generateMockData() {
        for (let i = 0; i < 100; i++) {
            this.pool.push({
                category: i % 2 === 0 ? 'Static GK' : 'Current Affairs',
                question: `[MOCK] Test Question ${i+1}?`,
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correct_answer: 'Option A',
                explanation: 'Mock data — bundle not yet available for this level.'
            });
        }
    }

    prepareQuizData() {
        const gkPool  = shuffle(this.pool.filter(q => q.category === 'Static GK'));
        const caPool  = shuffle(this.pool.filter(q => q.category === 'Current Affairs'));

        // Ratio per length
        const ratios = {
            25:  { gk: 12, ca: 13 },
            50:  { gk: 20, ca: 30 },
            100: { gk: 50, ca: 50 }
        };
        const ratio = ratios[this.config.length] || ratios[25];

        const selectedGk = gkPool.slice(0, ratio.gk);
        const selectedCa = caPool.slice(0, ratio.ca);
        this.quizData = shuffle([...selectedGk, ...selectedCa]);

        // Fill deficit if pool too small
        if (this.quizData.length < this.config.length) {
            console.warn('Pool too small, pulling extras.');
            const deficit = this.config.length - this.quizData.length;
            this.quizData.push(...shuffle(this.pool).slice(0, deficit));
        }

        document.getElementById('loading').style.display = 'none';
        document.getElementById('question-card').style.display = 'block';
    }

    startQuiz() {
        this.showQuestion();
        this.startTimer();
    }

    showQuestion() {
        const q = this.quizData[this.currentIndex];
        document.getElementById('q-count').textContent = `${this.currentIndex + 1}/${this.config.length}`;
        document.getElementById('q-category').textContent = q.category;
        document.getElementById('q-text').textContent = q.question;

        const container = document.getElementById('options-container');
        container.innerHTML = '';
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.onclick = () => this.handleAnswer(opt, btn);
            container.appendChild(btn);
        });
        document.getElementById('next-btn').style.display = 'none';
    }

    handleAnswer(opt, btn) {
        if (this.answers[this.currentIndex]) return;
        const q = this.quizData[this.currentIndex];
        const isCorrect = opt === q.correct_answer;
        this.answers[this.currentIndex] = { user_ans: opt, is_correct: isCorrect };
        if (isCorrect) {
            btn.classList.add('correct');
            this.score++;
        } else {
            btn.classList.add('wrong');
            Array.from(document.querySelectorAll('.option-btn')).forEach(b => {
                if (b.textContent === q.correct_answer) b.classList.add('correct');
            });
        }
        document.getElementById('current-score').textContent = this.score;
        document.getElementById('next-btn').style.display = 'block';
        setTimeout(() => this.nextQuestion(), 1200);
    }

    nextQuestion() {
        this.currentIndex++;
        if (this.currentIndex < this.quizData.length) {
            this.showQuestion();
        } else {
            this.endQuiz();
        }
    }

    startTimer() {
        this.timerId = setInterval(() => {
            this.timeLeft--;
            const mins = Math.floor(this.timeLeft / 60);
            const secs = this.timeLeft % 60;
            document.getElementById('timer').textContent =
                `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
            if (this.timeLeft <= 0) this.endQuiz();
        }, 1000);
    }

    endQuiz() {
        clearInterval(this.timerId);
        document.getElementById('question-card').style.display = 'none';
        document.getElementById('stats-bar').style.display = 'none';
        document.getElementById('results-card').style.display = 'block';

        const accuracy = ((this.score / this.config.length) * 100).toFixed(1);
        document.getElementById('final-accuracy').textContent = `${accuracy}%`;
        const timeTaken = (this.config.timeMins * 60) - this.timeLeft;
        const tm = Math.floor(timeTaken / 60);
        const ts = timeTaken % 60;
        document.getElementById('final-time').textContent = `${tm}m ${ts}s`;
        this.renderMiniReview();
    }

    renderMiniReview() {
        const review = document.getElementById('mini-review');
        this.quizData.forEach((q, i) => {
            const ans = this.answers[i] || { user_ans: 'No Answer', is_correct: false };
            const card = document.createElement('div');
            card.className = `mini-review-card ${ans.is_correct ? 'correct' : 'wrong'}`;
            card.innerHTML = `
                <strong>Q${i+1}: ${q.question}</strong><br>
                <span class="ans-label">Your Ans: ${ans.user_ans}</span> |
                <span class="correct-label">Correct: ${q.correct_answer}</span>
                <p style="font-size:0.85em; color:#aaa; margin-top:5px;"><em>Ex: ${q.explanation.replace(/WHAT:|WHEN:|WHY:|CONTEXT:|CONCEPT:|APPLICATION:|NCERT:|EXAM TIP:/g, (m) => `<br><strong>${m}</strong>`)}</em></p>
            `;
            review.appendChild(card);
        });
    }

    async generateCertificate() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFillColor(5, 10, 16);
        doc.rect(0, 0, 210, 297, 'F');
        doc.setTextColor(0, 255, 204);
        doc.setFontSize(26);
        doc.text("GK MARATHON CERTIFICATE", 105, 40, { align: "center" });
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text(`Level: ${this.config.level.toUpperCase()}`, 105, 60, { align: "center" });
        doc.text(`Length: ${this.config.length} MCQs`, 105, 70, { align: "center" });
        doc.text(`Score: ${this.score} / ${this.config.length}`, 105, 80, { align: "center" });
        doc.setTextColor(255, 0, 255);
        doc.setFontSize(20);
        const accuracy = ((this.score / this.config.length) * 100).toFixed(1);
        doc.text(`ACCURACY: ${accuracy}%`, 105, 100, { align: "center" });
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Generated by Nish-Logic AI Vault", 105, 280, { align: "center" });
        doc.save(`Nish-Logic-Marathon-${Date.now()}.pdf`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.marathon = new MarathonEngine();
});