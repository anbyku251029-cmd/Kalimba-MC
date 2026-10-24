/**
 * wavExporter.ts
 * Kalimba-MC STEP 02-B: 표준 16-bit PCM Stereo WAV 오디오 파일 생성 및 내보내기 엔진
 */

import { audioEngine } from './audioEngine';
import { RecordedNote, WavExportOptions } from '../types/recordingTypes';

/**
 * AudioBuffer(Float32Array)를 표준 16-bit PCM Stereo WAV ArrayBuffer로 인코딩합니다.
 */
export function encodeAudioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;

  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // 1. RIFF 헤더
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // 파일 전체 크기 - 8
  writeString(view, 8, 'WAVE');

  // 2. fmt 청크 (포맷 정보)
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);           // 청크 크기 (16바이트)
  view.setUint16(20, 1, true);            // 오디오 포맷 (1 = PCM)
  view.setUint16(22, numChannels, true);  // 채널 수 (1=모노, 2=스테레오)
  view.setUint32(24, sampleRate, true);   // 샘플레이트 (44100 Hz)
  view.setUint32(28, byteRate, true);     // 바이트 전송률
  view.setUint16(32, blockAlign, true);   // 블록 정렬 (4)
  view.setUint16(34, 16, true);           // 비트 깊이 (16 bits)

  // 3. data 청크 (PCM 오디오 샘플 데이터)
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);     // 순수 오디오 데이터 크기

  // 4. 채널별 Float32 (-1.0 ~ 1.0) -> 16-bit Signed Integer (-32768 ~ 32767) 인터리빙 변환
  const leftChannel = buffer.getChannelData(0);
  const rightChannel = numChannels > 1 ? buffer.getChannelData(1) : leftChannel;

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Left 채널
    const sampleL = Math.max(-1, Math.min(1, leftChannel[i]));
    const intSampleL = sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7FFF;
    view.setInt16(offset, intSampleL, true);
    offset += 2;

    // Right 채널
    if (numChannels > 1) {
      const sampleR = Math.max(-1, Math.min(1, rightChannel[i]));
      const intSampleR = sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7FFF;
      view.setInt16(offset, intSampleR, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * 기록된 연주 음표 배열을 고음질 칼림바 음색의 WAV Blob으로 렌더링 및 변환합니다.
 */
export async function exportRecordedNotesToWavBlob(
  notes: RecordedNote[],
  options: WavExportOptions = {}
): Promise<{ blob: Blob; durationSec: number; fileSizeKb: number }> {
  if (!notes || notes.length === 0) {
    throw new Error('녹음된 음표 데이터가 없습니다.');
  }

  const sampleRate = options.sampleRate || 44100;
  const reverbTailSec = options.reverbTailSec || 1.8;

  // 총 길이 계산 (초 단위)
  let maxEndTimeMs = 0;
  const offlineNotePayload = notes.map((n) => {
    const endMs = n.startTimeMs + (n.durationMs || 500);
    if (endMs > maxEndTimeMs) maxEndTimeMs = endMs;
    return {
      pitch: n.pitch,
      startTimeSec: n.startTimeMs / 1000,
      durationSec: (n.durationMs || 500) / 1000,
    };
  });

  const totalDurationSec = (maxEndTimeMs / 1000) + reverbTailSec;

  // 1. 오프라인 오디오 컨텍스트 렌더링
  const audioBuffer = await audioEngine.renderNotesToAudioBuffer(
    offlineNotePayload,
    totalDurationSec,
    sampleRate
  );

  // 2. 표준 WAV 인코딩
  const wavArrayBuffer = encodeAudioBufferToWav(audioBuffer);
  const blob = new Blob([wavArrayBuffer], { type: 'audio/wav' });

  return {
    blob,
    durationSec: totalDurationSec,
    fileSizeKb: Math.round(blob.size / 1024),
  };
}

/**
 * 브라우저에서 안전하게 WAV 파일을 다운로드합니다.
 */
export function downloadWavFile(blob: Blob, filename?: string): void {
  if (typeof window === 'undefined') return;

  const dateStr = new Date().toISOString().slice(0, 10);
  const safeFilename = filename
    ? `${filename.replace(/[^a-zA-Z0-9가-힣_-]/g, '_')}.wav`
    : `kalimba-recording-${dateStr}.wav`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}
