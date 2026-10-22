/**
 * Kalimba-MC STEP 01-G
 * 유아용 한국어 음성 나레이션(Web Speech API) 타입 정의
 */

export interface SpeechNarrationSettings {
  enabled: boolean;          // 음성 안내 켜기 / 끄기 (기본: true)
  rate: number;              // 말하기 속도 (0.85: 느리게, 1.0: 보통)
  pitch: number;             // 음성 톤 (1.05: 밝고 다정함)
  volume: number;            // 음량 (0.0 ~ 1.0, 기본: 0.9)
  selectedVoiceURI?: string; // 사용자가 선택한 한국어 음성 식별자
}

export type NarrationState =
  | 'idle'         // 대기 중
  | 'speaking'     // 말하는 중
  | 'unsupported'  // 브라우저 미지원
  | 'disabled';    // 음성 안내 꺼짐

export interface SpeechNarrationStatus {
  isSupported: boolean;
  state: NarrationState;
  currentText: string | null;
  hasKoreanVoice: boolean;
  availableVoicesCount: number;
}
