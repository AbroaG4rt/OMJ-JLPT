// assets/js/test.js — Section-Based Exam Engine (Fixed)

document.addEventListener('DOMContentLoaded', () => {
    const __lang = localStorage.getItem('lang') || 'id';
    const __dashboardTarget = __lang === 'id' ? 'id/dashboard.html' : 'en/dashboard.html';
    const __resultTarget   = __lang === 'id' ? 'id/result.html'    : 'en/result.html';

    const VALID_LEVELS = ['N1', 'N2', 'N3', 'N4', 'N5'];

    const ExamEngine = {
        state: null,
        data: null,
        timerInterval: null,
        sectionIds: ['kanji', 'bunpou', 'choukai'],

        config: {
            kanji:   { icon: '📖', jp: '文字・語彙', title: 'Kanji & Vocabulary',    desc: 'Tests your knowledge of Japanese kanji, vocabulary readings, and word meaning.',         tips: ['Focus on kanji radicals and stroke patterns.', 'Use context to identify meanings.'], duration: '~35 min' },
            bunpou:  { icon: '✏️', jp: '文法・読解', title: 'Grammar & Reading',      desc: 'Tests grammar patterns and reading comprehension of Japanese passages.',                  tips: ['Identify the grammatical pattern before choosing.', 'Read paragraphs fully before answering.'], duration: '~60 min' },
            choukai: { icon: '🎧', jp: '聴解',       title: 'Listening (Choukai)',    desc: 'Tests your listening comprehension. Audio will play automatically on each question.',    tips: ['Audio has a limited play count — listen carefully.', 'Visualize what you hear before choosing.'], duration: '~35 min' }
        },

        async init() {
            // ── 1. Load & validate saved state ──────────────────────────────
            let savedState;
            try {
                savedState = JSON.parse(localStorage.getItem('omoshiroi_active_test'));
            } catch(e) {
                console.error('Corrupt exam state:', e);
                localStorage.removeItem('omoshiroi_active_test');
                window.location.href = __dashboardTarget;
                return;
            }

            if (!savedState) {
                window.location.href = __dashboardTarget;
                return;
            }

            // Validate level
            if (!savedState.level || !VALID_LEVELS.includes(savedState.level)) {
                console.warn('Invalid level in state:', savedState.level);
                localStorage.removeItem('omoshiroi_active_test');
                window.location.href = __dashboardTarget;
                return;
            }

            // Verify access
            if (!window.OmoshiroiUtils.checkAccess(savedState.level)) {
                alert(__lang === 'id' ? 'Akses Ditolak. Silakan login.' : 'Access Denied. Please log in.');
                window.location.href = __lang === 'id' ? 'id/login.html' : 'en/login.html';
                return;
            }

            // ── 2. Migrate / init fresh state fields ────────────────────────
            if (savedState.sectionIndex === undefined) {
                const durationMs = (savedState.endTime || 0) - Date.now();
                const remainingSeconds = durationMs > 0 ? Math.floor(durationMs / 1000) : (savedState.durationMinutes || 120) * 60;

                savedState = {
                    ...savedState,
                    sectionIndex:     0,
                    questionIndex:    0,
                    answers:          savedState.answers || {},
                    timerPaused:      true,
                    remainingSeconds: remainingSeconds
                };
            }

            // Guard: ensure remainingSeconds is valid
            if (!savedState.remainingSeconds || savedState.remainingSeconds <= 0) {
                savedState.remainingSeconds = (savedState.durationMinutes || 120) * 60;
            }

            this.state = savedState;
            document.getElementById('examLevelBadge').textContent = this.state.level;

            // ── 3. Fetch question data ───────────────────────────────────────
            try {
                const url = `data/${this.state.level}.json`;
                console.log('[ExamEngine] Fetching:', url);
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                this.data = await response.json();

                if (!this.data || !this.data.sections || !Array.isArray(this.data.sections)) {
                    throw new Error('Invalid data structure — missing sections array.');
                }

                console.log('[ExamEngine] Loaded', this.data.sections.length, 'sections for', this.state.level);

            } catch (err) {
                console.error('[ExamEngine] Data load failed:', err);
                const msg = __lang === 'id'
                    ? `Gagal memuat data soal (${err.message}). Periksa koneksi dan coba lagi.`
                    : `Failed to load question data (${err.message}). Please check your connection.`;
                alert(msg);
                window.location.href = __dashboardTarget;
                return;
            }

            // ── 4. Bind all events ──────────────────────────────────────────
            this.bindEvents();

            // ── 5. Route to correct screen ──────────────────────────────────
            if (this.state.timerPaused) {
                const isFirstQuestion = this.state.sectionIndex === 0
                    && this.state.questionIndex === 0
                    && Object.keys(this.state.answers).length === 0;

                if (isFirstQuestion) {
                    document.getElementById('introBadgeLevel').textContent = this.state.level;
                    this.showScreen('screenExamIntro');
                } else {
                    this.showSectionInstruction();
                }
            } else {
                this.resumeTimer();
                this.showScreen('screenQuestion');
                this.renderQuestion();
            }

            this.updateStepper();

            // Anti-cheat: tab switch warning
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    alert('⚠️ Warning: Tab switch detected! Please stay on this exam page.');
                }
            });
        },

        bindEvents() {
            document.getElementById('startExamBtn').addEventListener('click', () => this.showSectionInstruction());
            document.getElementById('startSectionBtn').addEventListener('click', () => this.startSection());
            document.getElementById('continueBtn').addEventListener('click', () => {
                this.state.sectionIndex++;
                this.state.questionIndex = 0;
                this.saveState();
                this.showSectionInstruction();
            });

            document.getElementById('prevBtn').addEventListener('click', () => {
                if (this.state.questionIndex > 0) {
                    this.state.questionIndex--;
                    this.saveState();
                    this.renderQuestion();
                    window.scrollTo(0, 0);
                }
            });

            document.getElementById('nextBtn').addEventListener('click', () => {
                const sec = this.data.sections[this.state.sectionIndex];
                if (this.state.questionIndex < sec.questions.length - 1) {
                    this.state.questionIndex++;
                    this.saveState();
                    this.renderQuestion();
                    window.scrollTo(0, 0);
                } else {
                    this.completeSection();
                }
            });

            document.getElementById('forceSubmitBtn').addEventListener('click', () => {
                const msg = __lang === 'id'
                    ? 'Anda yakin ingin mengakhiri ujian sekarang? Soal yang belum dijawab dianggap salah.'
                    : 'Submit exam now? Unanswered questions will be marked wrong.';
                if (confirm(msg)) this.submitExam();
            });
        },

        saveState() {
            try {
                localStorage.setItem('omoshiroi_active_test', JSON.stringify(this.state));
            } catch(e) {
                console.warn('Could not save state:', e);
            }
        },

        showScreen(id) {
            document.querySelectorAll('.exam-screen').forEach(s => s.classList.add('hidden'));
            const target = document.getElementById(id);
            if (target) target.classList.remove('hidden');
            window.scrollTo(0, 0);
        },

        updateStepper() {
            this.sectionIds.forEach((secId, idx) => {
                const step = document.getElementById(`step-${secId}`);
                if (!step) return;
                step.classList.remove('active', 'completed');
                if (idx < this.state.sectionIndex) step.classList.add('completed');
                if (idx === this.state.sectionIndex) step.classList.add('active');

                if (idx > 0) {
                    const line = document.getElementById(`line-${idx}`);
                    if (line) {
                        if (idx <= this.state.sectionIndex) line.classList.add('active');
                        else line.classList.remove('active');
                    }
                }
            });
        },

        showSectionInstruction() {
            const sec = this.data.sections[this.state.sectionIndex];
            if (!sec) { this.submitExam(); return; }

            const secId = sec.id || this.sectionIds[this.state.sectionIndex];
            const conf = this.config[secId] || this.config.kanji;

            document.getElementById('instrIcon').textContent        = conf.icon;
            document.getElementById('instrTitle').textContent       = conf.title;
            document.getElementById('instrSubtitleJp').textContent  = conf.jp;
            document.getElementById('instrDescription').textContent = conf.desc;
            document.getElementById('instrQCount').textContent      = sec.questions.length;
            document.getElementById('instrDuration').textContent    = conf.duration;
            document.getElementById('instrSectionNum').textContent  = `${this.state.sectionIndex + 1} of ${this.data.sections.length}`;
            document.getElementById('instrTipsList').innerHTML      = conf.tips.map(t => `<li>${t}</li>`).join('');
            document.getElementById('startSectionBtnText').textContent = `Start ${conf.title}`;

            this.pauseTimer();
            this.updateStepper();
            this.showScreen('screenInstruction');
        },

        startSection() {
            this.state.timerPaused = false;
            this.saveState();
            this.resumeTimer();
            this.renderQuestion();
            this.showScreen('screenQuestion');
        },

        completeSection() {
            this.pauseTimer();

            // Last section → submit
            if (this.state.sectionIndex >= this.data.sections.length - 1) {
                this.submitExam();
                return;
            }

            // Flash transition overlay
            const overlay = document.getElementById('sectionTransitionOverlay');
            if (overlay) {
                overlay.classList.remove('hidden');
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    this.showSectionSummary();
                }, 1400);
            } else {
                this.showSectionSummary();
            }
        },

        showSectionSummary() {
            const sec = this.data.sections[this.state.sectionIndex];
            let answered = sec.questions.filter(q => this.state.answers[q.id]).length;

            document.getElementById('completeTitle').textContent = `Section ${this.state.sectionIndex + 1} Complete!`;
            document.getElementById('completeAnswered').textContent = answered;
            document.getElementById('completeSkipped').textContent  = sec.questions.length - answered;
            this.showScreen('screenSectionComplete');
        },

        // ── TIMER ──────────────────────────────────────────────────────────
        pauseTimer() {
            clearInterval(this.timerInterval);
            this.timerInterval = null;

            if (this.state && this.state.endTime) {
                const rem = Math.floor((this.state.endTime - Date.now()) / 1000);
                this.state.remainingSeconds = rem > 0 ? rem : 0;
            }

            this.state.timerPaused = true;
            const pauseLabel = document.getElementById('timerPausedLabel');
            if (pauseLabel) pauseLabel.classList.remove('hidden');
            this.updateTimerDisplay(this.state.remainingSeconds || 0);
            this.saveState();
        },

        resumeTimer() {
            clearInterval(this.timerInterval);
            this.state.timerPaused = false;
            this.state.endTime = Date.now() + ((this.state.remainingSeconds || 0) * 1000);

            const pauseLabel = document.getElementById('timerPausedLabel');
            if (pauseLabel) pauseLabel.classList.add('hidden');
            this.saveState();

            this.timerInterval = setInterval(() => {
                const dist = this.state.endTime - Date.now();
                if (dist <= 0) {
                    clearInterval(this.timerInterval);
                    this.updateTimerDisplay(0);
                    alert(__lang === 'id' ? 'Waktu habis! Ujian dikirim otomatis.' : 'Time is up! Submitting automatically.');
                    this.submitExam();
                    return;
                }
                const secs = Math.floor(dist / 1000);
                this.state.remainingSeconds = secs;
                this.updateTimerDisplay(secs);
            }, 1000);
        },

        updateTimerDisplay(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            const str = h > 0
                ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
                : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

            const disp = document.getElementById('timerDisplay');
            if (disp) {
                disp.textContent = str;
                disp.classList.toggle('timer-critical', seconds < 300 && seconds > 0);
            }
        },

        // ── QUESTIONS ──────────────────────────────────────────────────────
        renderQuestion() {
            const sec = this.data.sections[this.state.sectionIndex];
            if (!sec) { console.error('No section at index', this.state.sectionIndex); return; }

            const q = sec.questions[this.state.questionIndex];
            if (!q) { console.error('No question at index', this.state.questionIndex); return; }

            const secId = sec.id || this.sectionIds[this.state.sectionIndex];
            const conf = this.config[secId] || this.config.kanji;

            // Meta bar
            document.getElementById('qSectionPillIcon').textContent = conf.icon;
            document.getElementById('qSectionPillName').textContent = conf.title;
            document.getElementById('qCurrentNum').textContent = this.state.questionIndex + 1;
            document.getElementById('qTotalNum').textContent   = sec.questions.length;

            const pct = ((this.state.questionIndex + 1) / sec.questions.length) * 100;
            document.getElementById('qProgressBar').style.width = `${pct}%`;

            // Build question HTML
            const sanitize = str => !str ? '' : str
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/ on\w+="[^"]*"/g, '');

            let html = `<div class="q-text">${this.state.questionIndex + 1}. ${sanitize(q.question)}</div>`;

            // Image
            if (q.image && q.type !== 'image') {
                html += `<div class="q-media"><img src="assets/images/${sanitize(q.image)}" alt="Question image" loading="lazy"></div>`;
            }

            // Audio (Choukai)
            if (q.audio) {
                const maxP = q.max_play || 2;
                const played = parseInt(localStorage.getItem(`audio_${q.id}_playcount`) || '0', 10);
                const rem = Math.max(0, maxP - played);
                html += `
                    <div class="audio-player-ui">
                        <button type="button" class="btn-play-audio play-audio-btn"
                            data-qid="${q.id}" data-audio="${sanitize(q.audio)}" data-max="${maxP}"
                            ${rem <= 0 ? 'disabled' : ''}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        </button>
                        <div class="audio-status" id="audio_status_${q.id}">
                            ${rem <= 0 ? 'Audio Locked 🔒' : `${rem} / ${maxP} plays remaining`}
                        </div>
                    </div>`;
            }

            // Options
            html += `<div class="options-list">`;
            if (Array.isArray(q.options)) {
                // Image options grid
                html += `<div class="options-grid image-grid">`;
                q.options.forEach(opt => {
                    const checked = this.state.answers[q.id] === opt.label;
                    html += `
                        <label class="opt-label ${checked ? 'selected' : ''}">
                            <input type="radio" name="q_${q.id}" value="${opt.label}" ${checked ? 'checked' : ''} style="display:none;">
                            <span class="opt-label-prefix">${opt.label}</span>
                            <img src="${sanitize(opt.image)}" alt="Option ${opt.label}" style="max-height:100px;border-radius:4px;margin-top:0.5rem;">
                        </label>`;
                });
                html += `</div>`;
            } else {
                // Text options
                for (const [key, val] of Object.entries(q.options)) {
                    const checked = this.state.answers[q.id] === key;
                    html += `
                        <label class="opt-label ${checked ? 'selected' : ''}">
                            <input type="radio" name="q_${q.id}" value="${key}" ${checked ? 'checked' : ''} style="display:none;">
                            <span class="opt-label-prefix">${key}.</span>
                            <span class="opt-label-text">${sanitize(val)}</span>
                        </label>`;
                }
            }
            html += `</div>`;

            const card = document.getElementById('questionCard');
            card.innerHTML = html;

            this.bindQuestionEvents(q);
            this.updateNavButtons(sec.questions.length);
        },

        bindQuestionEvents(q) {
            // Audio
            document.querySelectorAll('.play-audio-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    if (this.disabled) return;
                    const qid    = this.getAttribute('data-qid');
                    const file   = this.getAttribute('data-audio');
                    const maxP   = parseInt(this.getAttribute('data-max'), 10);
                    let played   = parseInt(localStorage.getItem(`audio_${qid}_playcount`) || '0', 10);

                    if (played < maxP) {
                        new Audio(`assets/audio/${file}`).play().catch(() => alert('Failed to play audio.'));
                        played++;
                        localStorage.setItem(`audio_${qid}_playcount`, played);
                        const rem = maxP - played;
                        const statusEl = document.getElementById(`audio_status_${qid}`);
                        if (statusEl) statusEl.textContent = rem <= 0 ? 'Audio Locked 🔒' : `${rem} / ${maxP} plays remaining`;
                        if (rem <= 0) { this.disabled = true; }
                    }
                });
            });

            // Option selection
            const self = this;
            document.querySelectorAll('.opt-label').forEach(label => {
                label.addEventListener('click', function() {
                    const container = this.closest('.options-list') || this.closest('.options-grid');
                    if (container) container.querySelectorAll('.opt-label').forEach(l => l.classList.remove('selected'));
                    this.classList.add('selected');

                    const input = this.querySelector('input');
                    if (input) {
                        input.checked = true;
                        const sec = self.data.sections[self.state.sectionIndex];
                        const currentQ = sec.questions[self.state.questionIndex];
                        self.state.answers[currentQ.id] = input.value;
                        self.saveState();
                    }
                });
            });
        },

        updateNavButtons(total) {
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            const isLast  = this.state.questionIndex === total - 1;
            const isFinalSection = this.state.sectionIndex === this.data.sections.length - 1;

            prevBtn.disabled = this.state.questionIndex === 0;

            if (isLast) {
                const label = isFinalSection ? 'Finish Exam ✓' : 'Finish Section →';
                nextBtn.innerHTML = label;
                nextBtn.style.background = isFinalSection ? '#27ae60' : '';
            } else {
                nextBtn.innerHTML = `Next <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
                nextBtn.style.background = '';
            }
        },

        submitExam() {
            clearInterval(this.timerInterval);
            window.onbeforeunload = null;

            const cheatData = window.AntiCheat ? window.AntiCheat.getProfile() : { tabSwitches: 0, copyAttempts: 0, screenshotAttempts: 0, devToolsAttempts: 0 };
            cheatData.score = (cheatData.tabSwitches * 2) + (cheatData.copyAttempts) + (cheatData.screenshotAttempts * 2) + (cheatData.devToolsAttempts * 3);

            localStorage.setItem('omoshiroi_latest_result', JSON.stringify({
                level:        this.state.level,
                answers:      this.state.answers,
                cheatProfile: cheatData,
                timestamp:    Date.now()
            }));

            localStorage.removeItem('omoshiroi_active_test');
            window.location.href = __resultTarget;
        }
    };

    // Init with top-level error handler
    ExamEngine.init().catch(err => {
        console.error('[ExamEngine] Fatal init error:', err);
        alert('An unexpected error occurred loading the exam. Returning to dashboard.');
        window.location.href = __dashboardTarget;
    });
});
