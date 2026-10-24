# ⏱️ Kalimba-MC STEP 02-E: 연습 시간 측정, 일시정지 및 중단 처리 기술 사양서

## 1. 개요
본 문서는 브라우저 환경에서 발생할 수 있는 시스템 시계 변경, 탭 비활성화, 일시정지 등의 변수를 통제하여 **아이의 실제 순수 칼림바 연습 시간**을 초 단위로 정밀하게 측정하는 아키텍처를 기술합니다.

---

## 2. 단조 증가 시계(Monotonic Clock) 기반 측정 원칙

### 1) 시스템 시계 왜곡 방지
- 사용자가 기기 설정에서 날짜/시간을 변경하더라도 연습 시간 계산이 영향을 받지 않도록 `Date.now()` 대신 브라우저의 단조 증가 고정밀 시계인 **`performance.now()`**를 시간 차이($\Delta t$) 계산에 사용합니다.
- `startTime`과 `endTime` 타임스탬프 기록에만 `Date.now()`(월드 타임)를 사용합니다.

### 2) 순수 연습 시간 누적 공식
$$\text{practiceDurationSec} = \left\lfloor \frac{\sum_{i=1}^{k} (T_{\text{pause}, i} - T_{\text{resume}, i}) + (T_{\text{end}} - T_{\text{last\_resume}})}{1000} \right\rfloor$$

- **시작 시점 (`startSession`)**:
  - `accumulatedPracticeMs = 0`
  - `lastResumePerfTime = performance.now()`
  - `isPaused = false`
- **일시정지 (`pauseSession`)**:
  - `accumulatedPracticeMs += max(0, performance.now() - lastResumePerfTime)`
  - `isPaused = true`
- **재개 (`resumeSession`)**:
  - `lastResumePerfTime = performance.now()`
  - `isPaused = false`
- **종료/완주 (`completeSession` / `abandonActiveSession`)**:
  - 만약 일시정지 상태가 아니라면: `accumulatedPracticeMs += max(0, performance.now() - lastResumePerfTime)`
  - 최종 `practiceDurationSec = Math.round(accumulatedPracticeMs / 1000)`

---

## 3. 예외 상황 처리 매트릭스

| 상황 | 동작 방식 | 기록 상태 | 완주 여부 |
| :--- | :--- | :--- | :--- |
| **곡 끝까지 완주** | 최종 울림까지 대기 후 `completeSession` 호출 | `COMPLETED` | `true` |
| **연습 중 나가기 버튼 클릭** | `abandonActiveSession` 호출 | `ABANDONED` | `false` |
| **처음부터 다시하기(R키/버튼)** | 기존 세션 `ABANDONED` 저장 후 신규 세션 `startSession` | `ABANDONED` ➔ `STARTED` | `false` ➔ 시작 |
| **스페이스바로 일시정지** | 시간 누적 정지, `PAUSED` 상태로 저장소 동기화 | `PAUSED` | `false` |
| **브라우저 새로고침/탭 닫기** | 자동 완주 절대 금지, 마지막 저장된 시간 보존 | `STARTED` 또는 `IN_PROGRESS` | `false` |

---

## 4. 시간대(Timezone) 기준
모든 날짜 집계(`YYYY-MM-DD`) 및 주간/월간 경계선은 한국 표준시(**`Asia/Seoul`**, UTC+9)를 기준으로 계산됩니다:
```typescript
const d = new Date(timestamp);
const utc = d.getTime() + d.getTimezoneOffset() * 60000;
const seoulDate = new Date(utc + 9 * 3600000);
```
이를 통해 사용자의 기기 타임존이 다르더라도 자정(00:00) 기준 일일 연습량이 한국 시간 기준으로 일관되게 집계됩니다.
