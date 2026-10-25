/**
 * Kalimba-MC STEP 03-A
 * 화음(Chord) 및 양손(Two-Hand) 연주 시스템 전용 타입 정의
 */

import { TimedNoteItem } from '../utils/musicTiming';

export type PracticeMode = 'melody' | 'chord' | 'twoHand';

export type ChordHitRating =
  | 'CHORD_PERFECT' // 화음 내 모든 음표를 정확한 타이밍에 입력
  | 'CHORD_GREAT'   // 화음 내 모든 음표를 양호한 타이밍에 입력
  | 'CHORD_PARTIAL' // 화음 구성음 중 일부만 입력 (예: 2음 중 1음 성공)
  | 'CHORD_MISS'    // 화음을 전혀 입력하지 못하고 지나침
  | 'NONE';

export interface ChordGroupItem {
  chordId: string;
  startBeat: number;
  durationBeats: number;
  startSeconds: number;
  endSeconds: number;
  notes: TimedNoteItem[];
  pitches: string[];
  keyIndexes: number[];
  chordName?: string; // 예: "도-미 (C 메이저 3도)", "솔-시 (G 3도)"
  isTwoHanded: boolean; // 왼손과 오른손 건반을 모두 사용하는지
  assignedHands: ('left' | 'right' | 'center')[];
}

export interface ChordJudgeResult {
  chordId: string;
  rating: ChordHitRating;
  hitCount: number;
  totalNotes: number;
  scoreBonus: number;
  message: string;
}

export interface HandAssignmentGuide {
  leftHandPitches: string[];
  rightHandPitches: string[];
  centerPitch: string;
}
