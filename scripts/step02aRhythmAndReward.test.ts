import { RhythmJudgeManager } from '../src/utils/rhythmJudge';
import { calculateSongTimeline, TimedNoteItem } from '../src/utils/musicTiming';
import { BEGINNER_SONGS } from '../src/data/songsBeginner';
import { DEFAULT_HYMN_SONGS } from '../src/data/hymns';
import { recordSectionPracticeCompletion, getPracticeRewardsData } from '../src/utils/practiceRewardService';

console.log('====================================================');
console.log('🥁 Kalimba-MC STEP 02-A: 리듬 콤보·캐릭터 반응·완주 보상 종합 테스트');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail: string = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName}: ${detail}`);
    failCount++;
  }
}

// 1. 리듬 판정 및 콤보 엔진 테스트
console.log('--- 1. 리듬 판정 및 콤보 엔진 단위 테스트 ---');
const testSong = BEGINNER_SONGS[0]; // 비행기 (tempo 90, 4/4)
const timeline = calculateSongTimeline(testSong, 100);
const playableNotes = timeline.playableItems.filter(n => !n.isRest && n.pitch !== 'REST');

const judge = new RhythmJudgeManager(playableNotes.length);

// 1.1 정확한 입력 5회 연속 -> 콤보 5
for (let i = 0; i < 5; i++) {
  const note = playableNotes[i];
  const res = judge.registerUserInput(
    note.keyIndex,
    note.beatTime, // 정확한 비트 타임에 입력 (오차 0ms)
    testSong.tempoBpm,
    1.0,
    playableNotes
  );
  assert(res.rating === 'PERFECT', `음표 ${i + 1} PERFECT 판정 확인`);
}
let stats = judge.getStats();
assert(stats.currentCombo === 5, '정확한 입력 5회 후 콤보 5 달성', `현재 콤보: ${stats.currentCombo}`);
assert(stats.maxCombo === 5, '최고 콤보 5 기록', `maxCombo: ${stats.maxCombo}`);

// 1.2 추가 정확한 입력 5회 -> 콤보 10
for (let i = 5; i < 10; i++) {
  const note = playableNotes[i];
  judge.registerUserInput(
    note.keyIndex,
    note.beatTime + 0.05, // 약간의 오차 (약 33ms) -> 여전히 PERFECT
    testSong.tempoBpm,
    1.0,
    playableNotes
  );
}
stats = judge.getStats();
assert(stats.currentCombo === 10, '정확한 입력 10회 후 콤보 10 달성', `현재 콤보: ${stats.currentCombo}`);
assert(stats.maxCombo === 10, '최고 콤보 10 기록', `maxCombo: ${stats.maxCombo}`);

// 1.3 잘못된 건반 입력(실패) 시 콤보 0 초기화 및 maxCombo 유지
const nextNote = playableNotes[10];
const wrongKeyIndex = (nextNote.keyIndex + 1) % 17;
const wrongRes = judge.registerUserInput(
  wrongKeyIndex,
  nextNote.beatTime,
  testSong.tempoBpm,
  1.0,
  playableNotes
);
assert(wrongRes.rating === 'MISS', '틀린 건반 입력 시 MISS 판정');
stats = judge.getStats();
assert(stats.currentCombo === 0, '실패 후 콤보 0으로 즉시 초기화', `현재 콤보: ${stats.currentCombo}`);
assert(stats.maxCombo === 10, '콤보 초기화 후에도 maxCombo 10 유지', `maxCombo: ${stats.maxCombo}`);

// 1.4 중복 입력 방지 (동일 음표에 다시 키 입력 시 이미 판정된 음표는 재판정되지 않음)
const dupRes = judge.registerUserInput(
  nextNote.keyIndex,
  nextNote.beatTime,
  testSong.tempoBpm,
  1.0,
  playableNotes
);
assert(dupRes.rating === 'NONE', '이미 판정된 음표의 중복 점수/콤보 지급 차단 확인');

// 1.5 쉼표 구간에서 불필요한 초기화(MISS) 없음
const restNote: TimedNoteItem = {
  id: 'rest-test',
  keyIndex: 8,
  pitch: 'REST',
  beatTime: 50.0,
  duration: 1.0,
  color: 'green',
  numberNotation: '0',
  octaveLevel: 0,
  solfege: '쉼',
  isRest: true,
  noteIndex: 99,
};
const missedRests = judge.checkPassedNotes(60.0, 90, 1.0, [restNote]);
assert(missedRests.length === 0, '쉼표 구간 통과 시 불필요한 MISS 발생 없음');

// 1.6 배속 변경(70%, 120%) 시 시간 오차 계산 및 판정 호환성
const slowJudge = new RhythmJudgeManager(playableNotes.length);
// 70% 배속에서 오차 0.05비트는 90 BPM 기준 약 47.6ms (±120ms 이내이므로 PERFECT)
const slowRes = slowJudge.registerUserInput(
  playableNotes[0].keyIndex,
  playableNotes[0].beatTime + 0.05,
  90,
  0.7,
  playableNotes
);
assert(slowRes.rating === 'PERFECT', '70% 저속 모드에서도 정확도 타이밍 정상 판정');

const fastJudge = new RhythmJudgeManager(playableNotes.length);
// 120% 고속 모드에서도 정상 판정
const fastRes = fastJudge.registerUserInput(
  playableNotes[0].keyIndex,
  playableNotes[0].beatTime,
  90,
  1.2,
  playableNotes
);
assert(fastRes.rating === 'PERFECT', '120% 고속 모드에서도 타이밍 정상 판정');

// 2. 구구가가 캐릭터 상태 전이 테스트
console.log('\n--- 2. 구구가가 캐릭터 상태 전이 로직 검증 ---');
type CharState = 'idle' | 'happy' | 'combo' | 'encourage' | 'celebrate';
let charState: CharState = 'idle';

function updateCharState(rating: string, combo: number): CharState {
  if (rating === 'CELEBRATE') return 'celebrate';
  if (rating === 'MISS') return 'encourage';
  if (rating === 'PERFECT' || rating === 'GREAT') {
    if (combo >= 5 && combo % 5 === 0) return 'combo';
    return 'happy';
  }
  return 'idle';
}

assert(updateCharState('PERFECT', 1) === 'happy', '단일 정확 입력 시 happy 상태');
assert(updateCharState('PERFECT', 5) === 'combo', '5콤보 달성 시 combo 상태');
assert(updateCharState('PERFECT', 10) === 'combo', '10콤보 달성 시 combo 상태');
assert(updateCharState('MISS', 0) === 'encourage', '실수 시 encourage (격려) 상태');
assert(updateCharState('CELEBRATE', 15) === 'celebrate', '완주 시 celebrate (축하) 상태');

// 3. 곡 완주 및 기존 스티커 보상 시스템 연동 검증
console.log('\n--- 3. 곡 완주 및 구구가가 스티커 보상 시스템 연동 검증 ---');
const prevRewardData = getPracticeRewardsData();
const prevCompletions = prevRewardData.totalSectionCompletions;

// 완주 1회 기록
const rewardResult = recordSectionPracticeCompletion('airplane', 1, 999);
assert(rewardResult.isSuccess === true, '완주 세션 보상 정상 기록');
assert(rewardResult.newTotal === prevCompletions + 1, '누적 완주 횟수 1 증가 확인');

const updatedRewardData = getPracticeRewardsData();
assert(updatedRewardData.totalSectionCompletions === prevCompletions + 1, '저장소 보상 데이터 일치');

// 4. 찬송가 3~4회 반복 묵상 연주 무결성 검증
console.log('\n--- 4. 찬송가 반복 재생 및 곡 완주 판정 구조 검증 ---');
const hymn301 = DEFAULT_HYMN_SONGS.find(h => h.hymnNumber === 301);
assert(hymn301 !== undefined, '새찬송가 301장 존재 확인');
assert((hymn301?.repeatTimes || 0) >= 3, '찬송가 3회 이상 기본 반복 설정 유지');

console.log('\n====================================================');
console.log(`🎉 종합 테스트 완료: PASS ${passCount}건 / FAIL ${failCount}건`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
