/**
 * Kalimba-MC STEP 01-B: 음악 데이터 검증 엔진 자동 단위 테스트 스위트 (22개 테스트)
 */

import { Song, KalimbaNote } from '../src/types/music';
import { validateSong, validateCatalog, getExpectedBeatsPerMeasure } from '../src/utils/musicValidator';
import { parseSimpleNotation, notesToSimpleNotation, createKalimbaNote } from '../src/utils/noteParser';
import { VALIDATION_ERROR_CODES } from '../src/types/musicValidationTypes';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedCount++;
  }
}

console.log('========================================================');
console.log(' Kalimba-MC STEP 01-B: 음악 데이터 검증 엔진 22개 단위 테스트');
console.log('========================================================\n');

// 헬퍼: 기본 정상 곡 데이터
function createValidSong(overrides: Partial<Song> = {}): Song {
  return {
    id: 'test-song-1',
    title: '테스트 반짝반짝 작은별',
    level: 'beginner',
    levelLabel: '초급',
    description: '테스트용 곡입니다.',
    estimatedMinutes: 1,
    timeSignature: '4/4',
    tempoBpm: 80,
    recommendedHandHint: '양손',
    tags: ['동요'],
    rawNotation: '1 1 5 5 | 6 6 5-',
    notes: [
      createKalimbaNote('C4', 1),
      createKalimbaNote('C4', 1),
      createKalimbaNote('G4', 1),
      createKalimbaNote('G4', 1),
      createKalimbaNote('A4', 1),
      createKalimbaNote('A4', 1),
      createKalimbaNote('G4', 2),
    ],
    ...overrides,
  };
}

// ----------------------------------------------------
// 테스트 1: 정상적인 곡 데이터 검증
// ----------------------------------------------------
console.log('[테스트 1] 정상적인 곡 데이터');
{
  const song = createValidSong();
  const report = validateSong(song);
  assert(report.status === 'PASS', '정상 곡은 PASS 상태여야 한다.');
  assert(report.failCount === 0, '오류(FAIL) 수가 0이어야 한다.');
}

// ----------------------------------------------------
// 테스트 2: 곡 제목 누락 검사
// ----------------------------------------------------
console.log('\n[테스트 2] 곡 제목 누락 검사');
{
  const song = createValidSong({ title: '' });
  const report = validateSong(song);
  assert(report.status === 'FAIL', '제목이 없으면 FAIL이어야 한다.');
  assert(
    report.errors.some((e) => e.code === VALIDATION_ERROR_CODES.MUSIC_MISSING_TITLE),
    'MUSIC_MISSING_TITLE 에러 코드가 검출되어야 한다.'
  );
}

// ----------------------------------------------------
// 테스트 3: 중복 곡 ID 검사
// ----------------------------------------------------
console.log('\n[테스트 3] 중복 곡 ID 검사');
{
  const catalog = [
    createValidSong({ id: 'dup-id', title: '곡 1' }),
    createValidSong({ id: 'dup-id', title: '곡 2' }),
  ];
  const summary = validateCatalog(catalog);
  assert(
    summary.statusCounts.FAIL >= 1,
    '중복된 ID를 가진 곡 목록 검증 시 FAIL이 발생해야 한다.'
  );
  assert(
    (summary.errorCodeCounts[VALIDATION_ERROR_CODES.MUSIC_DUPLICATE_ID] || 0) > 0,
    'MUSIC_DUPLICATE_ID 에러 코드가 기록되어야 한다.'
  );
}

// ----------------------------------------------------
// 테스트 4: 잘못된 BPM 범위 검사
// ----------------------------------------------------
console.log('\n[테스트 4] 잘못된 BPM 범위 검사');
{
  const song1 = createValidSong({ tempoBpm: 20 }); // < 40
  const song2 = createValidSong({ tempoBpm: 250 }); // > 200
  const r1 = validateSong(song1);
  const r2 = validateSong(song2);
  assert(
    r1.errors.some((e) => e.code === VALIDATION_ERROR_CODES.MUSIC_INVALID_BPM),
    'BPM 20은 MUSIC_INVALID_BPM 에러를 반환해야 한다.'
  );
  assert(
    r2.errors.some((e) => e.code === VALIDATION_ERROR_CODES.MUSIC_INVALID_BPM),
    'BPM 250은 MUSIC_INVALID_BPM 에러를 반환해야 한다.'
  );
}

// ----------------------------------------------------
// 테스트 5: 잘못된 박자표 검사
// ----------------------------------------------------
console.log('\n[테스트 5] 잘못된 박자표 검사');
{
  const song = createValidSong({ timeSignature: '5/4' as any });
  const report = validateSong(song);
  assert(
    report.errors.some((e) => e.code === VALIDATION_ERROR_CODES.MUSIC_INVALID_TIME_SIGNATURE),
    '5/4 박자표는 MUSIC_INVALID_TIME_SIGNATURE 에러를 반환해야 한다.'
  );
}

// ----------------------------------------------------
// 테스트 6: 음표 길이 0 검사
// ----------------------------------------------------
console.log('\n[테스트 6] 음표 길이 0 검사');
{
  const song = createValidSong({
    notes: [createKalimbaNote('C4', 0)],
  });
  const report = validateSong(song);
  assert(report.status === 'FAIL', '길이가 0인 음표가 포함되면 FAIL이어야 한다.');
  assert(
    report.errors.some((e) => e.code === VALIDATION_ERROR_CODES.NOTE_INVALID_DURATION),
    'NOTE_INVALID_DURATION 에러가 검출되어야 한다.'
  );
}

// ----------------------------------------------------
// 테스트 7: 음수 음표 길이 검사
// ----------------------------------------------------
console.log('\n[테스트 7] 음수 음표 길이 검사');
{
  const song = createValidSong({
    notes: [createKalimbaNote('C4', -1.5)],
  });
  const report = validateSong(song);
  assert(report.status === 'FAIL', '음수 음표 길이는 FAIL이어야 한다.');
  assert(
    report.errors.some((e) => e.code === VALIDATION_ERROR_CODES.NOTE_INVALID_DURATION),
    'NOTE_INVALID_DURATION 에러가 검출되어야 한다.'
  );
}

// ----------------------------------------------------
// 테스트 8: 지원하지 않는 음표 기호 및 음높이 검사
// ----------------------------------------------------
console.log('\n[테스트 8] 지원하지 않는 음높이 검사');
{
  const badNote: KalimbaNote = {
    id: 'bad-1',
    pitch: 'G#4', // 반음(C Major 17키 미지원)
    solfege: '솔샵',
    numberNotation: '5#',
    octaveLevel: 0,
    duration: 1,
    hand: 'right',
    tineIndex: 99,
  };
  const song = createValidSong({ notes: [badNote] });
  const report = validateSong(song);
  assert(
    report.errors.some((e) => e.code === VALIDATION_ERROR_CODES.PITCH_OUT_OF_RANGE),
    '반음 G#4는 PITCH_OUT_OF_RANGE 에러를 발생시켜야 한다.'
  );
}

// ----------------------------------------------------
// 테스트 9: 쉼표가 포함된 곡의 음표 수 집계
// ----------------------------------------------------
console.log('\n[테스트 9] 쉼표가 포함된 곡의 음표 수 집계');
{
  const song = createValidSong({
    notes: [
      createKalimbaNote('C4', 1),
      createKalimbaNote('REST', 1), // 쉼표
      createKalimbaNote('E4', 1),
      createKalimbaNote('REST', 2), // 쉼표
    ],
  });
  const report = validateSong(song);
  assert(report.totalNotes === 4, '전체 항목 수는 4개여야 한다.');
  assert(report.playableNotes === 2, '실제 연주 음표는 2개여야 한다.');
  assert(report.restNotes === 2, '쉼표 수는 2개여야 한다.');
  assert(report.totalBeats === 5, '총 비트는 1+1+1+2 = 5박이어야 한다.');
}

// ----------------------------------------------------
// 테스트 10: BPM에 따른 전체 연주 시간 계산
// ----------------------------------------------------
console.log('\n[테스트 10] BPM에 따른 전체 연주 시간 계산');
{
  // 40박자 곡, 120 BPM => (40 / 120) * 60 = 20초
  const notes = Array.from({ length: 40 }, () => createKalimbaNote('C4', 1));
  const song = createValidSong({ tempoBpm: 120, notes });
  const report = validateSong(song);
  assert(Math.abs(report.calculatedSeconds - 20) < 0.1, '120BPM 40박자는 20초로 계산되어야 한다.');
}

// ----------------------------------------------------
// 테스트 11: 정상 마디의 박자 합계 검증
// ----------------------------------------------------
console.log('\n[테스트 11] 정상 마디의 박자 합계');
{
  const song = createValidSong({
    timeSignature: '4/4',
    rawNotation: '1 2 3 4 | 5- 5- | 1(4)',
  });
  const report = validateSong(song);
  assert(report.measureAudits.length === 3, '3개 마디가 검사되어야 한다.');
  assert(report.measureAudits.every((m) => m.isValid), '모든 마디가 정확히 4박자여야 한다.');
}

// ----------------------------------------------------
// 테스트 12: 잘못된 마디의 박자 합계 검증
// ----------------------------------------------------
console.log('\n[테스트 12] 잘못된 마디의 박자 합계');
{
  const song = createValidSong({
    timeSignature: '4/4',
    rawNotation: '1 2 3 4 | 1 2 3 | 1 2 3 4', // 2번째 마디가 3박자로 부족함
  });
  const report = validateSong(song);
  assert(
    report.errors.some((e) => e.code === VALIDATION_ERROR_CODES.RHYTHM_MEASURE_MISMATCH),
    '중간 마디 3박자는 RHYTHM_MEASURE_MISMATCH(REVIEW)를 유발해야 한다.'
  );
  assert(report.status === 'REVIEW', '박자 불일치는 REVIEW 상태로 판정되어야 한다.');
}

// ----------------------------------------------------
// 테스트 13: 픽업 마디(못갖춘마디) 예외 처리
// ----------------------------------------------------
console.log('\n[테스트 13] 픽업 마디(못갖춘마디) 예외 처리');
{
  // 첫 마디 1박자 (못갖춘마디), 둘째 마디 4박자
  const song = createValidSong({
    timeSignature: '4/4',
    rawNotation: '5 | 1 1 5 5 | 6 6 5-',
  });
  const report = validateSong(song);
  const firstMeasure = report.measureAudits[0];
  assert(firstMeasure.isPickupOrFinal === true, '첫 마디는 픽업 마디로 정상 참작되어야 한다.');
  assert(firstMeasure.isValid === true, '픽업 마디는 유효(isValid)로 판정되어야 한다.');
}

// ----------------------------------------------------
// 테스트 14: 칼림바 17키 음역 검사 (C4 ~ E6)
// ----------------------------------------------------
console.log('\n[테스트 14] 칼림바 17키 음역 검사 (C4 ~ E6)');
{
  const lowest = createKalimbaNote('C4', 1);
  const highest = createKalimbaNote('E6', 1);
  const song = createValidSong({ notes: [lowest, highest] });
  const report = validateSong(song);
  assert(report.failCount === 0, 'C4와 E6은 모두 17키 정상 음역이어야 한다.');
}

// ----------------------------------------------------
// 테스트 15: 지원하지 않는 옥타브 (B3, F6 등)
// ----------------------------------------------------
console.log('\n[테스트 15] 지원하지 않는 옥타브 검사');
{
  const tooLow: KalimbaNote = {
    id: 'low',
    pitch: 'B3', // C4보다 1음 낮은 음
    solfege: '시',
    numberNotation: '7,',
    octaveLevel: 0,
    duration: 1,
    hand: 'left',
    tineIndex: -1,
  };
  const song = createValidSong({ notes: [tooLow] });
  const report = validateSong(song);
  assert(
    report.errors.some((e) => e.code === VALIDATION_ERROR_CODES.PITCH_OUT_OF_RANGE),
    'B3은 PITCH_OUT_OF_RANGE 에러를 유발해야 한다.'
  );
}

// ----------------------------------------------------
// 테스트 16: 숫자 악보 파싱
// ----------------------------------------------------
console.log('\n[테스트 16] 숫자 악보 파싱');
{
  const notes = parseSimpleNotation('1 2 3 4 5 6 7');
  assert(notes.length === 7, '7개 음표가 파싱되어야 한다.');
  assert(notes[0].pitch === 'C4' && notes[6].pitch === 'B4', '1은 C4, 7은 B4여야 한다.');
}

// ----------------------------------------------------
// 테스트 17: 한글 계이름 파싱
// ----------------------------------------------------
console.log('\n[테스트 17] 한글 계이름 파싱');
{
  const notes = parseSimpleNotation('도 레 미 파 솔 라 시');
  assert(notes.length === 7, '한글 계이름 7음이 파싱되어야 한다.');
  assert(notes[0].pitch === 'C4' && notes[4].pitch === 'G4', '도는 C4, 솔은 G4여야 한다.');
}

// ----------------------------------------------------
// 테스트 18: 높은음 표기 파싱 (작은따옴표)
// ----------------------------------------------------
console.log('\n[테스트 18] 높은음 표기 파싱');
{
  const notes = parseSimpleNotation("1' 2' 3' 1'' 2'' 3''");
  assert(notes[0].pitch === 'C5', "1'은 C5여야 한다.");
  assert(notes[1].pitch === 'D5', "2'는 D5여야 한다.");
  assert(notes[2].pitch === 'E5', "3'은 E5여야 한다.");
  assert(notes[3].pitch === 'C6', "1''은 C6이어야 한다.");
  assert(notes[4].pitch === 'D6', "2''은 D6이어야 한다.");
  assert(notes[5].pitch === 'E6', "3''은 E6이어야 한다.");
}

// ----------------------------------------------------
// 테스트 19: 가사 결합 문법 파싱
// ----------------------------------------------------
console.log('\n[테스트 19] 가사 결합 문법 파싱');
{
  const notes = parseSimpleNotation('1/나 2/비 3-/야');
  assert(notes.length === 3, '가사 결합 3음이 파싱되어야 한다.');
  assert(notes[0].lyric === '나', '첫 음의 가사는 "나"여야 한다.');
  assert(notes[2].lyric === '야' && notes[2].duration === 2, '셋째 음의 가사는 "야", 길이는 2박이어야 한다.');
}

// ----------------------------------------------------
// 테스트 20: 검증 과정에서 원본 데이터 불변성 확인
// ----------------------------------------------------
console.log('\n[테스트 20] 원본 데이터 불변성 확인');
{
  const original = createValidSong();
  const snapshot = JSON.stringify(original);
  validateSong(original);
  validateSong(original);
  assert(JSON.stringify(original) === snapshot, '검증 함수 실행 후 원본 객체가 전혀 변경되지 않아야 한다.');
}

// ----------------------------------------------------
// 테스트 21: 검증 결과의 반복 실행 일관성 (순수 함수)
// ----------------------------------------------------
console.log('\n[테스트 21] 검증 결과의 반복 실행 일관성');
{
  const song = createValidSong();
  const r1 = validateSong(song);
  const r2 = validateSong(song);
  assert(r1.status === r2.status, '동일 입력에 대한 판정 상태는 항상 일치해야 한다.');
  assert(r1.calculatedSeconds === r2.calculatedSeconds, '계산된 연주 시간은 항상 일치해야 한다.');
  assert(r1.totalBeats === r2.totalBeats, '총 박자는 항상 일치해야 한다.');
}

// ----------------------------------------------------
// 테스트 22: 찬송가 저장 및 악보 상호 변환 회귀 테스트
// ----------------------------------------------------
console.log('\n[테스트 22] 찬송가 저장 및 악보 상호 변환 회귀 테스트');
{
  const notation = "5 1'- 3' 1' | 3'- 2' | 1'- 6 | 5--";
  const notes = parseSimpleNotation(notation);
  const convertedBack = notesToSimpleNotation(notes);
  const reParsed = parseSimpleNotation(convertedBack);
  assert(notes.length === reParsed.length, '텍스트->노트->텍스트->노트 변환 후 음표 수가 보존되어야 한다.');
  assert(
    notes.every((n, i) => n.pitch === reParsed[i].pitch && n.duration === reParsed[i].duration),
    '변환 전후 모든 음높이와 음표 길이가 100% 동일해야 한다.'
  );
}

console.log('\n========================================================');
console.log(`단위 테스트 완료: 통과 ${passedCount}건 / 실패 ${failedCount}건`);
console.log('========================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
