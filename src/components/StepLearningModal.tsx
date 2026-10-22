import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Play,
  Square,
  Volume2,
  Repeat,
  CheckCircle2,
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  RotateCcw,
  VolumeX,
  FastForward,
  Bookmark,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { Song, KalimbaNote } from '../types/music';
import { LearningStep, LearningProgressItem } from '../types/learningTypes';
import { getSongLearningProgress, saveSongStepProgress } from '../utils/learningStorage';
import { audioEngine } from '../utils/audioEngine';
import { pitchDetector } from '../utils/pitchDetectionService';
import { PitchAnalysisResult } from '../types/microphoneAnalysisTypes';
import { KALIMBA_KEYS, PITCH_TO_KEY } from '../constants/kalimbaKeys';
import { extractMeasureData, getNotesInMeasureRange } from '../utils/measureParser';
import { SongMeasureData, MeasureInfo } from '../types/measureTypes';
import { speechNarrator } from '../utils/speechNarrationService';
import { NARRATION_PHRASES } from '../constants/narrationPhrases';
import { SpeechNarrationStatus } from '../types/speechNarrationTypes';

interface StepLearningModalProps {
  song: Song;
  onClose: () => void;
  onStartFullPractice: (song: Song, speedPercent: number) => void;
}

export const StepLearningModal: React.FC<StepLearningModalProps> = ({
  song,
  onClose,
  onStartFullPractice,
}) => {
  const [currentStep, setCurrentStep] = useState<LearningStep>('LISTENING');
  const [progress, setProgress] = useState<LearningProgressItem>(() => getSongLearningProgress(song.id));
  const [selectedSpeed, setSelectedSpeed] = useState<number>(70); // 학습 기본 속도: 70%

  // 1단계: 먼저 듣기 오디오 상태
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const previewTimerRef = useRef<number[]>([]);

  // 마디 데이터 추출 (메모이제이션)
  const measureData: SongMeasureData = useMemo(() => {
    return extractMeasureData(song);
  }, [song]);

  // 마디 선택 상태 (1-based)
  const [startMeasure, setStartMeasure] = useState<number>(1);
  const [endMeasure, setEndMeasure] = useState<number>(() => Math.min(4, Math.max(1, measureData.totalMeasures)));

  // 3단계: 구간 연습 세부 단계 (1: 먼저듣기, 2: 천천히따라하기, 3: 반복연습)
  const [sectionSubStep, setSectionSubStep] = useState<'listen' | 'slow' | 'repeat'>('repeat');
  const [repeatTargetCount, setRepeatTargetCount] = useState<1 | 3 | 5>(3);
  const [currentRepeatIteration, setCurrentRepeatIteration] = useState<number>(0);
  const [isSectionPlaying, setIsSectionPlaying] = useState<boolean>(false);
  const sectionTimerRef = useRef<number[]>([]);
  const sectionLoopTimeoutRef = useRef<number | null>(null);

  // 음성 나레이션 상태
  const [narrationStatus, setNarrationStatus] = useState<SpeechNarrationStatus>(() => speechNarrator.getStatus());

  // 마이크 음정 분석 (시험 기능) 상태
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [micResult, setMicResult] = useState<PitchAnalysisResult | null>(null);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);

  // 음표와 건반 익히기 선택된 음
  const playableNotes = song.notes.filter((n) => !n.isRest && n.pitch !== 'REST');
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number>(0);

  // 음성 나레이션 구독 및 마운트 시 초기 안내
  useEffect(() => {
    const unsubscribe = speechNarrator.subscribe((status) => {
      setNarrationStatus(status);
    });

    // 진입 환영 인사 발화
    speechNarrator.speak(NARRATION_PHRASES.WELCOME);

    return () => {
      unsubscribe();
      stopAllAudio();
      pitchDetector.stopListening();
      speechNarrator.stop();
    };
  }, []);

  // 단계 변경 시 음성 나레이션 트리거
  const handleStepChange = (newStep: LearningStep) => {
    stopAllAudio();
    setCurrentStep(newStep);

    switch (newStep) {
      case 'LISTENING':
        speechNarrator.speak(NARRATION_PHRASES.STEP1_LISTEN);
        break;
      case 'KEY_EXPLORE':
        speechNarrator.speak(NARRATION_PHRASES.STEP2_SLOW);
        break;
      case 'LOOP_PRACTICE':
        speechNarrator.speak(NARRATION_PHRASES.CHOOSE_SECTION);
        break;
      case 'FULL_PRACTICE':
        speechNarrator.speak(NARRATION_PHRASES.FULL_PRACTICE_START);
        break;
      case 'PRACTICE_RESULT':
        speechNarrator.speak(NARRATION_PHRASES.STEP3_REPEAT_COMPLETE);
        break;
    }
  };

  const stopAllAudio = () => {
    previewTimerRef.current.forEach((t) => clearTimeout(t));
    previewTimerRef.current = [];
    sectionTimerRef.current.forEach((t) => clearTimeout(t));
    sectionTimerRef.current = [];
    if (sectionLoopTimeoutRef.current) {
      clearTimeout(sectionLoopTimeoutRef.current);
      sectionLoopTimeoutRef.current = null;
    }
    audioEngine.stopAll();
    setIsPlayingPreview(false);
    setIsSectionPlaying(false);
  };

  // 1단계: 먼저 듣기 실행
  const handleTogglePreview = () => {
    if (isPlayingPreview) {
      stopAllAudio();
      return;
    }

    stopAllAudio();
    setIsPlayingPreview(true);
    audioEngine.ensureReady();

    const notesToPlay = song.notes.slice(0, 16);
    let accumulatedBeats = 0;
    const beatSeconds = (60 / song.tempoBpm) * (100 / selectedSpeed);

    notesToPlay.forEach((n) => {
      if (!n.isRest && n.pitch !== 'REST') {
        const delayMs = accumulatedBeats * beatSeconds * 1000;
        const timerId = window.setTimeout(() => {
          audioEngine.playNote(n.pitch, n.duration, song.tempoBpm, selectedSpeed / 100);
        }, delayMs);
        previewTimerRef.current.push(timerId);
      }
      accumulatedBeats += n.duration;
    });

    const totalMs = accumulatedBeats * beatSeconds * 1000 + 400;
    const endTimer = window.setTimeout(() => {
      setIsPlayingPreview(false);
      const updated = saveSongStepProgress(song.id, 'LISTENING', 8, selectedSpeed);
      setProgress(updated);
      speechNarrator.speak(NARRATION_PHRASES.STEP1_AGAIN_HINT);
    }, totalMs);
    previewTimerRef.current.push(endTimer);
  };

  // 선택된 마디 구간 계산
  const currentRangeInfo = useMemo(() => {
    return getNotesInMeasureRange(measureData, startMeasure, endMeasure);
  }, [measureData, startMeasure, endMeasure]);

  // 마디 범위 빠른 프리셋 적용
  const applyMeasurePreset = (start: number, end: number) => {
    stopAllAudio();
    const safeStart = Math.max(1, Math.min(start, measureData.totalMeasures));
    const safeEnd = Math.max(safeStart, Math.min(end, measureData.totalMeasures));
    setStartMeasure(safeStart);
    setEndMeasure(safeEnd);
    speechNarrator.speak(`${safeStart}마디부터 ${safeEnd}마디까지 선택했어.`);
  };

  // 3단계: 마디 범위 구간 재생 (단일 실행 또는 반복 실행)
  const handleToggleSectionPlay = (isRepeatMode: boolean = false) => {
    if (isSectionPlaying) {
      stopAllAudio();
      return;
    }

    if (!currentRangeInfo.isValidRange || currentRangeInfo.notes.length === 0) {
      speechNarrator.speak(NARRATION_PHRASES.NO_MEASURE_DATA);
      return;
    }

    stopAllAudio();
    setIsSectionPlaying(true);
    audioEngine.ensureReady();

    const sectionNotes = currentRangeInfo.notes;
    const speed = selectedSpeed;
    const beatSeconds = (60 / song.tempoBpm) * (100 / speed);

    const totalIterations = isRepeatMode ? repeatTargetCount : 1;
    let iteration = 0;

    const runIteration = () => {
      iteration++;
      setCurrentRepeatIteration(iteration);

      if (isRepeatMode) {
        if (iteration === 1) {
          speechNarrator.speak(NARRATION_PHRASES.STEP3_REPEAT_START);
        } else {
          speechNarrator.speak(`${iteration}번째 연습을 시작해 보자.`);
        }
      }

      let accumulatedBeats = 0;
      sectionNotes.forEach((n) => {
        if (!n.isRest && n.pitch !== 'REST') {
          const delayMs = accumulatedBeats * beatSeconds * 1000;
          const timerId = window.setTimeout(() => {
            audioEngine.playNote(n.pitch, n.duration, song.tempoBpm, speed / 100);
          }, delayMs);
          sectionTimerRef.current.push(timerId);
        }
        accumulatedBeats += n.duration;
      });

      const iterationTotalMs = accumulatedBeats * beatSeconds * 1000 + 400;

      if (iteration < totalIterations) {
        // 다음 회차 반복 대기 (0.6초 호흡 간격)
        sectionLoopTimeoutRef.current = window.setTimeout(() => {
          runIteration();
        }, iterationTotalMs + 600);
      } else {
        // 전체 반복 완료
        const finishTimer = window.setTimeout(() => {
          setIsSectionPlaying(false);
          setCurrentRepeatIteration(0);
          const elapsedSec = Math.round(accumulatedBeats * beatSeconds * totalIterations);
          const updated = saveSongStepProgress(song.id, 'LOOP_PRACTICE', elapsedSec, speed);
          setProgress(updated);
          speechNarrator.speak(NARRATION_PHRASES.STEP3_REPEAT_COMPLETE);
        }, iterationTotalMs);
        sectionTimerRef.current.push(finishTimer);
      }
    };

    runIteration();
  };

  // 마이크 분석 토글
  const handleToggleMic = async () => {
    if (isMicActive) {
      pitchDetector.stopListening();
      setIsMicActive(false);
      setMicResult(null);
      setMicErrorMessage(null);
      return;
    }

    setMicErrorMessage(null);
    const success = await pitchDetector.startListening(
      (result) => {
        setMicResult(result);
      },
      (err) => {
        setMicErrorMessage(err);
        setIsMicActive(false);
      }
    );

    if (success) {
      setIsMicActive(true);
    }
  };

  const stepsInfo = [
    { key: 'LISTENING', label: '1. 먼저 듣기', icon: '🎧', desc: '원곡의 멜로디를 편안하게 들어보아요' },
    { key: 'KEY_EXPLORE', label: '2. 건반 익히기', icon: '🎹', desc: '나오는 음표와 칼림바 건반 위치를 확인해요' },
    { key: 'LOOP_PRACTICE', label: '3. 마디 구간 연습', icon: '🔁', desc: '원하는 마디를 골라 집중 반복 연습해요' },
    { key: 'FULL_PRACTICE', label: '4. 곡 전체 연습', icon: '🌟', desc: '폭포수 게임으로 전체를 신나게 연주해요' },
    { key: 'PRACTICE_RESULT', label: '5. 연습 결과', icon: '🏆', desc: '오늘 열심히 연습한 기록을 확인해요' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-['Jua',sans-serif]">
      <div className="bg-linear-to-b from-[#1b173d] to-[#0f0c29] border-2 border-cyan-400/50 rounded-3xl w-full max-w-3xl overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.3)] flex flex-col max-h-[94vh]">
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl sm:text-3xl">🌱</span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
                <span>{song.title}</span>
                <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-2 py-0.5 rounded-full font-bold">
                  맞춤 마디 연습 & 유아 음성 가이드
                </span>
              </h2>
              <p className="text-xs text-cyan-200/60 font-sans">
                총 {measureData.totalMeasures}마디 구성 · {song.timeSignature || '4/4'}박자 · {song.tempoBpm} BPM
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Narration Voice Controls */}
            <div className="flex items-center space-x-1 bg-white/10 p-1 rounded-2xl border border-white/15">
              <button
                type="button"
                onClick={() => {
                  const newEnabled = !narrationStatus.state.includes('disabled') && narrationStatus.isSupported;
                  speechNarrator.updateSettings({ enabled: !narrationStatus.isSupported ? false : !speechNarrator.getSettings().enabled });
                }}
                className={`p-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                  speechNarrator.getSettings().enabled && narrationStatus.isSupported
                    ? 'bg-amber-400 text-amber-950 font-black'
                    : 'bg-white/10 text-white/50'
                }`}
                title={speechNarrator.getSettings().enabled ? '음성 나레이션 끄기' : '음성 나레이션 켜기'}
              >
                {speechNarrator.getSettings().enabled && narrationStatus.isSupported ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
                <span className="hidden sm:inline text-[11px]">음성 가이드</span>
              </button>

              <button
                type="button"
                onClick={() => speechNarrator.replayLast()}
                className="p-1.5 rounded-xl hover:bg-white/20 text-cyan-300 transition cursor-pointer"
                title="음성 안내 다시 듣기"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                stopAllAudio();
                pitchDetector.stopListening();
                speechNarrator.stop();
                onClose();
              }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition cursor-pointer"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 5 Steps Nav Bar */}
        <div className="grid grid-cols-5 border-b border-white/10 bg-black/20">
          {stepsInfo.map((s) => {
            const isCurrent = currentStep === s.key;
            const isCompleted = progress.completedSteps.includes(s.key as LearningStep);
            return (
              <button
                key={s.key}
                onClick={() => handleStepChange(s.key as LearningStep)}
                className={`py-3 px-1 sm:px-2 text-center transition flex flex-col items-center justify-center space-y-1 relative cursor-pointer border-b-2 ${
                  isCurrent
                    ? 'border-cyan-400 bg-cyan-500/15 text-white font-black'
                    : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-lg sm:text-xl">{s.icon}</span>
                <span className="text-[11px] sm:text-xs tracking-tight line-clamp-1">{s.label}</span>
                {isCompleted && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 absolute top-1 right-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: 먼저 듣기 */}
          {currentStep === 'LISTENING' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center mx-auto text-3xl shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                🎧
              </div>
              <div>
                <h3 className="text-xl font-black text-white">좋아요! 먼저 노래를 들어 볼까요?</h3>
                <p className="text-sm text-cyan-200/70 font-sans mt-1">
                  칼림바가 연주하는 맑은 멜로디를 귀로 가만히 느껴보세요.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleTogglePreview}
                  className={`px-6 py-3.5 rounded-2xl font-black text-base flex items-center space-x-2 mx-auto transition cursor-pointer shadow-lg active:scale-95 ${
                    isPlayingPreview
                      ? 'bg-amber-400 text-amber-950 shadow-[0_0_16px_rgba(251,191,36,0.5)] animate-pulse'
                      : 'bg-linear-to-r from-cyan-400 to-sky-500 text-[#0c0827] shadow-[0_0_16px_rgba(34,211,238,0.4)] hover:brightness-110'
                  }`}
                >
                  {isPlayingPreview ? (
                    <>
                      <Square className="w-5 h-5 fill-current" />
                      <span>소리 멈추기</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-5 h-5" />
                      <span>노래 먼저 들어보기 (앞 16음)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => handleStepChange('KEY_EXPLORE')}
                  className="text-xs text-cyan-300 hover:text-white flex items-center space-x-1 cursor-pointer font-bold"
                >
                  <span>다음 단계: 건반 익히기로 이동</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: 음표와 건반 익히기 */}
          {currentStep === 'KEY_EXPLORE' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-black text-white">이제 건반 위치를 확인해 보세요!</h3>
                <p className="text-xs text-cyan-200/70 font-sans mt-1">
                  이 곡에 나오는 음표를 클릭하면 17음 칼림바에서 튕겨야 할 건반이 빛나요.
                </p>
              </div>

              {/* Note Pills List */}
              <div className="flex flex-wrap items-center justify-center gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl max-h-36 overflow-y-auto">
                {playableNotes.slice(0, 16).map((note, idx) => {
                  const isSelected = selectedNoteIndex === idx;
                  const keyDef = PITCH_TO_KEY.get(note.pitch);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedNoteIndex(idx);
                        if (keyDef) {
                          audioEngine.playNote(note.pitch, 1, 80);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                        isSelected
                          ? 'bg-amber-400 text-amber-950 border-amber-300 font-black shadow-[0_0_10px_rgba(251,191,36,0.6)] scale-105'
                          : 'bg-white/10 text-white/80 border-white/15 hover:bg-white/20'
                      }`}
                    >
                      <span>{note.solfege}</span>
                      <span className="text-[10px] opacity-70">({note.numberNotation})</span>
                    </button>
                  );
                })}
              </div>

              {/* 17-Key Visual Guide */}
              <div className="bg-[#12163a] border border-cyan-400/30 rounded-2xl p-4">
                <div className="text-xs text-center text-cyan-200/80 mb-3 font-bold">
                  현재 건반: <span className="text-amber-300 text-sm font-black">{playableNotes[selectedNoteIndex]?.solfege}</span>
                  {' '}· 번호: <span className="text-white font-black">{playableNotes[selectedNoteIndex]?.numberNotation}</span>
                  {' '}· 피치: <span className="text-cyan-300 font-mono">{playableNotes[selectedNoteIndex]?.pitch}</span>
                </div>

                {/* 17 Tines Display */}
                <div className="flex items-end justify-center h-28 space-x-1">
                  {KALIMBA_KEYS.map((k) => {
                    const currentTargetPitch = playableNotes[selectedNoteIndex]?.pitch;
                    const isTarget = k.pitch === currentTargetPitch;

                    return (
                      <div
                        key={k.index}
                        onClick={() => {
                          audioEngine.playNote(k.pitch, 1, 80);
                        }}
                        style={{ height: `${k.tineHeightPercent}%` }}
                        className={`w-4 sm:w-5 rounded-b-md transition-all duration-200 cursor-pointer flex flex-col justify-end items-center pb-1 ${
                          isTarget
                            ? 'bg-linear-to-b from-amber-300 to-amber-500 shadow-[0_0_14px_#f59e0b] scale-y-105'
                            : k.isCenter
                            ? 'bg-linear-to-b from-slate-300 to-slate-400'
                            : k.index % 2 === 0
                            ? 'bg-linear-to-b from-slate-400 to-slate-500'
                            : 'bg-linear-to-b from-slate-300 to-slate-400'
                        }`}
                        title={`${k.solfege} (${k.pitch})`}
                      >
                        <span className={`text-[9px] font-bold ${isTarget ? 'text-amber-950' : 'text-slate-800'}`}>
                          {k.numberNotation}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => handleStepChange('LISTENING')}
                  className="text-xs text-white/50 hover:text-white"
                >
                  이전 단계
                </button>
                <button
                  onClick={() => {
                    const updated = saveSongStepProgress(song.id, 'KEY_EXPLORE', 10, selectedSpeed);
                    setProgress(updated);
                    handleStepChange('LOOP_PRACTICE');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0c0827] text-xs font-black shadow-md cursor-pointer transition"
                >
                  다음 단계: 마디 구간 연습
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: 마디 범위 선택형 구간 연습 (핵심 고도화) */}
          {currentStep === 'LOOP_PRACTICE' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-black text-white flex items-center justify-center space-x-2">
                  <span>어떤 부분을 연습할까요?</span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-400/40 px-2 py-0.5 rounded-full">
                    마디 범위 선택
                  </span>
                </h3>
                <p className="text-xs text-cyan-200/70 font-sans mt-0.5">
                  어린이가 어려워하는 마디 구간을 자유롭게 골라 집중적으로 반복할 수 있습니다.
                </p>
              </div>

              {/* Measure Range Selector Control Card */}
              <div className="bg-[#12163a] border border-cyan-400/30 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Start & End Stepper */}
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-white/70 text-xs">시작 마디:</span>
                      <select
                        value={startMeasure}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setStartMeasure(val);
                          if (val > endMeasure) setEndMeasure(val);
                          stopAllAudio();
                        }}
                        className="bg-white/10 border border-white/20 rounded-xl px-2.5 py-1 text-white font-bold text-xs focus:border-cyan-400 focus:outline-hidden"
                      >
                        {Array.from({ length: measureData.totalMeasures }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m} className="bg-[#12163a] text-white">
                            {m}마디
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-white/40">~</span>

                    <div className="flex items-center space-x-1.5">
                      <span className="text-white/70 text-xs">마지막 마디:</span>
                      <select
                        value={endMeasure}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEndMeasure(val);
                          stopAllAudio();
                        }}
                        className="bg-white/10 border border-white/20 rounded-xl px-2.5 py-1 text-white font-bold text-xs focus:border-cyan-400 focus:outline-hidden"
                      >
                        {Array.from({ length: measureData.totalMeasures }, (_, i) => i + 1)
                          .filter((m) => m >= startMeasure)
                          .map((m) => (
                            <option key={m} value={m} className="bg-[#12163a] text-white">
                              {m}마디
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Range Info Badge */}
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 px-2.5 py-1 rounded-xl font-bold">
                      선택: {startMeasure} ~ {endMeasure}마디 ({endMeasure - startMeasure + 1}마디 분량)
                    </span>
                    <span className="bg-white/10 text-white/80 px-2 py-1 rounded-xl">
                      총 {currentRangeInfo.notes.length}음 · {currentRangeInfo.totalBeats}박
                    </span>
                  </div>
                </div>

                {/* Quick Measure Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/10 text-xs">
                  <span className="text-white/50 text-[11px] mr-1">빠른 선택:</span>
                  <button
                    type="button"
                    onClick={() => applyMeasurePreset(1, measureData.totalMeasures)}
                    className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/80 border border-white/15 transition cursor-pointer"
                  >
                    전체 ({measureData.totalMeasures}마디)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMeasurePreset(1, Math.min(4, measureData.totalMeasures))}
                    className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/80 border border-white/15 transition cursor-pointer"
                  >
                    앞부분 (1~4마디)
                  </button>
                  {measureData.totalMeasures >= 8 && (
                    <button
                      type="button"
                      onClick={() => applyMeasurePreset(5, Math.min(8, measureData.totalMeasures))}
                      className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/80 border border-white/15 transition cursor-pointer"
                    >
                      중간 (5~8마디)
                    </button>
                  )}
                  {measureData.totalMeasures >= 12 && (
                    <button
                      type="button"
                      onClick={() => applyMeasurePreset(9, measureData.totalMeasures)}
                      className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/80 border border-white/15 transition cursor-pointer"
                    >
                      끝부분 (9~{measureData.totalMeasures}마디)
                    </button>
                  )}
                </div>
              </div>

              {/* 3-Step Practice Mode Sub-tabs & Controls */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Practice Speed Pill */}
                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className="text-white/70">연습 템포:</span>
                    {[50, 70, 100].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setSelectedSpeed(spd)}
                        className={`px-2.5 py-0.5 rounded-full font-bold border transition cursor-pointer ${
                          selectedSpeed === spd
                            ? 'bg-cyan-400 text-[#0c0827] border-cyan-300 font-black'
                            : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/15'
                        }`}
                      >
                        {spd === 50 ? '🐢 50%' : spd === 70 ? '🐰 70%' : '🚀 100%'}
                      </button>
                    ))}
                  </div>

                  {/* Repeat Count Options */}
                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className="text-white/70">반복 횟수:</span>
                    {[1, 3, 5].map((cnt) => (
                      <button
                        key={cnt}
                        onClick={() => setRepeatTargetCount(cnt as 1 | 3 | 5)}
                        className={`px-2.5 py-0.5 rounded-full font-bold border transition cursor-pointer ${
                          repeatTargetCount === cnt
                            ? 'bg-amber-400 text-amber-950 border-amber-300 font-black'
                            : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/15'
                        }`}
                      >
                        {cnt}회 반복
                      </button>
                    ))}
                  </div>
                </div>

                {/* Big Action Buttons for 3-Step Practice */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Option A: 선택 구간 1회 먼저 듣기 */}
                  <button
                    onClick={() => handleToggleSectionPlay(false)}
                    className={`p-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition cursor-pointer border active:scale-98 ${
                      isSectionPlaying && currentRepeatIteration <= 1 && repeatTargetCount === 1
                        ? 'bg-amber-400 text-amber-950 border-amber-300 animate-pulse'
                        : 'bg-white/10 hover:bg-white/15 text-white border-white/20'
                    }`}
                  >
                    <Volume2 className="w-4 h-4 text-cyan-300" />
                    <span>선택 마디 1회 먼저 듣기</span>
                  </button>

                  {/* Option B: 지정 횟수만큼 구간 반복 연습 */}
                  <button
                    onClick={() => handleToggleSectionPlay(true)}
                    className={`p-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition cursor-pointer border active:scale-98 shadow-md ${
                      isSectionPlaying && repeatTargetCount > 1
                        ? 'bg-amber-400 text-amber-950 border-amber-300 animate-pulse'
                        : 'bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white border-purple-400/50'
                    }`}
                  >
                    {isSectionPlaying ? (
                      <>
                        <Square className="w-4 h-4 fill-current" />
                        <span>
                          반복 연습 멈추기 ({currentRepeatIteration} / {repeatTargetCount}회)
                        </span>
                      </>
                    ) : (
                      <>
                        <Repeat className="w-4 h-4" />
                        <span>
                          {startMeasure}~{endMeasure}마디 {repeatTargetCount}회 반복 연습 시작!
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => handleStepChange('KEY_EXPLORE')}
                  className="text-xs text-white/50 hover:text-white"
                >
                  이전 단계
                </button>
                <button
                  onClick={() => {
                    stopAllAudio();
                    handleStepChange('FULL_PRACTICE');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0c0827] text-xs font-black shadow-md cursor-pointer transition"
                >
                  다음 단계: 곡 전체 연습
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: 곡 전체 연습 */}
          {currentStep === 'FULL_PRACTICE' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center mx-auto text-3xl shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                🌟
              </div>
              <div>
                <h3 className="text-xl font-black text-white">이제 곡 전체를 신나게 연주해 봐요!</h3>
                <p className="text-xs text-cyan-200/70 font-sans mt-1">
                  폭포수 건반 게임 화면에서 처음부터 끝까지 칼림바를 연주합니다.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 max-w-md mx-auto text-left text-xs space-y-1.5 text-cyan-100">
                <div className="flex justify-between">
                  <span>추천 연습 템포:</span>
                  <span className="font-bold text-amber-300">{selectedSpeed}%</span>
                </div>
                <div className="flex justify-between">
                  <span>총 연주 음표:</span>
                  <span className="font-bold text-white">{playableNotes.length}개</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    const updated = saveSongStepProgress(song.id, 'FULL_PRACTICE', 30, selectedSpeed);
                    setProgress(updated);
                    onStartFullPractice(song, selectedSpeed);
                  }}
                  className="px-8 py-3.5 rounded-2xl font-black text-base bg-linear-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-[#0c0827] flex items-center space-x-2 mx-auto shadow-[0_0_20px_rgba(52,211,153,0.5)] transition cursor-pointer active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>폭포수 게임으로 전체 연습 시작하기!</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleStepChange('PRACTICE_RESULT')}
                  className="text-xs text-cyan-300 hover:text-white font-bold"
                >
                  연습 결과 및 성취 확인하기 👉
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: 연습 결과 확인 */}
          {currentStep === 'PRACTICE_RESULT' && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-4xl">🏆</span>
                <h3 className="text-xl font-black text-white mt-1">연습 단계를 완료했어요!</h3>
                <p className="text-xs text-emerald-300 font-bold mt-0.5">
                  "잘하고 있어요. 매일 조금씩 익히면 멋진 칼림바 연주자가 될 거예요!"
                </p>
              </div>

              {/* Statistics Card */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                  <span className="text-xs text-white/50 block">완료한 학습 단계</span>
                  <span className="text-xl font-black text-cyan-300">
                    {progress.completedSteps.length} / 5
                  </span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                  <span className="text-xs text-white/50 block">누적 연습 횟수</span>
                  <span className="text-xl font-black text-amber-300">
                    {progress.practiceCount}회
                  </span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center col-span-2 sm:col-span-1">
                  <span className="text-xs text-white/50 block">누적 학습 시간</span>
                  <span className="text-xl font-black text-emerald-300">
                    {progress.practiceDurationSeconds}초
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => handleStepChange('LISTENING')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>처음 단계부터 다시하기</span>
                </button>
                <button
                  onClick={() => {
                    onStartFullPractice(song, selectedSpeed);
                  }}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0c0827] text-xs font-black shadow-md transition cursor-pointer"
                >
                  폭포수 연습 바로 시작
                </button>
              </div>
            </div>
          )}

          {/* 마이크 음정 분석 (시험 기능) 독립 패널 */}
          <div className="mt-4 pt-3 border-t border-white/10 bg-white/3 rounded-2xl p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-1.5">
                  <span>실제 칼림바 마이크 음정 분석</span>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded-md font-bold">
                    기술 검증 시험용
                  </span>
                </h4>
              </div>

              <button
                type="button"
                onClick={handleToggleMic}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer border ${
                  isMicActive
                    ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)] font-black'
                    : 'bg-white/10 hover:bg-white/20 text-white/80 border-white/20'
                }`}
              >
                {isMicActive ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    <span>마이크 분석 멈추기</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-amber-300" />
                    <span>마이크 연주 분석 시작</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-white/50 font-sans">
              🛡️ 개인정보 보호: 마이크 소리는 서버로 전송되거나 저장되지 않으며, 컴퓨터 안에서 칼림바 소리만 실시간으로 확인합니다.
            </p>

            {/* Mic Live Monitor */}
            {isMicActive && (
              <div className="mt-2.5 bg-[#0b0821] border border-cyan-400/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-white/50 block text-[10px]">감지 상태</span>
                  <span className="font-bold text-white">
                    {micResult?.status === 'MATCH' ? (
                      <span className="text-emerald-300 font-black">🎯 건반 인식 성공!</span>
                    ) : micResult?.status === 'UNCERTAIN' ? (
                      <span className="text-amber-300 font-bold">분석 중...</span>
                    ) : micResult?.status === 'SILENCE' ? (
                      <span className="text-white/40">소리 대기 중...</span>
                    ) : (
                      <span className="text-white/70">소음 감지됨</span>
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-white/50 block text-[10px]">인식된 건반</span>
                  <span className="text-base font-black text-cyan-300">
                    {micResult?.closestKey ? `${micResult.closestKey.solfege} (${micResult.closestKey.pitch})` : '-'}
                  </span>
                </div>

                <div>
                  <span className="text-white/50 block text-[10px]">추정 주파수</span>
                  <span className="font-mono text-white/80">
                    {micResult?.estimatedFrequency ? `${micResult.estimatedFrequency} Hz` : '-'}
                  </span>
                </div>

                <div>
                  <span className="text-white/50 block text-[10px]">센트 오차</span>
                  <span className="font-mono text-white/80">
                    {micResult?.centsDeviation !== null ? `${micResult?.centsDeviation} cents` : '-'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Narration Speech Bubble (Always visible for accessibility) */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#12163a] flex items-center space-x-3 text-xs">
          <span className="text-lg animate-pulse shrink-0">🗣️</span>
          <div className="flex-1">
            <span className="text-[10px] text-cyan-300 font-bold block">선생님 음성 안내:</span>
            <p className="text-white font-sans text-xs sm:text-sm line-clamp-1">
              "{narrationStatus.currentText || NARRATION_PHRASES.WELCOME}"
            </p>
          </div>
          {speechNarrator.getSettings().enabled && (
            <span className="text-[10px] text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/40 shrink-0 font-bold">
              음성 재생 켜짐
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
