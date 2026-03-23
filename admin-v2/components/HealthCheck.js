const { useState, useEffect } = React;

/**
 * HealthCheckPanel Component
 * Shows a full health check dashboard for the Nish-Logic ecosystem.
 * Loaded via CDN React + Babel standalone.
 */
const HealthCheckPanel = () => {
  // COMPONENT STATE
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [summary, setSummary] = useState(null);
  const [expandedCheck, setExpandedCheck] = useState(null);

  // BEHAVIOUR: Run Health Check
  const runChecks = async () => {
    setIsRunning(true);
    setSummary(null);
    setExpandedCheck(null);
    
    try {
      // Gemini API key: read from localStorage
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      
      // GLOBALS AVAILABLE: window.Firebase.db, window.HealthCheck.runAllChecks
      if (window.HealthCheck && typeof window.HealthCheck.runAllChecks === 'function') {
        const result = await window.HealthCheck.runAllChecks(window.Firebase.db, apiKey);
        setSummary(result);
        setLastRun(new Date());
      } else {
        console.error("HealthCheck library (window.HealthCheck) not found.");
      }
    } catch (error) {
      console.error("Health check execution failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-run on mount: YES
  useEffect(() => {
    runChecks();
  }, []);

  // Date formatting helper
  const formatDate = (date) => {
    if (!date) return "Never run";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  };

  // Status badge helper
  const getStatusBadge = (status) => {
    if (isRunning) return <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white/50 animate-pulse">...</span>;
    if (!status) return <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-white/30">—</span>;
    
    switch (status.toLowerCase()) {
      case 'ok': 
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6af7a2]/20 text-[#6af7a2]">OK</span>;
      case 'warn': 
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f7d26a]/20 text-[#f7d26a]">WARN</span>;
      case 'error': 
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f76a6a]/20 text-[#f76a6a]">ERROR</span>;
      default: 
        return <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-white/30">—</span>;
    }
  };

  const checks = window.HealthCheck?.CHECKS || {};

  return (
    <div className="space-y-6 text-white p-6 bg-[#1a1a2e] min-h-full rounded-2xl">
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-[#f7a26a] rounded-full"></div>
          <h2 className="text-2xl font-bold tracking-tight">Health Check</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#888]">Last run: {formatDate(lastRun)}</span>
          <button 
            onClick={runChecks}
            disabled={isRunning}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              isRunning 
                ? 'bg-[#f7a26a]/50 text-black animate-pulse cursor-not-allowed' 
                : 'bg-[#f7a26a] text-black hover:bg-[#f7a26a]/90 active:scale-95'
            }`}
          >
            {isRunning ? 'Checking...' : 'Run Health Check'}
          </button>
        </div>
      </div>

      {/* OVERALL STATUS BANNER */}
      {summary && !isRunning && (
        <div className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all duration-500 ${
          summary.overall === 'ok' ? 'bg-[#6af7a2]/10 border-[#6af7a2]/20 text-[#6af7a2]' :
          summary.overall === 'warn' ? 'bg-[#f7d26a]/10 border-[#f7d26a]/20 text-[#f7d26a]' :
          'bg-[#f76a6a]/10 border-[#f76a6a]/20 text-[#f76a6a]'
        }`}>
          <span className="text-xl">
            {summary.overall === 'ok' ? '✅' : summary.overall === 'warn' ? '⚠️' : '❌'}
          </span>
          <span className="font-bold">
            {summary.overall === 'ok' ? 'All Systems Operational' : 
             summary.overall === 'warn' ? 'Some Systems Need Attention' : 
             'Critical Issues Detected'}
          </span>
        </div>
      )}

      {/* 5 CHECK CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(checks).map(([key, name]) => {
          const checkResult = summary?.results?.find(r => r.name === name);
          const isExpanded = expandedCheck === key;
          const hasDetails = checkResult?.detail && checkResult.detail.length > 0;

          return (
            <div key={key} className={`bg-[#0f0f1a] rounded-xl border border-white/5 p-4 transition-all duration-300 ${isRunning ? 'animate-pulse' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <span className="font-bold text-sm">{name}</span>
                {getStatusBadge(checkResult?.status)}
              </div>
              
              <div className="text-xs text-[#888] mb-3 truncate">
                {isRunning ? 'Checking...' : (checkResult?.message || (summary ? 'No data' : '—'))}
              </div>

              {hasDetails && !isRunning && (
                <div className="mt-2">
                  <button 
                    onClick={() => setExpandedCheck(isExpanded ? null : key)}
                    className="text-[10px] text-[#f7a26a] hover:underline flex items-center gap-1"
                  >
                    {isExpanded ? '▲ Hide' : '▼ Details'}
                  </button>
                  
                  {isExpanded && (
                    <div className="mt-2 p-2 bg-black/40 rounded border border-white/5 max-h-32 overflow-y-auto font-mono text-[10px] text-white/70 space-y-1 custom-scrollbar">
                      {checkResult.detail.map((detail, idx) => (
                        <div key={idx} className="whitespace-pre-wrap border-b border-white/5 pb-1 last:border-0">{detail}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* EMPTY STATE */}
      {!summary && !isRunning && (
        <div className="flex flex-col items-center justify-center py-20 bg-[#0f0f1a]/50 rounded-2xl border border-dashed border-white/10">
          <div className="text-5xl mb-4 opacity-20">🩺</div>
          <p className="text-[#888] text-sm">Click Run Health Check to diagnose all systems</p>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(247, 162, 106, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(247, 162, 106, 0.4);
        }
      `}</style>
    </div>
  );
};

// Export to window global
window.HealthCheckPanel = HealthCheckPanel;
