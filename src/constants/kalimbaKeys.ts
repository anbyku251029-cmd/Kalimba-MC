import { KalimbaHand } from '../types/music';

export interface KalimbaKeyDef {
  index: number;
  pitch: string;
  solfege: string;
  numberNotation: string;
  octaveLevel: 0 | 1 | 2;
  hand: KalimbaHand;
  frequency: number;
  tineHeightPercent: number; // For realistic inverted-V curve
  letter: string;
  dots: number; // 0: none, 1: one dot (•), 2: two dots (:)
  isCenter?: boolean;
  colorTag?: string;
  defaultBlockColor: 'orange' | 'green' | 'blue' | 'teal' | 'purple';
}

// 17-key Kalimba in standard C Major layout (Left to Right) matching reference image
export const KALIMBA_KEYS: KalimbaKeyDef[] = [
  { index: 0, pitch: 'D6', solfege: '레', numberNotation: '2', octaveLevel: 2, hand: 'left', frequency: 1174.66, tineHeightPercent: 52, letter: 'D', dots: 2, defaultBlockColor: 'orange' },
  { index: 1, pitch: 'B5', solfege: '시', numberNotation: '7', octaveLevel: 1, hand: 'left', frequency: 987.77, tineHeightPercent: 57, letter: 'B', dots: 1, defaultBlockColor: 'blue' },
  { index: 2, pitch: 'G5', solfege: '솔', numberNotation: '5', octaveLevel: 1, hand: 'left', frequency: 783.99, tineHeightPercent: 63, letter: 'G', dots: 1, defaultBlockColor: 'blue' },
  { index: 3, pitch: 'E5', solfege: '미', numberNotation: '3', octaveLevel: 1, hand: 'left', frequency: 659.25, tineHeightPercent: 69, letter: 'E', dots: 1, defaultBlockColor: 'green' },
  { index: 4, pitch: 'C5', solfege: '도', numberNotation: '1', octaveLevel: 1, hand: 'left', frequency: 523.25, tineHeightPercent: 75, letter: 'C', dots: 1, defaultBlockColor: 'orange' },
  { index: 5, pitch: 'A4', solfege: '라', numberNotation: '6', octaveLevel: 0, hand: 'left', frequency: 440.00, tineHeightPercent: 81, letter: 'A', dots: 0, defaultBlockColor: 'purple' },
  { index: 6, pitch: 'F4', solfege: '파', numberNotation: '4', octaveLevel: 0, hand: 'left', frequency: 349.23, tineHeightPercent: 87, letter: 'F', dots: 0, defaultBlockColor: 'teal' },
  { index: 7, pitch: 'D4', solfege: '레', numberNotation: '2', octaveLevel: 0, hand: 'left', frequency: 293.66, tineHeightPercent: 93, letter: 'D', dots: 0, defaultBlockColor: 'orange' },
  { index: 8, pitch: 'C4', solfege: '도', numberNotation: '1', octaveLevel: 0, hand: 'center', frequency: 261.63, tineHeightPercent: 100, letter: 'C', dots: 0, isCenter: true, defaultBlockColor: 'orange' },
  { index: 9, pitch: 'E4', solfege: '미', numberNotation: '3', octaveLevel: 0, hand: 'right', frequency: 329.63, tineHeightPercent: 93, letter: 'E', dots: 0, defaultBlockColor: 'green' },
  { index: 10, pitch: 'G4', solfege: '솔', numberNotation: '5', octaveLevel: 0, hand: 'right', frequency: 392.00, tineHeightPercent: 87, letter: 'G', dots: 0, defaultBlockColor: 'blue' },
  { index: 11, pitch: 'B4', solfege: '시', numberNotation: '7', octaveLevel: 0, hand: 'right', frequency: 493.88, tineHeightPercent: 81, letter: 'B', dots: 0, defaultBlockColor: 'blue' },
  { index: 12, pitch: 'D5', solfege: '레', numberNotation: '2', octaveLevel: 1, hand: 'right', frequency: 587.33, tineHeightPercent: 75, letter: 'D', dots: 1, defaultBlockColor: 'orange' },
  { index: 13, pitch: 'F5', solfege: '파', numberNotation: '4', octaveLevel: 1, hand: 'right', frequency: 698.46, tineHeightPercent: 69, letter: 'F', dots: 1, defaultBlockColor: 'teal' },
  { index: 14, pitch: 'A5', solfege: '라', numberNotation: '6', octaveLevel: 1, hand: 'right', frequency: 880.00, tineHeightPercent: 63, letter: 'A', dots: 1, defaultBlockColor: 'purple' },
  { index: 15, pitch: 'C6', solfege: '도', numberNotation: '1', octaveLevel: 2, hand: 'right', frequency: 1046.50, tineHeightPercent: 57, letter: 'C', dots: 2, defaultBlockColor: 'orange' },
  { index: 16, pitch: 'E6', solfege: '미', numberNotation: '3', octaveLevel: 2, hand: 'right', frequency: 1318.51, tineHeightPercent: 52, letter: 'E', dots: 2, defaultBlockColor: 'green' },
];

export const PITCH_TO_KEY = new Map<string, KalimbaKeyDef>(
  KALIMBA_KEYS.map((k) => [k.pitch, k])
);

export const KEY_INDEX_MAP = new Map<number, KalimbaKeyDef>(
  KALIMBA_KEYS.map((k) => [k.index, k])
);
