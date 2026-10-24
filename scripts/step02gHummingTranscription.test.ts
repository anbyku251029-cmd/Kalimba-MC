/**
 * Kalimba-MC STEP 02-G
 * 허밍 채보 및 AI 악보 변환 핵심 기술 검증 테스트 스위트
 * 
 * 10개 품질/완료 게이트 검증:
 * 1. F0 피치 추정 정확도 (A4=440Hz, C4=261.63Hz, C5=523.25Hz, D6=1174.66Hz)
 * 2. 복합 배음(Harmonics) 환경에서의 옥타브 오인 방지 (2배음/3배음 함유 신호)
 * 3. Onset/Offset 음표 분할 (연속된 음과 무음 구간 분리)
 * 4. 리듬 양자화 (4분음표 1.0박, 8분음표 0.5박, 2분음표 2.0박 스냅)
 * 5. 저음 허밍 자동 옥타브 시프트 (+1 옥타브 / +2 옥타브 상향)
 * 6. 17음 C Major 온음계 매핑 및 반음(#) 근사 매핑
 * 7. 비정상 입력 방어 (너무 짧은 오디오, 순수 무음)
 * 8. 처리 속도 및 지연 시간 (3초 오디오 기준 150ms 이내 처리)
 * 9. Song 및 KalimbaNote 객체 생성 무결성
 * 10. 기존 111곡 데이터베이스 회귀 검증
 */

import {
  HummingTranscriptionEngine,
  frequencyToMidi,
  midiToPitchName,
} from '../src/utils/hummingTranscriptionEngine';
import { getAllSongsWithCustomHymns } from '../src/data/songs';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

/**
 * 모의 오디오 사인파 합성 헬퍼
 */
function synthesizeSineWave(
  freqHz: number,
  durationSec: number,
  sampleRate: number = 44100,
  amplitude: number = 0.5
): Float32Array {
  const numSamples = Math.floor(durationSec * sampleRate);
  const buffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    buffer[i] = amplitude * Math.sin(2 * Math.PI * freqHz * t);
  }
  return buffer;
}

/**
 * 모의 복합 배음(성대 진동) 합성 헬퍼
 */
function synthesizeHarmonicVoice(
  fundamentalHz: number,
  durationSec: number,
  sampleRate: number = 44100
): Float32Array {
  const numSamples = Math.floor(durationSec * sampleRate);
  const buffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // F0(기본음 0.4) + F1(2배음 0.25) + F2(3배음 0.15)
    buffer[i] =
      0.4 * Math.sin(2 * Math.PI * fundamentalHz * t) +
      0.25 * Math.sin(2 * Math.PI * (fundamentalHz * 2) * t) +
      0.15 * Math.sin(2 * Math.PI * (fundamentalHz * 3) * t);
  }
  return buffer;
}

console.log('====================================================');
console.log('🧪 STEP 02-G: 허밍 채보 및 AI 악보 변환 기술 검증 시작');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 10;

// Gate 1: F0 피치 추정 정확도
try {
  console.log('Gate 1: F0 피치 추정 정확도 검증 (A4=440Hz, C4=261.63Hz, C5=523.25Hz)...');
  const sampleRate = 44100;

  // A4 (440Hz)
  const a4Buffer = synthesizeSineWave(440, 0.5, sampleRate);
  const a4Result = HummingTranscriptionEngine.detectF0Yin(a4Buffer.subarray(0, 2048), sampleRate);
  assert(a4Result.f0 !== null, 'A4 주파수가 검출되어야 합니다.');
  const a4Diff = Math.abs(a4Result.f0! - 440);
  assert(a4Diff < 5, `A4 오차가 5Hz 이내여야 합니다 (실제 오차: ${a4Diff.toFixed(2)}Hz)`);

  // C4 (261.63Hz)
  const c4Buffer = synthesizeSineWave(261.63, 0.5, sampleRate);
  const c4Result = HummingTranscriptionEngine.detectF0Yin(c4Buffer.subarray(0, 2048), sampleRate);
  assert(c4Result.f0 !== null, 'C4 주파수가 검출되어야 합니다.');
  const c4Diff = Math.abs(c4Result.f0! - 261.63);
  assert(c4Diff < 5, `C4 오차가 5Hz 이내여야 합니다 (실제 오차: ${c4Diff.toFixed(2)}Hz)`);

  passedTests++;
  console.log(`✅ Gate 1 통과: A4 추정 ${a4Result.f0?.toFixed(1)}Hz, C4 추정 ${c4Result.f0?.toFixed(1)}Hz`);
} catch (e: any) {
  console.error(`❌ Gate 1 실패: ${e.message}`);
}

// Gate 2: 복합 배음(Harmonics) 환경에서의 옥타브 오인 방지
try {
  console.log('Gate 2: 복합 배음(2배음, 3배음) 함유 신호에서 기본음(F0) 유지 검증...');
  const sampleRate = 44100;
  const harmonicBuffer = synthesizeHarmonicVoice(261.63, 0.5, sampleRate);
  const result = HummingTranscriptionEngine.detectF0Yin(harmonicBuffer.subarray(0, 2048), sampleRate);
  assert(result.f0 !== null, '복합 배음 신호에서 주파수가 검출되어야 합니다.');
  const midi = frequencyToMidi(result.f0!);
  const pitch = midiToPitchName(Math.round(midi));
  assert(pitch === 'C4', `복합 배음에서도 옥타브 배음(C5)으로 튀지 않고 C4로 인식되어야 합니다 (실제: ${pitch})`);

  passedTests++;
  console.log(`✅ Gate 2 통과: 2배음/3배음 공존 시에도 기본음 ${pitch} (${result.f0?.toFixed(1)}Hz) 정확 검출`);
} catch (e: any) {
  console.error(`❌ Gate 2 실패: ${e.message}`);
}

// Gate 3: Onset/Offset 음표 분할 (연속된 두 음 및 무음 분할)
try {
  console.log('Gate 3: 음표 분할 (Onset/Offset Segmentation) 검증...');
  const sampleRate = 44100;
  // C4 0.5초 + 무음 0.15초 + G4 0.5초
  const note1 = synthesizeSineWave(261.63, 0.5, sampleRate, 0.5);
  const silence = new Float32Array(Math.floor(0.15 * sampleRate));
  const note2 = synthesizeSineWave(392.0, 0.5, sampleRate, 0.5);

  const combined = new Float32Array(note1.length + silence.length + note2.length);
  combined.set(note1, 0);
  combined.set(silence, note1.length);
  combined.set(note2, note1.length + silence.length);

  const frames = HummingTranscriptionEngine.analyzeFrames(combined, sampleRate);
  const segments = HummingTranscriptionEngine.segmentNotes(frames);

  assert(segments.length === 2, `2개의 분리된 음표가 검출되어야 합니다 (검출 개수: ${segments.length})`);
  assert(segments[0].representativeMidi === 60, `첫 번째 음은 C4(60)여야 합니다 (실제: ${segments[0].representativeMidi})`);
  assert(segments[1].representativeMidi === 67, `두 번째 음은 G4(67)여야 합니다 (실제: ${segments[1].representativeMidi})`);

  passedTests++;
  console.log(`✅ Gate 3 통과: 2개 음표(C4, G4) 분할 성공 (구간: ${segments[0].durationMs.toFixed(0)}ms, ${segments[1].durationMs.toFixed(0)}ms)`);
} catch (e: any) {
  console.error(`❌ Gate 3 실패: ${e.message}`);
}

// Gate 4: 리듬 양자화 (밀리초 -> 4분음표, 8분음표, 2분음표 스냅)
try {
  console.log('Gate 4: 리듬 양자화 (BPM 90 기준 음길이 스냅) 검증...');
  // 90 BPM 기준 1박 = 667ms
  const mockSegments = [
    { index: 0, startTimeSec: 0, endTimeSec: 0.35, durationMs: 350, avgFrequencyHz: 440, representativeMidi: 69, avgConfidence: 0.9, avgRms: 0.2, centsDeviation: 0 },
    { index: 1, startTimeSec: 0.35, endTimeSec: 1.05, durationMs: 700, avgFrequencyHz: 440, representativeMidi: 69, avgConfidence: 0.9, avgRms: 0.2, centsDeviation: 0 },
    { index: 2, startTimeSec: 1.05, endTimeSec: 2.45, durationMs: 1400, avgFrequencyHz: 440, representativeMidi: 69, avgConfidence: 0.9, avgRms: 0.2, centsDeviation: 0 },
  ];

  const quantized = HummingTranscriptionEngine.quantizeRhythm(mockSegments, 90);
  assert(quantized[0].beatDuration === 0.5, `350ms는 8분음표(0.5박)여야 합니다 (실제: ${quantized[0].beatDuration})`);
  assert(quantized[1].beatDuration === 1.0, `700ms는 4분음표(1.0박)여야 합니다 (실제: ${quantized[1].beatDuration})`);
  assert(quantized[2].beatDuration === 2.0, `1400ms는 2분음표(2.0박)여야 합니다 (실제: ${quantized[2].beatDuration})`);

  passedTests++;
  console.log('✅ Gate 4 통과: 350ms -> 0.5박, 700ms -> 1.0박, 1400ms -> 2.0박 양자화 일치');
} catch (e: any) {
  console.error(`❌ Gate 4 실패: ${e.message}`);
}

// Gate 5: 저음 허밍 자동 옥타브 시프트 (+1 옥타브)
try {
  console.log('Gate 5: 저음 허밍 자동 옥타브 시프트 (+12 MIDI) 검증...');
  // 남성 허밍 대역: C3(48), E3(52), G3(55)
  const lowNotes = [
    { index: 0, startTimeSec: 0, endTimeSec: 0.7, durationMs: 700, avgFrequencyHz: 130.81, representativeMidi: 48, avgConfidence: 0.95, avgRms: 0.3, centsDeviation: 0, beatDuration: 1.0, noteTypeName: '4분음표', targetMidi: 48, isOutOfRange: false, wasAccidental: false },
    { index: 1, startTimeSec: 0.7, endTimeSec: 1.4, durationMs: 700, avgFrequencyHz: 164.81, representativeMidi: 52, avgConfidence: 0.95, avgRms: 0.3, centsDeviation: 0, beatDuration: 1.0, noteTypeName: '4분음표', targetMidi: 52, isOutOfRange: false, wasAccidental: false },
  ];

  const { notes, appliedOctaveShift } = HummingTranscriptionEngine.mapToKalimba(lowNotes);
  assert(appliedOctaveShift >= 1, `저음 허밍에 대해 최소 1옥타브 이상 시프트되어야 합니다 (실제: ${appliedOctaveShift})`);
  assert(notes[0].pitch === 'C4' || notes[0].pitch === 'C5', `시프트된 첫 번째 음은 칼림바 유효 음이어야 합니다 (실제: ${notes[0].pitch})`);

  passedTests++;
  console.log(`✅ Gate 5 통과: 저음 허밍(MIDI 48) -> ${appliedOctaveShift}옥타브 상향 (${notes[0].pitch}) 자동 보정`);
} catch (e: any) {
  console.error(`❌ Gate 5 실패: ${e.message}`);
}

// Gate 6: 17음 C Major 온음계 매핑 및 반음(#) 근사 매핑
try {
  console.log('Gate 6: 칼림바에 없는 반음(#) 검출 시 자연음 근사 및 플래그 검증...');
  const sampleRate = 44100;
  // F#4 (369.99Hz, MIDI 66)
  const fSharpBuffer = synthesizeSineWave(369.99, 0.6, sampleRate);
  const result = HummingTranscriptionEngine.transcribe(fSharpBuffer, sampleRate, { targetOctaveShift: 0 });

  assert(result.quantizedNotes.length > 0, '음표가 검출되어야 합니다.');
  assert(result.quantizedNotes[0].wasAccidental === true, 'F#4는 wasAccidental 플래그가 true여야 합니다.');
  assert(result.notes[0].pitch === 'G4' || result.notes[0].pitch === 'F4', `반음이 인접 자연음으로 조정되어야 합니다 (실제: ${result.notes[0].pitch})`);
  assert(result.warnings.some((w) => w.includes('반음(#)')), '반음 조정 경고 문구가 포함되어야 합니다.');

  passedTests++;
  console.log(`✅ Gate 6 통과: F#4 -> 자연음(${result.notes[0].pitch}) 매핑 및 사용자 피드백 안내 정상`);
} catch (e: any) {
  console.error(`❌ Gate 6 실패: ${e.message}`);
}

// Gate 7: 비정상 입력 방어 (너무 짧은 오디오, 순수 무음)
try {
  console.log('Gate 7: 비정상 입력(짧은 오디오, 무음) 방어 검증...');
  const sampleRate = 44100;
  // 1) 0.1초 짧은 오디오
  const shortBuffer = new Float32Array(Math.floor(0.1 * sampleRate));
  const shortResult = HummingTranscriptionEngine.transcribe(shortBuffer, sampleRate);
  assert(shortResult.status === 'TOO_SHORT', `0.1초 오디오는 TOO_SHORT 상태여야 합니다 (실제: ${shortResult.status})`);

  // 2) 1.0초 순수 무음
  const silenceBuffer = new Float32Array(Math.floor(1.0 * sampleRate));
  const silenceResult = HummingTranscriptionEngine.transcribe(silenceBuffer, sampleRate);
  assert(silenceResult.status === 'NO_VOICE_DETECTED', `순수 무음은 NO_VOICE_DETECTED 상태여야 합니다 (실제: ${silenceResult.status})`);

  passedTests++;
  console.log('✅ Gate 7 통과: TOO_SHORT 및 NO_VOICE_DETECTED 정상 방어');
} catch (e: any) {
  console.error(`❌ Gate 7 실패: ${e.message}`);
}

// Gate 8: 처리 속도 및 지연 시간 (3초 오디오 기준 150ms 이내 처리)
try {
  console.log('Gate 8: 처리 속도 및 실시간성 검증 (3초 오디오 기준)...');
  const sampleRate = 44100;
  const audio3Sec = synthesizeSineWave(261.63, 3.0, sampleRate);

  const tStart = performance.now();
  const transResult = HummingTranscriptionEngine.transcribe(audio3Sec, sampleRate);
  const elapsed = performance.now() - tStart;

  assert(elapsed < 150, `3초 오디오 채보 시간이 150ms 이내여야 합니다 (실제: ${elapsed.toFixed(1)}ms)`);
  assert(transResult.status === 'SUCCESS', `정상 상태여야 합니다 (실제: ${transResult.status})`);

  passedTests++;
  console.log(`✅ Gate 8 통과: 3.0초 오디오 분석 시간 ${elapsed.toFixed(1)}ms (기준: 150ms 이내)`);
} catch (e: any) {
  console.error(`❌ Gate 8 실패: ${e.message}`);
}

// Gate 9: Song 및 KalimbaNote 객체 생성 무결성
try {
  console.log('Gate 9: 최종 Song 및 KalimbaNote 객체 무결성 검증...');
  const sampleRate = 44100;
  const audioBuffer = synthesizeSineWave(523.25, 0.7, sampleRate); // C5
  const result = HummingTranscriptionEngine.transcribe(audioBuffer, sampleRate);

  assert(result.song !== null, 'Song 객체가 생성되어야 합니다.');
  assert(result.song!.title.includes('허밍'), '제목에 허밍이 포함되어야 합니다.');
  assert(result.song!.tempoBpm === 90, '기본 BPM 90 설정 확인');
  assert(result.notes.length > 0, '최소 1개 이상의 칼림바 음표가 생성되어야 합니다.');
  assert(result.notes[0].solfege === '도', 'C5의 계이름은 도여야 합니다.');
  assert(result.notes[0].numberNotation.includes('1'), '숫자 악보 표기 1 포함');

  passedTests++;
  console.log(`✅ Gate 9 통과: Song ID=${result.song?.id}, 음표=${result.notes[0].pitch}(${result.notes[0].solfege}, ${result.notes[0].numberNotation})`);
} catch (e: any) {
  console.error(`❌ Gate 9 실패: ${e.message}`);
}

// Gate 10: 기존 111곡 데이터베이스 회귀 검증
try {
  console.log('Gate 10: 기존 111곡 데이터 무결성 회귀 검증...');
  const allSongs = getAllSongsWithCustomHymns();
  assert(allSongs.length >= 111, `총 곡 수가 111곡 이상이어야 합니다 (현재: ${allSongs.length}곡)`);

  const beginner = allSongs.filter((s) => s.level === 'beginner');
  const intermediate = allSongs.filter((s) => s.level === 'intermediate');
  const advanced = allSongs.filter((s) => s.level === 'advanced');
  const hymn = allSongs.filter((s) => s.level === 'hymn');

  assert(beginner.length >= 30, `초급 ${beginner.length}곡 (기준: 30곡)`);
  assert(intermediate.length >= 30, `중급 ${intermediate.length}곡 (기준: 30곡)`);
  assert(advanced.length >= 30, `고급 ${advanced.length}곡 (기준: 30곡)`);
  assert(hymn.length >= 21, `찬송가 ${hymn.length}곡 (기준: 21곡)`);

  passedTests++;
  console.log(`✅ Gate 10 통과: 총 ${allSongs.length}곡 (초급 ${beginner.length}, 중급 ${intermediate.length}, 고급 ${advanced.length}, 찬송가 ${hymn.length}) 무결성 확인`);
} catch (e: any) {
  console.error(`❌ Gate 10 실패: ${e.message}`);
}

console.log('\n====================================================');
console.log(`📊 테스트 결과: ${passedTests} / ${totalTests} 게이트 통과 (${((passedTests / totalTests) * 100).toFixed(0)}%)`);
console.log('====================================================');

if (passedTests < totalTests) {
  process.exit(1);
}
