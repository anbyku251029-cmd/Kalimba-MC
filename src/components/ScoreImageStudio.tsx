/**
 * ScoreImageStudio.tsx
 * Kalimba-MC STEP 02-D: 악보 이미지 업로드 및 음표 추출·수정 화면
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Upload, Image as ImageIcon, ZoomIn, ZoomOut, RotateCw, Maximize2,
  Play, Pause, Square, RotateCcw, Undo2, Redo2, Plus, Trash2,
  CheckCircle2, AlertTriangle, AlertCircle, Sparkles, HelpCircle,
  Save, ArrowLeft, ArrowUp, ArrowDown, ChevronRight, Music
} from 'lucide-react';
import {
  ExtractedNote, ScoreOcrSession, ScoreValidationResult
} from '../types/scoreOcrTypes';
import {
  validateImageFile, analyzeStaffLines, createScoreOcrSession,
  notesToRawNotation, rawNotationToExtractedNotes
} from '../utils/scoreOcrEngine';
import { validateScoreForKalimba, shiftNotesOctave, KALIMBA_VALID_PITCHES } from '../utils/scoreValidator';
import { audioEngine } from '../utils/audioEngine';
import { KALIMBA_KEYS, PITCH_TO_KEY } from '../constants/kalimbaKeys';
import { Song } from '../types/music';

interface ScoreImageStudioProps {
  onBack: () => void;
  onSaveSong: (songData: {
    id?: string;
    title: string;
    subTitle?: string;
    description?: string;
    tempoBpm: number;
    timeSignature: '4/4' | '3/4' | '2/4' | '6/8';
    difficulty: '쉬움' | '보통' | '어려움' | '찬송가';
    rawNotation: string;
  }) => void;
}

export const ScoreImageStudio: React.FC<ScoreImageStudioProps> = ({
  onBack,
  onSaveSong,
}) => {
  // 세션 상태
  const [session, setSession] = useState<ScoreOcrSession | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 이미지 뷰어 제어 상태
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showStaffOverlay, setShowStaffOverlay] = useState<boolean>(true);
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // 음표 편집 상태
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // 오디오 미리듣기 상태
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentPlayNoteIndex, setCurrentPlayNoteIndex] = useState<number | null>(null);
  const playbackTimerRef = useRef<number[]>([]);

  // 파일 입력 ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 음역 유효성 검사 결과 (메모이제이션)
  const validationResult: ScoreValidationResult = useMemo(() => {
    if (!session || !session.notes) {
      return {
        status: 'ERROR',
        isValidForKalimba: false,
        totalNotes: 0,
        playableNotes: 0,
        restNotes: 0,
        outOfRangeNotes: 0,
        issues: [],
      };
    }
    return validateScoreForKalimba(session.notes, session.metadata.timeSignature);
  }, [session?.notes, session?.metadata.timeSignature]);

  // 언마운트 시 오디오 및 이미지 메모리 정리
  useEffect(() => {
    return () => {
      audioEngine.stopAll();
      playbackTimerRef.current.forEach((t) => clearTimeout(t));
      if (session?.imageUrl) {
        URL.revokeObjectURL(session.imageUrl);
      }
    };
  }, [session?.imageUrl]);

  // 1. 이미지 파일 처리 핸들러
  const handleProcessFile = async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);

    const validation = await validateImageFile(file);
    if (!validation.valid || !validation.width || !validation.height) {
      setErrorMessage(validation.error || '이미지를 불러올 수 없습니다.');
      setIsProcessing(false);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const newSession = createScoreOcrSession(
      file.name,
      file.size,
      file.type,
      objectUrl,
      validation.width,
      validation.height
    );

    // Canvas 기반 오선 분석 실행
    const { detectedStaffs, isOmrConfident } = await analyzeStaffLines(objectUrl);

    newSession.detectedStaffSystems = detectedStaffs;
    if (isOmrConfident) {
      newSession.status = 'OMR_READY';
      newSession.statusMessage = `악보에서 ${detectedStaffs.length}개 오선 묶음을 성공적으로 감지했습니다.`;
      // 초기 기본 악보 템플릿 로드 (도-미-솔-도 1마디)
      const initialNotes = rawNotationToExtractedNotes('1 3 5 1\' | 5 3 2 1-');
      newSession.notes = initialNotes;
      newSession.originalNotes = JSON.parse(JSON.stringify(initialNotes));
    } else {
      newSession.status = 'MANUAL_ENTRY_MODE';
      newSession.statusMessage =
        '오선 패턴이 불분명하여 스마트 직접 입력 모드로 시작합니다. 악보를 보며 칼림바 건반으로 쉽게 입력해 보세요.';
      const initialNotes = rawNotationToExtractedNotes('1 2 3 1 | 3 4 5 -');
      newSession.notes = initialNotes;
      newSession.originalNotes = JSON.parse(JSON.stringify(initialNotes));
    }

    setSession(newSession);
    setSelectedNoteId(newSession.notes[0]?.id || null);
    setIsProcessing(false);
  };

  // 2. 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // 3. 음표 수정 (Undo 이력 기록)
  const updateNotesWithHistory = (
    newNotes: ExtractedNote[] | ((prev: ExtractedNote[]) => ExtractedNote[])
  ) => {
    if (!session) return;
    setSession((prev) => {
      if (!prev) return null;
      const resolved = typeof newNotes === 'function' ? newNotes(prev.notes) : newNotes;
      const currentHistory = [...prev.history, JSON.parse(JSON.stringify(prev.notes))];
      // 최대 20단계 Undo 보존
      if (currentHistory.length > 20) currentHistory.shift();

      return {
        ...prev,
        notes: resolved,
        history: currentHistory,
        future: [], // 새 작업 시 Redo 스택 초기화
        updatedAt: Date.now(),
      };
    });
  };

  // Undo (실행 취소)
  const handleUndo = () => {
    if (!session || session.history.length === 0) return;
    setSession((prev) => {
      if (!prev || prev.history.length === 0) return prev;
      const historyCopy = [...prev.history];
      const previousState = historyCopy.pop()!;
      const futureCopy = [JSON.parse(JSON.stringify(prev.notes)), ...prev.future];

      return {
        ...prev,
        notes: previousState,
        history: historyCopy,
        future: futureCopy,
      };
    });
  };

  // Redo (다시 실행)
  const handleRedo = () => {
    if (!session || session.future.length === 0) return;
    setSession((prev) => {
      if (!prev || prev.future.length === 0) return prev;
      const futureCopy = [...prev.future];
      const nextState = futureCopy.shift()!;
      const historyCopy = [...prev.history, JSON.parse(JSON.stringify(prev.notes))];

      return {
        ...prev,
        notes: nextState,
        history: historyCopy,
        future: futureCopy,
      };
    });
  };

  // 원본 복원 (Reset to Original)
  const handleResetToOriginal = () => {
    if (!session) return;
    if (window.confirm('원본 추출 상태로 되돌리시겠습니까? 지금까지 수정한 내용이 초기화됩니다.')) {
      updateNotesWithHistory(JSON.parse(JSON.stringify(session.originalNotes)));
    }
  };

  // 4. 개별 음표 조작
  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
    const n = session?.notes.find((item) => item.id === id);
    if (n && !n.isRest && n.pitch !== 'REST') {
      audioEngine.playNote(n.pitch, 1, session?.metadata.tempoBpm || 80);
    }
  };

  // 음높이 변경 (칼림바 건반 팔레트 클릭 시)
  const handleSetPitch = (pitch: string) => {
    if (!session || !selectedNoteId) return;
    const keyDef = PITCH_TO_KEY.get(pitch);
    if (!keyDef) return;

    audioEngine.playNote(pitch, 1, session.metadata.tempoBpm);

    updateNotesWithHistory((prevNotes) =>
      prevNotes.map((n) =>
        n.id === selectedNoteId
          ? {
              ...n,
              pitch: keyDef.pitch,
              solfege: keyDef.solfege,
              octaveLevel: keyDef.octaveLevel,
              numberNotation: keyDef.numberNotation,
              isRest: false,
              userModified: true,
            }
          : n
      )
    );
  };

  // 쉼표로 변경
  const handleSetRest = () => {
    if (!session || !selectedNoteId) return;
    updateNotesWithHistory((prevNotes) =>
      prevNotes.map((n) =>
        n.id === selectedNoteId
          ? {
              ...n,
              pitch: 'REST',
              solfege: '쉼',
              numberNotation: '0',
              octaveLevel: 0,
              isRest: true,
              userModified: true,
            }
          : n
      )
    );
  };

  // 음길이(박자) 변경
  const handleSetDuration = (duration: number) => {
    if (!session || !selectedNoteId) return;
    updateNotesWithHistory((prevNotes) =>
      prevNotes.map((n) =>
        n.id === selectedNoteId
          ? { ...n, duration, userModified: true }
          : n
      )
    );
  };

  // 새 음표 추가
  const handleAddNote = () => {
    if (!session) return;
    const newId = `ext_note_${Date.now()}`;
    const lastNote = session.notes[session.notes.length - 1];
    const newOrder = (lastNote?.order || 0) + 1;
    const measure = lastNote ? lastNote.measureIndex : 1;

    const newNote: ExtractedNote = {
      id: newId,
      order: newOrder,
      pitch: 'C4',
      solfege: '도',
      octaveLevel: 0,
      numberNotation: '1',
      duration: 1,
      isRest: false,
      measureIndex: measure,
      userModified: true,
    };

    updateNotesWithHistory((prev) => [...prev, newNote]);
    setSelectedNoteId(newId);
    audioEngine.playNote('C4', 1, session.metadata.tempoBpm);
  };

  // 음표 삭제
  const handleDeleteNote = (id: string) => {
    if (!session) return;
    if (session.notes.length <= 1) {
      alert('최소 1개의 음표가 유지되어야 합니다.');
      return;
    }
    const idx = session.notes.findIndex((n) => n.id === id);
    const nextSelected = session.notes[idx + 1] || session.notes[idx - 1];

    updateNotesWithHistory((prev) =>
      prev
        .filter((n) => n.id !== id)
        .map((n, i) => ({ ...n, order: i + 1 }))
    );
    setSelectedNoteId(nextSelected ? nextSelected.id : null);
  };

  // 마디 구분선 삽입 (현재 음표 이후 새 마디 시작)
  const handleSplitMeasure = () => {
    if (!session || !selectedNoteId) return;
    const idx = session.notes.findIndex((n) => n.id === selectedNoteId);
    if (idx < 0) return;

    updateNotesWithHistory((prev) =>
      prev.map((n, i) => (i > idx ? { ...n, measureIndex: n.measureIndex + 1, userModified: true } : n))
    );
  };

  // 1옥타브 올리기/내리기 일괄 보정
  const handleShiftOctave = (shift: number) => {
    if (!session) return;
    const shifted = shiftNotesOctave(session.notes, shift);
    updateNotesWithHistory(shifted);
  };

  // 5. 오디오 전체 미리 듣기
  const stopAudio = useCallback(() => {
    playbackTimerRef.current.forEach((t) => clearTimeout(t));
    playbackTimerRef.current = [];
    audioEngine.stopAll();
    setIsPlayingAudio(false);
    setCurrentPlayNoteIndex(null);
  }, []);

  const playAudio = useCallback(() => {
    if (!session || session.notes.length === 0) return;
    stopAudio();
    setIsPlayingAudio(true);
    audioEngine.ensureReady();

    const bpm = session.metadata.tempoBpm || 80;
    const secPerBeat = 60 / bpm;
    let accumulatedTimeSec = 0;

    session.notes.forEach((n, idx) => {
      const startTime = accumulatedTimeSec;
      const durationSec = (n.duration || 1) * secPerBeat;

      const timerId = window.setTimeout(() => {
        setCurrentPlayNoteIndex(idx);
        if (!n.isRest && n.pitch !== 'REST') {
          audioEngine.playNote(n.pitch, n.duration || 1, bpm);
        }
      }, startTime * 1000);

      playbackTimerRef.current.push(timerId);
      accumulatedTimeSec += durationSec;
    });

    // 곡 종료 시 정지
    const endTimerId = window.setTimeout(() => {
      stopAudio();
    }, accumulatedTimeSec * 1000);
    playbackTimerRef.current.push(endTimerId);
  }, [session, stopAudio]);

  // 6. 최종 곡 등록 및 저장
  const handleSaveToKalimba = () => {
    if (!session) return;

    if (validationResult.status === 'ERROR') {
      alert('음역 또는 박자 오류가 있어 저장할 수 없습니다. 오류 항목을 수정한 뒤 다시 시도해 주세요.');
      return;
    }

    const rawNotation = notesToRawNotation(session.notes);

    onSaveSong({
      title: session.metadata.title,
      subTitle: session.metadata.subTitle || '악보 사진에서 추출한 칼림바 악보',
      description: `${session.fileName} 악보 이미지에서 추출 및 수정한 곡입니다.`,
      tempoBpm: session.metadata.tempoBpm,
      timeSignature: session.metadata.timeSignature,
      difficulty: session.metadata.difficulty,
      rawNotation,
    });
  };

  // 이미지 뷰어 마우스 드래그 패닝 제어
  const handleViewerMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleViewerMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleViewerMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <div className="relative w-full min-h-screen bg-[#0c0827] text-white flex flex-col justify-between font-['Jua',sans-serif] select-none p-2 sm:p-6">
      {/* Background Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_15%,#1f144e_0%,#0c0827_85%)] pointer-events-none" />

      {/* 헤더 바 */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 max-w-7xl w-full mx-auto">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              stopAudio();
              onBack();
            }}
            className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-300" />
            <span>돌아가기</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-xl sm:text-2xl">📷</span>
            <h1 className="text-lg sm:text-2xl font-black text-white drop-shadow">
              악보 이미지 음표 추출 & 스마트 에디터
            </h1>
          </div>
        </div>

        {session && (
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handleResetToOriginal}
              className="px-3 py-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1 border border-white/10 transition cursor-pointer active:scale-95"
              title="원본 추출 상태로 초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">원본 복원</span>
            </button>

            <button
              onClick={handleSaveToKalimba}
              disabled={validationResult.status === 'ERROR'}
              className={`px-4 py-2 rounded-2xl font-black text-xs sm:text-sm flex items-center space-x-2 shadow-lg transition cursor-pointer active:scale-95 ${
                validationResult.status === 'ERROR'
                  ? 'bg-slate-600/50 text-slate-400 border border-slate-500/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-emerald-950 border border-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
              }`}
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>칼림바 연주곡으로 등록</span>
            </button>
          </div>
        )}
      </header>

      {/* 메인 작업 영역 */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto my-3 flex flex-col overflow-hidden">
        {!session ? (
          /* 1. 이미지 업로드 대기 화면 */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full max-w-3xl mx-auto my-auto p-8 sm:p-12 rounded-3xl border-3 border-dashed transition-all flex flex-col items-center justify-center text-center ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/15 scale-102 shadow-[0_0_30px_rgba(34,211,238,0.3)]'
                : 'border-white/20 bg-[#16113c]/80 hover:border-cyan-400/50 shadow-2xl'
            }`}
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/30 to-purple-500/30 border border-cyan-400/40 flex items-center justify-center text-4xl mb-4 shadow-inner">
              {isProcessing ? '⏳' : '🎼'}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
              악보 사진 또는 이미지 파일을 올려주세요
            </h2>
            <p className="text-sm text-cyan-200/70 max-w-md mb-6 font-sans">
              종이 악보 사진, 스크린샷 등 이미지를 드래그하여 놓거나 아래 버튼을 눌러 선택해 주세요.
              (지원: PNG, JPG, JPEG, WebP / 최대 15MB)
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-extrabold text-sm sm:text-base flex items-center space-x-2 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition cursor-pointer active:scale-95"
            >
              <Upload className="w-5 h-5" />
              <span>{isProcessing ? '악보 분석 중...' : '악보 이미지 선택하기'}</span>
            </button>

            {errorMessage && (
              <div className="mt-6 p-4 rounded-2xl bg-rose-500/20 border border-rose-400/60 text-rose-200 text-sm font-sans flex items-center space-x-2 animate-bounce">
                <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        ) : (
          /* 2. 2-패널 악보 뷰어 & 음표 에디터 */
          <div className="flex-1 flex flex-col lg:flex-row gap-4 h-full min-h-[580px] overflow-hidden">
            {/* 좌측 패널: 인터랙티브 악보 원본 뷰어 */}
            <div className="flex-1 lg:w-1/2 flex flex-col bg-[#140e3b] rounded-3xl border border-white/15 overflow-hidden shadow-2xl">
              {/* 뷰어 툴바 */}
              <div className="p-3 bg-[#1d164f] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-cyan-200">원본 악보</span>
                  <span className="text-xs text-white/50 truncate max-w-[150px]">
                    {session.fileName}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 text-xs">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 cursor-pointer"
                    title="축소"
                  >
                    <ZoomOut className="w-4 h-4 text-cyan-200" />
                  </button>
                  <span className="text-xs font-mono font-bold w-12 text-center text-cyan-300">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.2))}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 cursor-pointer"
                    title="확대"
                  >
                    <ZoomIn className="w-4 h-4 text-cyan-200" />
                  </button>
                  <button
                    onClick={() => {
                      setZoomLevel(1.0);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 cursor-pointer"
                    title="1:1 맞춤"
                  >
                    <Maximize2 className="w-4 h-4 text-cyan-200" />
                  </button>
                  <button
                    onClick={() => setRotationAngle((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 cursor-pointer"
                    title="90도 회전"
                  >
                    <RotateCw className="w-4 h-4 text-cyan-200" />
                  </button>
                  <button
                    onClick={() => setShowStaffOverlay((prev) => !prev)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      showStaffOverlay
                        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                        : 'bg-white/5 border-white/20 text-white/50'
                    }`}
                    title="오선 검출 박스 표시/숨김"
                  >
                    오선 가이드
                  </button>
                </div>
              </div>

              {/* 뷰어 캔버스 영역 (패닝 & 줌) */}
              <div
                onMouseDown={handleViewerMouseDown}
                onMouseMove={handleViewerMouseMove}
                onMouseUp={handleViewerMouseUp}
                onMouseLeave={handleViewerMouseUp}
                className="relative flex-1 bg-black/50 overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center select-none"
              >
                <div
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel}) rotate(${rotationAngle}deg)`,
                    transformOrigin: 'center center',
                    transition: isPanning ? 'none' : 'transform 0.15s ease-out',
                  }}
                  className="relative pointer-events-none"
                >
                  <img
                    src={session.imageUrl}
                    alt="악보 원본"
                    className="max-w-none rounded-lg shadow-2xl"
                  />

                  {/* 오선 검출 하이라이트 박스 오버레이 */}
                  {showStaffOverlay &&
                    session.detectedStaffSystems.map((st) => (
                      <div
                        key={st.id}
                        style={{
                          position: 'absolute',
                          top: `${st.yTop}px`,
                          left: '0px',
                          width: '100%',
                          height: `${st.yBottom - st.yTop}px`,
                        }}
                        className="border-2 border-cyan-400/60 bg-cyan-400/10 rounded pointer-events-none"
                      >
                        <span className="absolute -top-4 left-2 text-[10px] font-mono font-bold bg-cyan-700/80 px-1.5 py-0.5 rounded text-cyan-100">
                          {st.id}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* 우측 패널: 스마트 음표 추출 & 편집기 */}
            <div className="flex-1 lg:w-1/2 flex flex-col bg-[#140e3b] rounded-3xl border border-white/15 overflow-hidden shadow-2xl">
              {/* 메타데이터 및 상태 배지 툴바 */}
              <div className="p-3 bg-[#1d164f] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={session.metadata.title}
                    onChange={(e) =>
                      setSession((prev) =>
                        prev
                          ? { ...prev, metadata: { ...prev.metadata, title: e.target.value } }
                          : null
                      )
                    }
                    className="px-2.5 py-1 rounded-xl bg-black/40 border border-white/20 text-sm font-black text-white focus:outline-cyan-400 w-36 sm:w-44"
                    placeholder="곡 제목"
                  />
                  <select
                    value={session.metadata.timeSignature}
                    onChange={(e) =>
                      setSession((prev) =>
                        prev
                          ? {
                              ...prev,
                              metadata: {
                                ...prev.metadata,
                                timeSignature: e.target.value as '4/4' | '3/4' | '2/4' | '6/8',
                              },
                            }
                          : null
                      )
                    }
                    className="px-2 py-1 rounded-xl bg-black/40 border border-white/20 text-xs font-bold text-cyan-200 focus:outline-cyan-400 cursor-pointer"
                  >
                    <option value="4/4">4/4 박자</option>
                    <option value="3/4">3/4 박자</option>
                    <option value="2/4">2/4 박자</option>
                    <option value="6/8">6/8 박자</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  {/* 인식 모드 배지 */}
                  {session.status === 'OMR_READY' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[11px] font-bold flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>OMR 인식 완료</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-[11px] font-bold flex items-center space-x-1">
                      <span>✏️ 직접 편집 모드</span>
                    </span>
                  )}

                  {/* 실행 취소 / 다시 실행 버튼 */}
                  <button
                    onClick={handleUndo}
                    disabled={session.history.length === 0}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="실행 취소 (Undo)"
                  >
                    <Undo2 className="w-4 h-4 text-cyan-200" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={session.future.length === 0}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="다시 실행 (Redo)"
                  >
                    <Redo2 className="w-4 h-4 text-cyan-200" />
                  </button>
                </div>
              </div>

              {/* 검증 상태 알림 바 */}
              <div
                className={`px-3 py-1.5 text-xs font-sans flex items-center justify-between border-b ${
                  validationResult.status === 'PASS'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : validationResult.status === 'WARNING'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  {validationResult.status === 'PASS' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {validationResult.status === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {validationResult.status === 'ERROR' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                  <span>
                    총 {session.notes.length}음표 (연주 {validationResult.playableNotes}음, 쉼표 {validationResult.restNotes}개)
                    {validationResult.outOfRangeNotes > 0 && ` • ⚠️ 음역 밖 음표 ${validationResult.outOfRangeNotes}개`}
                  </span>
                </div>

                {validationResult.suggestedOctaveShift && (
                  <button
                    onClick={() => handleShiftOctave(validationResult.suggestedOctaveShift!)}
                    className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400 text-cyan-200 text-[11px] font-bold cursor-pointer transition active:scale-95"
                  >
                    {validationResult.suggestedOctaveShift > 0 ? '⬆ 1옥타브 올리기' : '⬇ 1옥타브 내리기'}
                  </button>
                )}
              </div>

              {/* 음표 목록 스크롤 뷰 */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2 max-h-[320px]">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {session.notes.map((n, idx) => {
                    const isSelected = n.id === selectedNoteId;
                    const isPlaying = idx === currentPlayNoteIndex;
                    const isOutOfRange = !n.isRest && !KALIMBA_VALID_PITCHES.has(n.pitch);

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleSelectNote(n.id)}
                        className={`p-2 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-500/25 shadow-[0_0_15px_rgba(34,211,238,0.4)] scale-102'
                            : isPlaying
                            ? 'border-amber-400 bg-amber-500/30 scale-105'
                            : isOutOfRange
                            ? 'border-rose-500 bg-rose-500/20'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-white/60">
                          <span>#{n.order}</span>
                          <span className="font-mono">{n.duration}박</span>
                        </div>

                        <div className="text-center my-1">
                          <div
                            className={`text-lg sm:text-xl font-black ${
                              n.isRest ? 'text-amber-400' : isOutOfRange ? 'text-rose-400' : 'text-white'
                            }`}
                          >
                            {n.isRest ? '0 (쉼)' : `${n.numberNotation} (${n.solfege})`}
                          </div>
                          <div className="text-[11px] text-cyan-200/70 font-mono">
                            {n.isRest ? 'REST' : n.pitch}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[10px] text-white/40">
                          <span>{n.measureIndex}마디</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(n.id);
                            }}
                            className="hover:text-rose-400 p-0.5 cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 하단 음표 상세 편집 & 17음 칼림바 건반 팔레트 */}
              <div className="p-3 bg-[#110c33] border-t border-white/10 flex flex-col gap-2.5">
                {/* 상단 컨트롤: 음길이 선택, 마디 분할, 음표 추가 */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-cyan-200/80 mr-1 font-bold">음길이:</span>
                    {[
                      { label: '4박(온)', dur: 4 },
                      { label: '2박(2분)', dur: 2 },
                      { label: '1.5박(점4분)', dur: 1.5 },
                      { label: '1박(4분)', dur: 1 },
                      { label: '0.5박(8분)', dur: 0.5 },
                    ].map((d) => (
                      <button
                        key={d.dur}
                        onClick={() => handleSetDuration(d.dur)}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition cursor-pointer active:scale-95"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={handleSetRest}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 text-xs font-bold transition cursor-pointer active:scale-95"
                    >
                      쉼표(0)로 전환
                    </button>
                    <button
                      onClick={handleSplitMeasure}
                      className="px-2.5 py-1 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/60 text-indigo-200 text-xs font-bold transition cursor-pointer active:scale-95"
                    >
                      마디구분선(|)
                    </button>
                    <button
                      onClick={handleAddNote}
                      className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-cyan-950 font-black text-xs flex items-center space-x-1 shadow transition cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>음표 추가</span>
                    </button>
                  </div>
                </div>

                {/* 17음 칼림바 건반 팔레트 (선택된 음표의 음높이를 원클릭으로 변경) */}
                <div className="w-full bg-black/40 rounded-2xl p-2 border border-white/10">
                  <div className="text-[11px] text-cyan-300 font-bold mb-1.5 flex items-center justify-between">
                    <span>🎹 17음 칼림바 건반으로 음높이 즉시 입력:</span>
                    <span className="text-[10px] text-white/50">C4(도) ~ E6(높은미)</span>
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-17 gap-1">
                    {KALIMBA_KEYS.map((k) => (
                      <button
                        key={k.index}
                        onClick={() => handleSetPitch(k.pitch)}
                        className="py-1.5 rounded-lg bg-white/10 hover:bg-cyan-500/40 hover:border-cyan-400 border border-white/10 text-center transition cursor-pointer active:scale-90"
                      >
                        <div className="text-xs font-black text-white">{k.numberNotation}</div>
                        <div className="text-[9px] text-cyan-200">{k.solfege}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 오디오 미리듣기 바 */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={isPlayingAudio ? stopAudio : playAudio}
                      className={`px-4 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow transition cursor-pointer active:scale-95 ${
                        isPlayingAudio
                          ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-cyan-950'
                      }`}
                    >
                      {isPlayingAudio ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      <span>{isPlayingAudio ? '재생 정지' : '전체 미리듣기'}</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 text-xs font-sans">
                    <span className="text-white/60">템포:</span>
                    <input
                      type="range"
                      min="50"
                      max="140"
                      value={session.metadata.tempoBpm}
                      onChange={(e) =>
                        setSession((prev) =>
                          prev
                            ? { ...prev, metadata: { ...prev.metadata, tempoBpm: parseInt(e.target.value, 10) } }
                            : null
                        )
                      }
                      className="w-20 accent-cyan-400 cursor-pointer"
                    />
                    <span className="font-mono text-cyan-300 w-8">{session.metadata.tempoBpm}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
