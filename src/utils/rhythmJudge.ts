/**
 * rhythmJudge.ts
 * Kalimba-MC STEP 02-A: 리듬 콤보 및 타이밍 정확도 판정 매니저
 */

import { HitRating, ComboStats, JudgeConfig, DEFAULT_JUDGE_CONFIG } from '../types/comboTypes';
import { TimedNoteItem } from './musicTiming';

export interface NoteJudgeState {
  id: string;
  hit: boolean;
  rating: HitRating;
}

export class RhythmJudgeManager {
  private config: JudgeConfig;
  private comboStats: ComboStats;
  private judgedNotes: Map<string, NoteJudgeState> = new Map();

  constructor(totalNotes: number, config: JudgeConfig = DEFAULT_JUDGE_CONFIG) {
    this.config = config;
    this.comboStats = {
      currentCombo: 0,
      maxCombo: 0,
      perfectCount: 0,
      greatCount: 0,
      missCount: 0,
      totalNotes,
      accuracy: 100,
      lastRating: 'NONE',
    };
  }

  public reset(totalNotes: number): void {
    this.judgedNotes.clear();
    this.comboStats = {
      currentCombo: 0,
      maxCombo: 0,
      perfectCount: 0,
      greatCount: 0,
      missCount: 0,
      totalNotes,
      accuracy: 100,
      lastRating: 'NONE',
    };
  }

  /**
   * 사용자가 특정 건반(keyIndex)을 눌렀을 때 가장 적합한 목표 음표를 찾아 판정합니다.
   * 
   * @param keyIndex 누른 칼림바 건반 인덱스 (0~16)
   * @param currentBeat 현재 곡의 비트 시간
   * @param tempoBpm 곡의 템포 BPM
   * @param speedMultiplier 재생 속도 배율 (1.0 = 100%)
   * @param candidates 타격선 부근의 목표 음표 배열
   */
  public registerUserInput(
    keyIndex: number,
    currentBeat: number,
    tempoBpm: number,
    speedMultiplier: number,
    candidates: TimedNoteItem[]
  ): { rating: HitRating; targetNoteId?: string; combo: number } {
    const msPerBeat = ((60 / tempoBpm) * (1 / speedMultiplier)) * 1000;

    // 아직 판정되지 않은 유효 음표 후보 중 시간차가 가장 작은 음표 검색
    let bestCandidate: TimedNoteItem | null = null;
    let minTimeDiffMs = Infinity;

    for (const note of candidates) {
      if (note.isRest || note.pitch === 'REST') continue;
      if (this.judgedNotes.has(note.id)) continue;

      const beatDiff = currentBeat - note.beatTime;
      const timeDiffMs = beatDiff * msPerBeat;

      // 판정 허용 범위 (앞뒤 ±300ms 내)
      if (Math.abs(timeDiffMs) <= this.config.greatWindowMs + 100) {
        if (Math.abs(timeDiffMs) < Math.abs(minTimeDiffMs)) {
          minTimeDiffMs = timeDiffMs;
          bestCandidate = note;
        }
      }
    }

    if (!bestCandidate) {
      // 주변에 목표 음표가 없는데 잘못 누름 (자유 연주로 처리하되 콤보는 유지하거나 별도 페널티 없음)
      return { rating: 'NONE', combo: this.comboStats.currentCombo };
    }

    const absDiffMs = Math.abs(minTimeDiffMs);
    const isCorrectKey = bestCandidate.keyIndex === keyIndex;

    let rating: HitRating = 'MISS';

    if (isCorrectKey) {
      if (absDiffMs <= this.config.perfectWindowMs) {
        rating = 'PERFECT';
      } else if (absDiffMs <= this.config.greatWindowMs) {
        rating = 'GREAT';
      } else {
        rating = 'MISS';
      }
    } else {
      // 다른 건반을 누름
      rating = 'MISS';
    }

    // 결과 기록 및 중복 방지
    this.judgedNotes.set(bestCandidate.id, {
      id: bestCandidate.id,
      hit: rating !== 'MISS',
      rating,
    });

    this.applyRating(rating);

    return {
      rating,
      targetNoteId: bestCandidate.id,
      combo: this.comboStats.currentCombo,
    };
  }

  /**
   * 타격선을 완전히 지나쳐버린 음표(Pass Miss)를 감지하여 MISS 처리합니다.
   * 쉼표(REST)는 자동으로 제외됩니다.
   */
  public checkPassedNotes(
    currentBeat: number,
    tempoBpm: number,
    speedMultiplier: number,
    fallingNotes: TimedNoteItem[]
  ): string[] {
    const msPerBeat = ((60 / tempoBpm) * (1 / speedMultiplier)) * 1000;
    const missedIds: string[] = [];

    for (const note of fallingNotes) {
      if (note.isRest || note.pitch === 'REST') continue;
      if (this.judgedNotes.has(note.id)) continue;

      const beatDiff = currentBeat - note.beatTime;
      const timeDiffMs = beatDiff * msPerBeat;

      // 타격선 기준 임계치(기본 +250ms) 이상 지난 경우 놓침(MISS) 처리
      if (timeDiffMs > this.config.missThresholdMs) {
        this.judgedNotes.set(note.id, {
          id: note.id,
          hit: false,
          rating: 'MISS',
        });
        this.applyRating('MISS');
        missedIds.push(note.id);
      }
    }

    return missedIds;
  }

  private applyRating(rating: HitRating): void {
    this.comboStats.lastRating = rating;

    if (rating === 'PERFECT') {
      this.comboStats.perfectCount++;
      this.comboStats.currentCombo++;
    } else if (rating === 'GREAT') {
      this.comboStats.greatCount++;
      this.comboStats.currentCombo++;
    } else if (rating === 'MISS') {
      this.comboStats.missCount++;
      this.comboStats.currentCombo = 0; // 콤보 초기화
    }

    if (this.comboStats.currentCombo > this.comboStats.maxCombo) {
      this.comboStats.maxCombo = this.comboStats.currentCombo;
    }

    // 정확도 계산 (PERFECT: 100%, GREAT: 70%, MISS: 0%)
    const processedNotes = this.comboStats.perfectCount + this.comboStats.greatCount + this.comboStats.missCount;
    if (processedNotes > 0) {
      const score = this.comboStats.perfectCount * 1.0 + this.comboStats.greatCount * 0.7;
      this.comboStats.accuracy = Math.round((score / processedNotes) * 100);
    } else {
      this.comboStats.accuracy = 100;
    }
  }

  public getStats(): ComboStats {
    return { ...this.comboStats };
  }

  public isNoteJudged(noteId: string): boolean {
    return this.judgedNotes.has(noteId);
  }
}
