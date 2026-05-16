/**
 * Travel Split App - Service Worker (v0.1.1)
 * 【終極隔離版】絕對不干涉外部 CDN 與 GitHub API 連線，徹底解決破圖與阻擋
 */

const CACHE_NAME = 'travel-split-v0.1.1';

self.addEventListener('install', (event) => {
  self.skipWaiting(); // 立即強制接管
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // 暴力清除所有舊版故障快取
      return Promise.all(cacheNames.map((name) => caches.delete(name)));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 【最核心防線】：只要不是本機網址 (例如 Tailwind CDN 或 GitHub API)，Service Worker 絕對不插手！直接讓瀏覽器原生放行！
  if (!event.request.url.startsWith(self.location.origin)) {
    return; 
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request, { ignoreSearch: true })
          .then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return new Response('Offline and no cache found.', { status: 404, statusText: 'Not Found' });
          });
      })
  );
});
