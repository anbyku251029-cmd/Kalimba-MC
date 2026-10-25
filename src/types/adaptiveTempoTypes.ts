/**
 * Kalimba-MC STEP 03-C
 * 어린이 맞춤형 자동 템포 조절 및 적응형 워터폴 학습 시스템 타입 정의
 */

export type TempoMode =
  | 'original'  // 모드 A: 원곡 속도 (원곡 BPM 100% 고정)
  | 'relaxed'   // 모드 B: 느긋한 연습 (낮은 속도로 시작, 음표 놓치면 대기)
  | 'adaptive'  // 모드 C: 자동 맞춤 (아이의 연주 정답률/콤보에 맞춰 실시간 조절)
  | 'free';     // 모드 D: 자유 연주 (워터폴 정답 판정 없이 자유 건반 탐색)

export type WaitTimeoutMode =
  | 'comfortable' // 편안하게 기다리기 (5초)
  | 'normal'      // 보통 기다리기 (3초)
  | 'short'       // 짧게 기다리기 (1.5초)
  | 'infinite';   // 시간 제한 없이 기다리기 (기본값)

export interface AdaptiveTempoConfig {
  minSpeedPercent: number;           // 기본 최소 속도 (기본 40%)
  maxSpeedPercent: number;           // 기본 최대 속도 (기본 100%)
  windowSize: number;                // 최근 분석 음표 개수 (기본 8)
  speedStep: number;                 // 1회 조절 폭 (기본 4%)
  increaseAccuracyThreshold: number; // 속도 증가 기준 정답률 (기본 0.85 = 85%)
  decreaseAccuracyThreshold: number; // 속도 감소 기준 정답률 (기본 0.60 = 60%)
  minJudgmentsBetweenChanges: number;// 속도 변경 간 최소 음표 수 (기본 4)
  manualOverrideHoldCount: number;   // 수동 변경 후 자동 조절 유예 음표 수 (기본 6)
}

export interface NoteJudgedEvent {
  noteId: string;
  rating: 'PERFECT' | 'GREAT' | 'MISS' | 'NONE';
  isCorrect: boolean;
  responseTimeMs?: number;
  timestamp: number;
}

export interface AdaptiveTempoState {
  mode: TempoMode;
  waitTimeoutMode: WaitTimeoutMode;
  currentSpeedPercent: number;
  initialSpeedPercent: number;
  baseBpm: number;
  currentBpm: number;
  isWaitingForNote: boolean;
  waitingNoteId: string | null;
  waitingSince: number | null;
  totalWaitCount: number;
  manualOverrideCount: number;
  recentAccuracy: number;
  consecutiveSuccessCount: number;
  consecutiveFailCount: number;
  feedbackMessage: string;
}
