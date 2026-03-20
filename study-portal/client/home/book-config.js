/**
 * book-config.js
 * Constants only — exam map, subject ratios, cache settings.
 * Update this file when adding new exams or changing ratios.
 */

window.BOOK_CONFIG = {
  ZOHO_API: '/server/nish_logic_function',

  CACHE_EXPIRY_MS: 15 * 24 * 60 * 60 * 1000, // 15 days

  EXAMS: {
    ssc: {
      label: 'SSC / Bank',
      levels: ['s', 's'], // fetch bundle_ssc twice (2 random bundles)
      sections: [
        { key: 'qa',   label: 'Quantitative Aptitude',          count: 100, sourcePrefix: 'qa'   },
        { key: 'lr',   label: 'Logical Reasoning',              count: 100, sourcePrefix: 'lr'   },
        { key: 'sgk',  label: 'Static General Knowledge',       count: 100, sourcePrefix: 'sgk'  },
        { key: 'ca',   label: 'Current Affairs',                count: 100, sourcePrefix: 'ca'   },
        { key: 'eng',  label: 'English Language',               count:  50, sourcePrefix: 'eng'  },
        { key: 'comp', label: 'Computer Studies & IT',          count:  50, sourcePrefix: 'comp' }
      ]
    },
    upsc: {
      label: 'UPSC / CAT',
      levels: ['u', 'u'],
      sections: [
        { key: 'qa',   label: 'Quantitative Aptitude',          count: 100, sourcePrefix: 'qa'   },
        { key: 'lr',   label: 'Logical Reasoning',              count: 100, sourcePrefix: 'lr'   },
        { key: 'sgk',  label: 'Static General Knowledge',       count: 100, sourcePrefix: 'sgk'  },
        { key: 'ca',   label: 'Current Affairs',                count: 100, sourcePrefix: 'ca'   },
        { key: 'eng',  label: 'English Language',               count:  50, sourcePrefix: 'eng'  },
        { key: 'comp', label: 'Computer Studies & IT',          count:  50, sourcePrefix: 'comp' }
      ]
    },
    neet: {
      label: 'NEET UG',
      levels: ['n', 'n'],
      sections: [
        { key: 'phy',  label: 'Physics',                        count: 150, sourcePrefix: 'phy'  },
        { key: 'chem', label: 'Chemistry',                      count: 150, sourcePrefix: 'chem' },
        { key: 'bio',  label: 'Biology',                        count: 200, sourcePrefix: 'bio'  }
      ]
    },
    iit: {
      label: 'IIT JEE',
      levels: ['i', 'i'],
      sections: [
        { key: 'phy',  label: 'Physics',                        count: 150, sourcePrefix: 'phy'  },
        { key: 'chem', label: 'Chemistry',                      count: 150, sourcePrefix: 'chem' },
        { key: 'mat',  label: 'Mathematics',                    count: 200, sourcePrefix: 'mat'  }
      ]
    }
  }
};
