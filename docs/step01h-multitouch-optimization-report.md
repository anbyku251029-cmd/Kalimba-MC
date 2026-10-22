# STEP 01-H: 모바일·태블릿 멀티터치 최적화 완료 보고서

**프로젝트명**: 우리 아이 칼림바 음악 교실 (Kalimba-MC)  
**작성일**: 2026-10-22  
**기술 스택**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Web Audio API, Pointer Events API  
**대상 기기**: 스마트폰, 태블릿, 터치스크린 노트북 및 데스크톱 브라우저  

---

## 1. 개요 및 배경

스마트폰이나 태블릿과 같은 모바일 터치 기기에서 칼림바는 **두 엄지손가락으로 양쪽 건반을 동시에 튕기며 화음을 연주하거나 빠른 속도로 건반을 번갈아 튕기는 악기**입니다.

그러나 기존 구현에서는 표준 HTML `<button onClick={...}>` 이벤트에 의존하고 있어 다음과 같은 문제가 있었습니다:
1. **터치 지연 (Tap Delay)**: 모바일 브라우저의 기본 더블탭 줌 동작으로 인해 `click` 이벤트 발생 시 최대 300ms의 반응 지연이 발생할 수 있음.
2. **동시 터치(화음) 불가능**: 두 손가락을 동시에 건반 위에 올려놓을 때 단일 클릭으로 처리되거나 두 번째 터치가 무시되는 문제 발생.
3. **제스처 간섭**: 건반을 누르거나 튕기려는 손동작이 페이지 스크롤 또는 브라우저 확대 제스처로 오인되어 화면이 울렁거리는 현상.
4. **고스트 클릭 (Ghost Click)**: 터치 직후 브라우저가 자동으로 생성하는 마우스 클릭 이벤트로 인해 건반이 2번 연속 발음되는 이중 트리거 현상.

본 STEP 01-H에서는 **W3C Pointer Events API** 기반의 독립 멀티터치 컨트롤러(`KalimbaTouchController`)를 개발하여, 모바일 환경에서 17개 칼림바 건반의 즉각적인 반응성과 독립 화음 연주를 구현하였습니다.

---

## 2. 핵심 아키텍처 및 구현 내용

### 2.1 Pointer Events 기반 멀티터치 관리 (`KalimbaTouchController`)
- **파일 경로**: `src/utils/kalimbaTouchController.ts`
- **핵심 역할**: 각 터치 포인트(손가락)에 부여되는 고유한 `pointerId`를 추적하여 해당 포인터가 누르고 있는 건반 인덱스(`keyIndex`)에 1:1 매핑합니다.
- **포인터 이벤트 라이프사이클**:
  - `pointerdown`: 포인터 ID와 건반 인덱스를 등록하고, `onKeyDown`을 즉시 호출하여 오디오 재생 및 건반 점등 발광을 발동합니다. 브라우저가 지원하는 경우 `setPointerCapture`를 시도하여 터치가 약간 빗나가도 추적을 유지합니다.
  - `pointerup`: 포인터 ID를 해제하고 건반 릴리즈를 처리합니다.
  - `pointercancel` / `lostpointercapture`: 사용자가 손가락을 화면 밖으로 밀어내거나 시스템 알림 창이 뜰 때 건반이 계속 눌린 상태로 멈추지 않도록 안전하게 자동 해제합니다.
  - `resetAll()`: 일시정지, 모달 열림, 화면 전환 시 남아있는 모든 터치 상태를 즉시 일괄 초기화합니다.

### 2.2 독립 화음 연주 (Simultaneous Chord Playing)
- `activePointers: Map<number, number>` (pointerId -> keyIndex)와 `keyPointerCounts: Map<number, number>` (keyIndex -> count)를 이중 관리합니다.
- 왼손 엄지(Pointer A)가 C4 건반을 누르고 오른손 엄지(Pointer B)가 G4 건반을 동시에 누르면, 각 포인터가 독립적으로 감지되어 두 음이 동시에 맑게 울립니다.

### 2.3 `touch-action: none` 적용 범위의 정밀 분리
- **사용자 전역 규칙 준수**: "화면이 아래 위로 올리는 스크롤 되게 수정해줘" 규칙을 철저히 보호합니다.
- 전체 페이지나 상단 헤더, 곡 목록, 모달 영역에는 스크롤을 유지하고, **오직 17개 칼림바 쇠 건반(`<button>`) 요소에만** `touchAction: 'none'`, `userSelect: 'none'`, `-webkit-tap-highlight-color: transparent` 스타일을 적용하였습니다.
- 결과적으로 건반 영역을 아무리 세게 터치하거나 문질러도 스크롤 간섭 없이 칼림바가 즉각 발음되며, 상단 곡 정보나 가사, 화면 여백을 쓸어올리면 부드러운 상하 스크롤이 완벽히 작동합니다.

### 2.4 고스트 클릭 및 더블 트리거 방지
- 터치 기기에서는 `pointerdown`이 발생한 후 약 300ms 뒤에 인위적인 `click` 이벤트가 전달됩니다.
- 이를 방지하기 위해 `lastPointerTriggerTimeRef`를 두어 최근 350ms 이내에 포인터로 이미 발음된 건반은 뒤따라오는 `click` 이벤트를 무시하도록 구현하였습니다.

---

## 3. 단위 테스트 검증 결과

- **테스트 파일**: `scripts/multitouchController.test.ts`
- **실행 명령**: `npx tsx scripts/multitouchController.test.ts`
- **검증 항목**:
  1. 단일 포인터 다운/업 상태 전이 및 핸들러 호출 검증 (PASS)
  2. 양손 엄지 동시 터치(화음 연주) 독립 추적 검증 (PASS)
  3. 한 손가락 릴리즈 시 다른 손가락 건반 상태 유지 검증 (PASS)
  4. 시스템 취소(`pointercancel`) 및 캡처 상실(`lostpointercapture`) 시 안전 해제 검증 (PASS)
  5. 일괄 리셋(`resetAll`) 검증 (PASS)
- **결과**: **총 25개 단언문 중 25개 통과 (100% PASS, 0 FAIL)**

---

## 4. 검증 구분 및 한계 명시

- **자동화 시뮬레이션 검증 (PASS)**:
  - Node.js 환경에서 모의 `PointerEvent`를 주입하여 2개 이상의 동시 터치 추적, 포인터 캔슬 시 안전 복구, 화음 분기 로직이 100% 정상 작동함을 수학적/로직적으로 입증했습니다.
- **물리 하드웨어 실기기 검증 (REVIEW 필요)**:
  - 실제 구형 스마트폰 저가형 터치 디지타이저의 경우 하드웨어 샘플링 레이트(예: 60Hz vs 120Hz)에 따른 지연이 다를 수 있으며, 이는 브라우저 Web Audio API의 오디오 하드웨어 버퍼 크기에 따라 체감 반응성이 소폭 달라질 수 있습니다.

---

## 5. 변경 파일 목록

1. `src/utils/kalimbaTouchController.ts` (신규): 포인터 이벤트 기반 멀티터치 컨트롤러 클래스
2. `src/components/KalimbaGameWaterfall.tsx` (수정): 폭포수 게임 17음 건반에 포인터 핸들러 및 `touchAction: 'none'` 적용
3. `src/components/StepLearningModal.tsx` (수정): STEP 2 건반 탐색 뷰에 `touchAction: 'none'` 및 터치 스타일 적용
4. `scripts/multitouchController.test.ts` (신규): 멀티터치 컨트롤러 단위 테스트 스위트
