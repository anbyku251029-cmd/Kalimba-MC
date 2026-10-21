/**
 * Kalimba-MC 음악 데이터 검증 엔진 타입 정의
 */

export const VALIDATION_ERROR_CODES = {
  // 규칙 A: 기본 곡 메타데이터
  MUSIC_MISSING_ID: 'MUSIC_MISSING_ID',
  MUSIC_MISSING_TITLE: 'MUSIC_MISSING_TITLE',
  MUSIC_DUPLICATE_ID: 'MUSIC_DUPLICATE_ID',
  MUSIC_INVALID_LEVEL: 'MUSIC_INVALID_LEVEL',
  MUSIC_INVALID_BPM: 'MUSIC_INVALID_BPM',
  MUSIC_INVALID_TIME_SIGNATURE: 'MUSIC_INVALID_TIME_SIGNATURE',
  MUSIC_EMPTY_NOTES: 'MUSIC_EMPTY_NOTES',

  // 규칙 B: 음표 및 쉼표 데이터
  NOTE_INVALID_DURATION: 'NOTE_INVALID_DURATION',
  NOTE_INVALID_PITCH: 'NOTE_INVALID_PITCH',
  NOTE_UNSUPPORTED_SYMBOL: 'NOTE_UNSUPPORTED_SYMBOL',
  PARSER_DATA_LOSS: 'PARSER_DATA_LOSS',

  // 규칙 C: 리듬 및 연주 시간
  DURATION_CALCULATION_MISMATCH: 'DURATION_CALCULATION_MISMATCH',

  // 규칙 D: 마디 및 박자표
  RHYTHM_MEASURE_MISMATCH: 'RHYTHM_MEASURE_MISMATCH',
  RHYTHM_UNVERIFIED_MEASURES: 'RHYTHM_UNVERIFIED_MEASURES',

  // 규칙 E: 칼림바 17키 음역
  PITCH_OUT_OF_RANGE: 'PITCH_OUT_OF_RANGE',
  OCTAVE_OUT_OF_BOUNDS: 'OCTAVE_OUT_OF_BOUNDS',
} as const;

export type ValidationErrorCode = typeof VALIDATION_ERROR_CODES[keyof typeof VALIDATION_ERROR_CODES];

export type ValidationStatus = 'PASS' | 'REVIEW' | 'FAIL' | 'UNVERIFIED';

export interface ValidationErrorItem {
  code: ValidationErrorCode;
  message: string;
  severity: 'FAIL' | 'REVIEW';
  noteIndex?: number;
  measureNumber?: number;
  rawToken?: string;
  recommendation?: string;
}

export interface MeasureAuditItem {
  measureNumber: number;
  expectedBeats: number;
  actualBeats: number;
  diff: number;
  rawText: string;
  isValid: boolean;
  isPickupOrFinal?: boolean;
}

export interface RuleCheckSummary {
  ruleName: string;
  passed: boolean;
  notes?: string;
}

export interface SongValidationReport {
  songId: string;
  title: string;
  category: string;
  level: string; // 하위 호환용 (category와 동일)
  checkedAt: string;
  checkedRulesCount: number;
  passCount: number;
  reviewCount: number;
  failCount: number;
  unverifiedCount: number;
  tempoBpm: number;
  timeSignature: string;
  totalNotes: number; // 전체 항목 수 (음표 + 쉼표)
  playableNotes: number; // 쉼표 제외 실제 연주 건반 수
  restNotes: number; // 쉼표 수
  totalBeats: number;
  calculatedSeconds: number;
  durationSeconds: number; // 하위 호환용 (calculatedSeconds와 동일)
  estimatedMinutesReported: number;
  status: ValidationStatus;
  measureCount: number; // 하위 호환용 (measureAudits.length)
  measureMismatchCount: number; // 하위 호환용
  measureAudits: MeasureAuditItem[];
  invalidPitches: string[]; // 하위 호환용
  anomalies: string[]; // 하위 호환용
  warnings: string[]; // 하위 호환용
  errors: ValidationErrorItem[];
  ruleSummaries: RuleCheckSummary[];
}

export type SongValidationResult = SongValidationReport;

export interface CatalogValidationSummary {
  totalSongs: number;
  byCategory: {
    beginner: number;
    intermediate: number;
    advanced: number;
    hymn: number;
    custom: number;
  };
  statusCounts: {
    PASS: number;
    REVIEW: number;
    FAIL: number;
    UNVERIFIED: number;
  };
  errorCodeCounts: Record<string, number>;
  reports: SongValidationReport[];
}
