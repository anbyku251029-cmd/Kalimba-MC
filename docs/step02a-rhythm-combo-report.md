# STEP 02-A 리듬 콤보 시스템 구현 보고서 (Rhythm Combo Report)

**프로젝트명**: 우리 아이 칼림바 음악 교실 (Kalimba-MC)  
**작업 단계**: STEP 02-A 리듬 콤보 시스템 구축  
**작성일**: 2026년 10월 24일  
**상태**: ✅ **구현 및 26개 종합 검증 테스트 100% PASS**

---

## 1. 개요 및 구현 목표

어린이가 워터폴 리듬 게임에서 정확한 타이밍과 올바른 건반을 연주할수록 시각적 피드백과 성취감을 얻을 수 있도록 **실시간 리듬 판정 및 콤보 시스템**을 구축하였습니다.

- **목표 시점과 입력 시점의 정밀 오차 계산**: 음표의 `beatTime`과 사용자 입력 시점 `currentBeat`의 차이를 밀리초(ms)로 환산
- **다단계 판정 윈도우**:
  - `PERFECT` (완벽해요 ⭐): 오차 ±120ms 이내
  - `GREAT` (좋아요 👍): 오차 ±220ms 이내
  - `MISS` (놓침 💧): 오차 ±220ms 초과 또는 다른 건반 입력, 타격선 통과 후 +250ms 경과
- **연속 콤보 및 마일스톤**: 콤보 증가, 실패 시 콤보 리셋, 최고 콤보(Max Combo) 기록 보존
- **중복 입력 차단**: 한 번 판정된 음표는 재판정되지 않으며, 멀티터치 중복 입력 완전 방어
- **배속 호환성**: 70%, 100%, 120% 배속 변경 시에도 밀리초 변환 계수가 연동되어 완벽 일치

---

## 2. 핵심 파일 및 아키텍처

1. **`src/types/comboTypes.ts`**:
   - `HitRating`: `'PERFECT' | 'GREAT' | 'MISS' | 'NONE'`
   - `ComboStats`: `currentCombo`, `maxCombo`, `perfectCount`, `greatCount`, `missCount`, `accuracy` 등
   - `JudgeConfig`: `perfectWindowMs (120)`, `greatWindowMs (220)`, `missThresholdMs (250)`
2. **`src/utils/rhythmJudge.ts` (`RhythmJudgeManager`)**:
   - 사용자 입력 등록 (`registerUserInput`)
   - 타격선 통과 음표 자동 감지 (`checkPassedNotes`) - 쉼표(`isRest`)는 자동 제외
   - 정확도 백분율 통계 실시간 산출
3. **`src/components/ComboDisplay.tsx`**:
   - 2콤보 이상 시 중앙 상단에 콤보 애니메이션 노출
   - 5, 10, 15, 20콤보 마일스톤 시 반짝이는 별가루 텍스트 효과
   - 건반 시야를 전혀 가리지 않는 `pointer-events-none` 설계
4. **`src/components/KalimbaGameWaterfall.tsx`**:
   - 건반 터치, 마우스 클릭, 키보드 입력이 `handleUserNoteInput`으로 단일화되어 실시간 판정 엔진과 연동

---

## 3. 테스트 및 검증 결과

- **스크립트**: `scripts/step02aRhythmAndReward.test.ts`
- **결과**:
  - 정확한 입력 5회 후 콤보 5, maxCombo 5: **PASS**
  - 정확한 입력 10회 후 콤보 10, maxCombo 10: **PASS**
  - 잘못된 건반 입력 시 콤보 0 초기화 및 maxCombo 유지: **PASS**
  - 이미 판정된 음표의 중복 점수/콤보 지급 차단: **PASS**
  - 쉼표 구간 통과 시 불필요한 MISS 없음: **PASS**
  - 70% 저속 및 120% 고속 모드 타이밍 호환성: **PASS**
