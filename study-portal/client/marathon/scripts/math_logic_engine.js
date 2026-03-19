const fs = require('fs');

// Utility to shuffle arrays Let's use fisher-yates
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// ---------------------------------------------------------
// QUANTITATIVE APTITUDE TEMPLATES
// ---------------------------------------------------------

function generateProfitLoss(difficulty) {
    let cp = Math.floor(Math.random() * (50 - 10 + 1) + 10) * 100; // 1000 to 5000
    let percentages = [10, 15, 20, 25, 30, 40, 50];
    if (difficulty === 'upsc' || difficulty === 'ssc') {
        percentages = [12.5, 16.66, 33.33, 37.5, 10, 20]; // Tricky fractions
    }

    let percentage = percentages[Math.floor(Math.random() * percentages.length)];
    let isProfit = Math.random() > 0.5;

    let verb = isProfit ? "profit" : "loss";
    let multiplier = isProfit ? (1 + percentage / 100) : (1 - percentage / 100);
    let sp = Math.round(cp * multiplier);

    // Some decimal percentages like 16.66 are actually exactly 1/6
    if (percentage === 16.66) {
        sp = isProfit ? Math.round(cp * (7 / 6)) : Math.round(cp * (5 / 6));
        percentage = "16.66";
    } else if (percentage === 33.33) {
        sp = isProfit ? Math.round(cp * (4 / 3)) : Math.round(cp * (2 / 3));
        percentage = "33.33";
    }

    let correctOpt = `Rs. ${sp}`;
    let options = [correctOpt];

    // Gen distractors
    let offsets = [-1, 1, 2];
    for (let off of offsets) {
        let fakeSp = isProfit ? Math.round(sp + (cp * (off * 5) / 100)) : Math.round(sp - (cp * (off * 5) / 100));
        options.push(`Rs. ${fakeSp}`);
    }

    return {
        category: "Quantitative Aptitude",
        question: `A shopkeeper bought an item for Rs. ${cp} and sold it at a ${verb} of ${percentage}%. Find the selling price.`,
        options: shuffle(options),
        correct_answer: correctOpt,
        explanation: `CP = ${cp}. ${verb.charAt(0).toUpperCase() + verb.slice(1)}% = ${percentage}%. SP = CP * (100 ${isProfit ? '+' : '-'} Profit%)/100. Thus SP = ${sp}.`,
        trick: "Use fractional multipliers for famous percentages to speed up calculation."
    };
}

function generateTimeWork(difficulty) {
    let pairs = [[10, 15], [12, 24], [20, 30], [15, 30], [12, 36]];
    if (difficulty === 'upsc' || difficulty === 'ssc') {
        pairs = [[16, 48], [18, 36], [24, 72], [15, 45]]; // slightly harder numbers
    }

    let [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
    let c = (a * b) / (a + b); // Days

    let correctOpt = `${c} days`;
    let options = [correctOpt];

    let wrongVals = [c + 1, c - 1, c + 2];
    if (!Number.isInteger(c)) {
        wrongVals = [(c + 0.5).toFixed(1), (c - 0.5).toFixed(1), (c + 1).toFixed(1)];
    }

    for (let w of wrongVals) {
        options.push(`${w} days`);
    }

    return {
        category: "Quantitative Aptitude",
        question: `A can finish a piece of work in ${a} days while B can do it in ${b} days. How many days will they take to complete the work if they work together?`,
        options: shuffle(options),
        correct_answer: correctOpt,
        explanation: `1 day work of A = 1/${a}. 1 day work of B = 1/${b}. Total = 1/${a} + 1/${b} = (${a}+${b})/(${a * b}). Time taken = ${a * b}/(${a + b}) = ${c} days.`,
        trick: "Direct formula for two people working together: (A * B) / (A + B)"
    };
}

function generateSimpleInterest(difficulty) {
    let p = Math.floor(Math.random() * (80 - 10 + 1) + 10) * 100;
    let r = Math.floor(Math.random() * (15 - 5 + 1) + 5);
    let t = Math.floor(Math.random() * (5 - 2 + 1) + 2);

    let si = (p * r * t) / 100;
    let amount = p + si;

    let correctOpt = `Rs. ${amount}`;
    let options = [correctOpt];

    options.push(`Rs. ${p + (p * (r + 1) * t) / 100}`);
    options.push(`Rs. ${amount + 120}`);
    options.push(`Rs. ${amount - 100}`);

    return {
        category: "Quantitative Aptitude",
        question: `What will be the total amount (Principal + Simple Interest) at the end of ${t} years on a sum of Rs. ${p} at a simple interest rate of ${r}% per annum?`,
        options: shuffle([...new Set(options)]), // Ensure unique
        correct_answer: correctOpt,
        explanation: `SI = (P*R*T)/100 = (${p}*${r}*${t})/100 = ${si}. Total Amount = ${p} + ${si} = ${amount}.`,
        trick: "Calculate 1% of the principal first, multiply by rate, then multiply by time."
    };
}

// ---------------------------------------------------------
// LOGICAL REASONING TEMPLATES
// ---------------------------------------------------------

function generateSyllogism(difficulty) {
    const nouns = ["cats", "dogs", "birds", "trees", "cars", "bikes", "pens", "pencils", "tables"];
    let selected = shuffle(nouns).slice(0, 3);
    let [A, B, C] = selected;

    let templates = [
        {
            stmt: `All ${A} are ${B}. All ${B} are ${C}.`,
            conclusions: [
                { text: `All ${A} are ${C}.`, truth: true },
                { text: `Some ${A} are not ${C}.`, truth: false }
            ]
        },
        {
            stmt: `Some ${A} are ${B}. No ${B} are ${C}.`,
            conclusions: [
                { text: `Some ${A} are not ${C}.`, truth: true },
                { text: `All ${A} are ${C}.`, truth: false }
            ]
        },
        {
            stmt: `All ${A} are ${B}. No ${A} are ${C}.`,
            conclusions: [
                { text: `Some ${B} are not ${C}.`, truth: true },
                { text: `No ${B} are ${C}.`, truth: false }
            ]
        }
    ];

    let temp = templates[Math.floor(Math.random() * templates.length)];
    let c1 = temp.conclusions[0];
    let c2 = temp.conclusions[1];

    // Randomize the placement of true/false
    if (Math.random() > 0.5) {
        c1 = temp.conclusions[1];
        c2 = temp.conclusions[0];
    }

    let correctAns = "";
    if (c1.truth && !c2.truth) correctAns = "Only conclusion 1 follows";
    else if (!c1.truth && c2.truth) correctAns = "Only conclusion 2 follows";
    else if (c1.truth && c2.truth) correctAns = "Both follow";
    else correctAns = "Neither follows";

    let options = [
        "Only conclusion 1 follows",
        "Only conclusion 2 follows",
        "Both follow",
        "Neither follows"
    ];

    return {
        category: "Logical Reasoning",
        question: `Statements:\n1. ${temp.stmt.split('. ')[0]}.\n2. ${temp.stmt.split('. ')[1]}\n\nConclusions:\n1. ${c1.text}\n2. ${c2.text}`,
        options: options, // these are static order usually
        correct_answer: correctAns,
        explanation: `By drawing an overlapping Venn Diagram of ${A}, ${B}, and ${C}, we can determine the logical boundaries. The conclusion '${c1.truth ? c1.text : c2.text}' satisfies the universal constraint.`,
        trick: "Always draw Venn Diagrams. 'All A are B' means A is a subset of B."
    };
}

function generateNumberSeries(difficulty) {
    let start = Math.floor(Math.random() * 10) + 2;
    let diff = Math.floor(Math.random() * 5) + 3;
    let type = Math.floor(Math.random() * 3); // 0=Arith, 1=Geo, 2=Squares+1

    let series = [];
    let nextNum;

    if (type === 0) {
        for (let i = 0; i < 5; i++) series.push(start + (i * diff));
        nextNum = start + (5 * diff);
    } else if (type === 1) {
        let mult = Math.floor(Math.random() * 2) + 2;
        for (let i = 0; i < 5; i++) series.push(start * Math.pow(mult, i));
        nextNum = start * Math.pow(mult, 5);
    } else {
        for (let i = 0; i < 5; i++) series.push(Math.pow(start + i, 2) + 1);
        nextNum = Math.pow(start + 5, 2) + 1;
    }

    let options = [`${nextNum}`, `${nextNum + diff}`, `${nextNum - diff}`, `${nextNum + diff * 2}`];

    return {
        category: "Logical Reasoning",
        question: `Find the next number in the series: ${series.join(', ')}, ?`,
        options: shuffle([...new Set(options)]),
        correct_answer: `${nextNum}`,
        explanation: type === 0 ? `It is an arithmetic progression with a common difference of ${diff}.` : type === 1 ? `It is a geometric progression.` : `Each term is the square of a consecutive number plus one.`,
        trick: "Always check the difference between consecutive terms first."
    };
}

// ---------------------------------------------------------
// EXPORT ENGINE
// ---------------------------------------------------------

module.exports = {
    getMathQuestions: (count, diff) => {
        let pool = [generateProfitLoss, generateTimeWork, generateSimpleInterest];
        let results = [];
        for (let i = 0; i < count; i++) {
            let fn = pool[Math.floor(Math.random() * pool.length)];
            results.push(fn(diff));
        }
        return results;
    },
    getLogicQuestions: (count, diff) => {
        let pool = [generateSyllogism, generateNumberSeries];
        let results = [];
        for (let i = 0; i < count; i++) {
            let fn = pool[Math.floor(Math.random() * pool.length)];
            results.push(fn(diff));
        }
        return results;
    }
};
