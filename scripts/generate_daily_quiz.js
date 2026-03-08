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
    8: { diff: "UPSC/CAT", context: "Highly analytical, multi-step logical reasoning, deep conceptual understanding, and complex math.", model: "gemini-2.5-flash" },
    9: { diff: "UPSC/CAT", context: "Highly analytical, multi-step logical reasoning, deep conceptual understanding, and complex math.", model: "gemini-2.5-pro" }
};

// Prompt Generator
function buildPrompt(config, chunkIndex, totalChunks) {
    let focus = "";
    let questionCount = 0;

    if (totalChunks === 2) {
        // AI specifically constructs 8 questions
        questionCount = 4;
        if (chunkIndex === 1) {
            focus = "- 4 Quantitative Aptitude / Mathematics questions";
        } else if (chunkIndex === 2) {
            focus = "- 4 Logical Reasoning questions";
        }
    } else if (totalChunks === 4) {
        // High difficulty tiers (split chunks to prevent rate limits)
        questionCount = 2;
        if (chunkIndex === 1 || chunkIndex === 2) {
            focus = "- 2 Quantitative Aptitude / Mathematics questions";
        } else if (chunkIndex === 3 || chunkIndex === 4) {
            focus = "- 2 Logical Reasoning questions";
        }
    }

    return `You are an expert exam question setter for ${config.diff} level examinations.
${config.context}

Your task is to generate exactly ${questionCount} HIGH-QUALITY MULTIPLE CHOICE QUESTIONS (MCQs).
FOCUS: ${focus}

You MUST respond with ONLY a valid, raw JSON array of ${questionCount} objects. Do not wrap it in markdown code blocks.

Each object MUST strictly match this schema:
{
  "category": "Quantitative Aptitude" | "Logical Reasoning",
  "question": "Clear, concise question statement",
  "options": ["A", "B", "C", "D"],
  "correct_answer": "exactly matching one of the options",
  "explanation": "Step-by-step logic or calculation",
  "trick": "Time-saving shortcut"
}

NO introductory text. No preamble.`;
}

async function generateWithFallback(prompt, primaryModelId) {
    const makeRequest = async (modelId) => {
        console.log(`[${new Date().toISOString()}] Attempting request with: ${modelId}...`);
        const model = genAI.getGenerativeModel({
            model: modelId,
            generationConfig: { temperature: 0.7 }
        });

        // Use a 180s timeout (3 mins) to prevent GitHub Actions from hanging infinitely
        // but give the prompt plenty of breathing room.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);

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
        // If we hit a 429, we should log specifically that we are entering fallback mode
        const isRateLimit = error.message && (error.message.includes("429") || error.message.toLowerCase().includes("quota"));
        console.error(`Error with ${primaryModelId}:`, error.message);

        if (isRateLimit) {
            // Fallback Cascade: pro -> flash -> flash-lite
            let nextModel = null;
            if (primaryModelId === "gemini-2.5-pro") {
                nextModel = "gemini-2.5-flash";
            } else if (primaryModelId === "gemini-2.5-flash") {
                nextModel = "gemini-2.5-flash-lite";
            }

            if (primaryModelId === "gemini-2.5-pro") {
                console.warn(`[QUARTERMASTER] Rate limit hit on PRO. Instantly falling back to ${nextModel} to bypass daily quota blocks.`);
            } else {
                console.warn(`[QUARTERMASTER] Rate limit (429) hit on ${primaryModelId}. Executing backoff of 65 seconds...`);
                await new Promise(r => setTimeout(r, 65000));
            }

            if (nextModel) {
                console.log(`Falling back to ${nextModel}...`);
                try {
                    return await makeRequest(nextModel);
                } catch (fallbackErr) {
                    console.error(`Error with ${nextModel}:`, fallbackErr.message);
                    if (nextModel === "gemini-2.5-flash") {
                        console.log(`Falling back to gemini-2.5-flash-lite after waiting another 65s...`);
                        await new Promise(r => setTimeout(r, 65000));
                        return await makeRequest("gemini-2.5-flash-lite");
                    } else {
                        throw new Error(`All fallback models failed. Last error: ${fallbackErr.message}`);
                    }
                }
            } else {
                throw new Error(`Primary model ${primaryModelId} failed and no fallbacks available: ${error.message}`);
            }
        } else {
            throw new Error(`Non-quota Error with ${primaryModelId}: ${error.message}`);
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

        // Dynamic Chunk Sizing based on difficulty/model to avoid 429 API Token Rates
        // Easy/Medium (gemini-2.5-flash series) can handle 2 chunks of 4 for math/logic
        // SSC/UPSC (gemini-2.5-pro series) gets exhausted and fails, so we switch to 4 chunks of 2.
        const totalChunks = (config.diff === "SSC/Bank" || config.diff === "UPSC/CAT") ? 4 : 2;

        for (let chunkIndex = 1; chunkIndex <= totalChunks; chunkIndex++) {
            const prompt = buildPrompt(config, chunkIndex, totalChunks);
            console.log(`[${new Date().toISOString()}] Sending request ${chunkIndex}/${totalChunks} to Gemini...`);

            let success = false;
            let attempt = 0;

            while (!success && attempt < 3) {
                attempt++;
                try {
                    const startTime = Date.now();
                    let rawJsonText = await generateWithFallback(prompt, config.model);
                    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                    console.log(`[${new Date().toISOString()}] Received response ${chunkIndex}/${totalChunks} in ${duration}s.`);

                    // Clean markdown backticks if the model ignores our instruction
                    if (rawJsonText.startsWith("```json")) {
                        rawJsonText = rawJsonText.replace(/^```json\n/, "").replace(/\n```$/, "");
                    } else if (rawJsonText.startsWith("```")) {
                        rawJsonText = rawJsonText.replace(/^```\n/, "").replace(/\n```$/, "");
                    }

                    let parsedData = JSON.parse(rawJsonText);
                    const expectedQuestionsPerChunk = 4; // 2 chunks * 4 = 8 total logic items

                    if (!Array.isArray(parsedData)) {
                        throw new Error("Model returned invalid JSON format (not an array).");
                    }

                    // Filter out empty skeletons and rigidly cap array sizes
                    parsedData = parsedData.filter(q => q.question && q.question.trim().length > 0);
                    if (parsedData.length > expectedQuestionsPerChunk) {
                        parsedData = parsedData.slice(0, expectedQuestionsPerChunk);
                    }
                    if (parsedData.length < expectedQuestionsPerChunk) {
                        console.warn(`WARNING: The model returned ${parsedData.length} valid items instead of ${expectedQuestionsPerChunk} for chunk ${chunkIndex}.`);
                    }

                    allQuestions = allQuestions.concat(parsedData);
                    success = true;

                    // Dynamic Delay Architecture to respect Google AI Studio Free Tier Quotas
                    // GitHub Actions runner is 100% Free and Unlimited, so we can afford long pauses to guarantee high-quality generation.
                    if (chunkIndex < totalChunks) {
                        let delayMs = 4000; // Default 4s for flash
                        if (config.model === "gemini-2.5-pro") {
                            // Pro allows 2 Requests Per Minute (RPM) and 50 Per Day (RPD).
                            // To safely space out 9 chunks over 7-8 minutes, we pause 45 seconds per chunk.
                            delayMs = 45000;
                        } else if (config.model === "gemini-2.5-flash") {
                            // Flash allows 15 Requests Per Minute (RPM)
                            // 3 chunks of 6 = perfectly fine with 10 second pauses
                            delayMs = 10000;
                        } else if (config.model === "gemini-2.5-flash-lite") {
                            // Flash Lite has high volume thresholds (30 RPM)
                            delayMs = 5000;
                        }

                        console.log(`[${new Date().toISOString()}] Waiting ${delayMs / 1000} seconds before next chunk to respect ${config.model} API rate limits...`);
                        await new Promise(r => setTimeout(r, delayMs));
                    }
                } catch (err) {
                    console.error(`[${new Date().toISOString()}] Chunk ${chunkIndex} attempt ${attempt} failed:`, err.message);
                    if (attempt >= 3) {
                        throw new Error(`Failed to generate chunk ${chunkIndex} after 3 attempts.`);
                    }
                    // Wait at least 15 seconds before retry to let Quota reset
                    console.warn(`[RETRY-ENGINE] Waiting 15s before attempt ${attempt + 1} for chunk ${chunkIndex}...`);
                    await new Promise(r => setTimeout(r, 15000));
                }
            }
        }

        // =====================================
        // Headless Remote DB Sync for SGK / CA
        // =====================================
        try {
            console.log(`[${new Date().toISOString()}] Syncing GK & CA from Central Headless Database...`);
            let levelRange = [7, 10];
            if (config.diff === 'Medium') levelRange = [11, 13];
            else if (config.diff === 'SSC/Bank') levelRange = [13, 15];
            else if (config.diff === 'UPSC/CAT') levelRange = [15, 17];

            const randomLevel = Math.floor(Math.random() * (levelRange[1] - levelRange[0] + 1)) + levelRange[0];
            const subjects = ['history', 'geography', 'polity'];
            const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];

            // Static GK Sync
            const gkUrl = `https://raw.githubusercontent.com/nishantniraj007/nish-logic-gk-database/master/${randomSubject}/level_${randomLevel}.json`;
            const gkRes = await globalThis.fetch(gkUrl);
            let downloadedGk = [];
            if (gkRes.ok) {
                const rawGk = await gkRes.json();
                downloadedGk = rawGk.sort(() => 0.5 - Math.random()).slice(0, 4).map(q => ({
                    ...q, category: `Static GK (${randomSubject.charAt(0).toUpperCase() + randomSubject.slice(1)})`
                }));
            } else { throw new Error(`Status ${gkRes.status} on GK`); }

            // Current Affairs Sync
            const caUrl = `https://raw.githubusercontent.com/nishantniraj007/nish-logic-gk-database/master/current_affairs/latest.json`;
            const caRes = await globalThis.fetch(caUrl);
            let downloadedCa = [];
            if (caRes.ok) {
                const rawCa = await caRes.json();
                downloadedCa = rawCa.sort(() => 0.5 - Math.random()).slice(0, 6);
            } else { throw new Error(`Status ${caRes.status} on CA`); }

            allQuestions = allQuestions.concat(downloadedGk, downloadedCa);
            console.log(`[${new Date().toISOString()}] Successfully synced ${downloadedGk.length} GK and ${downloadedCa.length} CA questions.`);
        } catch (dbErr) {
            console.warn(`WARNING: Headless DB sync failed (${dbErr.message}). Inserting Fallback placeholders.`);

            const backupGk = Array(4).fill(null).map((_, i) => ({
                category: "Static GK", question: `[Fallback GK] Default Question ${i + 1}?`, correct_answer: "Option 1", options: ["Option 1", "Option 2", "Option 3", "Option 4"], explanation: "DB Offline", trick: ""
            }));
            const backupCa = Array(6).fill(null).map((_, i) => ({
                category: "Current Affairs", question: `[Fallback CA] Default News ${i + 1}?`, correct_answer: "Option 1", options: ["Option 1", "Option 2", "Option 3", "Option 4"], explanation: "DB Offline", trick: ""
            }));
            allQuestions = allQuestions.concat(backupGk, backupCa);
        }

        // Final shuffle so QA/LR/GK/CA are mixed nicely
        allQuestions = allQuestions.sort(() => 0.5 - Math.random());

        if (allQuestions.length > 18) {
            console.warn(`WARNING: Total questions generated is ${allQuestions.length}. Truncating to 18.`);
            allQuestions = allQuestions.slice(0, 18);
        } else if (allQuestions.length < 18) {
            console.warn(`WARNING: Total questions generated is ${allQuestions.length}, expected 18. Some sections might be missing.`);
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
        fs.writeFileSync(legacyFilepath, JSON.stringify(outputObject, null, 2));

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
