/**
 * scoreValidator.ts
 * Kalimba-MC STEP 02-D: 17음 C Major 칼림바 전용 악보 유효성 및 음역 검증 엔진
 */

import { PITCH_TO_KEY } from '../constants/kalimbaKeys';
import { ExtractedNote, ScoreValidationResult, ScoreValidationIssue } from '../types/scoreOcrTypes';

// 칼림바 17키 유효 음역 목록: C4부터 E6까지
export const KALIMBA_VALID_PITCHES = new Set<string>([
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
  'C6', 'D6', 'E6',
]);

const TIME_SIG_BEATS: Record<string, number> = {
  '4/4': 4.0,
  '3/4': 3.0,
  '2/4': 2.0,
  '6/8': 3.0, // 6/8은 점4분음표 2박(총 3 4분음표 길이)
};

/**
 * 음표 배열이 17음 C Major 칼림바 시스템에서 올바르게 연주 가능한지 정밀 검증합니다.
 */
export function validateScoreForKalimba(
  notes: ExtractedNote[],
  timeSignature: '4/4' | '3/4' | '2/4' | '6/8' = '4/4'
): ScoreValidationResult {
  const issues: ScoreValidationIssue[] = [];

  let playableNotes = 0;
  let restNotes = 0;
  let outOfRangeNotes = 0;
  let lowerPitchCount = 0; // C4보다 낮은 음
  let higherPitchCount = 0; // E6보다 높은 음

  if (!notes || notes.length === 0) {
    return {
      status: 'ERROR',
      isValidForKalimba: false,
      totalNotes: 0,
      playableNotes: 0,
      restNotes: 0,
      outOfRangeNotes: 0,
      issues: [
        {
          severity: 'ERROR',
          message: '음표 데이터가 없습니다. 최소 1개 이상의 음표를 추가해 주세요.',
        },
      ],
    };
  }

  // 1. 개별 음표 음역 및 유효성 검사
  notes.forEach((n, idx) => {
    if (n.isRest || n.pitch === 'REST' || n.pitch === '0') {
      restNotes++;
      if (n.duration <= 0) {
        issues.push({
          severity: 'ERROR',
          noteId: n.id,
          noteOrder: n.order || idx + 1,
          message: `${idx + 1}번째 쉼표의 박자가 0 이하(${n.duration})입니다.`,
          suggestion: '박자를 1(4분음표) 등으로 수정해 주세요.',
        });
      }
      return;
    }

    playableNotes++;

    // 음길이 검사
    if (n.duration <= 0) {
      issues.push({
        severity: 'ERROR',
        noteId: n.id,
        noteOrder: n.order || idx + 1,
        message: `${idx + 1}번째 음표(${n.pitch})의 박자가 0 이하입니다.`,
        suggestion: '박자를 1 또는 0.5 등으로 변경해 주세요.',
      });
    }

    // 17음 칼림바 음역 검사
    if (!KALIMBA_VALID_PITCHES.has(n.pitch)) {
      outOfRangeNotes++;

      // 음높이 범위 파악 (예: A3, G3 등)
      const pitchMatch = n.pitch.match(/^([A-G])([0-9])$/);
      if (pitchMatch) {
        const octave = parseInt(pitchMatch[2], 10);
        if (octave < 4) lowerPitchCount++;
        if (octave > 6 || (octave === 6 && ['F', 'G', 'A', 'B'].includes(pitchMatch[1]))) {
          higherPitchCount++;
        }
      }

      issues.push({
        severity: 'ERROR',
        noteId: n.id,
        noteOrder: n.order || idx + 1,
        message: `${idx + 1}번째 음표 '${n.pitch}'은 17음 칼림바(C4~E6) 지원 음역 밖입니다.`,
        suggestion: '옥타브를 조정하거나 지원하는 음표(도~높은미)로 수정해 주세요.',
        canAutoFix: true,
      });
    }

    // 계이름과 음높이 불일치 검사
    const keyDef = PITCH_TO_KEY.get(n.pitch);
    if (keyDef && keyDef.solfege !== n.solfege && n.solfege !== '') {
      issues.push({
        severity: 'WARNING',
        noteId: n.id,
        noteOrder: n.order || idx + 1,
        message: `${idx + 1}번째 음표의 계이름('${n.solfege}')과 음높이('${n.pitch}')가 다릅니다.`,
        suggestion: `계이름을 '${keyDef.solfege}'(으)로 맞추는 것을 권장합니다.`,
      });
    }
  });

  // 2. 마디별 박자 합계 검증 (마디별 grouping)
  const expectedBeatsPerMeasure = TIME_SIG_BEATS[timeSignature] || 4.0;
  const measureDurations: Record<number, number> = {};

  notes.forEach((n) => {
    const m = n.measureIndex || 1;
    measureDurations[m] = (measureDurations[m] || 0) + (n.duration || 1);
  });

  Object.entries(measureDurations).forEach(([measureStr, totalBeats]) => {
    const measureNum = parseInt(measureStr, 10);
    // 첫 마디(못갖춘마디)나 마지막 마디는 허용 범위가 넓으므로 경고 수준으로 처리
    const diff = Math.abs(totalBeats - expectedBeatsPerMeasure);
    if (diff > 0.05) {
      issues.push({
        severity: 'WARNING',
        message: `${measureNum}번째 마디의 총 박자(${totalBeats.toFixed(1)}박)가 ${timeSignature} 박자(${expectedBeatsPerMeasure}박)와 다릅니다.`,
        suggestion: '못갖춘마디이거나 쉼표/음길이가 누락되지 않았는지 확인해 보세요.',
      });
    }
  });

  // 3. 옥타브 이동 자동 제안 (전체적으로 음이 낮거나 높은 경우)
  let suggestedOctaveShift: number | undefined;
  if (outOfRangeNotes > 0) {
    if (lowerPitchCount > 0 && higherPitchCount === 0) {
      suggestedOctaveShift = +1; // 1옥타브 올려서 연주 제안
    } else if (higherPitchCount > 0 && lowerPitchCount === 0) {
      suggestedOctaveShift = -1; // 1옥타브 내려서 연주 제안
    }
  }

  // 4. 종합 판정
  let status: 'PASS' | 'WARNING' | 'ERROR' | 'UNSUPPORTED' = 'PASS';
  if (issues.some((i) => i.severity === 'ERROR')) {
    status = 'ERROR';
  } else if (issues.some((i) => i.severity === 'WARNING')) {
    status = 'WARNING';
  }

  return {
    status,
    isValidForKalimba: status !== 'ERROR',
    totalNotes: notes.length,
    playableNotes,
    restNotes,
    outOfRangeNotes,
    issues,
    suggestedOctaveShift,
  };
}

/**
 * 옥타브를 일괄 이동합니다 (+1 또는 -1).
 */
export function shiftNotesOctave(notes: ExtractedNote[], shift: number): ExtractedNote[] {
  return notes.map((note) => {
    if (note.isRest || note.pitch === 'REST') return { ...note };

    const match = note.pitch.match(/^([A-G])([0-9])$/);
    if (!match) return { ...note };

    const letter = match[1];
    const currentOctave = parseInt(match[2], 10);
    const newOctave = currentOctave + shift;
    const newPitch = `${letter}${newOctave}`;

    const keyDef = PITCH_TO_KEY.get(newPitch);
    if (keyDef) {
      return {
        ...note,
        pitch: keyDef.pitch,
        solfege: keyDef.solfege,
        octaveLevel: keyDef.octaveLevel,
        numberNotation: keyDef.numberNotation,
        userModified: true,
      };
    }

    return {
      ...note,
      pitch: newPitch,
      userModified: true,
    };
  });
}
