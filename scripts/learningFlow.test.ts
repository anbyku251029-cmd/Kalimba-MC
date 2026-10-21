/**
 * Kalimba-MC STEP 01-F
 * 단계별 학습 흐름 및 학습 기록 저장소 단위 테스트
 */

import { BEGINNER_SONGS } from '../src/data/songsBeginner';
import { DEFAULT_HYMN_SONGS } from '../src/data/hymns';
import { LearningStep, LearningProgressItem } from '../src/types/learningTypes';
import {
  getSongLearningProgress,
  saveSongStepProgress,
  loadAllLearningProgress,
  resetSongLearningProgress,
} from '../src/utils/learningStorage';

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

// Node.js 환경에서 localStorage 모킹
const mockStorage: { [key: string]: string } = {};
(global as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
  length: 0,
  key: () => null,
};

console.log('================================================================');
console.log('🌱 Kalimba-MC STEP 01-F: 단계별 학습 및 진행 기록 단위 테스트');
console.log('================================================================\n');

// ----------------------------------------------------------------------
// 1. 학습 진행 기본값 및 독립성 검증
// ----------------------------------------------------------------------
console.log('--- 1. 학습 진행 기본 상태 및 스토리지 격리 검증 ---');

const testSong = BEGINNER_SONGS[0];
const initialProgress = getSongLearningProgress(testSong.id);

assert(initialProgress.songId === testSong.id, '조회된 곡 ID 일치');
assert(initialProgress.completedSteps.length === 0, '초기 학습 단계는 빈 배열');
assert(initialProgress.practiceCount === 0, '초기 연습 횟수는 0회');
assert(initialProgress.practiceDurationSeconds === 0, '초기 연습 시간은 0초');

// 기존 찬송가 키(custom_hymns_v1)와의 독립성 확인
localStorage.setItem('custom_hymns_v1', JSON.stringify([{ id: 'hymn-custom-1', title: '보호된 찬송가' }]));
assert(localStorage.getItem('custom_hymns_v1') !== null, '기존 찬송가 데이터 저장소 보존');

// ----------------------------------------------------------------------
// 2. 5단계 학습 순차 전이 및 누적 검증
// ----------------------------------------------------------------------
console.log('\n--- 2. 5단계 학습 순차 전이 검증 ---');

// 1단계: 먼저 듣기 완료
let current = saveSongStepProgress(testSong.id, 'LISTENING', 10, 70);
assert(current.completedSteps.includes('LISTENING'), '1단계 먼저 듣기 완료 기록');
assert(current.lastStep === 'LISTENING', '마지막 단계 LISTENING 반영');
assert(current.practiceDurationSeconds === 10, '연습 시간 10초 누적');
assert(current.practiceCount === 0, '결과 도달 전에는 연습 횟수 증가하지 않음 (정직한 측정)');

// 2단계: 건반 익히기 완료
current = saveSongStepProgress(testSong.id, 'KEY_EXPLORE', 15, 70);
assert(current.completedSteps.includes('KEY_EXPLORE'), '2단계 건반 익히기 완료 기록');
assert(current.completedSteps.length === 2, '완료 단계 2개 누적');
assert(current.practiceDurationSeconds === 25, '누적 시간 25초');

// 3단계: 짧은 구간 연습 완료
current = saveSongStepProgress(testSong.id, 'LOOP_PRACTICE', 20, 70);
assert(current.completedSteps.includes('LOOP_PRACTICE'), '3단계 짧은 구간 연습 완료');
assert(current.practiceDurationSeconds === 45, '누적 시간 45초');

// 4단계: 곡 전체 연습 완료
current = saveSongStepProgress(testSong.id, 'FULL_PRACTICE', 35, 70);
assert(current.completedSteps.includes('FULL_PRACTICE'), '4단계 곡 전체 연습 완료');
assert(current.practiceDurationSeconds === 80, '누적 시간 80초');

// 5단계: 연습 결과 확인 (완주 트리거)
current = saveSongStepProgress(testSong.id, 'PRACTICE_RESULT', 5, 70);
assert(current.completedSteps.includes('PRACTICE_RESULT'), '5단계 연습 결과 도달');
assert(current.completedSteps.length === 5, '전체 5단계 모두 완료 달성');
assert(current.practiceCount === 1, '전체 완주 후 연습 횟수 1회 정직하게 증가');
assert(current.practiceDurationSeconds === 85, '총 학습 시간 85초 기록');

// ----------------------------------------------------------------------
// 3. 재연습 시 중복 단계 처리 및 데이터 보호 검증
// ----------------------------------------------------------------------
console.log('\n--- 3. 재연습 및 스토리지 무결성 검증 ---');

// 동일 단계를 한 번 더 수행해도 completedSteps 배열에 중복 저장되지 않음
current = saveSongStepProgress(testSong.id, 'LISTENING', 8, 100);
assert(current.completedSteps.filter((s) => s === 'LISTENING').length === 1, '중복 단계 배열 무결성 유지 (Set 연산)');
assert(current.practiceDurationSeconds === 93, '재연습 시간(8초) 추가 누적 (총 93초)');
assert(current.preferredSpeedPercent === 100, '선호 템포 100% 정상 업데이트');

// 기존 찬송가 데이터 훼손 여부 확인
const preservedHymns = JSON.parse(localStorage.getItem('custom_hymns_v1') || '[]');
assert(preservedHymns.length === 1 && preservedHymns[0].id === 'hymn-custom-1', '학습 기록 갱신 후에도 찬송가 로컬스토리지 100% 보존');

// 원본 곡 데이터 불변성 검증
assert(testSong.notes.length > 0, '원본 악보 데이터 불변');
assert(BEGINNER_SONGS.length === 30, '초급 30곡 원본 배열 불변');
assert(DEFAULT_HYMN_SONGS.length === 20, '기본 찬송가 20곡 원본 배열 불변');

// ----------------------------------------------------------------------
// 요약 출력
// ----------------------------------------------------------------------
console.log('\n================================================================');
console.log(`🎉 학습 플로우 테스트 완료: 총 ${totalAssertions}개 단언문 중 ${passedAssertions}개 통과, ${failedAssertions}개 실패`);
console.log('================================================================');

if (failedAssertions > 0) {
  process.exit(1);
}
