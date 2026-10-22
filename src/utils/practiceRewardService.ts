/**
 * practiceRewardService.ts
 * 마디 연습 완주 기록 관리 및 구구가가 10종 스티커 보상 처리 서비스
 * 
 * 저장소 키: 'kalimba-mc-practice-rewards-v1' (기존 데이터와 철저히 격리)
 */

import { GUGUGAGA_STICKERS, TOTAL_GUGUGAGA_STICKERS } from '../constants/gugugagaStickers';
import {
  GuguGagaSticker,
  SectionCompletionResult,
  UserPracticeRewardsData,
} from '../types/practiceRewardTypes';

export const REWARD_STORAGE_KEY = 'kalimba-mc-practice-rewards-v1';

// 메모리 폴백 (Node.js 테스트 또는 로컬스토리지 비활성화 브라우저 대비)
let memoryStoreFallback: UserPracticeRewardsData | null = null;

export function getDefaultRewardData(): UserPracticeRewardsData {
  return {
    version: 1,
    totalSectionCompletions: 0,
    unlockedStickerIds: [],
    stickerUnlockedDates: {},
    sectionRecords: {},
    lastUpdated: Date.now(),
  };
}

/**
 * 저장소에서 현재 보상 상태를 안전하게 로드합니다.
 */
export function getPracticeRewardsData(): UserPracticeRewardsData {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(REWARD_STORAGE_KEY);
      if (!raw) return getDefaultRewardData();
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.version === 1) {
        return {
          version: 1,
          totalSectionCompletions: Number(parsed.totalSectionCompletions) || 0,
          unlockedStickerIds: Array.isArray(parsed.unlockedStickerIds) ? parsed.unlockedStickerIds : [],
          stickerUnlockedDates: parsed.stickerUnlockedDates && typeof parsed.stickerUnlockedDates === 'object'
            ? parsed.stickerUnlockedDates
            : {},
          sectionRecords: parsed.sectionRecords && typeof parsed.sectionRecords === 'object'
            ? parsed.sectionRecords
            : {},
          lastUpdated: Number(parsed.lastUpdated) || Date.now(),
        };
      }
    }
  } catch {
    // 로컬스토리지 파싱 에러 시 폴백 사용
  }

  return memoryStoreFallback ? { ...memoryStoreFallback } : getDefaultRewardData();
}

/**
 * 보상 상태를 저장소에 기록합니다.
 */
export function savePracticeRewardsData(data: UserPracticeRewardsData): void {
  const updatedData: UserPracticeRewardsData = {
    ...data,
    lastUpdated: Date.now(),
  };

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(REWARD_STORAGE_KEY, JSON.stringify(updatedData));
      return;
    }
  } catch {
    // 로컬스토리지 쓰기 제한 시 메모리 유지
  }

  memoryStoreFallback = updatedData;
}

/**
 * 마디 구간 연습 완주를 기록하고, 조건 달성 시 구구가가 스티커를 지급합니다.
 * 
 * @param songId 곡 고유 ID
 * @param startMeasure 시작 마디 (1-based)
 * @param endMeasure 종료 마디 (1-based, >= startMeasure)
 * @returns 완주 결과 및 신규 해금된 스티커 목록
 */
export function recordSectionPracticeCompletion(
  songId: string,
  startMeasure: number,
  endMeasure: number
): SectionCompletionResult {
  // 마디 유효성 검증
  if (!songId || startMeasure < 1 || endMeasure < startMeasure) {
    return {
      isSuccess: false,
      sectionKey: '',
      previousTotal: 0,
      newTotal: 0,
      sectionCount: 0,
      newlyUnlockedStickers: [],
    };
  }

  const sectionKey = `${songId}_m${startMeasure}-m${endMeasure}`;
  const currentData = getPracticeRewardsData();
  const previousTotal = currentData.totalSectionCompletions;
  const newTotal = previousTotal + 1;

  // 해당 섹션의 기록 업데이트
  const existingSection = currentData.sectionRecords[sectionKey] || {
    sectionKey,
    songId,
    startMeasure,
    endMeasure,
    completedCount: 0,
    lastCompletedAt: 0,
  };

  const newSectionCount = existingSection.completedCount + 1;
  const now = Date.now();

  const updatedSectionRecords = {
    ...currentData.sectionRecords,
    [sectionKey]: {
      ...existingSection,
      completedCount: newSectionCount,
      lastCompletedAt: now,
    },
  };

  // 새로 해금 가능한 구구가가 스티커 확인
  const newlyUnlocked: GuguGagaSticker[] = [];
  const updatedUnlockedIds = [...currentData.unlockedStickerIds];
  const updatedDates = { ...currentData.stickerUnlockedDates };

  for (const sticker of GUGUGAGA_STICKERS) {
    if (newTotal >= sticker.requiredCompletions && !updatedUnlockedIds.includes(sticker.id)) {
      updatedUnlockedIds.push(sticker.id);
      updatedDates[sticker.id] = now;
      newlyUnlocked.push(sticker);
    }
  }

  const updatedRewardData: UserPracticeRewardsData = {
    version: 1,
    totalSectionCompletions: newTotal,
    unlockedStickerIds: updatedUnlockedIds,
    stickerUnlockedDates: updatedDates,
    sectionRecords: updatedSectionRecords,
    lastUpdated: now,
  };

  savePracticeRewardsData(updatedRewardData);

  return {
    isSuccess: true,
    sectionKey,
    previousTotal,
    newTotal,
    sectionCount: newSectionCount,
    newlyUnlockedStickers: newlyUnlocked,
  };
}

/**
 * 다음 스티커 해금까지 남은 목표 정보를 조회합니다.
 */
export function getNextStickerMilestone(currentData?: UserPracticeRewardsData): {
  nextSticker: GuguGagaSticker | null;
  remainingCount: number;
  totalUnlocked: number;
  progressPercent: number;
} {
  const data = currentData || getPracticeRewardsData();
  const total = data.totalSectionCompletions;
  const totalUnlocked = data.unlockedStickerIds.length;

  // 다음 잠긴 스티커 중 가장 낮은 requiredCompletions를 가진 스티커 찾기
  const lockedStickers = GUGUGAGA_STICKERS.filter(
    (s) => !data.unlockedStickerIds.includes(s.id)
  );

  if (lockedStickers.length === 0) {
    return {
      nextSticker: null,
      remainingCount: 0,
      totalUnlocked: TOTAL_GUGUGAGA_STICKERS,
      progressPercent: 100,
    };
  }

  const nextSticker = lockedStickers[0];
  const remaining = Math.max(0, nextSticker.requiredCompletions - total);
  const progressPercent = Math.min(100, Math.round((total / nextSticker.requiredCompletions) * 100));

  return {
    nextSticker,
    remainingCount: remaining,
    totalUnlocked,
    progressPercent,
  };
}

/**
 * 특정 마디 구간의 완주 횟수를 조회합니다.
 */
export function getSectionPracticeCount(
  songId: string,
  startMeasure: number,
  endMeasure: number
): number {
  const sectionKey = `${songId}_m${startMeasure}-m${endMeasure}`;
  const data = getPracticeRewardsData();
  return data.sectionRecords[sectionKey]?.completedCount || 0;
}

/**
 * (테스트용 또는 초기화용) 메모리 상태 리셋
 */
export function _resetRewardStoreForTesting(): void {
  memoryStoreFallback = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(REWARD_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}
