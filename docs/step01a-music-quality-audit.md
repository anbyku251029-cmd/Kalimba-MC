# Kalimba-MC STEP 01-A — 음악 품질 정밀 진단 보고서

**작성 일자:** 2026-10-21  
**진단 대상:** 우리 아이 칼림바 음악 교실 (Kalimba-MC)  
**진단 도구:** TypeScript AST, Web Audio API Analyzer, Custom Music Validator  
**기술 스택:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Web Audio API  

---

## 1. 프로젝트 개요 및 환경 확인

- **프로젝트 실제 경로:** `c:\Users\anbyo\OneDrive\바탕 화면\Work\Kalimba-MC`
- **조사 및 검증 대상 핵심 파일:**
  - `src/data/songsBeginner.ts` (초급 30곡)
  - `src/data/songsIntermediate.ts` (중급 30곡)
  - `src/data/songsAdvanced.ts` (고급 30곡)
  - `src/data/hymns.ts` (기본 찬송가 20곡)
  - `src/types/music.ts` (음악 데이터 모델 및 인터페이스)
  - `src/constants/kalimbaKeys.ts` (17음 C Major 건반 정의 및 주파수 매핑)
  - `src/utils/audioEngine.ts` (Web Audio API 음향 합성 엔진)
  - `src/utils/noteParser.ts` (숫자보/계이름/영문 파서 및 포맷터)
  - `src/utils/musicValidator.ts` (음악 무결성 및 마디 박자 검증기)
  - `src/components/KalimbaGameWaterfall.tsx` (폭포수 연주 및 판정 뷰)
  - `src/components/SongSelectScreen.tsx` (곡 탐색 및 미리듣기 뷰)
  - `src/components/HymnEditorModal.tsx` (찬송가 추가/수정 편집기)
  - `src/App.tsx` (루트 컨테이너 및 화면 라우팅)

---

## 2. 데이터 보호 및 무결성 현황

| 점검 항목 | 결과 | 설명 |
| :--- | :---: | :--- |
| **Git 복구 지점 확보** | **PASS** | 변경 전후 커밋(`34ee5f8`, `d5493c0`)으로 안전 복구 가능 |
| **110곡 데이터 보존** | **PASS** | 초급 30, 중급 30, 고급 30, 찬송가 20곡 임의 삭제/초기화 0건 |
| **사용자 로컬스토리지 보존** | **PASS** | `kalimba_custom_hymns_v1`, `kalimba_classroom_progress_v1` 보호 |
| **근거 없는 일괄 편곡 배제** | **PASS** | 110곡 원본 악보 데이터 일괄 왜곡 없이 원본 데이터 완전 보존 |

---

## 3. 부문별 정밀 진단 결과

### A. 음표 및 멜로디 (Melody & Pitch)
- **음표 데이터 구조:** `KalimbaNote` 인터페이스 (`pitch`, `solfege`, `numberNotation`, `octaveLevel`, `duration`, `isRest`, `hand`, `tineIndex`, `lyric`)
- **매핑 무결성:**
  - 숫자 악보 `1~7`, 한글 계이름 `도~시`, 영문 음이름 `C4~E6` 파서가 완벽히 연동됨.
  - 110곡 총 3,153개 음표 중 미지원 음높이 **0건 (100% 매핑)**.
- **원곡 일치성 상태:**
  - 공인된 악보와 직접 대조하지 않은 곡은 임의로 원곡과 100% 동일하다고 단정하지 않고 `REVIEW` 상태로 분류함.

### B. 리듬 및 박자 (Rhythm & Timing)
- **BPM 연동:** `beatsPerSecond = (song.tempoBpm / 60) * (speedPercent / 100)` 공식에 따라 60fps 애니메이션 및 오디오 스케줄링과 정확하게 연동됨.
- **쉼표(Rest) 계산:** `note.isRest || note.pitch === 'REST'` 처리 시 폭포수 블록은 렌더링하지 않으면서 `accumulatedBeats += note.duration`으로 정확한 시간 간격 보장.
- **첫 음과 마지막 음:**
  - `INITIAL_LEAD_IN_BEATS = -2.0` 적용으로 2박자 예비박 후 첫 음표가 정확히 타격선에 진입.
  - 마지막 음표 종료 후 2박자의 자연스러운 잔향 대기 후 완주 모달 팝업.
- **폭포수 시각 좌표와 소리 발생 시점 일치:**
  - 타격선 좌표: `STRIKE_LINE_Y_PERCENT% - 28px - (diffBeats * 140px)`
  - `diffBeats === 0`일 때 블록의 중심이 타격선에 정확히 도달하고, 동시에 `audioEngine.playNote()` 발음 및 건반 점등이 일어남.

### C. Web Audio API 음향 시스템 (Synthesis & Dynamics)
- **합성 방식:**
  1. 기음(Fundamental Sine) + 피치 벤드 트랜지언트(타격감 부여)
  2. 고차 배음(Overtone 5.4x)으로 맑고 투명한 쇠막대(Tine) 찰현음 구현
  3. 미세 백색 잡음(Noise Pluck)으로 손톱/골무 탄현 마찰음 합성
  4. 울림통 공명(Wood Body Resonator) 420~460Hz Peaking 필터
  5. 2단 피드백 딜레이 네트워크를 통한 잔향(Ambience Reverb)
- **클리핑 및 음량 합산 방지:**
  - 마스터단에 `DynamicsCompressorNode`(-12dB threshold, 4:1 ratio) 장착으로 여러 음이 동시에 울리거나 빠른 연속 연주 시에도 찌그러짐/클리핑 노이즈 원천 차단.
- **정지/재시작 후 잔향 정리:**
  - `audioEngine.stopAll()` 호출 시 모든 발음 중인 보이스의 Gain을 0.02초 내에 페이드아웃 후 오실레이터를 안전하게 종료하여 찌꺼기 소리 방지.

### D. 17음 C Major 칼림바 음역 호환성
- **프로젝트 표준 조율:** C Major (C4 = 261.63Hz ~ E6 = 1318.51Hz)
- **17건반 좌우 대칭 배치:**
  - 좌측(8건): D6, B5, G5, E5, C5, A4, F4, D4
  - 중앙(1건): C4 (가운데 도, 기준 건반)
  - 우측(8건): E4, G4, B4, D5, F5, A5, C6, E6
- **음역 이탈 여부:** 110곡 전수 조사 결과 C4 아래 또는 E6 위의 음표 0건.

### E. 찬송가 편집기 (Hymn Editor)
- **파싱 지원:** 숫자보(`1~7`), 높은음(`1'~3''`), 쉼표(`0`), 늘임표(`-`), 8분음표(`_`), 가사(`/가사`) 완벽 지원.
- **데이터 보존:** 사용자 추가 찬송가 및 수정본은 `kalimba_custom_hymns_v1` 로컬스토리지에 격리 저장되어 앱 업데이트 시에도 초기화되지 않음.
- **미리듣기 제어:** 토글형 재생/정지 및 모달 닫기 시 타이머 정리 로직 구축 완료.

---

## 4. 110곡 전수 조사 요약 통계

- **총 등록 곡 수:** 110곡 (초급 30, 중급 30, 고급 30, 찬송가 20)
- **유효하지 않은 음표 데이터(FAIL):** **0곡 (0%)**
- **마디 박자 검토 및 원곡 세부 대조 필요(REVIEW):** **110곡 (100%)**
- **17건반 음역 이탈(Out of Range):** **0곡 (0%)**
