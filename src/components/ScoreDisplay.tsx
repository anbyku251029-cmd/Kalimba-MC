import React, { useEffect, useRef } from 'react';
import { Hand, Sparkles } from 'lucide-react';
import { Song, KalimbaNote } from '../types/music';

interface ScoreDisplayProps {
  song: Song;
  currentNoteIndex: number;
  isPlaying: boolean;
  onSelectNoteIndex: (index: number) => void;
  onHearSingleNote: () => void;
}

const DURATION_LABELS: Record<number, { symbol: string; text: string }> = {
  0.25: { symbol: '𝅘𝅥𝅯', text: '16분음표 (1/4박)' },
  0.5: { symbol: '♪', text: '8분음표 (반 박)' },
  0.75: { symbol: '♪.', text: '점8분음표 (3/4박)' },
  1: { symbol: '♩', text: '4분음표 (1박)' },
  1.5: { symbol: '♩.', text: '점4분음표 (1.5박)' },
  2: { symbol: '𝅗𝅥', text: '2분음표 (2박)' },
  3: { symbol: '𝅗𝅥.', text: '점2분음표 (3박)' },
  4: { symbol: '𝅝', text: '온음표 (4박)' },
};

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  song,
  currentNoteIndex,
  isPlaying,
  onSelectNoteIndex,
  onHearSingleNote,
}) => {
  const ribbonRef = useRef<HTMLDivElement>(null);
  const currentNote: KalimbaNote | undefined = song.notes[currentNoteIndex];
  const prevNote: KalimbaNote | undefined = currentNoteIndex > 0 ? song.notes[currentNoteIndex - 1] : undefined;
  const nextNote: KalimbaNote | undefined = currentNoteIndex < song.notes.length - 1 ? song.notes[currentNoteIndex + 1] : undefined;

  // Auto-scroll ribbon to keep current note in center view
  useEffect(() => {
    if (!ribbonRef.current) return;
    const activeEl = ribbonRef.current.querySelector<HTMLElement>(`[data-note-index="${currentNoteIndex}"]`);
    if (activeEl) {
      const container = ribbonRef.current;
      const leftPos = activeEl.offsetLeft - container.offsetWidth / 2 + activeEl.offsetWidth / 2;
      container.scrollTo({
        left: leftPos,
        behavior: 'smooth',
      });
    }
  }, [currentNoteIndex]);

  const durationInfo = currentNote
    ? DURATION_LABELS[currentNote.duration] || { symbol: '♩', text: `${currentNote.duration}박` }
    : { symbol: '', text: '' };

  const getHandLabel = (note?: KalimbaNote) => {
    if (!note) return '';
    if (note.isRest) return '쉼표';
    if (note.hand === 'left') return '왼손 엄지 👈';
    if (note.hand === 'right') return '오른손 엄지 👉';
    return '가운데 건반 (왼/오 엄지 모두 가능) 👐';
  };

  const getOctaveDescription = (level?: 0 | 1 | 2) => {
    if (level === 1) return '높은 옥타브 (숫자 위에 점 1개 •)';
    if (level === 2) return '가장 높은 옥타브 (숫자 위에 점 2개 ••)';
    return '기본 옥타브 (점 없음)';
  };

  return (
    <div className="bg-amber-50/70 rounded-3xl p-3.5 sm:p-5 border-2 border-amber-300/80 shadow-md">
      {/* Song Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-amber-200/90">
        <div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full mr-2">
            {song.levelLabel}
          </span>
          <span className="text-sm font-black text-amber-950 sm:text-lg">
            {song.title}
          </span>
          <span className="text-xs text-stone-500 ml-2 font-medium">
            (박자표 {song.timeSignature} · 기본 템포 {song.tempoBpm} BPM)
          </span>
        </div>
        <div className="text-xs font-bold text-stone-600 bg-white/90 px-3 py-1 rounded-xl border border-stone-200">
          음표 {currentNoteIndex + 1} / {song.notes.length}
        </div>
      </div>

      {/* Main Focus Highlight Area: Previous / Current / Next */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
        {/* Previous Note Glance */}
        <div className="md:col-span-3 bg-white/80 rounded-2xl p-2.5 sm:p-3 border border-stone-200 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">
            이전 연주 음
          </span>
          {prevNote ? (
            <div className="flex items-center space-x-3 my-1">
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex flex-col items-center justify-center border border-stone-200">
                <span className="text-lg font-black text-stone-600 leading-none">
                  {prevNote.numberNotation}
                </span>
                <span className="text-[10px] font-bold text-stone-400">
                  {prevNote.solfege}
                </span>
              </div>
              <div className="text-xs text-stone-600">
                <p className="font-bold text-stone-800">{prevNote.pitch}</p>
                <p className="text-[11px] text-stone-500">{prevNote.hand === 'left' ? '왼손' : prevNote.hand === 'right' ? '오른손' : '가운데'}</p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-stone-400 py-3 text-center font-medium">곡의 시작점입니다</div>
          )}
          <span className="text-[10px] text-stone-400 text-right">곡 처음 쪽</span>
        </div>

        {/* Current Active Note (Giant Hero Display) */}
        <div
          onClick={onHearSingleNote}
          className={`md:col-span-6 rounded-2xl p-3.5 sm:p-4 border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-center text-center ${
            isPlaying
              ? 'bg-linear-to-b from-amber-100 to-amber-200/90 border-amber-500 shadow-lg ring-4 ring-amber-300/60'
              : 'bg-white border-amber-400/90 shadow-md hover:bg-amber-50/60'
          }`}
          title="클릭하면 이 음 소리를 바로 들어볼 수 있어요!"
        >
          {/* Hand Guidance Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs mb-2 bg-emerald-600 text-white">
            <Hand className="w-3.5 h-3.5" />
            <span>{getHandLabel(currentNote)}</span>
          </div>

          {currentNote ? (
            <div className="flex flex-col items-center my-1">
              {/* Number notation + Solfege */}
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-black text-amber-950 font-mono tracking-tighter drop-shadow-xs">
                  {currentNote.numberNotation}
                </span>
                <span className="text-3xl sm:text-4xl font-black text-emerald-800">
                  {currentNote.solfege}
                </span>
              </div>

              {/* Pitch & Octave */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-300">
                  건반: {currentNote.pitch}
                </span>
                <span className="text-xs sm:text-sm font-medium text-stone-600">
                  {getOctaveDescription(currentNote.octaveLevel)}
                </span>
              </div>

              {/* Beat / Duration & Lyric */}
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs font-bold text-amber-900 bg-amber-200/90 px-2.5 py-1 rounded-lg">
                  {durationInfo.symbol} {durationInfo.text}
                </span>
                {currentNote.lyric && (
                  <span className="text-sm sm:text-base font-extrabold text-stone-800 px-3 py-0.5 rounded-lg bg-white/90 border border-stone-200">
                    가사: &ldquo;{currentNote.lyric}&rdquo;
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-stone-400 font-bold py-4">음표를 선택해 주세요</div>
          )}

          <div className="text-[11px] text-stone-500 font-medium mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>이 박스를 누르면 이 음만 바로 소리나요</span>
          </div>
        </div>

        {/* Next Note Glance */}
        <div className="md:col-span-3 bg-white/80 rounded-2xl p-2.5 sm:p-3 border border-stone-200 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">
            다음에 연주할 음
          </span>
          {nextNote ? (
            <div className="flex items-center space-x-3 my-1">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex flex-col items-center justify-center border border-emerald-200">
                <span className="text-lg font-black text-emerald-700 leading-none">
                  {nextNote.numberNotation}
                </span>
                <span className="text-[10px] font-bold text-emerald-600">
                  {nextNote.solfege}
                </span>
              </div>
              <div className="text-xs text-stone-600">
                <p className="font-bold text-stone-800">{nextNote.pitch}</p>
                <p className="text-[11px] text-stone-500">{nextNote.hand === 'left' ? '왼손' : nextNote.hand === 'right' ? '오른손' : '가운데'}</p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-600 py-3 text-center font-bold">곡의 마지막 음입니다! 🎉</div>
          )}
          <span className="text-[10px] text-stone-400 text-right">미리 손가락 준비</span>
        </div>
      </div>

      {/* Horizontal Note Ribbon (All notes sequentially, clickable) */}
      <div className="bg-white/90 rounded-2xl p-2.5 border border-amber-200 shadow-inner">
        <div className="flex items-center justify-between text-xs text-stone-500 font-bold mb-1.5 px-1">
          <span>전체 숫자 악보 (누르면 해당 음표로 즉시 이동)</span>
          <span>총 {song.notes.length}음</span>
        </div>

        <div
          ref={ribbonRef}
          className="flex space-x-1.5 overflow-x-auto py-2 px-1 scroll-smooth no-scrollbar"
          style={{ scrollSnapType: 'x proximity' }}
        >
          {song.notes.map((note, idx) => {
            const isActive = idx === currentNoteIndex;
            const isPast = idx < currentNoteIndex;

            return (
              <button
                key={note.id || idx}
                data-note-index={idx}
                onClick={() => onSelectNoteIndex(idx)}
                className={`shrink-0 flex flex-col items-center justify-between p-2 rounded-xl border transition-all cursor-pointer min-w-[54px] sm:min-w-[62px] ${
                  isActive
                    ? 'bg-amber-400 border-amber-600 text-amber-950 font-black shadow-md scale-105 ring-2 ring-amber-300'
                    : isPast
                    ? 'bg-stone-100/90 border-stone-200 text-stone-400'
                    : 'bg-white hover:bg-amber-50 border-stone-300/80 text-stone-800'
                }`}
              >
                {/* Note Number */}
                <span className="text-base sm:text-lg font-black font-mono leading-none">
                  {note.numberNotation}
                </span>

                {/* Solfege name */}
                <span className={`text-[11px] font-bold ${isActive ? 'text-amber-950' : 'text-stone-600'}`}>
                  {note.solfege}
                </span>

                {/* Hand Tag */}
                <span
                  className={`text-[9px] font-bold px-1 rounded-sm mt-1 ${
                    note.hand === 'left'
                      ? 'bg-blue-100 text-blue-700'
                      : note.hand === 'right'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {note.hand === 'left' ? 'L' : note.hand === 'right' ? 'R' : 'C'}
                </span>

                {/* Lyric if present */}
                {note.lyric && (
                  <span className="text-[10px] text-stone-500 font-medium truncate max-w-[50px] mt-0.5">
                    {note.lyric}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
