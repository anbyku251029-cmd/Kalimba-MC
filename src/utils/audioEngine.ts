import { PITCH_TO_KEY } from '../constants/kalimbaKeys';

class KalimbaAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private activeVoices: { stop: () => void }[] = [];

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public ensureReady() {
    this.initContext();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  /**
   * Synthesize a warm, realistic Kalimba chime sound
   */
  public playNote(pitch: string, durationBeats: number = 1, tempoBpm: number = 80, speedMultiplier: number = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const keyDef = PITCH_TO_KEY.get(pitch);
    if (!keyDef) return;

    const now = this.ctx.currentTime;
    const baseFreq = keyDef.frequency;

    // Calculate sustain time based on pitch and note duration
    // Lower notes ring longer, higher notes decay faster
    const baseSustain = Math.max(0.6, 2.2 - (keyDef.index / 16) * 1.2);
    // Tempo scale
    const beatSeconds = (60 / tempoBpm) * (1 / speedMultiplier);
    const holdDuration = Math.min(baseSustain, durationBeats * beatSeconds * 1.4);

    // 1. Fundamental Oscillator (Warm sine body)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    // Subtle initial tine-pluck pitch deflection (+12 cents for 15ms)
    osc1.frequency.setValueAtTime(baseFreq * 1.012, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.015);

    // 2. High Metallic Overtone (Typical clamped-free bar overtone ~5.4x)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    const overtoneFreq = baseFreq * 5.4;
    // Keep overtone under Nyquist limit
    if (overtoneFreq < (this.ctx.sampleRate / 2) - 100) {
      osc2.frequency.setValueAtTime(overtoneFreq, now);
    } else {
      osc2.frequency.setValueAtTime(baseFreq * 2, now);
    }

    // 3. Attack Transient (Simulating fingernail / thumb pluck against steel tine)
    // Tiny burst of filtered noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.02); // 20ms
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(Math.min(3000, baseFreq * 3), now);
    noiseFilter.Q.setValueAtTime(3.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // Envelope for Fundamental
    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(0.0001, now);
    // Fast 3ms attack to eliminate speaker clicks
    gain1.gain.linearRampToValueAtTime(0.65, now + 0.004);
    // Exponential decay
    gain1.gain.exponentialRampToValueAtTime(0.2, now + holdDuration * 0.4);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + holdDuration);

    // Envelope for Overtone (dies quickly, giving the metallic sparkle)
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.003);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(0.25, holdDuration * 0.3));

    // Wooden Body Resonator Filter (simulates the wooden soundbox cavity)
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'peaking';
    bodyFilter.frequency.setValueAtTime(450, now);
    bodyFilter.Q.setValueAtTime(1.5, now);
    bodyFilter.gain.setValueAtTime(3.0, now);

    osc1.connect(gain1);
    gain1.connect(bodyFilter);

    osc2.connect(gain2);
    gain2.connect(bodyFilter);

    bodyFilter.connect(this.masterGain);

    try {
      noiseSource.start(now);
      osc1.start(now);
      osc2.start(now);

      const stopTime = now + holdDuration + 0.05;
      noiseSource.stop(now + 0.02);
      osc1.stop(stopTime);
      osc2.stop(stopTime);

      const voice = {
        stop: () => {
          try {
            gain1.gain.cancelScheduledValues(this.ctx?.currentTime || 0);
            gain1.gain.setValueAtTime(gain1.gain.value, this.ctx?.currentTime || 0);
            gain1.gain.exponentialRampToValueAtTime(0.0001, (this.ctx?.currentTime || 0) + 0.02);
            setTimeout(() => {
              try {
                osc1.stop();
                osc2.stop();
              } catch {
                // already stopped
              }
            }, 30);
          } catch {
            // ignore
          }
        },
      };

      this.activeVoices.push(voice);
      setTimeout(() => {
        const idx = this.activeVoices.indexOf(voice);
        if (idx !== -1) this.activeVoices.splice(idx, 1);
      }, (holdDuration + 0.1) * 1000);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  /**
   * Pleasant woodblock metronome click
   */
  public playClick(accent: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(accent ? 1200 : 750, now);
    osc.frequency.exponentialRampToValueAtTime(accent ? 600 : 350, now + 0.03);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(accent ? 0.35 : 0.2, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Stop any ringing voices immediately
   */
  public stopAll() {
    this.activeVoices.forEach((v) => v.stop());
    this.activeVoices = [];
  }
}

export const audioEngine = new KalimbaAudioEngine();
