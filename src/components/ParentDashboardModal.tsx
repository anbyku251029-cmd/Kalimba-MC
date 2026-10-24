/**
 * ParentDashboardModal.tsx
 * Kalimba-MC STEP 02-E: 학부모 학습 대시보드 화면
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X, BarChart3, Clock, Trophy, Calendar, FileText, Download,
  Trash2, Filter, AlertCircle, Info, ChevronRight, CheckCircle2
} from 'lucide-react';
import { learningSessionManager } from '../utils/learningSessionManager';
import { ParentDashboardStats, LearningSessionRecord } from '../types/learningRecordTypes';

interface ParentDashboardModalProps {
  onClose: () => void;
}

export const ParentDashboardModal: React.FC<ParentDashboardModalProps> = ({ onClose }) => {
  const [stats, setStats] = useState<ParentDashboardStats>(() =>
    learningSessionManager.getParentDashboardStats()
  );
  const [filterType, setFilterType] = useState<'ALL' | 'COMPLETED' | 'INCOMPLETE'>('ALL');
  const [activeTab, setActiveTab] = useState<'ACTIVITY' | 'SONGS'>('ACTIVITY');

  const refreshStats = () => {
    setStats(learningSessionManager.getParentDashboardStats());
  };

  useEffect(() => {
    refreshStats();
  }, []);

  // 필터링된 세션 목록
  const filteredSessions = useMemo(() => {
    if (filterType === 'COMPLETED') {
      return stats.recentSessions.filter((s) => s.isCompleted);
    }
    if (filterType === 'INCOMPLETE') {
      return stats.recentSessions.filter((s) => !s.isCompleted);
    }
    return stats.recentSessions;
  }, [stats.recentSessions, filterType]);

  // CSV 다운로드 핸들러
  const handleDownloadCsv = () => {
    const csvContent = learningSessionManager.exportLearningRecordsToCsv();
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `칼림바_학습기록_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // JSON 백업 다운로드
  const handleDownloadJson = () => {
    const jsonContent = learningSessionManager.exportLearningRecordsToJson();
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `칼림바_학습데이터_백업_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 전체 기록 초기화
  const handleClearRecords = () => {
    if (
      window.confirm(
        '정말 모든 연습 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며 대시보드 통계가 초기화됩니다.'
      )
    ) {
      learningSessionManager.clearAllLearningRecords();
      refreshStats();
    }
  };

  // 단일 기록 삭제
  const handleDeleteSession = (sessionId: string) => {
    if (window.confirm('선택한 연습 기록을 삭제하시겠습니까?')) {
      learningSessionManager.deleteSessionRecord(sessionId);
      refreshStats();
    }
  };

  // 최근 7일 막대 차트 최대 분(scale) 계산
  const maxBarMinutes = useMemo(() => {
    const max = Math.max(...stats.weeklyBarData.map((d) => d.durationMinutes), 10);
    return Math.ceil(max / 5) * 5; // 5분 단위 올림
  }, [stats.weeklyBarData]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn font-['Jua',sans-serif] select-none">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-[#181142] to-[#0c0827] border-2 border-indigo-400/50 rounded-3xl p-4 sm:p-7 shadow-[0_0_60px_rgba(99,102,241,0.35)] text-white flex flex-col max-h-[94vh] overflow-y-auto">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/70 hover:text-white transition cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 상단 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-2xl shadow-lg">
              📊
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow">
                  학부모 학습 대시보드
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400 text-indigo-200 text-[10px] font-bold">
                  보호자 전용
                </span>
              </div>
              <p className="text-xs text-indigo-200/70 font-sans">
                우리 아이의 실제 연습 시간, 완주 곡 수 및 꾸준한 학습 습관을 확인하세요.
              </p>
            </div>
          </div>

          <div className="text-xs text-white/50 font-sans sm:text-right">
            최근 연습: <strong className="text-cyan-300 font-mono">{stats.lastPracticedDateText}</strong>
          </div>
        </div>

        {/* 핵심 지표 요약 카드 4종 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mb-5">
          {/* 1. 오늘 연습 시간 */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
            <div className="flex items-center justify-between text-xs text-cyan-200/70">
              <span>오늘 연습</span>
              <Clock className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {stats.todayPracticeMinutes} <span className="text-xs font-normal text-white/60">분</span>
            </div>
            <div className="text-[10px] text-white/40 mt-0.5">
              순수 연주 {stats.todayPracticeSeconds}초
            </div>
          </div>

          {/* 2. 이번 주 연습 시간 */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
            <div className="flex items-center justify-between text-xs text-indigo-200/70">
              <span>이번 주 연습</span>
              <Calendar className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {stats.weekPracticeMinutes} <span className="text-xs font-normal text-white/60">분</span>
            </div>
            <div className="text-[10px] text-indigo-200/50 mt-0.5">
              7일 중 {stats.activeDaysLast7Days}일 출석
            </div>
          </div>

          {/* 3. 이번 달 연습 시간 */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
            <div className="flex items-center justify-between text-xs text-purple-200/70">
              <span>이번 달 연습</span>
              <BarChart3 className="w-4 h-4 text-purple-300" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {stats.monthPracticeMinutes} <span className="text-xs font-normal text-white/60">분</span>
            </div>
            <div className="text-[10px] text-purple-200/50 mt-0.5">
              누적 세션 {stats.totalSessions}회
            </div>
          </div>

          {/* 4. 완주한 곡 수 */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
            <div className="flex items-center justify-between text-xs text-emerald-200/70">
              <span>완주한 곡</span>
              <Trophy className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {stats.distinctCompletedSongsCount} <span className="text-xs font-normal text-white/60">곡</span>
            </div>
            <div className="text-[10px] text-emerald-200/50 mt-0.5">
              총 완주 {stats.totalCompletions}회 성공
            </div>
          </div>
        </div>

        {/* 주간 학습 그래프 (최근 7일 막대 차트) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-black/35 border border-white/10 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-cyan-200">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>최근 7일 연습 시간 추이 (분)</span>
            </div>
            <span className="text-xs text-white/40 font-sans">
              최대 {maxBarMinutes}분 기준
            </span>
          </div>

          {/* 막대 차트 바 영역 */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3 h-32 sm:h-36 items-end pt-3 pb-1 border-b border-white/10">
            {stats.weeklyBarData.map((d) => {
              const heightPercent = maxBarMinutes > 0 ? (d.durationMinutes / maxBarMinutes) * 100 : 0;
              return (
                <div key={d.date} className="flex flex-col items-center h-full justify-end group">
                  {/* 호버 시 툴팁 / 상단 분 표시 */}
                  <span className="text-[10px] font-mono text-cyan-200 mb-1 font-bold">
                    {d.durationMinutes > 0 ? `${d.durationMinutes}m` : '0'}
                  </span>

                  {/* 막대 바 */}
                  <div className="w-full max-w-[36px] bg-white/10 rounded-t-xl overflow-hidden h-full flex items-end">
                    <div
                      style={{ height: `${Math.max(d.durationMinutes > 0 ? 8 : 2, heightPercent)}%` }}
                      className={`w-full rounded-t-xl transition-all duration-500 ${
                        d.isToday
                          ? 'bg-gradient-to-t from-cyan-500 to-teal-300 shadow-[0_0_12px_rgba(34,211,238,0.6)]'
                          : d.durationMinutes > 0
                          ? 'bg-gradient-to-t from-indigo-500 to-indigo-300'
                          : 'bg-white/10'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* X축 요일 라벨 */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3 mt-2 text-center text-xs font-bold">
            {stats.weeklyBarData.map((d) => (
              <div
                key={d.date}
                className={`${d.isToday ? 'text-cyan-300 font-black' : 'text-white/60'}`}
              >
                <span>{d.dayLabel}</span>
                {d.isToday && <span className="block text-[9px] text-cyan-400">오늘</span>}
              </div>
            ))}
          </div>
        </div>

        {/* 탭 네비게이션: 최근 활동 기록 vs 곡별 통계 */}
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('ACTIVITY')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'ACTIVITY'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'bg-white/5 hover:bg-white/10 text-white/70'
              }`}
            >
              최근 연습 기록 ({filteredSessions.length})
            </button>
            <button
              onClick={() => setActiveTab('SONGS')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'SONGS'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'bg-white/5 hover:bg-white/10 text-white/70'
              }`}
            >
              곡별 학습 통계 ({stats.songSummaries.length})
            </button>
          </div>

          {activeTab === 'ACTIVITY' && (
            <div className="flex items-center space-x-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-white/40" />
              {(['ALL', 'COMPLETED', 'INCOMPLETE'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    filterType === t
                      ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {t === 'ALL' ? '전체' : t === 'COMPLETED' ? '완주곡' : '연습중'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 내용 영역 */}
        <div className="flex-1 overflow-y-auto max-h-56 mb-4 space-y-2 pr-1 font-sans">
          {activeTab === 'ACTIVITY' ? (
            filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-sm">
                아직 기록된 연습 세션이 없습니다. 칼림바를 연주하면 자동으로 기록됩니다.
              </div>
            ) : (
              filteredSessions.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs hover:bg-white/10 transition"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        s.isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                      }`}
                    >
                      {s.isCompleted ? '완주 🏆' : '연습'}
                    </span>
                    <div>
                      <div className="font-extrabold text-white text-sm">
                        {s.songTitle}
                      </div>
                      <div className="text-[11px] text-white/50 flex items-center space-x-2 mt-0.5">
                        <span>{s.difficulty}</span>
                        <span>•</span>
                        <span>{s.practiceDurationSec}초 연습</span>
                        <span>•</span>
                        <span>{new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-right">
                    {s.score !== undefined && (
                      <div>
                        <div className="text-cyan-300 font-mono font-bold">{s.score}점</div>
                        {s.accuracyPercent !== undefined && (
                          <div className="text-[10px] text-white/50">{s.accuracyPercent}% 정확도</div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      className="p-1 text-white/30 hover:text-rose-400 cursor-pointer transition"
                      title="이 기록 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            /* 곡별 학습 현황 통계 */
            stats.songSummaries.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-sm">
                아직 연습한 곡이 없습니다.
              </div>
            ) : (
              stats.songSummaries.map((ss) => (
                <div
                  key={ss.songId}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-extrabold text-white text-sm">{ss.songTitle}</div>
                    <div className="text-[11px] text-white/50 mt-0.5">
                      총 {Math.round(ss.totalPracticeSeconds / 60)}분 연주 • 완주 {ss.completionCount}회
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-cyan-300 font-bold">
                      {ss.practiceCount}회 연습
                    </span>
                    {ss.bestScore !== undefined && (
                      <div className="text-[10px] text-emerald-300">최고 {ss.bestScore}점</div>
                    )}
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* 데이터 관리 및 내보내기 툴바 */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={handleDownloadCsv}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
              title="CSV 스프레드시트 파일로 다운로드"
            >
              <Download className="w-3.5 h-3.5 text-cyan-300" />
              <span>CSV 내보내기</span>
            </button>
            <button
              onClick={handleDownloadJson}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
              title="JSON 백업 파일로 다운로드"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-300" />
              <span>JSON 백업</span>
            </button>
            <button
              onClick={handleClearRecords}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
              title="모든 연습 기록 초기화"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>기록 초기화</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs sm:text-sm transition cursor-pointer active:scale-95"
          >
            확인 및 닫기
          </button>
        </div>

        {/* 학부모용 해석 안내문 */}
        <div className="mt-4 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-200/80 font-sans leading-relaxed flex items-start space-x-2">
          <Info className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
          <span>
            학습 기록은 칼림바 연습 활동을 확인하기 위한 참고 자료입니다. 연습 시간이나 게임 점수만으로
            음악적 재능이나 학습 능력을 판단하지 마세요. 아이의 흥미와 꾸준한 도전을 함께 격려해 주세요.
          </span>
        </div>
      </div>
    </div>
  );
};
