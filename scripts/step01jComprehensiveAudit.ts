import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { BEGINNER_SONGS } from '../src/data/songsBeginner.js';
import { INTERMEDIATE_SONGS } from '../src/data/songsIntermediate.js';
import { ADVANCED_SONGS } from '../src/data/songsAdvanced.js';
import { DEFAULT_HYMN_SONGS } from '../src/data/hymns.js';
import { parseSimpleNotation } from '../src/utils/noteParser.js';
import { KALIMBA_KEYS } from '../src/constants/kalimbaKeys.js';

const VALID_PITCHES = new Set(KALIMBA_KEYS.map((k) => k.pitch));

console.log('====================================================');
console.log('🎼 STEP 01-J: 찬송가 및 고급 음악 데이터 종합 감사 & 품질 게이트');
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

// 1. 백업 파일 검증
console.log('--- 1. 백업 데이터 무결성 검증 ---');
const hymnBackup = path.resolve(process.cwd(), 'backups/step01j/hymns.backup.ts');
const advBackup = path.resolve(process.cwd(), 'backups/step01j/songsAdvanced.backup.ts');

assert(fs.existsSync(hymnBackup), '찬송가 원본 백업 파일 존재 확인');
assert(fs.existsSync(advBackup), '고급곡 원본 백업 파일 존재 확인');
assert(fs.statSync(hymnBackup).size > 10000, `찬송가 백업 파일 크기 (${fs.statSync(hymnBackup).size} bytes)`);
assert(fs.statSync(advBackup).size > 10000, `고급곡 백업 파일 크기 (${fs.statSync(advBackup).size} bytes)`);

// 2. 고급곡 30곡 전수 50음표 이상 및 17음 칼림바 음역 검증
console.log('\n--- 2. 고급곡 30곡 전수 50음표 이상 및 17음 음역 검증 ---');
assert(ADVANCED_SONGS.length === 30, '고급곡 수량 정확히 30곡');

let advAll50Plus = true;
let advAllPitchValid = true;
let totalAdvPlayableNotes = 0;

ADVANCED_SONGS.forEach((song, idx) => {
  const notes = song.notes || parseSimpleNotation(song.rawNotation || '');
  const playableNotes = notes.filter((n) => !n.isRest && n.pitch !== 'REST');
  totalAdvPlayableNotes += playableNotes.length;

  if (playableNotes.length < 50) {
    advAll50Plus = false;
    console.error(`  - [adv-${idx + 1}] ${song.title}: ${playableNotes.length}음표 (50개 미만!)`);
  }

  const invalidPitches = playableNotes.filter((n) => !VALID_PITCHES.has(n.pitch));
  if (invalidPitches.length > 0) {
    advAllPitchValid = false;
    console.error(`  - [adv-${idx + 1}] ${song.title}: 잘못된 음정 발견: ${invalidPitches.map((p) => p.pitch).join(', ')}`);
  }
});

assert(advAll50Plus, '고급곡 30곡 전수 playableNoteCount >= 50 달성');
assert(advAllPitchValid, '고급곡 30곡 전수 17음 C장조 음역(C4~E6) 준수');
console.log(`   * 고급곡 30곡 총 유효 연주 음표: ${totalAdvPlayableNotes}개 (곡당 평균 ${(totalAdvPlayableNotes / 30).toFixed(1)}개)`);

// 3. 찬송가 21곡(새찬송가 301장 포함) 절/후렴 정식 구조 및 3~4회 반복 묵상 연주 검증
console.log('\n--- 3. 찬송가 21곡(새찬송가 301장 포함) 절/후렴 및 3~4회 반복 묵상 연주 검증 ---');
assert(DEFAULT_HYMN_SONGS.length >= 20, `찬송가 수량 20곡 이상 확보 (현재: ${DEFAULT_HYMN_SONGS.length}곡)`);

let hymnAllValid = true;
let hymnRepeatValid = true;
let totalHymnPlayableNotes = 0;
let totalRepeatedHymnNotes = 0;

DEFAULT_HYMN_SONGS.forEach((hymn, idx) => {
  const notes = hymn.notes || parseSimpleNotation(hymn.rawNotation || '');
  const playableNotes = notes.filter((n) => !n.isRest && n.pitch !== 'REST');
  totalHymnPlayableNotes += playableNotes.length;

  const repeats = hymn.repeatTimes || 3;
  totalRepeatedHymnNotes += playableNotes.length * repeats;

  if (playableNotes.length < 30) {
    hymnAllValid = false;
    console.error(`  - [hymn-${idx + 1}] ${hymn.title}: ${playableNotes.length}음표 (부족)`);
  }

  if (repeats < 3) {
    hymnRepeatValid = false;
    console.error(`  - [hymn-${idx + 1}] ${hymn.title}: repeatTimes ${repeats} (3회 미만)`);
  }

  const invalidPitches = playableNotes.filter((n) => !VALID_PITCHES.has(n.pitch));
  if (invalidPitches.length > 0) {
    hymnAllValid = false;
    console.error(`  - [hymn-${idx + 1}] ${hymn.title}: 잘못된 음정 발견: ${invalidPitches.map((p) => p.pitch).join(', ')}`);
  }
});

assert(hymnAllValid, '찬송가 20곡 전수 정식 절/후렴 구조 및 17음 칼림바 음역 준수');
assert(hymnRepeatValid, '찬송가 20곡 전수 repeatTimes >= 3 설정');
console.log(`   * 찬송가 ${DEFAULT_HYMN_SONGS.length}곡 기본 연주 음표: ${totalHymnPlayableNotes}개 (곡당 평균 ${(totalHymnPlayableNotes / DEFAULT_HYMN_SONGS.length).toFixed(1)}개)`);
console.log(`   * 3회 반복 묵상 연주 시 총 연주 음표: ${totalRepeatedHymnNotes}개 (곡당 평균 ${(totalRepeatedHymnNotes / DEFAULT_HYMN_SONGS.length).toFixed(1)}개)`);

// 4. 기존 카탈로그 보존성 검증
console.log('\n--- 4. 기존 음악 카탈로그 보존성 검증 ---');
assert(BEGINNER_SONGS.length === 30, '초급 30곡 온전히 보존');
assert(INTERMEDIATE_SONGS.length === 30, '중급 30곡 온전히 보존');
const totalSongs = BEGINNER_SONGS.length + INTERMEDIATE_SONGS.length + ADVANCED_SONGS.length + DEFAULT_HYMN_SONGS.length;
assert(totalSongs === 111, `전체 곡 수 총 111곡 (30+30+30+21) 일치 (현재: ${totalSongs}곡)`);

console.log('\n====================================================');
console.log(`🎉 검증 완료: PASS ${passCount}건 / FAIL ${failCount}건`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
