document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('step2Form');
    const characterList = document.getElementById('characterList');
    const addCharBtn = document.getElementById('addCharBtn');
    const charTemplate = document.getElementById('charTemplate').content;

    // Load saved data
    const savedData = JSON.parse(localStorage.getItem('novelData')) || {};

    // Populate World Context if exists
    if (savedData.eraPlace) document.getElementById('eraPlace').value = savedData.eraPlace;
    if (savedData.worldRules) document.getElementById('worldRules').value = savedData.worldRules;
    if (savedData.storyDirection) document.getElementById('storyDirection').value = savedData.storyDirection;

    // Function to add a character row
    function addCharacterRow(data = {}) {
        const clone = document.importNode(charTemplate, true);
        const card = clone.querySelector('.character-card');

        // Fill data if editing
        if (data.name) card.querySelector('.char-name').value = data.name;
        if (data.age) card.querySelector('.char-age').value = data.age;
        if (data.gender) card.querySelector('.char-gender').value = data.gender;
        if (data.nature) card.querySelector('.char-nature').value = data.nature;

        // Remove button logic
        card.querySelector('.remove-char-btn').addEventListener('click', function () {
            card.remove();
        });

        characterList.appendChild(clone);
    }

    // Populate existing characters or add an empty one by default
    if (savedData.characters && savedData.characters.length > 0) {
        savedData.characters.forEach(char => addCharacterRow(char));
    } else {
        addCharacterRow(); // Start with 1 empty character
    }

    // Add character button listener
    addCharBtn.addEventListener('click', () => addCharacterRow());

    // Handle Form Submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Scrape Characters
        const characters = [];
        document.querySelectorAll('.character-card').forEach(card => {
            characters.push({
                name: card.querySelector('.char-name').value,
                age: card.querySelector('.char-age').value,
                gender: card.querySelector('.char-gender').value,
                nature: card.querySelector('.char-nature').value
            });
        });

        // Ensure at least one character exists
        if (characters.length === 0) {
            alert('Please add at least one character to your story!');
            return;
        }

        const novelData = JSON.parse(localStorage.getItem('novelData')) || {};

        // Save Step 2 selections
        novelData.characters = characters;
        novelData.eraPlace = document.getElementById('eraPlace').value;
        novelData.worldRules = document.getElementById('worldRules').value;
        novelData.storyDirection = document.getElementById('storyDirection').value;

        localStorage.setItem('novelData', JSON.stringify(novelData));

        // Proceed to Step 3
        window.location.href = 'step3.html';
    });
});
