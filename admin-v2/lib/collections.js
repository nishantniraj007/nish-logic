export const levelProfiles = {
  e:      { name: 'Easy',     profile: 'a Class 10 student scoring 90%+ in board exams (IQ 90-109)',                                        style: 'Direct factual recall. Single concept per question. No tricks. Clear and unambiguous language. Options should be obviously different from each other.',                                                                                avoid: 'Do not use tricky distractors. Avoid multi-concept questions.' },
  m:      { name: 'Medium',   profile: 'a Class 12 student scoring 80%+ in board exams (IQ 110-119)',                                       style: 'Application based questions. Mild inference required. Options are plausible but one is clearly correct on analysis. Tests understanding not just memory.',                                                                         avoid: 'Avoid purely factual questions. Push for applied understanding.' },
  s:      { name: 'SSC',      profile: 'an Engineering graduate appearing for SSC CGL or SSC CHSL (IQ 120-134)',                            style: 'Tricky close distractors. Real SSC exam pattern. Tests conceptual clarity under pressure. Options should include common misconceptions as wrong answers. Multi-step reasoning preferred.',                                        avoid: 'Avoid simple recall. All 4 options must seem plausible at first glance.' },
  b:      { name: 'Bank',     profile: 'a graduate appearing for IBPS PO or SBI PO exam (IQ 120-134)',                                      style: 'Banking and finance context preferred. Close distractors. Real IBPS SBI exam pattern. Tests speed and accuracy under time pressure. Data interpretation heavy.',                                                                    avoid: 'Avoid simple recall. Push for application in banking context.' },
  u:      { name: 'UPSC',     profile: 'a UPSC Civil Services aspirant with deep analytical ability (IQ 135-144)',                          style: 'Deep conceptual and analytical questions. Tests ability to eliminate near-correct options. Requires systemic thinking. UPSC Prelims pattern.',                                                                                         avoid: 'No straightforward factual questions. Every option must require genuine analysis to eliminate.' },
  c:      { name: 'CAT',      profile: 'a CAT aspirant targeting IIM admission with high abstract reasoning (IQ 135-144)',                  style: 'Highly analytical. Tests speed accuracy and conceptual depth. CAT pattern with tricky close options. Data heavy for DILR. Passage heavy for VARC.',                                                                               avoid: 'No direct formula questions. Push for multi-step elimination and reasoning.' },
  n:      { name: 'NEET-UG',  profile: 'a Class 12 appearing NEET aspirant with strong NCERT base (IQ 110-125)',                           style: 'Application-based reasoning. Multi-step problem solving. Precise scientific terminology. NCERT-aligned with competitive twist. Options must be plausible — no obviously wrong distractors.',                                          avoid: 'Do not test pure memorization. Test concept application. Mention NCERT chapter relevance in explanation.' },
  i:      { name: 'IIT-ENGG', profile: 'a Class 12 appearing JEE aspirant with high analytical ability (IQ 120-134)',                      style: 'Multi-step problem solving. Application of formulas in non-standard situations. Strong conceptual base required. Plausible distractors based on common calculation errors.',                                                         avoid: 'No direct formula plug-in questions. Push for multi-step reasoning and elimination.' },
  clat_e: { name: 'CLAT',     profile: 'a Law entrance aspirant with strong reading comprehension and legal reasoning (IQ 115-130)',        style: 'Passage-based or principle-based legal reasoning. Tests application of legal principles to fact situations.',                                                                                                                           avoid: 'Avoid isolated grammar rules. Test language in context.' }
};

export const levelTypeMap = {
  e:      ['qa', 'lr', 'sgk', 'ca'],
  m:      ['qa', 'lr', 'sgk', 'ca'],
  s:      ['qa', 'lr', 'sgk', 'ca', 'eng', 'comp'],
  b:      ['qa', 'lr', 'sgk', 'ca', 'eng', 'comp'],
  u:      ['qa', 'lr', 'sgk', 'ca'],
  c:      ['varc', 'dilr', 'qa', 'ca'],
  n:      ['phy', 'chem', 'bio'],
  i:      ['phy', 'chem', 'mat'],
  clat_e: ['eng']
};

export const resolveCollection = (level, type) => {
  if (level === 'clat_e' && type === 'eng') return 'eng_clat';
  return `${type}_${level}`;
};

export const resolveSyllabusKey = (level, type) => {
  const map = {
    e_qa: 'qa_easy', e_lr: 'lr_easy', e_sgk: 'sgk_easy', e_ca: 'ca_easy',
    m_qa: 'qa_medium', m_lr: 'lr_medium', m_sgk: 'sgk_medium', m_ca: 'ca_medium',
    s_qa: 'quant_ssc', s_lr: 'reasoning_ssc', s_sgk: 'gk_ssc', s_ca: 'ca_ssc', s_eng: 'eng_ssc', s_comp: 'comp_ssc',
    b_qa: 'qa_bank', b_lr: 'lr_bank', b_sgk: 'gk_bank', b_ca: 'ca_bank', b_eng: 'eng_bank', b_comp: 'comp_bank',
    u_qa: 'qa_upsc', u_lr: 'lr_upsc', u_sgk: 'gs_upsc', u_ca: 'ca_upsc',
    c_varc: 'varc_cat', c_dilr: 'dilr_cat', c_qa: 'qa_cat', c_ca: 'ca_cat',
    n_phy: 'phy_shared', n_chem: 'chem_shared', n_bio: 'bio_neet',
    i_phy: 'phy_shared', i_chem: 'chem_shared', i_mat: 'mat_iit',
    clat_e_eng: 'eng_clat'
  };
  return map[`${level}_${type}`] || null;
};

export function getExplanationRule(level, type) {
  if (level === 'n' || level === 'i') {
    return `5-6 lines in this structure:
   CONCEPT: [Core concept being tested]
   APPLICATION: [How it applies to the question]
   NCERT: [Relevant NCERT Class/Chapter reference]
   EXAM TIP: [Common exam angle or frequent mistake to avoid]
   No commas inside explanation. Each part on its own line.`;
  }
  if (level === 'u' || level === 'c') {
    return `5-6 lines in this structure:
   CONCEPT: [What concept or topic this question tests]
   ANALYSIS: [Why the correct answer is right — with reasoning]
   ELIMINATE: [Why the closest wrong option is incorrect]
   DEEPER: [Additional exam-relevant context or analytical angle]
   No commas inside explanation. Each part on its own line.`;
  }
  if (level === 's' || level === 'b') {
    return `5-6 lines in this structure:
   WHAT: [What this topic or concept is about]
   WHY: [Why the correct answer is right]
   TRICK: [Common mistake or trap in this question type]
   EXAM ANGLE: [How this topic appears in ${levelProfiles[level]?.name} exams]
   No commas inside explanation. Each part on its own line.`;
  }
  if (level === 'clat_e') {
    return `5-6 lines in this structure:
   PRINCIPLE: [Legal or language principle being tested]
   APPLICATION: [How it applies to the question or passage]
   LEGAL REASONING: [Why the correct answer follows from the principle]
   EXAM ANGLE: [How CLAT tests this type of question]
   No commas inside explanation. Each part on its own line.`;
  }
  if (level === 'm') {
    return `3-4 lines in this structure:
   CONCEPT: [Core concept being tested]
   REASON: [Why the correct answer is right]
   WRONG: [Why the most tempting wrong option is incorrect]
   No commas inside explanation. Each part on its own line.`;
  }
  return `1-2 simple sentences explaining why the answer is correct. Plain language. No jargon. No commas inside explanation.`;
}

export const bundleConfig = {
  'Easy':     { cols: { qa_e:100, lr_e:100, sgk_e:150, ca_e:150 },                         bundleCol: 'bundle_easy'   },
  'Medium':   { cols: { qa_m:100, lr_m:100, sgk_m:150, ca_m:150 },                         bundleCol: 'bundle_medium' },
  'SSC':      { cols: { qa_s:100, lr_s:100, sgk_s:100, ca_s:100, eng_s:50, comp_s:50 },    bundleCol: 'bundle_ssc'    },
  'Bank':     { cols: { qa_b:100, lr_b:100, sgk_b:100, ca_b:100, eng_b:50, comp_b:50 },    bundleCol: 'bundle_bank'   },
  'UPSC':     { cols: { qa_u:100, lr_u:100, sgk_u:150, ca_u:150 },                         bundleCol: 'bundle_upsc'   },
  'CAT':      { cols: { varc_c:150, dilr_c:100, qa_c:100, ca_c:150 },                      bundleCol: 'bundle_cat'    },
  'NEET-UG':  { cols: { phy_n:150, chem_n:150, bio_n:200 },                                bundleCol: 'bundle_neet'   },
  'IIT-ENGG': { cols: { phy_i:150, chem_i:150, mat_i:200 },                                bundleCol: 'bundle_iit'    },
  'CLAT':     { cols: { eng_clat:500 },                                                     bundleCol: 'bundle_clat'   }
};
