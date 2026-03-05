const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Ensure API key is available
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("FATAL: GEMINI_API_KEY environment variable is missing.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// Batch Configuration mapping
const batchConfig = {
    0: { diff: "Easy", context: "General knowledge and basic logical concepts suitable for beginners.", model: "gemini-2.5-flash-lite" },
    1: { diff: "Easy", context: "General knowledge and basic logical concepts suitable for beginners.", model: "gemini-2.5-flash-lite" },
    2: { diff: "Medium", context: "Standard difficulty, high-school level concepts.", model: "gemini-2.5-flash" },
    3: { diff: "Medium", context: "Standard difficulty, high-school level concepts.", model: "gemini-2.5-flash" },
    4: { diff: "Medium", context: "Standard difficulty, high-school level concepts.", model: "gemini-2.5-flash" },
    5: { diff: "SSC/Bank", context: "Competitive exam style. Fast calculation tricks needed, standard banking awareness.", model: "gemini-2.5-flash" },
    6: { diff: "SSC/Bank", context: "Competitive exam style. Fast calculation tricks needed, standard banking awareness.", model: "gemini-2.5-flash" },
    7: { diff: "SSC/Bank", context: "Competitive exam style. Fast calculation tricks needed, standard banking awareness.", model: "gemini-2.5-flash" },
    8: { diff: "UPSC/CAT", context: "Highly analytical, multi-step logical reasoning, deep conceptual understanding, and complex math.", model: "gemini-2.5-pro" },
    9: { diff: "UPSC/CAT", context: "Highly analytical, multi-step logical reasoning, deep conceptual understanding, and complex math.", model: "gemini-2.5-pro" }
};

// Prompt Generator
function buildPrompt(config) {
    return `You are an expert exam question setter for ${config.diff} level examinations.
${config.context}

Your task is to generate exactly 18 Multiple Choice Questions (MCQs) following this distribution:
- 4 Quantitative Aptitude / Mathematics questions
- 4 Logical Reasoning questions
- 4 Static General Knowledge (History/Geography/Science) questions
- 6 Current Affairs questions (relevant to the last 6 months)

You MUST respond with ONLY a valid, raw JSON array of 18 objects. Do not wrap it in markdown code blocks like \`\`\`json. Just the raw array.

Each object in the array must strictly match this schema:
{
  "category": "Quantitative Aptitude" | "Logical Reasoning" | "Static GK" | "Current Affairs",
  "question": "The actual question text...",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "The exact string from the options array that is correct limit to 1 string",
  "explanation": "A concise explanation of why the answer is correct.",
  "trick": "An extremely short shortcut or trick to solve this type of question faster (optional, leave empty string if none)"
}

Provide NO introductory text and NO conversational text. Output ONLY the JSON array.`;
}

async function generateWithFallback(prompt, primaryModelId) {
    const makeRequest = async (modelId) => {
        console.log(`[${new Date().toISOString()}] Attempting request with: ${modelId}...`);
        const model = genAI.getGenerativeModel({
            model: modelId,
            generationConfig: { temperature: 0.7 }
        });

        // Use a 60s timeout to prevent GitHub Actions from hanging at 3 mins
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const result = await model.generateContent(prompt, { signal: controller.signal });
            clearTimeout(timeoutId);
            return result.response.text();
        } catch (err) {
            clearTimeout(timeoutId);
            throw err;
        }
    };

    try {
        return await makeRequest(primaryModelId);
    } catch (error) {
        console.error(`Error with ${primaryModelId}:`, error.message);

        // Fallback to Flash if we were using Pro or Flash-Lite
        if (primaryModelId !== "gemini-2.5-flash") {
            console.log(`Falling back to gemini-2.5-flash...`);
            try {
                return await makeRequest("gemini-2.5-flash");
            } catch (fallbackErr) {
                throw new Error(`Primary and Fallback models failed: ${fallbackErr.message}`);
            }
        } else {
            throw new Error(`Primary model gemini-2.5-flash failed: ${error.message}`);
        }
    }
}

async function main() {
    // Determine which batch index (0-9) to run
    // Passed in via GitHub Actions like: node generate_daily_quiz.js 3
    const batchIndexArg = process.argv[2];
    if (batchIndexArg === undefined || isNaN(parseInt(batchIndexArg))) {
        console.error("Please provide a batch index (0-9). Usage: node generate_daily_quiz.js <index>");
        process.exit(1);
    }

    const batchIndex = parseInt(batchIndexArg);
    if (batchIndex < 0 || batchIndex > 9) {
        console.error("Batch index must be between 0 and 9.");
        process.exit(1);
    }

    const config = batchConfig[batchIndex];
    console.log(`[${new Date().toISOString()}] --- Starting Batch ${batchIndex} (${config.diff} Level) ---`);

    const prompt = buildPrompt(config);

    try {
        console.log(`[${new Date().toISOString()}] Sending request to Gemini...`);
        const startTime = Date.now();
        let rawJsonText = await generateWithFallback(prompt, config.model);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[${new Date().toISOString()}] Received response from Gemini in ${duration}s.`);

        // Clean markdown backticks if the model ignores our instruction
        if (rawJsonText.startsWith("```json")) {
            rawJsonText = rawJsonText.replace(/^```json\n/, "").replace(/\n```$/, "");
        } else if (rawJsonText.startsWith("```")) {
            rawJsonText = rawJsonText.replace(/^```\n/, "").replace(/\n```$/, "");
        }

        // Validate JSON parsing
        const parsedData = JSON.parse(rawJsonText);

        if (!Array.isArray(parsedData) || parsedData.length !== 18) {
            console.warn(`WARNING: The model returned ${parsedData.length || 'invalid number of'} items instead of 18.`);
        }

        // Save file
        const targetDir = path.join(__dirname, '../games/3-over-match/data');
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Rolling Pool Strategy: 5 days * 10 batches = 50 slots
        // slot_0 to slot_49
        const dayIndex = new Date().getUTCDate() % 5;
        const slotIndex = (dayIndex * 10) + batchIndex;

        const filename = `slot_${slotIndex}.json`;
        const filepath = path.join(targetDir, filename);

        // Calculate a timestamp for when this file was generated 
        const outputObject = {
            metadata: {
                batch_index: batchIndex,
                day_index: dayIndex,
                slot_index: slotIndex,
                difficulty: config.diff,
                generated_at: new Date().toISOString()
            },
            questions: parsedData
        };

        fs.writeFileSync(filepath, JSON.stringify(outputObject, null, 2));

        // Legacy/Direct link support (the webapp will prioritize pool eventually)
        // Overwrite the standard batch_X.json so the "latest" is always active too
        const legacyFilepath = path.join(targetDir, `batch_${batchIndex}.json`);
        // Archive Strategy (Backup for Drive)
        const dateStr = new Date().toISOString().split('T')[0];
        const archiveDir = path.join(targetDir, 'archive');
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }
        const archiveFilename = `${dateStr}_batch_${batchIndex}.json`;
        fs.writeFileSync(path.join(archiveDir, archiveFilename), JSON.stringify(outputObject, null, 2));

        console.log(`Success! Saved ${parsedData.length} questions to ${filepath}, ${legacyFilepath}, and archive.`);

    } catch (err) {
        console.error("Failed to generate and save batch:", err);
        process.exit(1);
    }
}

main();
