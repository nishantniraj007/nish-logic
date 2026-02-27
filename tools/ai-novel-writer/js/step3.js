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

    // 24 Hour Expiration Logic
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (savedData.lastGenerated && (Date.now() - savedData.lastGenerated > TWENTY_FOUR_HOURS)) {
        savedData.generatedChapters = [];
        savedData.lastGenerated = null;
        localStorage.setItem('novelData', JSON.stringify(savedData));
        console.log("Session expired. Cleared previous chapters.");
    }

    // Check if user skipped steps
    if (!savedData.format || !savedData.characters) {
        alert("System Error: Missing data from Step 1 or 2. Redirecting to start.");
        window.location.href = 'index.html';
        return;
    }

    generateBtn.addEventListener('click', async (e) => {
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

        // Construct System Prompt enforcing strict rules
        const systemInstructionText = `
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
            // Call Gemini using Native Fetch (No External SDK)
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            const payload = {
                system_instruction: {
                    parts: [{ text: systemInstructionText }]
                },
                contents: [{
                    parts: [{ text: userPrompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                }
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.error?.message || response.statusText;
                throw new Error(`API Error (${response.status}): ${errorMessage}`);
            }

            // Extract the generated text
            const markdownOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!markdownOutput) {
                throw new Error("No content was generated. The API response format might be unexpected.");
            }

            // Render Markdown
            outputBox.innerHTML = marked.parse(markdownOutput);

            // Save to local storage for "Download as Book" later
            savedData.generatedChapters = savedData.generatedChapters || [];
            savedData.generatedChapters.push({
                topic: coreTopic,
                content: markdownOutput
            });
            savedData.lastGenerated = Date.now();
            localStorage.setItem('novelData', JSON.stringify(savedData));

            // UI Success State
            loadingIndicator.style.display = 'none';
            outputBox.style.display = 'block';
            exportMenu.style.display = 'flex';

        } catch (error) {
            console.error(error);
            loadingIndicator.style.display = 'none';
            outputBox.style.display = 'block';
            outputBox.innerHTML = `< span style = "color: #ff3333;" > ERROR: Failed to generate content.Please check your API key and try again.< br > <br>Details: ${error.message}</span>`;
        } finally {
            generateBtn.disabled = false;
            btnText.textContent = 'GENERATE CHAPTER';
        }
    });

    // Handle Exports
    document.getElementById('saveChapterBtn').addEventListener('click', () => {
        alert('Chapter saved locally to your device storage!');
    });

    // Helper to generate Kindle-styled HTML string or raw DOM element string for PDF
    function generateKindleHTML(data, forPdf = false) {
        let title = `My AI Generated ${data.format === 'story' ? 'Story' : 'Novel'}`;

        let styles = `
        <style>
            .kindle-page {
                background-color: #f4ecd8;
                color: #333333;
                font-family: 'Georgia', serif;
                line-height: 1.6;
                padding: 40px;
                max-width: 800px;
                margin: auto;
                text-align: justify;
            }
            .kindle-page h1, .kindle-page h2, .kindle-page h3 {
                font-family: 'Merriweather', 'Georgia', serif;
                text-align: center;
                color: #111;
            }
            .kindle-page h1 { margin-bottom: 50px; border-bottom: 2px solid #ccc; padding-bottom: 20px;}
            .kindle-page h2 { margin-top: 60px; margin-bottom: 20px;}
            .kindle-page .chapter-break {
                text-align: center;
                margin: 40px 0;
                font-size: 24px;
                color: #888;
            }
            .kindle-page .content { font-size: 18px; }
        </style>
        `;

        let contentObj = `
        <div class="kindle-page">
            <h1>${title}</h1>
            <div class="content">
        `;

        data.generatedChapters.forEach((chap, idx) => {
            contentObj += `<h2>Chapter ${idx + 1}</h2>\n`;
            contentObj += `${marked.parse(chap.content)}\n`;
            if (idx < data.generatedChapters.length - 1) {
                contentObj += `<div class="chapter-break">***</div>\n`;
            }
        });

        contentObj += `</div></div>`;

        if (forPdf) {
            // For PDF we just return the raw inner HTML (styles + the container)
            return styles + contentObj;
        }

        // For direct HTML export we return a complete webpage string
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    ${styles}
    <style>
        body { margin: 0; padding: 0; background-color: #f4ecd8; }
    </style>
</head>
<body>
    ${contentObj}
</body>
</html>`;
    }

    document.getElementById('downloadBookBtn').addEventListener('click', () => {
        const data = JSON.parse(localStorage.getItem('novelData')) || {};
        if (!data.generatedChapters || data.generatedChapters.length === 0) {
            alert('No chapters generated yet!');
            return;
        }

        const htmlString = generateKindleHTML(data, false);

        // Force download as .html
        const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Generated_AI_Book.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // New DOWNLOAD AS TEXT Action (With UTF-8 BOM)
    document.getElementById('downloadTxtBtn').addEventListener('click', () => {
        const data = JSON.parse(localStorage.getItem('novelData')) || {};
        if (!data.generatedChapters || data.generatedChapters.length === 0) {
            alert('No chapters generated yet!');
            return;
        }

        let bookContent = `My AI Generated ${data.format === 'story' ? 'Story' : 'Novel'} (Style: ${data.author || 'Assistant'})\n\n`;

        data.generatedChapters.forEach((chap, idx) => {
            bookContent += `Chapter ${idx + 1}\n\n`;
            bookContent += `${chap.content}\n\n`;
            bookContent += `----------------------------------------\n\n`;
        });

        // Add UTF-8 BOM (\uFEFF) to force Notepad/Mobile apps to natively read as UTF-8
        const blob = new Blob(['\uFEFF', bookContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Generated_AI_Book.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});
