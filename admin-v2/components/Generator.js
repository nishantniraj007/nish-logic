const { useState, useEffect } = React;

const Generator = ({ level, type }) => {
  const { fsDoc, fsGetDoc }                                      = window.Firebase;
  const { resolveCollection, levelProfiles, getExplanationRule } = window.Collections;
  const { generateSystemRole, generateUserMessage }               = window.Prompt;

  const [count, setCount]               = useState(10);
  const [apiKey, setApiKey]             = useState(localStorage.getItem('gemini_api_key') || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus]             = useState('');
  const [statusType, setStatusType]     = useState('');
  const [lastSynced, setLastSynced]     = useState(null);

  useEffect(() => { if (level && type) fetchMeta(); }, [level, type]);

  const fetchMeta = async () => {
    try {
      const metaSnap = await fsGetDoc(fsDoc(resolveCollection(level, type), '_meta'));
      setLastSynced(metaSnap.exists() ? metaSnap.data().lastSynced?.toDate() : null);
    } catch (e) {}
  };

  const handleApiKeyChange = (e) => {
    setApiKey(e.target.value);
    localStorage.setItem('gemini_api_key', e.target.value);
  };

  const handleGenerate = async () => {
    if (!apiKey) { setStatusType('err'); setStatus('Enter your Gemini API key.'); return; }

    setIsGenerating(true);
    setStatus('');
    setStatusType('');

    // Fire empty event to clear Validator textarea immediately
    window.dispatchEvent(new CustomEvent('nish-generated', { detail: '' }));

    const lp              = levelProfiles[level];
    const explanationRule = getExplanationRule(level, type);
    const systemRole      = generateSystemRole();
    const userMsg         = generateUserMessage(level, type, count, lp, explanationRule);

    // AbortController — 4 minute safety timeout
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 240000);

    const models  = ['gemini-2.5-flash', 'gemini-2.5-flash-lite-preview'];
    let succeeded = false;
    let lastError = '';

    for (const model of models) {
      setStatus(`Streaming from ${model}...`);
      try {
        // Use streamGenerateContent endpoint for live streaming
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemRole }] },
              contents: [{ role: 'user', parts: [{ text: userMsg }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 65536 }
            })
          }
        );

        if (!res.ok) {
          const err = await res.json();
          lastError = err.error?.message || `HTTP ${res.status}`;
          if (res.status === 429) continue;
          throw new Error(lastError);
        }

        // Read SSE stream token by token
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // SSE lines look like: data: {"candidates":[...]}
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const token  = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (token) {
                accumulated += token;
                // Fire event with accumulated text so far — Validator updates live
                window.dispatchEvent(new CustomEvent('nish-stream', { detail: accumulated }));
              }
            } catch (e) { /* partial chunk, skip */ }
          }
        }

        if (accumulated) {
          // Final fire with complete clean text
          window.dispatchEvent(new CustomEvent('nish-generated', { detail: accumulated.trim() }));
          succeeded = true;
          break;
        }

      } catch (e) {
        if (e.name === 'AbortError') {
          setStatusType('err');
          setStatus('Request timed out after 4 minutes. Try fewer questions.');
          setIsGenerating(false);
          clearTimeout(timeout);
          return;
        }
        lastError = e.message;
        continue;
      }
    }

    clearTimeout(timeout);
    setIsGenerating(false);

    if (!succeeded) {
      setStatusType('err');
      setStatus('All models exhausted. Last error: ' + lastError);
      return;
    }

    setStatusType('ok');
    setStatus(`Done! ${count} questions streamed to Validator. Review → Validate → Sync.`);
  };

  const lp            = levelProfiles[level] || {};
  const explanRule    = getExplanationRule(level, type);
  const promptPreview = `[SYSTEM]\n${generateSystemRole()}\n\n[USER]\n${generateUserMessage(level, type, count, lp, explanRule)}`;

  return (
    <div className="bg-[#1a1a2e] p-6 rounded-2xl border border-white/5 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-2 h-6 bg-[#7c6af7] rounded-full"></span>
          Generator
        </h2>
        {lastSynced && (
          <span className="text-xs text-[#888]">
            Last synced: {lastSynced.toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-xs font-bold text-[#888] uppercase mb-2">Gemini API Key (BYOK)</label>
          <input
            type="password"
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="Enter API Key — saved locally"
            className="w-full bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#7c6af7]"
          />
          <p className="text-[10px] text-[#555] mt-1">Key never leaves your browser. Stored in localStorage.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-[#888] uppercase mb-2">Question Count (P11a)</label>
          <select
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
            className="w-full bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#7c6af7]"
          >
            <option value={10}>10 Questions</option>
            <option value={25}>25 Questions</option>
            <option value={50}>50 Questions</option>
            <option value={99}>99 Questions</option>
          </select>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-bold text-[#888] uppercase">Prompt Preview</label>
          <button onClick={() => navigator.clipboard.writeText(promptPreview)} className="text-xs text-[#7c6af7] hover:underline">
            Copy Prompt
          </button>
        </div>
        <textarea
          readOnly
          value={promptPreview}
          className="w-full h-32 bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-[#888] resize-none"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
          isGenerating
            ? 'bg-[#1a1a2e] text-[#7c6af7] border-2 border-[#7c6af7] cursor-not-allowed animate-pulse'
            : 'bg-[#7c6af7] hover:bg-opacity-90 shadow-[0_0_20px_rgba(124,106,247,0.3)]'
        }`}
      >
        {isGenerating ? (status || 'Streaming...') : 'Generate with Gemini'}
      </button>

      {status && !isGenerating && (
        <p className={`mt-4 text-sm ${statusType === 'ok' ? 'text-[#6af7a2]' : 'text-red-400'}`}>{status}</p>
      )}
    </div>
  );
};

window.Generator = Generator;
