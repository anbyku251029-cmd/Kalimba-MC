/**
 * Kalimba-MC STEP 03-B
 * 실물 칼림바 마이크 튜너 및 진단 모달
 */

import React, { useState, useEffect, useRef } from 'react';
import { KALIMBA_KEYS, KalimbaKeyDef } from '../constants/kalimbaKeys';
import { AcousticKalimbaJudge } from '../utils/acousticKalimbaJudge';
import { AcousticEvaluation } from '../types/acousticTypes';

interface MicrophoneTunerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MicrophoneTunerModal: React.FC<MicrophoneTunerModalProps> = ({ isOpen, onClose }) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<AcousticEvaluation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<KalimbaKeyDef | null>(null);

  const judgeRef = useRef<AcousticKalimbaJudge | null>(null);

  useEffect(() => {
    judgeRef.current = new AcousticKalimbaJudge({
      perfectCentsTolerance: 30,
      greatCentsTolerance: 60,
      cooldownMs: 250,
    });

    judgeRef.current.onEvaluationChange = (evalResult) => {
      setEvaluation(evalResult);
    };

    return () => {
      judgeRef.current?.stop();
      judgeRef.current = null;
    };
  }, []);

  // 모달이 닫히면 마이크 중지
  useEffect(() => {
    if (!isOpen && isListening) {
      handleStop();
    }
  }, [isOpen]);

  // 목표 건반 변경 시
  useEffect(() => {
    if (judgeRef.current) {
      if (selectedKey) {
        judgeRef.current.setTargetNote({ pitch: selectedKey.pitch, keyIndex: selectedKey.index });
      } else {
        judgeRef.current.setTargetNote(null);
      }
    }
  }, [selectedKey]);

  const handleStart = async () => {
    setErrorMessage(null);
    if (!judgeRef.current) return;

    const ok = await judgeRef.current.start((err) => {
      setErrorMessage(err);
      setIsListening(false);
    });

    if (ok) {
      setIsListening(true);
    }
  };

  const handleStop = () => {
    judgeRef.current?.stop();
    setIsListening(false);
    setEvaluation(null);
  };

  if (!isOpen) return null;

  const detectedPitch = evaluation?.detectedPitch ?? '-';
  const detectedFreq = evaluation?.detectedFrequency ? `${Math.round(evaluation.detectedFrequency * 10) / 10} Hz` : '-';
  const cents = evaluation?.centsDeviation ?? 0;
  const clampedCents = Math.max(-50, Math.min(50, cents));
  const pointerPercent = ((clampedCents + 50) / 100) * 100;
  const rating = evaluation?.rating ?? 'SILENCE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎤</span>
            <div>
              <h2 className="text-xl font-extrabold text-indigo-300">
                실물 칼림바 마이크 튜너 & 진단기
              </h2>
              <p className="text-xs text-slate-400">
                진짜 칼림바 소리를 들려주면 음높이와 조율 상태를 진단해 줍니다.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleStop();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 text-lg"
          >
            ✕
          </button>
        </div>

        {/* 에러 메시지 알림 */}
        {errorMessage && (
          <div className="mb-4 bg-rose-900/60 border border-rose-500 text-rose-200 text-xs p-3 rounded-2xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 메인 튜너 패널 */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 mb-5 text-center">
          <div className="flex justify-center mb-3">
            <button
              onClick={isListening ? handleStop : handleStart}
              className={`px-6 py-2.5 rounded-2xl font-black text-sm shadow-lg transition-transform active:scale-95 flex items-center gap-2 ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
              }`}
            >
              <span>{isListening ? '⏹️ 마이크 측정 중지' : '🎙️ 마이크 측정 시작'}</span>
            </button>
          </div>

          {isListening ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-6">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">감지된 음</span>
                  <div className="text-4xl font-black text-emerald-400">
                    {detectedPitch}
                  </div>
                </div>
                <div className="w-px h-12 bg-slate-700" />
                <div>
                  <span className="text-xs text-slate-400 block mb-1">주파수</span>
                  <div className="text-2xl font-bold text-sky-300">
                    {detectedFreq}
                  </div>
                </div>
                <div className="w-px h-12 bg-slate-700" />
                <div>
                  <span className="text-xs text-slate-400 block mb-1">상태</span>
                  <div
                    className={`text-sm font-extrabold px-3 py-1 rounded-xl ${
                      rating === 'PERFECT'
                        ? 'bg-emerald-500 text-white'
                        : rating === 'GREAT'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {rating}
                  </div>
                </div>
              </div>

              {/* 튜너 게이지 */}
              <div className="max-w-md mx-auto pt-2">
                <div className="flex justify-between text-xs text-slate-400 px-1 mb-1">
                  <span>-50¢ (낮음)</span>
                  <span className="text-emerald-400 font-bold">정음 0¢</span>
                  <span>+50¢ (높음)</span>
                </div>
                <div className="h-4 bg-slate-900 rounded-full overflow-hidden relative border border-slate-700">
                  <div
                    className="absolute top-0 bottom-0 bg-emerald-500/30 border-x border-emerald-500/50"
                    style={{ left: '20%', right: '20%' }}
                  />
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-emerald-400 -translate-x-1/2 z-10" />
                  {evaluation?.centsDeviation !== null && evaluation?.centsDeviation !== undefined && (
                    <div
                      className="absolute top-0 bottom-0 w-3 bg-amber-400 rounded-full shadow-lg -translate-x-1/2 transition-all duration-75 z-20"
                      style={{ left: `${pointerPercent}%` }}
                    />
                  )}
                </div>
                <p className="text-xs text-indigo-300 mt-2 font-medium">
                  {evaluation?.feedbackMessage || '칼림바를 튕겨 소리를 확인해 보세요!'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-3">
              [마이크 측정 시작] 버튼을 눌러 실물 칼림바의 17개 음을 차례대로 튕겨보세요.
            </p>
          )}
        </div>

        {/* 17건반 선택 & 상태 가이드 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300">
              특정 음 조율 가이드 (건반을 누르면 해당 음만 집중 확인합니다)
            </h3>
            {selectedKey && (
              <button
                onClick={() => setSelectedKey(null)}
                className="text-[11px] text-indigo-400 hover:underline"
              >
                전체 자동 감지 모드로 전환
              </button>
            )}
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
            {KALIMBA_KEYS.map((key) => {
              const isSelected = selectedKey?.index === key.index;
              const isDetected = evaluation?.detectedKey?.index === key.index;
              return (
                <button
                  key={key.index}
                  onClick={() => setSelectedKey(isSelected ? null : key)}
                  className={`p-2 rounded-xl text-center border transition-all ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-400 shadow-md scale-105'
                      : isDetected
                      ? 'bg-emerald-800/60 border-emerald-500 text-emerald-200'
                      : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700/80 text-slate-300'
                  }`}
                >
                  <div className="text-[10px] text-slate-400">{key.numberNotation}</div>
                  <div className="text-xs font-black">{key.pitch}</div>
                  <div className="text-[10px]">{key.solfege}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 하단 닫기 안내 */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              handleStop();
              onClose();
            }}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-sm text-slate-200"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
