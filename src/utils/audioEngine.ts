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

  public getCurrentTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /**
   * 실제 17음 C Major 칼림바의 어쿠스틱 물리 특성을 반영한 합성음을 정밀 스케줄링 발음합니다.
   * scheduledTime이 주어지면 Web Audio API 하드웨어 타임라인에 미래 발음 예약합니다.
   */
  public playNote(
    pitch: string,
    durationBeats: number = 1,
    tempoBpm: number = 80,
    speedMultiplier: number = 1.0,
    timbreOverride?: KalimbaTimbreMode,
    scheduledTime?: number
  ) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const keyDef = PITCH_TO_KEY.get(pitch);
    if (!keyDef) return;

    // 예약 시각 결정 (과거 시각이면 현재 시각으로 클램핑)
    const startTime = scheduledTime !== undefined ? Math.max(this.ctx.currentTime, scheduledTime) : this.ctx.currentTime;
    const baseFreq = keyDef.frequency;
    const timbre = timbreOverride || this.settings.timbre;

    // 음색 파라미터 (default / bright / soft)
    const isBright = timbre === 'bright';
    const isSoft = timbre === 'soft';

    // 17키 칼림바 물리적 감쇠 특성:
    // 낮은 음(C4~G4)은 쇠막대가 길어 서스테인이 길고 깊게 울림 (최대 2.4초)
    // 높은 음(C6~E6)은 쇠막대가 짧아 감쇠가 빠르고 맑고 또랑또랑함 (최소 0.65초)
    const keyRatio = keyDef.index / 16; // 0 (D6) ~ 16 (E6)
    const isHighPitch = keyDef.octaveLevel >= 1;

    const baseSustain = isSoft
      ? Math.max(0.7, 2.4 - (isHighPitch ? 1.3 : 0.6))
      : isBright
      ? Math.max(0.55, 2.0 - (isHighPitch ? 1.1 : 0.5))
      : Math.max(0.65, 2.2 - (isHighPitch ? 1.2 : 0.5));

    const beatSeconds = (60 / Math.max(1, tempoBpm)) * (1 / Math.max(0.1, speedMultiplier));
    const holdDuration = Math.min(baseSustain, Math.max(0.3, durationBeats * beatSeconds * 1.35));

    // 1. 기음 오실레이터 (Fundamental Sine)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';

    // 피치 디플렉션: 탄현 직후 순간 텐션 벤딩 (고음은 과도한 피치 벤드 방지)
    const bendFactor = isHighPitch
      ? isBright ? 1.008 : isSoft ? 1.003 : 1.005
      : isBright ? 1.018 : isSoft ? 1.008 : 1.014;

    osc1.frequency.setValueAtTime(baseFreq * bendFactor, startTime);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, startTime + (isHighPitch ? 0.008 : 0.015));

    // 2. 비조화 고차 배음 오실레이터 (Metallic Inharmonic Overtone ~5.4x)
    // 쇠막대의 물리 고유 진동 배음 (clamped-free bar overtone)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    const overtoneFreq = baseFreq * 5.4;
    const nyquistLimit = this.ctx.sampleRate / 2 - 200;

    if (overtoneFreq < nyquistLimit) {
      osc2.frequency.setValueAtTime(overtoneFreq, startTime);
    } else {
      osc2.frequency.setValueAtTime(baseFreq * 2.0, startTime);
    }

    // 3. 손톱 탄현 어택 트랜지언트 (Pluck Transient Noise)
    const noiseDuration = isSoft ? 0.01 : isBright ? 0.022 : 0.016;
    const bufferSize = Math.max(64, Math.floor(this.ctx.sampleRate * noiseDuration));
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // 감쇠형 백색 잡음으로 손톱/골무가 쇠막대를 튕기는 찰나의 마찰음 시뮬레이션
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    const filterCenter = Math.min(3600, baseFreq * (isBright ? 3.5 : 2.6));
    noiseFilter.frequency.setValueAtTime(filterCenter, startTime);
    noiseFilter.Q.setValueAtTime(isBright ? 3.5 : 2.2, startTime);

    const noiseGain = this.ctx.createGain();
    const noiseLevel = isSoft ? 0.035 : isBright ? 0.11 : 0.07;
    noiseGain.gain.setValueAtTime(0.0001, startTime);
    noiseGain.gain.linearRampToValueAtTime(noiseLevel, startTime + 0.002);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + noiseDuration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // 4. 기음 엔벌로프 (Fundamental Gain ADSR)
    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(0.0001, startTime);

    // 클릭 방지 초고속 선형 어택 (0.0035초)
    const peakVolume = isBright ? 0.68 : isSoft ? 0.58 : 0.64;
    gain1.gain.linearRampToValueAtTime(peakVolume, startTime + 0.0035);
    // 자연스러운 초기 감쇠 후 긴 서스테인 테일
    gain1.gain.exponentialRampToValueAtTime(peakVolume * 0.35, startTime + holdDuration * 0.35);
    gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + holdDuration);

    // 5. 금속 배음 엔벌로프 (고음역 배음 과다 방지)
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.0001, startTime);

    const baseOvertone = isSoft ? 0.08 : isBright ? 0.32 : 0.2;
    // 고음역(E5~E6)에서는 배음이 너무 튀지 않도록 스케일링
    const overtoneLevel = baseOvertone * (1.0 - keyRatio * 0.45);

    gain2.gain.linearRampToValueAtTime(overtoneLevel, startTime + 0.0025);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(0.25, holdDuration * 0.28));

    // 6. 우든 바디 레조네이터 (Wooden Soundbox Cavity Resonance)
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'peaking';
    // 중앙 C4(가운데 도) 부근 공명 피크 (430~460Hz)
    bodyFilter.frequency.setValueAtTime(isSoft ? 420 : 450, startTime);
    bodyFilter.Q.setValueAtTime(isSoft ? 2.2 : 1.6, startTime);
    bodyFilter.gain.setValueAtTime(isSoft ? 4.0 : isBright ? 1.6 : 2.8, startTime);

    osc1.connect(gain1);
    gain1.connect(bodyFilter);

    osc2.connect(gain2);
    gain2.connect(bodyFilter);

    bodyFilter.connect(this.masterGain);
    if (this.reverbSendGain) {
      bodyFilter.connect(this.reverbSendGain);
    }

    try {
      noiseSource.start(startTime);
      osc1.start(startTime);
      osc2.start(startTime);

      const stopTime = startTime + holdDuration + 0.05;
      noiseSource.stop(startTime + noiseDuration + 0.01);
      osc1.stop(stopTime);
      osc2.stop(stopTime);

      const voice = {
        stop: () => {
          try {
            const stopNow = this.ctx?.currentTime || 0;
            gain1.gain.cancelScheduledValues(stopNow);
            gain1.gain.setValueAtTime(Math.max(0.0001, gain1.gain.value), stopNow);
            gain1.gain.exponentialRampToValueAtTime(0.0001, stopNow + 0.018);

            gain2.gain.cancelScheduledValues(stopNow);
            gain2.gain.setValueAtTime(Math.max(0.0001, gain2.gain.value), stopNow);
            gain2.gain.exponentialRampToValueAtTime(0.0001, stopNow + 0.018);

            setTimeout(() => {
              try {
                osc1.stop();
                osc2.stop();
                noiseSource.stop();
              } catch {
                // 이미 정지된 오실레이터 예외 무시
              }
            }, 25);
          } catch {
            // 정리 중 오류 무시
          }
        },
      };

      this.activeVoices.push(voice);
      const lifetimeMs = Math.max(100, (startTime - this.ctx.currentTime + holdDuration + 0.1) * 1000);
      setTimeout(() => {
        const idx = this.activeVoices.indexOf(voice);
        if (idx !== -1) this.activeVoices.splice(idx, 1);
      }, lifetimeMs);
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
