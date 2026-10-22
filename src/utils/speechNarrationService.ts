/**
 * Kalimba-MC STEP 01-G
 * 유아용 한국어 음성 나레이션 독립 서비스 (Web Speech API)
 * 
 * 1. Web Speech API의 `speechSynthesis`와 `SpeechSynthesisUtterance` 사용
 * 2. 한국어 음성(ko-KR) 자동 탐색 및 우선 선택
 * 3. 동일 문구 중복 발화 및 큐 누적 방지 (새 발화 시 이전 발화 즉시 취소)
 * 4. 음악 오디오 타이밍과 완전 분리 (비동기 독립 실행으로 음악 시작 지연 원천 차단)
 * 5. 설정(`kalimba_narration_settings_v1`) 로컬스토리지 보존
 */

import { SpeechNarrationSettings, SpeechNarrationStatus, NarrationState } from '../types/speechNarrationTypes';

const NARRATION_STORAGE_KEY = 'kalimba_narration_settings_v1';

const DEFAULT_SETTINGS: SpeechNarrationSettings = {
  enabled: true,
  rate: 0.85,  // 유아 친화적 천천히 말하기
  pitch: 1.05, // 다정하고 밝은 톤
  volume: 0.9,
};

class SpeechNarrationService {
  private settings: SpeechNarrationSettings = this.loadSettings();
  private synth: SpeechSynthesis | null = null;
  private koreanVoice: SpeechSynthesisVoice | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private state: NarrationState = 'idle';
  private currentText: string | null = null;
  private lastSpokenText: string | null = null;
  private lastSpokenTime: number = 0;
  private listeners: ((status: SpeechNarrationStatus) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    } else {
      this.state = 'unsupported';
    }
  }

  private loadSettings(): SpeechNarrationSettings {
    try {
      const raw = localStorage.getItem(NARRATION_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
        rate: typeof parsed.rate === 'number' ? Math.max(0.5, Math.min(1.5, parsed.rate)) : 0.85,
        pitch: typeof parsed.pitch === 'number' ? Math.max(0.5, Math.min(1.5, parsed.pitch)) : 1.05,
        volume: typeof parsed.volume === 'number' ? Math.max(0.0, Math.min(1.0, parsed.volume)) : 0.9,
        selectedVoiceURI: typeof parsed.selectedVoiceURI === 'string' ? parsed.selectedVoiceURI : undefined,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(NARRATION_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[speechNarration] 설정 저장 실패', e);
    }
  }

  private initVoices(): void {
    if (!this.synth) return;
    try {
      const voices = this.synth.getVoices();
      // 한국어 음성 탐색 (ko-KR, ko_KR, 또는 이름에 korean/한국어 포함)
      const ko = voices.find((v) => v.lang === 'ko-KR' || v.lang === 'ko_KR' || v.lang.startsWith('ko'));
      this.koreanVoice = ko || null;
      this.notifyListeners();
    } catch (e) {
      console.warn('[speechNarration] 음성 목록 로드 실패', e);
    }
  }

  public isSupported(): boolean {
    return Boolean(typeof window !== 'undefined' && 'speechSynthesis' in window && this.synth);
  }

  public getSettings(): SpeechNarrationSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<SpeechNarrationSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();

    // 사용자가 음성을 껐으면 진행 중이던 발화 즉시 중단
    if (partial.enabled === false) {
      this.stop();
    }
    this.notifyListeners();
  }

  public getStatus(): SpeechNarrationStatus {
    const supported = this.isSupported();
    return {
      isSupported: supported,
      state: !supported ? 'unsupported' : !this.settings.enabled ? 'disabled' : this.state,
      currentText: this.currentText,
      hasKoreanVoice: Boolean(this.koreanVoice),
      availableVoicesCount: this.synth ? this.synth.getVoices().length : 0,
    };
  }

  public subscribe(listener: (status: SpeechNarrationStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach((l) => l(status));
  }

  /**
   * 안내 텍스트 발화 (비동기, 이전 발화 취소, 중복 방지)
   */
  public speak(text: string, force: boolean = false): void {
    if (!this.isSupported() || !this.synth) {
      this.currentText = text;
      this.notifyListeners();
      return;
    }

    if (!this.settings.enabled && !force) {
      this.currentText = text;
      this.notifyListeners();
      return;
    }

    // 동일 문구 2초 내 연속 중복 발화 방지 (강제 실행 force가 아닌 경우)
    const now = Date.now();
    if (!force && this.lastSpokenText === text && now - this.lastSpokenTime < 2000) {
      return;
    }

    // 이전 발화 큐 즉시 취소하여 말 겹침 방지
    try {
      this.synth.cancel();
    } catch {
      // 무시
    }

    this.lastSpokenText = text;
    this.lastSpokenTime = now;
    this.currentText = text;
    this.state = 'speaking';
    this.notifyListeners();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = this.settings.rate;
      utterance.pitch = this.settings.pitch;
      utterance.volume = this.settings.volume;

      if (this.koreanVoice) {
        utterance.voice = this.koreanVoice;
      }

      utterance.onend = () => {
        this.state = 'idle';
        this.currentUtterance = null;
        this.notifyListeners();
      };

      utterance.onerror = (e) => {
        // canceled 에러는 사용자가 의도적으로 중단한 것이므로 무시
        if (e.error !== 'canceled') {
          console.warn('[speechNarration] 발화 에러', e.error);
        }
        this.state = 'idle';
        this.currentUtterance = null;
        this.notifyListeners();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('[speechNarration] speak 실행 오류', e);
      this.state = 'idle';
      this.notifyListeners();
    }
  }

  /**
   * 현재 발화 중단 및 큐 정리
   */
  public stop(): void {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // 무시
      }
    }
    this.state = 'idle';
    this.currentUtterance = null;
    this.notifyListeners();
  }

  /**
   * 마지막 문구 다시 듣기
   */
  public replayLast(): void {
    if (this.currentText) {
      this.speak(this.currentText, true);
    }
  }
}

// 싱글톤 인스턴스
export const speechNarrator = new SpeechNarrationService();
