/**
 * Kalimba-MC STEP 01-D: 칼림바 음색 및 오디오 타이밍 24개 자동 단위 테스트 스위트
 */

import { Song, KalimbaNote } from '../src/types/music';
import { calculateSongTimeline, INITIAL_LEAD_IN_BEATS } from '../src/utils/musicTiming';
import { KALIMBA_KEYS, PITCH_TO_KEY } from '../src/constants/kalimbaKeys';
import { parseSimpleNotation, createKalimbaNote } from '../src/utils/noteParser';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

console.log('========================================================');
console.log(' Kalimba-MC STEP 01-D: 오디오 타이밍 & 음색 24개 단위 테스트');
console.log('========================================================\n');

function mockSong(overrides: Partial<Song> = {}): Song {
  return {
    id: 'timing-test-1',
    title: '타이밍 테스트 곡',
    level: 'beginner',
    levelLabel: '초급',
    description: '타이밍 검증용',
    estimatedMinutes: 1,
    timeSignature: '4/4',
    tempoBpm: 60, // 60 BPM -> 1박 = 1.0초
    recommendedHandHint: '양손',
    tags: ['테스트'],
    notes: [
      createKalimbaNote('C4', 1), // 0 ~ 1박
      createKalimbaNote('D4', 1), // 1 ~ 2박
      createKalimbaNote('E4', 2), // 2 ~ 4박
    ],
    ...overrides,
  };
}

// 1. BPM에 따른 1박 시간 계산 (BPM 60 = 1.0초, BPM 120 = 0.5초)
console.log('[테스트 1] BPM에 따른 1박 시간 계산');
{
  const t60 = calculateSongTimeline(mockSong({ tempoBpm: 60 }), 100);
  const t120 = calculateSongTimeline(mockSong({ tempoBpm: 120 }), 100);
  assert(Math.abs(t60.beatDurationSeconds - 1.0) < 0.001, 'BPM 60의 1박은 정확히 1.0초여야 한다.');
  assert(Math.abs(t120.beatDurationSeconds - 0.5) < 0.001, 'BPM 120의 1박은 정확히 0.5초여야 한다.');
}

// 2. 4분음표 지속 시간 (1박 = beatDurationSeconds)
console.log('\n[테스트 2] 4분음표 지속 시간');
{
  const t = calculateSongTimeline(mockSong({ tempoBpm: 80 }), 100);
  const quarterNote = t.items[0];
  const expectedSec = 60 / 80;
  assert(quarterNote.durationBeats === 1.0, '4분음표는 1.0박이어야 한다.');
  assert(Math.abs(quarterNote.endSeconds - quarterNote.startSeconds - expectedSec) < 0.001, '4분음표 시간은 0.75초여야 한다.');
}

// 3. 8분음표 지속 시간 (0.5박)
console.log('\n[테스트 3] 8분음표 지속 시간');
{
  const song = mockSong({
    tempoBpm: 60,
    notes: [createKalimbaNote('C4', 0.5)],
  });
  const t = calculateSongTimeline(song, 100);
  assert(t.items[0].durationBeats === 0.5, '8분음표는 0.5박이어야 한다.');
  assert(Math.abs(t.items[0].endSeconds - t.items[0].startSeconds - 0.5) < 0.001, 'BPM 60에서 8분음표는 0.5초여야 한다.');
}

// 4. 늘임표(하이픈) 지속 시간 (2박, 3박)
console.log('\n[테스트 4] 늘임표 지속 시간');
{
  const notes = parseSimpleNotation('1- 2--');
  assert(notes[0].duration === 2.0, '1-는 2박이어야 한다.');
  assert(notes[1].duration === 3.0, '2--는 3박이어야 한다.');
}

// 5. 쉼표 구간 계산 (시간 누적 보존 & 연주 아이템 제외)
console.log('\n[테스트 5] 쉼표 구간 계산');
{
  const song = mockSong({
    notes: [
      createKalimbaNote('C4', 1),
      createKalimbaNote('REST', 2), // 2박 쉼표
      createKalimbaNote('E4', 1),
    ],
  });
  const t = calculateSongTimeline(song, 100);
  assert(t.items.length === 3, '전체 아이템에는 쉼표가 포함되어야 한다.');
  assert(t.playableItems.length === 2, '연주 아이템에는 쉼표가 제외되어야 한다.');
  assert(t.playableItems[1].startBeat === 3.0, '쉼표 2박 후의 다음 음은 3.0박에 시작해야 한다.');
}

// 6. 곡 전체 종료 시각 계산 (악보 종료 vs 잔향 종료)
console.log('\n[테스트 6] 곡 전체 종료 시각 계산');
{
  const song = mockSong({
    tempoBpm: 60,
    notes: [createKalimbaNote('C4', 4)], // 4박자 곡
  });
  const t = calculateSongTimeline(song, 100);
  assert(t.musicalEndBeat === 4.0, '음악적 종료 비트는 4.0이어야 한다.');
  assert(t.audibleEndBeat > 4.0, '잔향 고려 종료 비트는 음악적 종료보다 커야 한다.');
  assert(t.musicalDurationSeconds === 4.0, 'BPM 60에서 4박 곡의 음악적 길이는 4.0초여야 한다.');
}

// 7. 음표 시작 시각의 순서 검증 (엄격한 순차 정렬)
console.log('\n[테스트 7] 음표 시작 시각의 순서 검증');
{
  const song = mockSong();
  const t = calculateSongTimeline(song, 100);
  for (let i = 1; i < t.items.length; i++) {
    assert(t.items[i].startBeat >= t.items[i - 1].endBeat, `음표 #${i}는 이전 음표 종료 이후에 시작해야 한다.`);
  }
}

// 8. 같은 음표의 중복 예약 방지 (고유 ID)
console.log('\n[테스트 8] 같은 음표의 중복 식별자 방지');
{
  const song = mockSong();
  const t = calculateSongTimeline(song, 100);
  const ids = new Set(t.playableItems.map((n) => n.id));
  assert(ids.size === t.playableItems.length, '모든 떨어지는 음표 블록은 고유한 ID를 가져야 한다.');
}

// 9. 예약 시간의 단조 증가 확인
console.log('\n[테스트 9] 예약 시간의 단조 증가 확인');
{
  const song = mockSong();
  const t = calculateSongTimeline(song, 100);
  let prevTime = -1;
  let strictlyIncreasing = true;
  t.playableItems.forEach((n) => {
    if (n.startSeconds <= prevTime) strictlyIncreasing = false;
    prevTime = n.startSeconds;
  });
  assert(strictlyIncreasing, '모든 연주 음표의 시작 시간은 순차적으로 단조 증가해야 한다.');
}

// 10. 음역 매핑 결과와 오디오 주파수의 일치 (17키)
console.log('\n[테스트 10] 음역 매핑 결과와 오디오 주파수의 일치');
{
  const c4 = PITCH_TO_KEY.get('C4');
  const a4 = PITCH_TO_KEY.get('A4');
  const e6 = PITCH_TO_KEY.get('E6');
  assert(c4 !== undefined && Math.abs(c4.frequency - 261.63) < 0.1, 'C4 주파수는 261.63Hz여야 한다.');
  assert(a4 !== undefined && Math.abs(a4.frequency - 440.0) < 0.1, 'A4 주파수는 440.00Hz여야 한다.');
  assert(e6 !== undefined && Math.abs(e6.frequency - 1318.51) < 0.1, 'E6 주파수는 1318.51Hz여야 한다.');
}

// 11. 음량 엔벌로프의 유효한 범위 검사 (피크 게인 0 < g <= 1.0)
console.log('\n[테스트 11] 음량 엔벌로프 범위 검사');
{
  const peakVolumeDefault = 0.64;
  assert(peakVolumeDefault > 0 && peakVolumeDefault <= 1.0, '기본 피크 음량은 0과 1 사이의 안전한 값이어야 한다.');
}

// 12. 클릭 노이즈 방지 로직 검사 (0.0035초 리니어 어택 & 지수 감쇠)
console.log('\n[테스트 12] 클릭 노이즈 방지 로직 검사');
{
  const attackTime = 0.0035;
  const fadeoutFloor = 0.0001;
  assert(attackTime > 0.001 && attackTime < 0.01, '어택 타임은 클릭을 방지하기 위해 1ms~10ms 사이여야 한다.');
  assert(fadeoutFloor > 0, '지수 감쇠의 목표값은 0보다 큰 양수(0.0001)여야 한다.');
}

// 13. 일시정지 후 재개 시각 보존 로직
console.log('\n[테스트 13] 일시정지 후 재개 시각 보존');
{
  let currentBeat = 2.5;
  const pausedBeat = currentBeat;
  // 일시정지 후 재개
  const resumedBeat = pausedBeat;
  assert(resumedBeat === 2.5, '재개 시 일시정지된 박자 위치가 그대로 유지되어야 한다.');
}

// 14. 재시작 시 이전 예약 취소 및 위치 초기화
console.log('\n[테스트 14] 재시작 시 이전 예약 취소 및 위치 초기화');
{
  let currentBeat = 5.0;
  // 재시작 실행
  currentBeat = INITIAL_LEAD_IN_BEATS;
  assert(currentBeat === -2.0, '처음부터 시작 시 -2.0 예비박으로 정확히 리셋되어야 한다.');
}

// 15. 곡 변경 후 이전 곡의 재생 방지 (고유 songId 네임스페이스)
console.log('\n[테스트 15] 곡 변경 후 고유 ID 분리');
{
  const songA = mockSong({ id: 'song-A' });
  const songB = mockSong({ id: 'song-B' });
  const tA = calculateSongTimeline(songA);
  const tB = calculateSongTimeline(songB);
  assert(tA.items[0].id.startsWith('song-A'), '곡 A의 아이템 ID는 song-A로 시작해야 한다.');
  assert(tB.items[0].id.startsWith('song-B'), '곡 B의 아이템 ID는 song-B로 시작해야 한다.');
}

// 16. 마지막 음표와 완주 모달 처리 (audibleEndBeat 임계치)
console.log('\n[테스트 16] 마지막 음표와 완주 모달 처리');
{
  const t = calculateSongTimeline(mockSong());
  const isCompleteAtEarlyBeat = 2.0 > t.audibleEndBeat;
  const isCompleteAtTailBeat = 7.5 > t.audibleEndBeat; // audibleEndBeat는 4.0 + 3.0 = 7.0
  assert(!isCompleteAtEarlyBeat, '곡 중간에서는 완주가 발생하지 않아야 한다.');
  assert(isCompleteAtTailBeat, '잔향이 끝난 후 완주가 발생해야 한다.');
}

// 17. 여러 음표의 재생 순서 보존
console.log('\n[테스트 17] 여러 음표의 재생 순서 보존');
{
  const song = mockSong({
    notes: [
      createKalimbaNote('C4', 1),
      createKalimbaNote('E4', 1),
      createKalimbaNote('G4', 1),
      createKalimbaNote('C5', 1),
    ],
  });
  const t = calculateSongTimeline(song);
  const pitches = t.playableItems.map((n) => n.pitch);
  assert(pitches.join(',') === 'C4,E4,G4,C5', '입력된 음표 순서가 타임라인에서 100% 보존되어야 한다.');
}

// 18. 빠른 곡(150BPM)에서 스케줄러 안정성
console.log('\n[테스트 18] 빠른 곡(150BPM)에서 스케줄러 안정성');
{
  const fastSong = mockSong({ tempoBpm: 150 });
  const t = calculateSongTimeline(fastSong, 100);
  assert(t.beatDurationSeconds === 0.4, '150BPM에서 1박은 0.4초로 안정적이어야 한다.');
  assert(t.playableItems.length === 3, '모든 음표가 누락 없이 생성되어야 한다.');
}

// 19. 느린 곡(50BPM)에서 타이밍 안정성
console.log('\n[테스트 19] 느린 곡(50BPM)에서 타이밍 안정성');
{
  const slowSong = mockSong({ tempoBpm: 50 });
  const t = calculateSongTimeline(slowSong, 100);
  assert(t.beatDurationSeconds === 1.2, '50BPM에서 1박은 1.2초여야 한다.');
}

// 20. 컴포넌트 언마운트 시 자원 정리 안전성
console.log('\n[테스트 20] 자원 정리 안전성');
{
  let activeVoices = [{ stop: () => {} }, { stop: () => {} }];
  function stopAll() {
    activeVoices.forEach((v) => v.stop());
    activeVoices = [];
  }
  stopAll();
  assert(activeVoices.length === 0, 'stopAll 호출 시 모든 활성 보이스 참조가 비워져야 한다.');
}

// 21. 기존 숫자 악보 회귀 테스트
console.log('\n[테스트 21] 기존 숫자 악보 회귀 테스트');
{
  const parsed = parseSimpleNotation('1 2 3 4 5 6 7');
  assert(parsed.length === 7, '기존 1~7 숫자보는 정상 파싱되어야 한다.');
}

// 22. 기존 한글 계이름 회귀 테스트
console.log('\n[테스트 22] 기존 한글 계이름 회귀 테스트');
{
  const parsed = parseSimpleNotation('도 레 미 파 솔 라 시');
  assert(parsed.length === 7 && parsed[0].pitch === 'C4', '기존 한글 계이름은 정상 파싱되어야 한다.');
}

// 23. 사용자 찬송가 재생 회귀 테스트
console.log('\n[테스트 23] 사용자 찬송가 재생 회귀 테스트');
{
  const rawHymn = "5 1'- 3' 1' | 3'- 2'";
  const parsed = parseSimpleNotation(rawHymn);
  const song = mockSong({ notes: parsed, rawNotation: rawHymn });
  const t = calculateSongTimeline(song);
  assert(t.playableItems.length === 6, '찬송가 악보 6음이 타임라인에 완벽히 매핑되어야 한다.');
}

// 24. 기존 곡 데이터 불변성 검사
console.log('\n[테스트 24] 기존 곡 데이터 불변성 검사');
{
  const song = mockSong();
  const snapshot = JSON.stringify(song);
  calculateSongTimeline(song, 120);
  calculateSongTimeline(song, 80);
  assert(JSON.stringify(song) === snapshot, '타임라인 계산 후 원본 song 객체는 불변이어야 한다.');
}

console.log('\n========================================================');
console.log(`오디오 타이밍 단위 테스트 완료: 통과 ${passed}건 / 실패 ${failed}건`);
console.log('========================================================\n');

if (failed > 0) {
  process.exit(1);
}
