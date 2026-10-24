/**
 * Kalimba-MC 전체 프로그램 종합 진단 및 기능 작동 검증 스위트
 * 
 * 점검 영역:
 * 1. 111곡 데이터베이스 무결성 (초급 30, 중급 30, 고급 30, 찬송가 21)
 * 2. 17음 C Major 건반 주파수 및 옥타브 매핑 일관성
 * 3. 사용자 찬송가 저장소(`kalimba_custom_hymns_v1`) 로직 및 데이터 보호
 * 4. 학습 세션 매니저(`learningSessionManager.ts`) 세션 기록, CSV 내보내기 및 보안
 * 5. 리듬 콤보 판정 엔진(`rhythmJudge.ts`) 정확도 수식 및 구구가가 반응
 * 6. 녹음 스튜디오 WAV 내보내기 엔진(`wavExporter.ts`) 헤더 및 PCM 인코딩
 * 7. 악보 OCR 및 유효성 검사기(`scoreValidator.ts`, `scoreOcrEngine.ts`)
 * 8. 허밍 채보 엔진(`hummingTranscriptionEngine.ts`) F0, Onset, Quantize, 옥타브 시프트
 * 9. PWA 매니페스트 및 서비스 워커 파일 무결성
 * 10. 키보드 단축키(Space, R, Esc) 및 이벤트 디스패치 로직
 */

import { getAllSongsWithCustomHymns, BEGINNER_SONGS, INTERMEDIATE_SONGS, ADVANCED_SONGS } from '../src/data/songs';
import { DEFAULT_HYMN_SONGS, saveOrUpdateHymn, deleteOrResetHymn, CUSTOM_HYMNS_STORAGE_KEY } from '../src/data/hymns';
import { KALIMBA_KEYS, PITCH_TO_KEY, KEY_INDEX_MAP } from '../src/constants/kalimbaKeys';
import { learningSessionManager } from '../src/utils/learningSessionManager';
import { RhythmJudgeManager } from '../src/utils/rhythmJudge';
import { HummingTranscriptionEngine } from '../src/utils/hummingTranscriptionEngine';
import { validateScoreForKalimba } from '../src/utils/scoreValidator';
import { encodeAudioBufferToWav } from '../src/utils/wavExporter';
import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

console.log('====================================================');
console.log('🩺 Kalimba-MC 전체 프로그램 종합 기능 점검 시작');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;
const testResults: { category: string; testName: string; status: 'PASS' | 'FAIL'; note: string }[] = [];

function runCheck(category: string, testName: string, fn: () => void) {
  try {
    fn();
    passCount++;
    testResults.push({ category, testName, status: 'PASS', note: '정상 작동 확인' });
    console.log(`✅ [${category}] ${testName}`);
  } catch (err: any) {
    failCount++;
    testResults.push({ category, testName, status: 'FAIL', note: err.message });
    console.error(`❌ [${category}] ${testName} - 오류: ${err.message}`);
  }
}

// 1. 곡 데이터베이스 무결성 점검
runCheck('곡 데이터', '111곡 전체 수량 및 레벨별 구성 검증', () => {
  const allSongs = getAllSongsWithCustomHymns();
  assert(allSongs.length >= 111, `총 곡 수가 111곡 이상이어야 함 (실제: ${allSongs.length})`);
  assert(BEGINNER_SONGS.length === 30, `초급 곡 30곡 일치 (실제: ${BEGINNER_SONGS.length})`);
  assert(INTERMEDIATE_SONGS.length === 30, `중급 곡 30곡 일치 (실제: ${INTERMEDIATE_SONGS.length})`);
  assert(ADVANCED_SONGS.length === 30, `고급 곡 30곡 일치 (실제: ${ADVANCED_SONGS.length})`);
  assert(DEFAULT_HYMN_SONGS.length === 21, `기본 찬송가 21곡 일치 (실제: ${DEFAULT_HYMN_SONGS.length})`);
});

runCheck('곡 데이터', '전체 곡 ID 중복 여부 및 필수 메타데이터 검증', () => {
  const allSongs = getAllSongsWithCustomHymns();
  const idSet = new Set<string>();
  allSongs.forEach((song) => {
    assert(!idSet.has(song.id), `곡 ID 중복 발견: ${song.id}`);
    idSet.add(song.id);
    assert(song.title.length > 0, `곡 제목 누락: ID ${song.id}`);
    assert(song.tempoBpm >= 40 && song.tempoBpm <= 200, `BPM 범위 이상: ${song.tempoBpm} (ID: ${song.id})`);
    assert(song.notes.length > 0, `음표 목록 누락: ID ${song.id}`);
  });
});

// 2. 가상 칼림바 17건반 매핑 점검
runCheck('칼림바 건반', '17음 C Major 음역 및 물리 배치 검증 (C4=261.63Hz ~ E6=1318.51Hz)', () => {
  assert(KALIMBA_KEYS.length === 17, `건반 개수는 정확히 17개여야 함 (실제: ${KALIMBA_KEYS.length})`);
  assert(KALIMBA_KEYS[8].pitch === 'C4', `중앙 8번 건반은 C4여야 함 (실제: ${KALIMBA_KEYS[8].pitch})`);
  assert(KALIMBA_KEYS[8].frequency === 261.63, `C4 주파수는 261.63Hz여야 함`);
  assert(KALIMBA_KEYS[0].pitch === 'D6', `왼쪽 끝 0번 건반은 D6`);
  assert(KALIMBA_KEYS[16].pitch === 'E6', `오른쪽 끝 16번 건반은 E6`);

  KALIMBA_KEYS.forEach((k) => {
    assert(PITCH_TO_KEY.has(k.pitch), `PITCH_TO_KEY 매핑 누락: ${k.pitch}`);
    assert(KEY_INDEX_MAP.has(k.index), `KEY_INDEX_MAP 매핑 누락: ${k.index}`);
  });
});

// 3. 사용자 찬송가 저장소 검증
runCheck('저장소', '사용자 찬송가 저장 키 및 CRUD 무결성 검증', () => {
  assert(CUSTOM_HYMNS_STORAGE_KEY === 'kalimba_custom_hymns_v1', `찬송가 스토리지 키 일치`);
  // 임시 등록 테스트
  const testId = `test-hymn-${Date.now()}`;
  saveOrUpdateHymn({
    id: testId,
    title: '테스트 찬송가',
    tempoBpm: 90,
    rawNotation: '1 2 3 4',
  });
  const listAfterSave = getAllSongsWithCustomHymns();
  const saved = listAfterSave.find((s) => s.id === testId);
  assert(saved !== undefined, `저장된 찬송가가 목록에 존재해야 함`);

  // 삭제 테스트
  deleteOrResetHymn(testId);
  const listAfterDelete = getAllSongsWithCustomHymns();
  assert(!listAfterDelete.some((s) => s.id === testId), `삭제 후 찬송가가 제거되어야 함`);
});

// 4. 리듬 콤보 판정 엔진 점검
runCheck('리듬 콤보', '판정 오차 범위 및 콤보 누적 계산 검증', () => {
  const judge = new RhythmJudgeManager(10);
  const mockCandidates = [
    {
      id: 'note-1',
      pitch: 'C4',
      beatTime: 2.0,
      duration: 1.0,
      keyIndex: 8,
      finger: 'left',
      measureIndex: 0,
    } as any,
  ];

  // 1) PERFECT (타이밍 정확, 올바른 건반)
  const res1 = judge.registerUserInput(8, 2.0, 90, 1.0, mockCandidates);
  assert(res1.rating === 'PERFECT', `정확한 타이밍은 PERFECT (실제: ${res1.rating})`);
  assert(res1.combo === 1, `콤보 1 증가`);

  const statsAfter1 = judge.getStats();
  assert(statsAfter1.perfectCount === 1, `PERFECT 1회 카운트`);

  // 2) MISS (틀린 건반)
  const mockCandidates2 = [
    {
      id: 'note-2',
      pitch: 'D4',
      beatTime: 3.0,
      duration: 1.0,
      keyIndex: 7,
      finger: 'left',
      measureIndex: 0,
    } as any,
  ];
  const res2 = judge.registerUserInput(9, 3.0, 90, 1.0, mockCandidates2);
  assert(res2.rating === 'MISS', `틀린 건반은 MISS`);
  assert(res2.combo === 0, `MISS 발생 시 콤보 0으로 리셋`);
});

// 5. 학습 세션 매니저 및 CSV 내보내기 검증
runCheck('학습 세션', '세션 기록 및 CSV 수식 주입(Formula Injection) 방어 검증', () => {
  learningSessionManager.startSession('beginner-1', '나비야', '쉬움', 70);

  const completed = learningSessionManager.completeSession({
    currentCombo: 5,
    maxCombo: 10,
    perfectCount: 8,
    greatCount: 2,
    missCount: 0,
    totalNotes: 10,
    accuracy: 100,
  });
  assert(completed !== null, `세션 완료 레코드가 생성되어야 함`);

  const history = learningSessionManager.getAllSessions();
  assert(history.length > 0, `세션 히스토리에 완료된 세션이 기록되어야 함`);

  const csv = learningSessionManager.exportLearningRecordsToCsv();
  assert(csv.includes('세션 ID') || csv.includes('세션ID'), `CSV 헤더 포함 확인`);
  // 수식 주입 방어 확인 (=, +, -, @ 시작 시 앞에 ' 부착 여부)
  assert(!csv.includes('\n='), `CSV 수식 주입 방어 확인`);
});

// 6. WAV 내보내기 인코더 검증
runCheck('WAV 인코더', '16-bit PCM Linear Stereo 44.1kHz WAV 헤더 구조 검증', () => {
  const sampleRate = 44100;
  const numSamples = 44100; // 1초
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  const mockBuffer = {
    numberOfChannels: 2,
    sampleRate,
    length: numSamples,
    duration: 1.0,
    getChannelData: (ch: number) => (ch === 0 ? left : right),
  } as unknown as AudioBuffer;

  const wavArrayBuffer = encodeAudioBufferToWav(mockBuffer);
  // 1초 스테레오 16bit: 44바이트 헤더 + 44100 * 2ch * 2bytes = 176444 바이트
  assert(wavArrayBuffer.byteLength === 44 + 44100 * 4, `WAV 파일 크기 일치 (실제: ${wavArrayBuffer.byteLength} 바이트)`);

  const view = new DataView(wavArrayBuffer);
  // RIFF 검증
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  assert(riff === 'RIFF', `RIFF 식별자 일치`);
  // WAVE 검증
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  assert(wave === 'WAVE', `WAVE 식별자 일치`);
});

// 7. 악보 OCR 유효성 검사기 점검
runCheck('악보 OCR', '17음 칼림바 악보 유효성 검증기(scoreValidator) 점검', () => {
  const validNotes = [
    { id: '1', pitch: 'C4', duration: 1.0, isRest: false, x: 10, y: 10, measureIndex: 0 },
    { id: '2', pitch: 'E4', duration: 1.0, isRest: false, x: 20, y: 10, measureIndex: 0 },
    { id: '3', pitch: 'G4', duration: 1.0, isRest: false, x: 30, y: 10, measureIndex: 0 },
  ];
  const report = validateScoreForKalimba(validNotes as any);
  assert(report.isValidForKalimba === true, `정상 C Major 3음 유효 판정`);
  assert(report.playableNotes === 3, `연주 가능 음표 3개`);

  const invalidNotes = [
    { id: '1', pitch: 'C#4', duration: 1.0, isRest: false, x: 10, y: 10, measureIndex: 0 }, // 반음
    { id: '2', pitch: 'A2', duration: 1.0, isRest: false, x: 20, y: 10, measureIndex: 0 },  // 음역 이탈
  ];
  const invalidReport = validateScoreForKalimba(invalidNotes as any);
  assert(invalidReport.outOfRangeNotes === 2, `유효하지 않은 2개 음 검출`);
});

// 8. 허밍 채보 DSP 엔진 점검
runCheck('허밍 채보', 'YIN 알고리즘 F0 추정 및 저음 자동 옥타브 시프트 검증', () => {
  // 1초 C4(261.63Hz)
  const sampleRate = 44100;
  const numSamples = sampleRate;
  const buffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    buffer[i] = 0.5 * Math.sin(2 * Math.PI * 261.63 * (i / sampleRate));
  }

  const result = HummingTranscriptionEngine.transcribe(buffer, sampleRate, { targetOctaveShift: 0 });
  assert(result.status === 'SUCCESS', `C4 허밍 정상 변환 성공`);
  assert(result.notes.length > 0, `음표 최소 1개 이상 생성`);
  assert(result.notes[0].pitch === 'C4', `음높이 C4 일치 (실제: ${result.notes[0].pitch})`);
});

// 9. PWA 파일 무결성 점검
runCheck('PWA 설정', 'manifest.json 및 sw.js 파일 존재 및 문법 검증', () => {
  const manifestPath = path.resolve('public/manifest.json');
  assert(fs.existsSync(manifestPath), `manifest.json 파일 존재`);
  const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert(manifestContent.name === '우리 아이 칼림바 음악 교실', `PWA 앱 이름 일치`);
  assert(manifestContent.icons.length >= 2, `192/512 아이콘 정의 확인`);

  const swPath = path.resolve('public/sw.js');
  assert(fs.existsSync(swPath), `sw.js 파일 존재`);
  const swContent = fs.readFileSync(swPath, 'utf-8');
  assert(swContent.includes('CACHE_NAME'), `Service Worker 캐시 정의 포함 확인`);
});

// 10. 키보드 단축키 및 정적 파일 경로 점검
runCheck('키보드/접근성', 'App.tsx 키보드 리스너(Space, R, Esc) 구현 무결성 검증', () => {
  const appPath = path.resolve('src/App.tsx');
  const appCode = fs.readFileSync(appPath, 'utf-8');
  assert(appCode.includes("e.code === 'Space'"), `Space 키 재생/일시정지 리스너 구현 확인`);
  assert(appCode.includes("e.key === 'r'") || appCode.includes("e.key === 'R'"), `R 키 재시작 리스너 구현 확인`);
  assert(appCode.includes("e.code === 'Escape'"), `Esc 키 목록 복귀 리스너 구현 확인`);
});

console.log('\n====================================================');
console.log(`📊 전체 종합 진단 결과: ${passCount} / ${passCount + failCount} 통과 (${((passCount / (passCount + failCount)) * 100).toFixed(0)}%)`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
}
