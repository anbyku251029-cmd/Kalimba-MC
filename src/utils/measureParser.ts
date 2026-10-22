/**
 * Kalimba-MC STEP 01-G
 * 마디(Measure/Bar) 파싱 및 메타데이터 추출 엔진
 * 
 * 1. 악보의 `rawNotation` 내 `|` 마디 구분자를 1차 근거로 판정
 * 2. 박자표(TimeSignature)와 음표 duration 합계를 검증하여 PASS / REVIEW 판정
 * 3. 원본 악보 데이터는 절대 변조하지 않고 읽기 전용으로 안전하게 메타데이터 산출
 */

import { Song, KalimbaNote } from '../types/music';
import { MeasureInfo, SongMeasureData } from '../types/measureTypes';

/**
 * 박자표에 따른 마디당 기대 비트 수 계산
 */
export function getExpectedBeatsPerMeasure(timeSignature?: string): number {
  switch (timeSignature) {
    case '2/4':
      return 2.0;
    case '3/4':
      return 3.0;
    case '6/8':
      return 3.0; // 칼림바 악보 기준 점4분음표 2개 = 3박
    case '4/4':
    default:
      return 4.0;
  }
}

/**
 * 곡 데이터로부터 신뢰할 수 있는 마디 메타데이터 배열을 추출합니다.
 */
export function extractMeasureData(song: Song): SongMeasureData {
  const expectedBeats = getExpectedBeatsPerMeasure(song.timeSignature);
  const rawNotation = song.rawNotation || '';
  const notes = song.notes;

  // 1. rawNotation에 '|' 구분자가 있는지 확인
  const hasBarDelimiters = rawNotation.includes('|');

  const measures: MeasureInfo[] = [];
  let currentAccumulatedBeat = 0.0;

  if (hasBarDelimiters) {
    // rawNotation을 '|' 기준으로 분할하여 각 마디별 음표 토큰 수 파악
    // 주의: 앞뒤 공백 및 빈 마디 정리
    const rawBars = rawNotation.split('|').map((b) => b.trim()).filter((b) => b.length > 0);

    let globalNoteIndex = 0;

    rawBars.forEach((barText, barIdx) => {
      // 해당 마디 텍스트에서 파싱되는 음표들의 비트와 인덱스 범위 매핑
      // song.notes는 순서대로 배치되어 있으므로, duration 누적하여 마디 경계 매칭
      const startNoteIdx = globalNoteIndex;
      const measureNotes: KalimbaNote[] = [];
      let measureBeats = 0.0;

      // 마디 텍스트 내에서 음표 개수 또는 duration 기준으로 notes에서 할당
      // 각 마디는 expectedBeats 근방까지 채움
      while (globalNoteIndex < notes.length) {
        const note = notes[globalNoteIndex];
        const nextTotal = measureBeats + note.duration;

        measureNotes.push(note);
        measureBeats += note.duration;
        globalNoteIndex++;

        // 마디 텍스트의 마지막 마디가 아니고, 기대 비트 이상 채워졌거나 다음 음표가 없으면 종료
        if (measureBeats >= expectedBeats - 0.001) {
          break;
        }
      }

      const endNoteIdx = Math.max(startNoteIdx, globalNoteIndex - 1);
      const startBeat = currentAccumulatedBeat;
      const endBeat = startBeat + measureBeats;
      currentAccumulatedBeat = endBeat;

      // 박자 일치 여부 검증 (오차 0.05 이내 허용)
      const isBeatMatch = Math.abs(measureBeats - expectedBeats) < 0.05;
      // 첫 마디이면서 짧은 경우 못갖춘마디(픽업 마디)일 수 있음
      const isPickup = barIdx === 0 && measureBeats < expectedBeats;
      const status: 'PASS' | 'REVIEW' = (isBeatMatch || isPickup) ? 'PASS' : 'REVIEW';

      measures.push({
        measureNumber: barIdx + 1,
        measureIndex: barIdx,
        startNoteIndex: startNoteIdx,
        endNoteIndex: endNoteIdx,
        startBeat,
        endBeat,
        totalBeats: Math.round(measureBeats * 100) / 100,
        expectedBeats,
        notes: measureNotes,
        status,
        source: 'BAR_DELIMITER',
      });
    });

    // 만약 notes 배열에 아직 남은 음표가 있다면 마지막 마디에 포함
    if (globalNoteIndex < notes.length && measures.length > 0) {
      const lastMeasure = measures[measures.length - 1];
      while (globalNoteIndex < notes.length) {
        const extraNote = notes[globalNoteIndex];
        lastMeasure.notes.push(extraNote);
        lastMeasure.totalBeats += extraNote.duration;
        lastMeasure.endBeat += extraNote.duration;
        lastMeasure.endNoteIndex = globalNoteIndex;
        globalNoteIndex++;
      }
    }
  } else {
    // '|' 구분자가 없는 경우: 박자표 기대 비트 기준으로 균등 분할
    let globalNoteIdx = 0;
    let measureCounter = 0;

    while (globalNoteIdx < notes.length) {
      const startNoteIdx = globalNoteIdx;
      const measureNotes: KalimbaNote[] = [];
      let measureBeats = 0.0;

      while (globalNoteIdx < notes.length) {
        const note = notes[globalNoteIdx];
        measureNotes.push(note);
        measureBeats += note.duration;
        globalNoteIdx++;

        if (measureBeats >= expectedBeats - 0.001) {
          break;
        }
      }

      const endNoteIdx = Math.max(startNoteIdx, globalNoteIdx - 1);
      const startBeat = currentAccumulatedBeat;
      const endBeat = startBeat + measureBeats;
      currentAccumulatedBeat = endBeat;

      const isMatch = Math.abs(measureBeats - expectedBeats) < 0.05;
      const status: 'PASS' | 'REVIEW' = isMatch ? 'PASS' : 'REVIEW';

      measures.push({
        measureNumber: measureCounter + 1,
        measureIndex: measureCounter,
        startNoteIndex: startNoteIdx,
        endNoteIndex: endNoteIdx,
        startBeat,
        endBeat,
        totalBeats: Math.round(measureBeats * 100) / 100,
        expectedBeats,
        notes: measureNotes,
        status,
        source: 'TIME_SIGNATURE_CALCULATED',
      });
      measureCounter++;
    }
  }

  // 전체 통계 집계
  const passCount = measures.filter((m) => m.status === 'PASS').length;
  const reviewCount = measures.filter((m) => m.status === 'REVIEW').length;

  return {
    songId: song.id,
    totalMeasures: measures.length,
    measures,
    timeSignature: song.timeSignature || '4/4',
    tempoBpm: song.tempoBpm,
    isAllPass: reviewCount === 0 && measures.length > 0,
    validationSummary: {
      passCount,
      reviewCount,
    },
  };
}

/**
 * 선택된 마디 범위 [startMeasure, endMeasure]에 해당하는 음표 및 비트 정보 추출
 */
export function getNotesInMeasureRange(
  measureData: SongMeasureData,
  startMeasureNum: number,
  endMeasureNum: number
): {
  notes: KalimbaNote[];
  startBeat: number;
  endBeat: number;
  totalBeats: number;
  selectedMeasures: MeasureInfo[];
  isValidRange: boolean;
  errorMessage?: string;
} {
  const { measures, totalMeasures } = measureData;

  // 유효성 검사
  if (totalMeasures === 0) {
    return {
      notes: [],
      startBeat: 0,
      endBeat: 0,
      totalBeats: 0,
      selectedMeasures: [],
      isValidRange: false,
      errorMessage: '이 곡에는 마디 정보가 존재하지 않습니다.',
    };
  }

  if (startMeasureNum < 1 || startMeasureNum > totalMeasures) {
    return {
      notes: [],
      startBeat: 0,
      endBeat: 0,
      totalBeats: 0,
      selectedMeasures: [],
      isValidRange: false,
      errorMessage: `시작 마디는 1부터 ${totalMeasures} 사이여야 합니다.`,
    };
  }

  if (endMeasureNum < startMeasureNum || endMeasureNum > totalMeasures) {
    return {
      notes: [],
      startBeat: 0,
      endBeat: 0,
      totalBeats: 0,
      selectedMeasures: [],
      isValidRange: false,
      errorMessage: `종료 마디는 시작 마디(${startMeasureNum}) 이상이고 ${totalMeasures} 이하여야 합니다.`,
    };
  }

  // 선택된 마디들 슬라이스 (1-based to 0-based)
  const selectedMeasures = measures.slice(startMeasureNum - 1, endMeasureNum);
  const notes: KalimbaNote[] = [];
  selectedMeasures.forEach((m) => {
    notes.push(...m.notes);
  });

  const startBeat = selectedMeasures[0].startBeat;
  const endBeat = selectedMeasures[selectedMeasures.length - 1].endBeat;
  const totalBeats = endBeat - startBeat;

  return {
    notes,
    startBeat,
    endBeat,
    totalBeats: Math.round(totalBeats * 100) / 100,
    selectedMeasures,
    isValidRange: true,
  };
}
