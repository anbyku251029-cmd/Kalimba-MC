# 🌐 Kalimba-MC STEP 02-F: Vercel 및 GitHub Pages 배포 호환성 검증 보고서

## 1. 개요
본 문서는 Kalimba-MC의 두 가지 주요 배포 환경인 **Vercel Production (루트 도메인 `/`)**과 **GitHub Pages (서브디렉토리 `/Kalimba-MC/`)**에서 PWA 서비스 워커와 Manifest가 충돌 없이 완벽하게 동작하도록 구성한 호환성 설계를 정리합니다.

---

## 2. 배포 환경별 비교 및 상대 경로 전략

| 구성 요소 | Vercel 환경 | GitHub Pages 환경 | Kalimba-MC 호환 설계 |
| :--- | :--- | :--- | :--- |
| **호스팅 경로** | 루트 (`/`) | 서브패스 (`/Kalimba-MC/`) | `vite.config.ts`: `base: process.env.VERCEL ? '/' : './'` |
| **Manifest `start_url`** | `/` 필요 | `/Kalimba-MC/` 필요 | **`"./"` (상대 경로)**: 현재 실행 위치를 기준으로 자동 대응 |
| **Manifest `scope`** | `/` 필요 | `/Kalimba-MC/` 필요 | **`"./"` (상대 경로)** |
| **서비스 워커 등록 URL** | `/sw.js` | `/Kalimba-MC/sw.js` | **`navigator.serviceWorker.register('./sw.js')`** |
| **SPA 라우팅/새로고침** | `vercel.json`의 rewrites | `404.html` 또는 Hash/PWA 캐시 | Vercel rewrite 규칙 적용 및 SW 오프라인 네비게이션 폴백 제공 |

---

## 3. Web App Manifest 상대 경로 검증

```json
{
  "name": "우리 아이 칼림바 음악 교실",
  "short_name": "칼림바 교실",
  "start_url": "./",
  "scope": "./",
  "icons": [
    {
      "src": "./icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "./icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```
- `./` 상대 경로를 사용함으로써 Vercel에서는 `https://domain.com/`으로 해석되고, GitHub Pages에서는 `https://username.github.io/Kalimba-MC/`로 유연하게 자동 해석됩니다.

---

## 4. HTTPS 및 보안 헤더
- Vercel 및 GitHub Pages 모두 기본적으로 무료 자동 HTTPS 인증서(SSL/TLS)를 제공하므로, PWA 서비스 워커의 필수 보안 전제 조건(`navigator.serviceWorker`는 HTTPS 또는 localhost에서만 동작)을 100% 만족합니다.
