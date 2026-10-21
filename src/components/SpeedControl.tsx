import React from 'react';
import { Gauge, Info } from 'lucide-react';

interface SpeedControlProps {
  speedPercent: number; // 40 to 120
  onChangeSpeed: (speed: number) => void;
  baseBpm: number;
}

const PRESET_SPEEDS = [50, 60, 70, 80, 90, 100];

export const SpeedControl: React.FC<SpeedControlProps> = ({
  speedPercent,
  onChangeSpeed,
  baseBpm,
}) => {
  const effectiveBpm = Math.round((baseBpm * speedPercent) / 100);

  const getSpeedDescription = (pct: number) => {
    if (pct <= 50) return '아주 천천히 (기초 연습)';
    if (pct <= 70) return '조금 천천히 (따라하기 편함)';
    if (pct <= 90) return '자연스러운 보통 빠르기';
    if (pct === 100) return '원곡 기준 빠르기';
    return '신나고 빠른 빠르기';
  };

  return (
    <div className="bg-white/90 rounded-2xl p-3 sm:p-4 border border-amber-200/90 shadow-2xs">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center space-x-2">
          <Gauge className="w-4 h-4 text-emerald-700" />
          <span className="text-sm sm:text-base font-black text-amber-950">연주 속도 조절</span>
          <span className="text-xs text-stone-500 font-medium">
            (40% ~ 120%)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-base sm:text-lg font-black text-emerald-700 bg-emerald-50 border border-emerald-300 px-3 py-0.5 rounded-xl font-mono">
            {speedPercent}%
          </span>
          <span className="text-xs text-stone-500 font-bold hidden sm:inline">
            ({effectiveBpm} BPM / 기준 {baseBpm})
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="px-1 py-2">
        <input
          type="range"
          min="40"
          max="120"
          step="5"
          value={speedPercent}
          onChange={(e) => onChangeSpeed(Number(e.target.value))}
          className="w-full h-3 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-hidden"
          aria-label="연주 속도 슬라이더"
        />
        <div className="flex justify-between text-[11px] text-stone-400 font-bold px-1 mt-1">
          <span>40% (느림)</span>
          <span className="text-stone-600 font-semibold">{getSpeedDescription(speedPercent)}</span>
          <span>120% (빠름)</span>
        </div>
      </div>

      {/* Quick Select Buttons */}
      <div className="mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-1.5">
        <span className="text-xs font-bold text-stone-600 mr-1">빠른 선택:</span>
        <div className="flex flex-wrap gap-1.5 flex-1 justify-end">
          {PRESET_SPEEDS.map((preset) => {
            const isSelected = speedPercent === preset;
            return (
              <button
                key={preset}
                onClick={() => onChangeSpeed(preset)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs scale-105 ring-2 ring-emerald-300'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {preset}%
              </button>
            );
          })}
        </div>
      </div>

      {/* Pitch preservation guarantee callout */}
      <div className="mt-2 text-[11px] text-stone-500 bg-amber-50/70 p-2 rounded-xl border border-amber-200/70 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>음정 안심 안내:</strong> 속도를 50%나 70%로 줄여도 도·레·미 음 높이는 원래대로 정확하게 유지되며, 오직 박자 간격만 천천히 재생됩니다.
        </span>
      </div>
    </div>
  );
};
