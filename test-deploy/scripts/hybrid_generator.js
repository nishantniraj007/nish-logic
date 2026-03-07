const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const { getMathQuestions, getLogicQuestions } = require('./math_logic_engine');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("FATAL: GEMINI_API_KEY environment variable is missing.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const difficultyParams = {
    "easy": { countTotal: 18, math: 6, logic: 6, ai: 6 },
    "medium": { countTotal: 18, math: 6, logic: 6, ai: 6 },
    "ssc": { countTotal: 18, math: 6, logic: 6, ai: 6 },
    "upsc": { countTotal: 18, math: 6, logic: 6, ai: 6 },
};

async function getAICurrentAffairs(difficulty, count) {
    const prompt = `You are an expert exam question setter building ${count} Current Affairs and Static General Knowledge questions for a ${difficulty.toUpperCase()} level exam.

Return ONLY a valid JSON array containing exactly ${count} objects. No markdown, no markdown ticks, no conversational text. 
Structure each object exactly like this:
{
  "category": "Current Affairs & GK",
  "question": "Question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "Option B",
  "explanation": "Brief explanation of why the answer is correct.",
  "trick": "Any memory trick or context (optional but keep it short)"
}`;

    // Using flash since the payload is tiny and we only make 1 call.
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    console.log(`Calling Gemini for ${count} Current Affairs questions...`);
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let txt = response.text().trim();

        if (txt.startsWith('```json')) txt = txt.replace(/```json/g, '');
        if (txt.startsWith('```')) txt = txt.replace(/```/g, '');
        if (txt.endsWith('```')) txt = txt.slice(0, -3);

        let parsed = JSON.parse(txt.trim());
        if (!Array.isArray(parsed)) parsed = parsed.questions || [];
        return parsed.slice(0, count);
    } catch (e) {
        console.error("AI Generation failed:", e);
        return [];
    }
}

async function generateHybridQuiz(difficulty = "medium") {
    console.log(`\n--- Starting Hybrid Generation for: ${difficulty.toUpperCase()} ---`);
    const params = difficultyParams[difficulty];

    console.log(`1. Generating ${params.math} Math questions locally...`);
    const mathQs = getMathQuestions(params.math, difficulty);

    console.log(`2. Generating ${params.logic} Logic questions locally...`);
    const logicQs = getLogicQuestions(params.logic, difficulty);

    console.log(`3. Generating ${params.ai} Current Affairs questions natively via API...`);
    const aiQs = await getAICurrentAffairs(difficulty, params.ai);

    if (aiQs.length === 0) {
        console.warn("WARNING: AI failed to return questions. Proceeding with templates only.");
    }

    let allQs = [...mathQs, ...logicQs, ...aiQs];
    allQs = shuffleArray(allQs); // Shuffle so math and logic aren't just clumped at the start

    const output = {
        metadata: {
            timestamp: new Date().toISOString(),
            difficulty: difficulty,
            framework: "hybrid-tbg-ai",
            total_questions: allQs.length
        },
        questions: allQs
    };

    const outDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    const outFile = path.join(outDir, `hybrid_${difficulty}.json`);
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

    console.log(`Successfully generated ${allQs.length} questions and saved to ${outFile}`);
}

async function main() {
    const diff = process.argv[2] || "medium";
    await generateHybridQuiz(diff);
}

main();
