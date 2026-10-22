/**
 * Kalimba-MC STEP 01-G
 * 마디(Measure/Bar) 메타데이터 및 구간 연습 관련 타입 정의
 */

import { KalimbaNote } from './music';

export interface MeasureInfo {
  measureNumber: number;        // 사용자 표시 마디 번호 (1-based: 1, 2, 3...)
  measureIndex: number;         // 0-based 인덱스 (0, 1, 2...)
  startNoteIndex: number;       // song.notes 내 시작 음표 인덱스
  endNoteIndex: number;         // song.notes 내 종료 음표 인덱스 (포함)
  startBeat: number;            // 곡 시작 기준 마디 시작 비트
  endBeat: number;              // 마디 종료 비트
  totalBeats: number;           // 마디 내 실제 비트 합
  expectedBeats: number;        // 박자표 기준 기대 비트 (예: 4/4 -> 4.0)
  notes: KalimbaNote[];         // 해당 마디에 속한 음표들
  status: 'PASS' | 'REVIEW';    // 박자 검증 상태
  source: 'BAR_DELIMITER' | 'TIME_SIGNATURE_CALCULATED'; // 판정 근거
}

export interface SongMeasureData {
  songId: string;
  totalMeasures: number;
  measures: MeasureInfo[];
  timeSignature: string;
  tempoBpm: number;
  isAllPass: boolean;
  validationSummary: {
    passCount: number;
    reviewCount: number;
  };
}

export interface MeasureRangeSelection {
  startMeasure: number; // 1-based (예: 1)
  endMeasure: number;   // 1-based (예: 4)
}

export type SectionPracticeStep =
  | 'SECTION_LISTEN'   // 1단계: 선택 구간 먼저 듣기
  | 'SECTION_SLOW'     // 2단계: 천천히 따라 하기
  | 'SECTION_REPEAT';  // 3단계: 구간 반복 연습 (1/3/5회)
