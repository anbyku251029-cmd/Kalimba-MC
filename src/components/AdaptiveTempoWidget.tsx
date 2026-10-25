/**
 * Kalimba-MC STEP 03-C
 * 어린이 맞춤형 자동 템포 및 음표 대기 상태 UI 위젯
 */

import React from 'react';
import { TempoMode, WaitTimeoutMode, AdaptiveTempoState } from '../types/adaptiveTempoTypes';

interface AdaptiveTempoWidgetProps {
  tempoState: AdaptiveTempoState;
  onChangeMode: (mode: TempoMode) => void;
  onChangeWaitTimeoutMode: (waitMode: WaitTimeoutMode) => void;
  onManualSpeedChange: (speedPercent: number) => void;
  onSkipWaitingNote?: () => void;
  onResetOriginalSpeed: () => void;
}

export const AdaptiveTempoWidget: React.FC<AdaptiveTempoWidgetProps> = ({
  tempoState,
  onChangeMode,
  onChangeWaitTimeoutMode,
  onManualSpeedChange,
  onSkipWaitingNote,
  onResetOriginalSpeed,
}) => {
  const {
    mode,
    waitTimeoutMode,
    currentSpeedPercent,
    currentBpm,
    baseBpm,
    isWaitingForNote,
    feedbackMessage,
  } = tempoState;

  return (
    <div className="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-2.5 sm:p-3 text-white shadow-xl backdrop-blur-md">
      {/* 상단: 모드 선택 탭 & 현재 속도/BPM */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-purple-200">템포 모드</span>
          <div className="flex items-center p-0.5 rounded-full bg-slate-950/80 border border-purple-400/30">
            <button
              type="button"
              onClick={() => onChangeMode('original')}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                mode === 'original'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
              title="원곡 원래 속도로 고정 연주"
            >
              원곡 100%
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('relaxed')}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                mode === 'relaxed'
                  ? 'bg-amber-500 text-amber-950 font-black shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
              title="음표를 놓치면 기다려주는 느긋한 연습"
            >
              🐢 느긋한 연습
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('adaptive')}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                mode === 'adaptive'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black shadow-md'
                  : 'text-purple-300 hover:text-white'
              }`}
              title="아이의 연주에 맞춰 속도가 자동 조절되는 맞춤 모드"
            >
              ✨ 자동 맞춤
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('free')}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                mode === 'free'
                  ? 'bg-emerald-500 text-white font-black shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
              title="워터폴 진행 없이 자유롭게 건반 탐색"
            >
              🎹 자유 연주
            </button>
          </div>
        </div>

        {/* 현재 템포 및 원곡 BPM 비교 */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">
            원곡 BPM: <strong className="text-slate-200">{baseBpm}</strong>
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-purple-300">
            현재: <strong className="text-cyan-300 text-sm font-extrabold">{currentSpeedPercent}%</strong>
            <span className="text-slate-400 text-[11px] ml-1">({currentBpm} BPM)</span>
          </span>
        </div>
      </div>

      {/* 중단: 음표 대기 상태 & 어린이 격려 메시지 */}
      <div className="flex items-center justify-between gap-2 bg-slate-950/60 rounded-xl px-3 py-1.5 border border-slate-800">
        <div className="flex items-center gap-2 overflow-hidden">
          {isWaitingForNote ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500 text-slate-950 animate-pulse shrink-0">
              음표 대기 중 👂
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 shrink-0">
              연주 진행 중 🎵
            </span>
          )}
          <p className="text-xs text-indigo-200 font-medium truncate">
            {feedbackMessage}
          </p>
        </div>

        {/* 대기 중일 때 건너뛰기 버튼 */}
        {isWaitingForNote && onSkipWaitingNote && (
          <button
            type="button"
            onClick={onSkipWaitingNote}
            className="px-2.5 py-1 bg-amber-600/80 hover:bg-amber-500 text-white text-[11px] font-bold rounded-lg shadow-sm transition shrink-0 active:scale-95"
            title="현재 음표를 건너뛰고 다음 음표로 진행"
          >
            건너뛰기 ⏩
          </button>
        )}
      </div>

      {/* 하단: 수동 템포 미세 조정 & 대기 시간 옵션 */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1 text-[11px]">
        <div className="flex items-center gap-1">
          <span className="text-slate-400">수동 조절:</span>
          <button
            type="button"
            onClick={() => onManualSpeedChange(currentSpeedPercent - 5)}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-bold"
            title="속도 5% 느리게"
          >
            -5%
          </button>
          <button
            type="button"
            onClick={onResetOriginalSpeed}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-md font-bold"
            title="원곡 100% 속도로 복귀"
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => onManualSpeedChange(currentSpeedPercent + 5)}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-bold"
            title="속도 5% 빠르게"
          >
            +5%
          </button>
        </div>

        {/* 대기 시간 모드 설정 (느긋한 연습 또는 자동 맞춤 모드 시 표시) */}
        {(mode === 'relaxed' || mode === 'adaptive') && (
          <div className="flex items-center gap-1 text-slate-400">
            <span>대기 시간:</span>
            <select
              value={waitTimeoutMode}
              onChange={(e) => onChangeWaitTimeoutMode(e.target.value as WaitTimeoutMode)}
              className="bg-slate-800 text-slate-200 text-[11px] rounded px-1.5 py-0.5 border border-slate-700 focus:outline-hidden"
            >
              <option value="infinite">무제한 (기본)</option>
              <option value="comfortable">편안하게 (5초)</option>
              <option value="normal">보통 (3초)</option>
              <option value="short">짧게 (1.5초)</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
