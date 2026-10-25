export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'hymn';

export type KalimbaHand = 'left' | 'right' | 'center';

export interface KalimbaNote {
  id: string;
  pitch: string; // e.g. 'C4', 'D4', 'E4', 'G4', 'C5'
  solfege: string; // '도', '레', '미', '파', '솔', '라', '시'
  numberNotation: string; // '1', '2', '3', '1̇', '2̈', etc.
  octaveLevel: 0 | 1 | 2; // 0: C4-B4 (standard), 1: C5-B5 (high, dot 1), 2: C6-E6 (highest, dot 2)
  duration: number; // in beats (1 = quarter note, 0.5 = eighth, 2 = half, etc.)
  isRest?: boolean;
  hand: KalimbaHand;
  tineIndex: number; // 0 to 16 matching 17-key kalimba physical layout
  lyric?: string;
  // STEP 03-A: 화음 및 양손 연주 고도화 확장 필드
  chordId?: string; // 동일 시점 화음 그룹 식별자
  isSimultaneousWithPrevious?: boolean; // 이전 음표와 동시에 시작되는 화음 구성음 여부
  chordPitches?: string[]; // 해당 화음에 포함된 전체 구성음 목록
}

export interface Song {
  id: string;
  title: string;
  subTitle?: string;
  level: DifficultyLevel;
  levelLabel: '초급' | '중급' | '고급' | '찬송가';
  description: string;
  estimatedMinutes: number;
  timeSignature: '4/4' | '3/4' | '2/4' | '6/8';
  tempoBpm: number;
  recommendedHandHint: string;
  tags: string[];
  notes: KalimbaNote[];
  hymnNumber?: number;
  isCustom?: boolean;
  rawNotation?: string;
  verificationStatus?: 'SOURCE_VERIFIED' | 'ARRANGEMENT_VERIFIED' | 'REVIEW' | 'UNVERIFIED';
  isArranged?: boolean;
  composer?: string;
  lyricist?: string;
  playableNoteCount?: number;
  repeatTimes?: number;
}

export interface UserProgress {
  completedSongIds: string[];
  songPlayCounts: Record<string, number>;
  lastLevel: DifficultyLevel;
  lastSongId: string;
  totalPracticeCount: number;
}
