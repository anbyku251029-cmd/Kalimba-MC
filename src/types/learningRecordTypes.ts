/**
 * learningRecordTypes.ts
 * Kalimba-MC STEP 02-E: 실제 연습 활동 기록 및 학부모 대시보드 데이터 모델
 */

export type LearningSessionStatus =
  | 'STARTED'      // 연습 시작됨
  | 'IN_PROGRESS'  // 연습 진행 중
  | 'PAUSED'       // 일시정지 상태
  | 'COMPLETED'    // 끝까지 정상 완주
  | 'ABANDONED'    // 도중 나감 / 중단
  | 'ERROR';       // 비정상 예외

export interface LearningSessionRecord {
  id: string;                    // 고유 세션 ID (예: 'session_1740000000_abc')
  songId: string;                // 연습한 곡 ID
  songTitle: string;             // 곡 제목 스냅샷 (이후 곡명 변경 대비)
  difficulty: '쉬움' | '보통' | '어려움' | '찬송가' | string;
  speedPercent: number;          // 연주 속도 (70%, 100%, 130% 등)
  startTime: number;             // 시작 시각 (밀리초 타임스탬프)
  endTime: number;               // 종료 시각 (밀리초 타임스탬프)
  practiceDurationSec: number;   // 실제 순수 연습 시간 (일시정지 제외, 초 단위)
  status: LearningSessionStatus; // 최종 상태
  isCompleted: boolean;          // 곡 완주 여부
  score?: number;                // 게임 점수 (측정 시)
  accuracyPercent?: number;      // 정확도 (0~100%, 측정 시)
  maxCombo?: number;             // 최고 콤보
  perfectCount?: number;         // PERFECT 판정 수
  greatCount?: number;           // GREAT 판정 수
  missCount?: number;            // MISS 판정 수
  tempoMode?: string;            // STEP 03-C: 템포 모드 ('original' | 'relaxed' | 'adaptive' | 'free')
  initialSpeedPercent?: number;  // 시작 속도 (%)
  finalSpeedPercent?: number;    // 종료 속도 (%)
  waitingCount?: number;         // 음표 대기 발생 횟수
  createdAt: number;             // 기록 생성 시각
  updatedAt: number;             // 기록 갱신 시각
}

export interface DayPracticeBarData {
  date: string;                  // 'YYYY-MM-DD'
  dayLabel: string;              // '월', '화', '수', '목', '금', '토', '일'
  durationMinutes: number;       // 해당 일자 연습 시간 (분 단위, 소수점 1자리)
  durationSeconds: number;       // 해당 일자 연습 시간 (초)
  sessionCount: number;          // 세션 수
  isToday: boolean;              // 오늘 여부
}

export interface SongLearningSummary {
  songId: string;
  songTitle: string;
  difficulty: string;
  practiceCount: number;         // 총 연습 횟수
  totalPracticeSeconds: number;  // 총 연습 시간(초)
  completionCount: number;       // 완주 횟수
  bestScore?: number;            // 최고 점수
  bestAccuracy?: number;         // 최고 정확도
  lastPracticedAt: number;       // 최근 연습 시각
}

export interface ParentDashboardStats {
  todayPracticeMinutes: number;   // 오늘 총 연습 시간 (분)
  todayPracticeSeconds: number;   // 오늘 총 연습 시간 (초)
  weekPracticeMinutes: number;    // 이번 주 총 연습 시간 (분)
  monthPracticeMinutes: number;   // 이번 달 총 연습 시간 (분)
  totalSessions: number;          // 누적 세션 수
  totalCompletions: number;       // 총 완주 횟수
  distinctCompletedSongsCount: number; // 완주한 고유 곡 수
  activeDaysLast7Days: number;    // 최근 7일 중 연습한 일수 (0~7)
  lastPracticedDateText: string;  // 최근 연습 날짜 텍스트 (예: '2026-10-24 22:30')
  weeklyBarData: DayPracticeBarData[]; // 최근 7일 막대 그래프 데이터
  songSummaries: SongLearningSummary[]; // 곡별 학습 현황
  recentSessions: LearningSessionRecord[]; // 최근 연습 세션 목록
}

export interface ChildGrowthSummary {
  todaySeconds: number;           // 오늘 연습 초
  todayMinutes: number;           // 오늘 연습 분
  todaySessions: number;          // 오늘 연습 횟수
  todayCompletedCount: number;    // 오늘 완주한 곡 수
  dailyGoalMinutes: number;       // 일일 목표 (분, 기본 10분)
  dailyGoalProgressPercent: number; // 목표 달성률 (0~100%)
  encouragementMessage: string;   // 실제 활동 기반 격려 메시지
}

export interface LearningGoalSettings {
  dailyGoalMinutes: number;       // 기본: 10분
}

export interface StoredLearningRecordsPayload {
  version: number;                // 스키마 버전 (1)
  sessions: LearningSessionRecord[];
  goals: LearningGoalSettings;
  lastUpdated: number;
}
