const { useState, useEffect } = React;

const idPattern = /^(qa|lr|sgk|ca|eng|comp|phy|chem|bio|mat|varc|dilr)_(e|m|s|b|u|c|n|i|clat_e)_\d{2}\.\d{2}\.\d{4}_\d{2}\.\d{2}_\d{2}$/;

// Merge multi-line explanations back into single lines
function mergeLines(raw) {
  const lines  = raw.split('\n');
  const merged = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const firstField = line.split('\t')[0].trim();
    if (idPattern.test(firstField)) {
      merged.push(line);
    } else if (merged.length > 0) {
      merged[merged.length - 1] += ' ' + line.trim();
    }
  }
  return merged;
}

const Validator = ({ level, type, onSyncSuccess }) => {
  const { fsDoc, fsCollection, fsSetDoc, fsWriteBatch, fsTimestamp } = window.Firebase;
  const { resolveCollection } = window.Collections;

  const [input, setInput]           = useState('');
  const [validated, setValidated]   = useState([]); // parsed valid lines
  const [errors, setErrors]         = useState([]);
  const [isSyncing, setIsSyncing]   = useState(false);
  const [syncResult, setSyncResult] = useState(null); // { saved, skipped, failed }

  // Listen for streaming tokens + final output from Generator
  useEffect(() => {
    const handler = (e) => {
      setInput(e.detail);
      setValidated([]);
      setErrors([]);
      setSyncResult(null);
    };
    window.addEventListener('nish-stream', handler);
    window.addEventListener('nish-generated', handler);
    return () => {
      window.removeEventListener('nish-stream', handler);
      window.removeEventListener('nish-generated', handler);
    };
  }, []);

  const handleValidate = () => {
    setValidated([]);
    setErrors([]);
    setSyncResult(null);

    const raw   = input.trim();
    if (!raw) { setErrors(['Nothing to validate.']); return; }

    const lines  = mergeLines(raw);
    const errs   = [];
    const good   = [];

    lines.forEach((line, i) => {
      const parts = line.split('\t');
      const num   = i + 1;

      if (parts.length !== 7) {
        errs.push(`Line ${num}: needs 7 tab-separated fields, found ${parts.length}`);
        return;
      }

      const [id, examName, topic, question, optionsRaw, answer, explanation] = parts;

      if (!idPattern.test(id.trim()))
        errs.push(`Line ${num}: invalid ID "${id.trim()}"`);

      const opts = optionsRaw.split(',').map(o => o.trim()).filter(Boolean);
      if (opts.length !== 4)
        errs.push(`Line ${num}: need exactly 4 options, found ${opts.length}`);

      if (!opts.includes(answer.trim()))
        errs.push(`Line ${num}: answer "${answer.trim()}" not found in options`);

      if (!question.trim()) errs.push(`Line ${num}: question is empty`);
      if (!explanation.trim()) errs.push(`Line ${num}: explanation is empty`);

      if (!errs.find(e => e.startsWith(`Line ${num}`))) good.push(line);
    });

    setErrors(errs);
    setValidated(good);
  };

  const handleSync = async () => {
    if (validated.length === 0) return;
    setIsSyncing(true);
    setSyncResult(null);

    const colName = resolveCollection(level, type);
    let saved = 0, skipped = 0, failed = 0;

    for (const line of validated) {
      const parts = line.split('\t');
      if (parts.length < 7) { skipped++; continue; }
      const [id, examName, topic, question, optionsRaw, answer, explanation] = parts;
      const options = optionsRaw.split(',').map(o => o.trim());
      if (!options.includes(answer.trim())) { skipped++; continue; }
      try {
        await fsSetDoc(fsDoc(colName, id.trim()), {
          id: id.trim(), examName, topic, question,
          options, answer: answer.trim(), explanation,
          createdAt: new Date().toISOString()
        });
        saved++;
      } catch (e) { failed++; }
    }

    // Write _meta doc with lastSynced timestamp
    try {
      await fsSetDoc(fsDoc(colName, '_meta'), {
        lastSynced: fsTimestamp(),
        count:      saved,
        level,
        type
      });
    } catch (e) {}

    setIsSyncing(false);
    setSyncResult({ saved, skipped, failed });
    if (saved > 0) {
      setInput('');
      setValidated([]);
      setErrors([]);
      onSyncSuccess();
    }
  };

  return (
    <div className="bg-[#1a1a2e] p-6 rounded-2xl border border-white/5 mb-8">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <span className="w-2 h-6 bg-[#6af7a2] rounded-full"></span>
        Validator & Sync
      </h2>

      <div className="mb-4">
        <label className="block text-xs font-bold text-[#888] uppercase mb-2">
          Paste Questions (tab-separated format)
        </label>
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setValidated([]); setErrors([]); setSyncResult(null); }}
          placeholder={`ID\tExamName\tTopic\tQuestion\tOpt1, Opt2, Opt3, Opt4\tCorrectAnswer\tExplanation`}
          className="w-full h-48 bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-[#6af7a2] resize-none"
        />
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={handleValidate}
          className="flex-1 bg-[#2a2a3e] text-[#a89fff] border border-[#a89fff]/30 font-bold py-3 px-4 rounded-xl hover:border-[#a89fff] transition-all"
        >
          🔍 Validate Format
        </button>
        <button
          onClick={handleSync}
          disabled={validated.length === 0 || isSyncing}
          className={`flex-1 font-bold py-3 px-4 rounded-xl transition-all ${
            validated.length > 0 && !isSyncing
              ? 'bg-[#6af7a2] text-black hover:bg-opacity-90 shadow-[0_0_15px_rgba(106,247,162,0.25)]'
              : 'bg-white/5 text-[#555] cursor-not-allowed'
          }`}
        >
          {isSyncing ? 'Syncing...' : `⬆ Sync ${validated.length > 0 ? validated.length : ''} Questions`}
        </button>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4 mb-4">
          <p className="text-red-400 text-xs font-bold mb-2">⚠ {errors.length} issue(s) found:</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {errors.map((e, i) => (
              <p key={i} className="text-red-400 text-xs font-mono">• {e}</p>
            ))}
          </div>
        </div>
      )}

      {/* Validation success */}
      {validated.length > 0 && errors.length === 0 && (
        <div className="bg-[#6af7a2]/10 border border-[#6af7a2]/20 rounded-xl p-4 mb-4">
          <p className="text-[#6af7a2] text-sm font-bold mb-2">✅ {validated.length} questions valid — ready to sync</p>
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {validated.map((line, i) => {
              const id = line.split('\t')[0];
              const q  = line.split('\t')[3]?.substring(0, 55);
              return (
                <p key={i} className="text-[#888] text-xs font-mono">
                  <span className="text-white">{id}</span> — {q}...
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className="flex gap-4 mt-2 text-sm font-bold">
          <span className="text-[#6af7a2]">✅ Saved: {syncResult.saved}</span>
          <span className="text-[#f7d26a]">⚠ Skipped: {syncResult.skipped}</span>
          <span className="text-red-400">❌ Failed: {syncResult.failed}</span>
        </div>
      )}
    </div>
  );
};

window.Validator = Validator;
