const { useState, useEffect } = React;

const BundleExport = () => {
  const [selectedLevel, setSelectedLevel] = useState('');
  const [bundleList, setBundleList] = useState([]);
  const [selectedBundleId, setSelectedBundleId] = useState('');
  const [bundleData, setBundleData] = useState(null);
  const [isLoadingBundles, setIsLoadingBundles] = useState(false);
  const [isLoadingBundle, setIsLoadingBundle] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const bundleConfig = window.Collections?.bundleConfig || {};
  const levels = Object.keys(bundleConfig);

  // Load bundle list when level changes
  useEffect(() => {
    if (levels.length > 0 && !selectedLevel) {
      setSelectedLevel(levels[0]);
    }
  }, [levels]);

  useEffect(() => {
    if (selectedLevel) {
      loadBundleList(selectedLevel);
    }
  }, [selectedLevel]);

  // Load bundle data when selected bundle changes
  useEffect(() => {
    if (selectedBundleId && selectedLevel) {
      loadBundle(selectedBundleId);
    } else {
      setBundleData(null);
    }
  }, [selectedBundleId, selectedLevel]);

  const loadBundleList = async (levelName) => {
    setIsLoadingBundles(true);
    setBundleList([]);
    setSelectedBundleId('');
    
    try {
      const config = bundleConfig[levelName];
      if (!config) return;

      const colRef = window.Firebase.fsCollection(config.bundleCol);
      const snapshot = await window.Firebase.fsGetDocs(colRef);
      
      const bundles = [];
      snapshot.forEach(doc => {
        if (doc.id !== '_template') {
          const data = doc.data();
          bundles.push({
            id: doc.id,
            totalQuestions: data.totalQuestions || 0,
            createdAt: data.createdAt
          });
        }
      });

      // Sort by ID ascending
      bundles.sort((a, b) => a.id.localeCompare(b.id));
      
      setBundleList(bundles);
      if (bundles.length > 0) {
        setSelectedBundleId(bundles[0].id);
      }
    } catch (error) {
      console.error("Error loading bundles:", error);
    } finally {
      setIsLoadingBundles(false);
    }
  };

  const loadBundle = async (bundleId) => {
    setIsLoadingBundle(true);
    try {
      const config = bundleConfig[selectedLevel];
      const docRef = window.Firebase.fsDoc(config.bundleCol, bundleId);
      const docSnap = await window.Firebase.fsGetDoc(docRef);
      
      if (docSnap.exists()) {
        setBundleData(docSnap.data());
      } else {
        setBundleData(null);
      }
    } catch (error) {
      console.error("Error loading bundle data:", error);
      setBundleData(null);
    } finally {
      setIsLoadingBundle(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const generateTXT = () => {
    if (!bundleData) return;
    setIsExporting(true);

    try {
      const now = new Date().toLocaleString();
      let content = `NISH-LOGIC BUNDLE EXPORT\n`;
      content += `Level: ${selectedLevel}\n`;
      content += `Bundle: ${selectedBundleId}\n`;
      content += `Total Questions: ${bundleData.totalQuestions}\n`;
      content += `Generated: ${now}\n`;
      content += `════════════════════════════════════════\n\n`;

      bundleData.questions.forEach((q, index) => {
        content += `---\n`;
        content += `Q${index + 1}. ${q.question}\n\n`;
        content += `A) ${q.options[0]}\n`;
        content += `B) ${q.options[1]}\n`;
        content += `C) ${q.options[2]}\n`;
        content += `D) ${q.options[3]}\n\n`;
        content += `Answer: ${q.answer}\n\n`;
        content += `Explanation: ${q.explanation}\n`;
        content += `---\n\n`;
      });

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nish-logic_${selectedBundleId}_${selectedLevel}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("TXT Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const generatePDF = () => {
    if (!bundleData) return;
    setIsExporting(true);

    try {
      const printId = 'nish-print';
      const existing = document.getElementById(printId);
      if (existing) existing.remove();

      const printDiv = document.createElement('div');
      printDiv.id = printId;
      
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          body > *:not(#${printId}) { display: none !important; }
          #${printId} { display: block !important; }
          @page { margin: 2cm; }
        }
        #${printId} {
          display: none;
          font-family: Arial, sans-serif;
          color: black;
          background: white;
          padding: 20px;
          line-height: 1.5;
        }
        .print-header {
          border-bottom: 2px solid #333;
          margin-bottom: 30px;
          padding-bottom: 10px;
        }
        .print-header h1 { margin: 0; font-size: 24pt; }
        .print-header p { margin: 5px 0; font-size: 12pt; color: #555; }
        .question-box {
          border: 1px solid #ddd;
          padding: 15px;
          margin-bottom: 20px;
          page-break-inside: avoid;
          border-radius: 8px;
        }
        .question-text {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .options-list {
          margin-bottom: 10px;
          list-style: none;
          padding: 0;
        }
        .option-item {
          margin-bottom: 4px;
          font-size: 12pt;
        }
        .answer-text {
          font-weight: bold;
          color: #2c7a7b;
          margin-top: 10px;
          font-size: 12pt;
        }
        .explanation-text {
          margin-top: 8px;
          font-style: italic;
          color: #444;
          font-size: 11pt;
        }
      `;

      let html = `
        <div class="print-header">
          <h1>NISH-LOGIC BUNDLE EXPORT</h1>
          <p><strong>Level:</strong> ${selectedLevel}</p>
          <p><strong>Bundle:</strong> ${selectedBundleId}</p>
          <p><strong>Total Questions:</strong> ${bundleData.totalQuestions}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `;

      bundleData.questions.forEach((q, index) => {
        html += `
          <div class="question-box">
            <div class="question-text">Q${index + 1}. ${q.question}</div>
            <div class="options-list">
              <div class="option-item">A) ${q.options[0]}</div>
              <div class="option-item">B) ${q.options[1]}</div>
              <div class="option-item">C) ${q.options[2]}</div>
              <div class="option-item">D) ${q.options[3]}</div>
            </div>
            <div class="answer-text">Answer: ${q.answer}</div>
            <div class="explanation-text"><strong>Explanation:</strong> ${q.explanation}</div>
          </div>
        `;
      });

      printDiv.innerHTML = html;
      document.body.appendChild(style);
      document.body.appendChild(printDiv);

      window.print();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(style);
        document.body.removeChild(printDiv);
        setIsExporting(false);
      }, 500);

    } catch (error) {
      console.error("PDF Export failed:", error);
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-[#1a1a2e] text-white p-6 rounded-2xl shadow-2xl max-w-2xl mx-auto border border-white/5">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2 h-8 bg-[#5dcaa5] rounded-full"></div>
          <h1 className="text-2xl font-bold tracking-tight">Bundle Export</h1>
        </div>
        <p className="text-[#888] text-sm ml-5">Export bundles as TXT or PDF for podcast generation</p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Level Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888] ml-1">Exam Level</label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#5dcaa5] transition-colors appearance-none cursor-pointer"
          >
            {levels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        {/* Step 2: Bundle Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888] ml-1">Bundle</label>
          <div className="relative">
            <select
              value={selectedBundleId}
              onChange={(e) => setSelectedBundleId(e.target.value)}
              disabled={isLoadingBundles || bundleList.length === 0}
              className="w-full bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#5dcaa5] transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingBundles ? (
                <option>Loading bundles...</option>
              ) : bundleList.length === 0 ? (
                <option>No bundles available</option>
              ) : (
                bundleList.map(bundle => (
                  <option key={bundle.id} value={bundle.id}>
                    {bundle.id} — {bundle.totalQuestions} questions — {formatDate(bundle.createdAt)}
                  </option>
                ))
              )}
            </select>
            {isLoadingBundles && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[#5dcaa5] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        {/* Bundle Info Card */}
        {bundleData && !isLoadingBundle && (
          <div className="bg-[#0f0f1a] rounded-xl border border-white/5 p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 text-lg font-bold">
              <span>📦</span>
              <span>{selectedBundleId}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-[#888]">Total questions</p>
                <p className="font-medium">{bundleData.totalQuestions}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[#888]">Created</p>
                <p className="font-medium">{formatDate(bundleData.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[#888]">Level</p>
                <p className="font-medium">{bundleData.level || selectedLevel}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading Bundle State */}
        {isLoadingBundle && (
          <div className="bg-[#0f0f1a] rounded-xl border border-white/5 p-8 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#7c6af7] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-[#888]">Fetching bundle content...</p>
          </div>
        )}

        {/* Export Buttons */}
        {bundleData && !isLoadingBundle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={generateTXT}
                disabled={isExporting}
                className="bg-[#5dcaa5] hover:bg-[#4bb894] text-black font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Download TXT</span>
              </button>
              <button
                onClick={generatePDF}
                disabled={isExporting}
                className="bg-[#7c6af7] hover:bg-[#6b59e6] text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Download PDF</span>
              </button>
            </div>
            
            {isExporting && (
              <p className="text-center text-sm text-[#5dcaa5] animate-pulse font-medium">
                Generating... please wait
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

window.BundleExport = BundleExport;
