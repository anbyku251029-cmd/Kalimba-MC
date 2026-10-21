/**
 * Kalimba-MC STEP 01-F
 * 어린이 단계별 학습 및 연주 피드백 관련 타입 정의
 */

export type LearningStep =
  | 'LISTENING'        // 1단계: 먼저 듣기 (원곡 감상)
  | 'KEY_EXPLORE'     // 2단계: 음표와 건반 익히기 (한 음씩 탐색)
  | 'LOOP_PRACTICE'   // 3단계: 짧은 구간 연습 (반복 연습)
  | 'FULL_PRACTICE'   // 4단계: 곡 전체 연습 (템포 조절)
  | 'PRACTICE_RESULT'; // 5단계: 연습 결과 확인 (성취 피드백)

export type PracticeFeedbackState =
  | 'PRACTICE_STARTED'              // 연습 시작
  | 'LISTENING_COMPLETED'           // 듣기 단계 완료
  | 'KEY_EXPLORED'                  // 건반 위치 확인 완료
  | 'SECTION_PRACTICED'             // 구간 연습 완료
  | 'SONG_PRACTICED'                // 곡 전체 연습 완료
  | 'PITCH_ANALYSIS_UNAVAILABLE'    // 마이크 음정 분석 미사용/사용불가
  | 'PITCH_ANALYSIS_UNCERTAIN'      // 음정 분석 결과가 불확실함
  | 'PITCH_ANALYSIS_CONFIRMED';     // 검증 기준을 만족한 분석 결과

export interface LearningProgressItem {
  songId: string;
  completedSteps: LearningStep[];
  lastStep: LearningStep;
  loopSectionIndex: number;          // 마지막으로 연습한 구간 (0: 1~4마디, 1: 5~8마디 등)
  practiceCount: number;             // 실제 연습 횟수
  practiceDurationSeconds: number;   // 실제 연습 누적 시간(초)
  lastPracticeTimestamp: number;     // 마지막 연습 완료 일시
  preferredSpeedPercent: number;     // 선호 연습 속도 (기본 70% 또는 100%)
}

export interface LearningCatalogProgress {
  [songId: string]: LearningProgressItem;
}
