import { Song, KalimbaNote } from '../types/music';
import { PITCH_TO_KEY } from '../constants/kalimbaKeys';
import { parseSimpleNotation } from './noteParser';

export interface MeasureAudit {
  measureNumber: number;
  expectedBeats: number;
  actualBeats: number;
  diff: number;
  rawText: string;
  isValid: boolean;
  isPickupOrFinal?: boolean;
}

export interface SongValidationResult {
  songId: string;
  title: string;
  level: string;
  tempoBpm: number;
  timeSignature: string;
  totalNotes: number;
  playableNotes: number;
  restNotes: number;
  totalBeats: number;
  durationSeconds: number;
  estimatedMinutesReported: number;
  measureCount: number;
  measureAudits: MeasureAudit[];
  measureMismatchCount: number;
  invalidPitches: string[];
  anomalies: string[];
  warnings: string[];
  status: 'PASS' | 'REVIEW' | 'FAIL';
}

function getExpectedBeatsPerMeasure(timeSignature: string): number {
  switch (timeSignature) {
    case '4/4':
      return 4.0;
    case '3/4':
      return 3.0;
    case '2/4':
      return 2.0;
    case '6/8':
      // 6/8박자: 4분음표(1비트) 기준으로는 3.0비트 (8분음표 6개 = 점2분음표 길이)
      return 3.0;
    default:
      return 4.0;
  }
}

/**
 * 곡 하나를 음악적/데이터적으로 정밀 진단합니다.
 */
export function validateSong(song: Song): SongValidationResult {
  const anomalies: string[] = [];
  const warnings: string[] = [];
  const invalidPitches: string[] = [];

  // 1. 기본 메타데이터 확인
  if (!song.id) anomalies.push('곡 ID가 누락되었습니다.');
  if (!song.title) anomalies.push('곡 제목이 누락되었습니다.');
  if (song.tempoBpm < 40 || song.tempoBpm > 200) {
    warnings.push(`비정상적인 BPM (${song.tempoBpm})`);
  }

  const expectedMeasureBeats = getExpectedBeatsPerMeasure(song.timeSignature);

  // 2. 음표 데이터 유효성 및 음역 검사
  let totalBeats = 0;
  let restNotes = 0;
  let playableNotes = 0;

  song.notes.forEach((note, idx) => {
    if (note.duration <= 0 || isNaN(note.duration)) {
      anomalies.push(`음표 #${idx + 1}: 유효하지 않은 duration (${note.duration})`);
    } else {
      totalBeats += note.duration;
    }

    if (note.isRest || note.pitch === 'REST') {
      restNotes++;
    } else {
      playableNotes++;
      if (!PITCH_TO_KEY.has(note.pitch)) {
        invalidPitches.push(note.pitch);
        anomalies.push(`음표 #${idx + 1}: 17키 C Major 미지원 음 (${note.pitch})`);
      }
    }
  });

  // 3. 마디별 박자 일치 검사 (rawNotation이 존재하는 경우)
  const measureAudits: MeasureAudit[] = [];
  let measureMismatchCount = 0;

  if (song.rawNotation && song.rawNotation.includes('|')) {
    const rawMeasures = song.rawNotation.split('|').map((m) => m.trim()).filter(Boolean);

    rawMeasures.forEach((rawMeasure, mIdx) => {
      const measureNotes = parseSimpleNotation(rawMeasure);
      const actualBeats = measureNotes.reduce((acc, n) => acc + (n.duration || 0), 0);
      const diff = Math.round((actualBeats - expectedMeasureBeats) * 100) / 100;
      const isExact = Math.abs(diff) < 0.001;

      // 첫 마디나 마지막 마디는 못갖춘마디(Anacrusis / Pickup)일 가능성 검토
      const isFirstOrLast = mIdx === 0 || mIdx === rawMeasures.length - 1;
      let isPickupOrFinal = false;

      if (!isExact && isFirstOrLast) {
        if (actualBeats < expectedMeasureBeats) {
          isPickupOrFinal = true;
        }
      }

      if (!isExact && !isPickupOrFinal) {
        measureMismatchCount++;
      }

      measureAudits.push({
        measureNumber: mIdx + 1,
        expectedBeats: expectedMeasureBeats,
        actualBeats,
        diff,
        rawText: rawMeasure,
        isValid: isExact || isPickupOrFinal,
        isPickupOrFinal,
      });
    });
  }

  // 4. 연주 시간 계산
  const durationSeconds = Math.round((totalBeats / song.tempoBpm) * 60 * 10) / 10;
  const estimatedSeconds = song.estimatedMinutes * 60;
  if (Math.abs(durationSeconds - estimatedSeconds) > 120 && durationSeconds < 60) {
    warnings.push(`표시된 예상 시간(${song.estimatedMinutes}분)에 비해 실제 연주 시간(${durationSeconds}초)이 짧습니다.`);
  }

  // 5. 종합 판정 (PASS / REVIEW / FAIL)
  let status: 'PASS' | 'REVIEW' | 'FAIL' = 'PASS';
  if (anomalies.length > 0 || invalidPitches.length > 0) {
    status = 'FAIL';
  } else if (measureMismatchCount > 0 || warnings.length > 0) {
    status = 'REVIEW';
  }

  return {
    songId: song.id,
    title: song.title,
    level: song.levelLabel,
    tempoBpm: song.tempoBpm,
    timeSignature: song.timeSignature,
    totalNotes: song.notes.length,
    playableNotes,
    restNotes,
    totalBeats: Math.round(totalBeats * 100) / 100,
    durationSeconds,
    estimatedMinutesReported: song.estimatedMinutes,
    measureCount: measureAudits.length,
    measureAudits,
    measureMismatchCount,
    invalidPitches: Array.from(new Set(invalidPitches)),
    anomalies,
    warnings,
    status,
  };
}

/**
 * 전체 곡 목록을 일괄 검증하고 요약 통계를 반환합니다.
 */
export function validateAllSongs(songs: Song[]) {
  const results = songs.map(validateSong);
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const reviewCount = results.filter((r) => r.status === 'REVIEW').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  return {
    totalSongs: songs.length,
    passCount,
    reviewCount,
    failCount,
    results,
  };
}
