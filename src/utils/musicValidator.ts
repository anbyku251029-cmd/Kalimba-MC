import type { Song, KalimbaNote } from '../types/music';
import { PITCH_TO_KEY } from '../constants/kalimbaKeys';
import { parseSimpleNotation } from './noteParser';
import { VALIDATION_ERROR_CODES } from '../types/musicValidationTypes';
import type {
  ValidationErrorItem,
  MeasureAuditItem,
  RuleCheckSummary,
  SongValidationReport,
  CatalogValidationSummary,
} from '../types/musicValidationTypes';

/**
 * 박자표에 따른 마디당 기대 비트(4분음표=1.0) 계산
 */
export function getExpectedBeatsPerMeasure(timeSignature: string): number {
  switch (timeSignature) {
    case '4/4':
      return 4.0;
    case '3/4':
      return 3.0;
    case '2/4':
      return 2.0;
    case '6/8':
      // 6/8박자는 8분음표 6개 = 점2분음표 = 4분음표 3개 분량(3.0비트)
      return 3.0;
    default:
      return 4.0;
  }
}

/**
 * 단일 곡에 대해 순수 함수 형태로 엄격한 음악 데이터 품질 검증을 수행합니다.
 * 원본 song 객체를 절대로 변경하지 않습니다.
 */
export function validateSong(
  song: Readonly<Song>,
  allExistingSongIds?: ReadonlySet<string>
): SongValidationReport {
  const errors: ValidationErrorItem[] = [];
  const ruleSummaries: RuleCheckSummary[] = [];

  // ==========================================
  // 규칙 A: 기본 곡 메타데이터 검증
  // ==========================================
  let ruleAPassed = true;

  // 1. 곡 ID 존재 여부
  if (!song.id || typeof song.id !== 'string' || song.id.trim() === '') {
    errors.push({
      code: VALIDATION_ERROR_CODES.MUSIC_MISSING_ID,
      message: '곡 ID(id)가 누락되었거나 비어 있습니다.',
      severity: 'FAIL',
      recommendation: '고유한 문자열 ID를 부여하십시오.',
    });
    ruleAPassed = false;
  }

  // 2. 곡 ID 중복 여부
  if (allExistingSongIds && song.id && allExistingSongIds.has(song.id)) {
    // 단일 곡 검증 시 외부에서 이미 등록된 ID 셋을 전달받아 중복 검사
    // (allExistingSongIds에 song.id가 2회 이상 등록된 경우 등)
  }

  // 3. 곡 제목 존재 여부
  if (!song.title || typeof song.title !== 'string' || song.title.trim() === '') {
    errors.push({
      code: VALIDATION_ERROR_CODES.MUSIC_MISSING_TITLE,
      message: '곡 제목(title)이 누락되었거나 비어 있습니다.',
      severity: 'FAIL',
      recommendation: '곡 제목을 입력하십시오.',
    });
    ruleAPassed = false;
  }

  // 4. 난이도/카테고리 유효성
  const validLevels = ['beginner', 'intermediate', 'advanced', 'hymn'];
  if (!validLevels.includes(song.level)) {
    errors.push({
      code: VALIDATION_ERROR_CODES.MUSIC_INVALID_LEVEL,
      message: `유효하지 않은 난이도 값입니다: ${song.level}`,
      severity: 'FAIL',
      recommendation: "'beginner', 'intermediate', 'advanced', 'hymn' 중 하나를 사용하십시오.",
    });
    ruleAPassed = false;
  }

  // 5. BPM 유효성 (프로젝트 허용 범위: 40 ~ 200)
  if (
    typeof song.tempoBpm !== 'number' ||
    isNaN(song.tempoBpm) ||
    song.tempoBpm < 40 ||
    song.tempoBpm > 200
  ) {
    errors.push({
      code: VALIDATION_ERROR_CODES.MUSIC_INVALID_BPM,
      message: `BPM이 프로젝트 권장 범위(40~200)를 벗어났습니다: ${song.tempoBpm}`,
      severity: 'FAIL',
      recommendation: '템포를 40~200 범위 내의 적절한 숫자로 설정하십시오.',
    });
    ruleAPassed = false;
  }

  // 6. 박자표 유효성
  const validSignatures = ['4/4', '3/4', '2/4', '6/8'];
  if (!validSignatures.includes(song.timeSignature)) {
    errors.push({
      code: VALIDATION_ERROR_CODES.MUSIC_INVALID_TIME_SIGNATURE,
      message: `지원되지 않는 박자표입니다: ${song.timeSignature}`,
      severity: 'FAIL',
      recommendation: "'4/4', '3/4', '2/4', '6/8' 중 하나를 선택하십시오.",
    });
    ruleAPassed = false;
  }

  // 7. 음표 데이터 존재 여부
  if (!Array.isArray(song.notes) || song.notes.length === 0) {
    errors.push({
      code: VALIDATION_ERROR_CODES.MUSIC_EMPTY_NOTES,
      message: '곡에 등록된 음표 데이터가 비어 있습니다.',
      severity: 'FAIL',
      recommendation: '최소 1개 이상의 칼림바 음표를 등록하십시오.',
    });
    ruleAPassed = false;
  }

  ruleSummaries.push({
    ruleName: '규칙 A (기본 곡 메타데이터)',
    passed: ruleAPassed,
    notes: ruleAPassed ? '기본 메타데이터 완벽' : '메타데이터 오류 발견',
  });

  // ==========================================
  // 규칙 B & E: 음표 데이터 및 17음 칼림바 음역 검증
  // ==========================================
  let ruleBPassed = true;
  let ruleEPassed = true;

  let totalBeats = 0;
  let restNotes = 0;
  let playableNotes = 0;

  if (Array.isArray(song.notes)) {
    song.notes.forEach((note: KalimbaNote, idx: number) => {
      // 1. duration 검사
      if (
        typeof note.duration !== 'number' ||
        isNaN(note.duration) ||
        !isFinite(note.duration) ||
        note.duration <= 0
      ) {
        errors.push({
          code: VALIDATION_ERROR_CODES.NOTE_INVALID_DURATION,
          message: `음표 #${idx + 1}: 유효하지 않은 길이(${note.duration})입니다.`,
          severity: 'FAIL',
          noteIndex: idx,
          recommendation: '음표 길이는 0보다 큰 유한한 숫자(예: 1, 0.5, 2)여야 합니다.',
        });
        ruleBPassed = false;
      } else {
        totalBeats += note.duration;
      }

      // 2. 쉼표 구분
      const isRestNote = Boolean(note.isRest || note.pitch === 'REST' || note.pitch === '0');
      if (isRestNote) {
        restNotes++;
      } else {
        playableNotes++;

        // 3. 17키 칼림바 음역 (C4 ~ E6) 검사
        if (!PITCH_TO_KEY.has(note.pitch)) {
          errors.push({
            code: VALIDATION_ERROR_CODES.PITCH_OUT_OF_RANGE,
            message: `음표 #${idx + 1}: 17음 C Major 칼림바 미지원 음고(${note.pitch})입니다.`,
            severity: 'FAIL',
            noteIndex: idx,
            recommendation: '17키 C Major 음역(C4~E6) 내의 음으로 편곡하십시오.',
          });
          ruleEPassed = false;
        }
      }
    });
  }

  ruleSummaries.push({
    ruleName: '규칙 B (음표 및 쉼표 데이터)',
    passed: ruleBPassed,
    notes: `총 ${song.notes?.length || 0}개 항목 (연주음 ${playableNotes}, 쉼표 ${restNotes})`,
  });

  ruleSummaries.push({
    ruleName: '규칙 E (17음 C Major 칼림바 음역)',
    passed: ruleEPassed,
    notes: ruleEPassed ? '17키(C4~E6) 완전 호환' : '음역 이탈 음표 존재',
  });

  // ==========================================
  // 규칙 C: 리듬 및 연주 시간 계산
  // ==========================================
  let ruleCPassed = true;
  const calculatedSeconds =
    song.tempoBpm > 0 ? Math.round((totalBeats / song.tempoBpm) * 60 * 10) / 10 : 0;

  ruleSummaries.push({
    ruleName: '규칙 C (리듬 및 연주 시간 계산)',
    passed: ruleCPassed,
    notes: `총 ${totalBeats}박자, 예상 연주 시간 ${calculatedSeconds}초`,
  });

  // ==========================================
  // 규칙 D: 마디 및 박자표 검증
  // ==========================================
  let ruleDPassed = true;
  const measureAudits: MeasureAuditItem[] = [];
  const expectedBeats = getExpectedBeatsPerMeasure(song.timeSignature);

  if (song.rawNotation && song.rawNotation.includes('|')) {
    const rawMeasures = song.rawNotation
      .split('|')
      .map((m) => m.trim())
      .filter(Boolean);

    rawMeasures.forEach((rawMeasure, mIdx) => {
      const parsedMeasureNotes = parseSimpleNotation(rawMeasure);
      const actualBeats = parsedMeasureNotes.reduce((acc, n) => acc + (n.duration || 0), 0);
      const diff = Math.round((actualBeats - expectedBeats) * 100) / 100;
      const isExact = Math.abs(diff) < 0.001;

      // 못갖춘마디(Anacrusis / Pickup): 첫 마디 또는 마지막 마디에서 길이가 부족한 경우
      const isFirstOrLast = mIdx === 0 || mIdx === rawMeasures.length - 1;
      let isPickupOrFinal = false;

      if (!isExact && isFirstOrLast && actualBeats < expectedBeats) {
        isPickupOrFinal = true;
      }

      if (!isExact && !isPickupOrFinal) {
        ruleDPassed = false;
        errors.push({
          code: VALIDATION_ERROR_CODES.RHYTHM_MEASURE_MISMATCH,
          message: `마디 #${mIdx + 1}: 박자 불일치 (기대: ${expectedBeats}박, 실제: ${actualBeats}박, 차이: ${diff > 0 ? `+${diff}` : diff}박)`,
          severity: 'REVIEW',
          measureNumber: mIdx + 1,
          rawToken: rawMeasure,
          recommendation: '해당 마디의 음표/쉼표 길이 합계를 박자표에 맞게 점검하십시오.',
        });
      }

      measureAudits.push({
        measureNumber: mIdx + 1,
        expectedBeats,
        actualBeats,
        diff,
        rawText: rawMeasure,
        isValid: isExact || isPickupOrFinal,
        isPickupOrFinal,
      });
    });
  } else if (!song.rawNotation || !song.rawNotation.includes('|')) {
    // 마디 경계를 확인할 수 없는 경우
    ruleDPassed = false;
    errors.push({
      code: VALIDATION_ERROR_CODES.RHYTHM_UNVERIFIED_MEASURES,
      message: '악보에 마디 구분선(|)이 없어 마디별 박자 검증이 불가능합니다.',
      severity: 'REVIEW',
      recommendation: 'rawNotation에 마디 구분선(|)을 추가하여 마디 구조를 명시하십시오.',
    });
  }

  ruleSummaries.push({
    ruleName: '규칙 D (마디 및 박자표)',
    passed: ruleDPassed,
    notes: `${measureAudits.length}개 마디 검사 완료 (불일치: ${
      measureAudits.filter((m) => !m.isValid).length
    }개)`,
  });

  // ==========================================
  // 종합 판정 산출 (PASS / REVIEW / FAIL / UNVERIFIED)
  // ==========================================
  const failErrors = errors.filter((e) => e.severity === 'FAIL');
  const reviewErrors = errors.filter((e) => e.severity === 'REVIEW');

  let status: 'PASS' | 'REVIEW' | 'FAIL' | 'UNVERIFIED' = 'PASS';
  if (failErrors.length > 0) {
    status = 'FAIL';
  } else if (reviewErrors.length > 0) {
    status = 'REVIEW';
  }

  const passRules = ruleSummaries.filter((r) => r.passed).length;
  const failRules = ruleSummaries.filter((r) => !r.passed).length;

  const invalidPitches = errors
    .filter((e) => e.code === VALIDATION_ERROR_CODES.PITCH_OUT_OF_RANGE)
    .map((e) => e.message);

  const anomalies = failErrors.map((e) => e.message);
  const warnings = reviewErrors.map((e) => e.message);
  const measureMismatchCount = measureAudits.filter((m) => !m.isValid).length;

  return {
    songId: song.id || 'UNKNOWN',
    title: song.title || '무제',
    category: song.levelLabel || song.level,
    level: song.levelLabel || song.level,
    checkedAt: new Date().toISOString(),
    checkedRulesCount: ruleSummaries.length,
    passCount: passRules,
    reviewCount: status === 'REVIEW' ? 1 : 0,
    failCount: failErrors.length,
    unverifiedCount: 0,
    tempoBpm: song.tempoBpm,
    timeSignature: song.timeSignature,
    totalNotes: song.notes ? song.notes.length : 0,
    playableNotes,
    restNotes,
    totalBeats: Math.round(totalBeats * 100) / 100,
    calculatedSeconds,
    durationSeconds: calculatedSeconds,
    estimatedMinutesReported: song.estimatedMinutes,
    status,
    measureCount: measureAudits.length,
    measureMismatchCount,
    measureAudits,
    invalidPitches,
    anomalies,
    warnings,
    errors,
    ruleSummaries,
  };
}

/**
 * 곡 목록 전체를 일괄 검증하고 통계 요약 객체를 반환합니다.
 */
export function validateCatalog(songs: ReadonlyArray<Song>): CatalogValidationSummary {
  const seenIds = new Set<string>();
  const duplicateIdErrors: ValidationErrorItem[] = [];

  // ID 중복 검사
  songs.forEach((song, idx) => {
    if (song.id) {
      if (seenIds.has(song.id)) {
        duplicateIdErrors.push({
          code: VALIDATION_ERROR_CODES.MUSIC_DUPLICATE_ID,
          message: `중복된 곡 ID 발견: "${song.id}" (순번 #${idx + 1})`,
          severity: 'FAIL',
          recommendation: '각 곡에 고유한 ID를 부여하십시오.',
        });
      } else {
        seenIds.add(song.id);
      }
    }
  });

  const reports = songs.map((song) => {
    const report = validateSong(song);
    // 중복 ID가 발견된 곡이면 리포트 에러에 추가
    const isDup = duplicateIdErrors.some((d) => d.message.includes(`"${song.id}"`));
    if (isDup) {
      report.errors.push(
        duplicateIdErrors.find((d) => d.message.includes(`"${song.id}"`))!
      );
      report.failCount++;
      report.status = 'FAIL';
    }
    return report;
  });

  const byCategory = {
    beginner: songs.filter((s) => s.level === 'beginner').length,
    intermediate: songs.filter((s) => s.level === 'intermediate').length,
    advanced: songs.filter((s) => s.level === 'advanced').length,
    hymn: songs.filter((s) => s.level === 'hymn' && !s.isCustom).length,
    custom: songs.filter((s) => s.isCustom).length,
  };

  const statusCounts = {
    PASS: reports.filter((r) => r.status === 'PASS').length,
    REVIEW: reports.filter((r) => r.status === 'REVIEW').length,
    FAIL: reports.filter((r) => r.status === 'FAIL').length,
    UNVERIFIED: reports.filter((r) => r.status === 'UNVERIFIED').length,
  };

  const errorCodeCounts: Record<string, number> = {};
  reports.forEach((r) => {
    r.errors.forEach((e) => {
      errorCodeCounts[e.code] = (errorCodeCounts[e.code] || 0) + 1;
    });
  });

  return {
    totalSongs: songs.length,
    byCategory,
    statusCounts,
    errorCodeCounts,
    reports,
  };
}

/**
 * 하위 호환용 전체 곡 검증 함수
 */
export function validateAllSongs(songs: Song[]) {
  const summary = validateCatalog(songs);
  return {
    totalSongs: summary.totalSongs,
    passCount: summary.statusCounts.PASS,
    reviewCount: summary.statusCounts.REVIEW,
    failCount: summary.statusCounts.FAIL,
    results: summary.reports,
  };
}

export type { SongValidationResult, SongValidationReport } from '../types/musicValidationTypes';

