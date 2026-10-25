/**
 * Kalimba-MC STEP 03-B
 * 실물 칼림바 마이크 인식 및 실시간 판정 관련 타입 정의
 */

import { KalimbaKeyDef } from '../constants/kalimbaKeys';
import { MicListeningState } from './microphoneAnalysisTypes';

export type AcousticJudgeRating = 'PERFECT' | 'GREAT' | 'RETRY' | 'WAITING' | 'SILENCE';

export type AcousticInputMode = 'touch' | 'acoustic_mic';

export interface AcousticEvaluation {
  rating: AcousticJudgeRating;
  detectedFrequency: number | null;
  detectedPitch: string | null;
  detectedKey: KalimbaKeyDef | null;
  targetPitch: string | null;
  targetKeyIndex: number | null;
  targetFrequency: number | null;
  centsDeviation: number | null;
  confidence: number;
  rmsVolume: number;
  isMatch: boolean;
  feedbackMessage: string;
}

export interface AcousticJudgeOptions {
  perfectCentsTolerance?: number; // 기본값 ±35 cents
  greatCentsTolerance?: number;   // 기본값 ±70 cents
  cooldownMs?: number;            // 타격 후 중복 방지 시간 (기본 320ms)
  minConfidence?: number;         // 최소 신뢰도 (기본 0.65)
  silenceRms?: number;            // 무음 역치 (기본 0.015)
}

export interface AcousticTunerState {
  isListening: boolean;
  state: MicListeningState;
  frequency: number | null;
  pitch: string | null;
  closestKey: KalimbaKeyDef | null;
  centsDeviation: number | null;
  confidence: number;
  volume: number;
  errorMessage: string | null;
}
