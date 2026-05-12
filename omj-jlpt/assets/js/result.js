// assets/js/result.js â€” Redesigned Result Engine

document.addEventListener('DOMContentLoaded', async () => {
    const __lang = window.__resultLang || localStorage.getItem('lang') || 'en';
    const __dashTarget = window.__dashTarget || 'dashboard.html';

    // Motivational Feedback Engine 
    const FEEDBACK = {
        excellent: {
            icon: '🦋', title: 'Outstanding Performance!',
            quote: '” Hard work always pays off. Your dedication to Japanese study is truly remarkable. Keep this momentum going!',
            tips: [
                { icon: '⚪¯', title: 'Maintain Your Edge', text: 'Challenge yourself with higher difficulty N-level questions and past official JLPT papers to stay sharp.' },
                { icon: '⚫', title: 'Deep Dive Reading', text: 'Read native Japanese content â€” newspapers, manga, light novels â€” to reinforce your skills naturally.' },
                { icon: '🟠', title: 'Speaking Practice', text: 'Convert your exam knowledge into real conversation. Find a language partner or use platforms like HelloTalk.' }
            ]
        },
        good: {
            icon: '📌¸', title: 'Great Progress!',
            quote: '” Step by step. You\'re making genuine progress. Each study session brings you closer to your JLPT goal.',
            tips: [
                { icon: '🟣', title: 'Review Weak Sections', text: 'Focus extra study time on the sections where you scored below 60%. Targeted practice yields the fastest gains.' },
                { icon: '🔵', title: 'Timed Practice', text: 'Practice answering under exam time conditions to improve your speed and reduce second-guessing.' },
                { icon: '🟢', title: 'Keep a Mistake Journal', text: 'Write down questions you got wrong and why. Reviewing your mistakes is the #1 most effective study method.' }
            ]
        },
        average: {
            icon: '🪜', title: 'You\'re Growing!',
            quote: '” Failure is the foundation of success. Every attempt is data. Every mistake is a lesson in disguise.',
            tips: [
                { icon: '🟡', title: 'Build Your Foundation', text: 'Focus on the core vocabulary and grammar patterns for your JLPT level. A strong foundation makes everything else easier.' },
                { icon: '🟣', title: 'Daily Listening', text: 'Listen to Japanese for at least 20 minutes daily â€” podcasts, anime, or YouTube. Immersion dramatically improves Choukai scores.' },
                { icon: '🔴', title: 'Flashcard System', text: 'Use Anki or similar spaced-repetition tools for vocabulary and kanji. 30 cards a day = over 10,000 words in a year.' }
            ]
        },
        beginner: {
            icon: '🐛', title: 'Every Expert Starts Here',
            quote: '” A journey of a thousand miles begins with a single step. You\'ve taken that step today. That matters more than the score.',
            tips: [
                { icon: '🟣', title: 'Start with the Basics', text: 'Master hiragana and katakana first. These are the building blocks of everything. Apps like Duolingo or Tofugu can help.' },
                { icon: '🟡', title: 'Consistency Over Intensity', text: 'Study 20 minutes daily rather than 4 hours once a week. Consistency is the true secret to language acquisition.' },
                { icon: '🟢', title: 'Join a Community', text: 'Connect with other JLPT learners on Reddit (r/LearnJapanese), Discord servers, or local study groups for motivation.' }
            ]
        }
    };

    const SECTION_TIPS = {
        kanji: { icon: '📖', title: 'Boost Your Kanji Score', text: 'Study kanji using the radical decomposition method. Learn the meaning of common radicals and use them to guess unfamiliar kanji.' },
        bunpou: { icon: '✏️ ', title: 'Streng then Your Grammar', text: 'Focus on grammar patterns specific to your JLPT level. Practice sentence construction and fill-in-the-blank exercises daily.' },
        choukai: { icon: '🎧', title: 'Improve Your Listening', text: 'Immerse yourself in native Japanese audio. Try shadowing techniques: listen, pause, repeat. Your ear will train quickly.' }
    };

    const SECTION_META = {
        kanji: { name: 'Kanji', jp: 'かんじ', icon: '📖', cls: 'kanji' },
        bunpou: { name: 'Bunpou', jp: 'ぶんぽう', icon: '✏️', cls: 'bunpou' },
        choukai: { name: 'Choukai', jp: 'ちょうかい', icon: '🎧', cls: 'choukai' }
    };

    // Load result data 
    let user = OmoshiroiUtils.getUser();
    if (!user) user = { name: 'Trial Guest', role: 'guest' };

    let resultData = null;
    let isHistoricalView = false;
    const selectedHistoryId = localStorage.getItem('selected_history_id');

    if (selectedHistoryId) {
        const history = OmoshiroiUtils.getUserHistory(user);
        const item = history.find(h => h.test_id === selectedHistoryId);
        if (item) {
            resultData = {
                level: item.level,
                answers: item.answers.reduce((acc, a) => { acc[a.question_id] = a.user_answer; return acc; }, {}),
                timestamp: new Date(item.date).getTime()
            };
            isHistoricalView = true;
        }
        localStorage.removeItem('selected_history_id');
    }

    if (!resultData) resultData = JSON.parse(localStorage.getItem('omoshiroi_latest_result'));
    if (!resultData) { window.location.href = __dashTarget; return; }

    const { level, answers, timestamp } = resultData;

    // Fetch question data
    let rawData;
    try {
        const res = await fetch(`../data/${level}.json`);
        rawData = await res.json();
    } catch (e) {
        console.error('Failed to load question data:', e);
        alert('Failed to load results data. Please try again.');
        return;
    }

    const sections = rawData.sections || [];
    const allQuestions = sections.flatMap(s => s.questions);
    const totalCount = allQuestions.length;

    // Score per section
    let totalCorrect = 0;
    const sectionStats = {};
    const evaluation = [];

    sections.forEach(sec => {
        let correct = 0;
        sec.questions.forEach(q => {
            const userAns = answers[q.id];
            const isCorrect = userAns === q.correctAnswer;
            if (isCorrect) { correct++; totalCorrect++; }
            evaluation.push({ id: q.id, question: q.question, sectionId: sec.id, userAns: userAns || null, correctAnswer: q.correctAnswer, isCorrect });
        });
        sectionStats[sec.id] = {
            id: sec.id,
            total: sec.questions.length,
            correct,
            wrong: sec.questions.length - correct,
            pct: sec.questions.length > 0 ? Math.round((correct / sec.questions.length) * 100) : 0
        };
    });

    const totalScore = totalCount > 0 ? (totalCorrect / totalCount) * 100 : 0;

    // Save history
    if (!isHistoricalView) {
        const testId = `${level}-${timestamp}`;
        const robustResult = {
            test_id: testId, level, score: totalScore, correct: totalCorrect,
            wrong: totalCount - totalCorrect, total: totalCount,
            date: new Date(timestamp).toISOString(),
            answers: evaluation.map(e => ({ question_id: e.id, user_answer: e.userAns, correct_answer: e.correctAnswer }))
        };
        const history = OmoshiroiUtils.getUserHistory(user);
        if (!history.find(h => h.test_id === testId)) OmoshiroiUtils.saveResult(user, robustResult);
    }

    // Populate Hero
    document.getElementById('levelBadge').textContent = level;
    document.getElementById('totalScorePct').textContent = `${totalScore.toFixed(1)}%`;
    document.getElementById('totalFraction').textContent = `${totalCorrect} / ${totalCount}`;
    document.getElementById('resultDate').textContent = new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Animate Score Ring
    const circumference = 2 * Math.PI * 50; // r=50
    const ringFill = document.getElementById('scoreRingFill');
    const offset = circumference - (totalScore / 100) * circumference;
    setTimeout(() => {
        ringFill.style.strokeDashoffset = offset;
        // Color by score
        if (totalScore >= 70) ringFill.style.stroke = '#2ecc71';
        else if (totalScore >= 50) ringFill.style.stroke = '#f39c12';
        else ringFill.style.stroke = '#e74c3c';
    }, 200);

    // Verdict badge
    const verdictBadge = document.getElementById('verdictBadge');
    if (totalScore >= 70) { verdictBadge.textContent = '“ Passed'; verdictBadge.className = 'verdict-badge verdict-pass'; }
    else if (totalScore >= 50) { verdictBadge.textContent = '~ Keep Going'; verdictBadge.className = 'verdict-badge verdict-avg'; }
    else { verdictBadge.textContent = '🌱 Needs Practice'; verdictBadge.className = 'verdict-badge verdict-fail'; }

    // Section Cards
    const grid = document.getElementById('sectionCardsGrid');
    const sectionOrder = ['kanji', 'bunpou', 'choukai'];
    const circumSmall = 2 * Math.PI * 44; // r=44

    sectionOrder.forEach((secId, idx) => {
        const st = sectionStats[secId];
        if (!st) return;
        const meta = SECTION_META[secId];
        const offset = circumSmall - (st.pct / 100) * circumSmall;

        const card = document.createElement('div');
        card.className = `sec-card ${meta.cls}`;
        card.innerHTML = `
            <div class="sec-card-header">
                <div class="sec-card-icon">${meta.icon}</div>
                <div>
                    <div class="sec-card-title">${meta.name}</div>
                    <div class="sec-card-jp">${meta.jp}</div>
                </div>
            </div>
            <div class="sec-ring-wrap">
                <svg class="sec-ring-svg" viewBox="0 0 100 100">
                    <circle class="sec-ring-bg" cx="50" cy="50" r="44"/>
                    <circle class="sec-ring-fill sec-fill-${secId}" cx="50" cy="50" r="44"
                        stroke-dasharray="${circumSmall}"
                        stroke-dashoffset="${circumSmall}"/>
                </svg>
                <div class="sec-ring-label">
                    <span class="sec-ring-pct">${st.pct}%</span>
                    <span class="sec-ring-sub">correct</span>
                </div>
            </div>
            <div class="sec-stats">
                <div>
                    <span class="sec-stat-val sec-correct-val">${st.correct}</span>
                    <span class="sec-stat-label">Correct</span>
                </div>
                <div style="width:1px;background:var(--r-border);"></div>
                <div>
                    <span class="sec-stat-val sec-wrong-val">${st.wrong}</span>
                    <span class="sec-stat-label">Wrong</span>
                </div>
                <div style="width:1px;background:var(--r-border);"></div>
                <div>
                    <span class="sec-stat-val">${st.total}</span>
                    <span class="sec-stat-label">Total</span>
                </div>
            </div>
        `;
        grid.appendChild(card);

        // Animate ring with stagger
        setTimeout(() => {
            const fillEl = card.querySelector(`.sec-fill-${secId}`);
            if (fillEl) fillEl.style.strokeDashoffset = offset;
        }, 300 + idx * 200);
    });

    // Overall Chart
    const ctx = document.getElementById('resultChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Correct', 'Wrong'],
            datasets: [{
                data: [totalCorrect, totalCount - totalCorrect],
                backgroundColor: ['#2ecc71', '#e9ecef'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '72%',
            plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter' } } } }
        }
    });

    // Summary Rows
    const summaryEl = document.getElementById('summaryRows');
    const summaryData = [
        { icon: '🧩', label: 'Total Correct', val: totalCorrect, pct: totalScore },
        ...sectionOrder.map(id => {
            const st = sectionStats[id];
            const m = SECTION_META[id];
            return st ? { icon: m.icon, label: m.name, val: `${st.correct}/${st.total}`, pct: st.pct, color: id } : null;
        }).filter(Boolean)
    ];

    summaryData.forEach(row => {
        const el = document.createElement('div');
        el.className = 'summary-row';
        const barColor = row.pct >= 70 ? '#2ecc71' : row.pct >= 50 ? '#f39c12' : '#e74c3c';
        el.innerHTML = `
            <span class="summary-row-icon">${row.icon}</span>
            <span class="summary-row-label">${row.label}</span>
            <div class="summary-bar-wrap"><div class="summary-bar" style="width:0%;background:${barColor};" data-target="${row.pct}"></div></div>
            <span class="summary-row-val">${row.val}</span>
        `;
        summaryEl.appendChild(el);
    });
    setTimeout(() => {
        summaryEl.querySelectorAll('.summary-bar').forEach(bar => {
            bar.style.width = `${bar.dataset.target}%`;
        });
    }, 400);

    // Motivational Tips
    let feedbackKey = 'beginner';
    if (totalScore >= 80) feedbackKey = 'excellent';
    else if (totalScore >= 60) feedbackKey = 'good';
    else if (totalScore >= 40) feedbackKey = 'average';

    const feedback = FEEDBACK[feedbackKey];
    document.getElementById('tipsIcon').textContent = feedback.icon;
    document.getElementById('tipsTitle').textContent = feedback.title;
    document.getElementById('tipsSub').textContent = `${totalScore.toFixed(1)}% ${totalCorrect} correct out of ${totalCount} questions`;
    document.getElementById('tipsQuote').textContent = feedback.quote;

    const tipsGrid = document.getElementById('tipsGrid');
    const allTips = [...feedback.tips];

    // Add weak section tips
    const weakSections = sectionOrder.filter(id => sectionStats[id] && sectionStats[id].pct < 60);
    weakSections.forEach(id => {
        const st = SECTION_TIPS[id];
        if (st) allTips.push(st);
    });

    allTips.forEach(tip => {
        const el = document.createElement('div');
        el.className = 'tip-item';
        el.innerHTML = `
            <div class="tip-item-icon">${tip.icon}</div>
            <div class="tip-item-title">${tip.title}</div>
            <div class="tip-item-text">${tip.text}</div>
        `;
        tipsGrid.appendChild(el);
    });

    // Result ID & QR
    const resultId = `OJ-${level}-${timestamp.toString(36).toUpperCase().slice(-8)}`;
    document.getElementById('resultIdText').textContent = `Result ID: ${resultId}`;

    // Generate QR immediately (hidden) so it's ready for PDF embedding
    const shareUrl = `${window.location.origin}${window.location.pathname.replace('result.html', 'dashboard.html')}?resultId=${resultId}`;
    const qrContainer = document.getElementById('qrcode');
    if (qrContainer && typeof QRCode !== 'undefined') {
        try {
            new QRCode(qrContainer, {
                text: shareUrl, width: 160, height: 160,
                colorDark: '#1A2035', colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (e) { console.warn('QR generation failed:', e); }
    }

    document.getElementById('shareQrBtn').addEventListener('click', () => {
        document.getElementById('qrModalBackdrop').classList.remove('hidden');
    });

    document.getElementById('qrModalClose').addEventListener('click', () => {
        document.getElementById('qrModalBackdrop').classList.add('hidden');
    });

    document.getElementById('qrModalBackdrop').addEventListener('click', e => {
        if (e.target === document.getElementById('qrModalBackdrop')) {
            document.getElementById('qrModalBackdrop').classList.add('hidden');
        }
    });

    document.getElementById('downloadQrBtn').addEventListener('click', () => {
        const canvas = document.querySelector('#qrcode canvas');
        if (canvas) {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `omoshiroi_result_${resultId}.png`;
            a.click();
        }
    });

    // Retry button
    document.getElementById('retryBtn').addEventListener('click', () => {
        window.location.href = `level.html?level=${level}`;
    });

    // PDF Export (ASCII-safe jsPDF Helvetica does not support CJK)
    document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', putOnlyUsedFonts: true });
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const M = 18;

        // Load logo
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.src = '../assets/images/logo.png';
        await new Promise(r => { logo.onload = r; logo.onerror = r; });
        const hasLogo = logo.complete && logo.naturalHeight !== 0;

        // Background watermark
        if (hasLogo) {
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.07 }));
            const ws = 75;
            doc.addImage(logo, 'PNG', (pw - ws) / 2, (ph - ws) / 2 - 15, ws, ws);
            doc.restoreGraphicsState();
        }

        // Header bar
        doc.setFillColor(26, 32, 53);
        doc.rect(0, 0, pw, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(15); doc.setFont('helvetica', 'bold');
        doc.text('OMOSHIROI JAPAN', M, 12);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text('Official JLPT Simulation Report', M, 20);
        doc.setFillColor(192, 57, 43);
        doc.roundedRect(pw - M - 22, 7, 19, 12, 3, 3, 'F');
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text(level, pw - M - 12.5, 14.5, { align: 'center' });

        // â”€ Title & Meta â”€
        let y = 38;
        doc.setTextColor(26, 32, 53);
        doc.setFontSize(20); doc.setFont('helvetica', 'bold');
        doc.text('Examination Results', M, y); y += 7;

        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(108, 117, 125);
        const dateStr = new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.text(`Examinee: ${user.name}`, M, y);
        doc.text(`Date: ${dateStr}`, pw / 2 + 5, y); y += 10;

        // â”€ Score box â”€
        doc.setFillColor(248, 249, 251);
        doc.setDrawColor(220, 220, 220);
        doc.roundedRect(M, y, pw - M * 2, 26, 4, 4, 'FD');

        const [sr, sg, sb] = totalScore >= 70 ? [46, 204, 113] : totalScore >= 50 ? [243, 156, 18] : [231, 76, 60];
        doc.setTextColor(sr, sg, sb);
        doc.setFontSize(26); doc.setFont('helvetica', 'bold');
        doc.text(`${totalScore.toFixed(1)}%`, M + 7, y + 17);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
        doc.text(`${totalCorrect} / ${totalCount} correct answers`, M + 7, y + 23);
        const vLabel = totalScore >= 70 ? 'PASSED' : totalScore >= 50 ? 'BORDERLINE' : 'NEEDS PRACTICE';
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 32, 53);
        doc.text(vLabel, pw - M - 5, y + 17, { align: 'right' });
        y += 34;

        // â”€ Section Performance â”€
        doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 32, 53);
        doc.text('Section Performance', M, y); y += 5;
        doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.4);
        doc.line(M, y, pw - M, y); y += 7;

        // ASCII-only labels (jsPDF Helvetica = Latin only, no CJK)
        const pdfSecMeta = {
            kanji: { label: 'Kanji  (Moji & Goi)', col: [67, 97, 238] },
            bunpou: { label: 'Bunpou (Grammar & Reading)', col: [114, 9, 183] },
            choukai: { label: 'Choukai (Listening)', col: [231, 54, 120] }
        };

        ['kanji', 'bunpou', 'choukai'].forEach(secId => {
            const st = sectionStats[secId];
            if (!st) return;
            const { label, col } = pdfSecMeta[secId];

            // Left accent
            doc.setFillColor(...col);
            doc.roundedRect(M, y + 1, 3, 13, 1, 1, 'F');

            // Text
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 32, 53);
            doc.text(label, M + 6, y + 7);
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
            doc.text(`${st.correct} correct  |  ${st.wrong} wrong  |  ${st.total} total`, M + 6, y + 12);

            // Progress bar track
            const bx = M + 105, bw = pw - M - 105 - M;
            doc.setFillColor(230, 230, 230);
            doc.roundedRect(bx, y + 4, bw, 5, 2, 2, 'F');
            // Progress fill (guard against 0 width)
            if (st.pct > 0) {
                doc.setFillColor(...col);
                doc.roundedRect(bx, y + 4, Math.max(bw * (st.pct / 100), 2), 5, 2, 2, 'F');
            }
            // Percentage label
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...col);
            doc.text(`${st.pct}%`, pw - M, y + 9.5, { align: 'right' });
            y += 19;
        });

        //  Motivational quote (strip all CJK Unicode ranges for jsPDF safety) 
        y += 4;
        const safeQuote = feedback.quote
            .replace(/[\u3000-\u9fff\uff00-\uffef\u4e00-\u9faf]/g, '') // strip CJK
            .replace(/\s{2,}/g, ' ')
            .replace(/^\s*[-\u2014]\s*/g, '')
            .trim();

        doc.setDrawColor(192, 57, 43); doc.setLineWidth(0.8);
        doc.line(M, y, M, y + 20);
        doc.setFillColor(254, 249, 249);
        doc.rect(M + 2, y - 1, pw - M * 2 - 2, 22, 'F');
        doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(50, 50, 80);
        const qLines = doc.splitTextToSize(safeQuote, pw - M * 2 - 12);
        doc.text(qLines.slice(0, 3), M + 6, y + 7);
        y += 27;

        // â”€ Study Tips â”€
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 32, 53);
        doc.text('Study Recommendations', M, y); y += 6;
        feedback.tips.slice(0, 3).forEach((tip, i) => {
            doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 80);
            doc.text(`${i + 1}. ${tip.title}`, M + 3, y);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(110, 110, 110);
            const tLines = doc.splitTextToSize(tip.text, pw - M * 2 - 8);
            doc.text(tLines.slice(0, 2), M + 6, y + 4.5);
            y += 13;
        });

        // â”€ Footer â”€
        const fy = ph - 36;
        doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.4);
        doc.line(M, fy, pw - M, fy);

        // Embed QR (already generated at page load)
        const qrCanvas = document.querySelector('#qrcode canvas');
        if (qrCanvas) {
            try {
                doc.addImage(qrCanvas.toDataURL('image/png'), 'PNG', pw - M - 25, fy + 3, 22, 22);
                doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
                doc.text('Scan to verify', pw - M - 14, fy + 27, { align: 'center' });
            } catch (e) { console.warn('QR embed failed:', e); }
        }

        // Footer text (ASCII-safe em dash replacement)
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(140, 140, 140);
        doc.text(`Result ID: ${resultId}`, M, fy + 8);
        doc.text('OMOSHIROI JAPAN  |  omoshiroi.jp', M, fy + 14);
        doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, M, fy + 20);

        // Small watermark logo at footer
        if (hasLogo) {
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.25 }));
            doc.addImage(logo, 'PNG', M, fy + 25, 8, 8);
            doc.restoreGraphicsState();
        }

        doc.save(`OMOSHIROI_${level}_${user.name.replace(/\s+/g, '_')}_${resultId}.pdf`);
    });
});


// ── PDF Export (Using html2canvas for Perfect Typography) ────────
document.getElementById('downloadPdfBtn').addEventListener('click', async function () {
    const btn = this;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="action-btn-icon">⏳</span><span class="action-btn-label">Generating...</span><span class="action-btn-sub">Please wait</span>';
    btn.disabled = true;

    try {
        // Force scroll to top to ensure rendering works correctly
        window.scrollTo(0, 0);

        // We will render the body (excluding header and actions)
        const header = document.querySelector('.result-header');
        const actions = document.querySelector('.result-actions');
        const qrModal = document.getElementById('qrModalBackdrop');
        const tooltip = document.querySelector('.tips-quote'); // Hide temporary tooltips if needed

        if (header) header.style.display = 'none';
        if (actions) actions.style.display = 'none';
        if (qrModal) qrModal.classList.add('hidden');

        // Wait a moment for styles to apply
        await new Promise(r => setTimeout(r, 100));

        const canvas = await html2canvas(document.body, {
            scale: 2, // High resolution
            useCORS: true,
            backgroundColor: '#f8f9fb', // match body bg
            logging: false,
            windowWidth: 1200 // Force desktop width for PDF
        });

        if (header) header.style.display = '';
        if (actions) actions.style.display = '';

        const imgData = canvas.toDataURL('image/png', 1.0);
        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;

        let finalWidth = pdfWidth;
        let finalHeight = finalWidth / ratio;

        // If the content is too long, we scale it to fit or allow multiple pages.
        if (finalHeight > pdfHeight) {
            finalHeight = pdfHeight;
            finalWidth = finalHeight * ratio;
        }

        const x = (pdfWidth - finalWidth) / 2;
        pdf.addImage(imgData, 'PNG', x, 0, finalWidth, finalHeight);

        // Add result ID footer manually to the PDF
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Result ID: ${resultId}  |  Generated: ${new Date().toLocaleString()}`, 10, pdfHeight - 10);

        pdf.save(`OMOSHIROI_JLPT_${level}_${user.name.replace(/\s+/g, '_')}_${resultId}.pdf`);
    } catch (err) {
        console.error('PDF Generation:', err);
        alert('Generate PDF Complete.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});
