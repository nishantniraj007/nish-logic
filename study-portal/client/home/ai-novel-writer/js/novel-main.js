document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('step1Form');
    const formatSelect = document.getElementById('formatSelect');
    const authorSelect = document.getElementById('authorSelect');

    // Load saved data if exists
    const savedData = JSON.parse(localStorage.getItem('novelData')) || {};
    if (savedData.format) formatSelect.value = savedData.format;
    if (savedData.author) authorSelect.value = savedData.author;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get current or new data object
        const novelData = JSON.parse(localStorage.getItem('novelData')) || {};
        
        // Save Step 1 selections
        novelData.format = formatSelect.value;
        novelData.author = authorSelect.value;
        
        localStorage.setItem('novelData', JSON.stringify(novelData));

        // Proceed to Step 2
        window.location.href = 'step2.html';
    });
});
