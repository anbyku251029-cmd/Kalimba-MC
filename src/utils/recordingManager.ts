/**
 * recordingManager.ts
 * Kalimba-MC STEP 02-B: 어린이 연주 녹음 세션 제어, 재생 및 숫자 악보 변환 매니저
 */

import { audioEngine } from './audioEngine';
import { PITCH_TO_KEY, KALIMBA_KEYS } from '../constants/kalimbaKeys';
import { RecordedNote, RecordingSession, RecordingState } from '../types/recordingTypes';

export class RecordingSessionManager {
  private state: RecordingState = 'READY';
  private notes: RecordedNote[] = [];
  private startAudioTime: number = 0;
  private pauseStartAudioTime: number = 0;
  private totalPausedDurationMs: number = 0;
  private noteCounter: number = 0;
  private lastTriggerTimes: Map<number, number> = new Map();

  // 재생 관련 상태
  private playbackTimeouts: number[] = [];
  private playbackStartTime: number = 0;
  private playbackPauseOffsetMs: number = 0;
  private isPlaybackPaused: boolean = false;

  public getState(): RecordingState {
    return this.state;
  }

  public getNotes(): RecordedNote[] {
    return [...this.notes];
  }

  public getRecordedNoteCount(): number {
    return this.notes.length;
  }

  /**
   * 새로운 녹음 세션을 시작합니다.
   */
  public startRecording(explicitAudioTime?: number): void {
    audioEngine.ensureReady();
    this.stopPlayback();

    this.state = 'RECORDING';
    this.notes = [];
    this.noteCounter = 0;
    this.totalPausedDurationMs = 0;
    this.lastTriggerTimes.clear();

    const currentAudioTime = explicitAudioTime !== undefined ? explicitAudioTime : audioEngine.getCurrentTime();
    this.startAudioTime = currentAudioTime > 0 ? currentAudioTime : performance.now() / 1000;
  }

  /**
   * 건반 입력 이벤트를 녹음합니다.
   * @param keyIndex 건반 번호 (0 ~ 16)
   * @param pitch 음이름 (예: 'C4', 'E4')
   * @param explicitAudioTime 명시적 AudioContext 타임스탬프(초, 테스트 및 정밀 동기화용)
   */
  public recordNote(keyIndex: number, pitch: string, explicitAudioTime?: number): RecordedNote | null {
    if (this.state !== 'RECORDING') return null;

    const keyDef = PITCH_TO_KEY.get(pitch) || KALIMBA_KEYS[keyIndex];
    if (!keyDef) return null;

    const currentAudioTime = explicitAudioTime !== undefined ? explicitAudioTime : audioEngine.getCurrentTime();
    const nowSec = currentAudioTime > 0 ? currentAudioTime : performance.now() / 1000;

    // 30ms 이내 동일 건반 중복 입력 방지 (터치 바운스 방어)
    const lastTime = this.lastTriggerTimes.get(keyIndex) || 0;
    if (nowSec - lastTime < 0.03) {
      return null;
    }
    this.lastTriggerTimes.set(keyIndex, nowSec);

    // 상대 경과 시간(ms) 계산
    const rawElapsedMs = (nowSec - this.startAudioTime) * 1000;
    const startTimeMs = Math.max(0, Math.round(rawElapsedMs - this.totalPausedDurationMs));

    this.noteCounter++;
    const noteId = `rec_note_${this.noteCounter}`;

    // 동시 입력 그룹화 (직전 음표와 45ms 이내 입력된 경우 같은 화음 그룹)
    let groupId: string | undefined;
    if (this.notes.length > 0) {
      const lastNote = this.notes[this.notes.length - 1];
      if (Math.abs(startTimeMs - lastNote.startTimeMs) <= 45) {
        groupId = lastNote.groupId || `group_${lastNote.id}`;
        lastNote.groupId = groupId;
      }
    }

    const recordedNote: RecordedNote = {
      id: noteId,
      pitch: keyDef.pitch,
      noteNumber: keyDef.numberNotation,
      solfege: keyDef.solfege,
      keyIndex: keyDef.index,
      startTimeMs,
      durationMs: 500, // 기본 칼림바 울림 길이
      audioTime: nowSec,
      groupId,
    };

    this.notes.push(recordedNote);
    return recordedNote;
  }

  /**
   * 녹음을 일시 정지합니다.
   */
  public pauseRecording(explicitAudioTime?: number): void {
    if (this.state !== 'RECORDING') return;
    this.state = 'PAUSED';
    const currentAudioTime = explicitAudioTime !== undefined ? explicitAudioTime : audioEngine.getCurrentTime();
    this.pauseStartAudioTime = currentAudioTime > 0 ? currentAudioTime : performance.now() / 1000;
  }

  /**
   * 일시 정지된 녹음을 재개합니다.
   */
  public resumeRecording(explicitAudioTime?: number): void {
    if (this.state !== 'PAUSED') return;
    const currentAudioTime = explicitAudioTime !== undefined ? explicitAudioTime : audioEngine.getCurrentTime();
    const nowSec = currentAudioTime > 0 ? currentAudioTime : performance.now() / 1000;
    const pausedMs = (nowSec - this.pauseStartAudioTime) * 1000;
    this.totalPausedDurationMs += Math.max(0, pausedMs);
    this.state = 'RECORDING';
  }

  /**
   * 녹음을 종료하고 세션을 확정합니다.
   */
  public stopRecording(title: string = '내 칼림바 연주'): RecordingSession {
    if (this.state === 'RECORDING' || this.state === 'PAUSED') {
      this.state = 'STOPPED';
    }

    const totalDurationMs =
      this.notes.length > 0
        ? this.notes[this.notes.length - 1].startTimeMs + (this.notes[this.notes.length - 1].durationMs || 500)
        : 0;

    const generatedNotation = this.generateNumberedNotation(this.notes);

    return {
      id: `session_${Date.now()}`,
      title,
      createdAt: Date.now(),
      totalDurationMs,
      notes: [...this.notes],
      generatedNotation,
    };
  }

  /**
   * 녹음 데이터 초기화
   */
  public clear(): void {
    this.stopPlayback();
    this.state = 'READY';
    this.notes = [];
    this.noteCounter = 0;
    this.totalPausedDurationMs = 0;
    this.lastTriggerTimes.clear();
  }

  /**
   * 녹음된 연주를 실시간으로 다시 재생합니다.
   */
  public playRecordedNotes(
    onProgress?: (currentMs: number, activeNoteId?: string) => void,
    onComplete?: () => void
  ): void {
    if (this.notes.length === 0) return;

    this.stopPlayback();
    this.state = 'PLAYING';
    audioEngine.ensureReady();

    const startPerfTime = performance.now();
    this.playbackStartTime = startPerfTime - this.playbackPauseOffsetMs;
    this.isPlaybackPaused = false;

    // 각 음표 스케줄링
    this.notes.forEach((note) => {
      const delayMs = note.startTimeMs - this.playbackPauseOffsetMs;
      if (delayMs >= 0) {
        const timeoutId = window.setTimeout(() => {
          if (this.state === 'PLAYING') {
            audioEngine.playNote(note.pitch, 1.0, 80, 1.0);
            if (onProgress) onProgress(note.startTimeMs, note.id);
          }
        }, delayMs);
        this.playbackTimeouts.push(timeoutId);
      }
    });

    // 전체 재생 완료 타이머
    const totalMs = this.notes[this.notes.length - 1].startTimeMs + 800 - this.playbackPauseOffsetMs;
    const finishTimeoutId = window.setTimeout(() => {
      if (this.state === 'PLAYING') {
        this.state = 'STOPPED';
        this.playbackPauseOffsetMs = 0;
        if (onComplete) onComplete();
      }
    }, Math.max(100, totalMs));
    this.playbackTimeouts.push(finishTimeoutId);
  }

  /**
   * 재생 일시 정지
   */
  public pausePlayback(): void {
    if (this.state !== 'PLAYING') return;
    this.clearPlaybackTimeouts();
    this.playbackPauseOffsetMs = performance.now() - this.playbackStartTime;
    this.isPlaybackPaused = true;
    this.state = 'STOPPED';
  }

  /**
   * 재생 완전 정지
   */
  public stopPlayback(): void {
    this.clearPlaybackTimeouts();
    this.playbackPauseOffsetMs = 0;
    this.isPlaybackPaused = false;
    audioEngine.stopAll();
    if (this.state === 'PLAYING') {
      this.state = 'STOPPED';
    }
  }

  private clearPlaybackTimeouts(): void {
    this.playbackTimeouts.forEach((id) => clearTimeout(id));
    this.playbackTimeouts = [];
  }

  /**
   * 기록된 연주 음표 배열을 기존 Kalimba-MC 숫자 악보(Simple Notation) 형식으로 변환합니다.
   * 시간차에 따라 4분음표, 늘임표(-), 마디선(|)을 음악적으로 정규화하여 생성합니다.
   */
  public generateNumberedNotation(notes: RecordedNote[] = this.notes): string {
    if (!notes || notes.length === 0) return '';

    const tokens: string[] = [];
    let barNoteCount = 0;

    for (let i = 0; i < notes.length; i++) {
      const current = notes[i];
      const next = notes[i + 1];

      let token = current.noteNumber;

      if (next) {
        const gapMs = next.startTimeMs - current.startTimeMs;
        // 박자가 긴 경우 (약 800ms 이상) 연장선 붙임
        if (gapMs >= 1000) {
          token += '--';
        } else if (gapMs >= 650) {
          token += '-';
        }
      }

      tokens.push(token);
      barNoteCount++;

      // 4음표마다 시각적 마디선(|) 삽입
      if (barNoteCount >= 4 && i < notes.length - 1) {
        tokens.push('|');
        barNoteCount = 0;
      }
    }

    return tokens.join(' ');
  }
}
