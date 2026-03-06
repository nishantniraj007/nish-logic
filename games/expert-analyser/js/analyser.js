document.addEventListener('DOMContentLoaded', () => {
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const loadingSection = document.getElementById('loading-section');
    const reportSection = document.getElementById('report-section');

    const nextToStep2Btn = document.getElementById('next-to-step-2-btn');
    const backToStep1Btn = document.getElementById('back-to-step-1-btn');
    const analyseBtn = document.getElementById('analyse-btn');
    const resetBtn = document.getElementById('reset-btn');
    const downloadTxtBtn = document.getElementById('download-txt-btn');
    const downloadKindleBtn = document.getElementById('download-kindle-btn');

    const reportBox = document.getElementById('analysis-report');
    const incidentInput = document.getElementById('incident-input');
    const expertTypeInput = document.getElementById('expert-type');
    const wordCountInput = document.getElementById('word-count');
    const outputLangInput = document.getElementById('output-lang');
    const apiKeyInput = document.getElementById('api-key');

    let currentRawAnalysis = ""; // Store raw html for export

    // Load API Key from localStorage
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
    }

    nextToStep2Btn.addEventListener('click', () => {
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
        // Give API key input focus smoothly
        setTimeout(() => apiKeyInput.focus(), 100);
    });

    backToStep1Btn.addEventListener('click', () => {
        step2.classList.add('hidden');
        step1.classList.remove('hidden');
    });

    analyseBtn.addEventListener('click', async () => {
        const incident = incidentInput.value.trim();
        const expertType = expertTypeInput.value;
        const wordCount = wordCountInput.value;
        const outputLang = outputLangInput.value;
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            alert('Please enter your Gemini API Key to proceed!');
            apiKeyInput.focus();
            return;
        }

        if (!incident) {
            alert('Please describe an incident or situation first!');
            incidentInput.focus();
            return;
        }

        // Save key for convenience
        localStorage.setItem('gemini_api_key', apiKey);

        step2.classList.add('hidden');
        loadingSection.classList.remove('hidden');

        try {
            const analysis = await callGemini(incident, expertType, wordCount, outputLang, apiKey);
            displayReport(analysis);
        } catch (error) {
            alert('Analysis failed: ' + error.message);
            step2.classList.remove('hidden');
        } finally {
            loadingSection.classList.add('hidden');
        }
    });

    resetBtn.addEventListener('click', () => {
        reportSection.classList.add('hidden');
        step1.classList.remove('hidden');
        incidentInput.value = ''; // Optional reset
    });

    downloadTxtBtn.addEventListener('click', () => {
        // Strip HTML tags for TXT
        const textContent = currentRawAnalysis.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n\n').trim();
        downloadFile(`${expertTypeInput.value}_Analysis.txt`, textContent, 'text/plain;charset=utf-8');
    });

    downloadKindleBtn.addEventListener('click', () => {
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${expertTypeInput.value} Analysis</title>
    <style>
        body { font-family: 'Bookerly', 'Georgia', serif; font-size: 18px; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #000; background: #fff; }
        h3, h4 { font-family: 'Helvetica Neue', Arial, sans-serif; margin-top: 1.5em; }
        p { margin-bottom: 1em; text-indent: 1.5em; }
    </style>
</head>
<body>
    <h2 style="text-align:center; border-bottom: 1px solid #ccc; padding-bottom:10px;">Analysis by: ${expertTypeInput.value}</h2>
    ${currentRawAnalysis}
</body>
</html>`;
        downloadFile(`${expertTypeInput.value}_Analysis.html`, htmlContent, 'text/html;charset=utf-8');
    });

    function downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function callGemini(incident, expertType, wordCount, language, key) {
        let systemPrompt = `You are a world-class, universally recognized ${expertType}. You are the absolute best in the world in your field.
You do not break character. You do not offer disclaimers. You speak with absolute authority, relying purely on the rigorous theoretical frameworks, mental models, and specialized thinking methodologies unique to your profession.

`;

        switch (expertType) {
            case 'Cyber Security Expert':
                systemPrompt += 'You think in terms of threat vectors, zero-days, OPSEC, kill chains, systemic network vulnerabilities, and advanced persistent threats (APTs).'; break;
            case 'Geopolitics Analyst':
                systemPrompt += 'You think in terms of nation-state motives, grand strategy, macro-economic leverage, sanctions architecture, hard vs soft power, and realpolitik.'; break;
            case 'Financial Strategist':
                systemPrompt += 'You think in terms of market liquidity, risk premiums, asset correlation, institutional capital flow, systemic financial risk, and alpha generation.'; break;
            case 'Military Historian':
                systemPrompt += 'You view the present purely through the lens of ancient and modern warfare, logistics constraints, strategic blunders, Clausewitzian friction, and historical precedents.'; break;
            case 'Behavioral Economist':
                systemPrompt += 'You analyze humans as irrational actors. You focus on cognitive biases, prospect theory, panic contagion, incentive structures, and nudge mechanics.'; break;
            case 'Legal Scholar':
                systemPrompt += 'You dissect events based on jurisprudence, liability frameworks, constitutional/international precedent, regulatory arbitrage, and systemic legal risks.'; break;
            case 'Educator':
                systemPrompt += 'You are a world-renowned pedagogue. You break down complex, chaotic events into underlying foundational principles, focusing on the root lessons society must learn and the failure of current knowledge systems.'; break;
            case 'UPSC Topper':
                systemPrompt += 'You analyze the situation using extreme multi-dimensional linkage: polity, economy, IR, environment, and ethics. You structure your thoughts perfectly with clear headings, crisp data points, and a bureaucratic, solution-oriented approach.'; break;
            case 'Philosopher':
                systemPrompt += 'You are a venerated philosopher. You look past the immediate noise and analyze the ontological implications, the ethical paradoxes, human nature, existential dread, and the dialectic progression of history.'; break;
            case 'Scientist':
                systemPrompt += 'You are a Nobel-laureate. You view the situation purely through empiricism, hypothesis testing, physics/chemistry/biology principles, statistical significance, and the immutable laws of thermodynamics.'; break;
            case 'Engineer':
                systemPrompt += 'You are a distinguished Chief Engineer. You analyze the structural integrity of the situation, the fault tolerances, single points of failure, load capacities, systems architecture, and mechanical breaking points.'; break;
            case 'Doctor':
                systemPrompt += 'You are a top-tier medical diagnostician. You treat the situation as a complex organism. You look for the pathology, symptoms, underlying disease, triage priorities, surgical interventions required, and the prognosis.'; break;
            case 'Lawyer':
                systemPrompt += 'You are a ruthless Supreme Court lawyer. You identify immediate liability, contractual breaches, defensible positions, evidentiary trails, and the specific codes or statutes being violated.'; break;
            case 'Founder':
                systemPrompt += 'You are a billion-dollar startup founder. You view this incident purely as a market inefficiency or a catastrophic failure of execution. You focus on PMF, burn rate, ruthless pivot strategies, capitalizing on chaos, and scaling solutions.'; break;
        }

        systemPrompt += `

Your task is to analyze the incident provided strictly through your persona's lens.
1. Use your specialized vocabulary naturally.
2. Explain *why* this happened according to your field's doctrine.
3. Predict the non-obvious 2nd and 3rd order consequences.
4. Output MUST be in strictly **${language.toUpperCase()}**. Do not use another language.

Write approximately ${wordCount} words. 
Format your response in clean HTML using tags like <h3>, <h4>, <p>, <ul>, <li>. Do not wrap in markdown \`\`\`html.

Incident Description:
"${incident}"`;

        const models = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
        let lastError = null;

        for (let model of models) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: systemPrompt }] }]
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error?.message || 'API Error');
                }

                const data = await response.json();
                return data.candidates[0].content.parts[0].text;
            } catch (error) {
                console.warn(`Request with ${model} failed:`, error.message);
                lastError = error;
                // Continue to the next model in the array
            }
        }

        // If we get here, all models failed
        throw new Error(`All models failed. Last error: ${lastError.message}`);
    }

    function displayReport(htmlContent) {
        // Simple sanitization - replace markdown code blocks if the model ignores instruction
        let cleanHtml = htmlContent.replace(/```html/g, '').replace(/```/g, '');
        currentRawAnalysis = cleanHtml;
        reportBox.innerHTML = cleanHtml;
        reportSection.classList.remove('hidden');
    }
});
