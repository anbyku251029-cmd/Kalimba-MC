/**
 * Kalimba-MC STEP 01-G
 * 마디 범위 선택 및 구간 추출 단위 테스트 스위트
 */

import { BEGINNER_SONGS } from '../src/data/songsBeginner';
import { INTERMEDIATE_SONGS } from '../src/data/songsIntermediate';
import { ADVANCED_SONGS } from '../src/data/songsAdvanced';
import { DEFAULT_HYMN_SONGS } from '../src/data/hymns';
import { extractMeasureData, getNotesInMeasureRange, getExpectedBeatsPerMeasure } from '../src/utils/measureParser';
import { Song } from '../src/types/music';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('================================================================');
console.log('🎼 Kalimba-MC STEP 01-G: 마디 범위 선택 및 구간 추출 단위 테스트');
console.log('================================================================\n');

// ----------------------------------------------------------------------
// 1. 박자표별 기대 비트 수 계산 검증
// ----------------------------------------------------------------------
console.log('--- 1. 박자표별 마디 기대 비트 계산 검증 ---');

assert(getExpectedBeatsPerMeasure('4/4') === 4.0, '4/4 박자표는 4.0박');
assert(getExpectedBeatsPerMeasure('3/4') === 3.0, '3/4 박자표는 3.0박');
assert(getExpectedBeatsPerMeasure('2/4') === 2.0, '2/4 박자표는 2.0박');
assert(getExpectedBeatsPerMeasure('6/8') === 3.0, '6/8 박자표는 3.0박 (점4분음표 2개 기준)');
assert(getExpectedBeatsPerMeasure(undefined) === 4.0, '기본 박자표는 4.0박');

// ----------------------------------------------------------------------
// 2. 비행기 (beginner-2, 8마디) 마디 메타데이터 추출 검증
// ----------------------------------------------------------------------
console.log('\n--- 2. 비행기 (beginner-2) 마디 메타데이터 추출 검증 ---');

const airplaneSong = BEGINNER_SONGS.find((s) => s.id === 'beginner-2')!;
assert(airplaneSong !== undefined, '비행기 곡 존재 확인');

const airplaneMeasures = extractMeasureData(airplaneSong);
assert(airplaneMeasures.totalMeasures === 8, `비행기는 8마디로 추출됨 (실제: ${airplaneMeasures.totalMeasures}마디)`);
assert(airplaneMeasures.measures.length === 8, '마디 배열 길이 8');
assert(airplaneMeasures.timeSignature === '4/4', '박자표 4/4 일치');

airplaneMeasures.measures.forEach((m, idx) => {
  assert(m.measureNumber === idx + 1, `${idx + 1}마디 번호 1-based 일치`);
  assert(m.notes.length > 0, `${idx + 1}마디에 음표 포함 (음표 수: ${m.notes.length})`);
  assert(m.totalBeats === 4.0, `${idx + 1}마디 박자 합 4.0박 일치`);
  assert(m.status === 'PASS', `${idx + 1}마디 상태 PASS`);
});

// ----------------------------------------------------------------------
// 3. 유효한 마디 범위 선택 검증 (예: 2~4마디)
// ----------------------------------------------------------------------
console.log('\n--- 3. 유효한 마디 범위 [2~4마디] 선택 검증 ---');

const range2to4 = getNotesInMeasureRange(airplaneMeasures, 2, 4);
assert(range2to4.isValidRange === true, '2~4마디 범위 유효함');
assert(range2to4.selectedMeasures.length === 3, '선택된 마디 수 3개 (2, 3, 4마디)');
assert(range2to4.totalBeats === 12.0, '총 비트 수 4*3 = 12.0박 일치');
assert(range2to4.startBeat === 4.0, '2마디 시작 비트는 4.0박 일치');
assert(range2to4.endBeat === 16.0, '4마디 종료 비트는 16.0박 일치');
assert(range2to4.notes.length > 0, '추출된 음표 존재');

// 1마디와 5마디 음표가 포함되지 않았는지 철저한 격리 검증
const firstMeasureFirstNoteId = airplaneMeasures.measures[0].notes[0].id;
const fifthMeasureFirstNoteId = airplaneMeasures.measures[4].notes[0].id;
const hasNoteFrom1 = range2to4.notes.some((n) => n.id === firstMeasureFirstNoteId);
const hasNoteFrom5 = range2to4.notes.some((n) => n.id === fifthMeasureFirstNoteId);
assert(!hasNoteFrom1, '1마디 음표는 선택 범위에 포함되지 않음');
assert(!hasNoteFrom5, '5마디 음표는 선택 범위에 포함되지 않음');

// ----------------------------------------------------------------------
// 4. 단일 마디(1마디만) 및 마지막 마디 선택 검증
// ----------------------------------------------------------------------
console.log('\n--- 4. 단일 마디 및 마지막 마디 선택 검증 ---');

// 1) 1마디만 선택 [1~1마디]
const singleMeasure = getNotesInMeasureRange(airplaneMeasures, 1, 1);
assert(singleMeasure.isValidRange === true, '단일 마디(1~1) 유효함');
assert(singleMeasure.selectedMeasures.length === 1, '선택 마디 수 1개');
assert(singleMeasure.totalBeats === 4.0, '총 4.0박');

// 2) 마지막 8마디만 선택 [8~8마디]
const lastMeasure = getNotesInMeasureRange(airplaneMeasures, 8, 8);
assert(lastMeasure.isValidRange === true, '마지막 마디(8~8) 유효함');
assert(lastMeasure.selectedMeasures.length === 1, '선택 마디 수 1개');
assert(lastMeasure.endBeat === 32.0, '곡 끝 비트 32.0박 일치');

// ----------------------------------------------------------------------
// 5. 예외 및 경계 조건 처리 검증
// ----------------------------------------------------------------------
console.log('\n--- 5. 예외 및 오류 범위 처리 검증 ---');

// 1) 시작 마디 > 종료 마디 (예: 5~3마디)
const invalidReverse = getNotesInMeasureRange(airplaneMeasures, 5, 3);
assert(invalidReverse.isValidRange === false, '시작마디 > 종료마디는 false 반환');
assert(invalidReverse.notes.length === 0, '오류 범위 시 빈 음표 배열 반환');

// 2) 종료 마디 > 전체 마디 수 (예: 1~99마디)
const invalidOverflow = getNotesInMeasureRange(airplaneMeasures, 1, 99);
assert(invalidOverflow.isValidRange === false, '전체 마디 초과는 false 반환');

// 3) 시작 마디 0 이하 (예: 0~4마디)
const invalidZero = getNotesInMeasureRange(airplaneMeasures, 0, 4);
assert(invalidZero.isValidRange === false, '0마디 시작은 false 반환');

// ----------------------------------------------------------------------
// 6. 전곡(110곡) 카탈로그 마디 추출 예외 0건 전수 검증
// ----------------------------------------------------------------------
console.log('\n--- 6. 전곡(110곡) 마디 메타데이터 추출 전수 검사 ---');

const allSongs: Song[] = [
  ...BEGINNER_SONGS,
  ...INTERMEDIATE_SONGS,
  ...ADVANCED_SONGS,
  ...DEFAULT_HYMN_SONGS,
];

let successfulExtracts = 0;
let totalMeasuresAcrossAll = 0;

allSongs.forEach((song) => {
  const data = extractMeasureData(song);
  if (data.totalMeasures > 0 && data.measures.length === data.totalMeasures) {
    successfulExtracts++;
    totalMeasuresAcrossAll += data.totalMeasures;
  }
});

assert(allSongs.length === 110, '카탈로그 110곡 전수 대상');
assert(successfulExtracts === 110, `110곡 전곡 마디 추출 100% 성공 (${successfulExtracts}/110)`);
assert(totalMeasuresAcrossAll > 1000, `총 마디 수 합계 1000개 이상 (${totalMeasuresAcrossAll}마디 집계)`);

// ----------------------------------------------------------------------
// 요약 출력
// ----------------------------------------------------------------------
console.log('\n================================================================');
console.log(`🎉 마디 선택 테스트 완료: 총 ${totalAssertions}개 단언문 중 ${passedAssertions}개 통과, ${failedAssertions}개 실패`);
console.log('================================================================');

if (failedAssertions > 0) {
  process.exit(1);
}
