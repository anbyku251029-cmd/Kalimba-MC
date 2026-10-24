/**
 * scoreOcrTypes.ts
 * Kalimba-MC STEP 02-D: 악보 이미지 업로드 및 음표 추출·수정 데이터 구조
 */

import { KalimbaNote } from './music';

export type OcrEngineStatus =
  | 'IDLE'               // 초기 대기 상태
  | 'LOADING_IMAGE'      // 이미지 디코딩 및 검사 중
  | 'ANALYZING'          // 오선 및 음악 기호 분석 중
  | 'OMR_READY'          // 오선 및 음표 감지 완료
  | 'MANUAL_ENTRY_MODE'  // 오선 패턴 불명확하여 스마트 수동 입력 모드로 동작
  | 'ERROR';             // 이미지 로드 실패 또는 분석 불가

export interface ImageBoundingBox {
  x: number;             // 정규화 좌표 (0.0 ~ 1.0) 또는 픽셀 좌표
  y: number;
  width: number;
  height: number;
}

export interface DetectedStaffSystem {
  id: string;
  yTop: number;          // 상단 오선 y 좌표 (픽셀)
  yBottom: number;       // 하단 오선 y 좌표 (픽셀)
  lineSpacing: number;   // 오선 간격 (픽셀)
  lines: number[];       // 5개 오선의 y 좌표 배열
}

export interface ExtractedNote {
  id: string;            // 고유 식별자 (예: 'ext_note_1')
  order: number;         // 1부터 시작하는 순서
  pitch: string;         // 'C4', 'E4', 'G4', 'C5', 'REST' 등
  solfege: string;       // '도', '레', '미', '솔', '쉼'
  octaveLevel: 0 | 1 | 2; // 0 (C4~B4), 1 (C5~B5), 2 (C6~E6)
  numberNotation: string;// '1', '3', '5', "1'", "0"
  duration: number;      // 박자 단위 (1 = 4분음표, 0.5 = 8분음표, 2 = 2분음표 등)
  isRest: boolean;       // 쉼표 여부
  measureIndex: number;  // 1부터 시작하는 마디 번호
  lyric?: string;        // 가사 텍스트
  userModified: boolean; // 사용자 직접 수정 여부
  confidence?: number;   // 인식 신뢰도 (0.0 ~ 1.0, OMR 엔진 제공 시)
  bbox?: ImageBoundingBox;// 원본 이미지 상의 감지 위치 (제공 시)
}

export type ScoreValidationSeverity = 'PASS' | 'WARNING' | 'ERROR' | 'UNSUPPORTED';

export interface ScoreValidationIssue {
  severity: ScoreValidationSeverity;
  noteId?: string;
  noteOrder?: number;
  message: string;
  suggestion?: string;
  canAutoFix?: boolean;
}

export interface ScoreValidationResult {
  status: ScoreValidationSeverity;
  isValidForKalimba: boolean;
  totalNotes: number;
  playableNotes: number;
  restNotes: number;
  outOfRangeNotes: number;
  issues: ScoreValidationIssue[];
  suggestedOctaveShift?: number; // +1, -1 등
}

export interface ScoreOcrSession {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  createdAt: number;
  updatedAt: number;
  status: OcrEngineStatus;
  statusMessage: string;
  detectedStaffSystems: DetectedStaffSystem[];
  notes: ExtractedNote[];
  originalNotes: ExtractedNote[]; // 원본 추출 결과 보존 (복원용)
  history: ExtractedNote[][];     // Undo 이력 스택
  future: ExtractedNote[][];      // Redo 이력 스택
  metadata: {
    title: string;
    subTitle?: string;
    composer?: string;
    timeSignature: '4/4' | '3/4' | '2/4' | '6/8';
    tempoBpm: number;
    difficulty: '쉬움' | '보통' | '어려움' | '찬송가';
  };
}
