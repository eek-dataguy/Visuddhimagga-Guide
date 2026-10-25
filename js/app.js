// ==========================================================================
// Samādhi Daily Guide - Application Controller
// Method strictly grounded in Visuddhimagga Samādhi Niddesa (Books 84-87)
// ==========================================================================

import { audioEngine } from './audio.js';
import { 
  PALIBODHA_10, 
  CATURARAKKHA, 
  CARITA_QUESTIONS, 
  CARITA_PROFILES, 
  KAMMATTHANA_40, 
  PROGRESSIVE_CURRICULUM,
  NIVARANA_ANTIDOTES,
  STEPPING_STONES,
  DAILY_ROUTINE_CYCLE
} from './data.js';


function getTripitakaUrl(refText) {
  if (!refText) return "https://www.tripitaka82.com/";
  let v = "v2";
  if (refText.includes("ភាគ ១")) v = "v2";
  else if (refText.includes("ភាគ ២")) v = "v3";
  else if (refText.includes("ភាគ ៣")) v = "v4";
  else if (refText.includes("ភាគ ៤")) v = "v5";
  else if (refText.includes("សីលនិទ្ទេស")) v = "v1";

  const match = refText.match(/ទំព័រ\s*(\d+)/) || refText.match(/p\.\s*(\d+)/);
  const page = match ? match[1] : null;
  return page 
    ? `https://www.tripitaka82.com/read.html?book=${v}&page=${page}`
    : `https://www.tripitaka82.com/read.html?book=${v}`;
}

class SamadhiApp {
  constructor() {
    this.currentView = 'dashboard';
    this.timerInterval = null;
    this.timerSecondsRemaining = 15 * 60;
    this.timerInitialSeconds = 15 * 60;
    this.isTimerRunning = false;
    
    // Breath Orb & Gaṇanā State
    this.breathCycleInterval = null;
    this.breathPhase = 'idle'; // 'inhale', 'hold', 'exhale'
    this.breathCount = 1;
    this.maxCount = 10;
    this.minCount = 5;
    this.countMode = 'slow'; // 'slow' (វាល់អង្ករ), 'fast' (គោបាល)
    this.touchPoint = 'nose'; // 'nose' (ចុងច្រមុះ), 'lip' (បបូរមាត់លើ)
    this.inhaleSeconds = 4;
    this.holdSeconds = 1;
    this.exhaleSeconds = 4;

    // Quiz State
    this.quizAnswers = {};
    
    // Storage data
    this.userProfile = this.loadStorage('samadhi_user_profile', {
      streak: 1,
      lastDate: null,
      totalMinutes: 0,
      dominantCarita: null,
      currentLevel: 1,
      checkedPalibodha: [],
      completedHabits: [],
      lastRoutineDate: new Date().toDateString()
    });

    this.init();
  }

  loadStorage(key, defaultVal) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  saveStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn("Storage save failed", e);
    }
  }

  init() {
    this.bindEvents();
    this.renderPalibodhaList();
    this.renderCaturarakkha();
    this.renderKammatthanaList('all');
    this.renderCurriculum();
    this.renderNivaranaList();
    this.renderSteppingStones();
    this.renderDailyRoutineCycle();
    this.updateStatsDisplay();
    this.setupTheme();
  }

  bindEvents() {
    // Navigation routing
    document.querySelectorAll('[data-view-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-view-target');
        this.switchView(target);
      });
    });

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Timer controls
    const startBtn = document.getElementById('btn-timer-start');
    if (startBtn) startBtn.addEventListener('click', () => this.toggleTimer());

    const resetBtn = document.getElementById('btn-timer-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetTimer());

    document.querySelectorAll('[data-timer-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mins = parseInt(e.currentTarget.getAttribute('data-timer-preset'), 10);
        this.setTimerPreset(mins);
      });
    });

    // Touch point selector
    document.querySelectorAll('[data-touch-point]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-touch-point]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.touchPoint = e.currentTarget.getAttribute('data-touch-point');
        const desc = document.getElementById('touch-point-desc');
        if (desc) {
          desc.textContent = this.touchPoint === 'nose' 
            ? "តម្កល់សតិដឹងត្រង់ចុងច្រមុះ (នាសិកគ្គ) - សម្រាប់មនុស្សច្រមុះវែង" 
            : "តម្កល់សតិដឹងត្រង់បបូរមាត់ខាងលើ (ឧត្តរោដ្ឋ) - សម្រាប់មនុស្សច្រមុះខ្លី";
        }
      });
    });

    // Count mode selector
    const modeBtn = document.getElementById('btn-toggle-count-mode');
    if (modeBtn) {
      modeBtn.addEventListener('click', () => {
        this.countMode = this.countMode === 'slow' ? 'fast' : 'slow';
        modeBtn.textContent = this.countMode === 'slow' 
          ? "វិធីរាប់យឺត (ដូចវាល់អង្ករ)" 
          : "វិធីរាប់លឿន (ដូចគោបាល)";
        const hint = document.getElementById('count-mode-hint');
        if (hint) {
          hint.textContent = this.countMode === 'slow'
            ? "ដកដង្ហើមចូល-ចេញរួចទើបរាប់ ១, ដកដង្ហើមចូល-ចេញរួចរាប់ ២... (រាប់ចន្លោះ ៥ ដល់ ១០)"
            : "ដកចូល ១ ដកចេញ ១, ដកចូល ២ ដកចេញ ២... (រាប់ញាប់តាមចង្វាក់ខ្យល់ប៉ះ)";
        }
      });
    }

    // Sound test
    const bellBtn = document.getElementById('btn-test-bell');
    if (bellBtn) {
      bellBtn.addEventListener('click', () => audioEngine.playBowl());
    }

    // 40 Kammatthana Category Filters
    document.querySelectorAll('[data-k-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-k-filter]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const cat = e.currentTarget.getAttribute('data-k-filter');
        this.renderKammatthanaList(cat);
      });
    });

    // Quiz Start & Navigation
    const startQuizBtn = document.getElementById('btn-start-quiz');
    if (startQuizBtn) {
      startQuizBtn.addEventListener('click', () => this.startCaritaQuiz());
    }
  }

  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const targetSec = document.getElementById(`view-${viewName}`);
    if (targetSec) targetSec.classList.add('active');

    document.querySelectorAll('[data-view-target]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view-target') === viewName);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setupTheme() {
    const savedTheme = localStorage.getItem('samadhi_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('samadhi_theme', next);
    this.updateThemeIcon(next);
  }

  updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle-btn span');
    if (icon) {
      icon.textContent = theme === 'dark' ? '☀' : '☾';
    }
  }

  // Timer & Breathing Engine
  setTimerPreset(mins) {
    if (this.isTimerRunning) this.toggleTimer();
    this.timerInitialSeconds = mins * 60;
    this.timerSecondsRemaining = this.timerInitialSeconds;
    this.updateTimerDisplay();

    document.querySelectorAll('[data-timer-preset]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-timer-preset'), 10) === mins);
    });
  }

  toggleTimer() {
    if (this.isTimerRunning) {
      // Pause
      this.isTimerRunning = false;
      clearInterval(this.timerInterval);
      this.stopBreathCycle();
      const btn = document.getElementById('btn-timer-start');
      if (btn) btn.innerHTML = "<span>▶</span> ចាប់ផ្តើមបន្ត";
    } else {
      // Start
      this.isTimerRunning = true;
      audioEngine.playBowl(261.63, 5.0); // Ring opening bell
      const btn = document.getElementById('btn-timer-start');
      if (btn) btn.innerHTML = "<span>⏸</span> ផ្អាកបណ្តោះអាសន្ន";

      this.startBreathCycle();

      this.timerInterval = setInterval(() => {
        if (this.timerSecondsRemaining > 0) {
          this.timerSecondsRemaining--;
          this.updateTimerDisplay();
        } else {
          this.completeSession();
        }
      }, 1000);
    }
  }

  resetTimer() {
    if (this.isTimerRunning) this.toggleTimer();
    this.timerSecondsRemaining = this.timerInitialSeconds;
    this.updateTimerDisplay();
    this.stopBreathCycle();
    this.breathCount = 1;
    this.updateOrbDisplay();
  }

  updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    if (!display) return;
    const m = Math.floor(this.timerSecondsRemaining / 60);
    const s = this.timerSecondsRemaining % 60;
    display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  startBreathCycle() {
    this.stopBreathCycle();
    const orb = document.getElementById('breathing-orb');
    const phaseLabel = document.getElementById('orb-phase-label');

    const cycle = () => {
      // Inhale phase
      this.breathPhase = 'inhale';
      if (orb) {
        orb.className = 'breathing-orb inhale';
      }
      if (phaseLabel) phaseLabel.textContent = "ដង្ហើមចូល (Inhale)";
      audioEngine.playBreathCue(true);

      setTimeout(() => {
        if (!this.isTimerRunning) return;
        // Hold / Pause phase
        this.breathPhase = 'hold';
        if (phaseLabel) phaseLabel.textContent = "តម្កល់សតិ (Awareness)";

        setTimeout(() => {
          if (!this.isTimerRunning) return;
          // Exhale phase
          this.breathPhase = 'exhale';
          if (orb) {
            orb.className = 'breathing-orb exhale';
          }
          if (phaseLabel) phaseLabel.textContent = "ដង្ហើមចេញ (Exhale)";
          audioEngine.playBreathCue(false);

          // Increment count at exhale
          setTimeout(() => {
            if (!this.isTimerRunning) return;
            this.breathCount++;
            if (this.breathCount > this.maxCount) {
              this.breathCount = 1;
            }
            this.updateOrbDisplay();
          }, (this.exhaleSeconds * 1000) - 200);

        }, this.holdSeconds * 1000);

      }, this.inhaleSeconds * 1000);
    };

    cycle();
    const totalCycleTime = (this.inhaleSeconds + this.holdSeconds + this.exhaleSeconds) * 1000;
    this.breathCycleInterval = setInterval(cycle, totalCycleTime);
  }

  stopBreathCycle() {
    clearInterval(this.breathCycleInterval);
    const orb = document.getElementById('breathing-orb');
    if (orb) orb.className = 'breathing-orb';
    const phaseLabel = document.getElementById('orb-phase-label');
    if (phaseLabel) phaseLabel.textContent = "ត្រៀមខ្លួន (Ready)";
  }

  updateOrbDisplay() {
    const countEl = document.getElementById('orb-count');
    if (countEl) countEl.textContent = this.breathCount;
  }

  completeSession() {
    clearInterval(this.timerInterval);
    this.isTimerRunning = false;
    this.stopBreathCycle();
    audioEngine.playBowl(220, 7.0); // Concluding ceremonial deep chime

    const sessionMinutes = Math.round(this.timerInitialSeconds / 60);
    this.userProfile.totalMinutes += sessionMinutes;
    this.userProfile.streak = (this.userProfile.streak || 0) + 1;
    this.userProfile.lastDate = new Date().toISOString();
    this.saveStorage('samadhi_user_profile', this.userProfile);

    this.updateStatsDisplay();

    alert(`អនុមោទនា! លោកអ្នកបានបញ្ចប់ការភាវនារយៈពេល ${sessionMinutes} នាទីដោយជោគជ័យ។ សូមឧទ្ទិសកុសលនេះដល់សព្វសត្វ!`);
    this.resetTimer();
  }

  updateStatsDisplay() {
    const streakEl = document.getElementById('stat-streak');
    if (streakEl) streakEl.textContent = `${this.userProfile.streak || 0} ថ្ងៃ`;

    const minsEl = document.getElementById('stat-total-mins');
    if (minsEl) minsEl.textContent = `${this.userProfile.totalMinutes || 0} នាទី`;

    const levelEl = document.getElementById('stat-level');
    if (levelEl) levelEl.textContent = `កម្រិត ${this.userProfile.currentLevel || 1}`;

    const caritaEl = document.getElementById('stat-carita');
    if (caritaEl) {
      if (this.userProfile.dominantCarita && CARITA_PROFILES[this.userProfile.dominantCarita]) {
        caritaEl.textContent = CARITA_PROFILES[this.userProfile.dominantCarita].name.split(' ')[0];
      } else {
        caritaEl.textContent = "មិនទាន់កំណត់";
      }
    }
  }

  // Palibodha 10 Checklist
  renderPalibodhaList() {
    const container = document.getElementById('palibodha-list-container');
    if (!container) return;

    container.innerHTML = PALIBODHA_10.map(p => {
      const isChecked = (this.userProfile.checkedPalibodha || []).includes(p.id);
      return `
        <div class="checklist-item ${isChecked ? 'checked' : ''}" data-palibodha-id="${p.id}">
          <div class="checklist-checkbox">${isChecked ? '✓' : ''}</div>
          <div style="flex: 1">
            <div style="display: flex; justify-content: space-between; align-items: baseline">
              <span class="checklist-title">${p.id}. ${p.khmer} (${p.pali})</span>
              <a href="${getTripitakaUrl(p.bookRef)}" target="_blank" rel="noopener" class="citation-badge" title="បើកអានក្នុង tripitaka82.com">📖 ${p.bookRef} ↗</a>
            </div>
            <div class="checklist-desc" style="margin-top: 4px;"><strong>កង្វល់៖</strong> ${p.meaning}</div>
            <div class="checklist-desc" style="color: var(--gold-primary); margin-top: 2px;"><strong>វិធីកាត់៖</strong> ${p.remedy}</div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-palibodha-id]').forEach(item => {
      item.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-palibodha-id'), 10);
        this.togglePalibodha(id);
      });
    });
  }

  togglePalibodha(id) {
    let list = this.userProfile.checkedPalibodha || [];
    if (list.includes(id)) {
      list = list.filter(x => x !== id);
    } else {
      list.push(id);
    }
    this.userProfile.checkedPalibodha = list;
    this.saveStorage('samadhi_user_profile', this.userProfile);
    this.renderPalibodhaList();
  }

  // Caturārakkha (សព្វត្ថកកម្មដ្ឋាន)
  renderCaturarakkha() {
    const container = document.getElementById('caturarakkha-container');
    if (!container) return;

    container.innerHTML = CATURARAKKHA.map(c => `
      <div class="card" style="margin-bottom: 14px;">
        <div class="card-header">
          <div class="card-icon-wrap">☸</div>
          <div>
            <div class="card-title">${c.title}</div>
            <div class="card-sub">${c.sub} · ${c.duration}</div>
          </div>
        </div>
        <div class="card-body">
          <div style="font-family: var(--font-pali); color: var(--gold-primary); font-size: 0.96rem; margin-bottom: 8px; line-height: 1.6;">
            « ${c.paliVerse} »
          </div>
          <div style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 8px;">
            ${c.translation}
          </div>
          <div style="font-size: 0.82rem; color: var(--accent-sage); font-weight: 600;">
            ✓ អានិសង្ស៖ ${c.benefit}
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <a href="${getTripitakaUrl(c.bookRef)}" target="_blank" rel="noopener" class="citation-badge" title="បើកអានក្នុង tripitaka82.com">📖 ${c.bookRef} ↗</a>
        </div>
      </div>
    `).join('');
  }

  // 40 Kammatthana Browser
  renderKammatthanaList(filter = 'all') {
    const container = document.getElementById('kammatthana-grid');
    if (!container) return;

    const filtered = filter === 'all' 
      ? KAMMATTHANA_40 
      : KAMMATTHANA_40.filter(k => k.cat === filter);

    container.innerHTML = filtered.map(k => `
      <div class="k-card">
        <div>
          <span class="k-badge">${this.getCatName(k.cat)}</span>
          <div class="k-title">${k.id}. ${k.name}</div>
          <div class="k-pali">${k.pali}</div>
          <div class="k-desc">${k.desc}</div>
        </div>
        <div class="k-meta">
          <span>ឈានខ្ពស់បំផុត៖ <strong>${k.maxJhana}</strong></span>
          <a href="${getTripitakaUrl(k.book)}" target="_blank" rel="noopener" class="citation-badge" title="បើកអានក្នុង tripitaka82.com">📖 ${k.book} ↗</a>
        </div>
      </div>
    `).join('');
  }

  getCatName(cat) {
    const map = {
      'kasiṇa': 'កសិណ ១០',
      'asubha': 'អសុភ ១០',
      'anussati': 'អនុស្សតិ ១០',
      'brahmavihara': 'ព្រហ្មវិហារ ៤',
      'arupa': 'អរូបជ្ឈាន ៤',
      'sanna': 'សញ្ញា ១',
      'vavatthana': 'វវដ្ឋាន ១'
    };
    return map[cat] || cat;
  }

  // Progressive Curriculum
  renderCurriculum() {
    const container = document.getElementById('curriculum-container');
    if (!container) return;

    container.innerHTML = PROGRESSIVE_CURRICULUM.map(c => `
      <div class="curriculum-card">
        <div class="curriculum-level">${c.pali}</div>
        <div class="curriculum-title">${c.title}</div>
        <div class="curriculum-time">⏱ រយៈពេលណែនាំ៖ ${c.timeframe}</div>
        <div style="font-size: 0.95rem; color: var(--gold-primary); font-weight: 600; margin-bottom: 12px;">
          គោលដៅ៖ ${c.target}
        </div>
        <ul class="curriculum-step-list">
          ${c.steps.map(s => `
            <li class="curriculum-step-item">
              <strong>${s.title}៖</strong> ${s.desc}
            </li>
          `).join('')}
        </ul>
        <div style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 0.86rem; color: var(--text-secondary); margin-top: 12px;">
          🚩 <strong>សញ្ញាសម្គាល់ការឆ្លងផុត៖</strong> ${c.milestone}
        </div>
      </div>
    `).join('');
  }

  // Nivarana Diagnostic & Antidotes
  renderNivaranaList() {
    const container = document.getElementById('nivarana-container');
    if (!container) return;

    container.innerHTML = NIVARANA_ANTIDOTES.map(n => `
      <div class="card" style="margin-bottom: 14px;">
        <div class="card-header">
          <div class="card-icon-wrap" style="color: var(--accent-crimson); background: rgba(166, 61, 61, 0.1);">⚠</div>
          <div>
            <div class="card-title">${n.khmer}</div>
            <div class="card-sub">${n.pali}</div>
          </div>
        </div>
        <div class="card-body">
          <div style="margin-bottom: 6px;"><strong>រោគសញ្ញាក្នុងចិត្ត៖</strong> ${n.symptom}</div>
          <div style="color: var(--accent-sage); font-weight: 600; margin-bottom: 6px;">
            💊 <strong>ឱសថកម្ចាត់៖</strong> ${n.antidote}
          </div>
          <div style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 8px;">
            ${n.method}
          </div>
          <div style="background: var(--gold-subtle); padding: 6px 12px; border-radius: var(--radius-sm); font-size: 0.84rem; color: var(--gold-primary); font-weight: 600;">
            ★ អង្គឈានដែលកើតមកជំនួស៖ ${n.jhānaFactor}
          </div>
        </div>
      </div>
    `).join('');
  }

  // Carita Quiz Logic
  startCaritaQuiz() {
    const container = document.getElementById('quiz-dynamic-box');
    if (!container) return;
    this.quizAnswers = {};

    let currentQ = 0;

    const showQuestion = (idx) => {
      const q = CARITA_QUESTIONS[idx];
      container.innerHTML = `
        <div class="quiz-question-box">
          <div style="display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
            <span>សំណួរទី ${idx + 1} នៃ ${CARITA_QUESTIONS.length}</span>
            <span>យោងតាមវិសុទ្ធិមគ្គ សមាធិនិទ្ទេស ភាគ ១ ទំព័រ ៧៥ (<a href="https://www.tripitaka82.com/read.html?book=v2&page=75" target="_blank" rel="noopener" style="color: var(--gold-primary); text-decoration: none;">tripitaka82.com ↗</a>)</span>
          </div>
          <h3 style="font-size: 1.2rem; margin-bottom: 18px;">${q.title}</h3>
          <div>
            ${q.options.map((opt, oIdx) => `
              <button class="quiz-option" data-opt-idx="${oIdx}">
                ${opt.text}
              </button>
            `).join('')}
          </div>
        </div>
      `;

      container.querySelectorAll('[data-opt-idx]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const optIdx = parseInt(e.currentTarget.getAttribute('data-opt-idx'), 10);
          const chosen = q.options[optIdx];
          this.quizAnswers[q.id] = chosen;

          if (idx + 1 < CARITA_QUESTIONS.length) {
            showQuestion(idx + 1);
          } else {
            this.evaluateCaritaQuiz(container);
          }
        });
      });
    };

    showQuestion(0);
  }

  evaluateCaritaQuiz(container) {
    const scores = { raga: 0, dosa: 0, moha: 0, saddha: 0, buddhi: 0, vitakka: 0 };
    Object.values(this.quizAnswers).forEach(ans => {
      if (ans && ans.carita) {
        scores[ans.carita] = (scores[ans.carita] || 0) + (ans.weight || 2);
      }
    });

    let topCarita = 'vitakka';
    let maxScore = -1;
    for (const [c, s] of Object.entries(scores)) {
      if (s > maxScore) {
        maxScore = s;
        topCarita = c;
      }
    }

    this.userProfile.dominantCarita = topCarita;
    this.saveStorage('samadhi_user_profile', this.userProfile);
    this.updateStatsDisplay();

    const profile = CARITA_PROFILES[topCarita];

    container.innerHTML = `
      <div class="card" style="border: 2px solid var(--gold-primary); padding: 32px 24px; text-align: center;">
        <span class="hero-tag">លទ្ធផលវិនិច្ឆ័យចរិត</span>
        <h2 style="font-size: 1.8rem; margin: 12px 0 6px;">${profile.name}</h2>
        <p style="color: var(--text-secondary); max-width: 600px; margin: 0 auto 20px;">${profile.sub}</p>
        
        <div style="background: var(--bg-secondary); border-radius: var(--radius-md); padding: 20px; text-align: left; margin-bottom: 24px;">
          <div style="margin-bottom: 12px;">
            <strong style="color: var(--gold-primary);">🎯 កម្មដ្ឋានចម្បង (Pārihāriya)៖</strong>
            <div style="font-size: 1.1rem; font-weight: 700; margin-top: 4px;">${profile.primaryKammatthana}</div>
          </div>
          <div style="margin-bottom: 12px;">
            <strong>📖 ឱវាទក្នុងវិសុទ្ធិមគ្គ៖</strong>
            <p style="font-size: 0.92rem; color: var(--text-secondary); margin-top: 4px;">${profile.remedyText}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <strong>🌿 សប្បាយសមគួរ (Sappāya)៖</strong>
            <p style="font-size: 0.92rem; color: var(--text-secondary); margin-top: 4px;">${profile.sappaya}</p>
          </div>
          <div>
            <strong>🏆 ការសម្រេចឈាន៖</strong>
            <span style="font-size: 0.92rem; color: var(--accent-sage); font-weight: 600;">${profile.attainment}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: center; gap: 12px;">
          <button class="btn-primary" data-view-target="practice">
            <span>☸</span> ចាប់ផ្តើមភាវនាឥឡូវនេះ
          </button>
          <button class="btn-secondary" id="btn-retake-quiz">
            ធ្វើតេស្តឡើងវិញ
          </button>
        </div>
      </div>
    `;

    container.querySelector('[data-view-target="practice"]').addEventListener('click', () => {
      this.switchView('practice');
    });

    container.querySelector('#btn-retake-quiz').addEventListener('click', () => {
      this.startCaritaQuiz();
    });
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.samadhiApp = new SamadhiApp();

  // ==========================================
  // Stepping Stones (Sīla, Samādhi, Paññā)
  // ==========================================
  renderSteppingStones() {
    const container = document.getElementById('stepping-stones-container');
    if (!container) return;

    container.innerHTML = STEPPING_STONES.map(s => `
      <div class="stepping-card ${s.id}-card">
        <div>
          <span class="stepstone-badge badge-${s.id}">${s.badge}</span>
          <h3 style="font-size: 1.35rem; margin: 10px 0 4px;">${s.name}</h3>
          <div style="font-size: 0.88rem; color: var(--gold-primary); font-weight: 600; margin-bottom: 10px;">${s.pali}</div>
          <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 18px;">
            ${s.desc}
          </p>

          <div style="margin-bottom: 18px;">
            <strong style="font-size: 0.95rem; color: var(--text-primary);">សសរទ្រទ្រង់ទាំង ៤ (Pillars)៖</strong>
            <div style="margin-top: 8px;">
              ${s.pillars.map(p => `
                <div style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 8px 12px; margin-bottom: 8px; font-size: 0.86rem;">
                  <strong style="color: var(--text-primary);">${p.title}</strong>
                  <div style="color: var(--text-secondary); margin-top: 2px;">${p.desc}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--border-color); padding-top: 14px; display: flex; justify-content: space-between; align-items: center;">
          <a href="${s.tripitakaUrl}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.82rem; font-weight: 700;">
            📖 អានក្នុង ${s.bookTitle} ↗
          </a>
        </div>
      </div>
    `).join('');
  }

  // ==========================================
  // Daily Routine Cycle (Morning, Day, Evening)
  // ==========================================
  renderDailyRoutineCycle() {
    const container = document.getElementById('daily-routine-container');
    if (!container) return;

    // Reset habits if new day
    const today = new Date().toDateString();
    if (this.userProfile.lastRoutineDate !== today) {
      this.userProfile.completedHabits = [];
      this.userProfile.lastRoutineDate = today;
      this.saveStorage('samadhi_user_profile', this.userProfile);
    }

    const completed = this.userProfile.completedHabits || [];
    let totalHabitsCount = 0;
    DAILY_ROUTINE_CYCLE.forEach(p => totalHabitsCount += p.habits.length);
    const progressPercent = totalHabitsCount > 0 ? Math.round((completed.length / totalHabitsCount) * 100) : 0;

    // Update Progress Bar
    const progressEl = document.getElementById('routine-progress-fill');
    if (progressEl) progressEl.style.width = `${progressPercent}%`;
    const progressText = document.getElementById('routine-progress-text');
    if (progressText) progressText.textContent = `${completed.length}/${totalHabitsCount} កិច្ច (${progressPercent}%)`;

    container.innerHTML = DAILY_ROUTINE_CYCLE.map(phase => `
      <div class="routine-phase-card">
        <div class="routine-phase-header">
          <div>
            <h3 style="font-size: 1.28rem; font-weight: 700; color: var(--text-primary);">${phase.phaseName}</h3>
            <div style="font-size: 0.85rem; color: var(--gold-primary); font-weight: 600;">⏱ ${phase.timeRange} · ${phase.motto}</div>
          </div>
        </div>

        <div>
          ${phase.habits.map(h => {
            const isDone = completed.includes(h.id);
            return `
              <div class="routine-habit-item ${isDone ? 'completed' : ''}" data-habit-id="${h.id}">
                <div class="checklist-checkbox">${isDone ? '✓' : ''}</div>
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 4px;">
                    <span style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${h.title}</span>
                    <span class="stepstone-badge ${h.badgeClass}">${h.stepStone}</span>
                  </div>
                  <div style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">${h.desc}</div>

                  <!-- Pali Chant Box -->
                  <div class="pali-chant-box">
                    <div class="pali-verse-text">« ${h.paliFormula} »</div>
                    <div style="font-size: 0.82rem; color: var(--text-secondary);">${h.translation}</div>
                  </div>

                  <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
                    <a href="${h.tripitakaUrl}" target="_blank" rel="noopener" class="citation-badge" onclick="event.stopPropagation();">
                      📖 ${h.tripitakaLabel} ↗
                    </a>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-habit-id]').forEach(item => {
      item.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-habit-id');
        this.toggleDailyHabit(id);
      });
    });
  }

  toggleDailyHabit(habitId) {
    let list = this.userProfile.completedHabits || [];
    if (list.includes(habitId)) {
      list = list.filter(x => x !== habitId);
    } else {
      list.push(habitId);
      audioEngine.playBreathCue(true); // subtle wholesome audio tick
    }
    this.userProfile.completedHabits = list;
    this.saveStorage('samadhi_user_profile', this.userProfile);
    this.renderDailyRoutineCycle();
  }

}
