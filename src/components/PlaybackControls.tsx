import React from 'react';
import { Play, Pause, RotateCcw, Volume2, Repeat, Timer, ChevronLeft, ChevronRight } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  isLooping: boolean;
  isMetronomeOn: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onHearSingleNote: () => void;
  onPrevNote: () => void;
  onNextNote: () => void;
  onToggleLoop: () => void;
  onToggleMetronome: () => void;
  disablePrev: boolean;
  disableNext: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  isLooping,
  isMetronomeOn,
  onTogglePlay,
  onRestart,
  onHearSingleNote,
  onPrevNote,
  onNextNote,
  onToggleLoop,
  onToggleMetronome,
  disablePrev,
  disableNext,
}) => {
  return (
    <div className="bg-white/90 rounded-2xl p-3 sm:p-4 border border-amber-200/90 shadow-2xs">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {/* Step Prev Note */}
        <button
          onClick={onPrevNote}
          disabled={disablePrev}
          className="px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none text-stone-700 font-bold text-xs sm:text-sm flex items-center space-x-1 cursor-pointer transition active:scale-95"
          title="이전 음표로 이동"
          aria-label="이전 음표"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">이전 음</span>
        </button>

        {/* Restart from beginning */}
        <button
          onClick={onRestart}
          className="px-3 sm:px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 font-bold text-xs sm:text-sm flex items-center space-x-1.5 cursor-pointer transition shadow-2xs"
          title="처음부터 다시 연주하기"
          aria-label="처음부터 재생"
        >
          <RotateCcw className="w-4 h-4 text-stone-700" />
          <span>처음부터</span>
        </button>

        {/* MAIN PLAY / PAUSE BUTTON */}
        <button
          onClick={onTogglePlay}
          className={`px-5 sm:px-7 py-2.5 sm:py-3 rounded-2xl font-black text-sm sm:text-base flex items-center space-x-2 cursor-pointer transition shadow-md active:scale-95 ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-600 text-amber-950 ring-4 ring-amber-300/60'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-300/40'
          }`}
          aria-label={isPlaying ? '일시정지' : '재생'}
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5 fill-current" />
              <span>일시정지</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current ml-0.5" />
              <span>재생하기</span>
            </>
          )}
        </button>

        {/* Step Next Note */}
        <button
          onClick={onNextNote}
          disabled={disableNext}
          className="px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none text-stone-700 font-bold text-xs sm:text-sm flex items-center space-x-1 cursor-pointer transition active:scale-95"
          title="다음 음표로 이동"
          aria-label="다음 음표"
        >
          <span className="hidden sm:inline">다음 음</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Hear Single Note (한 음 듣기) */}
        <button
          onClick={onHearSingleNote}
          className="px-3 sm:px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100/80 active:scale-95 text-amber-900 font-bold text-xs sm:text-sm flex items-center space-x-1.5 cursor-pointer transition shadow-2xs"
          title="현재 선택된 한 음만 소리내어 들어봅니다"
          aria-label="한 음 듣기"
        >
          <Volume2 className="w-4 h-4 text-amber-700" />
          <span>한 음 듣기</span>
        </button>

        {/* Repeat Toggle (반복 재생) */}
        <button
          onClick={onToggleLoop}
          className={`px-3 py-2.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center space-x-1.5 cursor-pointer transition active:scale-95 ${
            isLooping
              ? 'bg-emerald-100 border-emerald-400 text-emerald-900 ring-2 ring-emerald-300'
              : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
          }`}
          title="곡이 끝나면 처음부터 자동으로 다시 반복합니다"
          aria-label="반복 재생"
        >
          <Repeat className={`w-4 h-4 ${isLooping ? 'text-emerald-700' : 'text-stone-400'}`} />
          <span>반복 {isLooping ? '켜짐' : '꺼짐'}</span>
        </button>

        {/* Metronome Beat Count Toggle (박자 카운트) */}
        <button
          onClick={onToggleMetronome}
          className={`px-3 py-2.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center space-x-1.5 cursor-pointer transition active:scale-95 ${
            isMetronomeOn
              ? 'bg-indigo-100 border-indigo-400 text-indigo-900 ring-2 ring-indigo-300'
              : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
          }`}
          title="박자에 맞춰 메트로놈 똑딱 소리를 함께 냅니다"
          aria-label="박자 카운트"
        >
          <Timer className={`w-4 h-4 ${isMetronomeOn ? 'text-indigo-700' : 'text-stone-400'}`} />
          <span>박자 소리 {isMetronomeOn ? '켜짐' : '꺼짐'}</span>
        </button>
      </div>
    </div>
  );
};
