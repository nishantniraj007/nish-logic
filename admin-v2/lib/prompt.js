export const TOPIC_CLUSTERS = {
  qa:   ['Number System & HCF/LCM', 'Percentage & Profit/Loss', 'Time Speed Distance', 'Algebra & Equations', 'Geometry & Mensuration'],
  lr:   ['Series & Analogies', 'Coding-Decoding', 'Blood Relations & Direction', 'Syllogisms & Statements', 'Puzzles & Seating Arrangement'],
  sgk:  ['History & Culture', 'Geography & Environment', 'Polity & Constitution', 'Science & Technology', 'Economy & Awards'],
  ca:   ['National Affairs', 'International Relations', 'Economy & Finance', 'Science & Space', 'Sports & Awards'],
  eng:  ['Reading Comprehension', 'Grammar & Error Detection', 'Vocabulary & Synonyms', 'Sentence Improvement', 'Fill in the Blanks'],
  comp: ['Computer Fundamentals', 'MS Office & Internet', 'Networking & Security', 'Database & OS', 'Programming Basics'],
  phy:  ['Mechanics & Motion', 'Thermodynamics & Heat', 'Electricity & Magnetism', 'Optics & Waves', 'Modern Physics'],
  chem: ['Atomic Structure & Bonding', 'Periodic Table & Elements', 'Chemical Reactions & Equations', 'Acids Bases & Salts', 'Organic Chemistry'],
  bio:  ['Cell Biology & Genetics', 'Human Physiology', 'Plant Biology', 'Ecology & Environment', 'Evolution & Classification'],
  mat:  ['Algebra & Functions', 'Trigonometry & Coordinate Geometry', 'Calculus & Limits', 'Probability & Statistics', 'Matrices & Determinants']
};

export const generateSystemRole = () => {
  return `You are a strict question paper setter for Indian competitive exams.
You output ONLY raw tab-separated data lines. No commentary. No markdown. No JSON. No explanation outside the format.

OUTPUT FORMAT — EVERY LINE MUST FOLLOW THIS EXACTLY:
ID[TAB]ExamName[TAB]Topic[TAB]Question[TAB]Options[TAB]CorrectAnswer[TAB]Explanation

HARD RULES — VIOLATION = INVALID OUTPUT:
- Each question = exactly ONE line. Zero line breaks inside any field.
- Fields separated by TAB character only. Never use TAB inside a field.
- Options field: comma-separated, exactly 4 items, no nested commas, no extra options.
- CorrectAnswer must match one option EXACTLY — character for character.
- No blank lines between questions.
- No headers, no numbering, no markdown, no quotes, no preamble, no closing remarks.
- No commas inside Question, CorrectAnswer, or Explanation fields.
- Option Variance Rule: correct answer must NOT always be the same position. Distribute across all 4 options.`;
};

export const generateUserMessage = (level, type, count, levelProfile, explanationRule) => {
  const now    = new Date();
  const dd     = String(now.getDate()).padStart(2, '0');
  const mm     = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy   = now.getFullYear();
  const hh     = String(now.getHours()).padStart(2, '0');
  const min    = String(now.getMinutes()).padStart(2, '0');
  const tsDate = `${dd}.${mm}.${yyyy}`;
  const tsTime = `${hh}.${min}`;
  const nn     = String(count).padStart(2, '0');
  const clusters = TOPIC_CLUSTERS[type] || [];

  return `TASK: Generate exactly ${count} questions. Not ${count - 1}. Not ${count + 1}. Exactly ${count}.

TARGET PROFILE: ${levelProfile.profile}
COGNITIVE STYLE: ${levelProfile.style}
AVOID: ${levelProfile.avoid}

THEMATIC PARTITIONING — spread questions across these domains:
${clusters.map((c, i) => `  Domain ${i + 1}: ${c}`).join('\n')}
Diversity Check: no two questions from the exact same sub-topic.

FIELD RULES:
1. ID: ${type}_${level}_${tsDate}_${tsTime}_NN where NN is 01 to ${nn}
2. ExamName: always exactly "${levelProfile.name}"
3. Topic: one short topic name — no commas
4. Question: full question text — NO commas inside — NO line breaks
5. Options: EXACTLY 4 options separated by commas. Format: OptionA, OptionB, OptionC, OptionD
6. CorrectAnswer: copied WORD FOR WORD from one of the 4 options
7. Explanation: ${explanationRule}

EXAMPLE OF ONE VALID LINE:
${type}_${level}_${tsDate}_${tsTime}_01\t${levelProfile.name}\tSample Topic\tWhat is the sample question text here\tOption One, Option Two, Option Three, Option Four\tOption One\tThis is the explanation with no commas inside it

BEGIN OUTPUT NOW — ${count} lines only. Stop immediately after line ${nn}. Do not repeat. Do not restart. Do not add commentary.`;
};
