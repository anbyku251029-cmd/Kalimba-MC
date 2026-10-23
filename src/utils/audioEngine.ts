import { PITCH_TO_KEY } from '../constants/kalimbaKeys';

export type KalimbaTimbreMode = 'default' | 'bright' | 'soft' | 'clean' | 'warm' | 'expressive';

export interface AudioSettings {
  timbre: KalimbaTimbreMode;
  volume: number; // 0.0 ~ 1.0 (기본 0.8)
  reverbEnabled: boolean; // 공간감 잔향 (기본 true)
  expressiveDynamics: boolean; // 강박/약박 음악적 표현 활성화 (기본 true)
}

export interface NotePlayOptions {
  durationBeats?: number;
  tempoBpm?: number;
  speedMultiplier?: number;
  timbreOverride?: KalimbaTimbreMode;
  scheduledTime?: number;
  velocity?: number; // 0.0 ~ 1.0
  timeSignature?: '4/4' | '3/4' | '2/4' | '6/8';
  beatInMeasure?: number;
}

const SETTINGS_STORAGE_KEY = 'kalimba_audio_settings_v1';

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  timbre: 'clean',
  volume: 0.8,
  reverbEnabled: true,
  expressiveDynamics: true,
};

/**
 * 박자표와 마디 내 위치에 따라 강박, 약박, 중강의 자연스러운 음악적 강약(Dynamic Accent) 계수를 계산합니다.
 */
export function calculateDynamicAccent(
  beatInMeasure: number = 0,
  timeSignature: '4/4' | '3/4' | '2/4' | '6/8' = '4/4'
): number {
  const normBeat = Math.max(0, beatInMeasure);

  switch (timeSignature) {
    case '4/4': {
      const beatMod = normBeat % 4;
      if (beatMod < 0.25) return 1.0; // 1박 (강)
      if (beatMod >= 1.9 && beatMod <= 2.25) return 0.88; // 3박 (중강)
      if (beatMod >= 0.9 && beatMod <= 1.25) return 0.74; // 2박 (약)
      if (beatMod >= 2.9 && beatMod <= 3.25) return 0.72; // 4박 (약)
      return 0.68; // 8분/16분 쪼개짐
    }
    case '3/4': {
      const beatMod = normBeat % 3;
      if (beatMod < 0.25) return 1.0; // 1박 (강)
      if (beatMod >= 0.9 && beatMod <= 1.25) return 0.72; // 2박 (약)
      if (beatMod >= 1.9 && beatMod <= 2.25) return 0.70; // 3박 (약)
      return 0.66;
    }
    case '2/4': {
      const beatMod = normBeat % 2;
      if (beatMod < 0.25) return 1.0; // 1박 (강)
      return 0.74; // 2박 (약)
    }
    case '6/8': {
      const beatMod = normBeat % 6;
      if (beatMod < 0.5) return 1.0; // 1박 (강)
      if (beatMod >= 2.8 && beatMod <= 3.3) return 0.86; // 4박 (중강)
      return 0.70; // 2, 3, 5, 6박 (약)
    }
    default:
      return 0.85;
  }
}

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
      if (typeof window === 'undefined' || !window.localStorage) {
        return { ...DEFAULT_AUDIO_SETTINGS };
      }
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
      const parsed = JSON.parse(raw);
      const validTimbres = ['default', 'bright', 'soft', 'clean', 'warm', 'expressive'];
      return {
        timbre: validTimbres.includes(parsed.timbre) ? parsed.timbre : 'clean',
        volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 0.8,
        reverbEnabled: typeof parsed.reverbEnabled === 'boolean' ? parsed.reverbEnabled : true,
        expressiveDynamics: typeof parsed.expressiveDynamics === 'boolean' ? parsed.expressiveDynamics : true,
      };
    } catch {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }
  }

  private saveSettings(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
      }
    } catch (e) {
      console.warn('Failed to save audio settings', e);
    }
  }

  private initContext() {
    if (!this.ctx) {
      if (typeof window === 'undefined') return;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();

      // 1. Dynamics Compressor (다성부 및 피크 클리핑 방지 - 투명한 음질 유지)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(3.5, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

      // 2. Master Gain
      this.masterGain = this.ctx.createGain();
      const currentVol = this.isMuted ? 0 : this.settings.volume;
      this.masterGain.gain.setValueAtTime(currentVol, this.ctx.currentTime);

      // 3. Ambience Reverb Send Network (칼림바 쇠막대와 나무 울림통의 부드러운 공간 잔향)
      const delay1 = this.ctx.createDelay();
      delay1.delayTime.setValueAtTime(0.035, this.ctx.currentTime);

      const delay2 = this.ctx.createDelay();
      delay2.delayTime.setValueAtTime(0.058, this.ctx.currentTime);

      const reverbFilter = this.ctx.createBiquadFilter();
      reverbFilter.type = 'lowpass';
      reverbFilter.frequency.setValueAtTime(2800, this.ctx.currentTime);

      const reverbFeedback = this.ctx.createGain();
      reverbFeedback.gain.setValueAtTime(0.28, this.ctx.currentTime);

      this.reverbSendGain = this.ctx.createGain();
      this.reverbSendGain.gain.setValueAtTime(this.settings.reverbEnabled ? 0.32 : 0.0, this.ctx.currentTime);

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
    if (this.ctx && this.ctx.state === 'suspended') {
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
      const sendLevel = this.settings.reverbEnabled
        ? this.settings.timbre === 'expressive' ? 0.40 : 0.30
        : 0.0;
      this.reverbSendGain.gain.setValueAtTime(sendLevel, this.ctx.currentTime);
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
   * 실제 17음 C Major 칼림바의 어쿠스틱 물리 특성을 반영한 합성음을 정밀 발음합니다.
   * 
   * @param pitch 음높이 (예: 'C4', 'E5')
   * @param durationBeats 박자 길이 (기본 1.0)
   * @param tempoBpm 분당 박자수 (기본 80)
   * @param speedMultiplier 재생 속도 배율 (기본 1.0)
   * @param timbreOverride 특정 음색 모드 강제 지정
   * @param scheduledTime 미래 Web Audio API 타임라인 예약 시각
   * @param velocity 음량 세기 (0.0 ~ 1.0, 기본 1.0)
   * @param timeSignature 박자표 ('4/4' | '3/4' | '2/4' | '6/8')
   * @param beatInMeasure 마디 내 박자 위치 (강약 계산용)
   */
  public playNote(
    pitch: string,
    durationBeats: number = 1,
    tempoBpm: number = 80,
    speedMultiplier: number = 1.0,
    timbreOverride?: KalimbaTimbreMode,
    scheduledTime?: number,
    velocity: number = 1.0,
    timeSignature: '4/4' | '3/4' | '2/4' | '6/8' = '4/4',
    beatInMeasure?: number
  ) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const keyDef = PITCH_TO_KEY.get(pitch);
    if (!keyDef) return;

    // 예약 시각 결정
    const startTime = scheduledTime !== undefined ? Math.max(this.ctx.currentTime, scheduledTime) : this.ctx.currentTime;
    const baseFreq = keyDef.frequency;
    const timbre = timbreOverride || this.settings.timbre;

    // 프리셋별 음향 특성 분기
    // clean: 맑은 소리 (학습용, 명확한 음표 분리, 투명한 어택)
    // warm: 따뜻한 소리 (풍성한 바디 공명, 부드러운 감쇠)
    // expressive: 풍성한 연주 (다이내믹스 확장, 배음 및 잔향 여운 강조)
    const isClean = timbre === 'clean' || timbre === 'bright';
    const isWarm = timbre === 'warm' || timbre === 'soft';
    const isExpressive = timbre === 'expressive';

    // 17키 칼림바 물리적 감쇠 특성:
    // 낮은 음(C4~G4)은 쇠막대가 길어 서스테인이 길고 깊게 울림 (최대 2.5초)
    // 높은 음(C6~E6)은 쇠막대가 짧아 감쇠가 빠르고 맑고 또랑또랑함 (최소 0.6초)
    const keyRatio = keyDef.index / 16; // 0 (D6) ~ 16 (E6)
    const isHighPitch = keyDef.octaveLevel >= 1;

    let baseSustain = 2.2;
    if (isWarm) {
      baseSustain = Math.max(0.7, 2.5 - (isHighPitch ? 1.3 : 0.6));
    } else if (isClean) {
      baseSustain = Math.max(0.55, 1.9 - (isHighPitch ? 1.1 : 0.5));
    } else if (isExpressive) {
      baseSustain = Math.max(0.65, 2.6 - (isHighPitch ? 1.2 : 0.5));
    } else {
      baseSustain = Math.max(0.65, 2.2 - (isHighPitch ? 1.2 : 0.5));
    }

    const beatSeconds = (60 / Math.max(1, tempoBpm)) * (1 / Math.max(0.1, speedMultiplier));
    const holdDuration = Math.min(baseSustain, Math.max(0.32, durationBeats * beatSeconds * 1.3));

    // 음악적 강약(Dynamic Accent) 계산
    let dynamicFactor = Math.max(0.3, Math.min(1.2, velocity));
    if (this.settings.expressiveDynamics && beatInMeasure !== undefined) {
      const accent = calculateDynamicAccent(beatInMeasure, timeSignature);
      dynamicFactor *= accent;
    }

    // 1. 기음 오실레이터 (Fundamental Sine Wave)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';

    // 피치 디플렉션: 탄현 직후 순간 장력 변화로 인한 마이크로 벤딩
    const bendFactor = isHighPitch
      ? isClean ? 1.006 : isWarm ? 1.002 : 1.004
      : isClean ? 1.015 : isWarm ? 1.006 : 1.012;

    osc1.frequency.setValueAtTime(baseFreq * bendFactor, startTime);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, startTime + (isHighPitch ? 0.007 : 0.014));

    // 2. 비조화 쇠막대 고차 배음 (Inharmonic Metallic Overtone ~5.4x)
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
    const noiseDuration = isWarm ? 0.012 : isClean ? 0.022 : 0.018;
    const bufferSize = Math.max(64, Math.floor(this.ctx.sampleRate * noiseDuration));
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // 찰나의 마찰음 감쇠 시뮬레이션
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    const filterCenter = Math.min(3800, baseFreq * (isClean ? 3.6 : 2.5));
    noiseFilter.frequency.setValueAtTime(filterCenter, startTime);
    noiseFilter.Q.setValueAtTime(isClean ? 3.2 : 2.0, startTime);

    const noiseGain = this.ctx.createGain();
    const baseNoiseLevel = isWarm ? 0.04 : isClean ? 0.10 : 0.07;
    const noiseLevel = baseNoiseLevel * dynamicFactor;
    noiseGain.gain.setValueAtTime(0.0001, startTime);
    noiseGain.gain.linearRampToValueAtTime(noiseLevel, startTime + 0.002);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + noiseDuration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // 4. 기음 엔벌로프 (Fundamental ADSR)
    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(0.0001, startTime);

    // 클릭 방지 초고속 선형 어택 (0.0035초)
    const basePeak = isClean ? 0.65 : isWarm ? 0.58 : 0.68;
    const peakVolume = Math.max(0.15, Math.min(0.85, basePeak * dynamicFactor));

    gain1.gain.linearRampToValueAtTime(peakVolume, startTime + 0.0035);
    // 자연스러운 초기 감쇠 후 긴 서스테인 테일
    gain1.gain.exponentialRampToValueAtTime(peakVolume * 0.35, startTime + holdDuration * 0.35);
    gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + holdDuration);

    // 5. 금속 배음 엔벌로프
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.0001, startTime);

    const baseOvertone = isWarm ? 0.08 : isClean ? 0.30 : 0.22;
    const overtoneLevel = baseOvertone * dynamicFactor * (1.0 - keyRatio * 0.45);

    gain2.gain.linearRampToValueAtTime(overtoneLevel, startTime + 0.0025);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(0.28, holdDuration * 0.30));

    // 6. 우든 바디 레조네이터 (Wooden Soundbox Cavity Resonance)
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'peaking';
    // 중앙 C4(가운데 도) 부근 공명 피크 (420~460Hz)
    bodyFilter.frequency.setValueAtTime(isWarm ? 420 : 450, startTime);
    bodyFilter.Q.setValueAtTime(isWarm ? 2.4 : 1.8, startTime);
    bodyFilter.gain.setValueAtTime(isWarm ? 4.2 : isClean ? 1.8 : 3.2, startTime);

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
            gain1.gain.exponentialRampToValueAtTime(0.0001, stopNow + 0.015);

            gain2.gain.cancelScheduledValues(stopNow);
            gain2.gain.setValueAtTime(Math.max(0.0001, gain2.gain.value), stopNow);
            gain2.gain.exponentialRampToValueAtTime(0.0001, stopNow + 0.015);

            setTimeout(() => {
              try {
                osc1.stop();
                osc2.stop();
                noiseSource.stop();
              } catch {
                // 이미 정지된 오실레이터 무시
              }
            }, 20);
          } catch {
            // 무시
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
