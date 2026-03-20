/**
 * 3om-data.js
 * Data layer only — fetch, cache, normalize.
 * Exposes: window.getOMData(level) → normalized questions array
 */

function _omStrip(s){ return (s||'').replace(/^\([a-d]\)\s*/i,'').trim(); }

function _omNormalize(q){
    let opts=[];
    if(Array.isArray(q.options)) opts=q.options.map(o=>_omStrip(o));
    else if(typeof q.options==='string') opts=q.options.split(',').map(o=>_omStrip(o));
    if(opts.length===0) return null;
    const ans=_omStrip(q.correct_answer||q.answer||'');
    if(!ans) return null;
    if((q.question||'').toLowerCase().includes('template')) return null;
    if((q.explanation||'').toLowerCase().includes('template')) return null;
    const src=q._sourceCol||q.id||'';
    const type=src.split('_')[0];
    return {
        category: type==='ca'?'Current Affairs':type==='qa'?'Quantitative':type==='lr'?'Reasoning':'General Knowledge',
        question: q.question,
        options: opts,
        correct_answer: ans,
        explanation: q.explanation||''
    };
}

window.getOMData = async function(levelParam){
    const { ZOHO_API, CACHE_EXPIRY_MS } = window.OM_CONFIG;
    const cacheKey = `nish_bundle_${levelParam}`;

    try{
        const cached = localStorage.getItem(cacheKey);
        if(cached){
            const parsed = JSON.parse(cached);
            if(Date.now() - parsed.fetchedAt < CACHE_EXPIRY_MS){
                console.log(`✅ Cache hit for ${levelParam}`);
                return parsed.questions.map(q=>_omNormalize(q)).filter(Boolean);
            }
            console.log(`⏰ Cache expired for ${levelParam}`);
        }
    }catch(e){ console.warn('Cache read error:',e); }

    console.log(`🌐 Fetching from Zoho: ${ZOHO_API}?level=${levelParam}`);
    const res = await fetch(`${ZOHO_API}?level=${levelParam}`);
    if(!res.ok) throw new Error(`Zoho API error: ${res.status}`);
    const data = await res.json();
    const questions = data.questions || [];
    console.log(`📦 Fetched ${questions.length} questions`);

    try{
        localStorage.setItem(cacheKey, JSON.stringify({ questions, fetchedAt: Date.now() }));
    }catch(e){ console.warn('Cache write error:',e); }

    return questions.map(q=>_omNormalize(q)).filter(Boolean);
};
