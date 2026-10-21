import React from 'react';
import { KALIMBA_KEYS, KalimbaKeyDef } from '../constants/kalimbaKeys';
import { audioEngine } from '../utils/audioEngine';

interface VirtualKalimbaProps {
  activeTineIndex: number | null;
  onTineClick?: (pitch: string) => void;
  controls?: React.ReactNode;
}

export const VirtualKalimba: React.FC<VirtualKalimbaProps> = ({
  activeTineIndex,
  onTineClick,
  controls,
}) => {
  const handleKeyClick = (keyDef: KalimbaKeyDef) => {
    audioEngine.playNote(keyDef.pitch, 1, 80, 1.0);
    if (onTineClick) {
      onTineClick(keyDef.pitch);
    }
  };

  return (
    <div className="bg-linear-to-b from-amber-900 via-amber-800 to-amber-950 rounded-3xl p-3 sm:p-5 text-white shadow-xl border-4 border-amber-950/40 relative overflow-hidden">
      {/* Decorative Wood Texture & Rosette Sound Hole Accent */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      
      {/* Top Header of Kalimba */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-amber-700/50">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-xs sm:text-sm font-black text-amber-100 tracking-wide">
            실제 17키 칼림바 연주실 (C Major)
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-amber-200/80 font-medium">
          <span className="hidden sm:inline">건반을 직접 누르면 소리를 들어볼 수 있어요!</span>
          <span className="bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-700/60 font-bold text-amber-300">
            가운데 C4(1)가 가장 긴 건반
          </span>
        </div>
      </div>

      {/* Top Controls Area: Playback Controls & Speed Controls */}
      {controls && (
        <div className="relative z-10 mb-3.5 sm:mb-4">
          {controls}
        </div>
      )}

      {/* The Metal Tines Stage */}
      <div className="relative z-10 bg-amber-950/40 rounded-2xl p-2 sm:p-3 border border-amber-800/60">
        {/* Metal Bridge Bar */}
        <div className="h-2.5 sm:h-3 bg-linear-to-r from-stone-400 via-stone-200 to-stone-400 rounded-full shadow-inner mb-1" />

        {/* Tines Container (17 Keys) */}
        <div className="flex items-start justify-center gap-1 sm:gap-1.5 min-h-[160px] sm:min-h-[200px] pt-1">
          {KALIMBA_KEYS.map((k) => {
            const isActive = activeTineIndex === k.index;
            // Height calculation based on realistic kalimba shape: center longest (100%), outer shortest (~62%)
            const heightPercent = k.tineHeightPercent;

            return (
              <button
                key={k.index}
                onClick={() => handleKeyClick(k)}
                style={{ height: `${heightPercent * 1.8}px` }}
                className={`relative flex-1 max-w-[42px] rounded-b-xl border transition-all cursor-pointer flex flex-col justify-between items-center py-1 sm:py-2 select-none active:brightness-125 ${
                  isActive
                    ? 'bg-linear-to-b from-amber-300 via-amber-200 to-amber-100 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.9)] scale-y-105 z-20'
                    : 'bg-linear-to-b from-stone-300 via-stone-200 to-stone-400 hover:from-stone-200 hover:to-stone-300 border-stone-400 shadow-md'
                }`}
                title={`${k.pitch} (${k.solfege}) - ${k.hand === 'left' ? '왼손' : k.hand === 'right' ? '오른손' : '가운데'}`}
              >
                {/* Sticker Color Dot (just like physical kalimba guide stickers) */}
                <div className="w-full flex justify-center">
                  {k.colorTag === 'red' && (
                    <div className="w-1.5 h-3 sm:w-2 sm:h-4 bg-rose-500 rounded-xs shadow-xs" />
                  )}
                  {k.colorTag === 'green' && (
                    <div className="w-1.5 h-3 sm:w-2 sm:h-4 bg-emerald-500 rounded-xs shadow-xs" />
                  )}
                  {k.colorTag === 'default' && (
                    <div className="w-1.5 h-3 sm:w-2 sm:h-4 opacity-0" />
                  )}
                </div>

                {/* Hand Marker L/R */}
                <span className={`text-[8px] sm:text-[9px] font-bold ${isActive ? 'text-amber-900' : 'text-stone-500'}`}>
                  {k.hand === 'left' ? 'L' : k.hand === 'right' ? 'R' : 'C'}
                </span>

                {/* Number Notation (Hero label on bottom of tine) */}
                <div className="flex flex-col items-center">
                  <span
                    className={`font-mono font-black text-xs sm:text-base leading-tight ${
                      isActive ? 'text-amber-950 font-extrabold' : 'text-stone-800'
                    }`}
                  >
                    {k.numberNotation}
                  </span>
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold leading-none ${
                      isActive ? 'text-amber-900' : 'text-stone-600'
                    }`}
                  >
                    {k.solfege}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Hand Guide Legend Beneath Keys */}
        <div className="flex justify-between items-center px-4 pt-3 text-[11px] font-bold text-amber-200/90 border-t border-amber-800/40 mt-2">
          <span className="flex items-center gap-1">
            <span>👈</span> 왼손 엄지 연주 구역
          </span>
          <span className="text-amber-400 text-xs">★ C4(1) 중심 건반</span>
          <span className="flex items-center gap-1">
            오른손 엄지 연주 구역 <span>👉</span>
          </span>
        </div>
      </div>
    </div>
  );
};
