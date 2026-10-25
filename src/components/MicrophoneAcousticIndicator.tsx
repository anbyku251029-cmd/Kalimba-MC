/**
 * Kalimba-MC STEP 03-B
 * 워터폴 게임 내 실물 칼림바 마이크 입력 상태 및 음정 인디케이터
 */

import React from 'react';
import { AcousticEvaluation } from '../types/acousticTypes';

interface MicrophoneAcousticIndicatorProps {
  evaluation: AcousticEvaluation | null;
  isListening: boolean;
  onToggleMic: () => void;
  targetPitch?: string | null;
}

export const MicrophoneAcousticIndicator: React.FC<MicrophoneAcousticIndicatorProps> = ({
  evaluation,
  isListening,
  onToggleMic,
  targetPitch,
}) => {
  const rating = evaluation?.rating ?? 'SILENCE';
  const detectedPitch = evaluation?.detectedPitch ?? '-';
  const cents = evaluation?.centsDeviation ?? 0;
  const volume = evaluation?.rmsVolume ?? 0;
  const feedback = evaluation?.feedbackMessage ?? '실물 칼림바를 연주해보세요!';

  // 센트 게이지 위치 계산 (-50 ~ +50 cents -> 0% ~ 100%)
  const clampedCents = Math.max(-50, Math.min(50, cents));
  const pointerPercent = ((clampedCents + 50) / 100) * 100;

  // 볼륨 바 퍼센트 (0.0 ~ 0.2 RMS 범위를 0 ~ 100%로 매핑)
  const volumePercent = Math.min(100, Math.round((volume / 0.15) * 100));

  // 판정 뱃지 색상
  let badgeColor = 'bg-slate-700 text-slate-300';
  let badgeText = '대기 중';
  if (rating === 'PERFECT') {
    badgeColor = 'bg-emerald-500 text-white animate-pulse';
    badgeText = 'PERFECT! ⭐';
  } else if (rating === 'GREAT') {
    badgeColor = 'bg-amber-500 text-white';
    badgeText = 'GREAT! 👍';
  } else if (rating === 'RETRY') {
    badgeColor = 'bg-rose-500 text-white';
    badgeText = '다시 해봐요 🎵';
  } else if (rating === 'WAITING') {
    badgeColor = 'bg-sky-500 text-white';
    badgeText = '듣는 중... 👂';
  }

  return (
    <div className="bg-slate-900/95 border border-indigo-500/40 rounded-2xl p-3 shadow-xl backdrop-blur-md text-white transition-all">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {isListening && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                isListening ? 'bg-emerald-500' : 'bg-slate-500'
              }`}
            ></span>
          </span>
          <span className="font-bold text-sm text-indigo-200">
            실물 칼림바 마이크 모드
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeColor}`}>
            {badgeText}
          </span>
        </div>

        <button
          onClick={onToggleMic}
          className={`text-xs font-bold px-3 py-1 rounded-xl transition-all shadow-md ${
            isListening
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isListening ? '마이크 끄기 🛑' : '마이크 켜기 🎤'}
        </button>
      </div>

      {isListening ? (
        <div className="space-y-2">
          {/* 음높이 및 타겟 비교 */}
          <div className="flex items-center justify-between bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-700">
            <div>
              <span className="text-xs text-slate-400 block">목표 음표</span>
              <span className="text-base font-extrabold text-amber-300">
                {targetPitch || '자유 연주'}
              </span>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-400 block">실제 감지된 음</span>
              <span className="text-lg font-black text-emerald-400 tracking-wider">
                {detectedPitch}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">센트 오차</span>
              <span className="text-sm font-bold text-sky-300">
                {evaluation?.centsDeviation !== null && evaluation?.centsDeviation !== undefined
                  ? `${evaluation.centsDeviation > 0 ? '+' : ''}${evaluation.centsDeviation}¢`
                  : '-'}
              </span>
            </div>
          </div>

          {/* 센트 튜닝 게이지 바 */}
          <div className="relative pt-1 pb-1">
            <div className="flex justify-between text-[10px] text-slate-400 px-1 mb-1">
              <span>-50¢ (낮음)</span>
              <span className="text-emerald-400 font-bold">정음 (0¢)</span>
              <span>+50¢ (높음)</span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700">
              {/* 완벽 판정 영역 (-35 ~ +35) */}
              <div
                className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/40"
                style={{ left: '15%', right: '15%' }}
              />
              {/* 중앙 정음 기준선 */}
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-emerald-400 -translate-x-1/2 z-10" />
              {/* 현재 음정 위치 포인터 */}
              {evaluation?.centsDeviation !== null && evaluation?.centsDeviation !== undefined && (
                <div
                  className="absolute top-0 bottom-0 w-2.5 bg-amber-400 rounded-full shadow-lg -translate-x-1/2 transition-all duration-100 z-20"
                  style={{ left: `${pointerPercent}%` }}
                />
              )}
            </div>
          </div>

          {/* 마이크 음량 볼륨 바 & 안내 문구 */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11px] text-slate-300 mb-0.5">
                <span>마이크 입력 세기</span>
                <span>{volumePercent}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-75"
                  style={{ width: `${volumePercent}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-indigo-200 font-medium truncate max-w-[200px]">
              {feedback}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/60 rounded-xl p-2.5 text-center text-xs text-slate-400">
          마이크 켜기 버튼을 누르면 실물 칼림바 소리를 듣고 자동으로 맞춰드려요! 🎶
        </div>
      )}
    </div>
  );
};
