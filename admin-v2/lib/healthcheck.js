const CHECKS = {
  FIREBASE_HOSTING:  'Firebase Hosting',
  ZOHO_API:          'Zoho API',
  FIRESTORE_CHUNKS:  'Firestore Chunks',
  FIRESTORE_BUNDLES: 'Firestore Bundles',
  GEMINI_API:        'Gemini API',
};

async function checkFirebaseHosting() {
  const name = CHECKS.FIREBASE_HOSTING;
  try {
    const response = await fetch('https://nish-logic.web.app', { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    if (response.status === 200) return { name, status: 'ok', message: 'Reachable — HTTP 200', detail: [] };
    return { name, status: 'warn', message: `Responded with HTTP ${response.status}`, detail: [] };
  } catch (e) {
    return { name, status: 'error', message: `Unreachable — ${e.message}`, detail: [] };
  }
}

async function checkZohoAPI() {
  const name = CHECKS.ZOHO_API;
  const ZOHO_URL = 'https://nish-logic-60066876988.development.catalystserverless.in/server/nish_logic_function';
  const levels = ['s','u','e','m','n','i','clat_e'];
  const results = await Promise.all(levels.map(async (level) => {
    try {
      const res  = await fetch(`${ZOHO_URL}?level=${level}`, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      const count = data.questions?.length || 0;
      return count > 0
        ? { ok: true,  detail: `✅ level ${level} — ${count} questions` }
        : { ok: false, detail: `❌ level ${level} — empty/error` };
    } catch (e) {
      return { ok: false, detail: `❌ level ${level} — ${e.message}` };
    }
  }));
  const passed  = results.filter(r => r.ok).length;
  const details = results.map(r => r.detail);
  if (passed === levels.length) return { name, status: 'ok',   message: 'All 7 levels responding',    detail: details };
  if (passed > 0)               return { name, status: 'warn', message: `${passed}/7 levels responding`, detail: details };
  return                               { name, status: 'error', message: 'Zoho function unreachable',  detail: details };
}

async function checkFirestoreChunks(db) {
  const name = CHECKS.FIRESTORE_CHUNKS;
  const { fsCollection, fsGetCount, fsDoc, fsGetDoc } = window.Firebase;
  const CHUNK_CONFIG = {
    qa_e:100, lr_e:100, sgk_e:150, ca_e:150,
    qa_m:100, lr_m:100, sgk_m:150, ca_m:150,
    qa_s:100, lr_s:100, sgk_s:100, ca_s:100, eng_s:50, comp_s:50,
    qa_u:100, lr_u:100, sgk_u:100, ca_u:100, eng_u:50, comp_u:50,
    phy_n:150, chem_n:150, bio_n:200,
    phy_i:150, chem_i:150, mat_i:200,
    eng_clat:500
  };
  try {
    const results = await Promise.all(Object.entries(CHUNK_CONFIG).map(async ([col, needed]) => {
      const [countSnap, metaSnap] = await Promise.all([
        fsGetCount(fsCollection(col)),
        fsGetDoc(fsDoc(col, '_meta'))
      ]);
      const count  = countSnap.data().count - (metaSnap.exists() ? 1 : 0);
      const status = count >= needed ? 'ok' : count >= needed * 0.7 ? 'warn' : 'error';
      const icon   = status === 'ok' ? '✅' : status === 'warn' ? '⚠️' : '❌';
      return { status, detail: `${icon} ${col}: ${count}/${needed}` };
    }));
    const details  = results.map(r => r.detail);
    const okCount  = results.filter(r => r.status === 'ok').length;
    const overall  = results.some(r => r.status === 'error') ? 'error' : results.some(r => r.status === 'warn') ? 'warn' : 'ok';
    const message  = okCount === 27 ? 'All 27 collections ready' : `${okCount}/27 collections ready`;
    return { name, status: overall, message, detail: details };
  } catch (e) {
    return { name, status: 'error', message: `Firestore error: ${e.message}`, detail: [] };
  }
}

async function checkFirestoreBundles(db) {
  const name = CHECKS.FIRESTORE_BUNDLES;
  const { fsCollection, fsGetDocs } = window.Firebase;
  const cols = ['bundle_easy','bundle_medium','bundle_ssc','bundle_upsc','bundle_neet','bundle_iit','bundle_clat'];
  try {
    const results = await Promise.all(cols.map(async (col) => {
      const snap  = await fsGetDocs(fsCollection(col));
      const count = snap.docs.filter(d => d.id !== '_template').length;
      return count >= 1
        ? { ok: true,  detail: `✅ ${col}: ${count} bundles` }
        : { ok: false, detail: `❌ ${col}: 0 bundles` };
    }));
    const passed  = results.filter(r => r.ok).length;
    const details = results.map(r => r.detail);
    const status  = passed === cols.length ? 'ok' : 'warn';
    const message = passed === cols.length ? 'All 7 levels have bundles' : `${passed}/7 levels have bundles`;
    return { name, status, message, detail: details };
  } catch (e) {
    return { name, status: 'error', message: `Firestore error: ${e.message}`, detail: [] };
  }
}

async function checkGeminiAPI(apiKey) {
  const name = CHECKS.GEMINI_API;
  if (!apiKey) return { name, status: 'warn', message: 'No API key stored', detail: [] };
  try {
    const res  = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with one word: OK' }] }], generationConfig: { maxOutputTokens: 10 } })
    });
    const data = await res.json();
    if (res.ok && data.candidates)                                          return { name, status: 'ok',    message: 'gemini-2.5-flash responding',    detail: [] };
    if (res.status === 429 || data.error?.status === 'RESOURCE_EXHAUSTED') return { name, status: 'warn',  message: 'Quota exhausted — try later',    detail: [] };
    if (res.status === 400 || data.error?.status === 'INVALID_ARGUMENT')   return { name, status: 'error', message: 'Invalid API key',                detail: [] };
    return { name, status: 'error', message: `Gemini unreachable — ${data.error?.message || res.statusText}`, detail: [] };
  } catch (e) {
    return { name, status: 'error', message: `Gemini unreachable — ${e.message}`, detail: [] };
  }
}

async function runAllChecks(db, apiKey) {
  const settled = await Promise.allSettled([
    checkFirebaseHosting(),
    checkZohoAPI(),
    checkFirestoreChunks(db),
    checkFirestoreBundles(db),
    checkGeminiAPI(apiKey)
  ]);
  const names = [CHECKS.FIREBASE_HOSTING, CHECKS.ZOHO_API, CHECKS.FIRESTORE_CHUNKS, CHECKS.FIRESTORE_BUNDLES, CHECKS.GEMINI_API];
  const results = settled.map((r, i) => r.status === 'fulfilled' ? r.value : { name: names[i], status: 'error', message: 'Check failed unexpectedly', detail: [] });
  const overall = results.some(r => r.status === 'error') ? 'error' : results.some(r => r.status === 'warn') ? 'warn' : 'ok';
  return { overall, results };
}

window.HealthCheck = { CHECKS, checkFirebaseHosting, checkZohoAPI, checkFirestoreChunks, checkFirestoreBundles, checkGeminiAPI, runAllChecks };
