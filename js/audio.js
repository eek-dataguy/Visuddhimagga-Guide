// ==========================================================================
// Buddhist Singing Bowl & Gong Sound Synthesizer
// Pure Web Audio API - Zero external dependencies, 100% offline
// ==========================================================================

class MeditationAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Play an authentic Tibetan/Buddhist singing bowl bell strike
  playBowl(baseFreq = 261.63, duration = 4.5) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Harmonic partial ratios typical of a metal temple singing bowl
    const partials = [
      { ratio: 1.0, gain: 0.7, decay: duration },
      { ratio: 2.76, gain: 0.45, decay: duration * 0.8 },
      { ratio: 5.40, gain: 0.25, decay: duration * 0.6 },
      { ratio: 8.93, gain: 0.12, decay: duration * 0.4 },
      { ratio: 11.3, gain: 0.05, decay: duration * 0.25 }
    ];

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.6, now);
    masterGain.connect(this.ctx.destination);

    partials.forEach((p, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Slightly detune to create peaceful acoustic shimmering beats
      const detune = idx === 0 ? 0 : (idx % 2 === 0 ? 1.5 : -1.5);
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq * p.ratio + detune, now);

      gain.gain.setValueAtTime(0.0001, now);
      // Fast strike attack
      gain.gain.exponentialRampToValueAtTime(p.gain, now + 0.04);
      // Gentle exponential decay
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + p.decay + 0.1);
    });
  }

  // Soft breath sync tick / gentle tap
  playBreathCue(isInhale = true) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    const freq = isInhale ? 440 : 330; // A4 on inhale, E4 on exhale
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.95, now + 0.15);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }
}

export const audioEngine = new MeditationAudioEngine();
