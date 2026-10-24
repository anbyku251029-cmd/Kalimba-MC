import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Volume2,
  Music2,
  Trash2,
  Plus,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { HummingTranscriptionEngine } from '../utils/hummingTranscriptionEngine';
import { HummingTranscriptionResult } from '../types/hummingTypes';
import { Song, KalimbaNote, DifficultyLevel } from '../types/music';
import { KALIMBA_KEYS, KalimbaKeyDef, PITCH_TO_KEY } from '../constants/kalimbaKeys';
import { audioEngine } from '../utils/audioEngine';

interface HummingTranscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSong: (songData: {
    title: string;
    subTitle?: string;
    description?: string;
    tempoBpm: number;
    timeSignature?: '4/4' | '3/4' | '2/4' | '6/8';
    rawNotation: string;
    difficulty: '쉬움' | '보통' | '어려움' | '찬송가';
    notes: KalimbaNote[];
  }) => void;
}

type ModalStep =
  | 'IDLE'
  | 'RECORDING'
  | 'ANALYZING'
  | 'RESULT';

export const HummingTranscriptionModal: React.FC<HummingTranscriptionModalProps> = ({
  isOpen,
  onClose,
  onSaveSong,
}) => {
  const [step, setStep] = useState<ModalStep>('IDLE');
  const [recordDurationSec, setRecordDurationSec] = useState<number>(0);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [transcriptionResult, setTranscriptionResult] = useState<HummingTranscriptionResult | null>(null);
  const [editableNotes, setEditableNotes] = useState<KalimbaNote[]>([]);
  const [songTitle, setSongTitle] = useState<string>('내가 흥얼거린 칼림바 노래');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'쉬움' | '보통' | '어려움'>('쉬움');
  const [bpm, setBpm] = useState<number>(90);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 마이크 및 오디오 수집 Ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const recordedChunksRef = useRef<Float32Array[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const previewTimerRef = useRef<number[]>([]);

  // 모달 닫힐 때 마이크 및 오디오 리소스 정리
  const cleanupAudio = useCallback(() => {
    if (recordTimerRef.current !== null) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    previewTimerRef.current.forEach((t) => clearTimeout(t));
    previewTimerRef.current = [];
    audioEngine.stopAll();
    setIsPlayingPreview(false);

    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {
        // 무시
      }
      scriptProcessorRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        // 무시
      }
      analyserRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // 무시
      }
      mediaStreamRef.current = null;
    }

    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // 무시
      }
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      cleanupAudio();
      setStep('IDLE');
      setTranscriptionResult(null);
      setEditableNotes([]);
      setErrorMessage(null);
    }
  }, [isOpen, cleanupAudio]);

  // 마이크 녹음 시작
  const startRecording = async () => {
    try {
      cleanupAudio();
      setErrorMessage(null);
      recordedChunksRef.current = [];
      setRecordDurationSec(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      mediaStreamRef.current = stream;

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;

      // Float32Array 오디오 샘플 실시간 수집을 위한 ScriptProcessorNode
      const bufferSize = 4096;
      const scriptProcessor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // 복사본 저장
        const chunk = new Float32Array(inputData.length);
        chunk.set(inputData);
        recordedChunksRef.current.push(chunk);

        // 실시간 음량(RMS) 측정
        let sumSq = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSq += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSq / inputData.length);
        setVolumeLevel(Math.min(100, Math.round(rms * 400)));
      };

      source.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);

      setStep('RECORDING');

      const startTime = Date.now();
      recordTimerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordDurationSec(elapsed);

        // 최대 15초 제한
        if (elapsed >= 15) {
          stopRecordingAndAnalyze();
        }
      }, 100);
    } catch (err: unknown) {
      cleanupAudio();
      const errorObj = err as Error;
      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        setErrorMessage('마이크 접근 권한이 필요합니다. 브라우저 주소창 왼쪽의 자물쇠를 눌러 마이크를 허용해 주세요.');
      } else {
        setErrorMessage(`마이크를 시작할 수 없습니다: ${errorObj.message || '장치를 확인해 주세요.'}`);
      }
      setStep('IDLE');
    }
  };

  // 녹음 중지 및 DSP 분석 실행
  const stopRecordingAndAnalyze = () => {
    if (recordTimerRef.current !== null) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    const audioCtx = audioCtxRef.current;
    const sampleRate = audioCtx ? audioCtx.sampleRate : 44100;

    // 모인 청크들을 하나의 대용량 Float32Array로 병합
    const chunks = recordedChunksRef.current;
    const totalSamples = chunks.reduce((acc, c) => acc + c.length, 0);

    if (totalSamples === 0) {
      cleanupAudio();
      setErrorMessage('녹음된 오디오가 없습니다.');
      setStep('IDLE');
      return;
    }

    const mergedBuffer = new Float32Array(totalSamples);
    let offset = 0;
    for (const c of chunks) {
      mergedBuffer.set(c, offset);
      offset += c.length;
    }

    cleanupAudio();
    setStep('ANALYZING');

    // 비동기처럼 부드럽게 UI 전환 후 DSP 엔진 실행
    setTimeout(() => {
      try {
        const result = HummingTranscriptionEngine.transcribe(mergedBuffer, sampleRate, {
          bpm,
        });

        setTranscriptionResult(result);

        if (result.status === 'TOO_SHORT' || result.status === 'NO_VOICE_DETECTED') {
          setErrorMessage(result.warnings[0] || '음성을 감지하지 못했습니다. 다시 녹음해 주세요.');
          setStep('IDLE');
        } else {
          setEditableNotes(result.notes);
          setSongTitle(`내가 흥얼거린 노래 (${result.notes.length}음)`);
          setStep('RESULT');
        }
      } catch (err: any) {
        setErrorMessage(`분석 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`);
        setStep('IDLE');
      }
    }, 300);
  };

  // 미리듣기 재생 / 정지
  const togglePreview = () => {
    if (isPlayingPreview) {
      previewTimerRef.current.forEach((t) => clearTimeout(t));
      previewTimerRef.current = [];
      audioEngine.stopAll();
      setIsPlayingPreview(false);
      return;
    }

    if (editableNotes.length === 0) return;

    audioEngine.ensureReady();
    setIsPlayingPreview(true);
    const msPerBeat = 60000 / bpm;

    let accumulatedDelay = 0;
    editableNotes.forEach((note, idx) => {
      const delayMs = accumulatedDelay;
      const timer = window.setTimeout(() => {
        audioEngine.playNote(note.pitch);
        if (idx === editableNotes.length - 1) {
          // 마지막 음 재생 후 정지 상태로 전환
          window.setTimeout(() => {
            setIsPlayingPreview(false);
          }, note.duration * msPerBeat + 300);
        }
      }, delayMs);

      previewTimerRef.current.push(timer);
      accumulatedDelay += note.duration * msPerBeat;
    });
  };

  // 음표 건반 변경
  const handleSelectKeyForNote = (index: number, keyDef: KalimbaKeyDef) => {
    setEditableNotes((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        pitch: keyDef.pitch,
        solfege: keyDef.solfege,
        numberNotation: keyDef.numberNotation,
        octaveLevel: keyDef.octaveLevel,
        hand: keyDef.hand,
        tineIndex: keyDef.index,
      };
      return next;
    });
    audioEngine.playNote(keyDef.pitch);
    setEditingNoteIndex(null);
  };

  // 음길이(박자) 변경
  const handleChangeDuration = (index: number, duration: number) => {
    setEditableNotes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], duration };
      return next;
    });
  };

  // 음표 삭제
  const handleDeleteNote = (index: number) => {
    setEditableNotes((prev) => prev.filter((_, i) => i !== index));
    if (editingNoteIndex === index) setEditingNoteIndex(null);
  };

  // 음표 추가
  const handleAddNote = () => {
    const defaultKey = KALIMBA_KEYS[8]; // C4 도
    const newNote: KalimbaNote = {
      id: `humming-add-${Date.now()}`,
      pitch: defaultKey.pitch,
      solfege: defaultKey.solfege,
      numberNotation: defaultKey.numberNotation,
      octaveLevel: defaultKey.octaveLevel,
      duration: 1.0,
      hand: defaultKey.hand,
      tineIndex: defaultKey.index,
      lyric: '라',
    };
    setEditableNotes((prev) => [...prev, newNote]);
    audioEngine.playNote(defaultKey.pitch);
  };

  // 최종 곡 등록
  const handleSave = () => {
    if (editableNotes.length === 0) {
      alert('등록할 음표가 없습니다.');
      return;
    }

    // rawNotation 문자열 생성 (숫자 악보 및 쉼표 표기)
    const rawNotation = editableNotes
      .map((n) => {
        if (n.duration === 0.5) return `${n.numberNotation}/2`;
        if (n.duration === 2.0) return `${n.numberNotation}-`;
        return n.numberNotation;
      })
      .join(' ');

    onSaveSong({
      title: songTitle.trim() || '내 허밍 칼림바 곡',
      subTitle: `허밍 채보 곡 (${editableNotes.length}음, ${bpm} BPM)`,
      description: `마이크로 흥얼거린 멜로디를 자동으로 변환한 칼림바 악보입니다. (신뢰도: ${transcriptionResult?.confidenceScore ?? 85}%)`,
      tempoBpm: bpm,
      timeSignature: '4/4',
      rawNotation,
      difficulty: selectedDifficulty,
      notes: editableNotes,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-b from-[#1c183b] to-[#120f29] border border-purple-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-purple-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Mic className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                내 허밍을 칼림바 악보로 바꾸기
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 font-normal">
                  STEP 02-G
                </span>
              </h2>
              <p className="text-xs text-purple-200/70">
                마이크에 대고 "라라라~" 흥얼거리면 신기하게 칼림바 악보로 쏙 만들어 드려요!
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              cleanupAudio();
              onClose();
            }}
            className="p-2 rounded-xl text-purple-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 본문 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 오류 메시지 배너 */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 animate-shake">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm">{errorMessage}</div>
            </div>
          )}

          {/* 1단계: IDLE 및 안내 */}
          {step === 'IDLE' && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 border-2 border-pink-500/40 flex items-center justify-center animate-pulse">
                  <Mic className="w-12 h-12 text-pink-400" />
                </div>
              </div>

              <div className="max-w-md space-y-2">
                <h3 className="text-lg font-bold text-white">어떻게 흥얼거리면 잘 인식될까요?</h3>
                <ul className="text-sm text-purple-200/80 space-y-1.5 text-left bg-purple-900/30 p-4 rounded-2xl border border-purple-500/20">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>조용한 방에서 마이크에 가까이 대고 불러주세요.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>"라~ 라~ 라~" 하고 한 음씩 또렷하게 발음하면 정확해요.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>너무 낮게 불러도 칼림바 음높이에 맞게 자동으로 올려줍니다!</span>
                  </li>
                </ul>
              </div>

              {/* 프라이버시 안심 뱃지 */}
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3.5 py-1.5 rounded-full">
                <ShieldCheck className="w-4 h-4" />
                <span>100% 기기 내 로컬 DSP 분석 (아이의 목소리가 외부 서버로 나가지 않습니다)</span>
              </div>

              <button
                onClick={startRecording}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-2xl shadow-xl shadow-pink-500/30 transform hover:scale-105 transition-all text-base"
              >
                <Mic className="w-5 h-5" />
                <span>마이크 켜고 허밍 녹음 시작하기</span>
              </button>
            </div>
          )}

          {/* 2단계: RECORDING */}
          {step === 'RECORDING' && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500/30 to-red-500/30 border-4 border-pink-500 flex items-center justify-center animate-ping absolute inset-0 opacity-40"></div>
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-pink-600 to-red-600 flex items-center justify-center shadow-2xl shadow-red-500/50">
                  <Mic className="w-14 h-14 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-3xl font-black text-pink-300 font-mono">
                  {recordDurationSec.toFixed(1)}s / 15.0s
                </div>
                <p className="text-sm text-purple-200">
                  멜로디를 "라~ 라~ 라~" 하고 흥얼거려 보세요!
                </p>
              </div>

              {/* 실시간 음량 레벨 바 */}
              <div className="w-72 h-3 bg-purple-950 rounded-full overflow-hidden border border-purple-500/30">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-pink-500 transition-all duration-75"
                  style={{ width: `${volumeLevel}%` }}
                ></div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={stopRecordingAndAnalyze}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>녹음 끝내고 악보로 변환하기</span>
                </button>
                <button
                  onClick={() => {
                    cleanupAudio();
                    setStep('IDLE');
                  }}
                  className="px-5 py-3 bg-white/10 hover:bg-white/20 text-purple-200 rounded-xl transition-all"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 3단계: ANALYZING */}
          {step === 'ANALYZING' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center">
              <div className="w-20 h-20 rounded-full border-4 border-pink-500/30 border-t-pink-500 animate-spin flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-pink-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">허밍 음정을 칼림바 악보로 쏙쏙 변환 중...</h3>
                <p className="text-xs text-purple-300">
                  1단계 F0 피치 추정 ➔ 2단계 음표 분할 ➔ 3단계 리듬 양자화 ➔ 4단계 칼림바 매핑
                </p>
              </div>
            </div>
          )}

          {/* 4단계: RESULT (검토 및 수정 화면) */}
          {step === 'RESULT' && transcriptionResult && (
            <div className="space-y-6 animate-fadeIn">
              {/* 상단 결과 요약 및 주의 배너 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-purple-900/40 border border-purple-500/20">
                  <div className="text-xs text-purple-300">검출된 음표</div>
                  <div className="text-2xl font-black text-pink-400">
                    {editableNotes.length}음
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-purple-900/40 border border-purple-500/20">
                  <div className="text-xs text-purple-300">자동 옥타브 보정</div>
                  <div className="text-2xl font-black text-emerald-400">
                    {transcriptionResult.appliedOctaveShift > 0
                      ? `+${transcriptionResult.appliedOctaveShift} 옥타브`
                      : transcriptionResult.appliedOctaveShift < 0
                      ? `${transcriptionResult.appliedOctaveShift} 옥타브`
                      : '원음 그대로'}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-purple-900/40 border border-purple-500/20">
                  <div className="text-xs text-purple-300">인식 신뢰도</div>
                  <div className="text-2xl font-black text-amber-300">
                    {transcriptionResult.confidenceScore}점
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-purple-900/40 border border-purple-500/20">
                  <div className="text-xs text-purple-300">채보 연산 속도</div>
                  <div className="text-2xl font-black text-sky-400">
                    {transcriptionResult.executionTimeMs.toFixed(1)}ms
                  </div>
                </div>
              </div>

              {/* 경고 및 알림 메시지 */}
              {transcriptionResult.warnings.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-sm space-y-1">
                  {transcriptionResult.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 곡 제목 및 기본 메타 정보 */}
              <div className="p-4 rounded-2xl bg-purple-950/50 border border-purple-500/20 space-y-3">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="text-xs text-purple-300 block mb-1">곡 제목</label>
                    <input
                      type="text"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-purple-900/60 border border-purple-500/40 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-pink-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-purple-300 block mb-1">연습 난이도</label>
                    <div className="flex gap-1.5">
                      {(['쉬움', '보통', '어려움'] as const).map((diff) => (
                        <button
                          key={diff}
                          onClick={() => setSelectedDifficulty(diff)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedDifficulty === diff
                              ? 'bg-pink-500 text-white shadow-md'
                              : 'bg-purple-900/40 text-purple-300 hover:bg-purple-800/40'
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-purple-300 block mb-1">템포 (BPM)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="60"
                        max="140"
                        step="5"
                        value={bpm}
                        onChange={(e) => setBpm(Number(e.target.value))}
                        className="w-24 accent-pink-500 cursor-pointer"
                      />
                      <span className="text-xs font-mono font-bold text-pink-300 w-10">
                        {bpm}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 음표 목록 편집기 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-purple-200 flex items-center gap-2">
                    <Music2 className="w-4 h-4 text-pink-400" />
                    <span>변환된 음표 목록 (클릭하여 수정 가능)</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePreview}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isPlayingPreview
                          ? 'bg-amber-500 text-black animate-pulse'
                          : 'bg-purple-700 hover:bg-purple-600 text-white'
                      }`}
                    >
                      {isPlayingPreview ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-black" />
                          <span>정지</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>칼림바로 미리듣기</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleAddNote}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs border border-purple-500/30 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>음 추가</span>
                    </button>
                  </div>
                </div>

                {/* 음표 카드 목록 가로 스크롤 */}
                <div className="flex gap-2 overflow-x-auto pb-3 pt-1">
                  {editableNotes.map((note, idx) => {
                    const isEditing = editingNoteIndex === idx;
                    return (
                      <div
                        key={note.id || idx}
                        onClick={() => {
                          setEditingNoteIndex(isEditing ? null : idx);
                          audioEngine.playNote(note.pitch);
                        }}
                        className={`shrink-0 w-24 p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 relative ${
                          isEditing
                            ? 'bg-pink-600/30 border-pink-400 shadow-lg shadow-pink-500/20'
                            : 'bg-purple-950/60 border-purple-500/30 hover:border-purple-400'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] text-purple-400 font-mono">#{idx + 1}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(idx);
                            }}
                            className="text-purple-400 hover:text-red-400 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* 피치 및 계이름 */}
                        <div className="text-center my-0.5">
                          <div className="text-xl font-black text-white">{note.solfege}</div>
                          <div className="text-xs font-mono text-pink-300 font-bold">{note.pitch}</div>
                          <div className="text-[10px] text-purple-300">
                            숫자: <span className="font-bold text-amber-300">{note.numberNotation}</span>
                          </div>
                        </div>

                        {/* 박자 선택 셀렉터 */}
                        <div
                          className="flex gap-1 w-full justify-center pt-1 border-t border-purple-500/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleChangeDuration(idx, 0.5)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              note.duration === 0.5 ? 'bg-pink-500 text-white' : 'bg-purple-900/60 text-purple-300'
                            }`}
                            title="8분음표 (0.5박)"
                          >
                            8분
                          </button>
                          <button
                            onClick={() => handleChangeDuration(idx, 1.0)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              note.duration === 1.0 ? 'bg-pink-500 text-white' : 'bg-purple-900/60 text-purple-300'
                            }`}
                            title="4분음표 (1박)"
                          >
                            4분
                          </button>
                          <button
                            onClick={() => handleChangeDuration(idx, 2.0)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              note.duration === 2.0 ? 'bg-pink-500 text-white' : 'bg-purple-900/60 text-purple-300'
                            }`}
                            title="2분음표 (2박)"
                          >
                            2분
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 음표 선택 시 하단에 나타나는 17음 칼림바 건반 팔레트 */}
                {editingNoteIndex !== null && editingNoteIndex < editableNotes.length && (
                  <div className="p-4 rounded-2xl bg-purple-900/50 border border-pink-500/40 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-pink-300 font-bold">
                      <span>#{editingNoteIndex + 1}번 음표를 바꿀 칼림바 건반을 터치하세요:</span>
                      <button
                        onClick={() => setEditingNoteIndex(null)}
                        className="text-purple-300 hover:text-white"
                      >
                        닫기
                      </button>
                    </div>

                    <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-17 gap-1 pt-1">
                      {KALIMBA_KEYS.map((k) => (
                        <button
                          key={k.pitch}
                          onClick={() => handleSelectKeyForNote(editingNoteIndex, k)}
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                            editableNotes[editingNoteIndex].pitch === k.pitch
                              ? 'bg-pink-500 border-white text-white font-bold scale-105 shadow-md'
                              : 'bg-purple-950/80 border-purple-500/30 text-purple-200 hover:bg-purple-800'
                          }`}
                        >
                          <span className="text-[11px] font-bold">{k.solfege}</span>
                          <span className="text-[9px] opacity-80">{k.pitch}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 버튼 */}
        <div className="px-6 py-4 border-t border-purple-500/20 bg-purple-950/40 flex items-center justify-between">
          {step === 'RESULT' ? (
            <>
              <button
                onClick={() => {
                  cleanupAudio();
                  setStep('IDLE');
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-900/50 hover:bg-purple-800 text-purple-200 text-sm transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>처음부터 다시 녹음</span>
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    cleanupAudio();
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 text-sm transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-pink-500/30 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>내 칼림바 곡으로 저장하고 연주하기</span>
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                onClick={() => {
                  cleanupAudio();
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 text-sm transition-all"
              >
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
