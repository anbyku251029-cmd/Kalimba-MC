/**
 * Kalimba-MC STEP 01-F
 * 마이크 기반 음정 분석 관련 타입 정의
 */

import { KalimbaKeyDef } from '../constants/kalimbaKeys';

export type MicListeningState =
  | 'idle'                    // 대기 상태 (기본 비활성)
  | 'requesting_permission'   // 사용자 권한 요청 중
  | 'permission_denied'       // 권한 거부됨
  | 'no_device'               // 마이크 장치 없음
  | 'unsupported'             // 브라우저 getUserMedia 미지원
  | 'listening'               // 실시간 분석 중
  | 'error';                  // 기타 오류

export type PitchAnalysisStatus =
  | 'SILENCE'      // 소리 없음 (배경 잡음 이하)
  | 'UNCERTAIN'    // 신호는 있으나 신뢰도 미달 (배음 혼선 또는 불안정한 신호)
  | 'MATCH'        // 특정 칼림바 건반과 허용 오차(±45센트) 내 일치
  | 'MISMATCH';    // 칼림바 음역 밖이거나 허용 오차 초과

export interface PitchAnalysisResult {
  isAvailable: boolean;
  state: MicListeningState;
  estimatedFrequency: number | null; // 추정 기음 주파수 (Hz)
  estimatedPitch: string | null;     // 예: 'C4', 'G4', 'E5'
  closestKey: KalimbaKeyDef | null;  // 17건반 중 가장 가까운 건반
  centsDeviation: number | null;     // 기준음 대비 센트 오차 (-50 ~ +50)
  confidence: number;                // 0.0 ~ 1.0 (자기상관 최대 피크 계수)
  rmsVolume: number;                 // 0.0 ~ 1.0 (신호 강도)
  status: PitchAnalysisStatus;
  errorMessage: string | null;
}
