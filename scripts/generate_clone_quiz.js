const fs = require('fs');
const path = require('path');

// --- Internal Logic Question Templates (QA/LR) ---
// To save API quota after 3 AM, we use these robust templates to generate 8 logic questions.
const logicTemplates = {
    "Quantitative Aptitude": [
        (lvl) => ({
            question: `A man sells an article at a gain of ${5 + lvl}%. If he had bought it for $100, what would be the selling price?`,
            options: [`$${105 + lvl}`, `$${110 + lvl}`, `$${95 + lvl}`, `$${100 + lvl}`],
            correct_answer: `$${105 + lvl}`,
            explanation: `SP = CP * (100 + Gain%) / 100`,
            trick: "Directly add gain% to 100 for base $100."
        }),
        (lvl) => ({
            question: `The average of ${lvl} numbers is ${lvl * 2}. What is their sum?`,
            options: [`${lvl * lvl * 2}`, `${lvl * 2}`, `${lvl + 2}`, `${lvl * 4}`],
            correct_answer: `${lvl * lvl * 2}`,
            explanation: `Sum = Average * Count`,
            trick: "Multiply average by the total numbers."
        })
    ],
    "Logical Reasoning": [
        (lvl) => ({
            question: `Find the missing number in the series: ${lvl}, ${lvl * 2}, ${lvl * 4}, ?`,
            options: [`${lvl * 8}`, `${lvl * 6}`, `${lvl * 10}`, `${lvl * 12}`],
            correct_answer: `${lvl * 8}`,
            explanation: `Each number is multiplied by 2.`,
            trick: "Check common ratio/difference."
        }),
        (lvl) => ({
            question: `If 'APPLE' is coded as 'BQQMF', what is 'ORANGE' coded as?`,
            options: [`PSBOHF`, `PSBOGE`, `QSCOHF`, `PTBPIF`],
            correct_answer: `PSBOHF`,
            explanation: `Each letter is replaced by the next letter in the alphabet.`,
            trick: "Shift each character by +1."
        })
    ]
};

async function syncKnowledge() {
    try {
        console.log("Syncing Knowledge from Central DB...");
        const response = await fetch('https://raw.githubusercontent.com/nishantniraj007/nish-logic-gk-database/master/current_affairs/latest.json');
        const caData = await response.json();

        const subjects = ['history', 'geography', 'polity'];
        const sub = subjects[Math.floor(Math.random() * subjects.length)];
        const lvl = Math.floor(Math.random() * 3) + 13; // Focus on levels 13-15 for Clone

        const gkResponse = await fetch(`https://raw.githubusercontent.com/nishantniraj007/nish-logic-gk-database/master/${sub}/level_${lvl}.json`);
        const gkData = await gkResponse.json();

        return {
            ca: caData.sort(() => 0.5 - Math.random()).slice(0, 6),
            gk: gkData.sort(() => 0.5 - Math.random()).slice(0, 4).map(q => ({ ...q, category: `Static GK (${sub})` }))
        };
    } catch (e) {
        console.error("DB Sync Error:", e.message);
        return { ca: [], gk: [] }; // Fallback handled by caller
    }
}

async function main() {
    const batchIndex = parseInt(process.argv[2]) || 0;
    console.log(`=== CLONE GENERATOR: Batch ${batchIndex} ===`);

    // 1. Generate 8 Logic Questions (Internal)
    const logicQuestions = [];
    for (let i = 0; i < 4; i++) {
        const qaFunc = logicTemplates["Quantitative Aptitude"][i % 2];
        logicQuestions.push({ ...qaFunc(batchIndex + 1), category: "Quantitative Aptitude" });

        const lrFunc = logicTemplates["Logical Reasoning"][i % 2];
        logicQuestions.push({ ...lrFunc(batchIndex + 1), category: "Logical Reasoning" });
    }

    // 2. Fetch 10 Knowledge Questions (DB)
    const knowledge = await syncKnowledge();

    let allQuestions = [...logicQuestions, ...knowledge.ca, ...knowledge.gk];

    // Fill gaps if DB was empty
    while (allQuestions.length < 18) {
        allQuestions.push({
            category: "General Awareness",
            question: `[INTERNAL] Supplementary review question #${allQuestions.length + 1}?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct_answer: "Option A",
            explanation: "Review based on session difficulty.",
            trick: ""
        });
    }

    allQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 18);

    const output = {
        metadata: {
            batch_index: batchIndex,
            type: "Clone (Internal Logic)",
            generated_at: new Date().toISOString()
        },
        questions: allQuestions
    };

    const targetPath = path.join(__dirname, '../test-deploy/data', `batch_${batchIndex}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(output, null, 2));
    console.log(`Saved ${allQuestions.length} to ${targetPath}`);
}

main();
