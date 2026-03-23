export const levelProfiles = {
  e:      { name: 'Easy',      profile: 'a Class 10 student scoring 90%+ in board exams (IQ 90-109)',                                          style: 'Direct factual recall. Single concept per question. No tricks. Clear and unambiguous language. Options should be obviously different from each other.',                                                                                   avoid: 'Do not use tricky distractors. Avoid multi-concept questions.' },
  m:      { name: 'Medium',    profile: 'a Class 12 student scoring 80%+ in board exams (IQ 110-119)',                                         style: 'Application based questions. Mild inference required. Options are plausible but one is clearly correct on analysis. Tests understanding not just memory.',                                                                              avoid: 'Avoid purely factual questions. Push for applied understanding.' },
  s:      { name: 'SSC-Bank',  profile: 'an Engineering graduate with high IQ appearing for SSC CGL or IBPS PO (IQ 120-139)',                  style: 'Tricky close distractors. Real exam pattern. Tests conceptual clarity under pressure. Options should include common misconceptions as wrong answers. Multi-step reasoning preferred.',                                               avoid: 'Avoid simple recall. All 4 options must seem plausible at first glance.' },
  u:      { name: 'UPSC-CAT',  profile: 'a UPSC or CAT topper with abstract reasoning ability (IQ 140+)',                                      style: 'Deep conceptual and analytical questions. Tests ability to eliminate near-correct options. Requires systemic thinking.',                                                                                                                    avoid: 'No straightforward factual questions. Every option must require genuine analysis to eliminate.' },
  n:      { name: 'NEET-UG',   profile: 'a Class 12 appearing NEET aspirant with strong NCERT base (IQ 110-125)',                              style: 'Application-based reasoning. Multi-step problem solving. Precise scientific terminology. NCERT-aligned with competitive twist. Options must be plausible — no obviously wrong distractors.',                                             avoid: 'Do not test pure memorization. Test concept application. Mention NCERT chapter relevance in explanation.' },
  i:      { name: 'IIT-ENGG',  profile: 'a Class 12 appearing JEE aspirant with high analytical ability (IQ 110-125)',                         style: 'Multi-step problem solving. Application of formulas in non-standard situations. Strong conceptual base required. Plausible distractors based on common calculation errors.',                                                          avoid: 'No direct formula plug-in questions. Push for multi-step reasoning and elimination.' },
  clat_e: { name: 'CLAT',      profile: 'a Law entrance aspirant with strong reading comprehension and legal reasoning (IQ 115-130)',           style: 'Passage-based or principle-based legal reasoning. Tests application of legal principles to fact situations.',                                                                                                                              avoid: 'Avoid isolated grammar rules. Test language in context.' }
};

export const levelTypeMap = {
  e:      ['qa', 'lr', 'sgk', 'ca'],
  m:      ['qa', 'lr', 'sgk', 'ca'],
  s:      ['qa', 'lr', 'sgk', 'ca', 'eng', 'comp'],
  u:      ['qa', 'lr', 'sgk', 'ca', 'eng', 'comp'],
  n:      ['phy', 'chem', 'bio'],
  i:      ['phy', 'chem', 'mat'],
  clat_e: ['eng']
};

export const resolveCollection = (level, type) => {
  if (level === 'clat_e' && type === 'eng') return 'eng_clat';
  return `${type}_${level}`;
};

export function getExplanationRule(level, type) {
  const scienceLevels = ['n', 'i'];
  const deepLevels    = ['s', 'u'];
  const deepTypes     = ['sgk', 'ca'];
  if (scienceLevels.includes(level)) {
    return `5-6 lines in this structure:\n   CONCEPT: [Core concept being tested]\n   APPLICATION: [How it applies to the question]\n   NCERT: [Relevant NCERT Class/Chapter reference]\n   EXAM TIP: [Common exam angle or frequent mistake to avoid]\n   No commas inside explanation. Each part on its own line.`;
  }
  if (deepLevels.includes(level) && deepTypes.includes(type)) {
    return `5-6 lines in this structure:\n   WHAT: [What this topic/event/concept is about]\n   WHEN: [Historical or contextual timeline]\n   WHY: [Why it matters for ${levelProfiles[level]?.name} exam preparation]\n   CONTEXT: [Additional exam-relevant detail or common exam angle]\n   No commas inside explanation. Each part on its own line.`;
  }
  return `one precise sentence — no commas inside it`;
}

export const bundleConfig = {
  'Easy':     { cols: { qa_e:100, lr_e:100, sgk_e:150, ca_e:150 },                      bundleCol: 'bundle_easy'   },
  'Medium':   { cols: { qa_m:100, lr_m:100, sgk_m:150, ca_m:150 },                      bundleCol: 'bundle_medium' },
  'SSC-Bank': { cols: { qa_s:100, lr_s:100, sgk_s:100, ca_s:100, eng_s:50, comp_s:50 }, bundleCol: 'bundle_ssc'    },
  'UPSC-CAT': { cols: { qa_u:100, lr_u:100, sgk_u:100, ca_u:100, eng_u:50, comp_u:50 }, bundleCol: 'bundle_upsc'   },
  'NEET-UG':  { cols: { phy_n:150, chem_n:150, bio_n:200 },                              bundleCol: 'bundle_neet'   },
  'IIT-ENGG': { cols: { phy_i:150, chem_i:150, mat_i:200 },                              bundleCol: 'bundle_iit'    },
  'CLAT':     { cols: { eng_clat:500 },                                                  bundleCol: 'bundle_clat'   }
};
