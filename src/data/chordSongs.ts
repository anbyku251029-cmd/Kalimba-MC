/**
 * Kalimba-MC STEP 03-A
 * 화음(Chord) 및 양손(Two-Hand) 학습 전용 샘플 곡 카탈로그
 * 
 * 1. 초급 2음 화음: 나비야 (화음 기초 - C4/E4, G4/E4 등 2음 동시 연주)
 * 2. 중급 2~3음 화음: 작은 별 (양손 화음 - 왼손 베이스 C4 + 오른손 멜로디 G4/E4)
 * 3. 고급 삼화음 앙상블: 에델바이스 (풍성한 3음 화음 C Major, G Major)
 */

import { Song, KalimbaNote } from '../types/music';

// 초급: 나비야 화음 버전 (2음 화음)
export const CHORD_SONG_BUTTERFLY: Song = {
  id: 'chord-beginner-butterfly',
  title: '나비야 (2음 화음 기초)',
  subTitle: '초급 2음 화음 · 양손 동시 연주',
  level: 'beginner',
  levelLabel: '초급',
  description: '도와 미, 솔과 미를 함께 튕기며 예쁜 2음 화음의 울림을 배워보아요.',
  estimatedMinutes: 2,
  timeSignature: '4/4',
  tempoBpm: 72,
  recommendedHandHint: '왼손과 오른손 엄지로 동시에 건반을 튕겨보세요!',
  tags: ['화음학습', '초급화음', '양손연주'],
  repeatTimes: 1,
  playableNoteCount: 16,
  verificationStatus: 'ARRANGEMENT_VERIFIED',
  notes: [
    // 1마디: 솔(G4, right) + 미(E4, right) 화음 (1박) -> 미(E4) (1박)
    { id: 'cbf-1a', pitch: 'G4', solfege: '솔', numberNotation: '5', octaveLevel: 0, duration: 1.0, hand: 'right', tineIndex: 10, chordId: 'cbf-ch1' },
    { id: 'cbf-1b', pitch: 'E4', solfege: '미', numberNotation: '3', octaveLevel: 0, duration: 1.0, hand: 'right', tineIndex: 9, chordId: 'cbf-ch1', isSimultaneousWithPrevious: true },
    { id: 'cbf-2', pitch: 'E4', solfege: '미', numberNotation: '3', octaveLevel: 0, duration: 1.0, hand: 'right', tineIndex: 9 },
    { id: 'cbf-3', pitch: 'E4', solfege: '미', numberNotation: '3', octaveLevel: 0, duration: 2.0, hand: 'right', tineIndex: 9 },

    // 2마디: 파(F4, left) + 레(D4, left) 화음 (1박) -> 레(D4) (1박)
    { id: 'cbf-4a', pitch: 'F4', solfege: '파', numberNotation: '4', octaveLevel: 0, duration: 1.0, hand: 'left', tineIndex: 6, chordId: 'cbf-ch2' },
    { id: 'cbf-4b', pitch: 'D4', solfege: '레', numberNotation: '2', octaveLevel: 0, duration: 1.0, hand: 'left', tineIndex: 7, chordId: 'cbf-ch2', isSimultaneousWithPrevious: true },
    { id: 'cbf-5', pitch: 'D4', solfege: '레', numberNotation: '2', octaveLevel: 0, duration: 1.0, hand: 'left', tineIndex: 7 },
    { id: 'cbf-6', pitch: 'D4', solfege: '레', numberNotation: '2', octaveLevel: 0, duration: 2.0, hand: 'left', tineIndex: 7 },

    // 3마디: 도(C4, center) + 미(E4, right) 양손 화음 (1박) -> 솔(G4)
    { id: 'cbf-7a', pitch: 'C4', solfege: '도', numberNotation: '1', octaveLevel: 0, duration: 1.0, hand: 'center', tineIndex: 8, chordId: 'cbf-ch3' },
    { id: 'cbf-7b', pitch: 'E4', solfege: '미', numberNotation: '3', octaveLevel: 0, duration: 1.0, hand: 'right', tineIndex: 9, chordId: 'cbf-ch3', isSimultaneousWithPrevious: true },
    { id: 'cbf-8', pitch: 'D4', solfege: '레', numberNotation: '2', octaveLevel: 0, duration: 1.0, hand: 'left', tineIndex: 7 },
    { id: 'cbf-9', pitch: 'E4', solfege: '미', numberNotation: '3', octaveLevel: 0, duration: 1.0, hand: 'right', tineIndex: 9 },
    { id: 'cbf-10', pitch: 'F4', solfege: '파', numberNotation: '4', octaveLevel: 0, duration: 1.0, hand: 'left', tineIndex: 6 },

    // 4마디: 솔(G4, right) + C4(도, center) 화음 (2박)
    { id: 'cbf-11a', pitch: 'C4', solfege: '도', numberNotation: '1', octaveLevel: 0, duration: 2.0, hand: 'center', tineIndex: 8, chordId: 'cbf-ch4' },
    { id: 'cbf-11b', pitch: 'G4', solfege: '솔', numberNotation: '5', octaveLevel: 0, duration: 2.0, hand: 'right', tineIndex: 10, chordId: 'cbf-ch4', isSimultaneousWithPrevious: true },
    { id: 'cbf-12', pitch: 'G4', solfege: '솔', numberNotation: '5', octaveLevel: 0, duration: 2.0, hand: 'right', tineIndex: 10 },
  ],
};

// 중급: 반짝반짝 작은 별 (양손 화음 에디션 - 왼손 베이스 + 오른손 멜로디)
export const CHORD_SONG_TWINKLE: Song = {
  id: 'chord-intermediate-twinkle',
  title: '작은 별 (양손 화음 에디션)',
  subTitle: '중급 2~3음 화음 · 왼손 베이스와 오른손 멜로디',
  level: 'intermediate',
  levelLabel: '중급',
  description: '왼손으로 낮은 도(C4)를 받치며 오른손으로 예쁜 별빛 멜로디 화음을 연주해요.',
  estimatedMinutes: 2,
  timeSignature: '4/4',
  tempoBpm: 80,
  recommendedHandHint: '왼손은 박자를 맞추고, 오른손은 멜로디를 노래하듯 튕겨요.',
  tags: ['화음학습', '중급화음', '양손가이드'],
  repeatTimes: 1,
  playableNoteCount: 18,
  verificationStatus: 'ARRANGEMENT_VERIFIED',
  notes: [
    // 1마디: 도(C4)+도(C5) 옥타브 화음 -> 도(C5)
    { id: 'ctw-1a', pitch: 'C4', solfege: '도', numberNotation: '1', octaveLevel: 0, duration: 1.0, hand: 'center', tineIndex: 8, chordId: 'ctw-ch1' },
    { id: 'ctw-1b', pitch: 'C5', solfege: '도', numberNotation: '1', octaveLevel: 1, duration: 1.0, hand: 'left', tineIndex: 4, chordId: 'ctw-ch1', isSimultaneousWithPrevious: true },
    { id: 'ctw-2', pitch: 'C5', solfege: '도', numberNotation: '1', octaveLevel: 1, duration: 1.0, hand: 'left', tineIndex: 4 },

    // 솔(G4)+솔(G5) 화음
    { id: 'ctw-3a', pitch: 'C4', solfege: '도', numberNotation: '1', octaveLevel: 0, duration: 1.0, hand: 'center', tineIndex: 8, chordId: 'ctw-ch2' },
    { id: 'ctw-3b', pitch: 'G4', solfege: '솔', numberNotation: '5', octaveLevel: 0, duration: 1.0, hand: 'right', tineIndex: 10, chordId: 'ctw-ch2', isSimultaneousWithPrevious: true },
    { id: 'ctw-4', pitch: 'G4', solfege: '솔', numberNotation: '5', octaveLevel: 0, duration: 1.0, hand: 'right', tineIndex: 10 },

    // 2마디: 라(A4)+F4(파) 화음
    { id: 'ctw-5a', pitch: 'F4', solfege: '파', numberNotation: '4', octaveLevel: 0, duration: 1.0, hand: 'left', tineIndex: 6, chordId: 'ctw-ch3' },
    { id: 'ctw-5b', pitch: 'A4', solfege: '라', numberNotation: '6', octaveLevel: 0, duration: 1.0, hand: 'left', tineIndex: 5, chordId: 'ctw-ch3', isSimultaneousWithPrevious: true },
    { id: 'ctw-6', pitch: 'A4', solfege: '라', numberNotation: '6', octaveLevel: 0, duration: 1.0, hand: 'left', tineIndex: 5 },

    // 솔(G4)+C4 화음 (2박)
    { id: 'ctw-7a', pitch: 'C4', solfege: '도', numberNotation: '1', octaveLevel: 0, duration: 2.0, hand: 'center', tineIndex: 8, chordId: 'ctw-ch4' },
    { id: 'ctw-7b', pitch: 'G4', solfege: '솔', numberNotation: '5', octaveLevel: 0, duration: 2.0, hand: 'right', tineIndex: 10, chordId: 'ctw-ch4', isSimultaneousWithPrevious: true },

    // 3마디: 파(F4)+D4(레) 화음
    { id: 'ctw-8a', pitch: 'D4', solfege: '레', numberNotation: '2', octaveLevel: 0, duration: 1.0, hand: 'left', tineIndex: 7, chordId: 'ctw-ch5' },
    { id: 'ctw-8b', pitch: 'F4', solfege: '파', numberNotation: '4', octaveLevel: 0, duration: 1.0, hand: 'left', tineIndex: 6, chordId: 'ctw-ch5', isSimultaneousWithPrevious: true },
    { id: 'ctw-9', pitch: 'F4', solfege: '파', numberNotation: '4', octaveLevel: 0, duration: 1.0, hand: 'left', tineIndex: 6 },

    // 미(E4)+C4 화음
    { id: 'ctw-10a', pitch: 'C4', solfege: '도', numberNotation: '1', octaveLevel: 0, duration: 1.0, hand: 'center', tineIndex: 8, chordId: 'ctw-ch6' },
    { id: 'ctw-10b', pitch: 'E4', solfege: '미', numberNotation: '3', octaveLevel: 0, duration: 1.0, hand: 'right', tineIndex: 9, chordId: 'ctw-ch6', isSimultaneousWithPrevious: true },
    { id: 'ctw-11', pitch: 'E4', solfege: '미', numberNotation: '3', octaveLevel: 0, duration: 1.0, hand: 'right', tineIndex: 9 },

    // 4마디: 레(D4)+G4 화음
    { id: 'ctw-12a', pitch: 'G4', solfege: '솔', numberNotation: '5', octaveLevel: 0, duration: 1.0, hand: 'right', tineIndex: 10, chordId: 'ctw-ch7' },
    { id: 'ctw-12b', pitch: 'D4', solfege: '레', numberNotation: '2', octaveLevel: 0, duration: 1.0, hand: 'left', tineIndex: 7, chordId: 'ctw-ch7', isSimultaneousWithPrevious: true },
    { id: 'ctw-13', pitch: 'D4', solfege: '레', numberNotation: '2', octaveLevel: 0, duration: 1.0, hand: 'left', tineIndex: 7 },

    // 도(C4) 마무리 화음 (2박)
    { id: 'ctw-14a', pitch: 'C4', solfege: '도', numberNotation: '1', octaveLevel: 0, duration: 2.0, hand: 'center', tineIndex: 8, chordId: 'ctw-ch8' },
    { id: 'ctw-14b', pitch: 'E4', solfege: '미', numberNotation: '3', octaveLevel: 0, duration: 2.0, hand: 'right', tineIndex: 9, chordId: 'ctw-ch8', isSimultaneousWithPrevious: true },
  ],
};

// 고급: 에델바이스 (3음 삼화음 앙상블)
export const CHORD_SONG_EDELWEISS: Song = {
  id: 'chord-advanced-edelweiss',
  title: '에델바이스 (3음 화음 앙상블)',
  subTitle: '고급 삼화음 풀 앙상블 · C 메이저 & G 메이저 울림',
  level: 'advanced',
  levelLabel: '고급',
  description: '도-미-솔 3개의 음을 양손으로 풍성하게 감싸며 연주하는 고난도 화음 명곡입니다.',
  estimatedMinutes: 3,
  timeSignature: '3/4',
  tempoBpm: 70,
  recommendedHandHint: '왼손 1건반, 오른손 2건반을 동시에 부드럽게 글리산도 하듯 튕겨요.',
  tags: ['화음학습', '고급화음', '삼화음'],
  repeatTimes: 1,
  playableNoteCount: 15,
  verificationStatus: 'ARRANGEMENT_VERIFIED',
  notes: [
    // 1마디: C Major 3음 화음 (C4 도 + E4 미 + G4 솔) (2박) -> G4 (1박)
    { id: 'ced-1a', pitch: 'C4', solfege: '도', numberNotation: '1', octaveLevel: 0, duration: 2.0, hand: 'center', tineIndex: 8, chordId: 'ced-ch1' },
    { id: 'ced-1b', pitch: 'E4', solfege: '미', numberNotation: '3', octaveLevel: 0, duration: 2.0, hand: 'right', tineIndex: 9, chordId: 'ced-ch1', isSimultaneousWithPrevious: true },
    { id: 'ced-1c', pitch: 'G4', solfege: '솔', numberNotation: '5', octaveLevel: 0, duration: 2.0, hand: 'right', tineIndex: 10, chordId: 'ced-ch1', isSimultaneousWithPrevious: true },
    { id: 'ced-2', pitch: 'G4', solfege: '솔', numberNotation: '5', octaveLevel: 0, duration: 1.0, hand: 'right', tineIndex: 10 },

    // 2마디: G Major 화음 (D4 레 + G4 솔 + B4 시) (3박)
    { id: 'ced-3a', pitch: 'D4', solfege: '레', numberNotation: '2', octaveLevel: 0, duration: 3.0, hand: 'left', tineIndex: 7, chordId: 'ced-ch2' },
    { id: 'ced-3b', pitch: 'G4', solfege: '솔', numberNotation: '5', octaveLevel: 0, duration: 3.0, hand: 'right', tineIndex: 10, chordId: 'ced-ch2', isSimultaneousWithPrevious: true },
    { id: 'ced-3c', pitch: 'B4', solfege: '시', numberNotation: '7', octaveLevel: 0, duration: 3.0, hand: 'right', tineIndex: 11, chordId: 'ced-ch2', isSimultaneousWithPrevious: true },

    // 3마디: C Major 높은 옥타브 화음 (C4 + E5 미 + C5 도) (2박) -> E5 (1박)
    { id: 'ced-4a', pitch: 'C4', solfege: '도', numberNotation: '1', octaveLevel: 0, duration: 2.0, hand: 'center', tineIndex: 8, chordId: 'ced-ch3' },
    { id: 'ced-4b', pitch: 'C5', solfege: '도', numberNotation: '1', octaveLevel: 1, duration: 2.0, hand: 'left', tineIndex: 4, chordId: 'ced-ch3', isSimultaneousWithPrevious: true },
    { id: 'ced-4c', pitch: 'E5', solfege: '미', numberNotation: '3', octaveLevel: 1, duration: 2.0, hand: 'left', tineIndex: 3, chordId: 'ced-ch3', isSimultaneousWithPrevious: true },
    { id: 'ced-5', pitch: 'E5', solfege: '미', numberNotation: '3', octaveLevel: 1, duration: 1.0, hand: 'left', tineIndex: 3 },

    // 4마디: F Major 화음 (F4 파 + A4 라 + C5 도) (3박)
    { id: 'ced-6a', pitch: 'F4', solfege: '파', numberNotation: '4', octaveLevel: 0, duration: 3.0, hand: 'left', tineIndex: 6, chordId: 'ced-ch4' },
    { id: 'ced-6b', pitch: 'A4', solfege: '라', numberNotation: '6', octaveLevel: 0, duration: 3.0, hand: 'left', tineIndex: 5, chordId: 'ced-ch4', isSimultaneousWithPrevious: true },
    { id: 'ced-6c', pitch: 'C5', solfege: '도', numberNotation: '1', octaveLevel: 1, duration: 3.0, hand: 'left', tineIndex: 4, chordId: 'ced-ch4', isSimultaneousWithPrevious: true },
  ],
};

export const CHORD_PRACTICE_SONGS: Song[] = [
  CHORD_SONG_BUTTERFLY,
  CHORD_SONG_TWINKLE,
  CHORD_SONG_EDELWEISS,
];
