import React from 'react';
import { Clock, CheckCircle2, Music2, Star } from 'lucide-react';
import { Song } from '../types/music';

interface SongSelectorProps {
  songs: Song[];
  selectedSongId: string;
  onSelectSong: (song: Song) => void;
  completedSongIds: string[];
  songPlayCounts: Record<string, number>;
}

export const SongSelector: React.FC<SongSelectorProps> = ({
  songs,
  selectedSongId,
  onSelectSong,
  completedSongIds,
  songPlayCounts,
}) => {
  return (
    <div className="bg-white/80 rounded-2xl p-3 sm:p-4 border border-amber-200/80 shadow-2xs">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-2">
          <Music2 className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm sm:text-base font-black text-amber-950">연습할 곡을 골라보세요</h2>
        </div>
        <span className="text-xs text-stone-500 font-medium">총 {songs.length}곡</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {songs.map((song) => {
          const isSelected = song.id === selectedSongId;
          const isCompleted = completedSongIds.includes(song.id);
          const playCount = songPlayCounts[song.id] || 0;

          return (
            <button
              key={song.id}
              onClick={() => onSelectSong(song)}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-100/70 border-amber-500 ring-2 ring-amber-400 shadow-xs'
                  : 'bg-white hover:bg-amber-50/60 border-stone-200/90 hover:border-amber-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900 leading-snug">
                    {song.title}
                  </h3>
                  {isCompleted && (
                    <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-bold">
                      <Star className="w-3 h-3 fill-amber-950" />
                      완료
                    </span>
                  )}
                </div>

                {song.subTitle && (
                  <p className="text-xs text-stone-500 font-medium mb-1.5 line-clamp-1">
                    {song.subTitle}
                  </p>
                )}

                <div className="flex flex-wrap gap-1 mb-2">
                  {song.tags.slice(0, 2).map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-medium mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-stone-400" />
                  {song.estimatedMinutes}분 연습 ({song.notes.length}음)
                </span>
                {playCount > 0 && (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {playCount}회 완료
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
