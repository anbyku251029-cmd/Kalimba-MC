import React, { useMemo } from 'react';
import { CharacterState } from '../types/comboTypes';

interface GuguGagaReactionProps {
  state: CharacterState;
  combo: number;
  message?: string;
}

export const GuguGagaReaction: React.FC<GuguGagaReactionProps> = ({
  state,
  combo,
  message,
}) => {
  // 상태별 이모지 및 기본 대사
  const config = useMemo(() => {
    switch (state) {
      case 'happy':
        return {
          emoji: '🐰',
          name: '구구 아기토끼',
          bubble: message || '참 잘했어요! ✨',
          bgGradient: 'from-pink-500 to-rose-400',
          borderColor: 'border-pink-300',
          scaleClass: 'scale-110 -translate-y-1',
          accentColor: 'text-pink-200',
        };
      case 'combo':
        return {
          emoji: '🐻',
          name: '가가 아기곰',
          bubble: message || `${combo}연속 성공! 대단해요! 🚀`,
          bgGradient: 'from-amber-500 to-yellow-400',
          borderColor: 'border-amber-300',
          scaleClass: 'scale-115 -translate-y-2 rotate-2',
          accentColor: 'text-amber-200',
        };
      case 'encourage':
        return {
          emoji: '🐥',
          name: '삐삐 병아리',
          bubble: message || '괜찮아요! 다시 해봐요 💕',
          bgGradient: 'from-indigo-600 to-purple-500',
          borderColor: 'border-purple-300',
          scaleClass: 'scale-100',
          accentColor: 'text-purple-200',
        };
      case 'celebrate':
        return {
          emoji: '🎉',
          name: '구구가가 축하단',
          bubble: message || '와아! 멋지게 완주했어요! 🏆',
          bgGradient: 'from-emerald-500 to-teal-400',
          borderColor: 'border-emerald-300',
          scaleClass: 'scale-120 -translate-y-2 animate-bounce',
          accentColor: 'text-emerald-200',
        };
      case 'idle':
      default:
        return {
          emoji: '🐰',
          name: '구구',
          bubble: combo > 0 ? `${combo} 콤보 유지 중!` : '음악에 맞춰 튕겨봐요!',
          bgGradient: 'from-slate-800 to-indigo-900',
          borderColor: 'border-indigo-400/30',
          scaleClass: 'scale-100',
          accentColor: 'text-slate-300',
        };
    }
  }, [state, combo, message]);

  return (
    <div
      className="pointer-events-none select-none flex items-center space-x-2 transition-transform duration-200 ease-out z-20"
      aria-live="polite"
    >
      {/* 귀여운 말풍선 */}
      <div
        className={`px-3 py-1 rounded-2xl bg-black/60 backdrop-blur-md border ${config.borderColor} shadow-lg shadow-black/40 flex items-center space-x-1.5 transition-all duration-200 max-w-[200px] sm:max-w-[240px]`}
      >
        <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide truncate">
          {config.bubble}
        </span>
      </div>

      {/* 캐릭터 원형 아바타 */}
      <div
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-linear-to-tr ${config.bgGradient} border-2 ${config.borderColor} flex items-center justify-center shadow-lg transition-transform duration-200 ${config.scaleClass}`}
      >
        <span className="text-xl sm:text-2xl drop-shadow-md select-none" role="img" aria-label={config.name}>
          {config.emoji}
        </span>
      </div>
    </div>
  );
};
