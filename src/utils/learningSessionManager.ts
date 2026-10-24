/**
 * learningSessionManager.ts
 * Kalimba-MC STEP 02-E: 실제 연습 활동 기록, 시간 측정 및 학부모 대시보드 통계 엔진
 */

import {
  LearningSessionRecord,
  LearningSessionStatus,
  ParentDashboardStats,
  ChildGrowthSummary,
  DayPracticeBarData,
  SongLearningSummary,
  StoredLearningRecordsPayload,
  LearningGoalSettings,
} from '../types/learningRecordTypes';
import { ComboStats } from '../types/comboTypes';

export const LEARNING_STORAGE_KEY = 'kalimba_mc_learning_records_v1';
export const SCHEMA_VERSION = 1;

// Node.js 단위 테스트 및 SSR/가상환경용 메모리 폴백 저장소
let memoryStoreFallback: StoredLearningRecordsPayload = {
  version: SCHEMA_VERSION,
  sessions: [],
  goals: { dailyGoalMinutes: 10 },
  lastUpdated: Date.now(),
};

/**
 * 한국 시간대(Asia/Seoul) 기준 YYYY-MM-DD 문자열을 반환합니다.
 */
export function getSeoulDateString(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  // 한국 표준시 (UTC+9) 오프셋 계산
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const seoulDate = new Date(utc + 9 * 3600000);
  const year = seoulDate.getFullYear();
  const month = String(seoulDate.getMonth() + 1).padStart(2, '0');
  const day = String(seoulDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 한국 시간대 기준 날짜와 시각 문자열을 반환합니다 (예: 2026-10-24 22:30).
 */
export function getSeoulDateTimeString(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const seoulDate = new Date(utc + 9 * 3600000);
  const year = seoulDate.getFullYear();
  const month = String(seoulDate.getMonth() + 1).padStart(2, '0');
  const day = String(seoulDate.getDate()).padStart(2, '0');
  const hours = String(seoulDate.getHours()).padStart(2, '0');
  const mins = String(seoulDate.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${mins}`;
}

export class LearningSessionManager {
  private activeSessionId: string | null = null;
  private activeSongId: string = '';
  private activeSongTitle: string = '';
  private activeDifficulty: string = '보통';
  private activeSpeedPercent: number = 100;
  private sessionStartWallTime: number = 0;
  private accumulatedPracticeMs: number = 0;
  private lastResumePerfTime: number = 0;
  private isPaused: boolean = false;
  private hasCompletedThisSession: boolean = false;

  // 멱등성 보장: 이미 확정된 세션 ID 집합
  private finalizedSessionIds: Set<string> = new Set();

  /**
   * 연습 세션을 시작합니다.
   */
  public startSession(
    songId: string,
    songTitle: string,
    difficulty: string = '보통',
    speedPercent: number = 100
  ): string {
    // 만약 이전 세션이 완료되지 않은 채 남아있다면 중단(ABANDONED) 처리
    if (this.activeSessionId && !this.hasCompletedThisSession) {
      this.abandonActiveSession();
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.activeSessionId = sessionId;
    this.activeSongId = songId;
    this.activeSongTitle = songTitle;
    this.activeDifficulty = difficulty;
    this.activeSpeedPercent = speedPercent;
    this.sessionStartWallTime = Date.now();
    this.accumulatedPracticeMs = 0;
    this.lastResumePerfTime = performance.now();
    this.isPaused = false;
    this.hasCompletedThisSession = false;

    // 초기 상태 저장
    const initialRecord: LearningSessionRecord = {
      id: sessionId,
      songId,
      songTitle,
      difficulty,
      speedPercent,
      startTime: this.sessionStartWallTime,
      endTime: this.sessionStartWallTime,
      practiceDurationSec: 0,
      status: 'STARTED',
      isCompleted: false,
      createdAt: this.sessionStartWallTime,
      updatedAt: this.sessionStartWallTime,
    };

    this.saveSessionRecord(initialRecord);
    return sessionId;
  }

  /**
   * 일시정지 시 순수 연습 시간을 누적합니다.
   */
  public pauseSession(): void {
    if (!this.activeSessionId || this.isPaused) return;
    const nowPerf = performance.now();
    this.accumulatedPracticeMs += Math.max(0, nowPerf - this.lastResumePerfTime);
    this.isPaused = true;

    this.updateActiveRecordStatus('PAUSED');
  }

  /**
   * 일시정지 해제 후 연습을 재개합니다.
   */
  public resumeSession(): void {
    if (!this.activeSessionId || !this.isPaused) return;
    this.lastResumePerfTime = performance.now();
    this.isPaused = false;

    this.updateActiveRecordStatus('IN_PROGRESS');
  }

  /**
   * 곡 완주 시 세션을 정상 완료(COMPLETED) 처리하고 통계를 확정합니다.
   * 동일 세션에 대해 중복 호출되더라도 1회만 처리 (멱등성 보장).
   */
  public completeSession(stats?: ComboStats): LearningSessionRecord | null {
    if (!this.activeSessionId || this.hasCompletedThisSession) {
      return null;
    }

    // 중복 확정 방지
    if (this.finalizedSessionIds.has(this.activeSessionId)) {
      return null;
    }

    const nowWall = Date.now();
    const nowPerf = performance.now();

    if (!this.isPaused) {
      this.accumulatedPracticeMs += Math.max(0, nowPerf - this.lastResumePerfTime);
    }

    const practiceDurationSec = Math.max(1, Math.round(this.accumulatedPracticeMs / 1000));
    this.hasCompletedThisSession = true;
    this.finalizedSessionIds.add(this.activeSessionId);

    const calculatedScore = stats
      ? stats.perfectCount * 100 + stats.greatCount * 60
      : undefined;

    const record: LearningSessionRecord = {
      id: this.activeSessionId,
      songId: this.activeSongId,
      songTitle: this.activeSongTitle,
      difficulty: this.activeDifficulty,
      speedPercent: this.activeSpeedPercent,
      startTime: this.sessionStartWallTime,
      endTime: nowWall,
      practiceDurationSec,
      status: 'COMPLETED',
      isCompleted: true,
      score: calculatedScore,
      accuracyPercent: stats?.accuracy,
      maxCombo: stats?.maxCombo,
      perfectCount: stats?.perfectCount,
      greatCount: stats?.greatCount,
      missCount: stats?.missCount,
      createdAt: this.sessionStartWallTime,
      updatedAt: nowWall,
    };

    this.saveSessionRecord(record);
    this.resetActiveState();
    return record;
  }

  /**
   * 사용자가 도중에 연주를 나가거나 곡을 바꾼 경우 세션을 중단(ABANDONED) 처리합니다.
   */
  public abandonActiveSession(): LearningSessionRecord | null {
    if (!this.activeSessionId || this.hasCompletedThisSession) {
      return null;
    }

    const nowWall = Date.now();
    const nowPerf = performance.now();

    if (!this.isPaused) {
      this.accumulatedPracticeMs += Math.max(0, nowPerf - this.lastResumePerfTime);
    }

    const practiceDurationSec = Math.max(0, Math.round(this.accumulatedPracticeMs / 1000));
    this.finalizedSessionIds.add(this.activeSessionId);

    const record: LearningSessionRecord = {
      id: this.activeSessionId,
      songId: this.activeSongId,
      songTitle: this.activeSongTitle,
      difficulty: this.activeDifficulty,
      speedPercent: this.activeSpeedPercent,
      startTime: this.sessionStartWallTime,
      endTime: nowWall,
      practiceDurationSec,
      status: 'ABANDONED',
      isCompleted: false,
      createdAt: this.sessionStartWallTime,
      updatedAt: nowWall,
    };

    this.saveSessionRecord(record);
    this.resetActiveState();
    return record;
  }

  private resetActiveState(): void {
    this.activeSessionId = null;
    this.activeSongId = '';
    this.activeSongTitle = '';
    this.accumulatedPracticeMs = 0;
    this.isPaused = false;
    this.hasCompletedThisSession = false;
  }

  private updateActiveRecordStatus(status: LearningSessionStatus): void {
    if (!this.activeSessionId) return;
    const records = this.getAllSessions();
    const idx = records.findIndex((r) => r.id === this.activeSessionId);
    if (idx >= 0) {
      records[idx].status = status;
      records[idx].updatedAt = Date.now();
      records[idx].practiceDurationSec = Math.round(this.accumulatedPracticeMs / 1000);
      this.persistSessions(records);
    }
  }

  // ---------------------------------------------------------------------
  // 저장소(localStorage) 입출력 및 무결성 관리
  // ---------------------------------------------------------------------

  public getAllSessions(): LearningSessionRecord[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(LEARNING_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as StoredLearningRecordsPayload;
        if (parsed && Array.isArray(parsed.sessions)) {
          return parsed.sessions;
        }
      } else {
        return [...memoryStoreFallback.sessions];
      }
    } catch (e) {
      console.warn('Failed to load learning sessions', e);
    }
    return typeof window === 'undefined' ? [...memoryStoreFallback.sessions] : [];
  }

  public saveSessionRecord(record: LearningSessionRecord): void {
    const records = this.getAllSessions();
    const existingIdx = records.findIndex((r) => r.id === record.id);
    if (existingIdx >= 0) {
      records[existingIdx] = record;
    } else {
      records.push(record);
    }
    this.persistSessions(records);
  }

  private persistSessions(sessions: LearningSessionRecord[]): void {
    const payload: StoredLearningRecordsPayload = {
      version: SCHEMA_VERSION,
      sessions,
      goals: this.getGoalSettings(),
      lastUpdated: Date.now(),
    };

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(payload));
      } else {
        memoryStoreFallback = payload;
      }
    } catch (e) {
      console.warn('Failed to persist learning records', e);
    }
  }

  // ---------------------------------------------------------------------
  // 목표 설정 관리
  // ---------------------------------------------------------------------

  public getGoalSettings(): LearningGoalSettings {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(LEARNING_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.goals && typeof parsed.goals.dailyGoalMinutes === 'number') {
            return parsed.goals;
          }
        }
      } else {
        return memoryStoreFallback.goals || { dailyGoalMinutes: 10 };
      }
    } catch {
      // ignore
    }
    return { dailyGoalMinutes: 10 }; // 기본 일일 목표: 10분
  }

  public setDailyGoalMinutes(minutes: number): void {
    const current = this.getAllSessions();
    const newGoals = { dailyGoalMinutes: Math.max(1, Math.min(120, minutes)) };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const payload: StoredLearningRecordsPayload = {
          version: SCHEMA_VERSION,
          sessions: current,
          goals: newGoals,
          lastUpdated: Date.now(),
        };
        window.localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(payload));
      } else {
        memoryStoreFallback.goals = newGoals;
      }
    } catch (e) {
      console.warn('Failed to update goal settings', e);
    }
  }

  // ---------------------------------------------------------------------
  // 학부모 대시보드 통계 집계
  // ---------------------------------------------------------------------

  public getParentDashboardStats(): ParentDashboardStats {
    const sessions = this.getAllSessions();
    const todayStr = getSeoulDateString();

    let todayPracticeSeconds = 0;
    let weekPracticeSeconds = 0;
    let monthPracticeSeconds = 0;
    let totalCompletions = 0;

    const distinctCompletedSongIds = new Set<string>();
    const songSummaryMap = new Map<string, SongLearningSummary>();
    const activeDatesSet = new Set<string>();

    // 최근 7일 날짜 목록 생성 (과거 6일 ~ 오늘)
    const sevenDaysList: string[] = [];
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      sevenDaysList.push(getSeoulDateString(now - i * 86400000));
    }
    const sevenDaysSecondsMap = new Map<string, number>(sevenDaysList.map((d) => [d, 0]));
    const sevenDaysSessionsMap = new Map<string, number>(sevenDaysList.map((d) => [d, 0]));

    // 이번 주의 시작일(월요일) 및 이번 달의 시작일 계산
    const nowSeoul = new Date(now + 9 * 3600000);
    const dayOfWeek = (nowSeoul.getUTCDay() + 6) % 7; // 월요일=0, 일요일=6
    const thisMondayStr = getSeoulDateString(now - dayOfWeek * 86400000);
    const thisMonthPrefix = todayStr.substring(0, 7); // 'YYYY-MM'

    sessions.forEach((s) => {
      const sDateStr = getSeoulDateString(s.startTime);
      const durSec = s.practiceDurationSec || 0;

      // 오늘 연습 시간
      if (sDateStr === todayStr) {
        todayPracticeSeconds += durSec;
      }
      // 이번 주 연습 시간
      if (sDateStr >= thisMondayStr && sDateStr <= todayStr) {
        weekPracticeSeconds += durSec;
      }
      // 이번 달 연습 시간
      if (sDateStr.startsWith(thisMonthPrefix)) {
        monthPracticeSeconds += durSec;
      }

      // 최근 7일 연습 시간 & 세션
      if (sevenDaysSecondsMap.has(sDateStr)) {
        sevenDaysSecondsMap.set(sDateStr, (sevenDaysSecondsMap.get(sDateStr) || 0) + durSec);
        sevenDaysSessionsMap.set(sDateStr, (sevenDaysSessionsMap.get(sDateStr) || 0) + 1);
        if (durSec > 0) activeDatesSet.add(sDateStr);
      }

      // 완주 통계
      if (s.isCompleted) {
        totalCompletions++;
        distinctCompletedSongIds.add(s.songId);
      }

      // 곡별 누적 통계
      const existing = songSummaryMap.get(s.songId) || {
        songId: s.songId,
        songTitle: s.songTitle,
        difficulty: s.difficulty,
        practiceCount: 0,
        totalPracticeSeconds: 0,
        completionCount: 0,
        lastPracticedAt: s.startTime,
      };

      existing.practiceCount++;
      existing.totalPracticeSeconds += durSec;
      if (s.isCompleted) existing.completionCount++;
      if (s.score !== undefined) {
        existing.bestScore = Math.max(existing.bestScore || 0, s.score);
      }
      if (s.accuracyPercent !== undefined) {
        existing.bestAccuracy = Math.max(existing.bestAccuracy || 0, s.accuracyPercent);
      }
      existing.lastPracticedAt = Math.max(existing.lastPracticedAt, s.startTime);
      songSummaryMap.set(s.songId, existing);
    });

    // 주간 막대 차트 데이터 구축
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    const weeklyBarData: DayPracticeBarData[] = sevenDaysList.map((dateStr) => {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const label = dayLabels[d.getDay()];
      const sec = sevenDaysSecondsMap.get(dateStr) || 0;
      return {
        date: dateStr,
        dayLabel: label,
        durationMinutes: Math.round((sec / 60) * 10) / 10,
        durationSeconds: sec,
        sessionCount: sevenDaysSessionsMap.get(dateStr) || 0,
        isToday: dateStr === todayStr,
      };
    });

    // 최신 순 정렬된 세션 목록 (최대 50건)
    const recentSessions = [...sessions].sort((a, b) => b.startTime - a.startTime).slice(0, 50);

    const lastPracticedDateText =
      sessions.length > 0
        ? getSeoulDateTimeString(recentSessions[0].startTime)
        : '연습 기록 없음';

    return {
      todayPracticeMinutes: Math.round((todayPracticeSeconds / 60) * 10) / 10,
      todayPracticeSeconds,
      weekPracticeMinutes: Math.round((weekPracticeSeconds / 60) * 10) / 10,
      monthPracticeMinutes: Math.round((monthPracticeSeconds / 60) * 10) / 10,
      totalSessions: sessions.length,
      totalCompletions,
      distinctCompletedSongsCount: distinctCompletedSongIds.size,
      activeDaysLast7Days: activeDatesSet.size,
      lastPracticedDateText,
      weeklyBarData,
      songSummaries: Array.from(songSummaryMap.values()).sort(
        (a, b) => b.lastPracticedAt - a.lastPracticedAt
      ),
      recentSessions,
    };
  }

  // ---------------------------------------------------------------------
  // 어린이 성장 화면 요약
  // ---------------------------------------------------------------------

  public getChildGrowthSummary(): ChildGrowthSummary {
    const stats = this.getParentDashboardStats();
    const goals = this.getGoalSettings();

    const todayMinutes = stats.todayPracticeMinutes;
    const goalMinutes = goals.dailyGoalMinutes || 10;
    const progressPercent = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));

    // 실제 데이터에 기반한 긍정적 메시지 생성 (가짜 메시지 금지)
    let encouragementMessage = '오늘도 맑고 고운 칼림바 소리를 연주해 봐요! 🌱';
    if (todayMinutes >= goalMinutes) {
      encouragementMessage = `와아! 오늘 목표 ${goalMinutes}분을 멋지게 달성했어요! 🏆`;
    } else if (todayMinutes > 0) {
      encouragementMessage = `오늘 ${todayMinutes}분 동안 열심히 연습했어요! 정말 잘하고 있어요! ✨`;
    } else if (stats.totalCompletions > 0) {
      encouragementMessage = `지금까지 ${stats.totalCompletions}번이나 곡을 끝까지 연주했어요! 🚀`;
    }

    // 오늘 연습한 세션 수 계산
    const todayStr = getSeoulDateString();
    const todaySessions = this.getAllSessions().filter((s) => getSeoulDateString(s.startTime) === todayStr);
    const todayCompletedCount = todaySessions.filter((s) => s.isCompleted).length;

    return {
      todaySeconds: stats.todayPracticeSeconds,
      todayMinutes,
      todaySessions: todaySessions.length,
      todayCompletedCount,
      dailyGoalMinutes: goalMinutes,
      dailyGoalProgressPercent: progressPercent,
      encouragementMessage,
    };
  }

  // ---------------------------------------------------------------------
  // 데이터 내보내기 & 삭제
  // ---------------------------------------------------------------------

  /**
   * 학습 기록을 안전한 CSV 문자열로 변환합니다 (수식 인젝션 방어 적용).
   */
  public exportLearningRecordsToCsv(): string {
    const sessions = this.getAllSessions();
    const headers = [
      '세션ID',
      '일자 및 시각',
      '곡ID',
      '곡제목',
      '난이도',
      '연습시간(초)',
      '완주여부',
      '상태',
      '점수',
      '정확도(%)',
      '최고콤보',
    ];

    const rows = sessions.map((s) => {
      // CSV Formula Injection 방어: =, +, -, @ 기호로 시작하면 작은따옴표 추가
      let safeTitle = s.songTitle;
      if (/^[=+\-@]/.test(safeTitle)) {
        safeTitle = `'${safeTitle}`;
      }
      safeTitle = `"${safeTitle.replace(/"/g, '""')}"`;

      return [
        s.id,
        getSeoulDateTimeString(s.startTime),
        s.songId,
        safeTitle,
        s.difficulty,
        s.practiceDurationSec,
        s.isCompleted ? '완주' : '미완주',
        s.status,
        s.score !== undefined ? s.score : '',
        s.accuracyPercent !== undefined ? `${s.accuracyPercent}%` : '',
        s.maxCombo !== undefined ? s.maxCombo : '',
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * JSON 백업 데이터를 내보냅니다.
   */
  public exportLearningRecordsToJson(): string {
    const payload: StoredLearningRecordsPayload = {
      version: SCHEMA_VERSION,
      sessions: this.getAllSessions(),
      goals: this.getGoalSettings(),
      lastUpdated: Date.now(),
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * 특정 세션 기록 하나를 삭제합니다.
   */
  public deleteSessionRecord(sessionId: string): void {
    const sessions = this.getAllSessions().filter((s) => s.id !== sessionId);
    this.persistSessions(sessions);
  }

  /**
   * 모든 학습 기록을 초기화합니다.
   */
  public clearAllLearningRecords(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(LEARNING_STORAGE_KEY);
      } else {
        memoryStoreFallback.sessions = [];
      }
    } catch (e) {
      console.warn('Failed to clear learning records', e);
    }
  }
}

// 싱글톤 인스턴스
export const learningSessionManager = new LearningSessionManager();
