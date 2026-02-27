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

    // Helper to generate Kindle-styled HTML string
    function generateKindleHTML(data) {
        let title = `My AI Generated ${data.format === 'story' ? 'Story' : 'Novel'}`;

        // Build styling
        let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f4ecd8; /* Warm sepia Kindle background */
        }
        .kindle-page {
            background-color: #f4ecd8; /* Force background for html2pdf */
            color: #333333;
            font-family: 'Georgia', serif; /* Classic reading font */
            line-height: 1.6;
            padding: 40px;
            max-width: 800px;
            margin: auto;
            text-align: justify;
        }
        h1, h2, h3 {
            font-family: 'Merriweather', 'Georgia', serif;
            text-align: center;
            color: #111;
        }
        h1 { margin-bottom: 50px; border-bottom: 2px solid #ccc; padding-bottom: 20px;}
        h2 { margin-top: 60px; margin-bottom: 20px;}
        .chapter-break {
            text-align: center;
            margin: 40px 0;
            font-size: 24px;
            color: #888;
        }
        .content { font-size: 18px; }
    </style>
</head>
<body>
    <div class="kindle-page">
        <h1>${title}</h1>
        <div class="content">
`;

        data.generatedChapters.forEach((chap, idx) => {
            htmlContent += `<h2>Chapter ${idx + 1}</h2>\n`;
            // The content is already markdown, so we parse it to HTML for the eBook
            htmlContent += `${marked.parse(chap.content)}\n`;
            if (idx < data.generatedChapters.length - 1) {
                htmlContent += `<div class="chapter-break">***</div>\n`;
            }
        });

        htmlContent += `        </div>
    </div>
</body></html>`;
        return htmlContent;
    }

    document.getElementById('downloadBookBtn').addEventListener('click', () => {
        const data = JSON.parse(localStorage.getItem('novelData')) || {};
        if (!data.generatedChapters || data.generatedChapters.length === 0) {
            alert('No chapters generated yet!');
            return;
        }

        const htmlString = generateKindleHTML(data);

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

    // New DOWNLOAD AS PDF Action
    document.getElementById('downloadPdfBtn').addEventListener('click', () => {
        const data = JSON.parse(localStorage.getItem('novelData')) || {};
        if (!data.generatedChapters || data.generatedChapters.length === 0) {
            alert('No chapters generated yet!');
            return;
        }

        const htmlString = generateKindleHTML(data);

        // We need to parse the HTML string into a DOM element for html2pdf to read
        const opt = {
            margin: 15,
            filename: 'Generated_AI_Book.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = htmlString;

        // Temporarily visually hide but attach to DOM (required for html2canvas)
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        document.body.appendChild(tempContainer);

        const dlBtn = document.getElementById('downloadPdfBtn');
        const originalText = dlBtn.querySelector('.btn-text').textContent;
        dlBtn.disabled = true;
        dlBtn.querySelector('.btn-text').textContent = "PRINTING PDF...";

        // Generate and Save PDF
        html2pdf().set(opt).from(tempContainer).save().then(() => {
            // Cleanup
            document.body.removeChild(tempContainer);
            dlBtn.disabled = false;
            dlBtn.querySelector('.btn-text').textContent = originalText;
        }).catch((err) => {
            console.error("PDF generation failed:", err);
            alert("Sorry, PDF generation failed. Try downloading as HTML Book instead.");
            document.body.removeChild(tempContainer);
            dlBtn.disabled = false;
            dlBtn.querySelector('.btn-text').textContent = originalText;
        });
    });
});
