// Service Worker — ใช้ไฟล์ล่าสุดจากเน็ตก่อนเสมอ (ออฟไลน์จึงใช้ไฟล์ที่เก็บไว้)
const CACHE = 'rotc-v3';
const ASSETS = [
  './', './index.html', './style.css', './app.js', './config.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ไม่ยุ่งกับ API ของ Google Apps Script
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  // ฟอนต์: cache ก่อน
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      c.put(req, res.clone());
      return res;
    }));
    return;
  }

  // ไฟล์ของแอป: โหลดจากเน็ตก่อน ถ้าออฟไลน์ใช้ที่เก็บไว้
  if (url.origin === self.location.origin) {
    e.respondWith(caches.open(CACHE).then(async c => {
      try {
        const res = await fetch(req, { cache: 'no-cache' });
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch (err) {
        return (await c.match(req, { ignoreSearch: true })) || (await c.match('./index.html'));
      }
    }));
  }
});
