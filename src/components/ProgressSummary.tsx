import React from 'react';
import { Award, CheckCircle2, Flame, Music } from 'lucide-react';
import { Song } from '../types/music';

interface ProgressSummaryProps {
  song: Song;
  currentNoteIndex: number;
  totalNotes: number;
  isSongCompleted: boolean;
  songPlayCount: number;
  totalPracticeCount: number;
}

export const ProgressSummary: React.FC<ProgressSummaryProps> = ({
  song,
  currentNoteIndex,
  totalNotes,
  isSongCompleted,
  songPlayCount,
  totalPracticeCount,
}) => {
  const percent = totalNotes > 0 ? Math.round(((currentNoteIndex + 1) / totalNotes) * 100) : 0;

  return (
    <div className="bg-white/90 rounded-2xl p-3 sm:p-4 border border-amber-200/90 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center space-x-2">
          <Music className="w-4 h-4 text-emerald-700" />
          <h3 className="text-xs sm:text-sm font-black text-amber-950">
            현재 연습 진행도 ({song.title})
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-xs font-bold">
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            {currentNoteIndex + 1} / {totalNotes} 음표 ({percent}%)
          </span>
          {isSongCompleted && (
            <span className="inline-flex items-center gap-1 text-amber-900 bg-amber-300 px-2 py-0.5 rounded-md font-bold">
              <Award className="w-3.5 h-3.5 fill-amber-900" />
              완주 획득
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-stone-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-stone-200">
        <div
          className="bg-linear-to-r from-emerald-500 via-teal-500 to-amber-500 h-full rounded-full transition-all duration-200 shadow-inner"
          style={{ width: `${Math.min(100, Math.max(3, percent))}%` }}
        />
      </div>

      {/* Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-stone-100 text-xs">
        <div className="flex items-center space-x-2 p-1.5 rounded-xl bg-stone-50 border border-stone-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="truncate">
            <p className="text-[10px] text-stone-400 font-bold">이 곡 완료 횟수</p>
            <p className="font-black text-stone-800">{songPlayCount}회 완주</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 p-1.5 rounded-xl bg-stone-50 border border-stone-150">
          <Flame className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="truncate">
            <p className="text-[10px] text-stone-400 font-bold">누적 연습 횟수</p>
            <p className="font-black text-stone-800">{totalPracticeCount}회 연습</p>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 flex items-center space-x-2 p-1.5 rounded-xl bg-amber-50/70 border border-amber-200">
          <Award className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="truncate">
            <p className="text-[10px] text-amber-800 font-bold">칼림바 추천 손</p>
            <p className="font-bold text-amber-950 text-[11px] truncate">
              {song.recommendedHandHint || '양손 엄지 균형'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
