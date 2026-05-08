/**
 * Travel Split App - Service Worker (v0.0.0)
 * 負責離線快取與資源管理
 */

const CACHE_NAME = 'travel-split-v0.0.3';

// 定義需要快取的靜態資源
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // 外部 CDN 樣式與腳本庫
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap'
];

// 1. 安裝事件：下載並快取靜態資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // 強制跳過等待，立即啟用新版 SW
});

// 2. 激活事件：清除舊版快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. 攔截請求事件：快取優先策略
self.addEventListener('fetch', (event) => {
  // 排除 GitHub API 請求，確保雲端同步邏輯永遠走網路
  if (event.request.url.includes('api.github.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // 若快取中有資源則回傳，否則發送網路請求
      return response || fetch(event.request).then((fetchResponse) => {
        // 動態快取新請求的資源 (選用)
        return caches.open(CACHE_NAME).then((cache) => {
          // 只快取同網域或常用的樣式庫
          if (event.request.method === 'GET') {
            cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        });
      });
    }).catch(() => {
      // 當完全斷網且無快取時，可回傳自訂離線頁面
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
