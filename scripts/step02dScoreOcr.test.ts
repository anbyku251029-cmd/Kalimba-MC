import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateScoreForKalimba,
  shiftNotesOctave,
  KALIMBA_VALID_PITCHES,
} from '../src/utils/scoreValidator';
import {
  notesToRawNotation,
  rawNotationToExtractedNotes,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_MIME_TYPES,
} from '../src/utils/scoreOcrEngine';
import { ExtractedNote } from '../src/types/scoreOcrTypes';
import { getAllSongsWithCustomHymns } from '../src/data/songs';

console.log('🧪 [TEST] STEP 02-D 악보 이미지 업로드 & 음표 추출·수정 종합 검증 시작...');

// ---------------------------------------------------------------------
// 1. 이미지 파일 제약조건 및 MIME 타입 규칙 검증
// ---------------------------------------------------------------------
console.log('--- 1. 이미지 포맷 및 파일 제약 검증 ---');
assert.strictEqual(MAX_FILE_SIZE_BYTES, 15 * 1024 * 1024, '최대 파일 크기는 15MB여야 함');
assert.ok(SUPPORTED_MIME_TYPES.has('image/png'), 'PNG 지원 확인');
assert.ok(SUPPORTED_MIME_TYPES.has('image/jpeg'), 'JPEG 지원 확인');
assert.ok(SUPPORTED_MIME_TYPES.has('image/webp'), 'WebP 지원 확인');
assert.ok(!SUPPORTED_MIME_TYPES.has('application/pdf'), 'PDF는 이번 단계 필수 지원에서 제외(확인)');
assert.ok(!SUPPORTED_MIME_TYPES.has('image/svg+xml'), 'SVG 미지원(스크립트 삽입 보안 방어)');
console.log('✅ [PASS] 이미지 파일 제약 조건 검증 완료');

// ---------------------------------------------------------------------
// 2. 17음 C Major 칼림바 음역 및 유효성 검증기 (validateScoreForKalimba)
// ---------------------------------------------------------------------
console.log('--- 2. 17음 C Major 칼림바 음역 검증기 테스트 ---');

// 17음 집합 크기 검증
assert.strictEqual(KALIMBA_VALID_PITCHES.size, 17, '17음 C Major는 정확히 17개 음으로 구성');
assert.ok(KALIMBA_VALID_PITCHES.has('C4'), '최저음 C4 포함');
assert.ok(KALIMBA_VALID_PITCHES.has('E6'), '최고음 E6 포함');

// A. 정상 범위의 음표 배열 (PASS)
const validNotes: ExtractedNote[] = [
  { id: 'n1', order: 1, pitch: 'C4', solfege: '도', octaveLevel: 0, numberNotation: '1', duration: 1, isRest: false, measureIndex: 1, userModified: false },
  { id: 'n2', order: 2, pitch: 'E4', solfege: '미', octaveLevel: 0, numberNotation: '3', duration: 1, isRest: false, measureIndex: 1, userModified: false },
  { id: 'n3', order: 3, pitch: 'G4', solfege: '솔', octaveLevel: 0, numberNotation: '5', duration: 1, isRest: false, measureIndex: 1, userModified: false },
  { id: 'n4', order: 4, pitch: 'C5', solfege: '도', octaveLevel: 1, numberNotation: '1', duration: 1, isRest: false, measureIndex: 1, userModified: false },
];

const passResult = validateScoreForKalimba(validNotes, '4/4');
assert.strictEqual(passResult.status, 'PASS', '정상 17음 내 음표는 PASS 판정');
assert.strictEqual(passResult.isValidForKalimba, true);
assert.strictEqual(passResult.outOfRangeNotes, 0);
assert.strictEqual(passResult.playableNotes, 4);
console.log('✅ [PASS] 정상 17음 내 음표 검증 통과');

// B. 음역 밖의 음표 포함 (ERROR) 및 옥타브 이동 자동 제안 검증
const lowNotes: ExtractedNote[] = [
  { id: 'n1', order: 1, pitch: 'G3', solfege: '솔', octaveLevel: 0, numberNotation: '5', duration: 1, isRest: false, measureIndex: 1, userModified: false },
  { id: 'n2', order: 2, pitch: 'A3', solfege: '라', octaveLevel: 0, numberNotation: '6', duration: 1, isRest: false, measureIndex: 1, userModified: false },
  { id: 'n3', order: 3, pitch: 'B3', solfege: '시', octaveLevel: 0, numberNotation: '7', duration: 1, isRest: false, measureIndex: 1, userModified: false },
  { id: 'n4', order: 4, pitch: 'C4', solfege: '도', octaveLevel: 0, numberNotation: '1', duration: 1, isRest: false, measureIndex: 1, userModified: false },
];

const lowResult = validateScoreForKalimba(lowNotes, '4/4');
assert.strictEqual(lowResult.status, 'ERROR', 'C4 미만 음표 포함 시 ERROR 판정');
assert.strictEqual(lowResult.isValidForKalimba, false);
assert.strictEqual(lowResult.outOfRangeNotes, 3, '음역 밖 음표 3개 감지 (G3, A3, B3)');
assert.strictEqual(lowResult.suggestedOctaveShift, 1, '낮은 음만 있을 경우 +1 옥타브 이동 제안 확인');
console.log('✅ [PASS] 음역 밖 음표 감지 및 옥타브 올리기 제안 검증 통과');

// C. 옥타브 시프트 함수 (shiftNotesOctave) 검증
const shiftedNotes = shiftNotesOctave(lowNotes, 1);
assert.strictEqual(shiftedNotes[0].pitch, 'G4', 'G3 + 1옥타브 = G4');
assert.strictEqual(shiftedNotes[1].pitch, 'A4', 'A3 + 1옥타브 = A4');
assert.strictEqual(shiftedNotes[2].pitch, 'B4', 'B3 + 1옥타브 = B4');
assert.strictEqual(shiftedNotes[3].pitch, 'C5', 'C4 + 1옥타브 = C5');

const shiftedResult = validateScoreForKalimba(shiftedNotes, '4/4');
assert.strictEqual(shiftedResult.status, 'PASS', '1옥타브 이동 후 PASS 상태 전환 확인');
assert.strictEqual(shiftedResult.isValidForKalimba, true);
assert.strictEqual(shiftedResult.outOfRangeNotes, 0);
console.log('✅ [PASS] 옥타브 일괄 이동 및 보정 검증 통과');

// D. 빈 음표 배열 및 음길이 오류 검증
const emptyResult = validateScoreForKalimba([], '4/4');
assert.strictEqual(emptyResult.status, 'ERROR', '빈 음표 배열은 ERROR');

const invalidDurationNotes: ExtractedNote[] = [
  { id: 'n1', order: 1, pitch: 'C4', solfege: '도', octaveLevel: 0, numberNotation: '1', duration: 0, isRest: false, measureIndex: 1, userModified: false },
];
const durResult = validateScoreForKalimba(invalidDurationNotes, '4/4');
assert.strictEqual(durResult.status, 'ERROR', '음길이 0은 ERROR');
console.log('✅ [PASS] 비정상 입력 방어 검증 통과');

// ---------------------------------------------------------------------
// 3. 숫자 악보 인코딩 / 디코딩 상호 변환 검증
// ---------------------------------------------------------------------
console.log('--- 3. 숫자 악보 양방향 변환 검증 ---');
const testNotation = '1 3 5 1\' | 5 3 2 1-';
const parsedNotes = rawNotationToExtractedNotes(testNotation);
assert.ok(parsedNotes.length >= 8, '8개 이상의 음표 파싱 확인');
assert.strictEqual(parsedNotes[0].pitch, 'C4');
assert.strictEqual(parsedNotes[1].pitch, 'E4');
assert.strictEqual(parsedNotes[2].pitch, 'G4');
assert.strictEqual(parsedNotes[3].pitch, 'C5');

const encodedNotation = notesToRawNotation(parsedNotes);
assert.ok(encodedNotation.includes('1'), '인코딩된 악보에 1음 포함');
assert.ok(encodedNotation.includes('|'), '인코딩된 악보에 마디선 포함');
console.log('✅ [PASS] 숫자 악보 양방향 변환 검증 통과');

// ---------------------------------------------------------------------
// 4. 기존 111곡 카탈로그 및 시스템 회귀 테스트
// ---------------------------------------------------------------------
console.log('--- 4. 기존 111곡 카탈로그 무결성 회귀 테스트 ---');
const songs = getAllSongsWithCustomHymns();
const beginner = songs.filter((s) => s.level === 'beginner');
const intermediate = songs.filter((s) => s.level === 'intermediate');
const advanced = songs.filter((s) => s.level === 'advanced');
const hymn = songs.filter((s) => s.level === 'hymn');

assert.strictEqual(beginner.length, 30, '초급 30곡 보존');
assert.strictEqual(intermediate.length, 30, '중급 30곡 보존');
assert.strictEqual(advanced.length, 30, '고급 30곡 보존');
assert.strictEqual(hymn.length, 21, '찬송가 21곡 보존');
assert.strictEqual(songs.length, 111, '총 111곡 무결성 보존');

// 고급곡 전곡 50음표 이상 유지 검증
advanced.forEach((s) => {
  const notesCount = s.notes.filter((n) => !n.isRest && n.note !== 0).length;
  assert.ok(notesCount >= 50, `고급곡 ${s.title}은 50음표 이상 유지되어야 함 (실제: ${notesCount})`);
});
console.log('✅ [PASS] 기존 111곡 카탈로그 100% 무결성 보존 확인');

console.log('🎉 [TEST] STEP 02-D 모든 단위 및 회귀 테스트 통과!');
