/**
 * rhythmJudge.ts
 * Kalimba-MC STEP 02-A: 리듬 콤보 및 타이밍 정확도 판정 매니저
 */

import { HitRating, ComboStats, JudgeConfig, DEFAULT_JUDGE_CONFIG } from '../types/comboTypes';
import { TimedNoteItem } from './musicTiming';
import { ChordGroupItem, ChordHitRating, ChordJudgeResult } from '../types/chordTypes';

export interface NoteJudgeState {
  id: string;
  hit: boolean;
  rating: HitRating;
}

export interface ChordGroupState {
  chordId: string;
  totalNotes: number;
  hitNoteIds: Set<string>;
  ratings: HitRating[];
  isCompleted: boolean;
}

export class RhythmJudgeManager {
  private config: JudgeConfig;
  private comboStats: ComboStats;
  private judgedNotes: Map<string, NoteJudgeState> = new Map();
  // STEP 03-A: 화음 그룹 상태 관리
  private chordStates: Map<string, ChordGroupState> = new Map();
  private chordStats = {
    totalChords: 0,
    perfectChords: 0,
    partialChords: 0,
    missedChords: 0,
  };

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

  public reset(totalNotes: number, chordGroups: ChordGroupItem[] = []): void {
    this.judgedNotes.clear();
    this.chordStates.clear();
    this.chordStats = {
      totalChords: chordGroups.length,
      perfectChords: 0,
      partialChords: 0,
      missedChords: 0,
    };

    chordGroups.forEach((group) => {
      this.chordStates.set(group.chordId, {
        chordId: group.chordId,
        totalNotes: group.notes.length,
        hitNoteIds: new Set(),
        ratings: [],
        isCompleted: false,
      });
    });

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
  ): { rating: HitRating; targetNoteId?: string; combo: number; chordResult?: ChordJudgeResult } {
    const msPerBeat = ((60 / tempoBpm) * (1 / speedMultiplier)) * 1000;

    // STEP 03-A: 화음 지원 후보 검색 알고리즘
    // 윈도우 내에 존재하는 미판정 음표 중, 사용자가 누른 keyIndex와 일치하는 음표를 최우선 선택
    let bestCandidate: TimedNoteItem | null = null;
    let minTimeDiffMs = Infinity;
    let foundExactKey = false;

    for (const note of candidates) {
      if (note.isRest || note.pitch === 'REST') continue;
      if (this.judgedNotes.has(note.id)) continue;

      const beatDiff = currentBeat - note.beatTime;
      const timeDiffMs = beatDiff * msPerBeat;
      const absDiff = Math.abs(timeDiffMs);

      // 판정 허용 범위 내
      if (absDiff <= this.config.greatWindowMs + 100) {
        const isMatchKey = note.keyIndex === keyIndex;

        if (isMatchKey) {
          if (!foundExactKey || absDiff < Math.abs(minTimeDiffMs)) {
            foundExactKey = true;
            minTimeDiffMs = timeDiffMs;
            bestCandidate = note;
          }
        } else if (!foundExactKey) {
          if (absDiff < Math.abs(minTimeDiffMs)) {
            minTimeDiffMs = timeDiffMs;
            bestCandidate = note;
          }
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

    // STEP 03-A: 화음 그룹 완주 추적
    let chordResult: ChordJudgeResult | undefined = undefined;
    if (bestCandidate.chordId && this.chordStates.has(bestCandidate.chordId)) {
      const chordState = this.chordStates.get(bestCandidate.chordId)!;
      if (rating !== 'MISS') {
        chordState.hitNoteIds.add(bestCandidate.id);
        chordState.ratings.push(rating);
      }

      // 화음 내 모든 음표가 타격되었는지 확인
      if (!chordState.isCompleted && chordState.hitNoteIds.size === chordState.totalNotes) {
        chordState.isCompleted = true;
        const allPerfect = chordState.ratings.every((r) => r === 'PERFECT');
        const chordRating: ChordHitRating = allPerfect ? 'CHORD_PERFECT' : 'CHORD_GREAT';

        if (allPerfect) {
          this.chordStats.perfectChords++;
        } else {
          this.chordStats.partialChords++;
        }

        chordResult = {
          chordId: chordState.chordId,
          rating: chordRating,
          hitCount: chordState.hitNoteIds.size,
          totalNotes: chordState.totalNotes,
          scoreBonus: allPerfect ? 200 : 120,
          message: allPerfect ? '🎉 완벽한 화음!' : '👏 멋진 화음!',
        };
      }
    }

    return {
      rating,
      targetNoteId: bestCandidate.id,
      combo: this.comboStats.currentCombo,
      chordResult,
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

  public getChordStats() {
    return { ...this.chordStats };
  }

  public isNoteJudged(noteId: string): boolean {
    return this.judgedNotes.has(noteId);
  }
}
