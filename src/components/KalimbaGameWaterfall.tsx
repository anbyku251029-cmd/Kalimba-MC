import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KALIMBA_KEYS, KalimbaKeyDef, PITCH_TO_KEY } from '../constants/kalimbaKeys';
import { Song } from '../types/music';
import { audioEngine } from '../utils/audioEngine';

interface FallingNoteItem {
  id: string;
  noteIndex: number;
  pitch: string;
  numberNotation: string;
  keyIndex: number;
  beatTime: number; // in beats from start of song
  duration: number;
  color: 'orange' | 'green' | 'blue' | 'teal';
}

interface KalimbaGameWaterfallProps {
  song: Song;
  difficulty: string; // '보통' | '쉬움' | '어려움'
  speedPercent: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onOpenExitModal: () => void;
  onChangeSpeed: (speed: number) => void;
  onChangeDifficulty: (difficulty: string) => void;
  onSongComplete?: () => void;
}

const INITIAL_LEAD_IN_BEATS = -2.0;

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

  // Build falling notes stream from the beginning of the song (excluding rests from visual blocks while preserving their beat timing)
  const fallingNotes: FallingNoteItem[] = React.useMemo(() => {
    let accumulatedBeats = 0.0;
    const items: FallingNoteItem[] = [];

    song.notes.forEach((note) => {
      if (note.isRest || note.pitch === 'REST') {
        accumulatedBeats += note.duration;
        return;
      }

      const key = PITCH_TO_KEY.get(note.pitch);
      const keyIndex = key ? key.index : 8;

      let color: 'orange' | 'green' | 'blue' | 'teal' = 'orange';
      if (note.pitch.startsWith('E')) {
        color = 'green';
      } else if (note.pitch.startsWith('G')) {
        color = 'blue';
      } else if (note.pitch.startsWith('D')) {
        color = 'orange';
      } else if (note.pitch.startsWith('C')) {
        color = 'orange';
      } else if (note.pitch.startsWith('F')) {
        color = 'teal';
      } else {
        color = 'blue';
      }

      const playableNoteIndex = items.length;
      items.push({
        id: `note-${playableNoteIndex}-${note.pitch}`,
        noteIndex: playableNoteIndex,
        pitch: note.pitch,
        numberNotation: key ? key.numberNotation : '1',
        keyIndex,
        beatTime: accumulatedBeats,
        duration: note.duration,
        color,
      });

      accumulatedBeats += note.duration;
    });

    return items;
  }, [song]);

  const totalNotes = fallingNotes.length > 0 ? fallingNotes.length : 1;
  const progressPercent = Math.min(100, Math.round((completedNoteCount / totalNotes) * 100));

  // Sound and glowing tine trigger
  const triggerKey = useCallback(
    (keyIndex: number, pitch: string, color: 'green' | 'orange' | 'teal' = 'green', durationBeats: number = 1) => {
      audioEngine.playNote(pitch, durationBeats, song.tempoBpm, speedPercentRef.current / 100);

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
    [song.tempoBpm]
  );

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

        // Check note hits on the cyan strike line
        fallingNotes.forEach((item) => {
          if (nextBeat >= item.beatTime && prevBeat < item.beatTime) {
            triggerKey(
              item.keyIndex,
              item.pitch,
              item.color === 'green' ? 'green' : item.color === 'orange' ? 'orange' : 'teal',
              item.duration
            );

            setSparkleNoteIds((prev) => ({ ...prev, [item.id]: true }));
            setShowCheer(true);
            const cheers = ['잘했어요!', '완벽해요!', '참 잘했어요! ⭐', '멋져요!'];
            setCheerText(cheers[Math.floor(Math.random() * cheers.length)]);

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
        const lastNote = fallingNotes[fallingNotes.length - 1];
        const endBeatThreshold = lastNote ? lastNote.beatTime + Math.max(2.0, lastNote.duration + 1.0) : 2.0;
        if (!hasCompletedRef.current && nextBeat > endBeatThreshold) {
          hasCompletedRef.current = true;
          if (onSongComplete) onSongComplete();
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
  }, [fallingNotes, onSongComplete, song.tempoBpm, triggerKey]);

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
          triggerKey(
            keyDef.index,
            pitch,
            keyDef.isCenter ? 'orange' : keyDef.index % 2 === 0 ? 'green' : 'orange'
          );
          setShowCheer(true);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [triggerKey]);

  // Restart handler
  const handleRestartGame = () => {
    hasCompletedRef.current = false;
    lastTimeRef.current = null;
    currentBeatRef.current = INITIAL_LEAD_IN_BEATS;
    setCurrentBeat(INITIAL_LEAD_IN_BEATS);
    setCompletedNoteCount(0);
    setSparkleNoteIds({});
    setActiveTineIndexes({});
    setShowCheer(false);
    onRestart();
  };

  // Click on a tine
  const handleTineClick = (k: KalimbaKeyDef) => {
    triggerKey(k.index, k.pitch, k.isCenter ? 'orange' : k.index % 2 === 0 ? 'green' : 'orange');
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
    <div className="relative w-full h-screen max-h-screen bg-[#0c0827] text-white flex flex-col justify-between overflow-hidden select-none font-['Jua',sans-serif]">
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

        {/* Right: Speed Slider & Yellow Exit Squircle */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Speed Slider */}
          <div className="hidden md:flex flex-col items-center">
            <span className="text-sm sm:text-base font-bold text-white mb-1.5 drop-shadow-md">
              속도: {speedPercent}%
            </span>
            <div className="w-36 sm:w-44 relative flex items-center">
              <input
                type="range"
                min="50"
                max="150"
                step="5"
                value={speedPercent}
                onChange={(e) => onChangeSpeed(Number(e.target.value))}
                className="w-full h-3 bg-[#1f2258] rounded-full appearance-none cursor-pointer accent-white focus:outline-hidden"
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

        {/* Falling Note Blocks */}
        <div className="absolute inset-0 pointer-events-none">
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
                className="absolute flex items-center justify-center p-0.5 sm:p-1 transition-transform"
              >
                {/* Note Pill Block */}
                <div
                  className={`w-[92%] py-2 sm:py-2.5 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border-2 shadow-lg transition-transform ${
                    item.color === 'orange'
                      ? 'bg-linear-to-b from-[#fb923c] to-[#ea580c] border-[#fdba74] text-white shadow-orange-950/60'
                      : item.color === 'green'
                      ? 'bg-linear-to-b from-[#86efac] to-[#22c55e] border-[#bbf7d0] text-emerald-950 shadow-green-950/60'
                      : item.color === 'blue'
                      ? 'bg-linear-to-b from-[#60a5fa] to-[#2563eb] border-[#93c5fd] text-white shadow-blue-950/60'
                      : 'bg-linear-to-b from-[#2dd4bf] to-[#0d9488] border-[#99f6e4] text-white shadow-teal-950/60'
                  } ${isSparkling ? 'scale-110 ring-4 ring-cyan-300 shadow-[0_0_25px_#22d3ee]' : ''}`}
                >
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
                onClick={() => handleTineClick(k)}
                style={{
                  height: `${heightPercent * 0.95}%`,
                  maxHeight: '44vh',
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
