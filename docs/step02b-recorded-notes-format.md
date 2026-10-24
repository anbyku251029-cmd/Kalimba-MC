# 🎼 Kalimba-MC STEP 02-B: 녹음 음표 데이터 구조 및 숫자 악보 변환 형식 사양서

## 1. 개요
본 문서는 가상 칼림바 연주 시 메모리에 보존되는 개별 음표 이벤트(`RecordedNote`), 전체 세션 메타데이터(`RecordingSession`), 그리고 이를 Kalimba-MC 표준 숫자 악보 문자열(`rawNotation`)로 변환하는 정규화 규칙을 정의합니다.

---

## 2. 녹음 데이터 인터페이스 정의 (`src/types/recordingTypes.ts`)

### 1) `RecordedNote` (단일 음표 이벤트)
```typescript
export interface RecordedNote {
  id: string;               // 고유 식별자 (예: 'rec_note_1')
  pitch: string;            // 음높이 (예: 'C4', 'E4', 'G4', 'C5' ...)
  noteNumber: string;       // 숫자 악보 표기 (예: '1', '3', '5', "1'" ...)
  solfege: string;          // 한글 계이름 (예: '도', '미', '솔', '높은도' ...)
  keyIndex: number;         // 물리 건반 인덱스 (0 ~ 16)
  startTimeMs: number;      // 녹음 시작 시점으로부터의 상대 경과 시간 (밀리초)
  durationMs: number;       // 울림 및 음길이 (기본 500ms)
  audioTime: number;        // AudioContext.currentTime 기준 시각 (초 단위)
  groupId?: string;         // 동시 입력(화음) 그룹 ID (45ms 이내 입력 시 동일 ID 부여)
}
```

### 2) `RecordingSession` (전체 세션 정보)
```typescript
export interface RecordingSession {
  id: string;               // 세션 ID (예: 'rec_session_1740000000')
  title: string;            // 곡 제목 (기본: '내 칼림바 연주')
  createdAt: number;        // 생성 타임스탬프 (Date.now())
  totalDurationMs: number;  // 전체 연주 길이 (밀리초)
  notes: RecordedNote[];    // 기록된 음표 배열
  rawNotation: string;      // 자동 생성된 숫자 악보 문자열
}
```

---

## 3. 숫자 악보(Simple Notation) 자동 변환 알고리즘

어린이가 자유롭게 연주한 불규칙한 시간차(밀리초)를 음악적으로 자연스러운 4분음표, 2분음표, 온음표 및 마디선으로 정규화합니다.

### 1) 음길이 및 쉼표 정규화 규칙
- 두 음표 간격 $\Delta t < 650\text{ ms}$: **기본 4분음표** (`1`, `3`, `5`)
- $650\text{ ms} \le \Delta t < 1000\text{ ms}$: **2분음표** (1박 늘임표 추가: `1-`, `3-`)
- $\Delta t \ge 1000\text{ ms}$: **점2분음표/온음표** (2박 늘임표 추가: `1--`, `3--`)

### 2) 마디선(`|`) 자동 분할
- 시각적인 가독성을 위해 4개 음표 이벤트마다 마디선(`|`)을 삽입하여 4/4박자 구조로 표시합니다.

### 3) 옥타브 점 표기 보존
- 저음 옥타브: `6.` (A3), `7.` (B3)
- 기본 옥타브: `1` (C4), `2` (D4), `3` (E4), `4` (F4), `5` (G4), `6` (A4), `7` (B4)
- 고음 옥타브: `1'` (C5), `2'` (D5), `3'` (E5), `4'` (F5), `5'` (G5), `6'` (A5)
- 최고음 옥타브: `1''` (C6), `2''` (D6), `3''` (E6)

---

## 4. 변환 결과 예시

- **실제 연주 데이터**:
  - `C4` (0ms), `E4` (500ms), `G4` (1000ms), `C5` (2100ms)
- **생성된 숫자 악보**:
  ```text
  1 3 5- 1'--
  ```
- 이 텍스트는 즉시 복사하여 찬송가 추가 모달이나 나만의 악보로 재사용할 수 있습니다.
