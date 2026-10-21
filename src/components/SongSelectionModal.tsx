import React from 'react';
import { X, Play, Music, Sparkles, Check } from 'lucide-react';
import { Song } from '../types/music';
import { SONGS_DATA } from '../data/songs';

interface SongSelectionModalProps {
  currentSongId: string;
  currentDifficulty: string; // '보통' | '쉬움' | '어려움'
  onSelectSong: (song: Song, difficulty: string) => void;
  onSelectDifficulty: (difficulty: string) => void;
  onClose: () => void;
  completedSongIds: string[];
}

export const SongSelectionModal: React.FC<SongSelectionModalProps> = ({
  currentSongId,
  currentDifficulty,
  onSelectSong,
  onSelectDifficulty,
  onClose,
  completedSongIds,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = React.useState(currentDifficulty || '보통');

  const difficulties = [
    {
      label: '쉬움',
      speed: '70%',
      desc: '느린 속도 & 여유로운 타건',
      color: 'from-emerald-500 to-teal-600',
      activeBorder: 'border-emerald-300 shadow-[0_0_15px_#10b981]',
    },
    {
      label: '보통',
      speed: '100%',
      desc: '표준 템포 & 자연스러운 리듬',
      color: 'from-cyan-500 to-blue-600',
      activeBorder: 'border-cyan-300 shadow-[0_0_15px_#06b6d4]',
    },
    {
      label: '어려움',
      speed: '130%',
      desc: '빠른 속도 & 순발력 도전',
      color: 'from-purple-500 to-indigo-600',
      activeBorder: 'border-purple-300 shadow-[0_0_15px_#a855f7]',
    },
  ];

  const handleDifficultyClick = (label: string) => {
    setSelectedDifficulty(label);
    onSelectDifficulty(label);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#120f38] border-2 border-cyan-400/50 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl text-white relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center space-x-2 mb-1">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            곡 및 난이도 선택
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-cyan-200/70 mb-4">
          원하는 난이도(쉬움·보통·어려움)와 동요를 선택하고 연습을 시작해 보세요!
        </p>

        {/* Difficulty Selector (쉬움, 보통, 어려움) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-cyan-300 font-bold">
              난이도 선택 (현재: <strong className="text-white underline">{selectedDifficulty}</strong>)
            </span>
            <span className="text-[11px] text-cyan-200/60">
              클릭 시 즉시 속도와 난이도가 적용됩니다
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {difficulties.map((diff) => {
              const isSelected = selectedDifficulty === diff.label;
              return (
                <button
                  key={diff.label}
                  onClick={() => handleDifficultyClick(diff.label)}
                  className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center relative active:scale-95 ${
                    isSelected
                      ? `bg-linear-to-r ${diff.color} ${diff.activeBorder} scale-102 ring-2 ring-white/50`
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-stone-300'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <span className="text-base font-bold text-white">{diff.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-bold text-cyan-100">속도 {diff.speed}</span>
                  <span className="text-[10px] text-white/75 line-clamp-1 mt-0.5">{diff.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Song List */}
        <div className="text-xs text-cyan-300 font-bold mb-2">연습곡 선택</div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
          {SONGS_DATA.map((song) => {
            const isSelected = song.id === currentSongId;
            const isCompleted = completedSongIds.includes(song.id);

            return (
              <div
                key={song.id}
                onClick={() => {
                  onSelectSong(song, selectedDifficulty);
                  onClose();
                }}
                className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                  isSelected
                    ? 'bg-linear-to-r from-sky-600/50 to-cyan-500/30 border-cyan-400 shadow-md ring-2 ring-cyan-400/40'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-400/30'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm sm:text-base text-white">
                        {song.title}
                      </h3>
                      {isCompleted && (
                        <span className="text-[10px] bg-amber-400/90 text-amber-950 font-bold px-1.5 py-0.2 rounded-full">
                          ★ 완료
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cyan-200/60 font-normal">
                      {song.subTitle || song.description} · 총 {song.notes.length}음
                    </p>
                  </div>
                </div>

                <button
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1 shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>연습하기</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom Action */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-cyan-200/70">
            현재 선택: <strong className="text-cyan-300">{selectedDifficulty}</strong> 모드
          </span>
          <button
            onClick={() => {
              onSelectDifficulty(selectedDifficulty);
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition cursor-pointer shadow-md"
          >
            {selectedDifficulty} 모드로 계속하기
          </button>
        </div>
      </div>
    </div>
  );
};
