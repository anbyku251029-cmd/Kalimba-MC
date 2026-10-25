# [사전 감사 보고서] STEP 03-B: 실물 칼림바 마이크 인식 및 실시간 연주 판정 시스템

- **작성 일자**: 2026-10-25
- **프로젝트명**: 우리 아이 칼림바 음악 교실 (Kalimba-MC)
- **작업 단계**: STEP 03-B
- **담당 시스템**: 실물 칼림바 마이크 실시간 음정 인식 및 워터폴 연주 판정 시스템

---

## 1. 사전 감사 배경 및 목표

본 단계(STEP 03-B)는 화면을 직접 터치하거나 키보드를 누르는 기존 방식에 더해, **사용자가 실제 17음 칼림바 악기를 손에 쥐고 연주할 때 발생하는 실제 소리를 마이크로 인식하여 워터폴 게임에서 정답 판정과 점수를 실시간으로 제공**하는 모드를 완성하는 작업이다.

### 핵심 원칙 준수 여부 점검
1. **기존 기능 완전 보존**:
   - 111개 기본 연습곡, 21개 찬송가, 사용자 제작 커스텀 악보, STEP 03-A의 화음/양손 워터폴 시스템이 100% 정상 작동해야 함.
2. **화면 터치 모드 vs 실물 마이크 모드의 명확한 분리**:
   - 마이크 모드가 꺼져 있거나 마이크 권한이 없는 환경에서도 기존 화면 터치/키보드 연주 모드는 완벽하게 동작해야 함.
3. **어린이 프라이버시 보호 (COPPA 및 온디바이스 원칙)**:
   - 마이크 음성 데이터를 서버로 절대 전송하지 않고 브라우저 Web Audio API 상의 메모리(Float32Array 버퍼) 내에서 즉시 처리 후 폐기.
4. **측정 데이터의 정직성**:
   - 실제 하드웨어 실물 악기 연결 테스트는 시뮬레이션 환경의 한계를 명시하고 합성 신호 기반 수학적 F0/센트 테스트와 엄격히 구분하여 보고.

---

## 2. 기존 코드베이스 현황 및 기술 자산 점검

| 항목 | 상태 | 위치 및 분석 내용 |
| :--- | :---: | :--- |
| **Git 상태** | 정상 | `main` 브랜치 clean, 원격 `origin/main`과 일치 (`622d24d`) |
| **기존 마이크 분석 서비스** | 양호 | `src/utils/pitchDetectionService.ts`에 독립 클래스 및 순수 자기상관(Autocorrelation) 함수 구현 완료됨 |
| **마이크 상태 및 타입** | 양호 | `src/types/microphoneAnalysisTypes.ts`에 `MicListeningState`, `PitchAnalysisResult` 정의됨 |
| **워터폴 게임 엔진** | 고도화 완료 | `src/components/KalimbaGameWaterfall.tsx`에 화음/양손 연주 가이드 및 판정 엔진 연동됨 |
| **필요 확장 요소** | 신규 구현 | 실시간 음정 판정 엔진(`acousticKalimbaJudge.ts`), 워터폴 모드 전환 UI, 튜너/인디케이터 모달 및 시각 피드백 |

---

## 3. 핵심 판정 기준 및 알고리즘 사양

1. **칼림바 17음 음역**:
   - C4 (261.63Hz) ~ E6 (1318.51Hz)
2. **센트 오차 공식**:
   $$\text{cents} = 1200 \times \log_2\left(\frac{f_{\text{detected}}}{f_{\text{target}}}\right)$$
3. **판정 등급**:
   - **PERFECT**: $|\text{cents}| \le 35$ (칼림바 건반의 정확한 타격)
   - **GREAT**: $35 < |\text{cents}| \le 70$ (약간 빗나갔으나 유효한 타격)
   - **RETRY**: $|\text{cents}| > 70$ 또는 다른 음표 타격
   - **WAITING / SILENCE**: 무음($\text{RMS} < 0.015$) 또는 신뢰도 미달($\text{confidence} < 0.65$)
4. **쿨다운(Debounce) 메커니즘**:
   - 실물 칼림바는 튕긴 후 잔향(Sustain)이 지속되므로, 동일 음표에 대해 약 300~350ms의 쿨다운을 적용하여 중복 다중 판정 방지.

---

## 4. 구현 및 검증 계획

- [x] 1. 사전 감사 보고서 작성
- [ ] 2. 실물 칼림바 마이크 판정 엔진 (`src/utils/acousticKalimbaJudge.ts`) 구현
- [ ] 3. 실시간 마이크 튜너 및 인디케이터 UI (`src/components/MicrophoneAcousticIndicator.tsx`, `MicrophoneTunerModal.tsx`) 제작
- [ ] 4. 워터폴 게임 화면(`KalimbaGameWaterfall.tsx`)에 `inputMode: 'touch' | 'acoustic_mic'` 추가 및 자동 타격 연동
- [ ] 5. 곡 선택 화면(`SongSelectScreen.tsx`)에 칼림바 마이크 튜너 모달 버튼 연동
- [ ] 6. 13대 품질 게이트 검증 스크립트(`scripts/step03bRealKalimbaMic.test.ts`) 작성 및 실행
- [ ] 7. 전체 기능 회귀 테스트 및 TypeScript 빌드 검증
- [ ] 8. 일일 완료 보고서 작성 및 GitHub 푸시
