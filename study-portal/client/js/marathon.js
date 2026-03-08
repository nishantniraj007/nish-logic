/**
 * Nish-Logic GK/GS/CA Marathon Engine
 * Optimized for handling 100+ questions in a single session.
 */

class MarathonEngine {
    constructor() {
        this.config = JSON.parse(localStorage.getItem('marathonConfig')) || {
            length: 25,
            timeMins: 10,
            level: 'bank_ssc',
            language: 'en'
        };

        this.pool = [];
        this.quizData = [];
        this.currentIndex = 0;
        this.score = 0;
        this.answers = []; // Track user answers
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
            // 1. Attempt to load the 10k local pool
            const response = await fetch('data/massive_pool.json');
            if (response.ok) {
                this.pool = await response.json();
            } else {
                console.warn("Local pool 404. Falling back to remote DB.");
                await this.loadRemoteFallback();
            }
        } catch (e) {
            console.error("Pool load failed. Using remote seeding.", e);
            await this.loadRemoteFallback();
        }

        this.prepareQuizData();
    }

    async loadRemoteFallback() {
        // Simple remote fetcher for when pool isn't built yet
        const GITHUB_BASE = "https://raw.githubusercontent.com/nishantniraj007/nish-logic-gk-database/master";
        const levels = this.config.level === 'bank_ssc' ? [13, 14, 15] : [15, 16, 17];
        const topics = ['history', 'geography', 'polity'];
        
        try {
            // Fetch a few samples
            await Promise.all(topics.map(async (t) => {
                const lvl = levels[Math.floor(Math.random() * levels.length)];
                try {
                    const res = await fetch(`${GITHUB_BASE}/${t}/level_${lvl}.json`);
                    if (res.ok) {
                        const data = await res.json();
                        this.pool.push(...data.map(q => ({...q, category: `Static GK (${t})`})));
                    }
                } catch(err) {}
            }));

            // Fetch CA
            const caRes = await fetch(`${GITHUB_BASE}/current_affairs/latest.json`);
            if (caRes.ok) {
                const caData = await caRes.json();
                this.pool.push(...caData);
            }
        } catch(e) {
            console.warn("Total DB isolation. Generating mock data for testing.");
            this.generateMockData();
        }
    }

    generateMockData() {
        for(let i=0; i<100; i++) {
            this.pool.push({
                category: i % 2 === 0 ? "Static GK" : "Current Affairs",
                question: `[MOCK] Test Marathon Question ${i+1}?`,
                options: ["Option A", "Option B", "Option C", "Option D"],
                correct_answer: "Option A",
                explanation: "This is a mock question because the DB repo is currently being updated.",
                trick: "No trick for mocks."
            });
        }
    }

    prepareQuizData() {
        // Enforce 40:60 Ratio
        const gkPool = this.pool.filter(q => q.category.includes("Static"));
        const caPool = this.pool.filter(q => q.category.includes("Current Affairs") || q.category === "Current Affairs");

        const gkCount = Math.floor(this.config.length * 0.4);
        const caCount = this.config.length - gkCount;

        const selectedGk = gkPool.sort(() => 0.5 - Math.random()).slice(0, gkCount);
        const selectedCa = caPool.sort(() => 0.5 - Math.random()).slice(0, caCount);

        this.quizData = [...selectedGk, ...selectedCa].sort(() => 0.5 - Math.random());
        
        // If pool was too small, fill with whatever remains
        if(this.quizData.length < this.config.length) {
            console.warn("Pool too small for length. Pulling duplicates.");
            const deficit = this.config.length - this.quizData.length;
            this.quizData.push(...this.pool.slice(0, deficit));
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
        if (this.answers[this.currentIndex]) return; // Single attempt

        const q = this.quizData[this.currentIndex];
        const isCorrect = opt === q.correct_answer;
        
        this.answers[this.currentIndex] = {
            user_ans: opt,
            is_correct: isCorrect
        };

        if (isCorrect) {
            btn.classList.add('correct');
            this.score++;
        } else {
            btn.classList.add('wrong');
            // Show correct one
            Array.from(document.querySelectorAll('.option-btn')).forEach(b => {
                if(b.textContent === q.correct_answer) b.classList.add('correct');
            });
        }

        document.getElementById('current-score').textContent = this.score;
        document.getElementById('next-btn').style.display = 'block';

        // Auto-next for marathon flow (optional, but requested simple)
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
            const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            document.getElementById('timer').textContent = display;

            if (this.timeLeft <= 0) {
                this.endQuiz();
            }
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
            const ans = this.answers[i] || { user_ans: "No Answer", is_correct: false };
            const card = document.createElement('div');
            card.className = `mini-review-card ${ans.is_correct ? 'correct' : 'wrong'}`;
            card.innerHTML = `
                <strong>Q${i+1}: ${q.question}</strong><br>
                <span class="ans-label">Your Ans: ${ans.user_ans}</span> | 
                <span class="correct-label">Correct: ${q.correct_answer}</span>
                <p style="font-size: 0.85em; color: #aaa; margin-top:5px;"><em>Ex: ${q.explanation}</em></p>
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
        doc.text(`Difficulty: ${this.config.level.toUpperCase()}`, 105, 60, { align: "center" });
        doc.text(`Length: ${this.config.length} MCQs`, 105, 70, { align: "center" });
        doc.text(`Score: ${this.score} / ${this.config.length}`, 105, 80, { align: "center" });
        
        doc.setTextColor(255, 0, 255);
        doc.setFontSize(20);
        const accuracy = ((this.score / this.config.length) * 100).toFixed(1);
        doc.text(`ACCURACY: ${accuracy}%`, 105, 100, { align: "center" });

        // Footer
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Generated by Nish-Logic AI Vault", 105, 280, { align: "center" });

        doc.save(`Nish-Logic-Marathon-${Date.now()}.pdf`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.marathon = new MarathonEngine();
});
