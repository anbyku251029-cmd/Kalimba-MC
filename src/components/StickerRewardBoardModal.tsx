/**
 * StickerRewardBoardModal.tsx
 * 구구가가(GuGuGaGa) 10종 스티커 수집 및 보상판 모달 컴포넌트
 * 
 * 마디 구간 연습을 완주할 때마다 스티커가 해금되며,
 * 어린이가 성취감을 느낄 수 있는 시각적/청각적 축하 피드백을 제공합니다.
 */

import React, { useState, useEffect } from 'react';
import { Award, Lock, Sparkles, X, Volume2, CheckCircle2 } from 'lucide-react';
import { GUGUGAGA_STICKERS, TOTAL_GUGUGAGA_STICKERS } from '../constants/gugugagaStickers';
import { GuguGagaSticker, UserPracticeRewardsData } from '../types/practiceRewardTypes';
import {
  getPracticeRewardsData,
  getNextStickerMilestone,
} from '../utils/practiceRewardService';
import { speechNarrator } from '../utils/speechNarrationService';

interface StickerRewardBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 새로 획득한 스티커가 있을 때 전달하여 축하 효과를 트리거
  celebrationStickers?: GuguGagaSticker[];
}

export const StickerRewardBoardModal: React.FC<StickerRewardBoardModalProps> = ({
  isOpen,
  onClose,
  celebrationStickers = [],
}) => {
  const [rewardData, setRewardData] = useState<UserPracticeRewardsData>(getPracticeRewardsData());
  const [selectedSticker, setSelectedSticker] = useState<GuguGagaSticker | null>(null);

  // 모달이 열리거나 축하 스티커가 갱신될 때 데이터 동기화
  useEffect(() => {
    if (isOpen) {
      const data = getPracticeRewardsData();
      setRewardData(data);

      if (celebrationStickers.length > 0) {
        setSelectedSticker(celebrationStickers[0]);
        speechNarrator.speak(
          `축하해요! ${celebrationStickers[0].name} 스티커를 새로 모았어요! ${celebrationStickers[0].encouragement}`
        );
      } else {
        speechNarrator.speak('구구가가 스티커 보상판이에요! 열심히 연습해서 열 개의 스티커를 모두 모아봐요.');
      }
    }
  }, [isOpen, celebrationStickers]);

  if (!isOpen) return null;

  const milestone = getNextStickerMilestone(rewardData);
  const unlockedCount = rewardData.unlockedStickerIds.length;
  const progressPercent = Math.round((unlockedCount / TOTAL_GUGUGAGA_STICKERS) * 100);

  const handleSpeakSticker = (sticker: GuguGagaSticker, isUnlocked: boolean) => {
    if (isUnlocked) {
      speechNarrator.speak(`${sticker.name}! ${sticker.encouragement}`);
    } else {
      const remaining = Math.max(0, sticker.requiredCompletions - rewardData.totalSectionCompletions);
      speechNarrator.speak(
        `${sticker.name} 스티커는 마디 연습을 ${remaining}번 더 완주하면 열려요!`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-linear-to-b from-[#1b1742] via-[#151236] to-[#0d0a27] border-2 border-cyan-400/40 rounded-3xl shadow-[0_0_60px_rgba(34,211,238,0.25)] text-white p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="text-3xl animate-bounce">🎨</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black bg-linear-to-r from-pink-300 via-amber-300 to-cyan-300 bg-clip-text text-transparent flex items-center space-x-2">
                <span>구구가가 스티커 보상판</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/30">
                  10종 컬렉션
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-cyan-200/70 font-sans mt-0.5">
                마디 반복 연습을 끝까지 완주할 때마다 귀여운 구구가가 친구들이 찾아와요!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 축하 배너 (새로 획득한 스티커가 있는 경우) */}
        {celebrationStickers.length > 0 && (
          <div className="my-3 p-3.5 bg-linear-to-r from-pink-500/25 via-amber-500/25 to-cyan-500/25 border-2 border-amber-300/60 rounded-2xl flex items-center justify-between animate-pulse shrink-0">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🎉</span>
              <div>
                <span className="text-xs text-amber-300 font-bold block">새로운 보상 획득!</span>
                <span className="text-sm sm:text-base font-black text-white">
                  {celebrationStickers.map((s) => s.name).join(', ')} 스티커를 선물 받았어요!
                </span>
              </div>
            </div>
            <Sparkles className="w-6 h-6 text-amber-300 shrink-0" />
          </div>
        )}

        {/* 진행 현황 요약 바 */}
        <div className="my-3 p-3.5 sm:p-4 bg-white/5 border border-white/10 rounded-2xl shrink-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-300" />
              <span className="text-white/80">내 스티커 수집 현황:</span>
              <span className="font-black text-cyan-300 text-sm">
                {unlockedCount} / {TOTAL_GUGUGAGA_STICKERS}개
              </span>
            </div>
            <div className="text-white/70">
              누적 마디 완주:{' '}
              <span className="font-black text-amber-300 text-sm">
                {rewardData.totalSectionCompletions}회
              </span>
            </div>
            {milestone.nextSticker && (
              <div className="text-pink-300 font-bold bg-pink-500/10 px-2 py-0.5 rounded-lg border border-pink-500/20">
                다음 보상: {milestone.nextSticker.name} ({milestone.remainingCount}회 남음)
              </div>
            )}
          </div>

          {/* 게이지 바 */}
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
            <div
              className="bg-linear-to-r from-pink-500 via-amber-400 to-cyan-400 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(251,191,36,0.6)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 10개 스티커 그리드 (스크롤 가능 영역) */}
        <div className="flex-1 overflow-y-auto pr-1 my-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {GUGUGAGA_STICKERS.map((sticker) => {
              const isUnlocked = rewardData.unlockedStickerIds.includes(sticker.id);
              const unlockedTime = rewardData.stickerUnlockedDates[sticker.id];
              const isSelected = selectedSticker?.id === sticker.id;

              return (
                <div
                  key={sticker.id}
                  onClick={() => {
                    setSelectedSticker(sticker);
                    handleSpeakSticker(sticker, isUnlocked);
                  }}
                  className={`relative p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-between text-center select-none ${
                    isUnlocked
                      ? `bg-linear-to-b ${sticker.gradient} border-white/40 shadow-lg hover:scale-103 active:scale-98 ${
                          isSelected ? 'ring-4 ring-white shadow-[0_0_25px_rgba(255,255,255,0.6)] scale-103' : ''
                        }`
                      : 'bg-black/30 border-white/10 opacity-70 hover:opacity-90 hover:border-white/20'
                  }`}
                  style={{ minHeight: '140px' }}
                >
                  {/* 상단 번호 뱃지 */}
                  <div className="w-full flex items-center justify-between text-[10px] font-black">
                    <span
                      className={`px-1.5 py-0.5 rounded-md ${
                        isUnlocked ? 'bg-black/30 text-white' : 'bg-white/10 text-white/50'
                      }`}
                    >
                      #{sticker.number}
                    </span>
                    {isUnlocked ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <span className="text-[10px] text-white/50 flex items-center space-x-0.5">
                        <Lock className="w-3 h-3 inline" />
                        <span>{sticker.requiredCompletions}회</span>
                      </span>
                    )}
                  </div>

                  {/* 중앙 캐릭터 이모지 */}
                  <div className="my-1.5">
                    {isUnlocked ? (
                      <div className="text-4xl sm:text-5xl drop-shadow-md animate-pulse">
                        {sticker.emoji}
                      </div>
                    ) : (
                      <div className="text-3xl sm:text-4xl opacity-30 filter grayscale">
                        {sticker.emoji}
                      </div>
                    )}
                  </div>

                  {/* 하단 스티커 이름 및 획득 상태 */}
                  <div className="w-full">
                    <div
                      className={`font-black text-xs sm:text-sm truncate leading-tight ${
                        isUnlocked ? 'text-white drop-shadow-xs' : 'text-white/60'
                      }`}
                    >
                      {sticker.name}
                    </div>
                    <div className="text-[10px] text-white/80 font-sans mt-0.5 truncate">
                      {isUnlocked
                        ? sticker.tagline
                        : `${sticker.requiredCompletions - rewardData.totalSectionCompletions}회 더 연습`}
                    </div>
                  </div>

                  {/* 해금 축하 뱃지 */}
                  {isUnlocked && unlockedTime && (
                    <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
                      획득
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 선택된 스티커 상세 설명 카드 */}
          {selectedSticker && (
            <div className="mt-4 p-4 rounded-2xl bg-white/10 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-3.5 text-left">
                <span className="text-4xl">{selectedSticker.emoji}</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-base text-white">{selectedSticker.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/40 font-bold">
                      {selectedSticker.tagline}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 font-sans mt-1">
                    {selectedSticker.character}
                  </p>
                  <p className="text-xs text-amber-300 font-bold mt-0.5">
                    "{selectedSticker.encouragement}"
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const isUnlocked = rewardData.unlockedStickerIds.includes(selectedSticker.id);
                  handleSpeakSticker(selectedSticker, isUnlocked);
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 text-xs font-bold flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>소리로 듣기</span>
              </button>
            </div>
          )}
        </div>

        {/* 하단 버튼 바 */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-white/50">
            * 마디 구간 연습에서 1회 이상 완주하면 횟수가 누적됩니다.
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-linear-to-r from-pink-500 to-rose-500 hover:brightness-110 text-white font-black text-xs sm:text-sm shadow-md transition cursor-pointer"
          >
            확인 (연습하러 가기)
          </button>
        </div>
      </div>
    </div>
  );
};
