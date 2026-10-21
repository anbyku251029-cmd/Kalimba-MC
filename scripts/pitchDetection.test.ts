/**
 * Kalimba-MC STEP 01-F
 * 마이크 음정 분석 알고리즘 (자기상관법) 정밀 단위 테스트
 * 
 * 브라우저 하드웨어 마이크 없이도 Float32Array 합성 신호(순수 사인파 및 잡음)를 통해
 * 알고리즘의 주파수 추정 정확도, 건반 매칭, 무음/노이즈 예외 처리를 검증합니다.
 */

import { PitchDetectionService } from '../src/utils/pitchDetectionService';
import { KALIMBA_KEYS, PITCH_TO_KEY } from '../src/constants/kalimbaKeys';

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

/**
 * 알려진 주파수의 순수 정현파(Sine Wave) Float32Array 오디오 버퍼 생성 헬퍼
 */
function generateSineWaveBuffer(frequency: number, sampleRate: number = 44100, length: number = 2048, amplitude: number = 0.8): Float32Array {
  const buffer = new Float32Array(length);
  const angularFreq = 2 * Math.PI * frequency / sampleRate;
  for (let i = 0; i < length; i++) {
    buffer[i] = amplitude * Math.sin(angularFreq * i);
  }
  return buffer;
}

console.log('================================================================');
console.log('🎤 Kalimba-MC STEP 01-F: 마이크 음정 분석 알고리즘 단위 테스트');
console.log('================================================================\n');

const SAMPLE_RATE = 44100;

// ----------------------------------------------------------------------
// 1. 알려진 기준 음표 정현파 입력 시험 (C4, A4, C5, C6)
// ----------------------------------------------------------------------
console.log('--- 1. 알려진 기준 주파수 합성 신호 검증 ---');

const testFrequencies = [
  { pitch: 'C4', freq: 261.63, expectedIndex: 8, label: '가운데도 (C4)' },
  { pitch: 'A4', freq: 440.00, expectedIndex: 5, label: '기준음 라 (A4)' },
  { pitch: 'C5', freq: 523.25, expectedIndex: 4, label: '높은도 (C5)' },
  { pitch: 'C6', freq: 1046.50, expectedIndex: 15, label: '높은높은도 (C6)' },
];

testFrequencies.forEach((target) => {
  const buffer = generateSineWaveBuffer(target.freq, SAMPLE_RATE, 2048, 0.7);
  const result = PitchDetectionService.detectPitchFromFloat32Array(buffer, SAMPLE_RATE);

  assert(result.isAvailable === true, `${target.label}: 분석 가능 상태`);
  assert(result.status === 'MATCH', `${target.label}: MATCH 판정 달성`);
  assert(result.closestKey !== null && result.closestKey.pitch === target.pitch, `${target.label}: 건반 일치 (${target.pitch})`);
  assert(result.closestKey !== null && result.closestKey.index === target.expectedIndex, `${target.label}: 건반 인덱스 ${target.expectedIndex} 일치`);

  const freqPctDiff = (Math.abs((result.estimatedFrequency || 0) - target.freq) / target.freq) * 100;
  assert(freqPctDiff < 1.0, `${target.label}: 주파수 오차 1.0% 이내 정밀 검출 (측정: ${result.estimatedFrequency} Hz, 목표: ${target.freq} Hz, 오차율: ${freqPctDiff.toFixed(2)}%)`);

  const cents = Math.abs(result.centsDeviation || 999);
  assert(cents < 15, `${target.label}: 센트 편차 15 cents 이내 매우 우수 (측정: ${result.centsDeviation} cents)`);
  assert(result.confidence >= 0.85, `${target.label}: 자기상관 신뢰도 85% 이상 (측정: ${Math.round(result.confidence * 100)}%)`);
});

// ----------------------------------------------------------------------
// 2. 엣지 케이스: 무음(Silence) 및 저음량 처리 검증
// ----------------------------------------------------------------------
console.log('\n--- 2. 무음(Silence) 신호 처리 검증 ---');

// 1) 완전 무음 (All 0)
const silenceBuffer = new Float32Array(2048);
const silenceResult = PitchDetectionService.detectPitchFromFloat32Array(silenceBuffer, SAMPLE_RATE);

assert(silenceResult.status === 'SILENCE', '완전 무음 신호는 SILENCE 상태 반환');
assert(silenceResult.estimatedFrequency === null, '무음 상태에서 억지 주파수 확정하지 않음 (null)');
assert(silenceResult.closestKey === null, '무음 상태에서 건반 할당하지 않음 (null)');

// 2) 극미세 잡음 (RMS 역치 미만)
const tinyNoiseBuffer = new Float32Array(2048);
for (let i = 0; i < tinyNoiseBuffer.length; i++) {
  tinyNoiseBuffer[i] = (Math.random() - 0.5) * 0.005; // RMS ~ 0.001
}
const tinyNoiseResult = PitchDetectionService.detectPitchFromFloat32Array(tinyNoiseBuffer, SAMPLE_RATE);
assert(tinyNoiseResult.status === 'SILENCE', '미세 배경 잡음(RMS 0.015 미만)은 정상 무음 필터링');

// ----------------------------------------------------------------------
// 3. 엣지 케이스: 백색 잡음(Noise) 처리 검증
// ----------------------------------------------------------------------
console.log('\n--- 3. 비주기성 백색 잡음(Noise) 신호 처리 검증 ---');

const whiteNoiseBuffer = new Float32Array(2048);
for (let i = 0; i < whiteNoiseBuffer.length; i++) {
  whiteNoiseBuffer[i] = (Math.random() - 0.5) * 0.8;
}
const whiteNoiseResult = PitchDetectionService.detectPitchFromFloat32Array(whiteNoiseBuffer, SAMPLE_RATE);

assert(whiteNoiseResult.status === 'UNCERTAIN', '주기성이 없는 백색 잡음은 UNCERTAIN(불확실) 판정');
assert(whiteNoiseResult.confidence < 0.65, '잡음 신호의 신뢰도는 임계값(0.65) 미만으로 안전 차단');

// ----------------------------------------------------------------------
// 4. 엣지 케이스: 칼림바 음역 밖의 신호 (저주파 험 노이즈 60Hz)
// ----------------------------------------------------------------------
console.log('\n--- 4. 음역 외 주파수 (60Hz 험 노이즈) 처리 검증 ---');

const humBuffer = generateSineWaveBuffer(60, SAMPLE_RATE, 2048, 0.5);
const humResult = PitchDetectionService.detectPitchFromFloat32Array(humBuffer, SAMPLE_RATE);

// 60Hz는 칼림바 탐색 범위(220Hz~1500Hz) 밖이므로 칼림바 건반으로 오인하여 정답 처리하지 않아야 함
assert(humResult.status !== 'MATCH', '60Hz 저주파는 칼림바 건반 정답(MATCH)으로 오인하지 않음');

// ----------------------------------------------------------------------
// 요약 출력
// ----------------------------------------------------------------------
console.log('\n================================================================');
console.log(`🎉 음정 분석 테스트 완료: 총 ${totalAssertions}개 단언문 중 ${passedAssertions}개 통과, ${failedAssertions}개 실패`);
console.log('================================================================');

if (failedAssertions > 0) {
  process.exit(1);
}
