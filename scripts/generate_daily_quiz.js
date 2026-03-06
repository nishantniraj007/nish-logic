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
    0: { diff: "Medium", context: "Standard difficulty, high-school level concepts.", model: "gemini-2.5-flash" },
    1: { diff: "Medium", context: "Standard difficulty, high-school level concepts.", model: "gemini-2.5-flash" },
    2: { diff: "Medium", context: "Standard difficulty, high-school level concepts.", model: "gemini-2.5-flash" },
    3: { diff: "Easy", context: "General knowledge and basic logical concepts suitable for beginners.", model: "gemini-2.5-flash-lite" },
    4: { diff: "Easy", context: "General knowledge and basic logical concepts suitable for beginners.", model: "gemini-2.5-flash-lite" },
    5: { diff: "SSC/Bank", context: "Competitive exam style. Fast calculation tricks needed, standard banking awareness.", model: "gemini-2.5-flash" },
    6: { diff: "SSC/Bank", context: "Competitive exam style. Fast calculation tricks needed, standard banking awareness.", model: "gemini-2.5-flash" },
    7: { diff: "SSC/Bank", context: "Competitive exam style. Fast calculation tricks needed, standard banking awareness.", model: "gemini-2.5-flash" },
    8: { diff: "UPSC/CAT", context: "Highly analytical, multi-step logical reasoning, deep conceptual understanding, and complex math.", model: "gemini-2.5-pro" },
    9: { diff: "UPSC/CAT", context: "Highly analytical, multi-step logical reasoning, deep conceptual understanding, and complex math.", model: "gemini-2.5-pro" }
};

// Prompt Generator
function buildPrompt(config, chunkIndex) {
    let focus = "";
    if (chunkIndex === 1) {
        focus = "- 4 Quantitative Aptitude / Mathematics questions\n- 2 Logical Reasoning questions";
    } else if (chunkIndex === 2) {
        focus = "- 2 Logical Reasoning questions\n- 4 Static General Knowledge (History/Geography/Science) questions";
    } else if (chunkIndex === 3) {
        focus = "- 6 Current Affairs questions (relevant to the last 6 months)";
    }

    return `You are an expert exam question setter for ${config.diff} level examinations.
${config.context}

Your task is to generate exactly 6 Multiple Choice Questions (MCQs) following this distribution:
${focus}

You MUST respond with ONLY a valid, raw JSON array of 6 objects. Do not wrap it in markdown code blocks like \`\`\`json. Just the raw array.

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

        // Fallback Cascade: pro -> flash -> flash-lite
        let nextModel = null;
        if (primaryModelId === "gemini-2.5-pro") {
            nextModel = "gemini-2.5-flash";
        } else if (primaryModelId === "gemini-2.5-flash") {
            nextModel = "gemini-2.5-flash-lite";
        }

        if (nextModel) {
            console.log(`Falling back to ${nextModel}...`);
            try {
                return await makeRequest(nextModel);
            } catch (fallbackErr) {
                console.error(`Error with ${nextModel}:`, fallbackErr.message);
                if (nextModel === "gemini-2.5-flash") {
                    console.log(`Falling back to gemini-2.5-flash-lite...`);
                    return await makeRequest("gemini-2.5-flash-lite");
                } else {
                    throw new Error(`All fallback models failed. Last error: ${fallbackErr.message}`);
                }
            }
        } else {
            throw new Error(`Primary model ${primaryModelId} failed and no fallbacks available: ${error.message}`);
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

    try {
        let allQuestions = [];

        for (let chunkIndex = 1; chunkIndex <= 3; chunkIndex++) {
            const prompt = buildPrompt(config, chunkIndex);
            console.log(`[${new Date().toISOString()}] Sending request ${chunkIndex}/3 to Gemini...`);

            let success = false;
            let attempt = 0;

            while (!success && attempt < 3) {
                attempt++;
                try {
                    const startTime = Date.now();
                    let rawJsonText = await generateWithFallback(prompt, config.model);
                    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                    console.log(`[${new Date().toISOString()}] Received response ${chunkIndex}/3 in ${duration}s.`);

                    // Clean markdown backticks if the model ignores our instruction
                    if (rawJsonText.startsWith("```json")) {
                        rawJsonText = rawJsonText.replace(/^```json\n/, "").replace(/\n```$/, "");
                    } else if (rawJsonText.startsWith("```")) {
                        rawJsonText = rawJsonText.replace(/^```\n/, "").replace(/\n```$/, "");
                    }

                    const parsedData = JSON.parse(rawJsonText);

                    if (!Array.isArray(parsedData) || parsedData.length !== 6) {
                        console.warn(`WARNING: The model returned ${parsedData.length || 'invalid number of'} items instead of 6 for chunk ${chunkIndex}.`);
                    }

                    allQuestions = allQuestions.concat(parsedData);
                    success = true;
                } catch (err) {
                    console.error(`[${new Date().toISOString()}] Chunk ${chunkIndex} attempt ${attempt} failed:`, err.message);
                    if (attempt >= 3) {
                        throw new Error(`Failed to generate chunk ${chunkIndex} after 3 attempts.`);
                    }
                    // Wait 2 seconds before retry
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }

        if (allQuestions.length !== 18) {
            console.warn(`WARNING: Total questions generated is ${allQuestions.length}, expected 18.`);
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
            questions: allQuestions
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

        console.log(`Success! Saved ${allQuestions.length} questions to ${filepath}, ${legacyFilepath}, and archive.`);

    } catch (err) {
        console.error("Failed to generate and save batch:", err);
        process.exit(1);
    }
}

main();
