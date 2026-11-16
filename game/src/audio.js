// All sound is synthesised with WebAudio: oscillators and filtered noise,
// no audio files. Everything is guarded so a browser without audio (or a
// headless screenshot run) simply stays silent instead of throwing.
const NOTES = [110.0, 130.81, 164.81, 196.0, 220.0, 261.63, 293.66, 329.63];

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicOn = false;
    this._musicStep = 0;
    this._nextNoteTime = 0;
  }

  /** Create/resume the context. Call from a user gesture (start, click, key). */
  ensure() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  _tone(freq, duration, type, volume, slideTo) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch {
      /* silent */
    }
  }

  _noise(duration, volume, cutoff) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start(t0);
    } catch {
      /* silent */
    }
  }

  shoot() {
    this._tone(880, 0.09, 'square', 0.08, 220);
  }

  enemyShoot() {
    this._tone(220, 0.14, 'sawtooth', 0.05, 140);
  }

  explode(big) {
    this._noise(big ? 0.5 : 0.28, big ? 0.3 : 0.18, big ? 900 : 1400);
    this._tone(big ? 120 : 180, big ? 0.4 : 0.22, 'sine', 0.22, 40);
  }

  pickup() {
    this._tone(660, 0.08, 'sine', 0.14);
    this._tone(990, 0.12, 'sine', 0.12);
  }

  powerup() {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => this._tone(freq, 0.14, 'triangle', 0.14), i * 55);
    });
  }

  hurt() {
    this._tone(160, 0.3, 'sawtooth', 0.2, 55);
    this._noise(0.2, 0.2, 700);
  }

  waveHorn() {
    this._tone(196, 0.35, 'triangle', 0.16, 392);
    this._tone(294, 0.35, 'triangle', 0.1, 392);
  }

  gameOver() {
    [392, 311, 233, 175].forEach((freq, i) => {
      setTimeout(() => this._tone(freq, 0.32, 'triangle', 0.16), i * 170);
    });
  }

  click() {
    this._tone(520, 0.06, 'sine', 0.1);
  }

  /** One quiet bass note per call; main.js calls it on the beat while playing. */
  musicBeat() {
    if (!this.ctx || this.muted || !this.musicOn) return;
    const note = NOTES[this._musicStep % NOTES.length];
    this._musicStep += 1;
    this._tone(note / 2, 0.5, 'triangle', 0.05);
    if (this._musicStep % 4 === 0) this._tone(note * 2, 0.18, 'sine', 0.03);
  }
}
