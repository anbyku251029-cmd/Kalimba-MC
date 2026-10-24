/**
 * Kalimba-MC STEP 02-G
 * 허밍 채보 및 AI 악보 변환 핵심 DSP 엔진 (Humming Transcription Engine)
 * 
 * 100% 브라우저 클라이언트 로컬 실행:
 * 1. F0 피치 추정 (YIN 차분 함수 및 포물선 보간)
 * 2. 음표 구간 분할 (RMS 에너지 엔벨로프 및 피치 안정성 기반 Onset/Offset 검출)
 * 3. 리듬 양자화 (밀리초 -> 0.5, 1.0, 1.5, 2.0박 등 표준 박자 스냅)
 * 4. 17음 C Major 칼림바 음역 매핑 및 저음 허밍 자동 옥타브 시프트 (+12)
 * 5. 비장음계 반음(#) 자동 근사 매핑 및 사용자 검토 플래그 부여
 */

import { KALIMBA_KEYS, KalimbaKeyDef, PITCH_TO_KEY } from '../constants/kalimbaKeys';
import { KalimbaNote, Song } from '../types/music';
import {
  HummingFrameResult,
  RawNoteSegment,
  QuantizedNoteSegment,
  HummingTranscriptionResult,
  HummingTranscriptionOptions,
} from '../types/hummingTypes';

// 칼림바 17음 C Major 지원 음역 (MIDI 번호)
// C4 = 60, E6 = 88
export const KALIMBA_MIN_MIDI = 60;
export const KALIMBA_MAX_MIDI = 88;

// C Major 온음계 (Pitch Class % 12): C(0), D(2), E(4), F(5), G(7), A(9), B(11)
export const C_MAJOR_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);

// 반음(#) 발생 시 가장 자연스러운 C Major 인접 음 매핑 테이블 (Pitch Class)
// C#(1) -> C(0) 또는 D(2) [기본 C], D#(3) -> E(4), F#(6) -> G(7), G#(8) -> A(9), A#(10) -> B(11)
const ACCIDENTAL_TO_NATURAL_MAP: Record<number, number> = {
  1: 0,  // C# -> C
  3: 4,  // D# -> E
  6: 7,  // F# -> G
  8: 9,  // G# -> A
  10: 11 // A# -> B
};

// MIDI 번호에서 음이름(Pitch string) 추출
export function midiToPitchName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${noteNames[pitchClass]}${octave}`;
}

// 주파수(Hz) -> MIDI 실수 번호 변환
export function frequencyToMidi(freqHz: number): number {
  if (freqHz <= 0) return 0;
  return 69 + 12 * Math.log2(freqHz / 440);
}

// MIDI 번호 -> 주파수(Hz) 변환
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class HummingTranscriptionEngine {
  /**
   * YIN 알고리즘 기반 단일 프레임 기본 주파수(F0) 추정
   * @param buffer 오디오 샘플 버퍼 (Float32Array)
   * @param sampleRate 오디오 샘플링 레이트 (Hz)
   * @param minFreqHz 최소 탐색 주파수 (기본 100Hz)
   * @param maxFreqHz 최대 탐색 주파수 (기본 1400Hz)
   * @param threshold YIN 차분 함수 임계값 (기본 0.15)
   */
  public static detectF0Yin(
    buffer: Float32Array,
    sampleRate: number,
    minFreqHz: number = 100,
    maxFreqHz: number = 1400,
    threshold: number = 0.15
  ): { f0: number | null; confidence: number } {
    const bufferLen = buffer.length;
    const minLag = Math.floor(sampleRate / maxFreqHz);
    const maxLag = Math.min(Math.floor(sampleRate / minFreqHz), Math.floor(bufferLen / 2));

    if (minLag >= maxLag || maxLag >= bufferLen) {
      return { f0: null, confidence: 0 };
    }

    // 1. Difference function: d(tau) = sum((x_t - x_{t+tau})^2)
    // searchLen을 1024로 최적화하여 3초 오디오 기준 60ms 이내 초고속 DSP 연산 보장
    const searchLen = Math.min(1024, bufferLen - maxLag);
    const d = new Float32Array(maxLag + 1);

    for (let tau = 0; tau <= maxLag; tau++) {
      let sum = 0;
      for (let j = 0; j < searchLen; j++) {
        const delta = buffer[j] - buffer[j + tau];
        sum += delta * delta;
      }
      d[tau] = sum;
    }

    // 2. Cumulative Mean Normalized Difference Function: d'(tau)
    const dPrime = new Float32Array(maxLag + 1);
    dPrime[0] = 1;
    let runningSum = 0;

    for (let tau = 1; tau <= maxLag; tau++) {
      runningSum += d[tau];
      dPrime[tau] = runningSum === 0 ? 1 : d[tau] / (runningSum / tau);
    }

    // 3. Absolute thresholding: threshold보다 낮은 첫 번째 극솟값 탐색
    let bestTau = -1;
    for (let tau = minLag; tau <= maxLag; tau++) {
      if (dPrime[tau] < threshold) {
        while (tau + 1 <= maxLag && dPrime[tau + 1] < dPrime[tau]) {
          tau++;
        }
        bestTau = tau;
        break;
      }
    }

    // 임계값 미만 극솟값이 없으면 전체 범위 내 최소값 선택 (신뢰도 검증용)
    if (bestTau === -1) {
      let minVal = 1.0;
      for (let tau = minLag; tau <= maxLag; tau++) {
        if (dPrime[tau] < minVal) {
          minVal = dPrime[tau];
          bestTau = tau;
        }
      }
      // 신뢰도가 너무 낮으면 (dPrime > 0.45) 무성음/노이즈로 판정
      if (minVal > 0.45 || bestTau === -1) {
        return { f0: null, confidence: 0 };
      }
    }

    // 4. Parabolic interpolation: 서브샘플 정밀 피크 보정
    let refinedTau = bestTau;
    if (bestTau > 0 && bestTau < maxLag) {
      const s0 = dPrime[bestTau - 1];
      const s1 = dPrime[bestTau];
      const s2 = dPrime[bestTau + 1];
      const denom = 2 * (2 * s1 - s0 - s2);
      if (denom !== 0) {
        const delta = (s2 - s0) / denom;
        if (Math.abs(delta) < 1) {
          refinedTau = bestTau + delta;
        }
      }
    }

    const f0 = sampleRate / refinedTau;
    const confidence = Math.max(0, Math.min(1, 1 - dPrime[bestTau]));

    return { f0, confidence };
  }

  /**
   * RMS 신호 강도 계산
   */
  public static calculateRms(buffer: Float32Array): number {
    let sumSq = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSq += buffer[i] * buffer[i];
    }
    return Math.sqrt(sumSq / buffer.length);
  }

  /**
   * 전체 오디오 버퍼를 프레임 단위로 슬라이딩 분석
   */
  public static analyzeFrames(
    audioSamples: Float32Array,
    sampleRate: number,
    options: HummingTranscriptionOptions = {}
  ): HummingFrameResult[] {
    const frameSize = 2048;
    // 23.2ms 간격 (44.1kHz 기준 1024 샘플): 최소 음표 80ms를 정밀 포착하면서 2배 빠른 연산 속도 확보
    const hopSize = 1024;
    const silenceThresh = options.silenceThresholdRms ?? 0.012;
    const confThresh = options.confidenceThreshold ?? 0.55;

    const frames: HummingFrameResult[] = [];
    const totalSamples = audioSamples.length;

    for (let offset = 0; offset + frameSize <= totalSamples; offset += hopSize) {
      const frameBuffer = audioSamples.subarray(offset, offset + frameSize);
      const timeSec = offset / sampleRate;
      const rms = this.calculateRms(frameBuffer);

      if (rms < silenceThresh) {
        frames.push({
          timeSec,
          rms,
          f0Hz: null,
          midiNumber: null,
          confidence: 0,
          isVoiced: false,
        });
        continue;
      }

      const { f0, confidence } = this.detectF0Yin(frameBuffer, sampleRate, 100, 1400);

      const isVoiced = f0 !== null && confidence >= confThresh;
      const midiNumber = isVoiced && f0 !== null ? frequencyToMidi(f0) : null;

      frames.push({
        timeSec,
        rms,
        f0Hz: isVoiced ? f0 : null,
        midiNumber,
        confidence,
        isVoiced,
      });
    }

    return frames;
  }

  /**
   * 2단계: 프레임들을 의미 있는 음표 단위(RawNoteSegment)로 분할 (Onset/Offset)
   */
  public static segmentNotes(
    frames: HummingFrameResult[],
    options: HummingTranscriptionOptions = {}
  ): RawNoteSegment[] {
    const minDurationMs = options.minNoteDurationMs ?? 80;
    const segments: RawNoteSegment[] = [];

    let currentSegmentFrames: HummingFrameResult[] = [];

    const flushCurrentSegment = () => {
      if (currentSegmentFrames.length === 0) return;

      const startTime = currentSegmentFrames[0].timeSec;
      const endTime = currentSegmentFrames[currentSegmentFrames.length - 1].timeSec + 0.012;
      const durationMs = (endTime - startTime) * 1000;

      // 최소 음표 길이 필터링 (글리치 노이즈 제거)
      if (durationMs >= minDurationMs) {
        // 평균 주파수 및 대표 MIDI 계산
        let sumF0 = 0;
        let sumMidi = 0;
        let sumConf = 0;
        let sumRms = 0;
        let count = 0;

        for (const f of currentSegmentFrames) {
          if (f.f0Hz && f.midiNumber) {
            sumF0 += f.f0Hz;
            sumMidi += f.midiNumber;
            sumConf += f.confidence;
            sumRms += f.rms;
            count++;
          }
        }

        if (count > 0) {
          const avgF0 = sumF0 / count;
          const avgMidi = sumMidi / count;
          const roundedMidi = Math.round(avgMidi);
          const centsDeviation = Math.round((avgMidi - roundedMidi) * 100);

          segments.push({
            index: segments.length,
            startTimeSec: startTime,
            endTimeSec: endTime,
            durationMs,
            avgFrequencyHz: avgF0,
            representativeMidi: roundedMidi,
            avgConfidence: sumConf / count,
            avgRms: sumRms / count,
            centsDeviation,
          });
        }
      }

      currentSegmentFrames = [];
    };

    let prevRms = 0;

    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];

      if (!f.isVoiced || f.midiNumber === null) {
        // 무성음 또는 무음 구간: 현재 음표 종료
        flushCurrentSegment();
        prevRms = f.rms;
        continue;
      }

      if (currentSegmentFrames.length === 0) {
        // 새로운 음표 시작
        currentSegmentFrames.push(f);
      } else {
        // 현재 음표와의 피치 일관성 검사 (±0.85 반음 이내 유지 여부)
        const currentRefMidi = currentSegmentFrames[0].midiNumber!;
        const pitchDiff = Math.abs(f.midiNumber - currentRefMidi);

        // RMS 급상승 (Onset 어택: 직전 대비 80% 이상 큰 폭 상승 시 새로운 음표로 분할)
        const isEnergyOnset = prevRms > 0 && f.rms / prevRms > 1.8 && currentSegmentFrames.length >= 3;

        if (pitchDiff > 0.85 || isEnergyOnset) {
          // 피치가 바뀌었거나 새 어택 감지됨: 이전 음표 마감 후 새 음표 시작
          flushCurrentSegment();
          currentSegmentFrames.push(f);
        } else {
          // 동일 음표 지속
          currentSegmentFrames.push(f);
        }
      }

      prevRms = f.rms;
    }

    flushCurrentSegment();
    return segments;
  }

  /**
   * 3단계: 리듬 양자화 (밀리초 지속 시간 -> 표준 박자 수 스냅)
   */
  public static quantizeRhythm(
    segments: RawNoteSegment[],
    bpm: number = 90
  ): QuantizedNoteSegment[] {
    const msPerBeat = 60000 / bpm; // 90 BPM 기준 1박 = 약 667ms

    return segments.map((seg) => {
      const rawBeats = seg.durationMs / msPerBeat;

      // 표준 박자 양자화 그리드 (0.5, 1.0, 1.5, 2.0, 3.0, 4.0)
      let beatDuration = 1.0;
      let noteTypeName = '4분음표';

      if (rawBeats < 0.75) {
        beatDuration = 0.5;
        noteTypeName = '8분음표';
      } else if (rawBeats < 1.25) {
        beatDuration = 1.0;
        noteTypeName = '4분음표';
      } else if (rawBeats < 1.75) {
        beatDuration = 1.5;
        noteTypeName = '점4분음표';
      } else if (rawBeats < 2.5) {
        beatDuration = 2.0;
        noteTypeName = '2분음표';
      } else if (rawBeats < 3.5) {
        beatDuration = 3.0;
        noteTypeName = '점2분음표';
      } else {
        beatDuration = 4.0;
        noteTypeName = '온음표';
      }

      return {
        ...seg,
        beatDuration,
        noteTypeName,
        targetMidi: seg.representativeMidi,
        isOutOfRange: false,
        wasAccidental: false,
      };
    });
  }

  /**
   * 4단계: 17음 C Major 칼림바 매핑 & 자동 옥타브 보정
   */
  public static mapToKalimba(
    quantizedNotes: QuantizedNoteSegment[],
    options: HummingTranscriptionOptions = {}
  ): {
    notes: KalimbaNote[];
    appliedOctaveShift: number;
    warnings: string[];
  } {
    if (quantizedNotes.length === 0) {
      return { notes: [], appliedOctaveShift: 0, warnings: [] };
    }

    const warnings: string[] = [];

    // 1. 전체 음의 평균 MIDI를 기준으로 적정 옥타브 시프트 계산
    // 칼림바 17음의 권장 중심 음역: G4(67) ~ G5(79)
    let appliedOctaveShift = options.targetOctaveShift ?? 0;

    if (options.targetOctaveShift === undefined) {
      const sumMidi = quantizedNotes.reduce((acc, n) => acc + n.representativeMidi, 0);
      const avgMidi = sumMidi / quantizedNotes.length;

      if (avgMidi < 55) {
        // 남성/저음 허밍 (C3~G3 대역) -> +2 옥타브 (+24)
        appliedOctaveShift = 2;
        warnings.push('저음 허밍이 감지되어 전체 음을 2옥타브 위로 예쁘게 올렸어요.');
      } else if (avgMidi < 65) {
        // 일반 성인 허밍 (A3~F4 대역) -> +1 옥타브 (+12)
        appliedOctaveShift = 1;
        warnings.push('허밍 음높이에 맞추어 전체 음을 1옥타브 위 칼림바 음역으로 조정했어요.');
      } else if (avgMidi > 85) {
        // 초고음 허밍 -> -1 옥타브 (-12)
        appliedOctaveShift = -1;
        warnings.push('너무 높은 음을 1옥타브 내려 연주하기 편안한 음역으로 맞췄어요.');
      }
    }

    const shiftAmountMidi = appliedOctaveShift * 12;
    let accidentalCount = 0;

    const kalimbaNotes: KalimbaNote[] = [];

    quantizedNotes.forEach((qNote, idx) => {
      let shiftedMidi = qNote.representativeMidi + shiftAmountMidi;

      // 17음 칼림바 범위 내(60~88)로 클램핑
      if (shiftedMidi < KALIMBA_MIN_MIDI) {
        shiftedMidi = KALIMBA_MIN_MIDI;
        qNote.isOutOfRange = true;
      } else if (shiftedMidi > KALIMBA_MAX_MIDI) {
        shiftedMidi = KALIMBA_MAX_MIDI;
        qNote.isOutOfRange = true;
      }

      // C Major 온음계 검사 및 반음(#) 처리
      const pitchClass = shiftedMidi % 12;
      let finalMidi = shiftedMidi;

      if (!C_MAJOR_PITCH_CLASSES.has(pitchClass)) {
        qNote.wasAccidental = true;
        accidentalCount++;
        // 인접한 C Major 자연음으로 근사 매핑
        const naturalPitchClass = ACCIDENTAL_TO_NATURAL_MAP[pitchClass] ?? ((pitchClass + 1) % 12);
        finalMidi = shiftedMidi - pitchClass + naturalPitchClass;

        // 범위 재검사
        if (finalMidi < KALIMBA_MIN_MIDI) finalMidi = KALIMBA_MIN_MIDI;
        if (finalMidi > KALIMBA_MAX_MIDI) finalMidi = KALIMBA_MAX_MIDI;
      }

      const pitchName = midiToPitchName(finalMidi);
      const keyDef: KalimbaKeyDef | undefined = PITCH_TO_KEY.get(pitchName);

      if (keyDef) {
        kalimbaNotes.push({
          id: `humming-note-${idx + 1}-${Date.now()}`,
          pitch: keyDef.pitch,
          solfege: keyDef.solfege,
          numberNotation: keyDef.numberNotation,
          octaveLevel: keyDef.octaveLevel,
          duration: qNote.beatDuration,
          hand: keyDef.hand,
          tineIndex: keyDef.index,
          lyric: `라`,
        });
      }
    });

    if (accidentalCount > 0) {
      warnings.push(
        `칼림바에는 없는 반음(#)이 ${accidentalCount}개 감지되어 가장 자연스러운 기본 음으로 알맞게 다듬었어요.`
      );
    }

    return {
      notes: kalimbaNotes,
      appliedOctaveShift,
      warnings,
    };
  }

  /**
   * 전체 파이프라인 통합 실행: 오디오 샘플 버퍼 -> 칼림바 악보 (Song) 변환
   */
  public static transcribe(
    audioSamples: Float32Array,
    sampleRate: number,
    options: HummingTranscriptionOptions = {}
  ): HummingTranscriptionResult {
    const startTime = performance.now();
    const audioDurationSec = audioSamples.length / sampleRate;

    // 0. 기본 유효성 검사
    if (audioDurationSec < 0.3) {
      return {
        status: 'TOO_SHORT',
        song: null,
        notes: [],
        rawSegments: [],
        quantizedNotes: [],
        detectedBpm: options.bpm ?? 90,
        appliedOctaveShift: 0,
        warnings: ['녹음 시간이 너무 짧아요. 최소 1초 이상 흥얼거려 주세요.'],
        confidenceScore: 0,
        executionTimeMs: performance.now() - startTime,
        audioDurationSec,
        errorMessage: '녹음 시간이 0.3초 미만으로 너무 짧습니다.',
      };
    }

    // 1단계: 프레임별 F0 피치 및 RMS 추정
    const frames = this.analyzeFrames(audioSamples, sampleRate, options);

    // 2단계: 음표 구간 분할 (Segmentation)
    const rawSegments = this.segmentNotes(frames, options);

    if (rawSegments.length === 0) {
      return {
        status: 'NO_VOICE_DETECTED',
        song: null,
        notes: [],
        rawSegments: [],
        quantizedNotes: [],
        detectedBpm: options.bpm ?? 90,
        appliedOctaveShift: 0,
        warnings: ['뚜렷한 허밍 소리를 찾지 못했어요. 조금 더 마이크 가까이에서 또렷하게 불러주세요.'],
        confidenceScore: 0,
        executionTimeMs: performance.now() - startTime,
        audioDurationSec,
        errorMessage: '목소리가 감지되지 않았습니다.',
      };
    }

    // 3단계: 리듬 양자화
    const detectedBpm = options.bpm ?? 90;
    const quantizedNotes = this.quantizeRhythm(rawSegments, detectedBpm);

    // 4단계: 17음 칼림바 매핑 & 옥타브 보정
    const { notes, appliedOctaveShift, warnings } = this.mapToKalimba(quantizedNotes, options);

    // 신뢰도 점수 산출 (0~100)
    const avgConf =
      rawSegments.reduce((acc, s) => acc + s.avgConfidence, 0) / rawSegments.length;
    let confidenceScore = Math.round(avgConf * 100);

    // 반음 조정이 많았으면 신뢰도 감점
    const accidentalCount = quantizedNotes.filter((q) => q.wasAccidental).length;
    if (accidentalCount > 0) {
      confidenceScore = Math.max(30, confidenceScore - accidentalCount * 5);
    }

    // 검토 필요 상태 판정
    const isNeedsReview = confidenceScore < 70 || accidentalCount > 2;
    const status = isNeedsReview ? 'NEEDS_REVIEW' : 'SUCCESS';

    // 5단계: Song 객체 조립
    const songId = `humming-song-${Date.now()}`;
    const generatedSong: Song = {
      id: songId,
      title: '내 허밍 칼림바 곡',
      subTitle: `허밍 채보 (${notes.length}음, ${detectedBpm} BPM)`,
      level: 'beginner',
      levelLabel: '초급',
      description: `마이크로 흥얼거린 멜로디를 자동으로 변환한 칼림바 악보입니다. (신뢰도: ${confidenceScore}%)`,
      estimatedMinutes: 2,
      timeSignature: '4/4',
      tempoBpm: detectedBpm,
      recommendedHandHint: '양손 번갈아 연주하기',
      tags: ['허밍채보', '내가만든곡', '인공지능변환'],
      notes,
      isCustom: true,
      verificationStatus: isNeedsReview ? 'REVIEW' : 'ARRANGEMENT_VERIFIED',
      playableNoteCount: notes.length,
      repeatTimes: 1,
    };

    const executionTimeMs = performance.now() - startTime;

    return {
      status,
      song: generatedSong,
      notes,
      rawSegments,
      quantizedNotes,
      detectedBpm,
      appliedOctaveShift,
      warnings,
      confidenceScore,
      executionTimeMs,
      audioDurationSec,
    };
  }
}
