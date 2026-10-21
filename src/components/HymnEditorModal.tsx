import React, { useState, useMemo } from 'react';
import { X, Volume2, Save, RotateCcw, Plus, Sparkles } from 'lucide-react';
import { Song } from '../types/music';
import { parseSimpleNotation, notesToSimpleNotation } from '../utils/noteParser';
import { audioEngine } from '../utils/audioEngine';

interface HymnEditorModalProps {
  initialSong?: Song | null;
  onSave: (hymnData: {
    id?: string;
    hymnNumber?: number;
    title: string;
    subTitle?: string;
    description?: string;
    tempoBpm: number;
    timeSignature?: '4/4' | '3/4' | '2/4' | '6/8';
    rawNotation: string;
  }) => void;
  onDeleteOrReset?: (id: string) => void;
  onClose: () => void;
}

const QUICK_NOTE_BUTTONS = [
  { label: '1 (도)', token: '1' },
  { label: '2 (레)', token: '2' },
  { label: '3 (미)', token: '3' },
  { label: '4 (파)', token: '4' },
  { label: '5 (솔)', token: '5' },
  { label: '6 (라)', token: '6' },
  { label: '7 (시)', token: '7' },
  { label: "1' (높은도)", token: "1'" },
  { label: "2' (높은레)", token: "2'" },
  { label: "3' (높은미)", token: "3'" },
  { label: "4' (높은파)", token: "4'" },
  { label: "5' (높은솔)", token: "5'" },
  { label: "6' (높은라)", token: "6'" },
  { label: '- (길게+1박)', token: '-' },
  { label: '| (마디구분)', token: '|' },
];

export const HymnEditorModal: React.FC<HymnEditorModalProps> = ({
  initialSong,
  onSave,
  onDeleteOrReset,
  onClose,
}) => {
  const [hymnNumberStr, setHymnNumberStr] = useState<string>(
    initialSong?.hymnNumber ? String(initialSong.hymnNumber) : ''
  );
  const [title, setTitle] = useState<string>(initialSong?.title || '');
  const [subTitle, setSubTitle] = useState<string>(initialSong?.subTitle || '');
  const [description, setDescription] = useState<string>(initialSong?.description || '');
  const [tempoBpm, setTempoBpm] = useState<number>(initialSong?.tempoBpm || 76);
  const [timeSignature, setTimeSignature] = useState<'4/4' | '3/4' | '2/4' | '6/8'>(
    initialSong?.timeSignature || '4/4'
  );
  const [rawNotation, setRawNotation] = useState<string>(() => {
    if (initialSong?.rawNotation) return initialSong.rawNotation;
    if (initialSong?.notes && initialSong.notes.length > 0) {
      return notesToSimpleNotation(initialSong.notes);
    }
    return "5 1'- 3' 1' | 3'- 2' | 1'- 6 | 5--";
  });
  const [errorMsg, setErrorMsg] = useState<string>('');

  const parsedNotes = useMemo(() => {
    return parseSimpleNotation(rawNotation);
  }, [rawNotation]);

  const playableNotes = useMemo(
    () => parsedNotes.filter((n) => !n.isRest && n.pitch !== 'REST'),
    [parsedNotes]
  );

  // 빠른 입력 버튼 클릭 시 악보 텍스트에 토큰 추가 + 해당 칼림바 음 소리 재생
  const handleQuickInsert = (token: string) => {
    setRawNotation((prev) => `${prev.trim()} ${token}`.trim());
    const singleParsed = parseSimpleNotation(token);
    if (singleParsed.length > 0 && !singleParsed[0].isRest) {
      audioEngine.ensureReady();
      audioEngine.playNote(singleParsed[0].pitch, 1, tempoBpm, 1.0);
    }
  };

  // 미리 듣기 (앞부분 최대 12음 연속 재생)
  const handlePreviewAudio = () => {
    if (playableNotes.length === 0) return;
    audioEngine.ensureReady();
    audioEngine.stopAll();

    const previewSlice = parsedNotes.slice(0, 12);
    let accumulatedBeat = 0;
    const beatMs = (60 / tempoBpm) * 1000;

    previewSlice.forEach((n) => {
      if (!n.isRest && n.pitch !== 'REST') {
        const delayMs = accumulatedBeat * beatMs;
        setTimeout(() => {
          audioEngine.playNote(n.pitch, n.duration, tempoBpm, 1.0);
        }, delayMs);
      }
      accumulatedBeat += n.duration;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('찬송가 제목을 입력해 주세요.');
      return;
    }
    if (playableNotes.length === 0) {
      setErrorMsg('최소 1개 이상의 유효한 칼림바 음표(1~7 또는 도~시)를 입력해 주세요.');
      return;
    }

    const num = hymnNumberStr.trim() ? parseInt(hymnNumberStr.trim(), 10) : undefined;
    onSave({
      id: initialSong?.id,
      hymnNumber: !isNaN(num as number) ? num : undefined,
      title: title.trim(),
      subTitle: subTitle.trim() || undefined,
      description: description.trim() || undefined,
      tempoBpm,
      timeSignature,
      rawNotation,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#141036] border-2 border-amber-400/60 rounded-3xl max-w-2xl w-full p-5 sm:p-7 text-white shadow-[0_0_40px_rgba(251,191,36,0.25)] relative my-auto max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5 pb-3 border-b border-white/10">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-2xl">
            ✝️
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-amber-300 flex items-center gap-2">
              <span>{initialSong ? '찬송가 악보 업데이트 (수정)' : '새 찬송가 추가 / 업데이트'}</span>
              <Sparkles className="w-4 h-4 text-amber-300" />
            </h2>
            <p className="text-xs sm:text-sm text-white/70 font-sans">
              숫자 악보(1~7)나 계이름(도~시)을 입력하면 자동으로 17키 칼림바 폭포수 악보로 변환됩니다!
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          {errorMsg && (
            <div className="bg-red-500/20 border border-red-400 text-red-200 text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Row 1: Hymn Number & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-amber-200 mb-1">
                찬송가 장수 (선택)
              </label>
              <input
                type="number"
                min="1"
                max="999"
                placeholder="예: 305"
                value={hymnNumberStr}
                onChange={(e) => setHymnNumberStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-amber-400 focus:outline-hidden text-sm font-bold"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-amber-200 mb-1">
                찬송가 제목 *
              </label>
              <input
                type="text"
                placeholder="예: 나 같은 죄인 살리신"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-amber-400 focus:outline-hidden text-sm font-bold"
              />
            </div>
          </div>

          {/* Row 2: Subtitle, Time Signature & Tempo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-cyan-200 mb-1">
                부제 / 영문명 (선택)
              </label>
              <input
                type="text"
                placeholder="예: 새찬송가 305장"
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-cyan-400 focus:outline-hidden text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-cyan-200 mb-1">
                박자표
              </label>
              <select
                value={timeSignature}
                onChange={(e) => setTimeSignature(e.target.value as '4/4' | '3/4' | '2/4' | '6/8')}
                className="w-full px-3.5 py-2 rounded-xl bg-[#1f194d] border border-white/20 text-white focus:border-cyan-400 focus:outline-hidden text-sm font-bold"
              >
                <option value="4/4">4/4 박자</option>
                <option value="3/4">3/4 박자</option>
                <option value="6/8">6/8 박자</option>
                <option value="2/4">2/4 박자</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-cyan-200 mb-1">
                빠르기 (BPM: {tempoBpm})
              </label>
              <input
                type="range"
                min="55"
                max="110"
                step="1"
                value={tempoBpm}
                onChange={(e) => setTempoBpm(Number(e.target.value))}
                className="w-full mt-2 accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Row 3: Quick Note Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-amber-200">
                🎹 클릭하여 음표 빠르게 넣기 (클릭 시 칼림바 소리가 납니다)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 bg-white/5 p-2.5 rounded-2xl border border-white/10">
              {QUICK_NOTE_BUTTONS.map((btn) => (
                <button
                  key={btn.token}
                  type="button"
                  onClick={() => handleQuickInsert(btn.token)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#251e5a] hover:bg-amber-400 hover:text-[#120e2e] text-xs font-bold text-white border border-white/15 transition cursor-pointer active:scale-95 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: Notation Input Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-amber-200">
                칼림바 숫자 악보 또는 계이름 입력 *
              </label>
              <button
                type="button"
                onClick={handlePreviewAudio}
                className="inline-flex items-center space-x-1 text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>앞부분 미리 듣기</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={rawNotation}
              onChange={(e) => {
                setRawNotation(e.target.value);
                setErrorMsg('');
              }}
              placeholder="예: 5 1'- 3' 1' | 3'- 2' | 1'- 6 | 5-- (또는 도 레 미 파 솔 라 시 도')"
              className="w-full p-3.5 rounded-2xl bg-black/40 border border-white/25 text-amber-200 font-mono text-sm focus:border-amber-400 focus:outline-hidden leading-relaxed"
            />
            <div className="mt-1.5 text-[11px] text-white/60 space-y-0.5 leading-snug">
              <p>
                • <strong>기본 음</strong>: <code className="text-amber-300">1(도) 2(레) 3(미) 4(파) 5(솔) 6(라) 7(시)</code> / <strong>높은 옥타브</strong>: 뒤에 작은따옴표 <code className="text-amber-300">1&apos; 2&apos; 3&apos;</code>
              </p>
              <p>
                • <strong>박자 조절</strong>: <code className="text-cyan-300">5-</code> (2박자), <code className="text-cyan-300">5--</code> (3박자), <code className="text-cyan-300">5_</code> (반박자/0.5박), <code className="text-cyan-300">0</code> (쉼표)
              </p>
            </div>
          </div>

          {/* Row 5: Parsed Note Preview Summary */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between text-xs font-bold text-cyan-200 mb-2">
              <span>변환된 칼림바 음표 미리보기</span>
              <span>총 {playableNotes.length}음 인식됨</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {playableNotes.slice(0, 40).map((n, idx) => (
                <span
                  key={n.id || idx}
                  className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-[11px] font-bold text-white"
                >
                  {n.numberNotation}
                  {n.octaveLevel === 1 ? '•' : n.octaveLevel === 2 ? ':' : ''} ({n.pitch})
                  {n.duration !== 1 ? ` [${n.duration}박]` : ''}
                </span>
              ))}
              {playableNotes.length > 40 && (
                <span className="text-xs text-white/50 self-center">
                  ...외 {playableNotes.length - 40}음
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
            {initialSong && onDeleteOrReset ? (
              <button
                type="button"
                onClick={() => onDeleteOrReset(initialSong.id)}
                className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-200 text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{initialSong.isCustom ? '이 찬송가 삭제' : '기본 악보로 초기화'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-[#141036] text-xs sm:text-sm font-black flex items-center space-x-1.5 shadow-[0_0_20px_rgba(251,191,36,0.4)] transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>찬송가 저장 및 업데이트</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
