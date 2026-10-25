import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { KALIMBA_KEYS, KalimbaKeyDef, PITCH_TO_KEY } from '../constants/kalimbaKeys';
import { Song } from '../types/music';
import { audioEngine } from '../utils/audioEngine';
import { calculateSongTimeline, TimedNoteItem, INITIAL_LEAD_IN_BEATS } from '../utils/musicTiming';
import { KalimbaTouchController } from '../utils/kalimbaTouchController';
import { RhythmJudgeManager } from '../utils/rhythmJudge';
import { ComboStats, CharacterState } from '../types/comboTypes';
import { GuguGagaReaction } from './GuguGagaReaction';
import { ComboDisplay } from './ComboDisplay';
import { AcousticKalimbaJudge } from '../utils/acousticKalimbaJudge';
import { AcousticEvaluation, AcousticInputMode } from '../types/acousticTypes';
import { MicrophoneAcousticIndicator } from './MicrophoneAcousticIndicator';

type FallingNoteItem = TimedNoteItem;

export interface KalimbaGameWaterfallProps {
  song: Song;
  difficulty: string; // '보통' | '쉬움' | '어려움'
  speedPercent: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onOpenExitModal: () => void;
  onChangeSpeed: (speed: number) => void;
  onChangeDifficulty: (difficulty: string) => void;
  onSongComplete?: (stats?: ComboStats) => void;
}

export const KalimbaGameWaterfall: React.FC<KalimbaGameWaterfallProps> = ({
  song,
  difficulty,
  speedPercent,
  isPlaying,
  onTogglePlay,
  onRestart,
  onOpenExitModal,
  onChangeSpeed,
  onChangeDifficulty,
  onSongComplete,
}) => {
  // Start 2 beats before the first note (beat 0.0) so the very first note smoothly falls from the top to the strike line
  const [currentBeat, setCurrentBeat] = useState<number>(INITIAL_LEAD_IN_BEATS);
  const [completedNoteCount, setCompletedNoteCount] = useState<number>(0);
  const [activeTineIndexes, setActiveTineIndexes] = useState<{ [keyIndex: number]: 'green' | 'orange' | 'teal' }>({});
  const [sparkleNoteIds, setSparkleNoteIds] = useState<{ [id: string]: boolean }>({});
  const [showCheer, setShowCheer] = useState<boolean>(false);
  const [cheerText, setCheerText] = useState<string>('잘했어요!');

  // 반복 연주 (찬송가 기본 3회 권장, 1회/3회/4회 순환)
  const defaultRepeats = song.repeatTimes || (song.level === 'hymn' ? 3 : 1);
  const [targetRepeats, setTargetRepeats] = useState<number>(defaultRepeats);
  const [currentIteration, setCurrentIteration] = useState<number>(1);
  const currentIterationRef = useRef<number>(1);
  const targetRepeatsRef = useRef<number>(defaultRepeats);
  targetRepeatsRef.current = targetRepeats;

  // 곡 변경 시 반복 상태 초기화
  useEffect(() => {
    const newDefault = song.repeatTimes || (song.level === 'hymn' ? 3 : 1);
    setTargetRepeats(newDefault);
    setCurrentIteration(1);
    currentIterationRef.current = 1;
  }, [song.id, song.repeatTimes, song.level]);

  // 단일 기준 공통 음악 타임라인 계산 (BPM, 음표 길이, 쉼표, 속도 완벽 일치)
  const timeline = useMemo(
    () => calculateSongTimeline(song, speedPercent),
    [song, speedPercent]
  );

  const fallingNotes: FallingNoteItem[] = timeline.playableItems;
  const totalNotes = timeline.totalPlayableNotes > 0 ? timeline.totalPlayableNotes : 1;
  const progressPercent = Math.min(100, Math.round((completedNoteCount / totalNotes) * 100));

  // STEP 02-A & STEP 03-A: 리듬 판정 및 화음 콤보 시스템 상태
  const judgeManagerRef = useRef<RhythmJudgeManager>(new RhythmJudgeManager(timeline.totalPlayableNotes));
  const [comboStats, setComboStats] = useState<ComboStats>(() => judgeManagerRef.current.getStats());
  const [characterState, setCharacterState] = useState<CharacterState>('idle');
  const [characterMessage, setCharacterMessage] = useState<string>('');
  const [ratingTrigger, setRatingTrigger] = useState<number>(0);
  const [practiceMode, setPracticeMode] = useState<'melody' | 'chord' | 'twoHand'>(() =>
    timeline.hasChords ? 'chord' : 'melody'
  );
  const [lastChordToast, setLastChordToast] = useState<{ message: string; key: number } | null>(null);

  // STEP 03-B: 실물 칼림바 마이크 인식 모드 상태
  const [inputMode, setInputMode] = useState<AcousticInputMode>('touch');
  const [isMicListening, setIsMicListening] = useState<boolean>(false);
  const [acousticEvaluation, setAcousticEvaluation] = useState<AcousticEvaluation | null>(null);
  const [, setMicErrorToast] = useState<string | null>(null);
  const acousticJudgeRef = useRef<AcousticKalimbaJudge | null>(null);

  // 실시간 마이크 판정 엔진 초기화
  useEffect(() => {
    const judge = new AcousticKalimbaJudge({
      perfectCentsTolerance: 35,
      greatCentsTolerance: 70,
      cooldownMs: 320,
    });
    acousticJudgeRef.current = judge;

    judge.onEvaluationChange = (evalResult) => {
      setAcousticEvaluation(evalResult);
    };

    return () => {
      judge.stop();
      acousticJudgeRef.current = null;
    };
  }, []);

  // 마이크 켜기/끄기 토글
  const toggleMicListening = useCallback(async () => {
    if (!acousticJudgeRef.current) return;
    if (isMicListening) {
      acousticJudgeRef.current.stop();
      setIsMicListening(false);
      setAcousticEvaluation(null);
    } else {
      setMicErrorToast(null);
      const success = await acousticJudgeRef.current.start((errMsg) => {
        setMicErrorToast(errMsg);
        setIsMicListening(false);
      });
      if (success) {
        setIsMicListening(true);
      }
    }
  }, [isMicListening]);

  // 입력 모드 전환 핸들러
  const handleToggleInputMode = useCallback((mode: AcousticInputMode) => {
    setInputMode(mode);
    if (mode === 'touch') {
      if (acousticJudgeRef.current && acousticJudgeRef.current.isListening()) {
        acousticJudgeRef.current.stop();
      }
      setIsMicListening(false);
      setAcousticEvaluation(null);
    } else if (mode === 'acoustic_mic') {
      if (acousticJudgeRef.current && !acousticJudgeRef.current.isListening()) {
        acousticJudgeRef.current.start().then((ok) => {
          if (ok) setIsMicListening(true);
        });
      }
    }
  }, []);

  // 곡 또는 타임라인 변경 시 판정 엔진 리셋 (화음 그룹 전달)
  useEffect(() => {
    judgeManagerRef.current.reset(timeline.totalPlayableNotes, timeline.chordGroups);
    setComboStats(judgeManagerRef.current.getStats());
    setCharacterState('idle');
    setCharacterMessage('');
    if (timeline.hasChords) {
      setPracticeMode('chord');
    }
  }, [song.id, timeline.totalPlayableNotes, timeline.chordGroups, timeline.hasChords]);

  // Animation and timing refs
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const hasCompletedRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentBeatRef = useRef<number>(currentBeat);
  currentBeatRef.current = currentBeat;

  const speedPercentRef = useRef<number>(speedPercent);
  speedPercentRef.current = speedPercent;

  const difficultyRef = useRef<string>(difficulty);
  difficultyRef.current = difficulty;

  // 일시정지 및 언마운트 시 활성 보이스 및 잔향 정리
  useEffect(() => {
    if (!isPlaying) {
      audioEngine.stopAll();
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      audioEngine.stopAll();
    };
  }, []);

  // Sound and glowing tine trigger with dynamic musical expression
  const triggerKey = useCallback(
    (
      keyIndex: number,
      pitch: string,
      color: 'green' | 'orange' | 'teal' = 'green',
      durationBeats: number = 1,
      velocity: number = 1.0,
      beatInMeasure?: number
    ) => {
      audioEngine.playNote(
        pitch,
        durationBeats,
        song.tempoBpm,
        speedPercentRef.current / 100,
        undefined,
        undefined,
        velocity,
        song.timeSignature || '4/4',
        beatInMeasure
      );

      setActiveTineIndexes((prev) => ({
        ...prev,
        [keyIndex]: color,
      }));

      const durationMs = difficultyRef.current === '쉬움' ? 700 : difficultyRef.current === '어려움' ? 350 : 500;

      setTimeout(() => {
        setActiveTineIndexes((prev) => {
          const updated = { ...prev };
          delete updated[keyIndex];
          return updated;
        });
      }, durationMs);
    },
    [song.tempoBpm, song.timeSignature]
  );

  // 사용자 건반 입력 및 실시간 리듬 판정 처리 (STEP 02-A)
  const handleUserNoteInput = useCallback(
    (keyIndex: number, pitch: string) => {
      const keyDef = PITCH_TO_KEY.get(pitch);
      const color = keyDef ? (keyDef.isCenter ? 'orange' : keyIndex % 2 === 0 ? 'green' : 'orange') : 'green';
      triggerKey(keyIndex, pitch, color);

      // 리듬 판정 실행 (정확도 ±120ms PERFECT, ±220ms GREAT)
      const speedMultiplier = speedPercentRef.current / 100;
      const result = judgeManagerRef.current.registerUserInput(
        keyIndex,
        currentBeatRef.current,
        song.tempoBpm,
        speedMultiplier,
        fallingNotes
      );

      if (result.rating !== 'NONE') {
        const stats = judgeManagerRef.current.getStats();
        setComboStats(stats);
        setRatingTrigger((prev) => prev + 1);

        if (result.targetNoteId) {
          setSparkleNoteIds((prev) => ({ ...prev, [result.targetNoteId!]: true }));
          setTimeout(() => {
            setSparkleNoteIds((prev) => {
              const copy = { ...prev };
              delete copy[result.targetNoteId!];
              return copy;
            });
          }, 600);
        }

        // 구구가가 캐릭터 상태 업데이트 및 화음 완성 반응
        if (result.chordResult && result.chordResult.rating === 'CHORD_PERFECT') {
          setCharacterState('celebrate');
          setCharacterMessage(result.chordResult.message);
          setLastChordToast({ message: result.chordResult.message, key: Date.now() });
        } else if (result.rating === 'PERFECT' || result.rating === 'GREAT') {
          if (stats.currentCombo >= 5 && stats.currentCombo % 5 === 0) {
            setCharacterState('combo');
            setCharacterMessage(`${stats.currentCombo} 콤보! 대단해요! 🚀`);
          } else {
            setCharacterState('happy');
            setCharacterMessage(result.rating === 'PERFECT' ? '완벽해요! ⭐' : '좋아요! 👍');
          }
        } else if (result.rating === 'MISS') {
          setCharacterState('encourage');
          setCharacterMessage('괜찮아요! 다음 음표를 노려봐요 💕');
        }
      }
    },
    [fallingNotes, song.tempoBpm, triggerKey]
  );

  // STEP 03-B: 현재 히트라인 부근의 가장 가까운 목표 음표 계산
  const currentTargetNote = useMemo(() => {
    const nearNotes = fallingNotes.filter(
      (n) => !n.isRest && n.beatTime >= currentBeat - 0.6 && n.beatTime <= currentBeat + 1.4
    );
    if (nearNotes.length === 0) return null;
    nearNotes.sort((a, b) => Math.abs(a.beatTime - currentBeat) - Math.abs(b.beatTime - currentBeat));
    return { pitch: nearNotes[0].pitch, keyIndex: nearNotes[0].keyIndex };
  }, [fallingNotes, currentBeat]);

  // 목표 음표 변경 시 마이크 판정 엔진에 업데이트
  useEffect(() => {
    if (acousticJudgeRef.current) {
      acousticJudgeRef.current.setTargetNote(currentTargetNote);
    }
  }, [currentTargetNote]);

  // 실물 마이크 인식 타격 시 연주 입력 자동 트리거
  useEffect(() => {
    if (!acousticJudgeRef.current) return;
    acousticJudgeRef.current.onValidNoteHit = (evalResult) => {
      if (inputMode === 'acoustic_mic' && evalResult.detectedKey) {
        handleUserNoteInput(evalResult.detectedKey.index, evalResult.detectedKey.pitch);
      }
    };
  }, [inputMode, handleUserNoteInput]);

  // Animation Loop
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      const deltaMs = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (isPlayingRef.current) {
        const beatsPerSecond = (song.tempoBpm / 60) * (speedPercentRef.current / 100);
        const deltaBeats = (deltaMs / 1000) * beatsPerSecond;

        const prevBeat = currentBeatRef.current;
        const nextBeat = prevBeat + deltaBeats;
        currentBeatRef.current = nextBeat;
        setCurrentBeat(nextBeat);

        // 타격선을 지나쳐버린 음표(Pass Miss) 자동 판정 (쉼표는 자동 제외)
        const missedIds = judgeManagerRef.current.checkPassedNotes(
          nextBeat,
          song.tempoBpm,
          speedPercentRef.current / 100,
          fallingNotes
        );
        if (missedIds.length > 0) {
          const stats = judgeManagerRef.current.getStats();
          setComboStats(stats);
          setRatingTrigger((prev) => prev + 1);
          setCharacterState('encourage');
          setCharacterMessage('아쉬워요! 박자에 맞춰 다시 도전! 🎶');
        }

        // 가이드 사운드 및 타격선 도달 음표 스파클 효과 (사용자가 이미 친 음표는 중복 타격 방지)
        fallingNotes.forEach((item) => {
          if (nextBeat >= item.beatTime && prevBeat < item.beatTime) {
            if (!judgeManagerRef.current.isNoteJudged(item.id)) {
              triggerKey(
                item.keyIndex,
                item.pitch,
                item.color === 'green' ? 'green' : item.color === 'orange' ? 'orange' : 'teal',
                item.duration,
                item.dynamicAccent || 1.0,
                item.beatInMeasure
              );
            }

            setSparkleNoteIds((prev) => ({ ...prev, [item.id]: true }));
            setTimeout(() => {
              setSparkleNoteIds((prev) => {
                const copy = { ...prev };
                delete copy[item.id];
                return copy;
              });
            }, 600);
          }
        });

        // Update progress counter
        let newlyCompleted = 0;
        fallingNotes.forEach((item) => {
          if (nextBeat >= item.beatTime) {
            newlyCompleted = Math.max(newlyCompleted, item.noteIndex + 1);
          }
        });
        setCompletedNoteCount(newlyCompleted);

        // Song end check: wait until the final note finishes ringing before showing completion modal
        const endBeatThreshold = timeline.audibleEndBeat;
        if (!hasCompletedRef.current && nextBeat > endBeatThreshold) {
          if (currentIterationRef.current < targetRepeatsRef.current) {
            // 다음 회차 반복 연주 (찬송가 3~4회 묵상 루프)
            currentIterationRef.current += 1;
            setCurrentIteration(currentIterationRef.current);
            currentBeatRef.current = INITIAL_LEAD_IN_BEATS;
            setCurrentBeat(INITIAL_LEAD_IN_BEATS);
            setCompletedNoteCount(0);
            setCheerText(`은혜로운 ${currentIterationRef.current}번째 연주 시작! 💖`);
            setShowCheer(true);
            setCharacterState('happy');
            setCharacterMessage(`은혜로운 ${currentIterationRef.current}번째 연주 시작! 💖`);
          } else {
            hasCompletedRef.current = true;
            setCharacterState('celebrate');
            setCharacterMessage('와아! 멋지게 완주했어요! 🏆');
            const finalStats = judgeManagerRef.current.getStats();
            if (onSongComplete) onSongComplete(finalStats);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [fallingNotes, onSongComplete, song.tempoBpm, triggerKey, timeline.audibleEndBeat]);

  // Number keys (1-7) support for intuitive playing
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't trigger if focus is in an input
      if (e.target instanceof HTMLInputElement) return;

      const numMap: { [key: string]: string } = {
        '1': 'C4',
        '2': 'D4',
        '3': 'E4',
        '4': 'F4',
        '5': 'G4',
        '6': 'A4',
        '7': 'B4',
      };
      if (numMap[e.key]) {
        const pitch = numMap[e.key];
        const keyDef = PITCH_TO_KEY.get(pitch);
        if (keyDef) {
          handleUserNoteInput(keyDef.index, pitch);
          setShowCheer(true);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleUserNoteInput]);

  // Restart handler
  const handleRestartGame = () => {
    hasCompletedRef.current = false;
    lastTimeRef.current = null;
    currentBeatRef.current = INITIAL_LEAD_IN_BEATS;
    setCurrentBeat(INITIAL_LEAD_IN_BEATS);
    currentIterationRef.current = 1;
    setCurrentIteration(1);
    setCompletedNoteCount(0);
    setSparkleNoteIds({});
    setActiveTineIndexes({});
    setShowCheer(false);
    judgeManagerRef.current.reset(timeline.totalPlayableNotes);
    setComboStats(judgeManagerRef.current.getStats());
    setCharacterState('idle');
    setCharacterMessage('');
    onRestart();
  };

  // Multi-touch Controller for Mobile & Tablet 17-Key Kalimba
  const touchControllerRef = useRef<KalimbaTouchController>(new KalimbaTouchController());
  const lastPointerTriggerTimeRef = useRef<{ [keyIndex: number]: number }>({});

  useEffect(() => {
    touchControllerRef.current.setHandlers({
      onKeyDown: (keyIndex: number) => {
        const k = KALIMBA_KEYS[keyIndex];
        if (k) {
          lastPointerTriggerTimeRef.current[keyIndex] = Date.now();
          handleUserNoteInput(k.index, k.pitch);
          setShowCheer(true);
        }
      },
      onKeyUp: () => {
        // Tine release
      },
    });
  }, [handleUserNoteInput]);

  // Click on a tine (fallback for non-pointer legacy inputs)
  const handleTineClick = (k: KalimbaKeyDef) => {
    handleUserNoteInput(k.index, k.pitch);
    setShowCheer(true);
  };

  // Toggle difficulty between 쉬움, 보통, 어려움
  const handleCycleDifficulty = () => {
    const list = ['보통', '어려움', '쉬움'];
    const nextIdx = (list.indexOf(difficulty) + 1) % list.length;
    onChangeDifficulty(list[nextIdx]);
  };

  // Waterfall geometry
  const BEAT_HEIGHT_PX = 140; // pixel distance per beat
  const STRIKE_LINE_Y_PERCENT = 54; // strike line position: 54% from top

  return (
    <div className="relative w-full min-h-[680px] min-h-screen bg-[#0c0827] text-white flex flex-col justify-between overflow-y-auto overflow-x-hidden select-none font-['Jua',sans-serif]">
      {/* Deep Space Indigo Radial Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,#191244_0%,#0c0827_85%)] pointer-events-none" />

      {/* TOP HEADER BAR (Exact 1:1 match to reference screenshot) */}
      <header className="relative z-30 w-full px-4 sm:px-8 pt-4 pb-2 flex items-start justify-between">
        {/* Left: Song Title, Difficulty Pill, Progress Bar & Star Counter */}
        <div className="flex flex-col space-y-2">
          {/* Title and Difficulty Badge */}
          <div className="flex items-center space-x-3">
            <h1
              onClick={onOpenExitModal}
              className="text-2xl sm:text-3xl font-extrabold tracking-normal text-white cursor-pointer hover:text-cyan-300 transition flex items-center drop-shadow-md"
              title="클릭하여 곡 변경하기"
            >
              {song.title}
            </h1>

            {/* Difficulty Pill ("보통") matching image badge */}
            <button
              onClick={handleCycleDifficulty}
              className="bg-[#153e4f] hover:bg-[#1a4e63] text-[#4edcd0] border border-[#2b647c] px-3 py-0.5 rounded-full text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer active:scale-95 flex items-center space-x-1"
              title="난이도 변경 (클릭)"
            >
              <span>{difficulty}</span>
            </button>

            {/* 반복 연주 배지 & 컨트롤 (찬송가 기본 3회 반복 권장, 클릭 시 1회 -> 3회 -> 4회 전환) */}
            <button
              onClick={() => {
                const cycle = [1, 3, 4];
                const nextIdx = (cycle.indexOf(targetRepeats) + 1) % cycle.length;
                const nextVal = cycle[nextIdx];
                setTargetRepeats(nextVal);
              }}
              className="bg-[#241e4b] hover:bg-[#342b6a] text-amber-300 border border-amber-400/40 px-3 py-0.5 rounded-full text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer active:scale-95 flex items-center space-x-1"
              title="반복 연주 횟수 변경 (클릭: 1회, 3회, 4회)"
            >
              <span>🔁 {targetRepeats > 1 ? `${currentIteration}/${targetRepeats}회` : '1회'}</span>
            </button>
          </div>

          {/* Progress Bar & Note/Star Counter */}
          <div className="flex items-center space-x-3 pt-0.5">
            {/* Cyan Pill Progress Bar */}
            <div className="w-40 sm:w-52 h-6 sm:h-7 rounded-full bg-[#122243] border border-[#235882] p-0.5 overflow-hidden flex items-center relative shadow-inner">
              <div
                className="h-full bg-linear-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] rounded-full transition-all duration-150 shadow-[0_0_12px_#38bdf8]"
                style={{ width: `${progressPercent}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs sm:text-sm font-bold text-white drop-shadow-md">
                {progressPercent}%
              </span>
            </div>

            {/* Star Counter (⭐ 18 / 24) */}
            <div className="flex items-center space-x-1.5 text-lg sm:text-xl font-extrabold text-white drop-shadow-md">
              <span className="text-xl sm:text-2xl text-amber-400 drop-shadow-[0_0_8px_#facc15]">⭐</span>
              <span>
                {completedNoteCount} / {totalNotes}
              </span>
            </div>
          </div>
        </div>

        {/* Center: 3 Round Action Buttons [재생/정지], [처음부터], [연습 종료] */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Button 1: 재생/정지 */}
          <div className="flex flex-col items-center">
            <button
              onClick={onTogglePlay}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#4edcd0] hover:bg-[#38bdf8] active:scale-95 text-[#12163a] flex items-center justify-center shadow-[0_4px_16px_rgba(78,220,208,0.5)] transition cursor-pointer border-2 border-white/20"
              aria-label={isPlaying ? '정지' : '재생'}
            >
              {isPlaying ? (
                <div className="flex space-x-1.5">
                  <div className="w-1.5 sm:w-2 h-5 sm:h-6 bg-[#12163a] rounded-full" />
                  <div className="w-1.5 sm:w-2 h-5 sm:h-6 bg-[#12163a] rounded-full" />
                </div>
              ) : (
                <div className="w-0 h-0 border-y-7 sm:border-y-8 border-y-transparent border-l-12 sm:border-l-14 border-l-[#12163a] ml-1" />
              )}
            </button>
            <span className="text-xs sm:text-sm text-white font-bold mt-1.5 drop-shadow-md">재생/정지</span>
          </div>

          {/* Button 2: 처음부터 */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleRestartGame}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#8c88f8] hover:bg-[#7c73e6] active:scale-95 text-[#12163a] flex items-center justify-center shadow-[0_4px_16px_rgba(140,136,248,0.5)] transition cursor-pointer border-2 border-white/20"
              aria-label="처음부터"
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3.5] text-[#12163a]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
            <span className="text-xs sm:text-sm text-white font-bold mt-1.5 drop-shadow-md">처음부터</span>
          </div>

          {/* Button 3: 연습 종료 */}
          <div className="flex flex-col items-center">
            <button
              onClick={onOpenExitModal}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#f87171] hover:bg-[#ef4444] active:scale-95 text-white flex items-center justify-center shadow-[0_4px_16px_rgba(248,113,113,0.5)] transition cursor-pointer border-2 border-white/20"
              aria-label="연습 종료"
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 stroke-[4] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
            <span className="text-xs sm:text-sm text-white font-bold mt-1.5 drop-shadow-md">연습 종료</span>
          </div>
        </div>

        {/* Right: Speed Slider & Mode Switch */}
        <div className="flex items-center space-x-3 sm:space-x-5">
          {/* STEP 03-B: 입력 모드 전환 (화면 터치 vs 실물 칼림바 마이크) */}
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold text-indigo-200 mb-1">입력 방식</span>
            <div className="flex items-center p-0.5 rounded-full bg-indigo-950/80 border border-indigo-400/30">
              <button
                type="button"
                onClick={() => handleToggleInputMode('touch')}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  inputMode === 'touch'
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-indigo-300 hover:text-white'
                }`}
              >
                👆 터치
              </button>
              <button
                type="button"
                onClick={() => handleToggleInputMode('acoustic_mic')}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  inputMode === 'acoustic_mic'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30 font-black'
                    : 'text-indigo-300 hover:text-white'
                }`}
              >
                🎤 실물
              </button>
            </div>
          </div>

          {/* STEP 03-A: 연습 모드 전환 (단선율 vs 화음·양손 가이드) */}
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold text-purple-200 mb-1">연습 모드</span>
            <div className="flex items-center p-0.5 rounded-full bg-purple-950/80 border border-purple-400/30">
              <button
                type="button"
                onClick={() => setPracticeMode('melody')}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  practiceMode === 'melody'
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                단선율
              </button>
              <button
                type="button"
                onClick={() => setPracticeMode('chord')}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  practiceMode !== 'melody'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/30 font-black'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                화음·양손
              </button>
            </div>
          </div>

          {/* Speed Slider & Quick Presets */}
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-1 mb-1">
              <span className="text-xs sm:text-sm font-bold text-white drop-shadow-md">
                속도: <strong className="text-cyan-300">{speedPercent}%</strong>
              </span>
            </div>
            {/* Quick Presets for Kids */}
            <div className="flex items-center space-x-1 mb-1.5">
              <button
                type="button"
                onClick={() => onChangeSpeed(70)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer border ${
                  speedPercent === 70
                    ? 'bg-amber-400 text-amber-950 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.5)] font-black'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 border-white/20'
                }`}
                title="천천히 연습하기 (70%)"
              >
                🐢 70%
              </button>
              <button
                type="button"
                onClick={() => onChangeSpeed(100)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer border ${
                  speedPercent === 100
                    ? 'bg-cyan-400 text-[#0c0827] border-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.5)] font-black'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 border-white/20'
                }`}
                title="보통 속도로 연습하기 (100%)"
              >
                🐰 100%
              </button>
              <button
                type="button"
                onClick={() => onChangeSpeed(120)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer border ${
                  speedPercent === 120
                    ? 'bg-emerald-400 text-emerald-950 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.5)] font-black'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 border-white/20'
                }`}
                title="빠르게 연습하기 (120%)"
              >
                🚀 120%
              </button>
            </div>
            {/* Slider on desktop */}
            <div className="hidden md:flex w-36 sm:w-44 relative items-center">
              <input
                type="range"
                min="50"
                max="150"
                step="5"
                value={speedPercent}
                onChange={(e) => onChangeSpeed(Number(e.target.value))}
                className="w-full h-2.5 bg-[#1f2258] rounded-full appearance-none cursor-pointer accent-cyan-400 focus:outline-hidden"
                aria-label="속도 조절 슬라이더"
              />
            </div>
          </div>

          {/* Yellow Exit Squircle Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={onOpenExitModal}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#fbbf24] hover:bg-[#f59e0b] active:scale-95 text-[#78350f] flex items-center justify-center shadow-[0_4px_16px_rgba(251,191,36,0.5)] transition cursor-pointer border-2 border-[#fef08a]"
              aria-label="연습 종료"
            >
              <svg className="w-7 h-7 sm:w-8 sm:h-8 stroke-[4] text-[#78350f]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
            <span className="text-xs sm:text-sm text-white font-bold mt-1.5 drop-shadow-md">연습 종료</span>
          </div>
        </div>
      </header>

      {/* STEP 02-A: 구구가가 캐릭터 인터랙티브 반응 위젯 (상단 우측 안전 구역) */}
      <div className="absolute right-4 sm:right-8 top-24 z-30 pointer-events-none">
        <GuguGagaReaction
          state={characterState}
          combo={comboStats.currentCombo}
          message={characterMessage}
        />
      </div>

      {/* STEP 02-A: 리듬 판정 & 콤보 팝업 디스플레이 (화면 중앙 상단) */}
      <ComboDisplay
        combo={comboStats.currentCombo}
        lastRating={comboStats.lastRating}
        ratingTrigger={ratingTrigger}
      />

      {/* STEP 03-B: 실물 칼림바 마이크 인디케이터 (마이크 모드일 때 상단 표시) */}
      {inputMode === 'acoustic_mic' && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md pointer-events-auto">
          <MicrophoneAcousticIndicator
            evaluation={acousticEvaluation}
            isListening={isMicListening}
            onToggleMic={toggleMicListening}
            targetPitch={currentTargetNote?.pitch}
          />
        </div>
      )}

      {/* CHEER BADGE (Right side: ⭐ 잘했어요!) */}
      {showCheer && (
        <div className="absolute right-4 sm:right-12 top-[38%] z-30 flex items-center space-x-2 text-white font-extrabold text-xl sm:text-3xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] pointer-events-none animate-bounce">
          <span className="text-2xl sm:text-4xl text-amber-400 drop-shadow-[0_0_10px_#facc15]">⭐</span>
          <span className="tracking-wide">{cheerText}</span>
          <span className="text-white/40 text-lg">✦</span>
        </div>
      )}

      {/* SUBTLE CORNER STAR SPARKLE */}
      <div className="absolute right-8 bottom-6 text-white/20 text-3xl sm:text-4xl pointer-events-none select-none">
        ✦
      </div>

      {/* WATERFALL TRACKS & FALLING NOTES AREA */}
      <div className="relative flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 overflow-hidden">
        {/* 17 Vertical Column Track Stripes */}
        <div className="absolute inset-0 flex items-stretch pointer-events-none">
          {KALIMBA_KEYS.map((k, idx) => (
            <div
              key={k.index}
              className={`flex-1 h-full border-r border-white/[0.04] ${
                idx % 2 === 0 ? 'bg-white/[0.015]' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Falling Note Blocks & STEP 03-A Chord Bridge Connections */}
        <div className="absolute inset-0 pointer-events-none">
          {/* 1. 화음 연결선 (Chord Bridge Connection Lines) */}
          {practiceMode !== 'melody' &&
            timeline.chordGroups.map((chord) => {
              const diffBeats = chord.startBeat - currentBeat;
              if (diffBeats > 4.5 || diffBeats < -1.0) return null;

              const colWidthPercent = 100 / 17;
              const minKey = Math.min(...chord.keyIndexes);
              const maxKey = Math.max(...chord.keyIndexes);
              const leftPercent = minKey * colWidthPercent + colWidthPercent / 2;
              const widthPercent = (maxKey - minKey) * colWidthPercent;
              const yOffsetPx = diffBeats * BEAT_HEIGHT_PX;

              return (
                <div
                  key={chord.chordId}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    top: `calc(${STRIKE_LINE_Y_PERCENT}% - 28px - ${yOffsetPx}px + 18px)`,
                  }}
                  className="absolute h-1.5 bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-300 shadow-[0_0_12px_rgba(236,72,153,0.8)] rounded-full z-0 flex items-center justify-center animate-pulse"
                >
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-950/90 text-pink-300 border border-pink-400/60 shadow-xs whitespace-nowrap -mt-4">
                    ✨ {chord.isTwoHanded ? '양손 화음' : '화음'}
                  </span>
                </div>
              );
            })}

          {/* 2. 음표 블록 (Note Pill Blocks) */}
          {fallingNotes.map((item) => {
            const diffBeats = item.beatTime - currentBeat;
            // Only render notes currently in view
            if (diffBeats > 4.5 || diffBeats < -1.0) return null;

            const colWidthPercent = 100 / 17;
            const leftPercent = item.keyIndex * colWidthPercent;
            const yOffsetPx = diffBeats * BEAT_HEIGHT_PX;
            const isSparkling = Boolean(sparkleNoteIds[item.id]);

            return (
              <div
                key={item.id}
                style={{
                  left: `${leftPercent}%`,
                  width: `${colWidthPercent}%`,
                  top: `calc(${STRIKE_LINE_Y_PERCENT}% - 28px - ${yOffsetPx}px)`,
                }}
                className="absolute flex items-center justify-center p-0.5 sm:p-1 transition-transform z-10"
              >
                {/* Note Pill Block */}
                <div
                  className={`w-[92%] py-2 sm:py-2.5 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border-2 shadow-lg transition-transform relative ${
                    item.color === 'orange'
                      ? 'bg-linear-to-b from-[#fb923c] to-[#ea580c] border-[#fdba74] text-white shadow-orange-950/60'
                      : item.color === 'green'
                      ? 'bg-linear-to-b from-[#86efac] to-[#22c55e] border-[#bbf7d0] text-emerald-950 shadow-green-950/60'
                      : item.color === 'blue'
                      ? 'bg-linear-to-b from-[#60a5fa] to-[#2563eb] border-[#93c5fd] text-white shadow-blue-950/60'
                      : 'bg-linear-to-b from-[#2dd4bf] to-[#0d9488] border-[#99f6e4] text-white shadow-teal-950/60'
                  } ${isSparkling ? 'scale-110 ring-4 ring-cyan-300 shadow-[0_0_25px_#22d3ee]' : ''}`}
                >
                  {/* STEP 03-A: 양손 연주 가이드 뱃지 */}
                  {practiceMode !== 'melody' && (
                    <div
                      className={`absolute -top-2.5 px-1.5 py-0.2 rounded-full text-[9px] font-black shadow-md border ${
                        item.hand === 'left'
                          ? 'bg-indigo-600 text-indigo-100 border-indigo-300'
                          : item.hand === 'right'
                          ? 'bg-rose-600 text-rose-100 border-rose-300'
                          : 'bg-emerald-600 text-emerald-100 border-emerald-300'
                      }`}
                    >
                      {item.hand === 'left' ? 'L 왼손' : item.hand === 'right' ? 'R 오른손' : 'C 양손'}
                    </div>
                  )}

                  <span className="text-base sm:text-xl font-black leading-none drop-shadow-xs">
                    {item.numberNotation}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold leading-tight opacity-95">
                    ({item.pitch})
                  </span>
                </div>

                {/* Sparkling Stars around note when on strike line */}
                {isSparkling && (
                  <>
                    <span className="absolute -top-3 -left-2 text-cyan-200 text-base animate-ping">✦</span>
                    <span className="absolute -top-3 -right-2 text-white text-lg animate-pulse">✨</span>
                    <span className="absolute -bottom-2 -left-2 text-white text-lg animate-pulse">✨</span>
                    <span className="absolute -bottom-2 -right-2 text-cyan-200 text-base animate-ping">✦</span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* GLOWING CYAN STRIKE LINE */}
        <div
          style={{ top: `${STRIKE_LINE_Y_PERCENT}%` }}
          className="absolute inset-x-0 h-1 sm:h-1.5 bg-[#00f0ff] shadow-[0_0_12px_#00f0ff,0_0_25px_#00d2ff,0_0_45px_#0284c7] z-20 pointer-events-none"
        />

        {/* SPEECH BUBBLE (Centered on C 1 center tine with downward arrow) */}
        <div
          style={{
            top: `${STRIKE_LINE_Y_PERCENT + 4}%`,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          className="absolute z-30 pointer-events-none flex flex-col items-center"
        >
          <div className="bg-white text-[#1e1b4b] font-black px-5 sm:px-7 py-2.5 sm:py-3 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.6)] text-xs sm:text-base tracking-tight border border-white/60 whitespace-nowrap">
            왼쪽/오른쪽에서 반짝이는 건반을 눌러 봐요!
          </div>
          {/* Downward triangle arrow pointing to center key */}
          <div className="w-0 h-0 border-x-8 sm:border-x-9 border-x-transparent border-t-8 sm:border-t-9 border-t-white mt-[-1px]" />
        </div>

        {/* THE 17 KALIMBA TINES */}
        <div
          style={{ top: `${STRIKE_LINE_Y_PERCENT}%` }}
          className="absolute inset-x-0 bottom-0 flex items-start justify-center px-1 sm:px-2 z-10"
        >
          {KALIMBA_KEYS.map((k) => {
            const isCenterKey = k.isCenter;
            const activeColor = activeTineIndexes[k.index];
            const isGlowing = Boolean(activeColor);

            const heightPercent = k.tineHeightPercent;

            return (
              <button
                key={k.index}
                onPointerDown={(e) => touchControllerRef.current.handlePointerDown(e, k.index)}
                onPointerUp={(e) => touchControllerRef.current.handlePointerUp(e, k.index)}
                onPointerCancel={(e) => touchControllerRef.current.handlePointerCancel(e, k.index)}
                onLostPointerCapture={(e) => touchControllerRef.current.handleLostPointerCapture(e, k.index)}
                onClick={() => {
                  const lastTime = lastPointerTriggerTimeRef.current[k.index] || 0;
                  if (Date.now() - lastTime < 350) return;
                  handleTineClick(k);
                }}
                style={{
                  height: `${heightPercent * 0.95}%`,
                  maxHeight: '44vh',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
                className={`flex-1 mx-0.5 sm:mx-1 rounded-b-2xl sm:rounded-b-3xl transition-all cursor-pointer flex flex-col justify-between items-center py-2 sm:py-3 select-none active:scale-98 ${
                  isGlowing
                    ? activeColor === 'green'
                      ? 'bg-linear-to-b from-[#86efac] via-[#4ade80] to-[#22c55e] border-2 border-[#bbf7d0] text-emerald-950 shadow-[0_0_25px_#4ade80,0_0_50px_rgba(74,222,128,0.7)] z-20'
                      : activeColor === 'orange'
                      ? 'bg-linear-to-b from-[#fdba74] via-[#fb923c] to-[#ea580c] border-2 border-[#fed7aa] text-amber-950 shadow-[0_0_25px_#fb923c,0_0_50px_rgba(251,146,60,0.7)] z-20'
                      : 'bg-linear-to-b from-[#2dd4bf] via-[#14b8a6] to-[#0d9488] border-2 border-[#99f6e4] text-white shadow-[0_0_25px_#2dd4bf] z-20'
                    : isCenterKey
                    ? 'bg-linear-to-b from-[#2dd4bf]/40 via-[#14b8a6]/50 to-[#0f766e]/75 border-[3.5px] sm:border-4 border-[#ff4d79] shadow-[0_0_20px_rgba(255,77,121,0.65)]'
                    : 'bg-linear-to-b from-[#2dd4bf]/40 via-[#14b8a6]/50 to-[#0f766e]/75 border-2 border-[#5eead4]/45 hover:border-[#5eead4]/80 text-white shadow-md'
                }`}
                title={`${k.letter} (${k.pitch})`}
              >
                {/* Note Letter on Top */}
                <div
                  className={`font-black text-sm sm:text-xl tracking-tight leading-none ${
                    isGlowing ? (activeColor === 'green' ? 'text-emerald-950' : 'text-amber-950') : 'text-white'
                  }`}
                >
                  {k.letter}
                </div>

                {/* Octave Dots (: for 2 dots, • for 1 dot) */}
                <div className="flex flex-col items-center justify-center -my-1">
                  {k.dots === 2 ? (
                    <span
                      className={`text-sm sm:text-base font-black leading-none ${
                        isGlowing ? 'text-black' : 'text-white'
                      }`}
                    >
                      :
                    </span>
                  ) : k.dots === 1 ? (
                    <span
                      className={`text-base sm:text-lg font-black leading-none ${
                        isGlowing ? 'text-black' : 'text-white'
                      }`}
                    >
                      •
                    </span>
                  ) : (
                    <span className="opacity-0 text-xs">•</span>
                  )}
                </div>

                {/* Number & Center Badge at Bottom */}
                <div className="flex flex-col items-center w-full">
                  <span
                    className={`font-black text-base sm:text-2xl leading-none ${
                      isGlowing ? (activeColor === 'green' ? 'text-emerald-950' : 'text-amber-950') : 'text-white'
                    }`}
                  >
                    {k.numberNotation}
                  </span>

                  {/* Pink '가운데' pill on C 1 center key */}
                  {isCenterKey && (
                    <span className="mt-1 bg-[#ff4d79] text-white text-[9px] sm:text-[11px] font-black px-2 sm:px-3 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                      가운데
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
