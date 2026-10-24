# 💾 Kalimba-MC STEP 02-F: 오프라인 캐시 전략 및 버전 관리 보고서

## 1. 캐시 전략 원칙 (Caching Strategies)

Kalimba-MC는 리소스의 성격과 변경 빈도에 따라 3가지 캐시 전략을 적용합니다:

### 1) 사전 캐시 (Pre-caching on Install)
- **대상**: 앱 진입점(`index.html`), 매니페스트(`manifest.json`), 파비콘(`favicon.svg`), PWA 아이콘(`icons/icon-192.png`, `icons/icon-512.png`, `icons/icon.svg`).
- **전략**: 서비스 워커 설치 시점에 `cache.addAll()`로 다운로드하여 첫 방문 후 즉시 오프라인 준비 완료.

### 2) 앱 셸 네비게이션 전략 (Network-First with Cache Fallback)
- **요청 모드**: `request.mode === 'navigate'` (사용자가 주소창에 URL을 입력하거나 새로고침할 때)
- **동작**:
  1. 온라인 상태이면 네트워크에서 최신 HTML을 가져와 캐시에 저장 후 사용자에게 제공.
  2. 오프라인 상태이면 캐시된 `index.html`을 반환하여 SPA 라우터가 즉시 화면을 구동.

### 3) 정적 자산 및 폰트/스타일 (Cache-First with Stale-While-Revalidate)
- **대상**: Vite 번들 파일(`assets/*.js`, `assets/*.css`), 웹폰트, 이미지
- **동작**:
  1. 캐시에 자원이 있으면 즉시 0ms 레이턴시로 반환.
  2. 백그라운드에서 네트워크 요청을 수행하여 새로운 번들이 존재할 경우 조용히 캐시를 최신화.

---

## 2. 캐시 제외 및 보안 대상 (Non-cacheable Targets)

다음 리소스는 브라우저 캐시에 저장하지 않습니다:
- `chrome-extension://` 등 브라우저 확장 프로그램 요청
- Web Audio API 미디어 스트림 및 마이크 입력
- 외부 API 통신 또는 민감한 개인 세션 요청

---

## 3. 캐시 버전 관리 및 수명 주기

- **캐시 키 포맷**: `kalimba-mc-v{N}` (현재: `kalimba-mc-v1`)
- **버전 교체 흐름**:
  1. 새 버전의 `sw.js`가 배포되면 브라우저가 이를 감지하여 새 서비스 워커 설치.
  2. `activate` 이벤트에서 이전 캐시(`kalimba-mc-v*`)를 탐색하여 현재 버전과 다른 구버전 캐시만 선별 삭제 (`caches.delete(name)`).
  3. **사용자 데이터 보존**: `localStorage`의 찬송가(`kalimba_custom_hymns_v1`), 학습 기록(`kalimba_mc_learning_records_v1`), 스티커 보상(`kalimba-mc-practice-rewards-v1`)은 브라우저 캐시 API와 물리적으로 분리되어 있으므로 **캐시 정리 시에도 100% 안전하게 영구 보존**됩니다.
