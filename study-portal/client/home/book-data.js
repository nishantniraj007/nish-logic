/**
 * book-data.js
 * Data layer only — fetch 2 bundles from Zoho, merge, deduplicate, normalize.
 * Exposes: window.getBookData(examKey) → { sections: { key: [questions] } }
 */

function _bookStrip(s){ return (s||'').replace(/^\([a-d]\)\s*/i,'').trim(); }

function _bookNormalize(q){
    let opts=[];
    if(Array.isArray(q.options)) opts=q.options.map(o=>_bookStrip(o));
    else if(typeof q.options==='string') opts=q.options.split(',').map(o=>_bookStrip(o));
    if(opts.length===0) return null;
    const ans=_bookStrip(q.correct_answer||q.answer||'');
    if(!ans) return null;
    if((q.question||'').toLowerCase().includes('template')) return null;
    if((q.explanation||'').toLowerCase().includes('template')) return null;
    if(!q.question||q.question.trim()==='') return null;
    return {
        question: q.question,
        options: opts,
        correct_answer: ans,
        explanation: q.explanation||'',
        topic: q.topic||q.category||'',
        _sourceCol: q._sourceCol||q.id||''
    };
}

async function _fetchBundle(levelParam){
    const { ZOHO_API } = window.BOOK_CONFIG;
    const res = await fetch(`${ZOHO_API}?level=${levelParam}`);
    if(!res.ok) throw new Error(`Zoho API error: ${res.status}`);
    const data = await res.json();
    return data.questions || [];
}

window.getBookData = async function(examKey){
    const { CACHE_EXPIRY_MS, EXAMS, ZOHO_API } = window.BOOK_CONFIG;
    const exam = EXAMS[examKey];
    if(!exam) throw new Error(`Unknown exam: ${examKey}`);

    const cacheKey = `nish_book_${examKey}`;

    // Check 15-day cache
    try{
        const cached = localStorage.getItem(cacheKey);
        if(cached){
            const parsed = JSON.parse(cached);
            if(Date.now() - parsed.fetchedAt < CACHE_EXPIRY_MS){
                console.log(`✅ Book cache hit for ${examKey}`);
                return parsed.sections;
            }
            console.log(`⏰ Book cache expired for ${examKey}`);
        }
    }catch(e){ console.warn('Book cache read error:', e); }

    // Fetch 2 bundles
    console.log(`📦 Fetching 2 bundles for ${examKey}...`);
    const [bundle1, bundle2] = await Promise.all([
        _fetchBundle(exam.levels[0]),
        _fetchBundle(exam.levels[1])
    ]);

    // Merge and deduplicate by question text
    const seen = new Set();
    const merged = [...bundle1, ...bundle2].filter(q => {
        const key = (q.question||'').trim().toLowerCase();
        if(!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    console.log(`📚 Merged pool: ${merged.length} unique questions`);

    // Normalize all
    const normalized = merged.map(q => _bookNormalize(q)).filter(Boolean);

    // Split into sections by sourceCol prefix
    const sections = {};
    exam.sections.forEach(sec => {
        const pool = normalized.filter(q => {
            const src = q._sourceCol || '';
            return src.startsWith(sec.sourcePrefix);
        });
        // Shuffle and pick required count
        for(let i=pool.length-1;i>0;i--){
            const j=Math.floor(Math.random()*(i+1));
            [pool[i],pool[j]]=[pool[j],pool[i]];
        }
        sections[sec.key] = pool.slice(0, sec.count);
        console.log(`  ${sec.label}: ${sections[sec.key].length} questions`);
    });

    // Cache result
    try{
        localStorage.setItem(cacheKey, JSON.stringify({ sections, fetchedAt: Date.now() }));
    }catch(e){ console.warn('Book cache write error:', e); }

    return sections;
};
