/**
 * recordingTypes.ts
 * Kalimba-MC STEP 02-B: 어린이 연주 녹음 및 WAV 내보내기 데이터 구조
 */

export interface RecordedNote {
  id: string;               // 고유 식별자 (note_1, note_2...)
  pitch: string;            // 'C4', 'E4', 'G4', ...
  noteNumber: string;       // '1', '3', '5', '1'', ...
  solfege: string;          // '도', '미', '솔', ...
  keyIndex: number;         // 0 ~ 16
  startTimeMs: number;      // 녹음 시작 시점으로부터의 상대 경과 시간 (밀리초)
  durationMs: number;       // 실제 연주/음길이 (밀리초, 기본 500ms 이상)
  audioTime: number;        // AudioContext.currentTime 기준 시각
  groupId?: string;         // 동시 입력(화음) 그룹 ID
}

export type RecordingState =
  | 'READY'       // 녹음 준비
  | 'RECORDING'   // 녹음 중
  | 'PAUSED'      // 일시 정지
  | 'STOPPED'     // 녹음 완료
  | 'PLAYING'     // 녹음 재생 중
  | 'EXPORTING'   // WAV 생성 중
  | 'ERROR';      // 오류 발생

export interface RecordingSession {
  id: string;
  title: string;
  createdAt: number;
  totalDurationMs: number;
  notes: RecordedNote[];
  generatedNotation?: string; // 생성된 숫자 악보 문자열
}

export interface WavExportOptions {
  sampleRate?: number;    // 기본 44100 Hz
  bitDepth?: 16 | 24;     // 기본 16-bit Linear PCM
  channels?: 1 | 2;       // 기본 2 (Stereo)
  reverbTailSec?: number; // 마지막 음표 후 잔향 여운 (기본 1.8초)
}
