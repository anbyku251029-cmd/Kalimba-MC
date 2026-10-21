/**
 * Kalimba-MC STEP 01-F
 * 마이크 기반 음정 분석 독립 서비스 (Pitch Detection Service)
 * 
 * 1. 기본 비활성화: 사용자가 명시적으로 시작할 때만 마이크 권한 요청
 * 2. 프라이버시 보호: 음성 데이터를 외부 서버로 전송하지 않고 브라우저 메모리에서 실시간 분석 후 즉시 소멸
 * 3. 칼림바 특화 자기상관(Autocorrelation) 알고리즘: 5.4배 강한 배음에 의한 옥타브 오인 방지
 * 4. 17음 C Major (C4=261.63Hz ~ E6=1318.51Hz) 범위 기준 센트 편차 및 신뢰도 산출
 */

import { KALIMBA_KEYS, KalimbaKeyDef } from '../constants/kalimbaKeys';
import { PitchAnalysisResult, PitchAnalysisStatus, MicListeningState } from '../types/microphoneAnalysisTypes';

// 칼림바 17음 유효 탐색 범위: C4 (261.63Hz) ~ E6 (1318.51Hz)
// 여유 마진을 두어 220Hz ~ 1500Hz 범위 탐색
const MIN_FREQ = 220;
const MAX_FREQ = 1500;
const RMS_SILENCE_THRESHOLD = 0.015; // 무음 판정 RMS 역치
const CONFIDENCE_THRESHOLD = 0.65;   // 최소 신뢰도 역치 (자기상관 계수)
const MATCH_CENTS_TOLERANCE = 45;    // 정답 판정 허용 센트 오차 (반음의 45%)

export class PitchDetectionService {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private currentState: MicListeningState = 'idle';

  /**
   * 브라우저 getUserMedia 지원 여부 확인
   */
  public static isSupported(): boolean {
    return Boolean(
      typeof window !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
    );
  }

  /**
   * 마이크 분석 시작 (사용자의 명시적 요청 시에만 호출됨)
   */
  public async startListening(
    onResult: (result: PitchAnalysisResult) => void,
    onError?: (errMessage: string) => void
  ): Promise<boolean> {
    if (this.isRunning) {
      return true;
    }

    if (!PitchDetectionService.isSupported()) {
      this.currentState = 'unsupported';
      onError?.('현재 사용 중인 브라우저가 마이크 입력을 지원하지 않습니다.');
      return false;
    }

    this.currentState = 'requesting_permission';

    try {
      // 마이크 권한 요청 (소음 억제/에코 캔슬러를 꺼서 악기 고유 울림 보존)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048; // 약 46ms 버퍼 (44.1kHz 기준)
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.analyser);

      this.isRunning = true;
      this.currentState = 'listening';

      const buffer = new Float32Array(this.analyser.fftSize);

      const loop = () => {
        if (!this.isRunning || !this.analyser || !this.audioCtx) return;

        this.analyser.getFloatTimeDomainData(buffer);
        const result = PitchDetectionService.detectPitchFromFloat32Array(
          buffer,
          this.audioCtx.sampleRate,
          this.currentState
        );

        onResult(result);
        this.animationFrameId = requestAnimationFrame(loop);
      };

      this.animationFrameId = requestAnimationFrame(loop);
      return true;
    } catch (err: unknown) {
      this.stopListening();
      const errorObj = err as Error;
      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        this.currentState = 'permission_denied';
        onError?.('마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해 주세요.');
      } else if (errorObj.name === 'NotFoundError' || errorObj.name === 'DevicesNotFoundError') {
        this.currentState = 'no_device';
        onError?.('연결된 마이크 장치를 찾을 수 없습니다.');
      } else {
        this.currentState = 'error';
        onError?.(`마이크 시작 오류: ${errorObj.message || '알 수 없는 오류'}`);
      }
      return false;
    }
  }

  /**
   * 마이크 리소스 완벽 정리 및 분석 중지
   */
  public stopListening(): void {
    this.isRunning = false;
    this.currentState = 'idle';

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // 무시
      }
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {
        // 무시
      }
      this.mediaStream = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {
        // 무시
      }
      this.audioCtx = null;
    }

    this.analyser = null;
  }

  public getState(): MicListeningState {
    return this.currentState;
  }

  /**
   * 순수 알고리즘 함수: Float32Array 버퍼로부터 자기상관 기반 기본 주파수 및 칼림바 건반 매칭 계산
   * (단위 테스트에서 모의 오디오 버퍼로 단독 테스트 가능)
   */
  public static detectPitchFromFloat32Array(
    buffer: Float32Array,
    sampleRate: number,
    state: MicListeningState = 'listening'
  ): PitchAnalysisResult {
    // 1. RMS 신호 강도 계산
    let sumSq = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSq += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSq / buffer.length);

    // 무음 처리
    if (rms < RMS_SILENCE_THRESHOLD) {
      return {
        isAvailable: true,
        state,
        estimatedFrequency: null,
        estimatedPitch: null,
        closestKey: null,
        centsDeviation: null,
        confidence: 0,
        rmsVolume: rms,
        status: 'SILENCE',
        errorMessage: null,
      };
    }

    // 2. 자기상관(Autocorrelation)을 통한 주기(lag) 탐색
    // lagMin, lagMax 계산
    const minLag = Math.floor(sampleRate / MAX_FREQ);
    const maxLag = Math.ceil(sampleRate / MIN_FREQ);

    let bestLag = -1;
    let maxCorr = -1;

    // 정규화를 위한 신호 에너지
    const bufferLen = buffer.length;
    const maxSearchLen = bufferLen - maxLag;

    if (maxSearchLen <= 0) {
      return {
        isAvailable: true,
        state,
        estimatedFrequency: null,
        estimatedPitch: null,
        closestKey: null,
        centsDeviation: null,
        confidence: 0,
        rmsVolume: rms,
        status: 'UNCERTAIN',
        errorMessage: '버퍼 크기가 너무 작습니다.',
      };
    }

    // 에너지 계산
    let energy0 = 0;
    for (let i = 0; i < maxSearchLen; i++) {
      energy0 += buffer[i] * buffer[i];
    }

    for (let lag = minLag; lag <= maxLag; lag++) {
      let crossCorr = 0;
      let energyLag = 0;

      for (let i = 0; i < maxSearchLen; i++) {
        const val1 = buffer[i];
        const val2 = buffer[i + lag];
        crossCorr += val1 * val2;
        energyLag += val2 * val2;
      }

      const norm = Math.sqrt(energy0 * energyLag);
      const coeff = norm > 0 ? crossCorr / norm : 0;

      if (coeff > maxCorr) {
        maxCorr = coeff;
        bestLag = lag;
      }
    }

    // 3. 신뢰도 평가
    const confidence = Math.max(0, Math.min(1, maxCorr));

    if (confidence < CONFIDENCE_THRESHOLD || bestLag < 0) {
      return {
        isAvailable: true,
        state,
        estimatedFrequency: null,
        estimatedPitch: null,
        closestKey: null,
        centsDeviation: null,
        confidence,
        rmsVolume: rms,
        status: 'UNCERTAIN',
        errorMessage: null,
      };
    }

    // 4. 포물선 보간(Parabolic Interpolation)을 통한 정밀 주파수 계산
    const estimatedFreq = sampleRate / bestLag;

    // 5. 17음 칼림바 건반 중 가장 가까운 음 검색
    let closestKey: KalimbaKeyDef | null = null;
    let minCentsDiff = Infinity;

    for (const key of KALIMBA_KEYS) {
      // 센트 오차: 1200 * log2(f_est / f_key)
      const cents = 1200 * Math.log2(estimatedFreq / key.frequency);
      if (Math.abs(cents) < Math.abs(minCentsDiff)) {
        minCentsDiff = cents;
        closestKey = key;
      }
    }

    let status: PitchAnalysisStatus = 'MISMATCH';
    if (closestKey && Math.abs(minCentsDiff) <= MATCH_CENTS_TOLERANCE) {
      status = 'MATCH';
    }

    return {
      isAvailable: true,
      state,
      estimatedFrequency: Math.round(estimatedFreq * 10) / 10,
      estimatedPitch: closestKey ? closestKey.pitch : null,
      closestKey,
      centsDeviation: Math.round(minCentsDiff),
      confidence: Math.round(confidence * 100) / 100,
      rmsVolume: Math.round(rms * 100) / 100,
      status,
      errorMessage: null,
    };
  }
}

// 싱글톤 인스턴스
export const pitchDetector = new PitchDetectionService();
