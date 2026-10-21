import React from 'react';
import { Sparkles, BookOpen, Music, Award } from 'lucide-react';
import { DifficultyLevel } from '../types/music';

interface HeaderProps {
  currentLevel: DifficultyLevel;
  totalCompleted: number;
  totalPractices: number;
  onOpenGuide: () => void;
}

const LEVEL_LABELS: Record<DifficultyLevel, { name: string; color: string; icon: string }> = {
  beginner: { name: '초급 과정', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: '🌱' },
  intermediate: { name: '중급 과정', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: '🌿' },
  advanced: { name: '고급 과정', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: '🌳' },
  hymn: { name: '찬송가', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '✝️' },
};

export const Header: React.FC<HeaderProps> = ({
  currentLevel,
  totalCompleted,
  totalPractices,
  onOpenGuide,
}) => {
  const levelInfo = LEVEL_LABELS[currentLevel];

  return (
    <header className="bg-amber-50/90 border-b border-amber-200/80 shadow-xs backdrop-blur-xs sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 sm:w-13 sm:h-13 bg-linear-to-br from-emerald-500 to-teal-700 rounded-2xl flex items-center justify-center text-white shadow-md shadow-emerald-700/20 ring-2 ring-emerald-200">
              <Music className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight flex items-center gap-1.5 font-sans">
                  우리 아이 칼림바 음악 교실
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
                  17키 C조
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 font-medium flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>오늘의 연습 목표: 매일 한 곡씩 실제 칼림바로 따라 연주하기</span>
              </p>
            </div>
          </div>

          {/* Stats & Guide Button */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Level badge */}
            <div className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-2xs ${levelInfo.color}`}>
              <span>{levelInfo.icon}</span>
              <span>{levelInfo.name}</span>
            </div>

            {/* Stars Count */}
            <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-amber-300 bg-amber-100/90 text-amber-900 text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-2xs" title="곡 완료 별 개수">
              <Award className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span>★ {totalCompleted}곡 완료</span>
              <span className="hidden md:inline text-amber-700/70 font-normal">({totalPractices}회 연습)</span>
            </div>

            {/* Guide Button */}
            <button
              onClick={onOpenGuide}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100/60 active:scale-95 text-stone-700 hover:text-amber-900 border border-stone-300 hover:border-amber-400 text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
              aria-label="칼림바 연주 가이드 열기"
            >
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">초보 가이드</span>
              <span className="sm:hidden">가이드</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
