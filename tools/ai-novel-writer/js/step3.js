import { GoogleGenAI } from '@google/genai';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('step3Form');
    const apiKeyInput = document.getElementById('apiKey');
    const outputLangSelect = document.getElementById('outputLang');
    const coreTopicInput = document.getElementById('coreTopic');

    const generateBtn = document.getElementById('generateBtn');
    const outputBox = document.getElementById('outputBox');
    const outputLabel = document.getElementById('outputLabel');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const exportMenu = document.getElementById('exportMenu');

    const btnText = generateBtn.querySelector('.btn-text');

    // Load saved data to construct the prompt
    const savedData = JSON.parse(localStorage.getItem('novelData')) || {};

    // Check if user skipped steps
    if (!savedData.format || !savedData.characters) {
        alert("System Error: Missing data from Step 1 or 2. Redirecting to start.");
        window.location.href = 'index.html';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const apiKey = apiKeyInput.value.trim();
        const outputLang = outputLangSelect.value;
        const coreTopic = coreTopicInput.value.trim();

        if (!apiKey) {
            alert('Please enter your Google AI Studio API Key.');
            return;
        }

        if (!coreTopic) {
            alert('Please provide a topic for this chapter.');
            return;
        }

        // Initialize Gemini Client
        const ai = new GoogleGenAI({ apiKey: apiKey });

        // Construct System Prompt enforcing strict rules
        const systemInstruction = `
You are an expert AI Novel Writer. You must strictly follow these constraints:
1. FORMAT: You are writing a ${savedData.format} (${savedData.format === 'story' ? '5-6 chapters total' : '50-60 chapters total'}). This generation is for ONE chapter only.
2. AUTHOR STYLE: You must write strictly in the literary voice, tone, and style of: ${savedData.author}.
3. WORLD CONTEXT: 
   - Era and Place: ${savedData.eraPlace}
   - World Rules/Genre: ${savedData.worldRules}
   - Ultimately, the story leads to: ${savedData.storyDirection}
4. CHARACTERS: Use these characters accurately:
${savedData.characters.map(c => `   - ${c.name} (Age: ${c.age}, Gender: ${c.gender}, Nature: ${c.nature})`).join('\n')}
5. OUTPUT LANGUAGE: You MUST write the chapter entirely in ${outputLang}.

Do not break character. Do not provide meta-commentary. Output the chapter text directly using Markdown for formatting (headers, italics for thoughts, etc).
        `.trim();

        const userPrompt = `
Here is what happens in this specific chapter. Write this occurrence in the established author style and world constraints:
"${coreTopic}"
        `.trim();

        // UI Loading State
        generateBtn.disabled = true;
        btnText.textContent = 'GENERATING...';
        outputLabel.style.display = 'block';
        outputBox.style.display = 'none';
        exportMenu.style.display = 'none';
        loadingIndicator.style.display = 'block';
        outputBox.innerHTML = '';

        try {
            // Call Gemini
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: userPrompt,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.7,
                }
            });

            const markdownOutput = response.text;

            // Render Markdown
            outputBox.innerHTML = marked.parse(markdownOutput);

            // Save to local storage for "Download as Book" later
            savedData.generatedChapters = savedData.generatedChapters || [];
            savedData.generatedChapters.push({
                topic: coreTopic,
                content: markdownOutput
            });
            localStorage.setItem('novelData', JSON.stringify(savedData));

            // UI Success State
            loadingIndicator.style.display = 'none';
            outputBox.style.display = 'block';
            exportMenu.style.display = 'flex';

        } catch (error) {
            console.error(error);
            loadingIndicator.style.display = 'none';
            outputBox.style.display = 'block';
            outputBox.innerHTML = `<span style="color: #ff3333;">ERROR: Failed to generate content. Please check your API key and try again.<br><br>Details: ${error.message}</span>`;
        } finally {
            generateBtn.disabled = false;
            btnText.textContent = 'GENERATE CHAPTER';
        }
    });

    // Handle Exports
    document.getElementById('saveChapterBtn').addEventListener('click', () => {
        alert('Chapter saved locally to your device storage!');
    });

    document.getElementById('downloadBookBtn').addEventListener('click', () => {
        const data = JSON.parse(localStorage.getItem('novelData')) || {};
        if (!data.generatedChapters || data.generatedChapters.length === 0) {
            alert('No chapters generated yet!');
            return;
        }

        let bookContent = `# My AI Generated ${data.format === 'story' ? 'Story' : 'Novel'} (Style: ${data.author})\n\n`;

        data.generatedChapters.forEach((chap, idx) => {
            bookContent += `## Chapter ${idx + 1}\n\n`;
            bookContent += `${chap.content}\n\n`;
            bookContent += `---\n\n`;
        });

        // Create blob and force download
        const blob = new Blob([bookContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Generated_AI_Book.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});
