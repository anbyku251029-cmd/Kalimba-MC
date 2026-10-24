import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  Download,
  Trash2,
  ArrowLeft,
  Music,
  CheckCircle2,
  FileText,
  Volume2,
} from 'lucide-react';
import { KALIMBA_KEYS, KalimbaKeyDef, PITCH_TO_KEY } from '../constants/kalimbaKeys';
import { audioEngine } from '../utils/audioEngine';
import { RecordingSessionManager } from '../utils/recordingManager';
import { exportRecordedNotesToWavBlob, downloadWavFile } from '../utils/wavExporter';
import { RecordedNote, RecordingState } from '../types/recordingTypes';
import { KalimbaTouchController } from '../utils/kalimbaTouchController';

interface RecordingStudioProps {
  onBack: () => void;
}

export const RecordingStudio: React.FC<RecordingStudioProps> = ({ onBack }) => {
  const managerRef = useRef<RecordingSessionManager>(new RecordingSessionManager());
  const [state, setState] = useState<RecordingState>('READY');
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([]);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeTineIndex, setActiveTineIndex] = useState<{ [keyIndex: number]: boolean }>({});
  const [exporting, setExporting] = useState<boolean>(false);
  const [generatedNotation, setGeneratedNotation] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('빨간 버튼을 누르면 녹음이 시작돼요!');

  const timerRef = useRef<number | null>(null);
  const touchControllerRef = useRef<KalimbaTouchController>(new KalimbaTouchController());

  // 타이머 루프 (녹음 중일 때 경과 시간 측정)
  useEffect(() => {
    if (state === 'RECORDING') {
      timerRef.current = window.setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // 건반 연주 및 녹음 입력 단일 핸들러
  const handleKeyTrigger = useCallback(
    (keyIndex: number, pitch: string) => {
      // 1. 소리 재생
      audioEngine.playNote(pitch, 1.0, 80, 1.0);

      // 2. 건반 시각 피드백
      setActiveTineIndex((prev) => ({ ...prev, [keyIndex]: true }));
      setTimeout(() => {
        setActiveTineIndex((prev) => {
          const copy = { ...prev };
          delete copy[keyIndex];
          return copy;
        });
      }, 400);

      // 3. 녹음 중이면 이벤트 기록
      if (managerRef.current.getState() === 'RECORDING') {
        const note = managerRef.current.recordNote(keyIndex, pitch);
        if (note) {
          setRecordedNotes(managerRef.current.getNotes());
        }
      }
    },
    []
  );

  // 모바일/태블릿 멀티터치 제어기 바인딩
  useEffect(() => {
    touchControllerRef.current.setHandlers({
      onKeyDown: (keyIndex: number) => {
        const k = KALIMBA_KEYS[keyIndex];
        if (k) handleKeyTrigger(k.index, k.pitch);
      },
      onKeyUp: () => {
        // Tine release
      },
    });
  }, [handleKeyTrigger]);

  // 키보드 숫자키(1~7) 바인딩
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const numMap: Record<string, string> = {
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
        if (keyDef) handleKeyTrigger(keyDef.index, pitch);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyTrigger]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      managerRef.current.stopPlayback();
      audioEngine.stopAll();
    };
  }, []);

  // [버튼 1] 녹음 시작
  const handleStartRecording = () => {
    managerRef.current.startRecording();
    setState('RECORDING');
    setElapsedSec(0);
    setRecordedNotes([]);
    setGeneratedNotation('');
    setStatusMessage('🔴 녹음 중이에요! 칼림바를 자유롭게 연주해 보세요.');
  };

  // [버튼 2] 일시 정지
  const handlePauseRecording = () => {
    managerRef.current.pauseRecording();
    setState('PAUSED');
    setStatusMessage('⏸️ 녹음이 일시 정지되었어요.');
  };

  // [버튼 3] 녹음 재개
  const handleResumeRecording = () => {
    managerRef.current.resumeRecording();
    setState('RECORDING');
    setStatusMessage('🔴 녹음이 다시 시작되었어요!');
  };

  // [버튼 4] 녹음 완료 (정지)
  const handleStopRecording = () => {
    const session = managerRef.current.stopRecording('내 칼림바 연주');
    setState('STOPPED');
    setRecordedNotes(session.notes);
    setGeneratedNotation(session.generatedNotation || '');
    setStatusMessage(
      session.notes.length > 0
        ? `🎉 녹음 완료! 총 ${session.notes.length}개의 음표가 예쁘게 담겼어요.`
        : '아직 연주한 음표가 없어요. 다시 녹음해 볼까요?'
    );
  };

  // [버튼 5] 내 연주 들어보기 (재생)
  const handlePlayRecording = () => {
    if (recordedNotes.length === 0) return;
    setState('PLAYING');
    setStatusMessage('🎶 내 연주를 듣고 있어요...');

    managerRef.current.playRecordedNotes(
      (_ms, activeId) => {
        setActiveNoteId(activeId || null);
      },
      () => {
        setState('STOPPED');
        setActiveNoteId(null);
        setStatusMessage('✨ 재생이 끝났어요! 마음에 들면 파일로 저장해 보세요.');
      }
    );
  };

  // [버튼 6] 재생 정지
  const handleStopPlayback = () => {
    managerRef.current.stopPlayback();
    setState('STOPPED');
    setActiveNoteId(null);
    setStatusMessage('⏹️ 재생을 멈췄어요.');
  };

  // [버튼 7] 다시 처음부터 녹음 (초기화)
  const handleResetRecording = () => {
    managerRef.current.clear();
    setState('READY');
    setElapsedSec(0);
    setRecordedNotes([]);
    setGeneratedNotation('');
    setActiveNoteId(null);
    setStatusMessage('빨간 버튼을 누르면 녹음이 시작돼요!');
  };

  // [버튼 8] WAV 파일로 저장하기
  const handleExportWav = async () => {
    if (recordedNotes.length === 0) return;

    try {
      setExporting(true);
      setStatusMessage('⏳ 고음질 WAV 오디오 파일을 만들고 있어요...');
      const { blob, fileSizeKb } = await exportRecordedNotesToWavBlob(recordedNotes);
      downloadWavFile(blob, '내_칼림바_연주');
      setStatusMessage(`💾 다운로드 완료! (${fileSizeKb} KB) 컴퓨터나 폰에 저장되었어요!`);
    } catch (err) {
      console.error('WAV export error', err);
      setStatusMessage('❌ 파일 생성 중 문제가 생겼어요. 다시 시도해 주세요.');
    } finally {
      setExporting(false);
    }
  };

  // 시간 포맷 (00:00)
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full min-h-screen bg-[#0c0827] text-white flex flex-col justify-between overflow-x-hidden font-['Jua',sans-serif] select-none">
      {/* 배경 그라데이션 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,#1c144d_0%,#0c0827_85%)] pointer-events-none" />

      {/* 1. 상단 헤더 바 */}
      <header className="relative z-30 w-full px-4 sm:px-8 pt-4 pb-3 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition cursor-pointer border border-white/20"
            title="곡 목록으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-amber-300 drop-shadow-md flex items-center gap-2">
              <span>🎙️ 나만의 칼림바 녹음실</span>
            </h1>
            <p className="text-xs text-white/70">직접 연주하고, 듣고, WAV 파일로 소장해요</p>
          </div>
        </div>

        {/* 녹음 시간 & 음표 카운터 배지 */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/20">
            {state === 'RECORDING' && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping mr-0.5" />
            )}
            <span className="text-xs sm:text-sm font-black text-amber-200">
              ⏱️ {formatTime(elapsedSec)}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-400/40 text-xs sm:text-sm font-black text-indigo-200">
            🎵 {recordedNotes.length}개 음표
          </div>
        </div>
      </header>

      {/* 2. 중앙 메인 스튜디오 컨트롤 & 미리보기 영역 */}
      <main className="relative z-20 flex-1 w-full max-w-4xl mx-auto px-4 py-3 flex flex-col justify-start space-y-3">
        {/* 상태 안내 배너 */}
        <div className="w-full py-2 px-4 rounded-2xl bg-white/5 border border-white/10 text-center shadow-inner">
          <span className="text-sm sm:text-base font-bold text-amber-200 drop-shadow-sm">
            {statusMessage}
          </span>
        </div>

        {/* 대형 녹음/재생 제어 버튼 그룹 */}
        <div className="flex items-center justify-center flex-wrap gap-3 sm:gap-4 py-1">
          {/* 상태 1: 준비 (READY) */}
          {state === 'READY' && (
            <button
              onClick={handleStartRecording}
              className="px-6 sm:px-8 py-3.5 rounded-full bg-linear-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 active:scale-95 text-white text-base sm:text-lg font-black shadow-[0_4px_20px_rgba(244,63,94,0.5)] transition cursor-pointer flex items-center space-x-2 border-2 border-white/30"
            >
              <Mic className="w-6 h-6 animate-pulse" />
              <span>녹음 시작하기</span>
            </button>
          )}

          {/* 상태 2: 녹음 중 (RECORDING) */}
          {state === 'RECORDING' && (
            <>
              <button
                onClick={handlePauseRecording}
                className="px-5 py-3 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-amber-950 font-black shadow-lg transition cursor-pointer flex items-center space-x-2 border border-amber-300"
              >
                <Pause className="w-5 h-5" />
                <span>잠시 쉬기</span>
              </button>
              <button
                onClick={handleStopRecording}
                className="px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black shadow-[0_4px_16px_rgba(225,29,72,0.5)] transition cursor-pointer flex items-center space-x-2 border-2 border-white/30"
              >
                <Square className="w-5 h-5 fill-current" />
                <span>녹음 끝마치기</span>
              </button>
            </>
          )}

          {/* 상태 3: 일시 정지 (PAUSED) */}
          {state === 'PAUSED' && (
            <>
              <button
                onClick={handleResumeRecording}
                className="px-5 py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black shadow-lg transition cursor-pointer flex items-center space-x-2 border border-emerald-300"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>이어서 녹음</span>
              </button>
              <button
                onClick={handleStopRecording}
                className="px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black shadow-lg transition cursor-pointer flex items-center space-x-2 border-2 border-white/30"
              >
                <Square className="w-5 h-5 fill-current" />
                <span>녹음 끝마치기</span>
              </button>
            </>
          )}

          {/* 상태 4: 녹음 완료 (STOPPED) / 재생 중 (PLAYING) */}
          {(state === 'STOPPED' || state === 'PLAYING') && (
            <>
              {state === 'PLAYING' ? (
                <button
                  onClick={handleStopPlayback}
                  className="px-5 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black shadow-lg transition cursor-pointer flex items-center space-x-2 border border-indigo-400"
                >
                  <Square className="w-5 h-5 fill-current" />
                  <span>재생 멈추기</span>
                </button>
              ) : (
                <button
                  onClick={handlePlayRecording}
                  disabled={recordedNotes.length === 0}
                  className="px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 active:scale-95 text-white font-black shadow-[0_4px_16px_rgba(16,185,129,0.5)] transition cursor-pointer flex items-center space-x-2 border-2 border-emerald-300"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>내 연주 들어보기</span>
                </button>
              )}

              {/* WAV 파일 저장 버튼 */}
              <button
                onClick={handleExportWav}
                disabled={recordedNotes.length === 0 || exporting}
                className="px-6 py-3 rounded-full bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 active:scale-95 text-white font-black shadow-[0_4px_16px_rgba(6,182,212,0.5)] transition cursor-pointer flex items-center space-x-2 border-2 border-cyan-300"
              >
                <Download className="w-5 h-5" />
                <span>{exporting ? 'WAV 만드는 중...' : 'WAV 파일로 저장'}</span>
              </button>

              {/* 다시 녹음하기 버튼 */}
              <button
                onClick={handleResetRecording}
                className="px-4 py-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 font-bold transition cursor-pointer flex items-center space-x-1.5 border border-white/20"
                title="녹음 지우고 처음부터"
              >
                <Trash2 className="w-4 h-4" />
                <span>지우기</span>
              </button>
            </>
          )}
        </div>

        {/* 녹음된 음표 가로 피아노 롤 카드 */}
        {recordedNotes.length > 0 && (
          <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 shadow-inner">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                <Music className="w-3.5 h-3.5" />
                <span>기록된 음표 타임라인 ({recordedNotes.length}개)</span>
              </span>
              <span className="text-[11px] text-white/50">연주한 순서대로 흘러가요</span>
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-white/20">
              {recordedNotes.map((note) => {
                const isPlayingThis = activeNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    className={`shrink-0 px-2.5 py-1.5 rounded-xl border flex flex-col items-center transition-all duration-150 ${
                      isPlayingThis
                        ? 'bg-amber-400 text-amber-950 border-amber-300 scale-110 shadow-[0_0_12px_#facc15]'
                        : 'bg-white/10 text-white border-white/20'
                    }`}
                  >
                    <span className="text-xs font-black">{note.noteNumber}</span>
                    <span className="text-[10px] font-bold opacity-80">{note.solfege}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 숫자 악보 자동 변환 미리보기 */}
        {generatedNotation && (
          <div className="w-full bg-amber-950/30 border border-amber-400/30 rounded-2xl p-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300 mb-1">
              <FileText className="w-3.5 h-3.5" />
              <span>내 연주가 숫자 악보로 변신했어요!</span>
            </div>
            <div className="font-mono text-sm sm:text-base font-black text-amber-100 tracking-wider bg-black/40 p-2 rounded-xl border border-white/10 select-text overflow-x-auto">
              {generatedNotation}
            </div>
          </div>
        )}
      </main>

      {/* 3. 하단 17음 가상 칼림바 연주 건반 (멀티터치 지원) */}
      <footer className="relative z-30 w-full max-w-5xl mx-auto px-2 sm:px-4 pb-4 pt-1">
        <div className="relative w-full h-44 sm:h-56 bg-gradient-to-b from-[#1b1542] to-[#0d0926] rounded-3xl border-2 border-white/20 p-2 sm:p-3 shadow-2xl flex items-stretch touch-none">
          {KALIMBA_KEYS.map((k) => {
            const isActive = Boolean(activeTineIndex[k.index]);
            // 중앙(C4)에서 멀어질수록 건반 길이가 짧아지는 V자 물리 칼림바 형상
            const lengthPercent = 100 - Math.abs(k.index - 8) * 4.2;

            return (
              <button
                key={k.index}
                data-key-index={k.index}
                onPointerDown={(e) => touchControllerRef.current.handlePointerDown(e, k.index)}
                onPointerUp={(e) => touchControllerRef.current.handlePointerUp(e, k.index)}
                onPointerCancel={(e) => touchControllerRef.current.handlePointerCancel(e, k.index)}
                onLostPointerCapture={(e) => touchControllerRef.current.handleLostPointerCapture(e, k.index)}
                onClick={() => handleKeyTrigger(k.index, k.pitch)}
                style={{ height: `${lengthPercent}%` }}
                className={`flex-1 mx-0.5 rounded-b-2xl border-x border-b transition-all duration-75 flex flex-col justify-end items-center pb-2 cursor-pointer select-none ${
                  isActive
                    ? 'bg-amber-400 border-amber-300 shadow-[0_0_16px_#facc15] translate-y-1'
                    : k.isCenter
                    ? 'bg-linear-to-b from-amber-600/60 via-amber-500/70 to-amber-400 border-amber-300/80 shadow-md'
                    : k.index % 2 === 0
                    ? 'bg-linear-to-b from-slate-600/60 via-slate-400/70 to-slate-200 border-slate-300'
                    : 'bg-linear-to-b from-amber-700/60 via-amber-600/70 to-amber-300 border-amber-400/60'
                }`}
              >
                <span
                  className={`text-xs sm:text-sm font-black ${
                    isActive ? 'text-amber-950 font-black' : 'text-slate-900 font-extrabold'
                  }`}
                >
                  {k.numberNotation}
                </span>
                <span
                  className={`text-[10px] sm:text-xs font-bold ${
                    isActive ? 'text-amber-900' : 'text-slate-800'
                  }`}
                >
                  {k.solfege}
                </span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
};
