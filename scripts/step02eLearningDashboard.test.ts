import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  learningSessionManager,
  getSeoulDateString,
  getSeoulDateTimeString,
} from '../src/utils/learningSessionManager';
import { getAllSongsWithCustomHymns } from '../src/data/songs';

console.log('🧪 [TEST] STEP 02-E 학습 기록 및 학부모 대시보드 종합 검증 시작...');

// ---------------------------------------------------------------------
// 1. 한국 시간대 포맷 함수 검증
// ---------------------------------------------------------------------
console.log('--- 1. 한국 시간대(Asia/Seoul) 날짜 문자열 검증 ---');
const todaySeoul = getSeoulDateString();
assert.match(todaySeoul, /^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 함');
const todaySeoulDateTime = getSeoulDateTimeString();
assert.match(todaySeoulDateTime, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, 'YYYY-MM-DD HH:mm 형식이어야 함');
console.log(`✅ [PASS] 한국 시간대 날짜 포맷 확인: ${todaySeoulDateTime}`);

// ---------------------------------------------------------------------
// 2. 학습 세션 생명주기 및 시간 측정 무결성
// ---------------------------------------------------------------------
console.log('--- 2. 학습 세션 생명주기 및 시간 측정 검증 ---');

// 테스트 전 초기화
learningSessionManager.clearAllLearningRecords();
assert.strictEqual(learningSessionManager.getAllSessions().length, 0, '초기 세션 수 0 확인');

// A. 세션 시작
const sessionId1 = learningSessionManager.startSession('beginner-1', '반짝반짝 작은별', '쉬움', 70);
assert.ok(sessionId1.startsWith('session_'), '고유 세션 ID 생성 확인');

// 세션 시작 즉시 레코드 확인
let sessions = learningSessionManager.getAllSessions();
assert.strictEqual(sessions.length, 1);
assert.strictEqual(sessions[0].status, 'STARTED');
assert.strictEqual(sessions[0].songTitle, '반짝반짝 작은별');
assert.strictEqual(sessions[0].isCompleted, false);

// B. 일시정지 및 재개
learningSessionManager.pauseSession();
sessions = learningSessionManager.getAllSessions();
assert.strictEqual(sessions[0].status, 'PAUSED', '일시정지 후 상태는 PAUSED');

learningSessionManager.resumeSession();
sessions = learningSessionManager.getAllSessions();
assert.strictEqual(sessions[0].status, 'IN_PROGRESS', '재개 후 상태는 IN_PROGRESS');

// C. 정상 완주 (COMPLETED)
const completeRecord = learningSessionManager.completeSession({
  currentCombo: 14,
  maxCombo: 14,
  perfectCount: 12,
  greatCount: 2,
  missCount: 0,
  totalNotes: 14,
  accuracy: 98,
  lastRating: 'PERFECT',
});
assert.ok(completeRecord, '완주 레코드가 반환되어야 함');
assert.strictEqual(completeRecord?.status, 'COMPLETED');
assert.strictEqual(completeRecord?.isCompleted, true);
assert.strictEqual(completeRecord?.score, 12 * 100 + 2 * 60); // 1320점
assert.strictEqual(completeRecord?.accuracyPercent, 98);
assert.ok(completeRecord?.practiceDurationSec >= 0, '연습 시간은 0초 이상이어야 함');

// D. 동일 세션 중복 완료 호출 방지 (멱등성)
const duplicateComplete = learningSessionManager.completeSession();
assert.strictEqual(duplicateComplete, null, '동일 세션에 대한 중복 완료 호출은 null 반환');
assert.strictEqual(learningSessionManager.getAllSessions().length, 1, '세션 수는 여전히 1개여야 함');
console.log('✅ [PASS] 세션 생명주기, 정상 완주 및 중복 완료 차단(멱등성) 검증 완료');

// E. 도중 중단 (ABANDONED) 세션 테스트
const sessionId2 = learningSessionManager.startSession('beginner-2', '나비야', '쉬움', 70);
const abandonedRecord = learningSessionManager.abandonActiveSession();
assert.ok(abandonedRecord, '중단 레코드가 반환되어야 함');
assert.strictEqual(abandonedRecord?.status, 'ABANDONED', '도중 종료는 ABANDONED 상태');
assert.strictEqual(abandonedRecord?.isCompleted, false, '도중 종료는 미완주 상태');

sessions = learningSessionManager.getAllSessions();
assert.strictEqual(sessions.length, 2, '총 2개 세션 기록 확인');
console.log('✅ [PASS] 도중 종료(ABANDONED) 정상 기록 확인');

// ---------------------------------------------------------------------
// 3. 동일 곡 중복 완주 시 고유 곡 수 vs 총 완주 횟수 구분 검증
// ---------------------------------------------------------------------
console.log('--- 3. 고유 완주 곡 수 vs 총 완주 횟수 집계 검증 ---');
// 동일 곡('beginner-1')을 한 번 더 완주
learningSessionManager.startSession('beginner-1', '반짝반짝 작은별', '쉬움', 70);
learningSessionManager.completeSession({
  currentCombo: 14,
  maxCombo: 14,
  perfectCount: 14,
  greatCount: 0,
  missCount: 0,
  totalNotes: 14,
  accuracy: 100,
  lastRating: 'PERFECT',
});

const stats = learningSessionManager.getParentDashboardStats();
assert.strictEqual(stats.totalSessions, 3, '총 세션 수 3개 (완주 2, 중단 1)');
assert.strictEqual(stats.totalCompletions, 2, '총 완주 횟수는 2회');
assert.strictEqual(stats.distinctCompletedSongsCount, 1, '완주한 고유 곡 수는 1곡 (반짝반짝 작은별 중복 완주)');
console.log('✅ [PASS] 완주 횟수(2회)와 고유 곡 수(1곡) 분리 집계 검증 통과');

// ---------------------------------------------------------------------
// 4. 최근 7일 주간 막대 차트 데이터 구축 검증
// ---------------------------------------------------------------------
console.log('--- 4. 주간 학습 그래프 데이터 검증 ---');
assert.strictEqual(stats.weeklyBarData.length, 7, '최근 7일 막대 데이터는 정확히 7개');
const todayBar = stats.weeklyBarData.find((d) => d.isToday);
assert.ok(todayBar, '오늘 날짜 바 데이터 존재');
assert.strictEqual(todayBar?.date, todaySeoul, '오늘 날짜 일치');
console.log('✅ [PASS] 주간 7일 막대 차트 데이터 구축 검증 통과');

// ---------------------------------------------------------------------
// 5. 어린이 성장 화면 요약 및 일일 목표 변경 검증
// ---------------------------------------------------------------------
console.log('--- 5. 어린이 성장 화면 요약 및 일일 목표 검증 ---');
const childSummary = learningSessionManager.getChildGrowthSummary();
assert.ok(childSummary.todaySessions >= 1, '오늘 연습 세션 존재 확인');
assert.ok(childSummary.encouragementMessage.length > 0, '긍정적 격려 메시지 생성 확인');

// 목표 15분으로 변경
learningSessionManager.setDailyGoalMinutes(15);
const updatedGoal = learningSessionManager.getGoalSettings();
assert.strictEqual(updatedGoal.dailyGoalMinutes, 15, '목표 15분 정상 갱신');
console.log('✅ [PASS] 어린이 성장 요약 및 목표 설정 검증 통과');

// ---------------------------------------------------------------------
// 6. CSV 및 JSON 내보내기 수식 인젝션 방어 검증
// ---------------------------------------------------------------------
console.log('--- 6. CSV / JSON 내보내기 및 수식 인젝션 방어 검증 ---');
// 수식 기호(=)로 시작하는 악성 곡명 세션 등록
learningSessionManager.startSession('hymn-test', '=1+1', '찬송가', 90);
learningSessionManager.completeSession();

const csvText = learningSessionManager.exportLearningRecordsToCsv();
assert.ok(csvText.includes("''=1+1") || csvText.includes("'=1+1"), '수식 기호(=) 앞에 작은따옴표 이스케이프 적용 확인');

const jsonText = learningSessionManager.exportLearningRecordsToJson();
const parsedJson = JSON.parse(jsonText);
assert.strictEqual(parsedJson.version, 1, 'JSON 스키마 버전 1');
assert.ok(Array.isArray(parsedJson.sessions), 'JSON 세션 배열 존재');
console.log('✅ [PASS] CSV 수식 인젝션 방어 및 JSON 내보내기 검증 통과');

// ---------------------------------------------------------------------
// 7. 세션 삭제 및 전체 초기화 검증
// ---------------------------------------------------------------------
console.log('--- 7. 세션 삭제 및 초기화 검증 ---');
const allList = learningSessionManager.getAllSessions();
const targetId = allList[0].id;
learningSessionManager.deleteSessionRecord(targetId);
const afterDelete = learningSessionManager.getAllSessions();
assert.strictEqual(afterDelete.length, allList.length - 1, '1건 삭제 후 개수 감소');

learningSessionManager.clearAllLearningRecords();
assert.strictEqual(learningSessionManager.getAllSessions().length, 0, '전체 초기화 후 0건');
console.log('✅ [PASS] 개별 삭제 및 전체 초기화 검증 통과');

// ---------------------------------------------------------------------
// 8. 기존 111곡 카탈로그 무결성 회귀 테스트
// ---------------------------------------------------------------------
console.log('--- 8. 기존 111곡 카탈로그 무결성 회귀 검증 ---');
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
  assert.ok(notesCount >= 50, `고급곡 ${s.title}은 50음표 이상 유지 (실제: ${notesCount})`);
});
console.log('✅ [PASS] 111곡 카탈로그 100% 무결성 보존 확인');

console.log('🎉 [TEST] STEP 02-E 모든 단위 및 회귀 테스트 통과!');
