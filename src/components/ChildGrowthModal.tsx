/**
 * ChildGrowthModal.tsx
 * Kalimba-MC STEP 02-E: 어린이용 칼림바 성장 기록 화면
 */

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Trophy, Clock, PlayCircle, Target, Heart } from 'lucide-react';
import { learningSessionManager } from '../utils/learningSessionManager';
import { ChildGrowthSummary } from '../types/learningRecordTypes';

interface ChildGrowthModalProps {
  onClose: () => void;
}

export const ChildGrowthModal: React.FC<ChildGrowthModalProps> = ({ onClose }) => {
  const [summary, setSummary] = useState<ChildGrowthSummary>(() =>
    learningSessionManager.getChildGrowthSummary()
  );
  const [selectedGoal, setSelectedGoal] = useState<number>(summary.dailyGoalMinutes);

  useEffect(() => {
    setSummary(learningSessionManager.getChildGrowthSummary());
  }, []);

  const handleChangeGoal = (mins: number) => {
    setSelectedGoal(mins);
    learningSessionManager.setDailyGoalMinutes(mins);
    setSummary(learningSessionManager.getChildGrowthSummary());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn font-['Jua',sans-serif] select-none">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-[#1c154a] to-[#0e092b] border-2 border-cyan-400/50 rounded-3xl p-5 sm:p-8 shadow-[0_0_50px_rgba(34,211,238,0.3)] text-white flex flex-col max-h-[92vh] overflow-y-auto">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/70 hover:text-white transition cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 상단 타이틀 */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-pink-500 flex items-center justify-center text-2xl shadow-lg">
            🌱
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow">
              나의 칼림바 성장 기록
            </h2>
            <p className="text-xs sm:text-sm text-cyan-200/70 font-sans">
              오늘 내가 연주한 예쁜 칼림바 소리를 확인해 봐요!
            </p>
          </div>
        </div>

        {/* 격려 메시지 카드 */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 border border-pink-400/40 mb-5 flex items-center space-x-3.5 shadow-inner">
          <span className="text-3xl sm:text-4xl animate-bounce">💖</span>
          <div>
            <div className="text-xs text-pink-300 font-bold">구구가가의 칭찬 한마디</div>
            <div className="text-sm sm:text-base font-extrabold text-white mt-0.5">
              {summary.encouragementMessage}
            </div>
          </div>
        </div>

        {/* 오늘의 연습 현황 카드 3종 */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 mb-5">
          {/* 오늘 연습 시간 */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
            <Clock className="w-5 h-5 text-cyan-300 mb-1" />
            <span className="text-[11px] text-cyan-200/70">오늘 연습</span>
            <div className="text-lg sm:text-2xl font-black text-white mt-0.5">
              {summary.todayMinutes > 0 ? (
                <>
                  {summary.todayMinutes}
                  <span className="text-xs font-normal text-white/70"> 분</span>
                </>
              ) : (
                <>
                  {summary.todaySeconds}
                  <span className="text-xs font-normal text-white/70"> 초</span>
                </>
              )}
            </div>
          </div>

          {/* 오늘 연습 횟수 */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
            <PlayCircle className="w-5 h-5 text-amber-300 mb-1" />
            <span className="text-[11px] text-amber-200/70">연습 횟수</span>
            <div className="text-lg sm:text-2xl font-black text-white mt-0.5">
              {summary.todaySessions}
              <span className="text-xs font-normal text-white/70"> 회</span>
            </div>
          </div>

          {/* 오늘 완주한 곡 */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
            <Trophy className="w-5 h-5 text-emerald-300 mb-1" />
            <span className="text-[11px] text-emerald-200/70">완주한 곡</span>
            <div className="text-lg sm:text-2xl font-black text-white mt-0.5">
              {summary.todayCompletedCount}
              <span className="text-xs font-normal text-white/70"> 곡</span>
            </div>
          </div>
        </div>

        {/* 오늘 목표 달성 게이지 */}
        <div className="p-4 rounded-2xl bg-black/30 border border-white/10 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-cyan-200">
              <Target className="w-4 h-4 text-cyan-400" />
              <span>오늘의 연습 목표 ({summary.dailyGoalMinutes}분)</span>
            </div>
            <span className="font-mono text-xs sm:text-sm font-black text-cyan-300">
              {summary.dailyGoalProgressPercent}%
            </span>
          </div>

          {/* 프로그레스 바 */}
          <div className="w-full h-3.5 rounded-full bg-white/10 overflow-hidden p-0.5">
            <div
              style={{ width: `${summary.dailyGoalProgressPercent}%` }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 shadow-[0_0_12px_rgba(34,211,238,0.7)] transition-all duration-500"
            />
          </div>

          {/* 목표 시간 변경 버튼 그룹 */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
            <span className="text-[11px] text-white/50">목표 시간 바꾸기:</span>
            <div className="flex items-center space-x-1.5">
              {[5, 10, 15, 20].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleChangeGoal(mins)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                    selectedGoal === mins
                      ? 'bg-cyan-500 text-cyan-950 font-black shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white/70'
                  }`}
                >
                  {mins}분
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 확인 완료 닫기 버튼 */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-black text-base shadow-lg transition cursor-pointer active:scale-95"
        >
          오늘도 신나게 연주하러 가기 🎵
        </button>
      </div>
    </div>
  );
};
