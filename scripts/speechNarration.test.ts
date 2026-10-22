/**
 * Kalimba-MC STEP 01-G
 * 유아용 한국어 음성 나레이션(Web Speech API) 단위 테스트 스위트
 */

import { NARRATION_PHRASES } from '../src/constants/narrationPhrases';

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

// ----------------------------------------------------------------------
// Web Speech API 모킹 셋업
// ----------------------------------------------------------------------
class MockSpeechSynthesisUtterance {
  public text: string = '';
  public lang: string = 'ko-KR';
  public rate: number = 0.85;
  public pitch: number = 1.05;
  public volume: number = 0.9;
  public voice: any = null;
  public onend: (() => void) | null = null;
  public onerror: ((e: any) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

class MockSpeechSynthesis {
  public spokenList: string[] = [];
  public cancelCount: number = 0;
  public speaking: boolean = false;
  public onvoiceschanged: (() => void) | null = null;

  private voices: any[] = [
    { name: 'Google 한국의', lang: 'ko-KR', voiceURI: 'google-ko-kr' },
    { name: 'Microsoft Heami', lang: 'ko-KR', voiceURI: 'ms-heami' },
    { name: 'Alex', lang: 'en-US', voiceURI: 'en-alex' },
  ];

  public getVoices() {
    return this.voices;
  }

  public speak(utterance: MockSpeechSynthesisUtterance) {
    this.spokenList.push(utterance.text);
    this.speaking = true;
    setTimeout(() => {
      this.speaking = false;
      if (utterance.onend) utterance.onend();
    }, 10);
  }

  public cancel() {
    this.cancelCount++;
    this.speaking = false;
  }
}

const mockStorage: { [key: string]: string } = {};
(global as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
};

(global as any).window = {
  speechSynthesis: new MockSpeechSynthesis(),
};
(global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

console.log('================================================================');
console.log('🗣️ Kalimba-MC STEP 01-G: 유아용 음성 나레이션 단위 테스트');
console.log('================================================================\n');

// ----------------------------------------------------------------------
// 1. 서비스 초기화 및 한국어 음성 탐색 검증
// ----------------------------------------------------------------------
console.log('--- 1. 서비스 초기화 및 한국어 음성 자동 탐색 검증 ---');

// 동적 import로 모킹된 환경에서 로드
import('../src/utils/speechNarrationService').then(({ speechNarrator }) => {
  assert(speechNarrator.isSupported() === true, '모킹 환경에서 Web Speech API 지원 감지');

  const status = speechNarrator.getStatus();
  assert(status.hasKoreanVoice === true, 'ko-KR 한국어 음성 자동 감지 및 선택');
  assert(status.availableVoicesCount >= 2, '사용 가능한 음성 목록 2개 이상 확인');

  const settings = speechNarrator.getSettings();
  assert(settings.enabled === true, '초기 음성 설정 활성화(enabled=true)');
  assert(settings.rate === 0.85, '유아 친화적 말하기 속도(0.85) 적용');
  assert(settings.pitch === 1.05, '다정하고 밝은 피치(1.05) 적용');

  // ----------------------------------------------------------------------
  // 2. 발화 및 문구 자막 갱신 검증
  // ----------------------------------------------------------------------
  console.log('\n--- 2. 발화 실행 및 상태 갱신 검증 ---');

  speechNarrator.speak(NARRATION_PHRASES.WELCOME, true);
  const updatedStatus = speechNarrator.getStatus();
  assert(updatedStatus.currentText === NARRATION_PHRASES.WELCOME, '현재 발화 자막 텍스트 갱신');

  const mockSynth = (global as any).window.speechSynthesis as MockSpeechSynthesis;
  assert(mockSynth.spokenList.includes(NARRATION_PHRASES.WELCOME), 'SpeechSynthesis.speak 실제 호출 확인');

  // ----------------------------------------------------------------------
  // 3. 중복 발화 방지 및 발화 취소 검증
  // ----------------------------------------------------------------------
  console.log('\n--- 3. 2초 내 동일 문구 중복 발화 억제 검증 ---');

  const initialCount = mockSynth.spokenList.length;
  // 2초 내 동일 문구 다시 speak 호출 (force=false)
  speechNarrator.speak(NARRATION_PHRASES.WELCOME, false);
  assert(mockSynth.spokenList.length === initialCount, '동일 문구 2초 내 연속 호출 시 중복 발화 차단');

  // 다른 새로운 문구 호출 시 이전 발화 cancel 후 새 발화 진행
  const initialCancelCount = mockSynth.cancelCount;
  speechNarrator.speak(NARRATION_PHRASES.STEP1_LISTEN, false);
  assert(mockSynth.cancelCount > initialCancelCount, '새 문구 발화 시 직전 발화 cancel() 호출 확인');
  assert(speechNarrator.getStatus().currentText === NARRATION_PHRASES.STEP1_LISTEN, '자막 텍스트가 새 문구로 교체');

  // ----------------------------------------------------------------------
  // 4. 음성 비활성화 및 화면 자막 유지 검증
  // ----------------------------------------------------------------------
  console.log('\n--- 4. 음성 끄기 시 발화 차단 및 자막 대체 검증 ---');

  speechNarrator.updateSettings({ enabled: false });
  assert(speechNarrator.getSettings().enabled === false, '음성 비활성화 설정 반영');

  const countBefore = mockSynth.spokenList.length;
  speechNarrator.speak(NARRATION_PHRASES.STEP2_SLOW, false);
  assert(mockSynth.spokenList.length === countBefore, '비활성화 시 실제 음성 합성은 호출되지 않음');
  assert(speechNarrator.getStatus().currentText === NARRATION_PHRASES.STEP2_SLOW, '소리는 꺼져도 화면 자막은 정상 갱신 (접근성 보장)');

  // ----------------------------------------------------------------------
  // 5. 다시 켜기 및 다시 듣기(Replay) 검증
  // ----------------------------------------------------------------------
  console.log('\n--- 5. 음성 다시 켜기 및 다시 듣기(Replay) 검증 ---');

  speechNarrator.updateSettings({ enabled: true });
  speechNarrator.replayLast();
  assert(mockSynth.spokenList.includes(NARRATION_PHRASES.STEP2_SLOW), '다시 듣기(Replay) 시 마지막 텍스트 발화 호출');

  // ----------------------------------------------------------------------
  // 6. 음악 오디오 타이밍과의 분리 검증
  // ----------------------------------------------------------------------
  console.log('\n--- 6. 음악 오디오 타이밍과 비동기 분리 검증 ---');

  const startMs = Date.now();
  speechNarrator.speak('비동기 테스트 문구', true);
  const elapsedMs = Date.now() - startMs;
  assert(elapsedMs < 10, '음성 발화 호출이 즉시 반환되어 음악 시작 시간을 지연시키지 않음');

  // ----------------------------------------------------------------------
  // 요약 출력
  // ----------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🎉 음성 나레이션 테스트 완료: 총 ${totalAssertions}개 단언문 중 ${passedAssertions}개 통과, ${failedAssertions}개 실패`);
  console.log('================================================================');

  if (failedAssertions > 0) {
    process.exit(1);
  }
});
