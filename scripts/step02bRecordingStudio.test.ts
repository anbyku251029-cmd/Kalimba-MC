import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RecordingSessionManager } from '../src/utils/recordingManager';
import { encodeAudioBufferToWav } from '../src/utils/wavExporter';
import { getAllSongsWithCustomHymns } from '../src/data/songs';
import { audioEngine } from '../src/utils/audioEngine';

console.log('🧪 [TEST] STEP 02-B 녹음 스튜디오 및 WAV 내보내기 검증 시작...');

// 1. 녹음 관리자 (RecordingSessionManager) 단위 테스트
const manager = new RecordingSessionManager();

// 시작 전 상태 확인
assert.strictEqual(manager.getState(), 'READY', '초기 상태는 READY여야 함');
assert.strictEqual(manager.getRecordedNoteCount(), 0, '초기 녹음 음표 수는 0이어야 함');

// 녹음 시작 (기준 시각: 1.0초)
manager.startRecording(1.0);
assert.strictEqual(manager.getState(), 'RECORDING', '시작 후 상태는 RECORDING이어야 함');

// 음표 기록 (단일 음표, 1.05초 시점 -> 경과 50ms)
const n1 = manager.recordNote(1, 'C4', 1.05);
assert.ok(n1, '음표 1이 정상 기록되어야 함');
assert.strictEqual(n1?.noteNumber, '1');
assert.strictEqual(n1?.pitch, 'C4');

// 30ms 이내 동일 음표 입력 시 디바운스 필터링 확인 (1.065초 -> 15ms 후 동일 음표)
const n1_duplicate = manager.recordNote(1, 'C4', 1.065);
assert.strictEqual(n1_duplicate, null, '30ms 이내 동일 음표는 디바운스로 무시되어야 함');

// 45ms 이내 다른 음표 동시 입력 시 동일한 groupId 부여 (화음) 확인 (1.075초 -> n1과 25ms 차이)
const n2 = manager.recordNote(3, 'E4', 1.075);
assert.ok(n2, '화음 음표 2가 정상 기록되어야 함');
assert.strictEqual(n1?.groupId, n2?.groupId, '동시 입력된 음표는 동일한 groupId를 가져야 함');

// 시간 경과 후 다음 음표 기록 (다른 그룹, 1.60초 -> 525ms 후)
const n3 = manager.recordNote(5, 'G4', 1.60);
assert.ok(n3, '음표 3이 정상 기록되어야 함');
assert.notStrictEqual(n1?.groupId, n3?.groupId, '충분한 시간 차(525ms)가 있는 음표는 다른 groupId여야 함');

// 일시정지 테스트 (1.70초)
manager.pauseRecording(1.70);
assert.strictEqual(manager.getState(), 'PAUSED', '일시정지 후 상태는 PAUSED여야 함');

// 일시정지 중 음표 기록 방지 (1.80초)
const n_paused = manager.recordNote(6, 'A4', 1.80);
assert.strictEqual(n_paused, null, '일시정지 상태에서는 음표가 기록되지 않아야 함');

// 재개 테스트 (2.00초 -> 300ms 일시정지 지속)
manager.resumeRecording(2.00);
assert.strictEqual(manager.getState(), 'RECORDING', '재개 후 상태는 RECORDING이어야 함');

// 재개 후 추가 음표 기록 (2.30초)
const n4 = manager.recordNote(8, 'C5', 2.30);
assert.ok(n4, '재개 후 음표가 정상 기록되어야 함');

// 녹음 종료
const session = manager.stopRecording();
assert.strictEqual(manager.getState(), 'STOPPED', '정지 후 상태는 STOPPED여야 함');
assert.ok(session, '세션 객체가 반환되어야 함');
assert.strictEqual(session?.notes.length, 4, '최종 세션 음표는 4개(C4, E4, G4, C5)여야 함');

// 숫자 악보 자동 변환(generateNumberedNotation) 검증
const notation = manager.generateNumberedNotation();
console.log('📝 생성된 숫자 악보 미리보기:\n' + notation);
assert.ok(notation.length > 0, '숫자 악보 텍스트가 생성되어야 함');
assert.ok(notation.includes('1'), '숫자 악보에 1음이 포함되어야 함');

// 2. WAV 인코더 바이너리 헤더 검증
console.log('🎵 [TEST] WAV 인코더 RIFF 헤더 및 바이너리 무결성 검증...');

// 모의 AudioBuffer 객체 생성
const mockSampleRate = 44100;
const mockChannels = 2;
const mockLength = 44100 * 2; // 2초 분량 (88,200 샘플)
const leftChannel = new Float32Array(mockLength);
const rightChannel = new Float32Array(mockLength);

// 440Hz 사인파 톤 채우기
for (let i = 0; i < mockLength; i++) {
  leftChannel[i] = Math.sin((2 * Math.PI * 440 * i) / mockSampleRate) * 0.5;
  rightChannel[i] = Math.sin((2 * Math.PI * 440 * i) / mockSampleRate) * 0.5;
}

const mockAudioBuffer = {
  sampleRate: mockSampleRate,
  numberOfChannels: mockChannels,
  length: mockLength,
  duration: 2.0,
  getChannelData: (channel: number) => (channel === 0 ? leftChannel : rightChannel),
} as unknown as AudioBuffer;

const wavArrayBuffer = encodeAudioBufferToWav(mockAudioBuffer);
assert.ok(wavArrayBuffer instanceof ArrayBuffer, 'WAV 출력은 ArrayBuffer 인스턴스여야 함');

const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
assert.strictEqual(wavBlob.type, 'audio/wav', 'MIME 타입은 audio/wav여야 함');

// 예상 파일 크기 = 44바이트 헤더 + (샘플 수 * 채널 수 * 샘플당 2바이트)
// 44 + (88200 * 2 * 2) = 44 + 352800 = 352844 바이트
const expectedFileSize = 44 + mockLength * mockChannels * 2;
assert.strictEqual(wavArrayBuffer.byteLength, expectedFileSize, `WAV 바이트 크기 일치 (${wavArrayBuffer.byteLength} === ${expectedFileSize})`);

// 바이너리 헤더 직접 검증
const view = new DataView(wavArrayBuffer);

// 1. RIFF 식별자 (0~3)
const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
assert.strictEqual(riff, 'RIFF', '0~3바이트는 RIFF여야 함');

// 2. 전체 파일 크기 - 8 (4~7)
const chunkSize = view.getUint32(4, true);
assert.strictEqual(chunkSize, expectedFileSize - 8, 'ChunkSize는 fileSize - 8이어야 함');

// 3. WAVE 식별자 (8~11)
const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
assert.strictEqual(wave, 'WAVE', '8~11바이트는 WAVE여야 함');

// 4. fmt  식별자 (12~15)
const fmt = String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15));
assert.strictEqual(fmt, 'fmt ', '12~15바이트는 fmt 이어야 함');

// 5. fmt 청크 크기 (16~19) -> 16 (PCM)
const fmtSize = view.getUint32(16, true);
assert.strictEqual(fmtSize, 16, 'fmt 청크 크기는 16(PCM)이어야 함');

// 6. 오디오 포맷 (20~21) -> 1 (Linear PCM)
const audioFormat = view.getUint16(20, true);
assert.strictEqual(audioFormat, 1, 'AudioFormat은 1(Linear PCM)이어야 함');

// 7. 채널 수 (22~23) -> 2 (Stereo)
const numChannels = view.getUint16(22, true);
assert.strictEqual(numChannels, 2, 'NumChannels는 2(Stereo)여야 함');

// 8. 샘플레이트 (24~27) -> 44100
const sampleRate = view.getUint32(24, true);
assert.strictEqual(sampleRate, 44100, 'SampleRate는 44100이어야 함');

// 9. 바이트 레이트 (28~31) -> 44100 * 2 * 2 = 176400
const byteRate = view.getUint32(28, true);
assert.strictEqual(byteRate, 176400, 'ByteRate는 176400이어야 함');

// 10. 블록 얼라인 (32~33) -> 2 * 2 = 4
const blockAlign = view.getUint16(32, true);
assert.strictEqual(blockAlign, 4, 'BlockAlign은 4이어야 함');

// 11. 비트 심도 (34~35) -> 16
const bitsPerSample = view.getUint16(34, true);
assert.strictEqual(bitsPerSample, 16, 'BitsPerSample은 16이어야 함');

// 12. data 식별자 (36~39)
const data = String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39));
assert.strictEqual(data, 'data', '36~39바이트는 data여야 함');

// 13. 데이터 크기 (40~43)
const dataSize = view.getUint32(40, true);
assert.strictEqual(dataSize, mockLength * mockChannels * 2, 'dataSize는 정확한 PCM 바이트 수여야 함');

console.log('✅ WAV 바이너리 헤더 표준 16-bit PCM Stereo 44.1kHz 완전 일치 검증 성공!');

// 3. 기존 111곡 카탈로그 무결성 회귀 테스트
const songs = getAllSongsWithCustomHymns();
const beginnerCount = songs.filter((s) => s.level === 'beginner').length;
const intermediateCount = songs.filter((s) => s.level === 'intermediate').length;
const advancedCount = songs.filter((s) => s.level === 'advanced').length;
const hymnCount = songs.filter((s) => s.level === 'hymn').length;

console.log(`📊 수록곡 카탈로그: 초급 ${beginnerCount}곡, 중급 ${intermediateCount}곡, 고급 ${advancedCount}곡, 찬송가 ${hymnCount}곡 (총 ${songs.length}곡)`);
assert.strictEqual(beginnerCount, 30, '초급 30곡 유지');
assert.strictEqual(intermediateCount, 30, '중급 30곡 유지');
assert.strictEqual(advancedCount, 30, '고급 30곡 유지');
assert.strictEqual(hymnCount, 21, '찬송가 21곡 유지');
assert.strictEqual(songs.length, 111, '총 111곡 보존');

// 고급곡 50음표 이상 검증
songs.filter((s) => s.level === 'advanced').forEach((s) => {
  const noteEvents = s.notes.filter((n) => n.note !== 0 && !n.isRest);
  assert.ok(noteEvents.length >= 50, `고급곡 ${s.title}은 50음표 이상이어야 함 (실제: ${noteEvents.length})`);
});

// 오디오 엔진 인스턴스 확인
assert.ok(audioEngine, 'audioEngine 인스턴스 정상 로드');
assert.strictEqual(typeof audioEngine.renderNotesToAudioBuffer, 'function', 'renderNotesToAudioBuffer 메서드 존재 확인');

console.log('🎉 [TEST] STEP 02-B 모든 단위 및 회귀 테스트 통과!');
