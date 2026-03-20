/**
 * marathon-data.js
 * Data layer only — fetch, cache, normalize. No game logic here.
 * Exposes: window.getData(level) → returns normalized questions array
 */

function _strip(s){ return (s||'').replace(/^\([a-d]\)\s*/i,'').trim(); }

function _normalizeQ(q){
    let opts=[];
    if(Array.isArray(q.options)) opts=q.options.map(o=>_strip(o));
    else if(typeof q.options==='string') opts=q.options.split(',').map(o=>_strip(o));
    if(opts.length===0) return null;
    const ans=_strip(q.correct_answer||q.answer||'');
    if(!ans) return null;
    if((q.question||'').toLowerCase().includes('template')) return null;
    if((q.explanation||'').toLowerCase().includes('template')) return null;
    const src=q._sourceCol||q.id||'';
    return {
        category: src.startsWith('ca') ? 'Current Affairs' : 'Static GK',
        question: q.question,
        options: opts,
        correct_answer: ans,
        explanation: q.explanation||''
    };
}

window.getData = async function(level){
    const { ZOHO_API, CACHE_EXPIRY_MS } = window.MARATHON_CONFIG;
    const cacheKey = `nish_bundle_${level}`;

    try{
        const cached = localStorage.getItem(cacheKey);
        if(cached){
            const parsed = JSON.parse(cached);
            if(Date.now() - parsed.fetchedAt < CACHE_EXPIRY_MS){
                console.log(`✅ Cache hit for ${level} — ${parsed.questions.length} questions`);
                return parsed.questions.map(q => _normalizeQ(q)).filter(Boolean);
            }
            console.log(`⏰ Cache expired for ${level}, fetching fresh...`);
        }
    }catch(e){ console.warn('Cache read error:', e); }

    const levelParam = level === 'ssc' ? 's' : 'u';
    console.log(`🌐 Fetching from Zoho API: ${ZOHO_API}?level=${levelParam}`);
    const res = await fetch(`${ZOHO_API}?level=${levelParam}`);
    if(!res.ok) throw new Error(`Zoho API error: ${res.status}`);
    const data = await res.json();
    const questions = data.questions || [];
    console.log(`📦 Fetched ${questions.length} raw questions from Zoho`);

    try{
        localStorage.setItem(cacheKey, JSON.stringify({ questions, fetchedAt: Date.now() }));
    }catch(e){ console.warn('Cache write error:', e); }

    return questions.map(q => _normalizeQ(q)).filter(Boolean);
};
