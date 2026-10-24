/**
 * sw.js - Service Worker
 * Kalimba-MC STEP 02-F: PWA 오프라인 학습 지원 및 캐시 엔진
 */

const CACHE_NAME = 'kalimba-mc-v1';

// 사전 캐시 대상 핵심 앱 셸 및 자산 목록
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
];

// 1. 설치 (Install) 이벤트
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // 새 서비스 워커가 대기하지 않고 즉시 활성화 준비
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[ServiceWorker] Pre-cache failed:', err);
      })
  );
});

// 2. 활성화 (Activate) 이벤트 - 이전 구버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            // 현재 버전이 아닌 이전 kalimba-mc 캐시 정리
            if (name.startsWith('kalimba-mc-') && name !== CACHE_NAME) {
              return caches.delete(name);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => {
        // 현재 열려 있는 모든 클라이언트 탭을 즉시 제어
        return self.clients.claim();
      })
  );
});

// 3. 네트워크 요청 가로채기 (Fetch) - 오프라인 지원
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // GET 요청만 캐싱
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Chrome Extension, dev server sockjs, data URL 등 제외
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // SPA 네비게이션 요청 (HTML 페이지 이동) 처리
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // 온라인이면 캐시에 최신 index.html 업데이트 후 반환
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => {
          // 오프라인이면 사전 캐시된 index.html 반환
          return caches.match('./index.html').then((cachedResponse) => {
            return cachedResponse || caches.match('/');
          });
        })
    );
    return;
  }

  // 정적 리소스 (JS, CSS, 폰트, 이미지 등) - Cache-First with Network Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // 백그라운드에서 조용히 최신 버전으로 캐시 갱신 (Stale-While-Revalidate)
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
          })
          .catch(() => {
            // 오프라인 상태일 때는 백그라운드 갱신 에러 무시
          });
        return cachedResponse;
      }

      // 캐시에 없으면 네트워크에서 가져온 뒤 캐시에 저장
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
            return networkResponse;
          }
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return networkResponse;
        })
        .catch((err) => {
          // 오프라인에서 리소스 없을 때 이미지 폴백 등
          if (request.destination === 'image') {
            return caches.match('./favicon.svg');
          }
          throw err;
        });
    })
  );
});
