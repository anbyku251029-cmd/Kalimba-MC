/**
 * comboTypes.ts
 * Kalimba-MC STEP 02-A: 리듬 콤보, 판정 및 캐릭터 상태 타입 정의
 */

export type HitRating = 'PERFECT' | 'GREAT' | 'MISS' | 'NONE';

export type CharacterState = 'idle' | 'happy' | 'combo' | 'encourage' | 'celebrate';

export interface ComboStats {
  currentCombo: number;
  maxCombo: number;
  perfectCount: number;
  greatCount: number;
  missCount: number;
  totalNotes: number;
  accuracy: number; // 0 ~ 100%
  lastRating: HitRating;
}

export interface JudgeConfig {
  perfectWindowMs: number; // 기본 ±120ms
  greatWindowMs: number;   // 기본 ±220ms
  missThresholdMs: number; // 타격선 통과 후 놓침 판정 (기본 +250ms)
}

export const DEFAULT_JUDGE_CONFIG: JudgeConfig = {
  perfectWindowMs: 120,
  greatWindowMs: 220,
  missThresholdMs: 250,
};
