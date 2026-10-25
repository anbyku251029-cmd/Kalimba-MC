# [사전 감사 보고서] STEP 03-C: 어린이 맞춤형 자동 템포 조절 및 적응형 워터폴 학습 시스템

- **작성 일자**: 2026-10-25
- **프로젝트명**: 우리 아이 칼림바 음악 교실 (Kalimba-MC)
- **작업 단계**: STEP 03-C
- **담당 시스템**: 적응형 템포 조절(Adaptive Tempo) 및 음표 대기(Wait for Note) 워터폴 시스템

---

## 1. 사전 감사 배경 및 선행 작업 현황

본 단계(STEP 03-C)는 아이의 실제 연주 속도와 정답률을 실시간 분석하여 워터폴의 속도를 부드럽게 조절하고, 음표가 판정선에 도착했을 때 아이가 칠 때까지 기다려주는(Wait for Note) **어린이 중심 적응형 학습 시스템**을 구축하는 작업입니다.

### 선행 작업(STEP 03-A 및 STEP 03-B) 완료 상태 점검
- **STEP 03-A (화음 & 양손 연주 고도화)**:
  - `src/types/chordTypes.ts`, `musicTiming.ts` (화음 분할 및 동시 타임라인), `rhythmJudge.ts` (화음 완주 판정), `KalimbaGameWaterfall.tsx` (네온 브릿지 및 양손 뱃지) 구현 및 커밋 `622d24d` 완료 확인.
- **STEP 03-B (실물 칼림바 마이크 인식 및 실시간 판정)**:
  - `src/types/acousticTypes.ts`, `src/utils/acousticKalimbaJudge.ts`, `src/components/MicrophoneAcousticIndicator.tsx`, `MicrophoneTunerModal.tsx` 구현, 13대 품질 게이트 통과 및 커밋 `4e6ce48` 푸시 완료 확인.

---

## 2. 기존 워터폴 타이밍 및 판정 엔진 분석

| 구성 요소 | 현재 구현 방식 | STEP 03-C 적용 방안 |
| :--- | :--- | :--- |
| **타임라인 계산** | `calculateSongTimeline(song, speedPercent)`<br>BPM 기반 박자(`beatTime`) 단위로 쉼표와 음표를 일괄 변환 | 음표 위치 자체(`beatTime`)는 절대 불변으로 유지하고, 프레임당 전진하는 박자 증가량(`deltaBeats`)을 동적 제어 |
| **애니메이션 루프** | `requestAnimationFrame` 루프 내에서<br>`beatsPerSecond = (song.tempoBpm / 60) * (speedPercent / 100)`<br>`deltaBeats = (deltaMs / 1000) * beatsPerSecond`<br>`nextBeat = prevBeat + deltaBeats` | 1) 음표 대기 시: `nextBeat`를 현재 목표 음표의 `beatTime`에 캡(clamp)하여 정지.<br>2) 적응형 템포 시: `speedPercent`를 4~8개 음표 주기로 $\pm 3\sim 5\%$ 부드럽게 미세 조정. |
| **리듬 판정** | `RhythmJudgeManager.registerUserInput` (PERFECT: $\pm 120$ms, GREAT: $\pm 220$ms, MISS: 지나침) | 대기 모드에서는 음표가 지나쳐 자동 MISS 되는 것을 방지하고, 올바른 연주 시 즉시 대기 해제 후 다음 음표로 전진 |
| **입력 방식** | 화면 터치/마우스 및 실물 마이크 모드 모두 지원 | 터치 및 마이크 양쪽 모두에서 음표 대기 및 적응형 템포가 동일하게 동작 |
| **학습 기록** | `learningSessionManager.ts`, `LearningSessionRecord` | `tempoMode`, `initialSpeedPercent`, `finalSpeedPercent`, `waitingCount` 필드를 확장하여 호환성 유지 |

---

## 3. 핵심 규칙 및 알고리즘 사양

### 1) 4대 템포 모드
- **모드 A (원곡 속도, `original`)**: 원곡 BPM 100% 유지, 자동 변경 없음.
- **모드 B (느긋한 연습, `relaxed`)**: 권장 초기 템포(초급 65%, 중급 75%, 고급 80%)로 시작하며, 음표 도달 시 칠 때까지 기다림(`Wait for Note`). 안정 시 서서히 증속.
- **모드 C (자동 맞춤, `adaptive`)**: 최근 8개 음표의 정답률($\ge 87.5\%$ 시 $+3\sim 5\%$, $< 62.5\%$ 시 $-3\sim 5\%$) 및 연속 콤보에 기반하여 동적 조절.
- **모드 D (자유 연주, `free`)**: 워터폴 자동 진행 및 판정 없이 어린이가 자유롭게 건반을 누르며 소리를 탐색.

### 2) 음표 대기(Wait for Note) 제한 시간 설정
- **편안하게 기다리기**: 5.0초
- **보통 기다리기**: 3.0초
- **짧게 기다리기**: 1.5초
- **시간 제한 없이 기다리기**: $\infty$ (아이가 칠 때까지 무제한 대기, 기본값)

### 3) 수동 조절 우선권
- 사용자가 속도 버튼이나 슬라이더를 수동으로 조작하면, 최소 6개의 유효 음표 판정이 진행될 때까지 자동 템포가 반대 방향으로 덮어쓰지 않음.

---

## 4. 작업 로드맵

- [x] STEP 00: 기존 시스템 조사 및 사전 감사 보고서 작성
- [ ] STEP 01~05: 적응형 템포 및 대기 관리 엔진 (`src/types/adaptiveTempoTypes.ts`, `src/utils/adaptiveTempoController.ts`) 구현
- [ ] STEP 06~07: 워터폴 게임 화면 UI 및 애니메이션 연동 (`KalimbaGameWaterfall.tsx`, `AdaptiveTempoWidget.tsx`)
- [ ] STEP 08: 학습 기록 모델 확장 및 연동 (`learningRecordTypes.ts`, `learningSessionManager.ts`)
- [ ] STEP 09: 13대 품질 게이트 테스트 스크립트 작성 및 실행 (`scripts/step03cAdaptiveTempo.test.ts`)
- [ ] STEP 10: 전체 종합 회귀 테스트 및 Vite 빌드 검증
- [ ] STEP 11: 일일 완료 보고서 및 아티팩트 작성
- [ ] STEP 12: Git 커밋 및 GitHub 원격 저장소 푸시
