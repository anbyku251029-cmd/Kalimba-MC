# 🔒 Kalimba-MC STEP 02-E: 데이터 저장 구조, 개인정보 보호 및 내보내기/삭제 정책

## 1. 개요
본 문서는 Kalimba-MC의 학습 기록 저장 방식, 버전 스키마 관리, 개인정보 보호 원칙, 그리고 데이터 내보내기(CSV/JSON) 및 삭제 정책을 설명합니다.

---

## 2. 저장소 아키텍처 및 스키마 버전 관리

- **저장소 키**: `kalimba_mc_learning_records_v1`
- **저장 매체**: 브라우저 로컬 스토리지 (`localStorage`)
- **버전 스키마 (`SCHEMA_VERSION: 1`)**:
```json
{
  "version": 1,
  "sessions": [
    {
      "id": "session_1740000000_abc",
      "songId": "beginner-1",
      "songTitle": "반짝반짝 작은별",
      "difficulty": "쉬움",
      "speedPercent": 70,
      "startTime": 1740000000000,
      "endTime": 1740000045000,
      "practiceDurationSec": 45,
      "status": "COMPLETED",
      "isCompleted": true,
      "score": 950,
      "accuracyPercent": 98,
      "maxCombo": 14,
      "perfectCount": 12,
      "greatCount": 2,
      "missCount": 0,
      "createdAt": 1740000000000,
      "updatedAt": 1740000045000
    }
  ],
  "goals": {
    "dailyGoalMinutes": 10
  },
  "lastUpdated": 1740000045000
}
```

> [!NOTE]
> 서버나 SQLite 데이터베이스가 연결되어 있지 않은 순수 프런트엔드 환경이므로, 사용자가 브라우저 캐시나 사이트 데이터를 삭제하면 기록이 함께 지워질 수 있음을 대시보드에서 명확히 고지합니다.

---

## 3. 개인정보 보호 원칙 (Privacy by Design)

1. **불필요한 개인 식별 정보 배제**:
   - 어린이의 실명, 생년월일, 성별, 주소, 학교명 등 개인정보를 일절 입력받거나 요구하지 않습니다.
2. **외부 서버/AI 전송 없음**:
   - 학습 기록은 100% 사용자의 기기 브라우저 로컬 저장소에만 보관되며, 어떠한 외부 트래커나 분석 서버로도 전송되지 않습니다.
3. **오디오 녹음과의 분리**:
   - STEP 02-B에서 생성된 연주 WAV 파일은 파일 시스템으로 직접 다운로드되며, 학습 기록 텍스트 데이터와 물리적으로 분리되어 관리됩니다.

---

## 4. 데이터 내보내기 및 CSV 수식 주입 방어 (CSV Injection Defense)

### 1) CSV 스프레드시트 내보내기
학부모가 엑셀이나 구글 스프레드시트에서 열어볼 수 있도록 UTF-8 BOM(`\uFEFF`)을 적용한 CSV 다운로드 기능을 제공합니다.

### 2) CSV Formula Injection 방어
악의적이거나 특이한 곡명(예: `=CMD()`, `+123`, `@SUM`)이 엑셀에서 임의의 수식이나 매크로로 실행되는 것을 방지하기 위해 다음 정규화 규칙을 적용합니다:
```typescript
let safeTitle = s.songTitle;
if (/^[=+\-@]/.test(safeTitle)) {
  safeTitle = `'${safeTitle}`; // 작은따옴표로 이스케이프하여 단순 텍스트로 강제 변환
}
safeTitle = `"${safeTitle.replace(/"/g, '""')}"`;
```

### 3) JSON 전체 백업
기기를 변경하거나 브라우저를 초기화하기 전에 부모님이 언제든 학습 기록 전체를 JSON 파일로 백업할 수 있도록 지원합니다.

---

## 5. 데이터 삭제 정책

1. **개별 기록 삭제**:
   - 특정 세션 카드 우측의 휴지통 아이콘 클릭 ➔ 부모님 확인 대화상자 ➔ 해당 세션 즉시 삭제 및 통계 재계산.
2. **전체 기록 초기화**:
   - [기록 초기화] 버튼 클릭 ➔ "정말 모든 연습 기록을 삭제하시겠습니까?" 경고창 확인 ➔ 로컬 스토리지의 학습 데이터 즉시 완전 소거.
