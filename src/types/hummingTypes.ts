/**
 * Kalimba-MC STEP 02-G
 * 허밍 채보 및 AI 악보 변환 전용 타입 정의
 */

import { Song, KalimbaNote } from './music';

export type HummingTranscriptionStatus =
  | 'IDLE'
  | 'RECORDING'
  | 'READY_FOR_ANALYSIS'
  | 'ANALYZING'
  | 'DRAFT_READY'
  | 'NEEDS_REVIEW'
  | 'NO_VOICE_DETECTED'
  | 'ERROR';

export interface HummingFrameResult {
  timeSec: number;
  rms: number;
  f0Hz: number | null;
  midiNumber: number | null;
  confidence: number;
  isVoiced: boolean;
}

export interface RawNoteSegment {
  index: number;
  startTimeSec: number;
  endTimeSec: number;
  durationMs: number;
  avgFrequencyHz: number;
  representativeMidi: number;
  avgConfidence: number;
  avgRms: number;
  centsDeviation: number;
}

export interface QuantizedNoteSegment extends RawNoteSegment {
  beatDuration: number; // 0.5 (8분), 1.0 (4분), 1.5 (점4분), 2.0 (2분) 등
  noteTypeName: string; // '8분음표', '4분음표', '2분음표' 등
  targetMidi: number;
  isOutOfRange: boolean;
  wasAccidental: boolean;
}

export interface HummingTranscriptionResult {
  status: 'SUCCESS' | 'NO_VOICE_DETECTED' | 'NEEDS_REVIEW' | 'TOO_SHORT' | 'ERROR';
  song: Song | null;
  notes: KalimbaNote[];
  rawSegments: RawNoteSegment[];
  quantizedNotes: QuantizedNoteSegment[];
  detectedBpm: number;
  appliedOctaveShift: number; // e.g. +1 (1옥타브 상향)
  warnings: string[];
  confidenceScore: number; // 0 ~ 100
  executionTimeMs: number;
  audioDurationSec: number;
  errorMessage?: string;
}

export interface HummingTranscriptionOptions {
  bpm?: number;
  minNoteDurationMs?: number; // 최소 음표 길이 필터링 (기본 80ms)
  silenceThresholdRms?: number; // 무음 판정 RMS 역치 (기본 0.012)
  confidenceThreshold?: number; // 최소 신뢰도 (기본 0.6)
  targetOctaveShift?: number; // 강제 옥타브 시프트 (-1, 0, +1, +2 등, undefined면 자동 계산)
  allowSharpsApproximation?: boolean; // 반음(#) 발생 시 인접 자연음으로 자동 매핑 (기본 true)
}
