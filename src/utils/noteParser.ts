import { KalimbaNote } from '../types/music';
import { PITCH_TO_KEY } from '../constants/kalimbaKeys';

let globalNoteCounter = 0;

export function createKalimbaNote(pitch: string, duration: number = 1, lyric?: string): KalimbaNote {
  globalNoteCounter++;
  const id = `note-${globalNoteCounter}`;

  if (pitch === 'REST' || pitch === '0') {
    return {
      id,
      pitch: 'REST',
      solfege: '쉼',
      numberNotation: '0',
      octaveLevel: 0,
      duration,
      isRest: true,
      hand: 'center',
      tineIndex: 8,
      lyric,
    };
  }

  const keyDef = PITCH_TO_KEY.get(pitch);
  if (!keyDef) {
    return {
      id,
      pitch: 'C4',
      solfege: '도',
      numberNotation: '1',
      octaveLevel: 0,
      duration,
      hand: 'center',
      tineIndex: 8,
      lyric,
    };
  }

  return {
    id,
    pitch: keyDef.pitch,
    solfege: keyDef.solfege,
    numberNotation: keyDef.numberNotation,
    octaveLevel: keyDef.octaveLevel,
    duration,
    hand: keyDef.hand,
    tineIndex: keyDef.index,
    lyric,
  };
}

const NUM_TO_BASE_PITCH: Record<string, string> = {
  '1': 'C',
  '2': 'D',
  '3': 'E',
  '4': 'F',
  '5': 'G',
  '6': 'A',
  '7': 'B',
};

const SOLFEGE_TO_BASE_PITCH: Record<string, string> = {
  '도': 'C',
  '레': 'D',
  '미': 'E',
  '파': 'F',
  '솔': 'G',
  '라': 'A',
  '시': 'B',
};

/**
 * 칼림바 숫자 악보 / 계이름 / 영문 음이름 문자열을 KalimbaNote 배열로 변환합니다.
 * 예시:
 * "5 1'(2) 3' 1'(2) | 3'(2) 2'(2) 1'(2) 6 5(3)"
 * "1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 -"
 * "C4 D4 E4 F4 G4"
 */
export function parseSimpleNotation(rawText: string): KalimbaNote[] {
  const cleaned = rawText
    .replace(/\|/g, ' ')
    .replace(/,/g, ' ')
    .trim();

  if (!cleaned) return [];

  const tokens = cleaned.split(/\s+/);
  const result: KalimbaNote[] = [];

  for (const rawToken of tokens) {
    if (!rawToken) continue;

    // 단독 '-' 늘임표인 경우 직전 음표의 박자를 +1 늘림
    if (/^-+$/.test(rawToken)) {
      if (result.length > 0) {
        result[result.length - 1].duration += rawToken.length;
      }
      continue;
    }

    let token = rawToken;
    let lyric: string | undefined;

    // 가사 분리 (예: "5/나" 또는 "1'(2)/같")
    if (token.includes('/')) {
      const parts = token.split('/');
      token = parts[0];
      lyric = parts.slice(1).join('/');
    }

    // 괄호 박자 추출: 예: 1'(2), 5(1.5), 3(0.5)
    let explicitDuration: number | null = null;
    const parenMatch = token.match(/\(([0-9.]+)\)$/);
    if (parenMatch) {
      explicitDuration = parseFloat(parenMatch[1]);
      token = token.slice(0, parenMatch.index);
    }

    // 꼬리 하이픈 박자 추출: 예: 5- (2박), 1-- (3박)
    let extraDashes = 0;
    while (token.endsWith('-')) {
      extraDashes++;
      token = token.slice(0, -1);
    }

    // 꼬리 밑줄(8분음표 = 0.5박) 추출: 예: 5_
    let halfBeatCount = 0;
    while (token.endsWith('_')) {
      halfBeatCount++;
      token = token.slice(0, -1);
    }

    let duration = explicitDuration !== null ? explicitDuration : 1 + extraDashes;
    if (explicitDuration === null && halfBeatCount > 0) {
      duration = duration * Math.pow(0.5, halfBeatCount);
    }

    // 쉼표 확인
    if (token === '0' || token.toUpperCase() === 'REST' || token === '쉼') {
      result.push(createKalimbaNote('REST', duration, lyric));
      continue;
    }

    // 이미 영문 음이름(C4, D5, E6 등)인 경우
    const pitchMatch = token.toUpperCase().match(/^([A-G])([456])$/);
    if (pitchMatch) {
      const fullPitch = `${pitchMatch[1]}${pitchMatch[2]}`;
      if (PITCH_TO_KEY.has(fullPitch)) {
        result.push(createKalimbaNote(fullPitch, duration, lyric));
        continue;
      }
    }

    // 옥타브 기호 카운트 (' 또는 . 또는 * 또는 : 또는 ̇ / ̈)
    let octaveOffset = 0;
    while (
      token.endsWith("'") ||
      token.endsWith('.') ||
      token.endsWith('*') ||
      token.endsWith(':') ||
      token.endsWith('\u0307') ||
      token.endsWith('\u0308')
    ) {
      if (token.endsWith(':') || token.endsWith('\u0308')) {
        octaveOffset += 2;
      } else {
        octaveOffset += 1;
      }
      token = token.slice(0, -1);
    }

    // 숫자 1~7 매핑
    let baseLetter = NUM_TO_BASE_PITCH[token] || SOLFEGE_TO_BASE_PITCH[token];
    if (baseLetter) {
      const octaveNum = Math.min(6, 4 + octaveOffset);
      let targetPitch = `${baseLetter}${octaveNum}`;
      if (!PITCH_TO_KEY.has(targetPitch)) {
        // C6, D6, E6 외에 6옥타브가 오면 5옥타브로 보정
        targetPitch = `${baseLetter}5`;
      }
      result.push(createKalimbaNote(targetPitch, duration, lyric));
    }
  }

  return result;
}

/**
 * KalimbaNote 배열을 사용자가 편집하기 쉬운 칼림바 숫자 악보 문자열로 변환합니다.
 */
export function notesToSimpleNotation(notes: KalimbaNote[]): string {
  const tokens: string[] = [];
  notes.forEach((note, idx) => {
    if (note.isRest || note.pitch === 'REST') {
      tokens.push(note.duration === 1 ? '0' : `0(${note.duration})`);
      return;
    }

    const octaveMark = note.octaveLevel === 2 ? "''" : note.octaveLevel === 1 ? "'" : '';
    const baseNum = note.numberNotation.replace(/[\u0307\u0308]/g, '');
    let token = `${baseNum}${octaveMark}`;

    if (note.duration === 2) {
      token += '-';
    } else if (note.duration === 3) {
      token += '--';
    } else if (note.duration === 0.5) {
      token += '_';
    } else if (note.duration !== 1) {
      token += `(${note.duration})`;
    }

    if (note.lyric && note.lyric !== '♪') {
      token += `/${note.lyric}`;
    }

    tokens.push(token);
    if ((idx + 1) % 8 === 0 && idx !== notes.length - 1) {
      tokens.push('|');
    }
  });

  return tokens.join(' ');
}
