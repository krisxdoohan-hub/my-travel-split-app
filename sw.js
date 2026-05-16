/**
 * Travel Split App - Service Worker (v0.1.0)
 * 【安全重構版】全面改採 Network-First (網路優先) 策略，徹底杜絕 ERR_FAILED 崩潰
 */

const CACHE_NAME = 'travel-split-v0.1.0';

self.addEventListener('install', (event) => {
  self.skipWaiting(); // 立即強制接管，不再等待舊版
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // 暴力清除所有舊版故障快取，保證從零開始
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // 絕對安全策略：永遠先嘗試連線網路抓最新檔案
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 網路正常：把最新檔案備份到快取中
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // 網路斷線：此時才嘗試讀取快取 (並忽略 ?invite= 網址參數)
        return caches.match(event.request, { ignoreSearch: true })
          .then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // 連快取都沒有：給予標準的安全回應，防止瀏覽器出現 ERR_FAILED
            return new Response('Offline and no cache found.', { status: 404, statusText: 'Not Found' });
          });
      })
  );
});
