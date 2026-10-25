// ==========================================================================
// Samādhi Daily Guide - Application Controller (Redesigned)
// Method strictly grounded in Visuddhimagga (Volumes v1 through v8)
// Pure SVG Iconography & Humane Meditative Design System
// ==========================================================================

import { audioEngine } from './audio.js?v=2.2.2';
import { renderIcon } from './icons.js?v=2.2.2';
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
  LOST_BREATH_REMEDY,
  SAMADHI_PRACTICE_METHODS,
  PANNA_NAMARUPA
} from './data.js?v=2.2.2';

function getTripitakaUrl(refText) {
  if (!refText) return "https://www.tripitaka82.com/";
  let v = "v2";
  if (refText.includes("ភាគ ១") && refText.includes("សីលនិទ្ទេស")) v = "v1";
  else if (refText.includes("សីលនិទ្ទេស")) v = "v1";
  else if (refText.includes("សមាធិនិទ្ទេស ភាគ ១") || (refText.includes("ភាគ ១") && !refText.includes("បញ្ញានិទ្ទេស"))) v = "v2";
  else if (refText.includes("សមាធិនិទ្ទេស ភាគ ២") || refText.includes("ភាគ ២")) v = "v3";
  else if (refText.includes("សមាធិនិទ្ទេស ភាគ ៣") || refText.includes("ភាគ ៣")) v = "v4";
  else if (refText.includes("សមាធិនិទ្ទេស ភាគ ៤") || refText.includes("ភាគ ៤")) v = "v5";
  else if (refText.includes("បញ្ញានិទ្ទេស ភាគ ៦") || refText.includes("ភាគ ៦") || refText.includes("ភាគ ៥")) v = "v6";
  else if (refText.includes("បញ្ញានិទ្ទេស ភាគ ៧") || refText.includes("ភាគ ៧")) v = "v7";
  else if (refText.includes("បញ្ញានិទ្ទេស ភាគ ៨") || refText.includes("ភាគ ៨")) v = "v8";
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
    
    // Samādhi & Paññā Active State
    this.currentSamadhiMethod = 'anapanasati';
    this.currentPannaTab = 'rupa28';

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
    this.renderSamadhiMethodSelector();
    this.renderSelectedSamadhiMethod('anapanasati');
    this.renderPannaModule();
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
              <span class="checklist-title">${p.id}. ${p.khmer} <span style="font-family: var(--font-pali); color: var(--gold-primary); font-size: 0.88rem; font-weight: 600;">« ${p.paliKhmer || p.khmer} »</span></span>
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
          <div class="k-pali" style="font-family: var(--font-pali); color: var(--gold-primary); font-size: 0.95rem; font-weight: 700;">« ${k.paliKhmer || k.name} »</div>
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
        <div class="curriculum-level" style="font-family: var(--font-pali); font-weight: 700; color: var(--gold-primary);">
          « ${c.paliKhmer || c.pali} »
        </div>
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
        <div style="margin-top: 14px; display: flex; justify-content: flex-end;">
          <a href="${c.tripitakaUrl || 'https://www.tripitaka82.com/'}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.82rem; padding: 4px 12px;">
             ${c.bookRef || 'វិសុទ្ធិមគ្គ'} ↗
          </a>
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
            <div class="card-sub" style="font-family: var(--font-pali); color: var(--gold-primary); font-weight: 600;">
              « ${n.paliKhmer || n.khmer} »
            </div>
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
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 12px;">
            <div style="background: var(--gold-subtle); padding: 6px 12px; border-radius: var(--radius-sm); font-size: 0.84rem; color: var(--gold-primary); font-weight: 600;">
              អង្គឈានដែលកើតមកជំនួស៖ ${n.jhānaFactor}
            </div>
            <a href="${n.tripitakaUrl || getTripitakaUrl(n.bookRef)}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.8rem; padding: 4px 10px;">
               ${n.bookRef} ↗
            </a>
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
              ${renderIcon('steppingStones', 16)} វឌ្ឍនភាពនៃការទន្ទេញមេរៀនគ្រឹះ តាមគម្ពីរវិសុទ្ធិមគ្គ
            </div>
            <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">
              ${isAllCompleted ? `សម្រេចជោគជ័យគ្រប់ ${totalSteps} ជំហាន (១០០%)` : `សម្រេច ${completedCount}/${totalSteps} ជំហាន (${progressPct}%) — កំពុងនៅជំហានទី ${this.steppingUnlocked}`}
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
          <h3 style="font-size: 1.45rem; color: var(--gold-primary); margin-bottom: 8px;">សាធុ! សាធុ! អ្នកបានឆ្លងកាត់ជណ្តើរទាំង ${totalSteps} នៃវិសុទ្ធិមគ្គជាស្ថាពរ</h3>
          <p style="color: var(--text-secondary); max-width: 640px; margin: 0 auto 16px; font-size: 0.95rem; line-height: 1.7;">
            អ្នកបានទន្ទេញចាំមាត់នូវគាថាពុទ្ធដីកា និងវាក្យគន្លឹះដ៏ពិសិដ្ឋទាំង ${totalSteps} ដំណាក់កាល (ឯកវីសតិបទដ្ឋាន) គ្រប់ដណ្តប់លើគម្ពីរវិសុទ្ធិមគ្គទាំង ៨ ភាគ តាំងពី សីលនិទ្ទេស (គាថាដើម សីលេ បតិដ្ឋាយ, ចតុបារិសុទ្ធិសីល, ធុតង្គ), សមាធិនិទ្ទេស (ទសបលិពោធ, ចរិត ៦, ចតុរារក្ខា, និមិត្ត ៣, អង្គឈាន ៥, បញ្ចវសី, ៣២ កោដ្ឋាស, មរណស្សតិ, ឧបមាអ្នករក្សាទ្វារ-រណារ, ឧបាយខ្យល់បាត់, ចតុរប្បមញ្ញា, ចតុធាតុវវដ្ឋាន) រហូតដល់ បញ្ញានិទ្ទេស (បញ្ចក្ខន្ធ, នាមរូបបរិច្ឆេទ, បច្ចយបរិគ្គហ, វិបស្សនូបក្កិលេស, វិបស្សនាញាណ និងអរិយមគ្គ-ផល)។ គ្រឹះនៃព្រះបរិយត្តិរបស់អ្នកមានភាពរឹងមាំពេញលេញហើយ សូមបន្តចូលកាន់ការចម្រើនភាវនាជាប្រចាំថ្ងៃ!
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
              ជំហាន ${s.step} នៃ ${totalSteps}
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
                  <span>${renderIcon('citations', 14)} គាថា និងវាក្យគន្លឹះបាលីអក្ខរាខ្មែរដែលត្រូវទន្ទេញចាំមាត់</span>
                </div>
                <div class="pali-verse-text">${s.paliVerse.replace(/\n/g, '<br>')}</div>
                
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
            <strong style="color: var(--gold-primary);">កម្មដ្ឋានចម្បងដែលសមស្របនឹងនិស្ស័យ៖</strong>
            <div style="font-size: 1.1rem; font-weight: 700; margin-top: 4px;">${profile.primaryKammatthana}</div>
          </div>
          <div style="margin-bottom: 12px;">
            <strong>ឱវាទក្នុងវិសុទ្ធិមគ្គ៖</strong>
            <p style="font-size: 0.92rem; color: var(--text-secondary); margin-top: 4px;">${profile.remedyText}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <strong>ទីសេនាសនៈ និងបរិយាកាសសប្បាយសមគួរ៖</strong>
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

  // ==========================================
  // All 8 Samādhi Methods Practice Selector
  // ==========================================
  renderSamadhiMethodSelector() {
    const container = document.getElementById('practice-method-pills');
    if (!container || !SAMADHI_PRACTICE_METHODS) return;

    const methodIcons = {
      anapanasati: '',
      buddhanussati: '️',
      metta: '',
      maranassati: '⌛',
      kayagata: '',
      catudhatu: '',
      kasina: '',
      asubha: '️'
    };

    container.innerHTML = SAMADHI_PRACTICE_METHODS.map(m => `
      <button class="practice-method-pill ${m.id === this.currentSamadhiMethod ? 'active' : ''}" data-method-id="${m.id}">
        <span>${methodIcons[m.id] || ''}</span>
        <span>${m.name}</span>
      </button>
    `).join('');

    container.querySelectorAll('[data-method-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-method-id');
        this.selectSamadhiMethod(id);
      });
    });
  }

  selectSamadhiMethod(methodId) {
    this.currentSamadhiMethod = methodId;
    document.querySelectorAll('.practice-method-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-method-id') === methodId);
    });
    this.renderSelectedSamadhiMethod(methodId);
    audioEngine.playBreathCue(true);
  }

  renderSelectedSamadhiMethod(methodId) {
    const method = (SAMADHI_PRACTICE_METHODS || []).find(m => m.id === methodId) || SAMADHI_PRACTICE_METHODS[0];
    if (!method) return;

    // 1. Render Hero Card
    const heroCard = document.getElementById('practice-method-hero');
    if (heroCard) {
      heroCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
          <div>
            <span class="hero-tag">${method.category} · ${method.tripitakaRef}</span>
            <h2 style="font-size: 1.55rem; margin: 8px 0 4px; color: var(--text-primary);">
              ${method.name} <span style="color: var(--gold-primary); font-weight: 700; font-family: var(--font-pali);">« ${method.namePaliKhmer || method.name} »</span>
            <div style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; max-width: 800px;">
              ${method.description}
            </div>
          </div>
          <a href="https://www.tripitaka82.com/read.html?book=${method.tripitakaVol}&page=${method.tripitakaPage}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.85rem; padding: 6px 12px;">
             អានក្នុងគម្ពីរដើម ↗
          </a>
        </div>

        <div class="method-meta-strip">
          <span class="meta-pill highlight">ឈានខ្ពស់បំផុត៖ ${method.maxJhana}</span>
          <span class="meta-pill">សមស្របនឹង៖ ${method.caritaSuitability}</span>
          <span class="meta-pill">ក្បាលគម្ពីរ៖ ${method.tripitakaVol.toUpperCase()} (p. ${method.tripitakaPage})</span>
        </div>
      `;
    }

    // 2. Render Visual Focal Center
    const visualCenter = document.getElementById('practice-visual-center');
    if (visualCenter) {
      if (method.id === 'anapanasati') {
        visualCenter.innerHTML = `
          <!-- Touch-Point Selector -->
          <div style="margin-bottom: 12px; width: 100%; text-align: center;">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-bottom: 8px;">
              ស្ថានទីដែលខ្យល់ប៉ះខ្ទប់ (ផុសនស្ថាន)
            </div>
            <div class="touch-selector" style="justify-content: center;">
              <button class="touch-option ${this.touchPoint === 'nose' ? 'active' : ''}" data-touch-point="nose">
                ${renderIcon('touchNose', 16)} ចុងច្រមុះ (នាសិកគ្គ)
              </button>
              <button class="touch-option ${this.touchPoint === 'lip' ? 'active' : ''}" data-touch-point="lip">
                ${renderIcon('touchLip', 16)} បបូរមាត់លើ (ឧត្តរោដ្ឋ)
              </button>
            </div>
            <div id="touch-point-desc" style="font-size: 0.84rem; color: var(--accent-sage); font-weight: 600; margin-top: 6px;">
              ${this.touchPoint === 'nose' ? "តម្កល់សតិដឹងត្រង់ចុងច្រមុះ (នាសិកគ្គ) - សម្រាប់មនុស្សច្រមុះវែង" : "តម្កល់សតិដឹងត្រង់បបូរមាត់ខាងលើ (ឧត្តរោដ្ឋ) - សម្រាប់មនុស្សច្រមុះខ្លី"}
            </div>
          </div>

          <!-- Breathing Orb with Wave Ripple -->
          <div class="orb-container">
            <div class="orb-ripple"></div>
            <div class="breathing-orb" id="breathing-orb">
              <div class="orb-count" id="orb-count">${this.breathCount}</div>
              <div class="orb-phase" id="orb-phase-label">ត្រៀមខ្លួន</div>
            </div>
          </div>

          <!-- Method count mode switcher -->
          <div style="margin-top: 16px;">
            <button class="btn-secondary" id="btn-toggle-count-mode" style="font-size: 0.88rem;">
              ${this.countMode === 'slow' ? "វិធីរាប់យឺត (ដូចវាល់អង្ករ)" : "វិធីរាប់លឿន (ដូចគោបាល)"}
            </button>
            <p id="count-mode-hint" style="font-size: 0.84rem; color: var(--text-muted); margin-top: 6px;">
              ${this.countMode === 'slow' ? "ដកដង្ហើមចូល-ចេញរួចទើបរាប់ ១, ដកដង្ហើមចូល-ចេញរួចរាប់ ២... (រាប់ចន្លោះ ៥ ដល់ ១០)" : "ដកចូល ១ ដកចេញ ១, ដកចូល ២ ដកចេញ ២... (រាប់ញាប់តាមចង្វាក់ខ្យល់ប៉ះ)"}
            </p>
          </div>
        `;
        this.bindAnapanasatiVisualEvents();
      } else {
        let focalHtml = '';
        if (method.id === 'buddhanussati') {
          focalHtml = `
            <div class="visual-focal-box">
              <div class="radiant-wheel">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" stroke-width="1.75" style="width:64px;height:64px;"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3v6.5M12 14.5V21M3 12h6.5M14.5 12H21M5.64 5.64l4.6 4.6M13.76 13.76l4.6 4.6M18.36 5.64l-4.6 4.6M10.24 13.76l-4.6 4.6"/></svg>
              </div>
              <div class="focal-mantra-badge">« ឥតិបិ សោ ភគវា អរហំ សម្មាសម្ពុទ្ធោ »</div>
              <p style="font-size:0.86rem; color:var(--text-secondary); margin-top:8px;">ផ្ចង់ចិត្តរំពឹងដល់ព្រះបរិសុទ្ធិគុណ ព្រះមហាករុណាគុណ និងព្រះបញ្ញាគុណ</p>
            </div>
          `;
        } else if (method.id === 'metta') {
          focalHtml = `
            <div class="visual-focal-box">
              <div class="radiant-wheel" style="background: radial-gradient(circle, rgba(230, 57, 70, 0.15) 0%, transparent 70%); border-color: #E63946; box-shadow: 0 0 30px rgba(230, 57, 70, 0.3);">
                <svg viewBox="0 0 24 24" fill="#E63946" style="width:58px;height:58px;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <div class="focal-mantra-badge" style="color: #E63946; background: rgba(230, 57, 70, 0.1); border-color: rgba(230, 57, 70, 0.3);">« សព្វេ សត្តា សុខិតា ហោន្តុ »</div>
              <p style="font-size:0.86rem; color:var(--text-secondary); margin-top:8px;">ផ្សាយមេត្តាចិត្តទន់ភ្លន់ គ្មានព្រំដែន គ្មានពៀរ ទៅកាន់សត្វលោកទាំងពួងក្នុងទិសទាំង ១០</p>
            </div>
          `;
        } else if (method.id === 'maranassati') {
          focalHtml = `
            <div class="visual-focal-box">
              <div class="radiant-wheel" style="border-color: var(--accent-sage);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" style="width:58px;height:58px;color:var(--text-primary);"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>
              </div>
              <div class="focal-mantra-badge">« មរណំ មេ ភវិស្សតិ · ជីវិតំ មេ អនិយតំ »</div>
              <p style="font-size:0.86rem; color:var(--text-secondary); margin-top:8px;">សេចក្តីស្លាប់នឹងមានដល់ខ្ញុំជាប្រាកដ, ជីវិតមិនទៀងទេ តែសេចក្តីស្លាប់ទៀងណាស់</p>
            </div>
          `;
        } else if (method.id === 'kayagata') {
          focalHtml = `
            <div class="visual-focal-box">
              <div class="radiant-wheel" style="border-color: #6C757D;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" style="width:58px;height:58px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <div class="focal-mantra-badge">« កេសា លោមា នខា ធន្តា តចោ »</div>
              <p style="font-size:0.86rem; color:var(--text-secondary); margin-top:8px;">សក់ រោម ក្រចក ធ្មេញ ស្បែក... ពិចារណាកោដ្ឋាស ៣២ ដូចស្រាយមាត់ថង់ធញ្ញជាតិ</p>
            </div>
          `;
        } else if (method.id === 'catudhatu') {
          focalHtml = `
            <div class="visual-focal-box">
              <div class="elements-grid">
                <div class="element-pill-card"><strong>បឋវីធាតុ (ដី)</strong>លក្ខណៈរឹង & ទន់</div>
                <div class="element-pill-card"><strong>អាបោធាតុ (ទឹក)</strong>លក្ខណៈហូរ & ស្អិត</div>
                <div class="element-pill-card"><strong>តេជោធាតុ (ភ្លើង)</strong>លក្ខណៈក្តៅ & ត្រជាក់</div>
                <div class="element-pill-card"><strong>វាយោធាតុ (ខ្យល់)</strong>លក្ខណៈតឹង & រុញច្រាន</div>
              </div>
              <div class="focal-mantra-badge">« ធាតុវវត្ថានំ · អត្ថិ ឥមស្មឹ កាយេ ធាតុយោ »</div>
            </div>
          `;
        } else if (method.id === 'kasina') {
          focalHtml = `
            <div class="visual-focal-box">
              <div class="earth-kasina-disk">
                បឋវីកសិណ
              </div>
              <div class="focal-mantra-badge">« បឋវី បឋវី (ដី... ដី...) »</div>
              <p style="font-size:0.86rem; color:var(--text-secondary); margin-top:8px;">កំណត់និមិត្តមណ្ឌលដីរលោងស្មើ រហូតកើតបដិភាគនិមិត្តថ្លាដូចកញ្ចក់</p>
            </div>
          `;
        } else if (method.id === 'asubha') {
          focalHtml = `
            <div class="visual-focal-box">
              <div class="radiant-wheel" style="border-color: #495057;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" style="width:58px;height:58px;"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              </div>
              <div class="focal-mantra-badge">« ឧទ្ធុមាតកំ អសុភំ »</div>
              <p style="font-size:0.86rem; color:var(--text-secondary); margin-top:8px;">ពិចារណារូបសាកសពកាត់បន្ថយរាគៈ រហូតកើតចិត្តស្ងប់ស្ងៀមបរិសុទ្ធ</p>
            </div>
          `;
        }
        visualCenter.innerHTML = focalHtml;
      }
    }

    // 3. Render Practice Steps Accordion with Khmer Pali & Canonical Citations
    const stepsContainer = document.getElementById('practice-steps-container');
    if (stepsContainer && method.practiceSteps) {
      stepsContainer.innerHTML = `
        <div style="font-size: 1.18rem; font-weight: 700; color: var(--text-primary); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
          <span></span> វិធីចម្រើនតាមលំដាប់ ៤ ជំហាន តាមគម្ពីរវិសុទ្ធិមគ្គ (Step-by-Step Guidance)៖
        </div>
        ${method.practiceSteps.map(s => `
          <div class="practice-step-card">
            <div class="practice-step-header">
              <div class="step-number-circle">${s.stepNum}</div>
              <div class="practice-step-title">${s.title}</div>
            </div>
            <div class="practice-step-instruction">${s.instruction}</div>

            <!-- Authentic Pali Formula in Khmer Script -->
            <div class="pali-chant-box" style="background: var(--bg-secondary); border-left: 3px solid var(--gold-primary); padding: 12px 16px; border-radius: var(--radius-sm); margin: 12px 0;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--gold-primary); margin-bottom: 4px; letter-spacing: 0.5px;">
                 បាលីភាវនា (អក្ខរាខ្មែរ) ៖
              </div>
              <div class="pali-verse-text" style="font-size: 1.05rem; font-weight: 700; line-height: 1.6; color: var(--text-primary); font-family: var(--font-pali);">
                « ${s.paliChantKhmer || s.paliChant} »
              </div>
              <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 8px; border-top: 1px dashed rgba(184, 123, 34, 0.25); padding-top: 8px; line-height: 1.5;">
                <strong style="color: var(--text-primary);">ប្រែសម្រាយខ្មែរ៖</strong> ${s.khmerTranslation}
              </div>
            </div>

            <!-- Direct Canonical Citation to tripitaka82.com -->
            <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 10px;">
              <a href="${s.tripitakaUrl || `https://www.tripitaka82.com/read.html?book=${method.tripitakaVol}&page=${method.tripitakaPage}`}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.82rem; padding: 4px 12px;">
                 ${s.tripitakaRef || method.tripitakaRef} ↗
              </a>
            </div>
          </div>
        `).join('')}
      `;
    }

    // 4. Render Nimitta Progress
    const nimittaContainer = document.getElementById('practice-nimitta-container');
    if (nimittaContainer && method.nimittaGuide) {
      nimittaContainer.innerHTML = `
        <div class="nimitta-guide-card">
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
             ការវិវត្តនៃនិមិត្តទាំង ៣ (Nimitta Progression)៖
          </div>
          <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 12px;">
            ដំណើរចិត្តពីការចាប់ផ្តើមរហូតដល់សម្រេចឈានក្នុងកម្មដ្ឋាននេះ៖
          </p>
          <div class="nimitta-timeline">
            <div class="nimitta-timeline-item">
              <strong>១. បរិកម្មនិមិត្ត</strong>
              <p>${method.nimittaGuide.parikamma}</p>
            </div>
            <div class="nimitta-timeline-item">
              <strong>២. ឧគ្គហនិមិត្ត</strong>
              <p>${method.nimittaGuide.uggaha}</p>
            </div>
            <div class="nimitta-timeline-item">
              <strong>៣. បដិភាគនិមិត្ត</strong>
              <p>${method.nimittaGuide.patibhaga}</p>
            </div>
          </div>
        </div>
      `;
    }

    // 5. Canonical Similes container
    const similesContainer = document.getElementById('anapanasati-similes-container');
    if (similesContainer) {
      if (method.id === 'anapanasati') {
        this.renderAnapanasatiGuides();
      } else {
        similesContainer.innerHTML = '';
      }
    }
  }

  bindAnapanasatiVisualEvents() {
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
  }

  // ==========================================
  // Paññā Niddesa (Nāma & Rūpa) Module
  // ==========================================
  renderPannaModule() {
    document.querySelectorAll('[data-panna-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabKey = e.currentTarget.getAttribute('data-panna-tab');
        this.currentPannaTab = tabKey;
        document.querySelectorAll('[data-panna-tab]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.renderPannaTabContent(tabKey);
      });
    });

    this.renderPannaTabContent(this.currentPannaTab);
  }

  renderPannaTabContent(tabKey) {
    const container = document.getElementById('panna-tab-content');
    if (!container || !PANNA_NAMARUPA) return;

    if (tabKey === 'rupa28') {
      const { mahabhuta4, upadarupa24, samutthana4 } = PANNA_NAMARUPA.rupa28;
      container.innerHTML = `
        <div class="panna-section-header">
          <div class="panna-section-title"> មហាភូតរូប ៤ (The 4 Great Essentials in Khmer Pali)</div>
          <div class="panna-section-desc">
            ធាតុដើមទាំង ៤ ជាគ្រឹះទ្រទ្រង់រូបកាយទាំងមូល គ្មានពណ៌ គ្មានរូបរាង តែមានលក្ខណៈជាក់ស្តែងប៉ះដឹងបានដោយកាយសម្ផ័ស្ស៖
          </div>
        </div>

        <div class="mahabhuta-grid">
          ${mahabhuta4.map(m => `
            <div class="mahabhuta-card">
              <h3>${m.nameKh}</h3>
              <div class="pali" style="font-size: 0.95rem; font-weight: 700; color: var(--gold-primary); margin-bottom: 8px; font-family: var(--font-pali);">
                « ${m.namePaliKhmer} » — ${m.meaning}
              </div>
              <div class="trait-row"><strong>លក្ខណៈ៖</strong> ${m.lakkhana}</div>
              <div class="trait-row"><strong>កិច្ច (រស)៖</strong> ${m.kicca}</div>
              <div class="trait-row"><strong>ការប្រាកដ៖</strong> ${m.paccupatthana}</div>
              <div class="anchor-box" style="background: var(--bg-secondary); padding: 8px 12px; border-radius: var(--radius-sm); margin: 10px 0; font-size: 0.85rem;">
                 <strong>ចំណុចពិចារណា៖</strong> ${m.dailyAnchor}
              </div>
              <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                <a href="${m.tripitakaUrl}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.78rem;">
                   ${m.tripitakaRef} ↗
                </a>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="panna-section-header" style="margin-top: 36px;">
          <div class="panna-section-title"> ឧបាទាយរូប ២៤ (24 Derived Matter with Canonical Citations)</div>
          <div class="panna-section-desc">រូបដែលកើតអាស្រ័យនឹងមហាភូតរូប ៤ ចែកជា ១០ ពួក តាមគម្ពីរវិសុទ្ធិមគ្គ បញ្ញានិទ្ទេស ភាគ ៦៖</div>
        </div>

        <div class="upadarupa-grid">
          ${upadarupa24.map(u => `
            <div class="upadarupa-item">
              <span class="group-badge">${u.groupKh}</span>
              <h4>${u.id}. ${u.nameKh}</h4>
              <div style="font-size: 0.88rem; color: var(--gold-primary); font-weight: 700; margin-bottom: 4px; font-family: var(--font-pali);">
                « ${u.namePaliKhmer || u.namePali} »
              </div>
              <p>${u.desc}</p>
              <div style="font-size: 0.82rem; color: var(--text-muted); margin: 6px 0;"> ${u.dailyAnchor}</div>
              <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
                <a href="${u.tripitakaUrl}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.75rem;">
                   ${u.tripitakaRef} ↗
                </a>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="card" style="margin-top: 24px; border-left: 4px solid var(--gold-primary);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
            <h3 style="font-size: 1.15rem; margin: 0;"> សមុដ្ឋាន ៤ នៃរូប (The 4 Origins of Physical Matter)</h3>
            <a href="https://www.tripitaka82.com/read.html?book=v6&page=35" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.78rem;">
               វិសុទ្ធិមគ្គ ភាគ ៦ ទំព័រ ៣៥–៤០ ↗
            </a>
          </div>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 12px;">រូបធម៌ក្នុងកាយមិនមែនកើតឡើងឯកឯងទេ គឺកើតឡើងអំពីហេតុបច្ច័យ ៤ យ៉ាង៖</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
            ${samutthana4.map(s => `
              <div style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 10px 12px;">
                <strong style="color: var(--text-primary); font-size: 0.92rem;">${s.originKh}</strong>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">${s.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (tabKey === 'namaSummary') {
      const { khandhas, citta89, cetasika52 } = PANNA_NAMARUPA.namaSummary;
      container.innerHTML = `
        <div class="panna-section-header">
          <div class="panna-section-title"> អរូបក្ខន្ធ ៤ (The 4 Immaterial Mental Aggregates)</div>
          <div class="panna-section-desc">នាមធម៌ គឺធម្មជាតិដែលបង្អោនទៅកាន់អារម្មណ៍ ដឹងអារម្មណ៍ សោយអារម្មណ៍ និងតាក់តែងចេតនា៖</div>
        </div>

        <div class="grid-2" style="margin-bottom: 24px;">
          ${khandhas.map(a => `
            <div class="card" style="border-left: 4px solid var(--gold-primary);">
              <h3 style="font-size: 1.15rem; margin-bottom: 4px;">${a.nameKh}</h3>
              <div style="font-size: 0.92rem; color: var(--gold-primary); font-weight: 700; margin-bottom: 6px; font-family: var(--font-pali);">
                « ${a.namePaliKhmer || a.namePali} »
              </div>
              <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px;"><strong>កិច្ច៖</strong> ${a.function}</p>
              <div class="anchor-box" style="background: var(--bg-secondary); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.84rem; margin-bottom: 8px;">
                 <strong>ចំណុចពិចារណា៖</strong> ${a.contemplation}
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <a href="${a.tripitakaUrl}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.75rem;">
                   ${a.tripitakaRef} ↗
                </a>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
            <h3 style="font-size: 1.2rem; margin: 0;"> ធម្មជាតិនៃចិត្ត ៨៩/១២១ និងកិច្ច ១៤ យ៉ាង</h3>
            <a href="${citta89.tripitakaUrl || 'https://www.tripitaka82.com/read.html?book=v6&page=55'}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.78rem;">
               ${citta89.tripitakaRef || 'វិសុទ្ធិមគ្គ បញ្ញានិទ្ទេស ភាគ ៦ ទំព័រ ៥៥'} ↗
            </a>
          </div>
          <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 14px;">
            ${citta89.summary}
          </p>
          <div style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 14px;">
            <strong style="color: var(--text-primary); font-size: 0.95rem;">ដំណើរនៃកិច្ចរបស់ចិត្តទាំង ១៤ ក្នុងមួយខ្សែជីវិត៖</strong>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 6px; line-height: 1.6;">
              ${citta89.functions14.join(' → ')}
            </p>
          </div>
        </div>

        <div class="panna-section-header">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div class="panna-section-title"> ចេតសិក ៥២ (The 52 Mental Factors)</div>
            <a href="${cetasika52.tripitakaUrl || 'https://www.tripitaka82.com/read.html?book=v6&page=68'}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.78rem;">
               ${cetasika52.tripitakaRef || 'វិសុទ្ធិមគ្គ បញ្ញានិទ្ទេស ភាគ ៦ ទំព័រ ៦៨'} ↗
            </a>
          </div>
          <div class="panna-section-desc">${cetasika52.summary}</div>
        </div>

        <div class="grid-2">
          ${cetasika52.groups.map(g => `
            <div class="card">
              <h4 style="font-size: 1.05rem; color: var(--gold-primary); margin-bottom: 6px; font-family: var(--font-pali);">${g.groupName}</h4>
              <div style="background: var(--bg-secondary); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 0.86rem; color: var(--text-primary); line-height: 1.6;">
                ${g.factors}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (tabKey === 'similes') {
      const { similes } = PANNA_NAMARUPA;
      container.innerHTML = `
        <div class="panna-section-header">
          <div class="panna-section-title"> ឧបមាអមតៈទាំង ៣ ក្នុងវិសុទ្ធិមគ្គ (The 3 Master Similes)</div>
          <div class="panna-section-desc">ព្រះពុទ្ធឃោសាចារ្យបានលើកឧបមាដ៏អស្ចារ្យ ៣ យ៉ាង ដើម្បីកម្ចាត់សក្កាយទិដ្ឋិ (ការប្រកាន់ថាខ្លួនយើង) ឱ្យឃើញច្បាស់នូវធម្មជាតិនៃនាមនិងរូប៖</div>
        </div>

        ${similes.map(s => `
          <div class="simile-card">
            <div class="simile-card-header">
              <div class="simile-icon-bubble"></div>
              <div>
                <div class="simile-title">${s.titleKh}</div>
                <div class="simile-pali" style="color: var(--gold-primary); font-weight: 700; font-family: var(--font-pali);">
                  « ${s.paliKhmer || s.titlePali || s.paliName} » · ${s.canonicalSource || s.visuddhiChapter || "វិសុទ្ធិមគ្គ បញ្ញានិទ្ទេស ភាគ ៧"}
                </div>
              </div>
            </div>

            <div class="simile-story">${s.story || s.storyKh}</div>

            <div class="simile-breakdown">
              <div>
                <strong style="color: var(--accent-crimson);"> រូបធម៌ (Rūpa) ក្នុងឧបមា៖</strong>
                <div style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 4px;">${s.rupaRepresentation || s.rupaMeaning}</div>
              </div>
              <div>
                <strong style="color: var(--gold-primary);"> នាមធម៌ (Nāma) ក្នុងឧបមា៖</strong>
                <div style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 4px;">${s.namaRepresentation || s.namaMeaning}</div>
              </div>
            </div>

            <div class="simile-moral">
               <strong>សច្ចធម៌៖</strong> ${s.moral}
            </div>

            <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
              <a href="${s.tripitakaUrl}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.85rem; padding: 4px 12px;">
                 ${s.tripitakaRef} ↗
              </a>
            </div>
          </div>
        `).join('')}
      `;
    } else if (tabKey === 'vipassanaSteps') {
      const { vipassanaSteps, dailySensoryPortals } = PANNA_NAMARUPA;
      container.innerHTML = `
        <div class="panna-section-header">
          <div class="panna-section-title"> វិធីបដិបត្តិពិចារណានាម-រូប ៥ ជំហាន (5-Step Vipassanā Method)</div>
          <div class="panna-section-desc">វិធីចម្រើនវិបស្សនាជាក់ស្តែងក្នុងពេលអង្គុយសមាធិ តាមគន្លងវិសុទ្ធិមគ្គ ទិដ្ឋិវិសុទ្ធិ (ក្បាល ៨៩)៖</div>
        </div>

        ${vipassanaSteps.map(st => `
          <div class="vipassana-step-item">
            <span class="vipassana-step-badge">ជំហានទី ${st.step}</span>
            <div class="vipassana-step-title">${st.titleKh || st.title}</div>
            <div class="vipassana-step-pali" style="font-size: 0.95rem; font-weight: 700; color: var(--gold-primary); font-family: var(--font-pali);">
              « ${st.paliKhmer || st.paliAnchor || st.paliConcept} »
            </div>
            <div class="vipassana-step-desc">${st.instruction || st.practiceMethod}</div>
            <div class="vipassana-step-quote">« ${st.insight || st.insightQuestion} »</div>
            <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
              <a href="${st.tripitakaUrl}" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.82rem; padding: 3px 10px;">
                 ${st.tripitakaRef} ↗
              </a>
            </div>
          </div>
        `).join('')}

        <div class="card" style="margin-top: 28px; border-left: 4px solid var(--accent-sage);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
            <h3 style="font-size: 1.2rem; margin: 0;"> ទ្វារអនុវត្តន៍ពិចារណានាម-រូបក្នុងជីវិតរស់នៅប្រចាំថ្ងៃ</h3>
            <a href="https://www.tripitaka82.com/read.html?book=v7&page=435" target="_blank" rel="noopener" class="citation-badge" style="font-size: 0.78rem;">
               វិសុទ្ធិមគ្គ ភាគ ៧ ទំព័រ ៤៣៥ ↗
            </a>
          </div>
          <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
            មិនចាំបាច់តែអង្គុយបិទភ្នែកទើបពិនិត្យនាមរូបបានឡើយ គ្រប់ខណៈនៃការរស់នៅសុទ្ធតែជាកន្លែងចម្រើនបញ្ញា៖
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
            ${dailySensoryPortals.map(p => `
              <div style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 14px;">
                <strong style="color: var(--text-primary); font-size: 0.95rem;">${p.portal}</strong>
                <div style="font-size: 0.85rem; color: var(--accent-crimson); margin-top: 4px;"><strong> រូប៖</strong> ${p.rupa}</div>
                <div style="font-size: 0.85rem; color: var(--gold-primary); margin-top: 2px;"><strong> នាម៖</strong> ${p.nama}</div>
                <div style="font-size: 0.83rem; color: var(--text-muted); font-style: italic; margin-top: 6px; background: rgba(184, 123, 34, 0.08); padding: 6px 10px; border-radius: 4px;"> « ${p.mantra} »</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
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
