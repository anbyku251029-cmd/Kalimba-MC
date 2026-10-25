# STEP 03-A: 화음·양손 연주 워터폴 시스템 고도화 초기 조사 보고서

## 1. 개요 및 목적

- **문서명**: `step03a-initial-system-audit.md`
- **프로젝트명**: 우리 아이 칼림바 음악 교실 (Kalimba-MC)
- **작업 단계**: STEP 03-A (Chord & Two-Hand Waterfall Learning System)
- **핵심 목적**: 기존 단선율 워터폴 게임, 오디오 엔진, 곡 데이터베이스, 리듬 판정 및 학습 세션 기록을 정밀 조사하여 화음(2음 이상 동시 연주) 및 양손 가이드 기능을 하위 호환성을 완벽히 유지하면서 추가할 수 있는 아키텍처를 수립합니다.

---

## 2. 기존 코드 및 모듈 조사 결과

| 모듈 경로 | 현재 구현 상태 | 화음 및 양손 확장을 위한 최소 변경 요건 |
|---|---|---|
| `src/types/music.ts` | `KalimbaNote` (id, pitch, duration, hand, tineIndex 등) | • `chordId?: string`<br>• `isSimultaneousWithPrevious?: boolean` (이전 음과 동시 시작 여부)<br>• `chordPitches?: string[]` (화음 구성음) |
| `src/utils/musicTiming.ts` | `currentBeat += durationBeats` 단선율 순차 누적 | • `isSimultaneousWithPrevious === true`인 음표는 `currentBeat`를 증가시키지 않고 이전 음과 동일한 `startBeat` 부여<br>• 동일 `startBeat`의 음표들을 `chordGroupId`로 그룹핑 |
| `src/utils/audioEngine.ts` | `playNote` (Additive Synthesis 비조화 배음 합성, Master Gain, Compressor) | • `playChord(pitches: string[], ...)` 메서드 추가<br>• 동시 발음 시 음량 과도 증폭 방지를 위한 다이내믹 게인 정규화 ($1 / \sqrt{N}$)<br>• Web Audio API의 독립 오실레이터 특성으로 다성음(Polyphony) 완벽 지원 |
| `src/utils/rhythmJudge.ts` | `RhythmJudgeManager` (단일 음표 대상 PERFECT/GREAT/MISS) | • 화음 그룹(동일 시점 복수 음표) 완주 판정 로직 추가<br>• 모든 화음 구성음 정타 시 `CHORD_PERFECT` 보너스 및 부분 성공(`PARTIAL`) 판정 지원 |
| `src/components/KalimbaGameWaterfall.tsx` | Canvas/DOM 기반 워터폴 낙하 및 17건반 렌더링 | • 동일 시점 화음 음표를 잇는 **네온 연결 브릿지(Chord Bridge Bar)** 렌더링<br>• 양손 가이드: `[L 왼손]` / `[R 오른손]` 손잡이 뱃지 표시<br>• 상단 컨트롤 바에 `[단선율 모드] / [화음·양손 모드]` 전환 토글 추가 |
| `src/data/songs.ts` | 초급 30, 중급 30, 고급 30, 찬송가 21 = 111곡 카탈로그 | • 기존 111곡은 단선율 데이터(`isSimultaneousWithPrevious` 미설정)로 100% 원형 유지<br>• 신규 화음 교육용 3곡(`chordSongs.ts`)을 독립 모듈로 추가 |

---

## 3. 하위 호환성 및 안전성 분석

1. **기존 111곡 무결성 보존**:
   - 기존 곡의 음표들은 `isSimultaneousWithPrevious`가 `undefined`이므로 타임라인 계산 시 기존과 100% 동일하게 순차적으로 진행됩니다.
2. **오디오 엔진 리소스 누수 방지**:
   - `playChord` 호출 시 기존 오디오 컨텍스트(`ctx`) 및 마스터 컴프레서를 재사용하며, 각 화음 음표의 엔벨로프가 종료되면 자동으로 노드가 해제됩니다.
3. **터치 및 멀티터치 컨트롤러 (`kalimbaTouchController.ts`)**:
   - 이미 Pointer Events 기반의 멀티터치 컨트롤러가 구축되어 있어, 화면에서 두 손가락으로 동시에 다른 건반을 터치해도 누락 없이 동시 이벤트가 트리거됩니다.

---

## 4. 결론 및 구현 진행 계획

기존 아키텍처가 매우 견고하게 모듈화되어 있어 대규모 구조 변경 없이 타입 확장과 타임라인 그룹핑, 화음 판정기 확장을 통해 안정적으로 화음 및 양손 연주 시스템을 구축할 수 있습니다.
다음 단계로 `src/types/chordTypes.ts`를 정의하고 `musicTiming.ts`와 `audioEngine.ts`를 고도화합니다.
