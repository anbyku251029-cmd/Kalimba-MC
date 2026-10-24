# 🎼 Kalimba-MC STEP 02-D: 악보 데이터 모델, 17음 칼림바 유효성 검증 규칙 및 숫자 악보 사양서

## 1. 개요
본 문서는 STEP 02-D에서 다루는 악보 추출 데이터 구조(`ScoreOcrSession`, `ExtractedNote`), 17음 C Major 칼림바 음역 검증 규칙, 그리고 Kalimba-MC 표준 숫자 악보(`rawNotation`)와의 상호 변환 사양을 정의합니다.

---

## 2. 악보 인식 세션 데이터 모델

### 1) `ScoreOcrSession`
```typescript
export interface ScoreOcrSession {
  id: string;                         // 세션 고유 ID ('ocr_session_...')
  fileName: string;                   // 업로드된 파일명
  fileSize: number;                   // 파일 바이트 크기
  mimeType: string;                   // 이미지 MIME 타입 ('image/png' 등)
  imageUrl: string;                   // Blob Object URL
  imageWidth: number;                 // 원본 가로 픽셀
  imageHeight: number;                // 원본 세로 픽셀
  status: OcrEngineStatus;            // 'OMR_READY' | 'MANUAL_ENTRY_MODE' 등
  statusMessage: string;              // 한국어 안내 메시지
  detectedStaffSystems: DetectedStaffSystem[]; // 감지된 오선 묶음
  notes: ExtractedNote[];             // 현재 편집 중인 음표 배열
  originalNotes: ExtractedNote[];     // 원본 추출 음표 배열 (초기화용)
  history: ExtractedNote[][];         // Undo 실행 취소 스택 (최대 20개)
  future: ExtractedNote[][];          // Redo 다시 실행 스택
  metadata: {
    title: string;                    // 곡 제목
    subTitle?: string;                // 부제목
    composer?: string;                // 작곡가
    timeSignature: '4/4' | '3/4' | '2/4' | '6/8'; // 박자표
    tempoBpm: number;                 // 템포 (기본 80 BPM)
    difficulty: '쉬움' | '보통' | '어려움' | '찬송가'; // 난이도
  };
}
```

### 2) `ExtractedNote`
```typescript
export interface ExtractedNote {
  id: string;            // 'ext_note_1', 'ext_note_2'
  order: number;         // 1부터 시작하는 순서
  pitch: string;         // 'C4', 'E4', 'G4', 'C5', 'REST'
  solfege: string;       // '도', '레', '미', '솔', '쉼'
  octaveLevel: 0 | 1 | 2; // 0: C4~B4, 1: C5~B5, 2: C6~E6
  numberNotation: string;// '1', '3', '5', "1'", "0"
  duration: number;      // 박자 (1 = 4분음표, 0.5 = 8분음표, 2 = 2분음표)
  isRest: boolean;       // 쉼표 여부
  measureIndex: number;  // 마디 번호 (1부터 시작)
  lyric?: string;        // 가사
  userModified: boolean; // 사용자 직접 수정 여부
  confidence?: number;   // 인식 신뢰도 (0.0 ~ 1.0)
}
```

---

## 3. 17음 C Major 칼림바 음역 검증 규칙

17음 C Major 칼림바는 **C4부터 E6까지의 17개 음**만을 물리적으로 연주할 수 있습니다.

### 1) 지원 음역 정의 (`KALIMBA_VALID_PITCHES`)
- **기본 옥타브 (0)**: `C4`, `D4`, `E4`, `F4`, `G4`, `A4`, `B4` (1, 2, 3, 4, 5, 6, 7)
- **높은 옥타브 (1)**: `C5`, `D5`, `E5`, `F5`, `G5`, `A5`, `B5` (1', 2', 3', 4', 5', 6', 7')
- **최고 옥타브 (2)**: `C6`, `D6`, `E6` (1'', 2'', 3'')

### 2) 유효성 상태 구분
- **`PASS`**: 모든 음표가 17음 범위에 포함되며, 마디별 박자 합계가 박자표와 일치함.
- **`WARNING`**: 17음 범위 내이지만 마디별 박자 합계가 박자표와 일치하지 않음 (못갖춘마디 등).
- **`ERROR`**: 17음 칼림바에서 연주할 수 없는 음(예: `C3`, `G3`, `A6`)이 포함되어 있거나, 음길이가 0 이하인 경우. 저장이 차단됨.

### 3) 원클릭 옥타브 시프트 (`shiftNotesOctave`)
전체 음표가 칼림바 음역보다 낮게 조옮김되어 있는 경우(예: G3, A3 등), 시스템이 이를 감지하여 **[⬆ 1옥타브 올리기]** 버튼을 노출하고, 클릭 시 전체 음표를 한 옥타브 올려 유효한 칼림바 악보(`PASS`)로 원클릭 변환합니다.

---

## 4. 숫자 악보(`rawNotation`) 인코딩 규칙

편집 완료된 `ExtractedNote[]`는 다음 규칙에 따라 텍스트 악보로 변환됩니다:
1. **음표 번호**: `1`, `2`, `3`, `4`, `5`, `6`, `7`, `1'`, `2'`, `3'`, `4'`, `5'`, `6'`, `7'`, `1''`, `2''`, `3''`
2. **쉼표**: `0`
3. **음길이**:
   - 0.5박: `1_` (밑줄)
   - 1박: `1`
   - 1.5박: `1(1.5)`
   - 2박: `1-` (하이픈 1개)
   - 3박: `1--` (하이픈 2개)
   - 4박: `1---` (하이픈 3개)
4. **마디 구분**: `|`
5. **가사**: `1/도`
