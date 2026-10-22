/**
 * practiceReward.test.ts
 * 마디 구간 연습 완주 기록 및 구구가가 10종 스티커 보상 시스템 단위 테스트
 */

import { GUGUGAGA_STICKERS, TOTAL_GUGUGAGA_STICKERS } from '../src/constants/gugugagaStickers';
import {
  recordSectionPracticeCompletion,
  getPracticeRewardsData,
  getNextStickerMilestone,
  getSectionPracticeCount,
  _resetRewardStoreForTesting,
  REWARD_STORAGE_KEY,
} from '../src/utils/practiceRewardService';

function runTests() {
  console.log('🧪 Starting Practice Reward & GuGuGaGa Stickers Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // TEST 1: 구구가가 10종 스티커 정의 무결성
  {
    console.log('Test 1: GuGuGaGa 10 Stickers Definition Integrity');
    assert(TOTAL_GUGUGAGA_STICKERS === 10, 'Total stickers count must be exactly 10');
    assert(GUGUGAGA_STICKERS.length === 10, 'GUGUGAGA_STICKERS array length must be 10');

    // 고유 ID 확인
    const idSet = new Set(GUGUGAGA_STICKERS.map((s) => s.id));
    assert(idSet.size === 10, 'All 10 sticker IDs must be unique');

    // 1번~10번 순서 및 필수 필드 검증
    GUGUGAGA_STICKERS.forEach((sticker, idx) => {
      assert(sticker.number === idx + 1, `Sticker #${idx + 1} has correct number`);
      assert(typeof sticker.name === 'string' && sticker.name.length > 0, `Sticker ${sticker.id} has name`);
      assert(typeof sticker.emoji === 'string' && sticker.emoji.length > 0, `Sticker ${sticker.id} has emoji`);
      assert(sticker.requiredCompletions > 0, `Sticker ${sticker.id} required completions > 0`);
      assert(sticker.encouragement.length > 0, `Sticker ${sticker.id} has encouragement`);
    });

    // 임계값 순차 증가 확인 (오름차순)
    let isAscending = true;
    for (let i = 1; i < GUGUGAGA_STICKERS.length; i++) {
      if (GUGUGAGA_STICKERS[i].requiredCompletions <= GUGUGAGA_STICKERS[i - 1].requiredCompletions) {
        isAscending = false;
        break;
      }
    }
    assert(isAscending === true, 'Sticker milestone thresholds must be strictly ascending');
    assert(GUGUGAGA_STICKERS[0].requiredCompletions === 3, '1st sticker unlocked at 3 completions');
    assert(GUGUGAGA_STICKERS[1].requiredCompletions === 5, '2nd sticker unlocked at 5 completions');
    assert(GUGUGAGA_STICKERS[3].requiredCompletions === 10, '4th special sticker unlocked at 10 completions');
    assert(GUGUGAGA_STICKERS[9].requiredCompletions === 40, '10th master sticker unlocked at 40 completions');
  }

  // TEST 2: 마디 구간 연습 완주 카운트 증가 및 마일스톤 해금 검증
  {
    console.log('\nTest 2: Practice Section Completion & Milestone Unlocking');
    _resetRewardStoreForTesting();

    // 초기 상태 검증
    const initialData = getPracticeRewardsData();
    assert(initialData.totalSectionCompletions === 0, 'Initial completions count should be 0');
    assert(initialData.unlockedStickerIds.length === 0, 'Initially 0 stickers unlocked');

    const m0 = getNextStickerMilestone(initialData);
    assert(m0.nextSticker?.id === 'gugugaga_01', 'First target sticker is gugugaga_01');
    assert(m0.remainingCount === 3, 'Remaining completions is 3');

    // 1회 완주: '곰 세마리' 1~4마디
    const r1 = recordSectionPracticeCompletion('song_beginner_01', 1, 4);
    assert(r1.isSuccess === true, '1st completion recorded successfully');
    assert(r1.newTotal === 1, 'Total completions is now 1');
    assert(r1.sectionCount === 1, 'Section count is 1');
    assert(r1.newlyUnlockedStickers.length === 0, 'No sticker unlocked at 1 completion (needs 3)');

    // 2회 완주: 동일 구간
    const r2 = recordSectionPracticeCompletion('song_beginner_01', 1, 4);
    assert(r2.newTotal === 2, 'Total completions is now 2');
    assert(r2.newlyUnlockedStickers.length === 0, 'No sticker unlocked at 2 completions (needs 3)');

    // 3회 완주: '작은 별' 1~4마디 -> 1차 스티커(구구 아기토끼) 해금!
    const r3 = recordSectionPracticeCompletion('song_beginner_02', 1, 4);
    assert(r3.newTotal === 3, 'Total completions is now 3');
    assert(r3.newlyUnlockedStickers.length === 1, 'Exactly 1 sticker newly unlocked at 3 completions');
    assert(r3.newlyUnlockedStickers[0].id === 'gugugaga_01', 'Unlocked sticker is gugugaga_01 (구구 아기토끼)');
    assert(r3.newlyUnlockedStickers[0].name === '구구 아기토끼', 'Sticker name is 구구 아기토끼');

    // 4회 완주: 추가 스티커 없음
    const r4 = recordSectionPracticeCompletion('song_beginner_02', 1, 4);
    assert(r4.newTotal === 4, 'Total completions is now 4');
    assert(r4.newlyUnlockedStickers.length === 0, 'No new sticker at 4 completions');

    // 5회 완주: 2차 스티커(가가 아기곰) 해금!
    const r5 = recordSectionPracticeCompletion('song_beginner_02', 1, 4);
    assert(r5.newTotal === 5, 'Total completions is now 5');
    assert(r5.newlyUnlockedStickers.length === 1, '1 sticker unlocked at 5 completions');
    assert(r5.newlyUnlockedStickers[0].id === 'gugugaga_02', 'Unlocked sticker is gugugaga_02 (가가 아기곰)');
  }

  // TEST 3: 중복 해금 방지 및 섹션별 카운트 조회
  {
    console.log('\nTest 3: Duplicate Award Prevention & Section Count Retrieval');
    const currentData = getPracticeRewardsData();
    assert(currentData.unlockedStickerIds.length === 2, 'Total 2 stickers currently unlocked');
    assert(currentData.unlockedStickerIds.includes('gugugaga_01'), 'Includes gugugaga_01');
    assert(currentData.unlockedStickerIds.includes('gugugaga_02'), 'Includes gugugaga_02');

    // 섹션별 카운트 확인
    const countB1 = getSectionPracticeCount('song_beginner_01', 1, 4);
    const countB2 = getSectionPracticeCount('song_beginner_02', 1, 4);
    assert(countB1 === 2, 'song_beginner_01 m1-m4 completed 2 times');
    assert(countB2 === 3, 'song_beginner_02 m1-m4 completed 3 times');
  }

  // TEST 4: 유효하지 않은 마디 입력 방어
  {
    console.log('\nTest 4: Invalid Measure Range Protection');
    const inv1 = recordSectionPracticeCompletion('', 1, 4);
    assert(inv1.isSuccess === false, 'Empty songId rejected');

    const inv2 = recordSectionPracticeCompletion('song_01', 0, 4);
    assert(inv2.isSuccess === false, 'startMeasure < 1 rejected');

    const inv3 = recordSectionPracticeCompletion('song_01', 5, 2);
    assert(inv3.isSuccess === false, 'endMeasure < startMeasure rejected');
  }

  // TEST 5: 스토리지 격리 및 기존 데이터 보존 검증
  {
    console.log('\nTest 5: Storage Isolation & Non-interference with Existing Hymns / Progress');
    // 모의 브라우저 localStorage 환경
    const mockStorage: Record<string, string> = {
      custom_hymns_v1: JSON.stringify([{ id: 'custom_hymn_1', title: '사용자 찬송가 1' }]),
      kalimba_learning_progress_v1: JSON.stringify({ version: 1, records: {} }),
    };

    (global as unknown as { window: { localStorage: Storage } }).window = {
      localStorage: {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        clear: () => {},
        length: Object.keys(mockStorage).length,
        key: () => null,
      } as unknown as Storage,
    };

    // 보상 기록
    recordSectionPracticeCompletion('test_song', 1, 2);

    assert(mockStorage[REWARD_STORAGE_KEY] !== undefined, 'Rewards data written to its dedicated key');
    assert(mockStorage['custom_hymns_v1'].includes('사용자 찬송가 1'), 'Custom hymns localStorage is 100% untouched');
    assert(mockStorage['kalimba_learning_progress_v1'].includes('version'), 'Learning progress localStorage is 100% untouched');
  }

  console.log(`\n========================================`);
  console.log(`Practice Reward Tests: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
