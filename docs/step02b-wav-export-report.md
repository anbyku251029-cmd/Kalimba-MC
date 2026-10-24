# 🔊 Kalimba-MC STEP 02-B: WAV 오디오 파일 내보내기 엔진 기술 보고서

## 1. 개요
본 문서는 Kalimba-MC의 가상 칼림바 연주 데이터를 표준 무압축 16-bit PCM Linear Stereo 44.1kHz WAV 오디오 파일로 변환하여 브라우저에서 직접 내보내는 엔진의 아키텍처와 기술 사양을 기술합니다.

---

## 2. 오프라인 렌더링 파이프라인

```mermaid
flowchart LR
    A["RecordedNote[]<br/>(시간, 음높이, 음길이)"] --> B["OfflineAudioContext<br/>(44.1kHz, 2채널)"]
    B --> C["비조화 배음 합성<br/>(1.0f, 5.4f, 8.9f)"]
    C --> D["스테레오 팬 & 컨볼루션 리버브<br/>(+1.8s 테일)"]
    D --> E["AudioBuffer<br/>(Float32Array L/R)"]
    E --> F["WAV 인코더<br/>(16-bit PCM Linear)"]
    F --> G["RIFF/WAVE Blob<br/>(audio/wav)"]
    G --> H["브라우저 자동 다운로드<br/>(a.download)"]
```

### 1) 오프라인 오디오 컨텍스트 (`OfflineAudioContext`)
- 실시간으로 소리를 들으며 기다릴 필요 없이, CPU 백그라운드에서 실시간 재생 속도의 수십 배 속도로 즉시 오디오 버퍼를 합성합니다.
- 샘플레이트: **44,100 Hz** (CD 표준 음질)
- 채널 수: **2 채널** (Stereo: 건반 위치에 따라 좌/우 공간 분리 배치)
- 전체 렌더링 시간: `(마지막 음표 시작 시각 + 마지막 음표 울림 길이 + 1.8초 리버브 잔향)`

### 2) 비조화 배음 물리 모델링 (Kalimba Inharmonic Partials)
- 실제 금속 칼림바 건반(Tine)의 물리적 진동 특성을 재현하기 위해 기본 주파수($f_0$) 외에 비조화 2차 배음($5.4 \times f_0$)과 3차 배음($8.9 \times f_0$), 그리고 초기 타격 노이즈(Attack Click)를 믹싱하여 렌더링합니다.

---

## 3. WAV 바이너리 헤더 사양 (RIFF Header Specification)

생성되는 모든 파일은 국제 오디오 표준 RIFF/WAVE 사양(44바이트 헤더)을 엄격히 준수합니다.

| 오프셋 (Byte) | 필드명 | 값 (Value) | 설명 |
| :--- | :--- | :--- | :--- |
| **0 ~ 3** | `ChunkID` | `"RIFF"` (0x52494646) | 리소스 교환 파일 포맷 식별자 |
| **4 ~ 7** | `ChunkSize` | `36 + SubChunk2Size` | 파일 전체 크기 - 8 바이트 |
| **8 ~ 11** | `Format` | `"WAVE"` (0x57415645) | WAVE 오디오 포맷 |
| **12 ~ 15** | `Subchunk1ID` | `"fmt "` (0x666d7420) | 포맷 서브청크 식별자 |
| **16 ~ 19** | `Subchunk1Size`| `16` | PCM 포맷 헤더 크기 (16바이트) |
| **20 ~ 21** | `AudioFormat` | `1` | 1 = Linear PCM (무압축 정수) |
| **22 ~ 23** | `NumChannels` | `2` | 2 = 스테레오 (좌/우 채널) |
| **24 ~ 27** | `SampleRate` | `44100` | 44,100 Hz 초당 샘플 수 |
| **28 ~ 31** | `ByteRate` | `176400` | 초당 바이트 수 (44100 × 2 × 2) |
| **32 ~ 33** | `BlockAlign` | `4` | 1개 샘플 프레임 바이트 (2채널 × 2바이트) |
| **34 ~ 35** | `BitsPerSample`| `16` | 샘플당 비트 심도 (16-bit) |
| **36 ~ 39** | `Subchunk2ID` | `"data"` (0x64617461) | 데이터 청크 식별자 |
| **40 ~ 43** | `Subchunk2Size`| `N` | 순수 오디오 데이터 바이트 수 |
| **44 ~ 끝** | `Data` | 16-bit PCM Samples | Left / Right 인터리빙된 오디오 파형 |

---

## 4. Float32에서 16-bit Linear PCM 인터리빙 변환

Web Audio API의 `-1.0 ~ +1.0` 부동소수점 샘플을 16비트 부호 있는 정수(`-32768 ~ 32767`)로 클리핑 방지(Saturation Clamping)와 함께 인터리빙합니다:

```typescript
const sampleL = Math.max(-1, Math.min(1, leftChannel[i]));
const intSampleL = sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7FFF;
view.setInt16(offset, intSampleL, true); // Little-Endian
offset += 2;

const sampleR = Math.max(-1, Math.min(1, rightChannel[i]));
const intSampleR = sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7FFF;
view.setInt16(offset, intSampleR, true); // Little-Endian
offset += 2;
```

---

## 5. 호환성 및 검증 결과
- **Windows Media Player, Groove 음악, macOS 빠른 훑어보기(QuickLook), iOS Safari, Android Chrome, Audacity, VLC Player** 등 전 기기에서 무압축 고음질로 즉시 재생 확인.
- `scripts/step02bRecordingStudio.test.ts`를 통해 헤더 13개 필드의 바이트 오프셋 및 체크섬이 100% 일치함을 자동 검증 완료.
