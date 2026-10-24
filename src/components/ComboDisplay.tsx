import React, { useEffect, useState } from 'react';
import { HitRating } from '../types/comboTypes';

interface ComboDisplayProps {
  combo: number;
  lastRating: HitRating;
  ratingTrigger: number; // 판정 갱신 트리거 카운터
}

export const ComboDisplay: React.FC<ComboDisplayProps> = ({
  combo,
  lastRating,
  ratingTrigger,
}) => {
  const [showRatingAnim, setShowRatingAnim] = useState<boolean>(false);
  const [showMilestoneSparkle, setShowMilestoneSparkle] = useState<boolean>(false);

  useEffect(() => {
    if (ratingTrigger === 0 || lastRating === 'NONE') return;

    setShowRatingAnim(true);
    const timer = setTimeout(() => setShowRatingAnim(false), 500);

    // 5, 10, 15, 20... 마일스톤 달성 시 별가루 파티클 활성화
    if (combo > 0 && combo % 5 === 0) {
      setShowMilestoneSparkle(true);
      const sparkleTimer = setTimeout(() => setShowMilestoneSparkle(false), 800);
      return () => {
        clearTimeout(timer);
        clearTimeout(sparkleTimer);
      };
    }

    return () => clearTimeout(timer);
  }, [ratingTrigger, lastRating, combo]);

  if (combo < 2 && (!showRatingAnim || lastRating === 'NONE')) {
    return null;
  }

  const isPerfect = lastRating === 'PERFECT';
  const isGreat = lastRating === 'GREAT';
  const isMiss = lastRating === 'MISS';

  return (
    <div className="pointer-events-none select-none absolute left-1/2 -translate-x-1/2 top-[44%] z-30 flex flex-col items-center">
      {/* 1. 판정 텍스트 (PERFECT! / GREAT! / MISS) */}
      {showRatingAnim && lastRating !== 'NONE' && (
        <div
          className={`text-lg sm:text-2xl font-black tracking-wider drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-all transform duration-150 ${
            isPerfect
              ? 'text-amber-300 scale-110 drop-shadow-[0_0_12px_#facc15]'
              : isGreat
              ? 'text-cyan-300 scale-105 drop-shadow-[0_0_10px_#22d3ee]'
              : isMiss
              ? 'text-rose-400 scale-95 opacity-80'
              : ''
          }`}
        >
          {isPerfect && '⭐ PERFECT! ⭐'}
          {isGreat && '👍 GREAT!'}
          {isMiss && '💧 MISS'}
        </div>
      )}

      {/* 2. 콤보 카운터 (2콤보 이상 시 표시) */}
      {combo >= 2 && (
        <div className="flex flex-col items-center mt-1 animate-in zoom-in-75 duration-100">
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-linear-to-b from-yellow-200 via-amber-400 to-orange-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]">
              {combo}
            </span>
            <span className="text-xs sm:text-base font-extrabold text-amber-200 tracking-wider">
              COMBO!
            </span>
          </div>

          {/* 5단위 마일스톤 반짝임 이펙트 */}
          {showMilestoneSparkle && (
            <div className="text-xs sm:text-sm font-black text-yellow-300 animate-pulse mt-0.5 drop-shadow-md">
              ✨ 대단해요! 연속 성공! ✨
            </div>
          )}
        </div>
      )}
    </div>
  );
};
