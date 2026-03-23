const { useState, useEffect } = React;

const Dashboard = () => {
  const { fsCollection, fsDoc, fsGetDoc, fsGetDocs, fsGetCount, fsWriteBatch, fsTimestamp } = window.Firebase;
  const { bundleConfig, resolveCollection, levelProfiles } = window.Collections;

  // stats shape: { [levelName]: { cols: { [colName]: { count, needed, lastSynced } }, bundleCol, bundleCount, levelKey } }
  const [levelStats, setLevelStats]   = useState({});
  const [isLoading, setIsLoading]     = useState(false);
  const [packingLevel, setPackingLevel] = useState(null); // levelName being packed

  useEffect(() => { fetchAllStats(); }, []);

  // ── Fetch counts for every collection + bundle count per level ───────────────
  const fetchAllStats = async () => {
    setIsLoading(true);
    const result = {};

    for (const [levelName, config] of Object.entries(bundleConfig)) {
      const colStats = {};

      // Per-collection counts + lastSynced from _meta
      for (const [colName, needed] of Object.entries(config.cols)) {
        try {
          const countSnap = await fsGetCount(fsCollection(colName));
          // subtract 1 if _meta doc exists so it doesn't inflate count
          let count = countSnap.data().count;
          try {
            const metaSnap = await fsGetDoc(fsDoc(colName, '_meta'));
            if (metaSnap.exists()) {
              count = Math.max(0, count - 1);
              colStats[colName] = { count, needed, lastSynced: metaSnap.data().lastSynced?.toDate() || null };
            } else {
              colStats[colName] = { count, needed, lastSynced: null };
            }
          } catch (e) {
            colStats[colName] = { count, needed, lastSynced: null };
          }
        } catch (e) {
          colStats[colName] = { count: 0, needed, lastSynced: null };
        }
      }

      // Bundle count (exclude _template)
      let bundleCount = 0;
      try {
        const bSnap = await fsGetDocs(fsCollection(config.bundleCol));
        bundleCount = bSnap.docs.filter(d => d.id !== '_template').length;
      } catch (e) {}

      // Find levelKey (e, m, s, u, n, i, clat_e) from levelProfiles
      const levelKey = Object.keys(levelProfiles).find(k => levelProfiles[k].name === levelName) || '';

      result[levelName] = { cols: colStats, bundleCol: config.bundleCol, bundleCount, levelKey };
    }

    setLevelStats(result);
    setIsLoading(false);
  };

  // ── Pack bundle — gathers ALL collections for a level into ONE bundle doc ────
  const packBundle = async (levelName) => {
    const config   = bundleConfig[levelName];
    const data     = levelStats[levelName];
    if (!config || !data) return;

    // Check all collections are ready
    for (const [colName, needed] of Object.entries(config.cols)) {
      const current = data.cols[colName]?.count || 0;
      if (current < needed) {
        alert(`Not ready — ${colName} has ${current}/${needed} questions.`);
        return;
      }
    }

    const totalNeeded = Object.values(config.cols).reduce((a, b) => a + b, 0);
    if (!confirm(`Pack bundle for ${levelName}?\n\nThis will:\n• Pick ${totalNeeded} questions across ${Object.keys(config.cols).length} collections\n• Write 1 bundle doc to ${config.bundleCol}\n• DELETE the picked questions from source collections\n\nContinue?`)) return;

    setPackingLevel(levelName);

    try {
      // Fisher-Yates shuffle helper
      function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }

      // Pick N random docs from a collection (excludes _meta + _template)
      async function pickRandom(colName, count) {
        const snap = await fsGetDocs(fsCollection(colName));
        const docs = snap.docs.filter(d => d.id !== '_meta' && d.id !== '_template');
        if (docs.length < count) throw new Error(`${colName}: need ${count} questions, only ${docs.length} available.`);
        shuffle(docs);
        return docs.slice(0, count).map(d => ({ ...d.data(), _sourceCol: colName, _sourceId: d.id }));
      }

      // Get next sequential bundle ID (bundle_01, bundle_02 ...)
      async function getNextBundleId() {
        const snap     = await fsGetDocs(fsCollection(config.bundleCol));
        const existing = snap.docs.filter(d => d.id !== '_template').length;
        return `bundle_${String(existing + 1).padStart(2, '0')}`;
      }

      // Gather all questions
      const allQuestions = [];
      const toDelete     = []; // { colName, docId }

      for (const [colName, needed] of Object.entries(config.cols)) {
        const picked = await pickRandom(colName, needed);
        for (const q of picked) {
          toDelete.push({ colName: q._sourceCol, docId: q._sourceId });
          const { _sourceCol, _sourceId, ...clean } = q;
          allQuestions.push(clean);
        }
      }

      shuffle(allQuestions);

      // Write bundle doc
      const bundleId  = await getNextBundleId();
      const bundleRef = fsDoc(config.bundleCol, bundleId);
      const wb1       = fsWriteBatch();
      wb1.set(bundleRef, {
        bundleId,
        level:          levelName,
        totalQuestions: allQuestions.length,
        createdAt:      new Date().toISOString(),
        questions:      allQuestions
      });
      await wb1.commit();

      // Delete source docs in batches of 400
      const BATCH_SIZE = 400;
      for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const wb = fsWriteBatch();
        toDelete.slice(i, i + BATCH_SIZE).forEach(({ colName, docId }) => {
          wb.delete(fsDoc(colName, docId));
        });
        await wb.commit();
      }

      alert(`✅ ${config.bundleCol}/${bundleId} packed — ${allQuestions.length} questions.`);
      fetchAllStats();

    } catch (e) {
      alert('⛔ Pack failed: ' + e.message);
    } finally {
      setPackingLevel(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#1a1a2e] p-6 rounded-2xl border border-white/5">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-2 h-6 bg-[#f7a26a] rounded-full"></span>
          Bundle Dashboard
        </h2>
        <button
          onClick={fetchAllStats}
          disabled={isLoading}
          className="text-xs text-[#f7a26a] hover:underline disabled:opacity-50"
        >
          {isLoading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {Object.entries(levelStats).map(([levelName, data]) => {
        const allReady    = Object.values(data.cols).every(c => c.count >= c.needed);
        const isPacking   = packingLevel === levelName;

        return (
          <div key={levelName} className="mb-6 bg-[#0f0f1a] rounded-xl border border-white/5 overflow-hidden">

            {/* Level header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white">{levelName}</span>
                <span className="text-xs text-[#888]">→ {data.bundleCol}</span>
                {data.bundleCount > 0 && (
                  <span className="text-xs bg-[#f7a26a]/10 text-[#f7a26a] px-2 py-0.5 rounded-full">
                    {data.bundleCount} bundle{data.bundleCount > 1 ? 's' : ''} packed
                  </span>
                )}
              </div>
              <button
                onClick={() => packBundle(levelName)}
                disabled={!allReady || isPacking || packingLevel !== null}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  allReady && !isPacking && packingLevel === null
                    ? 'bg-[#6af7a2] text-black hover:bg-opacity-90 shadow-[0_0_12px_rgba(106,247,162,0.25)]'
                    : 'bg-white/5 text-[#555] cursor-not-allowed'
                }`}
              >
                {isPacking ? '⏳ Packing...' : allReady ? '⚡ PACK BUNDLE' : '⏳ Not ready'}
              </button>
            </div>

            {/* Per-collection rows */}
            <div className="divide-y divide-white/5">
              {Object.entries(data.cols).map(([colName, col]) => {
                const pct     = Math.min(100, (col.count / col.needed) * 100);
                const ready   = col.count >= col.needed;
                return (
                  <div key={colName} className="px-4 py-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <div>
                        <span className="text-sm font-mono text-white">{colName}</span>
                        {col.lastSynced && (
                          <span className="ml-2 text-[10px] text-[#555]">
                            synced {col.lastSynced.toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${ready ? 'text-[#6af7a2]' : 'text-[#f7a26a]'}`}>
                        {col.count} / {col.needed}
                      </span>
                    </div>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${ready ? 'bg-[#6af7a2]' : 'bg-[#f7a26a]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        );
      })}

      {Object.keys(levelStats).length === 0 && !isLoading && (
        <p className="text-center text-[#555] text-sm py-8">No data yet — click Refresh.</p>
      )}
    </div>
  );
};

window.Dashboard = Dashboard;
