/**
 * book.js
 * Logic only — assemble book, generate HTML/PDF, handle 15-day download limit.
 */

function getDownloadRecord(examKey){
    try{
        const raw = localStorage.getItem(`nish_book_dl_${examKey}`);
        return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
}

function setDownloadRecord(examKey){
    localStorage.setItem(`nish_book_dl_${examKey}`, JSON.stringify({ downloadedAt: Date.now() }));
}

function checkDownloadLimit(examKey){
    const { CACHE_EXPIRY_MS } = window.BOOK_CONFIG;
    const record = getDownloadRecord(examKey);
    if(!record) return { allowed: true };
    const elapsed = Date.now() - record.downloadedAt;
    if(elapsed < CACHE_EXPIRY_MS){
        const nextDate = new Date(record.downloadedAt + CACHE_EXPIRY_MS);
        return {
            allowed: false,
            nextDate: nextDate.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
        };
    }
    return { allowed: true };
}

function showStatus(msg, type='info'){
    const el = document.getElementById('status-msg');
    el.textContent = msg;
    el.className = 'status-msg ' + type;
    el.style.display = 'block';
}

function hideStatus(){
    document.getElementById('status-msg').style.display = 'none';
}

function setLoading(on){
    document.getElementById('download-btn-html').disabled = on;
    document.getElementById('download-btn-pdf').disabled = on;
    document.getElementById('loader').style.display = on ? 'flex' : 'none';
}

window.startDownload = async function(format){
    const examKey = document.getElementById('exam-select').value;
    const exam = window.BOOK_CONFIG.EXAMS[examKey];
    hideStatus();

    // Check 15-day limit
    const limit = checkDownloadLimit(examKey);
    if(!limit.allowed){
        showStatus(`⛔ You already downloaded the ${exam.label} book. Next download available on ${limit.nextDate}.`, 'err');
        return;
    }

    setLoading(true);
    showStatus('⏳ Fetching questions from database...', 'info');

    try{
        const sections = await window.getBookData(examKey);
        showStatus('📖 Assembling your book...', 'info');

        const html = buildBookHTML(exam, sections, examKey);

        if(format === 'html'){
            downloadHTML(html, `Nish-Logic_${exam.label.replace('/','_')}_MCQ_Book.html`);
        } else {
            downloadPDF(html, exam.label);
        }

        setDownloadRecord(examKey);
        hideStatus();
        showStatus(`✅ ${exam.label} book downloaded! Next download available in 15 days.`, 'ok');
    }catch(e){
        console.error('Book generation failed:', e);
        showStatus('⛔ Failed to generate book: ' + e.message, 'err');
    }finally{
        setLoading(false);
    }
};

function buildBookHTML(exam, sections, examKey){
    const date = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
    let totalQ = 0;
    exam.sections.forEach(sec => { totalQ += (sections[sec.key]||[]).length; });

    let sectionsHTML = '';
    exam.sections.forEach((sec, si) => {
        const qs = sections[sec.key] || [];
        if(qs.length === 0) return;
        let qHTML = '';
        qs.forEach((q, qi) => {
            const num = qi + 1;
            const opts = q.options.map((o, oi) => {
                const letter = ['A','B','C','D'][oi];
                return `<div class="option"><span class="opt-letter">${letter}.</span> ${o}</div>`;
            }).join('');
            qHTML += `
            <div class="question-block">
                <div class="q-num-row"><span class="q-num">Q${num}.</span><span class="q-topic">${q.topic||sec.label}</span></div>
                <div class="q-text">${q.question}</div>
                <div class="options-grid">${opts}</div>
                <div class="answer-row">
                    <span class="ans-label">Answer:</span>
                    <span class="ans-text">${q.correct_answer}</span>
                </div>
                ${q.explanation ? `<div class="explanation"><strong>Explanation:</strong> ${q.explanation}</div>` : ''}
            </div>`;
        });

        sectionsHTML += `
        <div class="section-block" id="section-${sec.key}">
            <div class="section-header">
                <span class="section-num">Section ${si+1}</span>
                <h2 class="section-title">${sec.label}</h2>
                <span class="section-count">${qs.length} Questions</span>
            </div>
            ${qHTML}
        </div>`;
    });

    // Build TOC
    let tocHTML = '';
    exam.sections.forEach((sec, si) => {
        const qs = sections[sec.key] || [];
        tocHTML += `<div class="toc-row"><span class="toc-sec">Section ${si+1} — ${sec.label}</span><span class="toc-count">${qs.length} Qs</span></div>`;
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Nish-Logic — ${exam.label} MCQ Book</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Georgia',serif;background:#fffdf5;color:#1a1a1a;font-size:14px;line-height:1.7;}
  .book-cover{background:linear-gradient(135deg,#1a0a00,#4a2000);color:#fff;padding:80px 60px;text-align:center;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;}
  .cover-brand{font-family:monospace;font-size:12px;letter-spacing:.3em;color:#f59e0b;text-transform:uppercase;margin-bottom:40px;}
  .cover-title{font-size:48px;font-weight:900;letter-spacing:-.02em;margin-bottom:12px;color:#fff;}
  .cover-subtitle{font-size:20px;color:#f59e0b;margin-bottom:40px;font-family:sans-serif;}
  .cover-meta{font-size:13px;color:#aaa;font-family:monospace;line-height:2;}
  .toc-page{padding:60px;page-break-after:always;}
  .toc-title{font-size:28px;font-weight:700;margin-bottom:32px;border-bottom:2px solid #f59e0b;padding-bottom:12px;}
  .toc-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dotted #ccc;font-size:14px;}
  .toc-sec{font-weight:600;}
  .toc-count{color:#888;font-family:monospace;}
  .section-block{padding:40px 60px;page-break-before:always;}
  .section-header{background:linear-gradient(135deg,#1a0a00,#4a2000);color:#fff;padding:24px 32px;border-radius:8px;margin-bottom:32px;display:flex;align-items:center;gap:20px;}
  .section-num{font-family:monospace;font-size:11px;color:#f59e0b;letter-spacing:.2em;text-transform:uppercase;}
  .section-title{font-size:22px;font-weight:700;flex:1;}
  .section-count{font-family:monospace;font-size:12px;color:#f59e0b;}
  .question-block{margin-bottom:28px;padding:20px 24px;background:#fff;border:1px solid #e8e0d0;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;page-break-inside:avoid;}
  .q-num-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
  .q-num{font-family:monospace;font-size:12px;font-weight:700;color:#f59e0b;}
  .q-topic{font-size:11px;color:#888;font-family:monospace;background:#f5f0e8;padding:2px 8px;border-radius:10px;}
  .q-text{font-size:14px;font-weight:600;line-height:1.6;margin-bottom:12px;color:#1a1a1a;}
  .options-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;}
  .option{font-size:13px;color:#333;padding:4px 0;}
  .opt-letter{font-weight:700;color:#f59e0b;margin-right:4px;font-family:monospace;}
  .answer-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
  .ans-label{font-size:11px;font-family:monospace;color:#888;text-transform:uppercase;letter-spacing:.1em;}
  .ans-text{font-size:13px;font-weight:700;color:#16a34a;background:#f0fdf4;padding:2px 10px;border-radius:4px;border:1px solid #bbf7d0;}
  .explanation{font-size:12px;color:#555;background:#fafaf7;padding:10px 14px;border-radius:6px;border:1px solid #e8e0d0;line-height:1.6;}
  .explanation strong{color:#1a1a1a;}
  .book-footer{text-align:center;padding:40px;color:#aaa;font-family:monospace;font-size:11px;border-top:1px solid #e8e0d0;margin-top:40px;}
  @media print{
    .book-cover{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .section-header{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .question-block{page-break-inside:avoid;}
  }
</style>
</head>
<body>
  <div class="book-cover">
    <div class="cover-brand">Nish-Logic Study Series</div>
    <div class="cover-title">${exam.label}</div>
    <div class="cover-subtitle">1000 MCQ Practice Book</div>
    <div class="cover-meta">
      Generated: ${date}<br/>
      Total Questions: ${totalQ}<br/>
      Sections: ${exam.sections.length}<br/>
      nish-logic.web.app
    </div>
  </div>
  <div class="toc-page">
    <div class="toc-title">Table of Contents</div>
    ${tocHTML}
  </div>
  ${sectionsHTML}
  <div class="book-footer">
    Nish-Logic Study Series · ${exam.label} MCQ Book · Generated ${date} · nish-logic.web.app
  </div>
</body>
</html>`;
}

function downloadHTML(html, filename){
    const blob = new Blob([html], {type:'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadPDF(html, examLabel){
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.onload = function(){
        setTimeout(() => {
            win.print();
        }, 500);
    };
}
