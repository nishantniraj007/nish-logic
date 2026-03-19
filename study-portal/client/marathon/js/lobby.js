document.addEventListener('DOMContentLoaded', () => {
    // 1. Language Toggle Logic (Google Translate integration)
    const langToggle = document.getElementById('lang-toggle');
    langToggle.addEventListener('change', (e) => {
        const targetLang = e.target.checked ? 'hi' : 'en';

        const tryTranslate = () => {
            const comboSelect = document.querySelector('.goog-te-combo');
            if (comboSelect) {
                comboSelect.value = targetLang;
                comboSelect.dispatchEvent(new Event('change'));
            } else {
                setTimeout(tryTranslate, 500);
            }
        };
        tryTranslate();
    });

    // 2. Length & Timer Mapping
    const lengthRadios = document.querySelectorAll('input[name="length"]');
    const timeDisplay = document.getElementById('time-display');
    const timerVal = document.getElementById('timer-val');

    lengthRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            let mins = 10;
            if (e.target.value === "50") mins = 20;
            if (e.target.value === "100") mins = 40;

            timeDisplay.textContent = `${mins} Minutes`;
            timerVal.value = mins;
        });
    });

    // 3. Form Submission (Save to LocalStorage and Route)
    const configForm = document.getElementById('marathon-config');
    configForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const config = {
            length: parseInt(document.querySelector('input[name="length"]:checked').value),
            timeMins: parseInt(timerVal.value),
            level: document.getElementById('exam-level').value,
            language: langToggle.checked ? 'hi' : 'en'
        };

        localStorage.setItem('marathonConfig', JSON.stringify(config));

        // Redirect to Arena route
        window.location.href = 'quiz.html';
    });
});
