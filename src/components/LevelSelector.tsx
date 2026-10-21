import React from 'react';
import { DifficultyLevel } from '../types/music';
import { SONGS_BY_LEVEL } from '../data/songs';

interface LevelSelectorProps {
  currentLevel: DifficultyLevel;
  onSelectLevel: (level: DifficultyLevel) => void;
  completedSongIds: string[];
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  currentLevel,
  onSelectLevel,
  completedSongIds,
}) => {
  const levels: {
    key: DifficultyLevel;
    title: string;
    icon: string;
    subtext: string;
    accentColor: string;
    activeBg: string;
    activeBorder: string;
  }[] = [
    {
      key: 'beginner',
      title: '초급 과정',
      icon: '🌱',
      subtext: '기초 음 익히기 & 쉬운 동요',
      accentColor: 'text-emerald-700',
      activeBg: 'bg-emerald-50 ring-2 ring-emerald-500 shadow-sm',
      activeBorder: 'border-emerald-500',
    },
    {
      key: 'intermediate',
      title: '중급 과정',
      icon: '🌿',
      subtext: '리듬 변화 & 옥타브 도약',
      accentColor: 'text-amber-800',
      activeBg: 'bg-amber-50 ring-2 ring-amber-500 shadow-sm',
      activeBorder: 'border-amber-500',
    },
    {
      key: 'advanced',
      title: '고급 과정',
      icon: '🌳',
      subtext: '풍성한 멜로디 & 명곡 연주',
      accentColor: 'text-indigo-800',
      activeBg: 'bg-indigo-50 ring-2 ring-indigo-500 shadow-sm',
      activeBorder: 'border-indigo-500',
    },
  ];

  return (
    <div className="bg-white/80 rounded-2xl p-2.5 sm:p-3 border border-amber-200/80 shadow-2xs">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {levels.map((lvl) => {
          const songs = SONGS_BY_LEVEL[lvl.key] || [];
          const completedCount = songs.filter((s) => completedSongIds.includes(s.id)).length;
          const isSelected = currentLevel === lvl.key;

          return (
            <button
              key={lvl.key}
              onClick={() => onSelectLevel(lvl.key)}
              className={`relative text-left p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? `${lvl.activeBg} ${lvl.activeBorder}`
                  : 'bg-stone-50/70 border-stone-200 hover:bg-amber-50/50 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xl sm:text-2xl">{lvl.icon}</span>
                <span
                  className={`text-[11px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    completedCount === songs.length && songs.length > 0
                      ? 'bg-amber-400 text-amber-950'
                      : isSelected
                      ? 'bg-white/90 text-stone-700 border border-stone-200'
                      : 'bg-stone-200/70 text-stone-600'
                  }`}
                >
                  ★ {completedCount}/{songs.length}
                </span>
              </div>
              <div>
                <h3 className={`font-black text-sm sm:text-base leading-tight ${isSelected ? lvl.accentColor : 'text-stone-800'}`}>
                  {lvl.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-stone-500 hidden sm:block mt-0.5 font-medium line-clamp-1">
                  {lvl.subtext}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
