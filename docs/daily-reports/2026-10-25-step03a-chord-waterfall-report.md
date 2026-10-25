# 2026-10-25 STEP 03-A 화음·양손 연주 워터폴 시스템 고도화 완료 보고서

## 1. 작업 기본 정보

- **작업명**: STEP 03-A Chord & Two-Hand Waterfall Learning System
- **프로젝트명**: 우리 아이 칼림바 음악 교실 (Kalimba-MC)
- **작업 일시**: 2026-10-25 (20:55 KST)
- **작업 범위**:
  - 단선율 중심 연주 시스템을 확장하여 2음 이상 동시 연주(화음) 및 양손 가이드 시스템 구축
  - 화음 전용 데이터 모델 설계 (`src/types/chordTypes.ts`, `music.ts` 확장)
  - `musicTiming.ts` 타임라인 계산기 확장 (동일 시작 시점 그룹핑 및 `ChordGroupItem` 생성)
  - `audioEngine.ts` 화음 합성 엔진 고도화 (`playChord` 게인 정규화 및 다성음 렌더링)
  - `rhythmJudge.ts` 화음 그룹 완주 추적 및 보너스 점수 시스템 (`CHORD_PERFECT`, `CHORD_GREAT`)
  - `KalimbaGameWaterfall.tsx` 네온 화음 연결 브릿지 라인 및 양손 가이드(`[L 왼손]`, `[R 오른손]`) 시각화
  - 난이도별 교육용 화음 3곡 카탈로그 구축 (`src/data/chordSongs.ts`: 초급 2음, 중급 2~3음, 고급 삼화음)
  - `SongSelectScreen.tsx`에 '화음·양손' 전용 학습 탭 신설
  - 기존 111곡 카탈로그 및 단선율 게임 회귀 무결성 검증

---

## 2. 시작 시점의 프로젝트 상태

- **브랜치 및 커밋**: `main` 브랜치, `8b77ce9` (최종 완료 보고서 커밋)
- **기존 기능**: 111곡(초급 30, 중급 30, 고급 30, 찬송가 21) 카탈로그, 1:1 워터폴 연주, 리듬 콤보, 녹음 스튜디오(WAV 내보내기), 악보 사진 등록(Canvas OCR), 어린이 성장 및 학부모 대시보드(CSV), PWA 오프라인, 허밍 채보(YIN DSP 엔진) 정상 작동 중.

---

## 3. 기존 코드 구조 조사 결과

1. **단선율 순차 누적 구조**:
   - `musicTiming.ts`가 `currentBeat += durationBeats` 방식으로 음표를 1열로만 배치하고 있었음.
   - ➔ **해결**: `isSimultaneousWithPrevious` 플래그를 도입하여 동시 시작 음표는 이전 시작 비트(`startBeat`)를 공유하도록 개선.
2. **오디오 엔진 다성 발음**:
   - Web Audio API의 오실레이터는 독립적으로 생성되므로 다성 발음(Polyphony)이 본질적으로 지원됨.
   - 단, 여러 음이 동시에 울릴 때 볼륨이 과도하게 부스팅되는 현상을 방지하기 위해 $1/\sqrt{N}$ 기반 다이내믹 게인 정규화 도입.
3. **화음 판정 시 키 매칭 우선권**:
   - 동일 시점에 여러 음표가 떨어질 때, 사용자가 누른 `keyIndex`와 일치하는 음표를 우선 타격 후보로 지정하도록 `RhythmJudgeManager` 알고리즘 최적화.

---

## 4. 새롭게 구현한 기능 상세

### 4.1. 화음 데이터 구조 (`chordTypes.ts` & `music.ts`)
- `KalimbaNote`에 `chordId`, `isSimultaneousWithPrevious`, `chordPitches` 선택 필드 추가.
- `SongTimingTimeline`에 `chordGroups: ChordGroupItem[]` 및 `hasChords: boolean` 필드 추가.

### 4.2. 오디오 엔진 화음 발음 (`audioEngine.playChord`)
- 2음 또는 3음 동시 예약 시 음량 과도 증폭 및 클리핑을 방지하는 다이내믹 게인 정규화 적용.
- 기존 단일 음 `playNote`는 100% 무변경 유지.

### 4.3. 양손 연주 가이드 및 네온 브릿지 워터폴 UI
- 17키 물리적 V자 배치(0~7: 왼손, 8: 중앙 양손, 9~16: 오른손)를 반영한 `[L 왼손]`, `[R 오른손]`, `[C 양손]` 뱃지 렌더링.
- 동일 시점 화음 음표를 가로로 잇는 **빛나는 네온 화음 연결 브릿지 라인(Chord Bridge Line)** 렌더링.
- 상단 툴바에 `[단선율]` ➔ `[화음·양손]` 실시간 모드 전환 스위치 제공.

### 4.4. 화음 판정 및 보너스 점수 시스템
- 화음 그룹 내 모든 구성음을 타격 윈도우 내에 전부 입력했을 때 `CHORD_PERFECT` (+200점) 팡파르 및 구구가가 환호 연동.
- 일부 음만 맞추고 지나쳤을 때 `CHORD_PARTIAL`, 미타격 시 `CHORD_MISS`로 정밀 구분.

### 4.5. 난이도별 교육용 화음 3곡 카탈로그 (`chordSongs.ts`)
1. **초급 (2음 화음 기초)**: 나비야 (도/미, 솔/미 2음 듀엣, 72 BPM)
2. **중급 (양손 화음 에디션)**: 작은 별 (왼손 C4 베이스 + 오른손 멜로디 화음, 80 BPM)
3. **고급 (3음 삼화음 풀 앙상블)**: 에델바이스 (C Major, G Major 3음 화음, 3/4박자, 70 BPM)
- 곡 선택 화면 상단에 '화음·양손' 탭 신설.

---

## 5. 변경된 파일 목록

| 파일 경로 | 변경 내용 |
|---|---|
| `src/types/chordTypes.ts` | **(신규)** 화음 그룹, 화음 판정 결과, 연습 모드 타입 정의 |
| `src/types/music.ts` | `KalimbaNote`에 `chordId`, `isSimultaneousWithPrevious` 필드 확장 |
| `src/utils/musicTiming.ts` | 타임라인 계산 시 동시 시작 음표 묶음 및 `chordGroups` 자동 생성 |
| `src/utils/audioEngine.ts` | `playChord` 다성 발음 및 다이내믹 게인 정규화 메서드 추가 |
| `src/utils/rhythmJudge.ts` | 화음 그룹 완주 추적, 키 매칭 우선 후보 탐색 및 화음 통계 추가 |
| `src/data/chordSongs.ts` | **(신규)** 초급/중급/고급 화음 전용 연습 3곡 구축 |
| `src/data/songs.ts` | `CHORD_PRACTICE_SONGS` export 추가 |
| `src/components/KalimbaGameWaterfall.tsx` | 화음 네온 연결선, 양손 뱃지, 모드 전환 스위치, 화음 피드백 연동 |
| `src/components/SongSelectScreen.tsx` | '화음·양손' 학습 탭 추가 및 곡 목록 연동 |
| `src/App.tsx` | `CHORD_PRACTICE_SONGS` 초기 조회 및 URL 파라미터 연동 |
| `scripts/step03aChordWaterfall.test.ts` | **(신규)** 화음 및 양손 전용 단위/통합 7대 게이트 테스트 스위트 |

---

## 6. 테스트 및 회귀 검증 결과

| 테스트 항목 | 실행 명령 / 파일 | 결과 | 비고 |
|---|---|:---:|---|
| **화음/양손 품질 게이트** | `scripts/step03aChordWaterfall.test.ts` | **PASS (7/7)** | 7대 게이트 100% 통과 |
| **종합 기능 진단** | `scripts/comprehensiveQualityAudit.test.ts` | **PASS (11/11)** | 11개 영역 100% 통과 |
| **리듬/스티커 보상** | `scripts/step02aRhythmAndReward.test.ts` | **PASS (26/26)** | 콤보/구구가가 반응 정상 |
| **허밍 채보 엔진** | `scripts/step02gHummingTranscription.test.ts` | **PASS (10/10)** | F0 추정 및 옥타브 시프트 정상 |
| **TypeScript 정적 검사** | `npx tsc --noEmit` | **PASS** | 타입 오류 0건 |
| **프로덕션 빌드** | `npm run build` | **PASS** | Vite 번들링 성공 (`dist/` 생성) |

---

## 7. 데이터 보존 확인

- **기존 111곡 카탈로그**: 초급 30곡, 중급 30곡, 고급 30곡, 찬송가 21곡의 순번, 음표, 메타데이터 100% 무변경 보존.
- **기존 단선율 곡 타임라인**: `hasChords === false`, `chordGroups.length === 0`으로 기존 단선율 워터폴 게임 동작과 100% 동일하게 진행됨을 확인.
- **사용자 커스텀 찬송가, 학습 세션, 스티커 보상**: 데이터 구조 손상 없음.

---

## 8. 최종 게이트 판정

- `STEP_03A_AUDIT_GATE = PASS`
- `STEP_03A_CHORD_AUDIO_GATE = PASS`
- `STEP_03A_HAND_GUIDE_GATE = PASS`
- `STEP_03A_WATERFALL_GATE = PASS`
- `STEP_03A_SCORING_GATE = PASS`
- `STEP_03A_DATA_COMPATIBILITY_GATE = PASS`
- `STEP_03A_REGRESSION_GATE = PASS`
- $$\mathbf{STEP\_03A\_OVERALL\_GATE = PASS}$$

---

## 9. 다음 단계 제안 (STEP 03-B)

- 화음 연습 시 엄지손가락 양손 글리산도(아르페지오 굴림 타격) 시각 이펙트 보강.
- 사용자가 직접 화음 악보를 작곡/편곡할 수 있는 화음 에디터 도구 개발.
