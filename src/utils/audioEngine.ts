import { PITCH_TO_KEY } from '../constants/kalimbaKeys';

export type KalimbaTimbreMode = 'default' | 'bright' | 'soft';

export interface AudioSettings {
  timbre: KalimbaTimbreMode;
  volume: number; // 0.0 ~ 1.0 (기본 0.8)
  reverbEnabled: boolean; // 공간감 잔향 (기본 true)
}

const SETTINGS_STORAGE_KEY = 'kalimba_audio_settings_v1';

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  timbre: 'default',
  volume: 0.8,
  reverbEnabled: true,
};

class KalimbaAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverbSendGain: GainNode | null = null;
  private isMuted: boolean = false;
  private settings: AudioSettings = this.loadSettings();
  private activeVoices: { stop: () => void }[] = [];

  private loadSettings(): AudioSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        timbre: ['default', 'bright', 'soft'].includes(parsed.timbre) ? parsed.timbre : 'default',
        volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 0.8,
        reverbEnabled: typeof parsed.reverbEnabled === 'boolean' ? parsed.reverbEnabled : true,
      };
    } catch {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save audio settings', e);
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // 1. Dynamics Compressor (다성부 및 피크 클리핑 방지)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      // 2. Master Gain
      this.masterGain = this.ctx.createGain();
      const currentVol = this.isMuted ? 0 : this.settings.volume;
      this.masterGain.gain.setValueAtTime(currentVol, this.ctx.currentTime);

      // 3. Ambience Reverb Send Network (부드러운 공간감)
      const delay1 = this.ctx.createDelay();
      delay1.delayTime.setValueAtTime(0.038, this.ctx.currentTime);

      const delay2 = this.ctx.createDelay();
      delay2.delayTime.setValueAtTime(0.062, this.ctx.currentTime);

      const reverbFilter = this.ctx.createBiquadFilter();
      reverbFilter.type = 'lowpass';
      reverbFilter.frequency.setValueAtTime(2500, this.ctx.currentTime);

      const reverbFeedback = this.ctx.createGain();
      reverbFeedback.gain.setValueAtTime(0.25, this.ctx.currentTime);

      this.reverbSendGain = this.ctx.createGain();
      this.reverbSendGain.gain.setValueAtTime(this.settings.reverbEnabled ? 0.28 : 0.0, this.ctx.currentTime);

      // Reverb routing
      this.reverbSendGain.connect(delay1);
      delay1.connect(reverbFilter);
      reverbFilter.connect(delay2);
      delay2.connect(reverbFeedback);
      reverbFeedback.connect(delay1);

      // Connect to master
      reverbFilter.connect(this.compressor);
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public ensureReady() {
    this.initContext();
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();

    if (this.ctx && this.masterGain) {
      const vol = this.isMuted ? 0 : this.settings.volume;
      this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
    if (this.ctx && this.reverbSendGain) {
      this.reverbSendGain.gain.setValueAtTime(
        this.settings.reverbEnabled ? 0.28 : 0.0,
        this.ctx.currentTime
      );
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.settings.volume, this.ctx.currentTime);
    }
  }

  /**
   * Synthesize a warm, realistic Kalimba chime sound with selected timbre
   */
  public playNote(
    pitch: string,
    durationBeats: number = 1,
    tempoBpm: number = 80,
    speedMultiplier: number = 1.0,
    timbreOverride?: KalimbaTimbreMode
  ) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const keyDef = PITCH_TO_KEY.get(pitch);
    if (!keyDef) return;

    const now = this.ctx.currentTime;
    const baseFreq = keyDef.frequency;
    const timbre = timbreOverride || this.settings.timbre;

    // Timbre parameters
    const isBright = timbre === 'bright';
    const isSoft = timbre === 'soft';

    // Calculate sustain time based on pitch and note duration
    // Lower notes ring longer, higher notes decay faster
    const baseSustain = isSoft
      ? Math.max(0.8, 2.5 - (keyDef.index / 16) * 1.3)
      : Math.max(0.6, 2.2 - (keyDef.index / 16) * 1.2);

    const beatSeconds = (60 / tempoBpm) * (1 / speedMultiplier);
    const holdDuration = Math.min(baseSustain, durationBeats * beatSeconds * 1.4);

    // 1. Fundamental Oscillator (Warm sine body)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    const pitchDeflectionCents = isBright ? 1.016 : isSoft ? 1.008 : 1.012;
    osc1.frequency.setValueAtTime(baseFreq * pitchDeflectionCents, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + (isBright ? 0.018 : 0.012));

    // 2. High Metallic Overtone (Typical clamped-free bar overtone ~5.4x)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    const overtoneFreq = baseFreq * 5.4;
    if (overtoneFreq < this.ctx.sampleRate / 2 - 100) {
      osc2.frequency.setValueAtTime(overtoneFreq, now);
    } else {
      osc2.frequency.setValueAtTime(baseFreq * 2, now);
    }

    // 3. Attack Transient (Simulating fingernail / thumb pluck against steel tine)
    const bufferSize = Math.floor(this.ctx.sampleRate * (isSoft ? 0.012 : isBright ? 0.024 : 0.018));
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(Math.min(3200, baseFreq * (isBright ? 3.5 : 2.8)), now);
    noiseFilter.Q.setValueAtTime(isBright ? 4.0 : 2.5, now);

    const noiseGain = this.ctx.createGain();
    const noiseLevel = isSoft ? 0.04 : isBright ? 0.12 : 0.08;
    noiseGain.gain.setValueAtTime(noiseLevel, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + (isSoft ? 0.012 : 0.02));

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // Fundamental Envelope (with high-pitch energy smoothing)
    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(0.0001, now);
    const peakVolume = isBright ? 0.68 : isSoft ? 0.6 : 0.65;
    gain1.gain.linearRampToValueAtTime(peakVolume, now + 0.004);
    gain1.gain.exponentialRampToValueAtTime(0.2, now + holdDuration * 0.38);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + holdDuration);

    // Overtone Envelope (metallic sparkle)
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.0001, now);
    const overtoneLevel = isSoft ? 0.1 : isBright ? 0.35 : 0.22;
    gain2.gain.linearRampToValueAtTime(overtoneLevel, now + 0.003);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(0.28, holdDuration * 0.3));

    // Wooden Body Resonator Filter (simulates the wooden soundbox cavity)
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'peaking';
    bodyFilter.frequency.setValueAtTime(isSoft ? 420 : 460, now);
    bodyFilter.Q.setValueAtTime(isSoft ? 2.0 : 1.4, now);
    bodyFilter.gain.setValueAtTime(isSoft ? 4.5 : isBright ? 1.8 : 3.0, now);

    osc1.connect(gain1);
    gain1.connect(bodyFilter);

    osc2.connect(gain2);
    gain2.connect(bodyFilter);

    bodyFilter.connect(this.masterGain);
    if (this.reverbSendGain) {
      bodyFilter.connect(this.reverbSendGain);
    }

    try {
      noiseSource.start(now);
      osc1.start(now);
      osc2.start(now);

      const stopTime = now + holdDuration + 0.05;
      noiseSource.stop(now + 0.025);
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
   * Stop any ringing voices immediately
   */
  public stopAll() {
    this.activeVoices.forEach((v) => v.stop());
    this.activeVoices = [];
  }
}

export const audioEngine = new KalimbaAudioEngine();
