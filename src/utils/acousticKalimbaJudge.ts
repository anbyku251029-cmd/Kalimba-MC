/**
 * Kalimba-MC STEP 03-B
 * 실물 칼림바 마이크 인식 및 실시간 음정 판정 엔진
 * 
 * - 실물 칼림바(17음 C Major) 마이크 입력으로부터 목표 음표와 비교
 * - 센트(cents) 오차 기반 판정:
 *     PERFECT: |cents| <= 35
 *     GREAT:   35 < |cents| <= 70
 *     RETRY:   |cents| > 70 또는 다른 음 타격
 * - 잔향(Sustain)으로 인한 중복 다중 판정 방지 쿨다운(약 320ms) 적용
 * - 100% 브라우저 메모리 온디바이스 처리 (외부 전송 없음)
 */

import { KALIMBA_KEYS, KalimbaKeyDef, PITCH_TO_KEY, KEY_INDEX_MAP } from '../constants/kalimbaKeys';
import { PitchAnalysisResult } from '../types/microphoneAnalysisTypes';
import {
  AcousticJudgeRating,
  AcousticEvaluation,
  AcousticJudgeOptions,
} from '../types/acousticTypes';
import { PitchDetectionService } from './pitchDetectionService';

export const DEFAULT_ACOUSTIC_OPTIONS: Required<AcousticJudgeOptions> = {
  perfectCentsTolerance: 35,
  greatCentsTolerance: 70,
  cooldownMs: 320,
  minConfidence: 0.65,
  silenceRms: 0.015,
};

/**
 * 두 주파수 간의 센트(cents) 편차 계산
 * 공식: 1200 * log2(detected / target)
 */
export function calculateCents(detectedFreq: number, targetFreq: number): number {
  if (detectedFreq <= 0 || targetFreq <= 0) return 0;
  return 1200 * Math.log2(detectedFreq / targetFreq);
}

/**
 * 특정 주파수와 가장 가까운 17음 칼림바 건반 탐색
 */
export function findClosestKalimbaKey(frequency: number): { key: KalimbaKeyDef; cents: number } | null {
  if (frequency <= 0) return null;

  let closestKey: KalimbaKeyDef | null = null;
  let minAbsCents = Infinity;
  let bestCents = 0;

  for (const key of KALIMBA_KEYS) {
    const cents = calculateCents(frequency, key.frequency);
    const absCents = Math.abs(cents);
    if (absCents < minAbsCents) {
      minAbsCents = absCents;
      closestKey = key;
      bestCents = cents;
    }
  }

  if (!closestKey) return null;
  return { key: closestKey, cents: Math.round(bestCents * 10) / 10 };
}

/**
 * 단일 피치 분석 결과를 바탕으로 목표 음표에 대한 실시간 연주 판정 수행 (순수 함수)
 */
export function evaluateAcousticPitch(
  analysis: PitchAnalysisResult,
  target: { pitch: string; keyIndex?: number } | null,
  options: AcousticJudgeOptions = {}
): AcousticEvaluation {
  const opts = { ...DEFAULT_ACOUSTIC_OPTIONS, ...options };

  // 1. 무음 또는 신뢰도 미달 판정
  if (analysis.status === 'SILENCE' || analysis.rmsVolume < opts.silenceRms) {
    return {
      rating: 'SILENCE',
      detectedFrequency: null,
      detectedPitch: null,
      detectedKey: null,
      targetPitch: target?.pitch ?? null,
      targetKeyIndex: target?.keyIndex ?? null,
      targetFrequency: target ? PITCH_TO_KEY.get(target.pitch)?.frequency ?? null : null,
      centsDeviation: null,
      confidence: analysis.confidence,
      rmsVolume: analysis.rmsVolume,
      isMatch: false,
      feedbackMessage: '소리를 기다리는 중이에요 (칼림바를 튕겨보세요!)',
    };
  }

  if (analysis.confidence < opts.minConfidence || analysis.estimatedFrequency === null) {
    return {
      rating: 'WAITING',
      detectedFrequency: analysis.estimatedFrequency,
      detectedPitch: analysis.estimatedPitch,
      detectedKey: analysis.closestKey,
      targetPitch: target?.pitch ?? null,
      targetKeyIndex: target?.keyIndex ?? null,
      targetFrequency: target ? PITCH_TO_KEY.get(target.pitch)?.frequency ?? null : null,
      centsDeviation: analysis.centsDeviation,
      confidence: analysis.confidence,
      rmsVolume: analysis.rmsVolume,
      isMatch: false,
      feedbackMessage: '소리를 감지했어요. 더 맑게 튕겨보세요!',
    };
  }

  const detectedFreq = analysis.estimatedFrequency;
  const closestMatch = findClosestKalimbaKey(detectedFreq);
  const detectedKey = closestMatch ? closestMatch.key : analysis.closestKey;
  const detectedPitch = detectedKey ? detectedKey.pitch : analysis.estimatedPitch;

  // 목표 음표가 설정되어 있지 않은 경우 (자유 연주 / 튜너 모드)
  if (!target) {
    const cents = closestMatch ? closestMatch.cents : (analysis.centsDeviation ?? 0);
    const absCents = Math.abs(cents);
    let rating: AcousticJudgeRating = 'RETRY';
    let feedback = '칼림바 소리를 조율 중이에요.';

    if (absCents <= opts.perfectCentsTolerance) {
      rating = 'PERFECT';
      feedback = `${detectedKey?.solfege || detectedPitch}음이 정확하게 조율되어 있어요! ✨`;
    } else if (absCents <= opts.greatCentsTolerance) {
      rating = 'GREAT';
      feedback = `${detectedKey?.solfege || detectedPitch}음이 좋아요! (조금 ${cents > 0 ? '높아요' : '낮아요'})`;
    }

    return {
      rating,
      detectedFrequency: detectedFreq,
      detectedPitch,
      detectedKey,
      targetPitch: null,
      targetKeyIndex: null,
      targetFrequency: null,
      centsDeviation: cents,
      confidence: analysis.confidence,
      rmsVolume: analysis.rmsVolume,
      isMatch: rating === 'PERFECT' || rating === 'GREAT',
      feedbackMessage: feedback,
    };
  }

  // 목표 음표가 설정된 경우 (워터폴 게임 모드)
  const targetKey = target.keyIndex !== undefined && target.keyIndex !== null
    ? KEY_INDEX_MAP.get(target.keyIndex)
    : PITCH_TO_KEY.get(target.pitch);

  const targetFreq = targetKey ? targetKey.frequency : 440;
  const centsAgainstTarget = calculateCents(detectedFreq, targetFreq);
  const absCents = Math.abs(centsAgainstTarget);

  // 일치 판정: 목표 건반과 동일한 음정인지 여부
  const isSameKey = Boolean(detectedKey && targetKey && detectedKey.index === targetKey.index);

  if (isSameKey && absCents <= opts.perfectCentsTolerance) {
    return {
      rating: 'PERFECT',
      detectedFrequency: detectedFreq,
      detectedPitch,
      detectedKey,
      targetPitch: target.pitch,
      targetKeyIndex: targetKey?.index ?? null,
      targetFrequency: targetFreq,
      centsDeviation: Math.round(centsAgainstTarget * 10) / 10,
      confidence: analysis.confidence,
      rmsVolume: analysis.rmsVolume,
      isMatch: true,
      feedbackMessage: `완벽해요! (${targetKey?.solfege || target.pitch} PERFECT! ⭐)`,
    };
  }

  if (isSameKey && absCents <= opts.greatCentsTolerance) {
    return {
      rating: 'GREAT',
      detectedFrequency: detectedFreq,
      detectedPitch,
      detectedKey,
      targetPitch: target.pitch,
      targetKeyIndex: targetKey?.index ?? null,
      targetFrequency: targetFreq,
      centsDeviation: Math.round(centsAgainstTarget * 10) / 10,
      confidence: analysis.confidence,
      rmsVolume: analysis.rmsVolume,
      isMatch: true,
      feedbackMessage: `좋아요! (${targetKey?.solfege || target.pitch} GREAT! 👍)`,
    };
  }

  // 다른 음을 쳤거나 오차가 큰 경우
  const wrongNoteMsg = detectedKey
    ? `${detectedKey.solfege}(${detectedKey.pitch})를 쳤어요! 목표는 ${targetKey?.solfege || target.pitch}입니다.`
    : `목표 음(${targetKey?.solfege || target.pitch})을 연주해 보세요!`;

  return {
    rating: 'RETRY',
    detectedFrequency: detectedFreq,
    detectedPitch,
    detectedKey,
    targetPitch: target.pitch,
    targetKeyIndex: targetKey?.index ?? null,
    targetFrequency: targetFreq,
    centsDeviation: Math.round(centsAgainstTarget * 10) / 10,
    confidence: analysis.confidence,
    rmsVolume: analysis.rmsVolume,
    isMatch: false,
    feedbackMessage: wrongNoteMsg,
  };
}

/**
 * 실시간 마이크 입력 스트림과 워터폴 연주 판정을 통합 관리하는 실물 칼림바 오케스트레이터
 */
export class AcousticKalimbaJudge {
  private service: PitchDetectionService;
  private options: Required<AcousticJudgeOptions>;
  private targetNote: { pitch: string; keyIndex: number } | null = null;
  private lastTriggerTime: number = -Infinity;
  private lastMatchedKeyIndex: number | null = null;

  public onEvaluationChange?: (evalResult: AcousticEvaluation) => void;
  public onValidNoteHit?: (evalResult: AcousticEvaluation) => void;

  constructor(options?: AcousticJudgeOptions) {
    this.service = new PitchDetectionService();
    this.options = { ...DEFAULT_ACOUSTIC_OPTIONS, ...options };
  }

  public setTargetNote(target: { pitch: string; keyIndex: number } | null): void {
    this.targetNote = target;
    // 목표 음표가 바뀌면 일치 건반 리셋
    if (target?.keyIndex !== this.lastMatchedKeyIndex) {
      this.lastMatchedKeyIndex = null;
    }
  }

  public getTargetNote(): { pitch: string; keyIndex: number } | null {
    return this.targetNote;
  }

  public async start(
    onError?: (errorMsg: string) => void
  ): Promise<boolean> {
    return this.service.startListening((result) => {
      this.processAnalysis(result);
    }, onError);
  }

  public stop(): void {
    this.service.stopListening();
  }

  public isListening(): boolean {
    return this.service.getState() === 'listening';
  }

  public getState() {
    return this.service.getState();
  }

  /**
   * 실시간 분석 프레임 처리
   */
  public processAnalysis(analysis: PitchAnalysisResult): void {
    const evalResult = evaluateAcousticPitch(analysis, this.targetNote, this.options);
    this.onEvaluationChange?.(evalResult);

    // 유효한 매칭(PERFECT 또는 GREAT) 발생 시 쿨다운 확인 후 이벤트 방출
    if (evalResult.isMatch && evalResult.detectedKey) {
      const now = performance.now();
      const timeSinceLastHit = now - this.lastTriggerTime;

      // 동일 건반 잔향 중복 방지
      if (timeSinceLastHit >= this.options.cooldownMs) {
        this.lastTriggerTime = now;
        this.lastMatchedKeyIndex = evalResult.detectedKey.index;
        this.onValidNoteHit?.(evalResult);
      }
    }
  }
}
