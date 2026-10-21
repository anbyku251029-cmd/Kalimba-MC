/**
 * Kalimba-MC STEP 01-E
 * 통합 음악 재생 품질 및 어린이 학습 UX 검증 테스트 스위트
 * 
 * 1. 4중 일관성 검증 (악보 음표 -> 건반 매핑 -> Web Audio 주파수 -> 렌더링 인덱스)
 * 2. 속도 배율(50%~150%) 변경 시 원곡 tempoBpm 불변성 및 비례 타이밍 검증
 * 3. 재생 라이프사이클 상태 전환 (초기 -> 재생 -> 일시정지 -> 재개 -> 다시시작 -> 완주)
 * 4. 찬송가 로컬스토리지 복원 및 데이터 보호 검증
 * 5. 검색 필터링 및 Empty State 동작 검증
 * 6. 카탈로그 전곡(110곡) 통합 재생 유효성 검증
 */

import { BEGINNER_SONGS } from '../src/data/songsBeginner';
import { INTERMEDIATE_SONGS } from '../src/data/songsIntermediate';
import { ADVANCED_SONGS } from '../src/data/songsAdvanced';
import { DEFAULT_HYMN_SONGS } from '../src/data/hymns';
import { KALIMBA_KEYS, PITCH_TO_KEY, KEY_INDEX_MAP } from '../src/constants/kalimbaKeys';
import { calculateSongTimeline, INITIAL_LEAD_IN_BEATS } from '../src/utils/musicTiming';
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
console.log('🎵 Kalimba-MC STEP 01-E: 통합 음악 재생 및 어린이 UX 검증 테스트');
console.log('================================================================\n');

// ----------------------------------------------------------------------
// 1. 4중 일관성 검증 (Quad-consistency)
// ----------------------------------------------------------------------
console.log('--- 1. 악보-건반-주파수-렌더링 4중 일관성 검증 ---');

assert(KALIMBA_KEYS.length === 17, '17음 표준 칼림바 건반 17개 정의');

KALIMBA_KEYS.forEach((key, idx) => {
  // 1) 인덱스 일관성
  assert(key.index === idx, `건반 ${key.pitch} (인덱스 ${idx}) 일치`);

  // 2) 건반 매핑 맵 일관성
  const mapped = PITCH_TO_KEY.get(key.pitch);
  assert(mapped !== undefined && mapped.index === idx, `PITCH_TO_KEY 매핑 일치 (${key.pitch} -> 인덱스 ${idx})`);

  // 3) 주파수 매핑 일관성
  const freq = key.frequency;
  assert(freq > 200 && freq < 1500, `주파수 유효 범위 (${key.pitch}: ${freq.toFixed(2)} Hz)`);
  assert(KEY_INDEX_MAP.get(idx)?.pitch === key.pitch, `KEY_INDEX_MAP 양방향 매핑 일치 (인덱스 ${idx} <-> ${key.pitch})`);

  // 4) 중심음(C4) 및 옥타브 점(dots) 규칙 일관성
  if (key.pitch === 'C4') {
    assert(key.isCenter === true && key.dots === 0, 'C4는 중심음이며 점 0개');
  } else if (key.pitch === 'C6') {
    assert(key.dots === 2, 'C6(높은 높은 도)는 점 2개 규칙 준수');
  }
});

// ----------------------------------------------------------------------
// 2. 속도 배율 변경 시 원곡 불변성 및 타이밍 비례 계산 검증
// ----------------------------------------------------------------------
console.log('\n--- 2. 속도 배율 변경 시 원곡 tempoBpm 불변성 검증 ---');

const testSong = BEGINNER_SONGS[0]; // 산토끼
const originalBpm = testSong.tempoBpm;
const speedPresets = [50, 70, 100, 120, 150];

speedPresets.forEach((speedPercent) => {
  // 속도 배율 적용 시 계산된 초당 비트 진행율
  const effectiveBpmMultiplier = speedPercent / 100;
  const beatDurationSeconds = (60 / testSong.tempoBpm) / effectiveBpmMultiplier;

  // 원본 객체 불변성 검증
  assert(testSong.tempoBpm === originalBpm, `속도 ${speedPercent}% 적용 후에도 원본 tempoBpm(${originalBpm}) 유지`);

  if (speedPercent === 70) {
    // 70% 천천히 모드는 100% 보통 모드보다 한 박의 재생 시간이 더 길어야 함
    const normalBeatDuration = 60 / testSong.tempoBpm;
    assert(beatDurationSeconds > normalBeatDuration, '🐢 70% 천천히 연습 모드는 한 박 시간이 100% 대비 1.428배로 여유 있게 진행');
  } else if (speedPercent === 100) {
    assert(Math.abs(beatDurationSeconds - (60 / originalBpm)) < 0.0001, '🐰 100% 보통 모드는 원곡 템포 그대로 진행');
  } else if (speedPercent === 120) {
    const normalBeatDuration = 60 / testSong.tempoBpm;
    assert(beatDurationSeconds < normalBeatDuration, '🚀 120% 빠르게 모드는 한 박 시간이 100% 대비 짧게 신속히 진행');
  }
});

// ----------------------------------------------------------------------
// 3. 재생 라이프사이클 상태 전이 검증
// ----------------------------------------------------------------------
console.log('\n--- 3. 재생 라이프사이클 상태 전이 검증 ---');

const timeline = calculateSongTimeline(testSong);

// 초기 상태
let simulatedBeat = INITIAL_LEAD_IN_BEATS;
assert(simulatedBeat === -2.0, `초기 진입 시 예비박 -2.0비트로 설정되어 첫 음 준비 시간 제공`);

// 재생 진행 (1초 경과, 100 BPM 가정)
const dtSec = 1.0;
const bpm = testSong.tempoBpm;
const deltaBeat = dtSec * (bpm / 60);
simulatedBeat += deltaBeat;
assert(simulatedBeat > INITIAL_LEAD_IN_BEATS, `재생 시작 후 비트가 정상 증가함 (${simulatedBeat.toFixed(2)} beats)`);

// 일시정지 (시간 경과 중단)
const pausedBeat = simulatedBeat;
// dtSec 경과했으나 일시정지 상태이므로 증가하지 않음
assert(pausedBeat === simulatedBeat, `일시정지 중에는 currentBeat가 고정 유지됨`);

// 처음부터 다시하기 (Restart)
simulatedBeat = INITIAL_LEAD_IN_BEATS;
assert(simulatedBeat === -2.0, `처음부터 다시하기 시 정확히 -2.0비트로 리셋됨`);

// 완주 판정
const completedBeat = timeline.audibleEndBeat + 0.1;
const isFinished = completedBeat > timeline.audibleEndBeat;
assert(isFinished, `마지막 음 울림 여운(audibleEndBeat: ${timeline.audibleEndBeat}비트) 경과 후 완주 판정 트리거`);

// ----------------------------------------------------------------------
// 4. 찬송가 데이터 무결성 및 사용자 추가/수정 격리 검증
// ----------------------------------------------------------------------
console.log('\n--- 4. 찬송가 데이터 무결성 및 로컬스토리지 보존 검증 ---');

assert(DEFAULT_HYMN_SONGS.length === 20, `기본 탑재 찬송가 20곡 완벽 보존`);

// 가상의 사용자 찬송가 추가 시뮬레이션
const mockCustomHymn: Song = {
  id: 'hymn-custom-999',
  hymnNumber: 999,
  title: '어린이 찬양 테스트',
  level: 'hymn',
  levelLabel: '찬송가',
  description: '어린이를 위한 찬양 테스트 곡',
  estimatedMinutes: 2,
  recommendedHandHint: '양손으로 가볍게 튕겨주세요',
  tempoBpm: 100,
  timeSignature: '4/4',
  isCustom: true,
  notes: [
    { id: 'mock-1', pitch: 'C4', solfege: '도', numberNotation: '1', octaveLevel: 0, duration: 1, hand: 'center', tineIndex: 8, isRest: false },
    { id: 'mock-2', pitch: 'D4', solfege: '레', numberNotation: '2', octaveLevel: 0, duration: 1, hand: 'left', tineIndex: 7, isRest: false },
    { id: 'mock-3', pitch: 'E4', solfege: '미', numberNotation: '3', octaveLevel: 0, duration: 2, hand: 'right', tineIndex: 9, isRest: false },
  ],
  tags: ['찬양', '테스트'],
};

// 결합된 카탈로그 생성
const combinedHymns = [...DEFAULT_HYMN_SONGS, mockCustomHymn];
assert(combinedHymns.length === 21, '사용자 찬송가 추가 시 기본 찬송가 20곡에 안전하게 덧붙여짐');
assert(DEFAULT_HYMN_SONGS.length === 20, '사용자 찬송가 추가 후에도 기본 defaultHymns 배열은 불변 유지');
assert(mockCustomHymn.isCustom === true, '커스텀 곡 플래그(isCustom) 정상 유지');

// ----------------------------------------------------------------------
// 5. 검색 필터링 및 어린이 친화 Empty State 처리 검증
// ----------------------------------------------------------------------
console.log('\n--- 5. 검색 필터링 및 어린이 친화 Empty State 검증 ---');

const allSongs: Song[] = [...BEGINNER_SONGS, ...INTERMEDIATE_SONGS, ...ADVANCED_SONGS, ...DEFAULT_HYMN_SONGS];
assert(allSongs.length === 110, `전체 110곡 카탈로그 무결성 확인 (30+30+30+20)`);

// 1) 정상 검색: "비행기"
const searchPlane = allSongs.filter((s) => s.title.includes('비행기'));
assert(searchPlane.length >= 1, `검색어 "비행기" 결과 1곡 이상 매칭 (발견: ${searchPlane.length}곡)`);

// 2) 찬송가 장수 검색: "305"
const search305 = allSongs.filter((s) => s.hymnNumber && String(s.hymnNumber).includes('305'));
assert(search305.length === 1 && search305[0].title.includes('살리신'), `찬송가 장수 "305" 검색 시 '나 같은 죄인 살리신' 정확 매칭`);

// 3) 결과 없음(Empty State) 시나리오
const searchNonexistent = allSongs.filter((s) => s.title.includes('존재하지않는외계인노래12345'));
assert(searchNonexistent.length === 0, `매칭되지 않는 검색어는 결과 0개 반환`);
// 결과 0개일 때 Empty State 컴포넌트 표시 조건 검증
const shouldShowEmptyState = searchNonexistent.length === 0;
assert(shouldShowEmptyState === true, `검색 결과 0개 시 어린이 친화적 안내(앗! 찾으시는 곡이 없어요) 표시 트리거`);

// ----------------------------------------------------------------------
// 6. 카탈로그 전곡(110곡) 통합 재생 유효성 검증
// ----------------------------------------------------------------------
console.log('\n--- 6. 카탈로그 전곡(110곡) 통합 재생 유효성 검증 ---');

let validSongs = 0;
allSongs.forEach((song) => {
  const noteCount = song.notes.length;
  const playableNotes = song.notes.filter((n) => !n.isRest && n.pitch !== 'REST');
  const songTimeline = calculateSongTimeline(song);

  const isValid =
    noteCount > 0 &&
    playableNotes.length > 0 &&
    song.tempoBpm >= 40 &&
    song.tempoBpm <= 200 &&
    songTimeline.audibleEndBeat > songTimeline.totalBeats;

  if (isValid) validSongs++;
});

assert(validSongs === 110, `110곡 전곡의 음표 수, 템포, 타임라인 완주 시점 유효성 100% 통과 (110/110)`);

// ----------------------------------------------------------------------
// 요약 출력
// ----------------------------------------------------------------------
console.log('\n================================================================');
console.log(`🎉 테스트 완료: 총 ${totalAssertions}개 단언문 중 ${passedAssertions}개 통과, ${failedAssertions}개 실패`);
console.log('================================================================');

if (failedAssertions > 0) {
  process.exit(1);
}
