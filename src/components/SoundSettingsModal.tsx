import React, { useState, useEffect } from 'react';
import { X, Volume2, Sparkles, RotateCcw, Check, Music } from 'lucide-react';
import { audioEngine, KalimbaTimbreMode, AudioSettings } from '../utils/audioEngine';

interface SoundSettingsModalProps {
  onClose: () => void;
}

const TIMBRE_OPTIONS: {
  id: KalimbaTimbreMode;
  name: string;
  tag: string;
  desc: string;
  icon: string;
}[] = [
  {
    id: 'default',
    name: '기본 칼림바',
    tag: '표준 밸런스',
    desc: '따뜻한 통 울림과 맑은 쇠 건반 소리가 자연스럽게 어우러지는 기본 음색',
    icon: '🎵',
  },
  {
    id: 'bright',
    name: '맑은 크리스탈',
    tag: '청아한 고음',
    desc: '상위 금속 배음(5.4배)과 어택을 또렷하게 살려 보석처럼 투명한 울림',
    icon: '✨',
  },
  {
    id: 'soft',
    name: '부드러운 목재',
    tag: '포근한 공명',
    desc: '날카로운 어택을 깎고 450Hz 목재 울림통 공명을 강조한 자장가풍 음색',
    icon: '🪵',
  },
];

export const SoundSettingsModal: React.FC<SoundSettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<AudioSettings>(() => audioEngine.getSettings());

  useEffect(() => {
    audioEngine.updateSettings(settings);
  }, [settings]);

  // 음색 변경 시 해당 음색으로 "도-미-솔-도'" 샘플 화음 재생
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

  const handleTestChime = () => {
    audioEngine.ensureReady();
    audioEngine.stopAll();
    const melody = [
      { pitch: 'C4', dur: 1 },
      { pitch: 'E4', dur: 1 },
      { pitch: 'G4', dur: 1 },
      { pitch: 'C5', dur: 2 },
    ];
    let time = 0;
    melody.forEach((m) => {
      setTimeout(() => {
        audioEngine.playNote(m.pitch, m.dur, 90, 1.0);
      }, time * 200);
      time += m.dur;
    });
  };

  const handleReset = () => {
    const defaults: AudioSettings = {
      timbre: 'default',
      volume: 0.8,
      reverbEnabled: true,
    };
    setSettings(defaults);
    audioEngine.updateSettings(defaults);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs font-['Jua',sans-serif]">
      <div className="bg-[#141036] border-2 border-cyan-400/60 rounded-3xl max-w-lg w-full p-5 sm:p-7 text-white shadow-[0_0_40px_rgba(34,211,238,0.25)] relative my-auto">
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
              <span>칼림바 사운드 음색 설정</span>
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </h2>
            <p className="text-xs text-white/70 font-sans">
              아이의 취향에 맞춰 3가지 전문 물리 합성 음색과 공간감을 선택하세요
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Timbre Cards */}
          <div>
            <label className="block text-xs font-bold text-cyan-200 mb-2">
              칼림바 음색 종류 (클릭 시 소리를 미리 들려줍니다)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {TIMBRE_OPTIONS.map((opt) => {
                const isSelected = settings.timbre === opt.id;
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
                          <span className="text-[10px] bg-white/10 text-cyan-200 px-2 py-0.5 rounded-full font-bold">
                            {opt.tag}
                          </span>
                        </div>
                        <p className="text-xs text-white/60 font-sans mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-cyan-300 shrink-0 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
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
              <span className="text-xs font-bold text-cyan-200 block">공간감 잔향 (리버브)</span>
              <span className="text-[11px] text-white/60 font-sans">
                콘서트홀처럼 맑고 깊은 여운을 주는 스테레오 앰비언스 효과
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, reverbEnabled: !prev.reverbEnabled }))}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
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
              <button
                type="button"
                onClick={handleTestChime}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Music className="w-3.5 h-3.5" />
                <span>테스트 연주</span>
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
