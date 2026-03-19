const { getMathQuestions, getLogicQuestions } = require('./math_logic_engine');
console.log("=== Math ===\n", JSON.stringify(getMathQuestions(3, "medium"), null, 2));
console.log("=== Logic ===\n", JSON.stringify(getLogicQuestions(3, "medium"), null, 2));
