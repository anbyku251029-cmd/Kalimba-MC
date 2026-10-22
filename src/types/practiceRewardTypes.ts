/**
 * practiceRewardTypes.ts
 * 마디별 구간 연습 달성 횟수에 따른 스티커 수집 및 보상 시스템 타입 정의
 * (구구가가 10종 스티커 테마)
 */

export interface GuguGagaSticker {
  id: string; // 예: 'gugugaga_01'
  number: number; // 1 ~ 10
  name: string; // 예: '구구 아기토끼'
  character: string; // 캐릭터 설명
  emoji: string; // 대표 이모지
  accentColor: string; // 테두리/배경 강조 색상 (Tailwind 호환 hex)
  gradient: string; // 카드 그라데이션
  requiredCompletions: number; // 해금에 필요한 누적 마디 연습 완주 횟수 (3, 5, 8, 10, ...)
  tagline: string; // 짧은 소개
  encouragement: string; // 획득 시 축하 메시지
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface SectionPracticeRecord {
  sectionKey: string; // `${songId}_m${startMeasure}-m${endMeasure}`
  songId: string;
  startMeasure: number;
  endMeasure: number;
  completedCount: number; // 완주 횟수
  lastCompletedAt: number; // Unix timestamp (ms)
}

export interface UserPracticeRewardsData {
  version: number; // 1
  totalSectionCompletions: number; // 전체 마디 연습 완주 누적 횟수
  unlockedStickerIds: string[]; // 해금된 스티커 ID 목록
  stickerUnlockedDates: Record<string, number>; // stickerId -> 해금 Unix timestamp (ms)
  sectionRecords: Record<string, SectionPracticeRecord>; // sectionKey -> 기록
  lastUpdated: number;
}

export interface SectionCompletionResult {
  isSuccess: boolean;
  sectionKey: string;
  previousTotal: number;
  newTotal: number;
  sectionCount: number;
  newlyUnlockedStickers: GuguGagaSticker[]; // 이번 완주로 새롭게 획득한 구구가가 스티커 목록
}
