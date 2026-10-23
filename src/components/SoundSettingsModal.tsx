import React, { useState, useEffect } from 'react';
import { X, Volume2, Sparkles, RotateCcw, Check, Music, Activity } from 'lucide-react';
import { audioEngine, KalimbaTimbreMode, AudioSettings, DEFAULT_AUDIO_SETTINGS } from '../utils/audioEngine';

interface SoundSettingsModalProps {
  onClose: () => void;
}

const TIMBRE_OPTIONS: {
  id: KalimbaTimbreMode;
  name: string;
  tag: string;
  desc: string;
  icon: string;
  badgeColor: string;
}[] = [
  {
    id: 'clean',
    name: '맑은 소리',
    tag: '학습 추천 · 또렷한 분리',
    desc: '음표 하나하나가 맑고 또렷하게 들려 처음 칼림바를 배우는 아이에게 가장 알맞은 소리',
    icon: '✨',
    badgeColor: 'bg-cyan-500/30 text-cyan-200 border-cyan-400/50',
  },
  {
    id: 'warm',
    name: '따뜻한 소리',
    tag: '포근한 목재 울림',
    desc: '날카로움을 줄이고 450Hz 나무 울림통의 부드러운 공명을 강조한 편안한 감상용 소리',
    icon: '🪵',
    badgeColor: 'bg-amber-500/30 text-amber-200 border-amber-400/50',
  },
  {
    id: 'expressive',
    name: '풍성한 연주',
    tag: '강약 표현 · 콘서트홀 잔향',
    desc: '마디별 강박과 약박의 자연스러운 강약과 풍부한 공간 여운을 살린 생동감 넘치는 연주',
    icon: '👑🎵',
    badgeColor: 'bg-purple-500/30 text-purple-200 border-purple-400/50',
  },
];

export const SoundSettingsModal: React.FC<SoundSettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<AudioSettings>(() => audioEngine.getSettings());
  const [isPlayingSample, setIsPlayingSample] = useState<boolean>(false);

  useEffect(() => {
    audioEngine.updateSettings(settings);
  }, [settings]);

  // 음색 변경 시 해당 음색으로 "도-미-솔-도'" 샘플 화음 즉시 재생 (A/B 빠른 비교)
  const handleSelectTimbre = (mode: KalimbaTimbreMode) => {
    setSettings((prev) => ({ ...prev, timbre: mode }));
    audioEngine.ensureReady();
    audioEngine.stopAll();

    const samplePitches = ['C4', 'E4', 'G4', 'C5'];
    samplePitches.forEach((pitch, i) => {
      setTimeout(() => {
        audioEngine.playNote(pitch, 1.2, 90, 1.0, mode);
      }, i * 160);
    });
  };

  // 대표 샘플 멜로디 (비행기 앞 4마디) A/B 비교 연주
  const handlePlaySampleMelody = () => {
    if (isPlayingSample) {
      audioEngine.stopAll();
      setIsPlayingSample(false);
      return;
    }

    audioEngine.ensureReady();
    audioEngine.stopAll();
    setIsPlayingSample(true);

    // 비행기 멜로디: 미 레 도 레 | 미 미 미 (4/4 박자)
    const melody: { pitch: string; dur: number; beatInM: number }[] = [
      { pitch: 'E4', dur: 1.0, beatInM: 0 },
      { pitch: 'D4', dur: 1.0, beatInM: 1 },
      { pitch: 'C4', dur: 1.0, beatInM: 2 },
      { pitch: 'D4', dur: 1.0, beatInM: 3 },
      { pitch: 'E4', dur: 1.0, beatInM: 0 },
      { pitch: 'E4', dur: 1.0, beatInM: 1 },
      { pitch: 'E4', dur: 2.0, beatInM: 2 },
    ];

    let currentMs = 0;
    const tempo = 85;
    const beatMs = (60 / tempo) * 1000;

    melody.forEach((item, idx) => {
      setTimeout(() => {
        audioEngine.playNote(
          item.pitch,
          item.dur,
          tempo,
          1.0,
          settings.timbre,
          undefined,
          1.0,
          '4/4',
          item.beatInM
        );
        if (idx === melody.length - 1) {
          setTimeout(() => setIsPlayingSample(false), item.dur * beatMs + 400);
        }
      }, currentMs);
      currentMs += item.dur * beatMs;
    });
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_AUDIO_SETTINGS });
    audioEngine.updateSettings({ ...DEFAULT_AUDIO_SETTINGS });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs font-['Jua',sans-serif]">
      <div className="bg-[#141036] border-2 border-cyan-400/60 rounded-3xl max-w-lg w-full p-5 sm:p-7 text-white shadow-[0_0_40px_rgba(34,211,238,0.25)] relative my-auto max-h-[92vh] overflow-y-auto">
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
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-2xl">
            🎛️
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-cyan-200 flex items-center gap-2">
              <span>칼림바 음악 음색 & 표현 설정</span>
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </h2>
            <p className="text-xs text-white/70 font-sans">
              원곡의 매력을 살리는 3가지 전문 음색과 자연스러운 리듬감을 선택해 보세요
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Timbre Cards */}
          <div>
            <label className="block text-xs font-bold text-cyan-200 mb-2">
              음색 프리셋 선택 (선택 시 소리를 즉시 비교해 줍니다)
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {TIMBRE_OPTIONS.map((opt) => {
                const isSelected =
                  settings.timbre === opt.id ||
                  (opt.id === 'clean' && (settings.timbre === 'default' || settings.timbre === 'bright')) ||
                  (opt.id === 'warm' && settings.timbre === 'soft');

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectTimbre(opt.id)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between active:scale-98 ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] ring-1 ring-cyan-300'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{opt.icon}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <strong className="text-sm font-black text-white">{opt.name}</strong>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${opt.badgeColor}`}>
                            {opt.tag}
                          </span>
                        </div>
                        <p className="text-xs text-white/70 font-sans mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-cyan-300 shrink-0 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expressive Dynamics Toggle */}
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div className="pr-2">
              <span className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-300" />
                <span>강박·약박 자연스러운 강약 표현 (다이내믹스)</span>
              </span>
              <span className="text-[11px] text-white/60 font-sans block mt-0.5">
                기계적인 연주 대신 1박은 깊게, 2·4박은 가볍게 살려 춤추듯 살아있는 리듬을 만듭니다.
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  expressiveDynamics: !prev.expressiveDynamics,
                }))
              }
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                settings.expressiveDynamics ? 'bg-cyan-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                  settings.expressiveDynamics ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Master Volume Slider */}
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-1 text-xs font-bold">
              <span className="text-cyan-200 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-cyan-300" />
                <span>마스터 볼륨</span>
              </span>
              <span className="text-white font-mono">{Math.round(settings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={(e) => setSettings((prev) => ({ ...prev, volume: Number(e.target.value) }))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Reverb Toggle */}
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-cyan-200 block">공간감 잔향 (콘서트홀 리버브)</span>
              <span className="text-[11px] text-white/60 font-sans">
                칼림바 쇠 건반의 깊은 여운을 만들어주는 맑은 공간 앰비언스 효과
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, reverbEnabled: !prev.reverbEnabled }))}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                settings.reverbEnabled ? 'bg-cyan-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                  settings.reverbEnabled ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>설정 초기화</span>
            </button>

            <div className="flex items-center space-x-2">
              {/* A/B 비교 청취 버튼 */}
              <button
                type="button"
                onClick={handlePlaySampleMelody}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer border ${
                  isPlayingSample
                    ? 'bg-amber-400 text-amber-950 border-amber-300 animate-pulse'
                    : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-400/40'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>{isPlayingSample ? '소리 멈추기' : 'A/B 샘플 비교 듣기'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-linear-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-[#0c0827] text-xs font-black transition cursor-pointer shadow-md"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
