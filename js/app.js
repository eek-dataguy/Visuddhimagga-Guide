// ==========================================================================
// Samādhi Daily Guide - Application Controller (Redesigned)
// Method strictly grounded in Visuddhimagga (Volumes v1 through v8)
// Pure SVG Iconography & Humane Meditative Design System
// ==========================================================================

import { audioEngine } from './audio.js?v=2.1.1';
import { renderIcon } from './icons.js?v=2.1.1';
import { 
  PALIBODHA_10, 
  CATURARAKKHA, 
  CARITA_QUESTIONS, 
  CARITA_PROFILES, 
  KAMMATTHANA_40, 
  PROGRESSIVE_CURRICULUM,
  NIVARANA_ANTIDOTES,
  STEPPING_STONES,
  STEPPING_STONE_STAGES,
  DAILY_ROUTINE_CYCLE,
  ANAPANASATI_SIMILES,
  LOST_BREATH_REMEDY
} from './data.js?v=2.1.1';

function getTripitakaUrl(refText) {
  if (!refText) return "https://www.tripitaka82.com/";
  let v = "v2";
  if (refText.includes("ភាគ ១")) v = "v2";
  else if (refText.includes("ភាគ ២")) v = "v3";
  else if (refText.includes("ភាគ ៣")) v = "v4";
  else if (refText.includes("ភាគ ៤")) v = "v5";
  else if (refText.includes("សីលនិទ្ទេស")) v = "v1";
  else if (refText.includes("បញ្ញានិទ្ទេស")) v = "v6";

  const normalized = refText.replace(/[០-៩]/g, d => '០១២៣៤៥៦៧៨៩'.indexOf(d));
  const match = normalized.match(/ទំព័រ\s*(\d+)/) || normalized.match(/pp?\.\s*(\d+)/);
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
    this.breathTimeouts = [];

    // Routine filter
    this.activeRoutinePhase = 'all';
    this.steppingUnlocked = parseInt(localStorage.getItem('vism_stepping_unlocked') || '1', 10); // 'all', 'morning', 'daytime', 'evening'

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
    this.renderAnapanasatiGuides();
    this.updateStatsDisplay();
    this.setupTheme();
  }

  bindEvents() {
    // Navigation routing
    document.querySelectorAll('[data-view-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-view-target');
        this.switchView(target);
        this.closeMobileDharmaSheet();
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
        this.inhaleSeconds = this.countMode === 'slow' ? 4 : 2;
        this.exhaleSeconds = this.countMode === 'slow' ? 4 : 2;
        modeBtn.textContent = this.countMode === 'slow' 
          ? "វិធីរាប់យឺត (ដូចវាល់អង្ករ)" 
          : "វិធីរាប់លឿន (ដូចគោបាល)";
        const hint = document.getElementById('count-mode-hint');
        if (hint) {
          hint.textContent = this.countMode === 'slow'
            ? "ដកដង្ហើមចូល-ចេញរួចទើបរាប់ ១, ដកដង្ហើមចូល-ចេញរួចរាប់ ២... (រាប់ចន្លោះ ៥ ដល់ ១០)"
            : "ដកចូល ១ ដកចេញ ១, ដកចូល ២ ដកចេញ ២... (រាប់ញាប់តាមចង្វាក់ខ្យល់ប៉ះ)";
        }
        if (this.isTimerRunning) {
          this.startBreathCycle();
        }
      });
    }

    // Sound test bell
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

    // Routine Phase Filters
    document.querySelectorAll('[data-routine-phase]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-routine-phase]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.activeRoutinePhase = e.currentTarget.getAttribute('data-routine-phase');
        this.renderDailyRoutineCycle();
      });
    });

    // Mobile Dharma Sheet controls
    const openSheetBtn = document.getElementById('btn-open-dharma-sheet');
    if (openSheetBtn) {
      openSheetBtn.addEventListener('click', () => this.openMobileDharmaSheet());
    }
    const closeSheetBtn = document.getElementById('btn-close-dharma-sheet');
    if (closeSheetBtn) {
      closeSheetBtn.addEventListener('click', () => this.closeMobileDharmaSheet());
    }
    const sheetOverlay = document.getElementById('mobile-dharma-sheet');
    if (sheetOverlay) {
      sheetOverlay.addEventListener('click', (e) => {
        if (e.target === sheetOverlay) this.closeMobileDharmaSheet();
      });
    }

    // Quiz Start
    const startQuizBtn = document.getElementById('btn-start-quiz');
    if (startQuizBtn) {
      startQuizBtn.addEventListener('click', () => this.startCaritaQuiz());
    }
  }

  openMobileDharmaSheet() {
    const sheet = document.getElementById('mobile-dharma-sheet');
    if (sheet) sheet.classList.add('active');
  }

  closeMobileDharmaSheet() {
    const sheet = document.getElementById('mobile-dharma-sheet');
    if (sheet) sheet.classList.remove('active');
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
    const iconBtn = document.getElementById('theme-toggle-btn');
    if (iconBtn) {
      iconBtn.innerHTML = theme === 'dark' ? renderIcon('sun', 18) : renderIcon('moon', 18);
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
      if (btn) btn.innerHTML = `${renderIcon('play', 18)} ចាប់ផ្តើមបន្ត`;
    } else {
      // Start
      this.isTimerRunning = true;
      audioEngine.playBowl(261.63, 5.0); // Ring opening bell
      const btn = document.getElementById('btn-timer-start');
      if (btn) btn.innerHTML = `${renderIcon('pause', 18)} ផ្អាកបណ្តោះអាសន្ន`;

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

  clearBreathTimeouts() {
    if (this.breathTimeouts) {
      this.breathTimeouts.forEach(t => clearTimeout(t));
      this.breathTimeouts = [];
    }
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

      const t1 = setTimeout(() => {
        if (!this.isTimerRunning) return;
        // Hold / Pause phase
        this.breathPhase = 'hold';
        if (phaseLabel) phaseLabel.textContent = "តម្កល់សតិ (Awareness)";

        const t2 = setTimeout(() => {
          if (!this.isTimerRunning) return;
          // Exhale phase
          this.breathPhase = 'exhale';
          if (orb) {
            orb.className = 'breathing-orb exhale';
          }
          if (phaseLabel) phaseLabel.textContent = "ដង្ហើមចេញ (Exhale)";
          audioEngine.playBreathCue(false);

          // Increment count at exhale
          const t3 = setTimeout(() => {
            if (!this.isTimerRunning) return;
            this.breathCount++;
            if (this.breathCount > this.maxCount) {
              this.breathCount = 1;
            }
            this.updateOrbDisplay();
          }, Math.max(100, (this.exhaleSeconds * 1000) - 200));
          this.breathTimeouts.push(t3);

        }, this.holdSeconds * 1000);
        this.breathTimeouts.push(t2);

      }, this.inhaleSeconds * 1000);
      this.breathTimeouts.push(t1);
    };

    cycle();
    const totalCycleTime = (this.inhaleSeconds + this.holdSeconds + this.exhaleSeconds) * 1000;
    this.breathCycleInterval = setInterval(cycle, totalCycleTime);
  }

  stopBreathCycle() {
    clearInterval(this.breathCycleInterval);
    this.clearBreathTimeouts();
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
          <div class="checklist-checkbox">${isChecked ? renderIcon('check', 14) : ''}</div>
          <div style="flex: 1">
            <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 4px;">
              <span class="checklist-title">${p.id}. ${p.khmer} (${p.pali})</span>
              <a href="${p.tripitakaUrl || getTripitakaUrl(p.bookRef)}" target="_blank" rel="noopener" class="citation-badge" onclick="event.stopPropagation();">
                ${renderIcon('citations', 12)} ${p.bookRef} ${renderIcon('externalLink', 10)}
              </a>
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
      audioEngine.playBreathCue(true);
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
          <div class="card-icon-wrap">${renderIcon('dhammaWheel', 22)}</div>
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
            ${renderIcon('check', 14)} អានិសង្ស៖ ${c.benefit}
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <a href="${getTripitakaUrl(c.bookRef)}" target="_blank" rel="noopener" class="citation-badge">
            ${renderIcon('citations', 12)} ${c.bookRef} ${renderIcon('externalLink', 10)}
          </a>
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
          <a href="${getTripitakaUrl(k.book)}" target="_blank" rel="noopener" class="citation-badge">
            ${renderIcon('citations', 12)} ${k.book} ${renderIcon('externalLink', 10)}
          </a>
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
          <strong>សញ្ញាសម្គាល់ការឆ្លងផុត៖</strong> ${c.milestone}
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
          <div class="card-icon-wrap" style="color: var(--accent-crimson); background: rgba(166, 61, 61, 0.1);">
            ${renderIcon('nivarana', 22)}
          </div>
          <div>
            <div class="card-title">${n.khmer}</div>
            <div class="card-sub">${n.pali}</div>
          </div>
        </div>
        <div class="card-body">
          <div style="margin-bottom: 6px;"><strong>រោគសញ្ញាក្នុងចិត្ត៖</strong> ${n.symptom}</div>
          <div style="color: var(--accent-sage); font-weight: 600; margin-bottom: 6px;">
            <strong>ឱសថកម្ចាត់៖</strong> ${n.antidote}
          </div>
          <div style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 8px;">
            ${n.method}
          </div>
          <div style="background: var(--gold-subtle); padding: 6px 12px; border-radius: var(--radius-sm); font-size: 0.84rem; color: var(--gold-primary); font-weight: 600;">
            អង្គឈានដែលកើតមកជំនួស៖ ${n.jhānaFactor}
          </div>
        </div>
      </div>
    `).join('');
  }

  // Stepping Stones (9 Progressive Locked/Unlocked Stages + Theoretical Pillars)
  renderSteppingStones() {
    const container = document.getElementById('stepping-stones-container');
    if (!container) return;

    const totalSteps = STEPPING_STONE_STAGES.length; // 9
    const completedCount = Math.min(Math.max(0, this.steppingUnlocked - 1), totalSteps);
    const progressPct = Math.round((completedCount / totalSteps) * 100);
    const isAllCompleted = this.steppingUnlocked > totalSteps;

    let html = `
      <!-- Stepping Stones Progress Tracker -->
      <div class="stepping-progress-banner">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
          <div>
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--gold-primary); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
              ${renderIcon('steppingStones', 16)} វឌ្ឍនភាពនៃការទន្ទេញមេរៀនគ្រឹះ (Gated Progression)
            </div>
            <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">
              ${isAllCompleted ? 'សម្រេចជោគជ័យគ្រប់ ៩ ជំហាន (១០០%)' : `សម្រេច ${completedCount}/${totalSteps} ជំហាន (${progressPct}%) — កំពុងនៅជំហានទី ${this.steppingUnlocked}`}
            </div>
          </div>
          <button class="btn-reset-stepping" style="background: none; border: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.8rem; padding: 6px 12px; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; gap: 6px;" title="កំណត់វឌ្ឍនភាពឡើងវិញ">
            ${renderIcon('reset', 14)} ចាប់ផ្តើមទន្ទេញឡើងវិញ
          </button>
        </div>

        <div class="stepping-progress-track">
          <div class="stepping-progress-bar" style="width: ${progressPct}%;"></div>
        </div>
      </div>
    `;

    // If all completed, render Grand Mastery Celebration banner
    if (isAllCompleted) {
      html += `
        <div class="grand-mastery-banner">
          <div style="margin-bottom: 14px;">${renderIcon('award', 48)}</div>
          <h3 style="font-size: 1.45rem; color: var(--gold-primary); margin-bottom: 8px;">សាធុ! សាធុ! អ្នកបានឆ្លងកាត់ជណ្តើរទាំង ៩ នៃវិសុទ្ធិមគ្គជាស្ថាពរ</h3>
          <p style="color: var(--text-secondary); max-width: 640px; margin: 0 auto 16px; font-size: 0.95rem; line-height: 1.7;">
            អ្នកបានទន្ទេញចាំមាត់នូវគាថាពុទ្ធដីកា និងវាក្យគន្លឹះដ៏ពិសិដ្ឋទាំង ៩ ដំណាក់កាល តាំងពី <strong>គាថាដើម «សីលេ បតិដ្ឋាយ»</strong>, <strong>ចតុបារិសុទ្ធិសីល</strong>, <strong>ទសបលិពោធ</strong>, <strong>ចតុរារក្ខា</strong>, <strong>ឧបមាអ្នករក្សាទ្វារនិងរណារ</strong>, <strong>ឧបាយនាំខ្យល់មកវិញ</strong>, <strong>អង្គឈាន ៥</strong>, <strong>បញ្ចវសី</strong> រហូតដល់ <strong>នាមរូបបរិច្ឆេទ & ត្រៃលក្ខណ៍</strong>។ គ្រឹះនៃព្រះបរិយត្តិរបស់អ្នកមានភាពរឹងមាំហើយ សូមបន្តចូលកាន់ការចម្រើនភាវនាជាប្រចាំថ្ងៃ!
          </p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button class="btn-primary" data-view-target="practice" style="font-size: 0.92rem; padding: 10px 22px;">
              ${renderIcon('meditator', 16)} ចូលទៅកាន់ការអង្គុយភាវនា
            </button>
            <button class="btn-reset-stepping btn-secondary" style="font-size: 0.92rem; padding: 10px 22px;">
              ${renderIcon('reset', 16)} រំលឹកឡើងវិញពីជំហានទី ១
            </button>
          </div>
        </div>
      `;
    }

    // Step Stones Cards List
    html += `<div class="stepping-stages-list">`;

    STEPPING_STONE_STAGES.forEach(s => {
      const isPassed = s.step < this.steppingUnlocked;
      const isActive = s.step === this.steppingUnlocked;
      const isLocked = s.step > this.steppingUnlocked;

      let cardClass = 'stepstone-card';
      if (isPassed) cardClass += ' is-passed';
      else if (isActive) cardClass += ' is-active';
      else if (isLocked) cardClass += ' is-locked';

      html += `
        <div class="${cardClass}" id="stepstone-card-${s.step}">
          <div class="stepstone-card-header">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <span class="stepstone-badge ${s.badgeClass}">${s.stage}</span>
              ${isPassed ? `<span class="badge-status-passed">${renderIcon('check', 13)} បានទន្ទេញចាំរួចរាល់</span>` : ''}
              ${isActive ? `<span class="badge-status-active">${renderIcon('sparkles', 13)} កំពុងទន្ទេញ (ជំហានបច្ចុប្បន្ន)</span>` : ''}
              ${isLocked ? `<span class="badge-status-locked">${renderIcon('lock', 13)} ចាក់សោ</span>` : ''}
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">
              ជំហាន ${s.step} នៃ ៩
            </div>
          </div>

          <h3 class="stepstone-card-title">${s.title}</h3>

          ${isLocked ? `
            <!-- Locked State -->
            <div class="stepstone-locked-body">
              <div style="color: var(--text-muted); margin-bottom: 8px;">${renderIcon('lock', 32)}</div>
              <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0; line-height: 1.6;">
                ជំហានទី ${s.step} នេះនៅជាប់ចាក់សោនៅឡើយ។ សូមទន្ទេញគាថា និងផ្ទៀងផ្ទាត់ <strong>ជំហានទី ${s.step - 1}</strong> ឱ្យបានចាំមាត់ជាមុនសិន ដើម្បីដោះសោឆ្លងមកកាន់ជំហាននេះ!
              </p>
            </div>
          ` : `
            <!-- Unlocked or Active State -->
            <div class="stepstone-unlocked-body">
              <!-- Sacred Pāḷi Verse Box -->
              <div class="pali-chant-box">
                <div class="pali-box-header">
                  <span>${renderIcon('citations', 14)} គាថា / វាក្យគន្លឹះបាលីដែលត្រូវទន្ទេញចាំមាត់</span>
                </div>
                <div class="pali-verse-text">${s.paliVerse.replace(/\n/g, '<br>')}</div>
                <div class="pali-phonetics-text">${s.paliPhonetics.replace(/\n/g, '<br>')}</div>
              </div>

              <!-- Word by Word Meaning -->
              <div class="stepstone-section">
                <div class="stepstone-sec-title">សម្រាយន័យពាក្យធម៌ (Word-by-Word Meaning)៖</div>
                <div class="stepstone-sec-content" style="font-family: inherit; line-height: 1.7;">
                  ${s.wordMeaning.replace(/\n/g, '<br>')}
                </div>
              </div>

              <!-- Why Memorize First -->
              <div class="stepstone-section memory-reason-wrap">
                <div class="stepstone-sec-title" style="color: var(--gold-primary);">
                  ហេតុអ្វីត្រូវទន្ទេញចាំមាត់ជាមុនសិន៖
                </div>
                <div class="stepstone-sec-content">
                  ${s.whyMemorize}
                </div>
              </div>

              <!-- Practical Heart Application -->
              <div class="stepstone-section practice-app-wrap">
                <div class="stepstone-sec-title" style="color: var(--accent-sage);">
                  ការអនុវត្តជាក់ស្តែងក្នុងចិត្តពេលភាវនា៖
                </div>
                <div class="stepstone-sec-content">
                  ${s.practiceApplication}
                </div>
              </div>

              <!-- Deep Canonical Citation Link -->
              <div class="stepstone-citation-wrap">
                <a href="${s.tripitakaUrl}" target="_blank" rel="noopener" class="citation-deep-btn" title="ចុចដើម្បីអានអត្ថបទពេញក្នុងគេហទំព័រ tripitaka82.com ដោយលោតចំទំព័រ និង highlight បន្ទាត់">
                  ${renderIcon('citations', 15)} ផ្ទៀងផ្ទាត់ក្នុង ${s.tripitakaLabel} (លោតទៅបន្ទាត់ & Highlight ពណ៌លឿង) ${renderIcon('externalLink', 12)}
                </a>
              </div>

              ${isActive ? `
                <!-- Active Gate Confirmation Box -->
                <div class="unlock-gate-box">
                  <div class="gate-checkbox-row">
                    <input type="checkbox" id="chk-step-${s.step}" class="step-confirm-chk">
                    <label for="chk-step-${s.step}" class="gate-label">
                      ខ្ញុំបានទន្ទេញចាំមាត់ និងពិចារណាយល់សេចក្តីធម៌នៃជំហានទី ${s.step} នេះច្បាស់លាស់ហើយ
                    </label>
                  </div>
                  <div style="margin-top: 14px;">
                    <button class="btn-unlock-step btn-primary" data-step-target="${s.step + 1}">
                      ${renderIcon('unlock', 16)} ដោះសោឆ្លងទៅជំហានទី ${s.step + 1} &rarr;
                    </button>
                  </div>
                </div>
              ` : `
                <div class="step-passed-footer">
                  ${renderIcon('check', 14)} អ្នកបានឆ្លងផុតជំហាននេះហើយ (អាចអានរំលឹកឡើងវិញបានគ្រប់ពេល)
                </div>
              `}
            </div>
          `}
        </div>
      `;
    });

    html += `</div>`;

    // Also include the 3-Tier Theoretical Pillars below as an expandable reference
    html += `
      <div style="margin-top: 40px; border-top: 1px solid var(--border-color); padding-top: 24px;">
        <details class="pali-drawer" style="margin-top: 10px;">
          <summary style="font-weight: 700; color: var(--gold-primary); cursor: pointer; font-size: 0.98rem; display: flex; align-items: center; justify-content: space-between;">
            <span>${renderIcon('kammatthana', 18)} មើលរចនាសម្ព័ន្ធសសរទ្រទ្រង់ ៤ នៃ សីល សមាធិ បញ្ញា (Theoretical Pillars)</span>
            ${renderIcon('chevronDown', 16)}
          </summary>
          <div class="stepping-grid" style="margin-top: 16px;">
            ${STEPPING_STONES.map(s => `
              <div class="stepping-card ${s.id}-card">
                <div>
                  <span class="stepstone-badge badge-${s.id}">${s.badge}</span>
                  <h3 style="font-size: 1.25rem; margin: 10px 0 4px;">${s.name}</h3>
                  <div style="font-size: 0.86rem; color: var(--gold-primary); font-weight: 600; margin-bottom: 8px;">${s.pali}</div>
                  <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 14px;">
                    ${s.desc}
                  </p>
                  <div>
                    <strong style="font-size: 0.88rem; color: var(--text-primary);">សសរទ្រទ្រង់ទាំង ៤៖</strong>
                    <div style="margin-top: 6px;">
                      ${s.pillars.map(p => `
                        <div style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 7px 10px; margin-bottom: 6px; font-size: 0.84rem;">
                          <strong style="color: var(--text-primary);">${p.title}</strong>
                          <div style="color: var(--text-secondary); margin-top: 2px;">${p.desc}</div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
                <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 12px;">
                  <a href="${s.tripitakaUrl}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.8rem; font-weight: 700;">
                    ${renderIcon('citations', 12)} អានក្នុង ${s.bookTitle} ${renderIcon('externalLink', 10)}
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        </details>
      </div>
    `;

    container.innerHTML = html;
  }

  // Daily Routine Cycle (Morning, Day, Evening) with Collapsible Pāḷi Drawers & Tabs
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

    // Filter phases
    const phasesToShow = this.activeRoutinePhase === 'all'
      ? DAILY_ROUTINE_CYCLE
      : DAILY_ROUTINE_CYCLE.filter(p => p.phaseId === this.activeRoutinePhase);

    container.innerHTML = phasesToShow.map(phase => `
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
                <div class="checklist-checkbox">${isDone ? renderIcon('check', 14) : ''}</div>
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 4px;">
                    <span style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${h.title}</span>
                    <span class="stepstone-badge ${h.badgeClass}">${h.stepStone}</span>
                  </div>
                  <div style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">${h.desc}</div>

                  <!-- Collapsible Pāḷi Drawer -->
                  <details class="pali-drawer" onclick="event.stopPropagation();">
                    <summary class="pali-drawer-summary">
                      <span class="pali-snippet">« ${h.paliFormula.substring(0, 36)}... »</span>
                      <span class="pali-drawer-badge">ស្មូតធម៌ ${renderIcon('chevronDown', 12)}</span>
                    </summary>
                    <div class="pali-drawer-content">
                      <div class="pali-verse-text">« ${h.paliFormula} »</div>
                      <div style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 8px;">${h.translation}</div>
                      <div style="display: flex; justify-content: flex-end;">
                        <a href="${h.tripitakaUrl}" target="_blank" rel="noopener" class="citation-badge">
                          ${renderIcon('citations', 12)} ${h.tripitakaLabel} ${renderIcon('externalLink', 10)}
                        </a>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-habit-id]').forEach(item => {
      item.addEventListener('click', (e) => {
        // Prevent toggle if clicking inside details
        if (e.target.closest('details')) return;
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

  // Canonical Similes & Lost Breath Guidance
  renderAnapanasatiGuides() {
    const container = document.getElementById('anapanasati-similes-container');
    if (!container) return;

    container.innerHTML = `
      <div class="card" style="margin-top: 24px; border-left: 4px solid var(--gold-primary);">
        <h3 style="font-size: 1.15rem; margin-bottom: 12px; color: var(--text-primary);">
          ឧបមា ៣ យ៉ាងក្នុងគម្ពីរអានាបានស្សតិ (Visuddhimagga Similes)
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">
          ${ANAPANASATI_SIMILES.map(s => `
            <div style="background: var(--bg-secondary); border-radius: var(--radius-md); padding: 14px;">
              <strong style="color: var(--gold-primary); font-size: 0.95rem;">${s.name}</strong>
              <div style="font-size: 0.84rem; color: var(--text-muted); font-style: italic; margin: 4px 0;">${s.quote}</div>
              <div style="font-size: 0.86rem; color: var(--text-secondary); margin-top: 4px;">${s.instruction}</div>
              <div style="margin-top: 8px; text-align: right;">
                <a href="${s.tripitakaUrl}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.74rem;">
                  ${renderIcon('citations', 10)} ${s.bookRef} ${renderIcon('externalLink', 8)}
                </a>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 18px; background: var(--gold-subtle); border-radius: var(--radius-md); padding: 16px;">
          <h4 style="font-size: 1rem; color: var(--gold-primary); margin-bottom: 6px;">
            ${LOST_BREATH_REMEDY.title}
          </h4>
          <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 6px;">
            <strong>មូលហេតុ៖</strong> ${LOST_BREATH_REMEDY.cause}
          </p>
          <p style="font-size: 0.88rem; color: var(--text-primary); font-weight: 600;">
            <strong>វិធីដោះស្រាយ៖</strong> ${LOST_BREATH_REMEDY.instruction}
          </p>
          <div style="margin-top: 8px; text-align: right;">
            <a href="${LOST_BREATH_REMEDY.tripitakaUrl}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.74rem;">
              ${renderIcon('citations', 10)} ${LOST_BREATH_REMEDY.bookRef} ${renderIcon('externalLink', 8)}
            </a>
          </div>
        </div>
      </div>
    `;
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
            <span>យោងតាមវិសុទ្ធិមគ្គ សមាធិនិទ្ទេស ភាគ ១ ទំព័រ ៧៥–៩៣</span>
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
        <span class="hero-tag">លទ្ធផលវិនិច្ឆ័យចរិត តាមគម្ពីរវិសុទ្ធិមគ្គ</span>
        <h2 style="font-size: 1.8rem; margin: 12px 0 6px;">${profile.name}</h2>
        <p style="color: var(--text-secondary); max-width: 600px; margin: 0 auto 20px;">${profile.sub}</p>
        
        <div style="background: var(--bg-secondary); border-radius: var(--radius-md); padding: 20px; text-align: left; margin-bottom: 24px;">
          <div style="margin-bottom: 12px;">
            <strong style="color: var(--gold-primary);">កម្មដ្ឋានចម្បង (Pārihāriya)៖</strong>
            <div style="font-size: 1.1rem; font-weight: 700; margin-top: 4px;">${profile.primaryKammatthana}</div>
          </div>
          <div style="margin-bottom: 12px;">
            <strong>ឱវាទក្នុងវិសុទ្ធិមគ្គ៖</strong>
            <p style="font-size: 0.92rem; color: var(--text-secondary); margin-top: 4px;">${profile.remedyText}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <strong>សប្បាយសមគួរ (Sappāya 7)៖</strong>
            <p style="font-size: 0.92rem; color: var(--text-secondary); margin-top: 4px;">${profile.sappaya}</p>
          </div>
          <div>
            <strong>ការសម្រេចឈានខ្ពស់បំផុត៖</strong>
            <span style="font-size: 0.92rem; color: var(--accent-sage); font-weight: 600;">${profile.attainment}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: center; gap: 12px;">
          <button class="btn-primary" data-view-target="practice">
            ${renderIcon('meditator', 18)} ចាប់ផ្តើមភាវនាឥឡូវនេះ
          </button>
          <button class="btn-secondary" id="btn-retake-quiz">
            ${renderIcon('reset', 16)} ធ្វើតេស្តឡើងវិញ
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.samadhiApp = new SamadhiApp();
  });
} else {
  window.samadhiApp = new SamadhiApp();
}
