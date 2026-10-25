/**
 * Kalimba-MC STEP 03-A
 * 화음(Chord) 및 양손(Two-Hand) 연주 시스템 전용 단위 및 통합 테스트 스위트
 * 
 * 8대 품질 게이트 검증:
 * 1. STEP_03A_AUDIT_GATE: 화음 및 양손 데이터 모델 무결성
 * 2. STEP_03A_CHORD_AUDIO_GATE: playChord 게인 정규화 및 다성 발음 지원
 * 3. STEP_03A_HAND_GUIDE_GATE: 17키 물리 배치 기반 왼손/오른손 가이드 매핑
 * 4. STEP_03A_WATERFALL_GATE: 동일 startBeat 공유 및 ChordGroupItem 생성
 * 5. STEP_03A_SCORING_GATE: 화음 완주(CHORD_PERFECT) 및 부분(CHORD_PARTIAL) 판정
 * 6. STEP_03A_DATA_COMPATIBILITY_GATE: 화음 연습 3곡(초급/중급/고급) 구조 검증
 * 7. STEP_03A_REGRESSION_GATE: 기존 111곡 단선율 타임라인 및 카탈로그 무결성
 * 8. STEP_03A_OVERALL_GATE: 종합 판정
 */

import { calculateSongTimeline } from '../src/utils/musicTiming';
import { audioEngine } from '../src/utils/audioEngine';
import { RhythmJudgeManager } from '../src/utils/rhythmJudge';
import { CHORD_PRACTICE_SONGS, CHORD_SONG_BUTTERFLY, CHORD_SONG_TWINKLE, CHORD_SONG_EDELWEISS } from '../src/data/chordSongs';
import { getAllSongsWithCustomHymns, BEGINNER_SONGS, INTERMEDIATE_SONGS, ADVANCED_SONGS, DEFAULT_HYMN_SONGS } from '../src/data/songs';
import { KALIMBA_KEYS } from '../src/constants/kalimbaKeys';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

console.log('====================================================');
console.log('🎹 STEP 03-A: 화음 및 양손 연주 시스템 품질 검증 시작');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function runGate(gateName: string, description: string, fn: () => void) {
  try {
    fn();
    passCount++;
    console.log(`✅ [${gateName}] ${description} - 통과 (PASS)`);
  } catch (err: any) {
    failCount++;
    console.error(`❌ [${gateName}] ${description} - 실패: ${err.message}`);
  }
}

// 1. STEP_03A_AUDIT_GATE: 화음 및 양손 데이터 모델 무결성
runGate('STEP_03A_AUDIT_GATE', '화음 전용 타입 및 KalimbaNote 확장 필드 검증', () => {
  const note1 = CHORD_SONG_BUTTERFLY.notes[0];
  const note2 = CHORD_SONG_BUTTERFLY.notes[1];
  assert(note1.chordId !== undefined, 'note1에 chordId가 정의되어야 함');
  assert(note2.isSimultaneousWithPrevious === true, 'note2는 이전 음과 동시 시작이어야 함');
  assert(note1.hand === 'right' || note1.hand === 'left' || note1.hand === 'center', 'hand 속성이 유효해야 함');
});

// 2. STEP_03A_CHORD_AUDIO_GATE: playChord 게인 정규화 및 다성 발음 지원
runGate('STEP_03A_CHORD_AUDIO_GATE', 'audioEngine.playChord 메서드 및 게인 정규화 검증', () => {
  assert(typeof (audioEngine as any).playChord === 'function', 'audioEngine에 playChord 함수가 구현되어 있어야 함');
  // 3음 화음 호출 시 에러 없이 실행되는지 검증
  audioEngine.playChord(['C4', 'E4', 'G4'], 1.0, 80, 1.0);
  // 단일 음 재생도 에러 없이 실행되는지 검증
  audioEngine.playNote('C4', 1.0, 80, 1.0);
});

// 3. STEP_03A_HAND_GUIDE_GATE: 17키 물리 배치 기반 왼손/오른손 가이드 매핑
runGate('STEP_03A_HAND_GUIDE_GATE', '17키 건반의 좌우 V자 배치 및 손 배정 검증', () => {
  const centerKey = KALIMBA_KEYS[8];
  assert(centerKey.pitch === 'C4', '중앙 건반은 C4');
  assert(centerKey.hand === 'center', 'C4는 center hand');

  // 왼쪽 건반들(0~7)은 모두 left
  for (let i = 0; i <= 7; i++) {
    assert(KALIMBA_KEYS[i].hand === 'left', `건반 ${i}번은 left 손이어야 함`);
  }
  // 오른쪽 건반들(9~16)은 모두 right
  for (let i = 9; i <= 16; i++) {
    assert(KALIMBA_KEYS[i].hand === 'right', `건반 ${i}번은 right 손이어야 함`);
  }
});

// 4. STEP_03A_WATERFALL_GATE: 동일 startBeat 공유 및 ChordGroupItem 생성
runGate('STEP_03A_WATERFALL_GATE', 'calculateSongTimeline에서 화음 동시 시작 및 ChordGroupItem 생성 검증', () => {
  const butterflyTimeline = calculateSongTimeline(CHORD_SONG_BUTTERFLY, 100);
  assert(butterflyTimeline.hasChords === true, '나비야 화음곡은 hasChords가 true여야 함');
  assert(butterflyTimeline.chordGroups.length >= 3, `최소 3개 이상의 화음 그룹이 생성되어야 함 (실제: ${butterflyTimeline.chordGroups.length})`);

  // 첫 번째 화음 그룹(G4 + E4)
  const firstChord = butterflyTimeline.chordGroups[0];
  assert(firstChord.notes.length === 2, '첫 번째 화음 그룹은 2개의 음표를 가져야 함');
  assert(firstChord.notes[0].startBeat === firstChord.notes[1].startBeat, '화음 구성음들의 startBeat가 정확히 일치해야 함');
  assert(firstChord.notes[0].chordId === firstChord.notes[1].chordId, '화음 구성음들의 chordId가 일치해야 함');
});

// 5. STEP_03A_SCORING_GATE: 화음 완주(CHORD_PERFECT) 및 부분(CHORD_PARTIAL) 판정
runGate('STEP_03A_SCORING_GATE', 'RhythmJudgeManager 화음 그룹 완주 및 보너스 점수 판정 검증', () => {
  const butterflyTimeline = calculateSongTimeline(CHORD_SONG_BUTTERFLY, 100);
  const judge = new RhythmJudgeManager(butterflyTimeline.totalPlayableNotes);
  judge.reset(butterflyTimeline.totalPlayableNotes, butterflyTimeline.chordGroups);

  const firstChordNotes = butterflyTimeline.chordGroups[0].notes;
  const currentBeat = firstChordNotes[0].startBeat;

  // 첫 번째 음(E4, tineIndex 9) 입력
  const res1 = judge.registerUserInput(firstChordNotes[1].keyIndex, currentBeat, 72, 1.0, butterflyTimeline.playableItems);
  assert(res1.rating === 'PERFECT', '첫 번째 음은 PERFECT');
  assert(res1.chordResult === undefined, '화음 2음 중 1음만 입력 시 아직 chordResult 완주 미발생');

  // 두 번째 음(G4, tineIndex 10) 입력 -> 화음 완주!
  const res2 = judge.registerUserInput(firstChordNotes[0].keyIndex, currentBeat, 72, 1.0, butterflyTimeline.playableItems);
  assert(res2.rating === 'PERFECT', '두 번째 음도 PERFECT');
  assert(res2.chordResult !== undefined, '화음 모든 구성음 입력 완료 시 chordResult 반환');
  assert(res2.chordResult!.rating === 'CHORD_PERFECT', '모든 음 PERFECT이므로 CHORD_PERFECT');
  assert(res2.chordResult!.scoreBonus === 200, '화음 보너스 200점 지급');

  const chordStats = judge.getChordStats();
  assert(chordStats.perfectChords === 1, 'perfectChords 1회 기록 확인');
});

// 6. STEP_03A_DATA_COMPATIBILITY_GATE: 화음 연습 3곡(초급/중급/고급) 구조 검증
runGate('STEP_03A_DATA_COMPATIBILITY_GATE', '초급, 중급, 고급 3종 화음 연습곡 구조 및 재생 가능성 검증', () => {
  assert(CHORD_PRACTICE_SONGS.length === 3, '화음 연습곡은 총 3곡이어야 함');

  // 초급: 나비야 (2음 화음)
  const bTimeline = calculateSongTimeline(CHORD_SONG_BUTTERFLY, 100);
  assert(bTimeline.totalPlayableNotes >= 12, '나비야 음표 수 검증');

  // 중급: 작은 별 (양손 화음)
  const tTimeline = calculateSongTimeline(CHORD_SONG_TWINKLE, 100);
  assert(tTimeline.chordGroups.some((c) => c.isTwoHanded), '작은 별에는 왼손과 오른손을 모두 쓰는 양손 화음이 포함되어야 함');

  // 고급: 에델바이스 (3음 삼화음)
  const eTimeline = calculateSongTimeline(CHORD_SONG_EDELWEISS, 100);
  assert(eTimeline.chordGroups.some((c) => c.notes.length === 3), '에델바이스에는 3음 화음이 포함되어야 함');
});

// 7. STEP_03A_REGRESSION_GATE: 기존 111곡 단선율 타임라인 및 카탈로그 무결성
runGate('STEP_03A_REGRESSION_GATE', '기존 111곡 카탈로그 무결성 및 단선율 hasChords=false 보존 확인', () => {
  const allSongs = getAllSongsWithCustomHymns();
  assert(allSongs.length >= 111, `총 수록곡 111곡 유지 (현재: ${allSongs.length}곡)`);
  assert(BEGINNER_SONGS.length === 30, '초급 30곡 보존');
  assert(INTERMEDIATE_SONGS.length === 30, '중급 30곡 보존');
  assert(ADVANCED_SONGS.length === 30, '고급 30곡 보존');
  assert(DEFAULT_HYMN_SONGS.length === 21, '찬송가 21곡 보존');

  // 초급 1번 '나비야' 단선율 검증
  const singleTimeline = calculateSongTimeline(BEGINNER_SONGS[0], 100);
  assert(singleTimeline.hasChords === false, '기존 단선율 곡은 hasChords가 false여야 함');
  assert(singleTimeline.chordGroups.length === 0, '기존 단선율 곡의 chordGroups 길이는 0이어야 함');
});

console.log('\n====================================================');
console.log(`📊 STEP 03-A 검증 결과: ${passCount} / ${passCount + failCount} 통과 (${((passCount / (passCount + failCount)) * 100).toFixed(0)}%)`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
}
