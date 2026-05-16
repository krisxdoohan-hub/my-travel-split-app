/**
 * Travel Split App - Service Worker (v0.0.9)
 * 負責離線快取與資源管理 (具備 ERR_FAILED 崩潰防護與網址參數解析)
 */

const CACHE_NAME = 'travel-split-v0.0.8';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 1. 排除所有外部 API 與 CDN，強制走網路連線，徹底避開 CORS 阻擋
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    // 加入 ignoreSearch: true，確保 QR Code 掃描進來的 ?invite= 參數能精準命中 index.html 快取
    caches.match(event.request, { ignoreSearch: true }).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((fetchResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          if (event.request.method === 'GET') {
            cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        });
      });
    }).catch(() => {
      // 終極防護線：確保任何抓取失敗都能回傳標準 Response，徹底消滅 ERR_FAILED
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      return new Response('', { status: 408, statusText: 'Request timeout' });
    })
  );
});
