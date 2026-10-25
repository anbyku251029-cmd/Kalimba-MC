/**
 * Kalimba-MC STEP 03-C
 * 어린이 맞춤형 자동 템포 조절 및 적응형 워터폴 컨트롤러
 * 
 * - 아이의 실제 연주 정답률과 콤보, 반응 시간을 기반으로 워터폴 속도를 실시간 조절
 * - 음표가 판정선에 도달했을 때 아이가 칠 때까지 기다려주는 기능(Wait for Note) 지원
 * - 수동 조절 우선권 및 급격한 속도 변화 방지 (부드러운 점진적 조정)
 * - 100% 브라우저 온디바이스 메모리 규칙 기반 알고리즘
 */

import {
  TempoMode,
  WaitTimeoutMode,
  AdaptiveTempoConfig,
  NoteJudgedEvent,
  AdaptiveTempoState,
} from '../types/adaptiveTempoTypes';

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveTempoConfig = {
  minSpeedPercent: 40,
  maxSpeedPercent: 100,
  windowSize: 8,
  speedStep: 4,
  increaseAccuracyThreshold: 0.85,
  decreaseAccuracyThreshold: 0.60,
  minJudgmentsBetweenChanges: 4,
  manualOverrideHoldCount: 6,
};

/**
 * 곡 난이도별 권장 초기 시작 속도(%) 계산
 */
export function getInitialSpeedForSong(level: string, tempoMode: TempoMode = 'relaxed'): number {
  if (tempoMode === 'original' || tempoMode === 'free') {
    return 100;
  }
  switch (level) {
    case 'beginner':
    case '쉬움':
      return 65; // 초급: 원곡의 65%
    case 'intermediate':
    case '보통':
      return 75; // 중급: 원곡의 75%
    case 'advanced':
    case '어려움':
      return 80; // 고급: 원곡의 80%
    case 'hymn':
    case '찬송가':
      return 75; // 찬송가: 원곡의 75%
    default:
      return 70;
  }
}

/**
 * 대기 모드별 타임아웃 밀리초 계산
 */
export function getWaitTimeoutMs(waitMode: WaitTimeoutMode): number {
  switch (waitMode) {
    case 'comfortable':
      return 5000;
    case 'normal':
      return 3000;
    case 'short':
      return 1500;
    case 'infinite':
    default:
      return Infinity;
  }
}

export class AdaptiveTempoController {
  private config: AdaptiveTempoConfig;
  private baseBpm: number;
  private mode: TempoMode;
  private waitTimeoutMode: WaitTimeoutMode;
  private currentSpeedPercent: number;
  private initialSpeedPercent: number;

  private recentEvents: NoteJudgedEvent[] = [];
  private consecutiveSuccessCount: number = 0;
  private consecutiveFailCount: number = 0;
  private judgmentsSinceLastChange: number = 0;
  private manualOverrideHoldRemaining: number = 0;

  // 음표 대기(Wait for Note) 상태
  private isWaitingForNote: boolean = false;
  private waitingNoteId: string | null = null;
  private waitingSince: number | null = null;
  private totalWaitCount: number = 0;

  private feedbackMessage: string = '준비되면 칼림바를 연주해 보세요! 🎵';

  public onSpeedChanged?: (newSpeedPercent: number, reason: string) => void;
  public onWaitStateChanged?: (isWaiting: boolean, noteId: string | null) => void;

  constructor(
    baseBpm: number,
    songLevel: string = 'beginner',
    mode: TempoMode = 'relaxed',
    waitMode: WaitTimeoutMode = 'infinite',
    config: Partial<AdaptiveTempoConfig> = {}
  ) {
    this.config = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
    this.baseBpm = baseBpm > 0 ? baseBpm : 80;
    this.mode = mode;
    this.waitTimeoutMode = waitMode;
    this.initialSpeedPercent = getInitialSpeedForSong(songLevel, mode);
    this.currentSpeedPercent = this.initialSpeedPercent;
  }

  public setMode(newMode: TempoMode): void {
    if (this.mode === newMode) return;
    this.mode = newMode;
    if (newMode === 'original' || newMode === 'free') {
      this.currentSpeedPercent = 100;
    }
    this.resolveNoteWait();
    this.feedbackMessage = this.getModeInitialMessage(newMode);
  }

  public getMode(): TempoMode {
    return this.mode;
  }

  public setWaitTimeoutMode(newWaitMode: WaitTimeoutMode): void {
    this.waitTimeoutMode = newWaitMode;
  }

  public getWaitTimeoutMode(): WaitTimeoutMode {
    return this.waitTimeoutMode;
  }

  public getSpeedPercent(): number {
    return this.currentSpeedPercent;
  }

  public getCurrentBpm(): number {
    return Math.round((this.baseBpm * (this.currentSpeedPercent / 100)) * 10) / 10;
  }

  public getBaseBpm(): number {
    return this.baseBpm;
  }

  /**
   * 사용자가 슬라이더나 프리셋 버튼으로 수동 조작 시 호출
   * (수동 우선권을 부여하여 최소 6개 판정 동안 자동 조절 억제)
   */
  public manualSetSpeed(speedPercent: number): void {
    const clamped = Math.max(this.config.minSpeedPercent, Math.min(150, speedPercent));
    this.currentSpeedPercent = clamped;
    this.manualOverrideHoldRemaining = this.config.manualOverrideHoldCount;
    this.judgmentsSinceLastChange = 0;
    this.feedbackMessage = `속도를 ${clamped}%로 설정했어요. 편하게 연주하세요!`;
    this.onSpeedChanged?.(clamped, 'manual');
  }

  /**
   * 원곡 속도(100%)로 복귀
   */
  public resetToOriginalSpeed(): void {
    this.manualSetSpeed(100);
  }

  /**
   * 음표 도착 시 대기 시작
   */
  public startWaitingForNote(noteId: string): void {
    // 원곡 속도 모드나 자유 연주 모드에서는 대기하지 않음
    if (this.mode === 'original' || this.mode === 'free') {
      return;
    }

    if (this.isWaitingForNote && this.waitingNoteId === noteId) {
      return;
    }

    this.isWaitingForNote = true;
    this.waitingNoteId = noteId;
    this.waitingSince = performance.now();
    this.totalWaitCount++;
    this.feedbackMessage = '현재 음표를 기다리고 있어요. 천천히 연주해 보세요! 👂';
    this.onWaitStateChanged?.(true, noteId);
  }

  /**
   * 음표 연주 성공 또는 건너뛰기 시 대기 해제
   */
  public resolveNoteWait(noteId?: string): void {
    if (!this.isWaitingForNote) return;
    if (noteId && this.waitingNoteId && noteId !== this.waitingNoteId) {
      return;
    }
    this.isWaitingForNote = false;
    this.waitingNoteId = null;
    this.waitingSince = null;
    this.onWaitStateChanged?.(false, null);
  }

  public getIsWaiting(): boolean {
    return this.isWaitingForNote;
  }

  public getWaitingNoteId(): string | null {
    return this.waitingNoteId;
  }

  /**
   * 대기 시간 초과 검사
   */
  public checkWaitTimeout(now: number = performance.now()): { isTimedOut: boolean; message: string } {
    if (!this.isWaitingForNote || this.waitingSince === null) {
      return { isTimedOut: false, message: '' };
    }

    const timeoutLimit = getWaitTimeoutMs(this.waitTimeoutMode);
    if (!isFinite(timeoutLimit)) {
      return { isTimedOut: false, message: '시간 제한 없이 기다리는 중이에요.' };
    }

    const elapsed = now - this.waitingSince;
    if (elapsed >= timeoutLimit) {
      return {
        isTimedOut: true,
        message: '준비되면 칼림바를 다시 연주해 보세요! 힘내요! 💕',
      };
    }

    return { isTimedOut: false, message: '기다리는 중이에요.' };
  }

  /**
   * 사용자가 음표를 연주하거나 판정이 발생했을 때 등록
   */
  public registerJudgment(event: NoteJudgedEvent): void {
    if (this.mode === 'free') return;

    // 대기 중인 음표가 맞았으면 대기 해제
    if (event.isCorrect && this.isWaitingForNote && (!this.waitingNoteId || event.noteId === this.waitingNoteId)) {
      this.resolveNoteWait();
    }

    this.recentEvents.push(event);
    if (this.recentEvents.length > this.config.windowSize) {
      this.recentEvents.shift();
    }

    if (event.isCorrect) {
      this.consecutiveSuccessCount++;
      this.consecutiveFailCount = 0;
    } else if (event.rating === 'MISS') {
      this.consecutiveFailCount++;
      this.consecutiveSuccessCount = 0;
    }

    this.judgmentsSinceLastChange++;

    // 수동 조작 유예 기간 확인
    if (this.manualOverrideHoldRemaining > 0) {
      this.manualOverrideHoldRemaining--;
      return;
    }

    // 모드 C (자동 맞춤) 또는 모드 B (느긋한 연습)에서 적응형 속도 조절 수행
    if (this.mode === 'adaptive' || this.mode === 'relaxed') {
      this.evaluateAdaptiveTempo();
    }
  }

  /**
   * 최근 연주 성과를 바탕으로 점진적 속도 조절
   */
  private evaluateAdaptiveTempo(): void {
    if (this.recentEvents.length < 4) return;
    if (this.judgmentsSinceLastChange < this.config.minJudgmentsBetweenChanges) return;

    const correctCount = this.recentEvents.filter((e) => e.isCorrect).length;
    const accuracy = correctCount / this.recentEvents.length;

    // 1. 속도 증가 조건: 정답률 >= 85% && 연속 성공 3회 이상 && 현재 대기 중 아님
    if (
      accuracy >= this.config.increaseAccuracyThreshold &&
      this.consecutiveSuccessCount >= 3 &&
      !this.isWaitingForNote
    ) {
      if (this.currentSpeedPercent < this.config.maxSpeedPercent) {
        const nextSpeed = Math.min(
          this.config.maxSpeedPercent,
          this.currentSpeedPercent + this.config.speedStep
        );
        this.currentSpeedPercent = nextSpeed;
        this.judgmentsSinceLastChange = 0;
        this.feedbackMessage = `잘하고 있어요! 속도를 ${nextSpeed}%로 올려볼게요! 🚀`;
        this.onSpeedChanged?.(nextSpeed, 'adaptive_increase');
        return;
      }
    }

    // 2. 속도 감소 조건: 정답률 < 60% 또는 연속 실패 2회 이상
    if (
      accuracy <= this.config.decreaseAccuracyThreshold ||
      this.consecutiveFailCount >= 2
    ) {
      if (this.currentSpeedPercent > this.config.minSpeedPercent) {
        const nextSpeed = Math.max(
          this.config.minSpeedPercent,
          this.currentSpeedPercent - this.config.speedStep
        );
        this.currentSpeedPercent = nextSpeed;
        this.judgmentsSinceLastChange = 0;
        this.feedbackMessage = `천천히 해도 괜찮아요. 속도를 ${nextSpeed}%로 낮출게요. 🐢`;
        this.onSpeedChanged?.(nextSpeed, 'adaptive_decrease');
        return;
      }
    }
  }

  public getRecentAccuracy(): number {
    if (this.recentEvents.length === 0) return 1.0;
    const correctCount = this.recentEvents.filter((e) => e.isCorrect).length;
    return Math.round((correctCount / this.recentEvents.length) * 100) / 100;
  }

  public getState(): AdaptiveTempoState {
    return {
      mode: this.mode,
      waitTimeoutMode: this.waitTimeoutMode,
      currentSpeedPercent: this.currentSpeedPercent,
      initialSpeedPercent: this.initialSpeedPercent,
      baseBpm: this.baseBpm,
      currentBpm: this.getCurrentBpm(),
      isWaitingForNote: this.isWaitingForNote,
      waitingNoteId: this.waitingNoteId,
      waitingSince: this.waitingSince,
      totalWaitCount: this.totalWaitCount,
      manualOverrideCount: this.manualOverrideHoldRemaining,
      recentAccuracy: this.getRecentAccuracy(),
      consecutiveSuccessCount: this.consecutiveSuccessCount,
      consecutiveFailCount: this.consecutiveFailCount,
      feedbackMessage: this.feedbackMessage,
    };
  }

  public reset(): void {
    this.currentSpeedPercent = this.initialSpeedPercent;
    this.recentEvents = [];
    this.consecutiveSuccessCount = 0;
    this.consecutiveFailCount = 0;
    this.judgmentsSinceLastChange = 0;
    this.manualOverrideHoldRemaining = 0;
    this.isWaitingForNote = false;
    this.waitingNoteId = null;
    this.waitingSince = null;
    this.feedbackMessage = this.getModeInitialMessage(this.mode);
  }

  private getModeInitialMessage(mode: TempoMode): string {
    switch (mode) {
      case 'original':
        return '원곡 원래 속도로 멋지게 연주해 보세요! 🎶';
      case 'relaxed':
        return '느긋하게 연습해요. 음표가 기다려 줄게요! 🐢';
      case 'adaptive':
        return '아이의 연주에 맞춰 속도가 자동으로 조절돼요! ✨';
      case 'free':
        return '자유 연주 모드예요. 마음껏 건반을 튕겨보세요! 🎹';
    }
  }
}
