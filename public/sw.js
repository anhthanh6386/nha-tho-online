/* Service Worker cho Nha Tho Online (PWA).
 * - Cache app shell để mở từ màn hình chính nhanh hơn.
 * - KHÔNG cache Socket.IO / API realtime.
 * - Chạy được thì chạy, lỗi (VD iPhone mở qua http LAN, không phải secure context) thì bỏ qua.
 */
const CACHE = "nhatho-v96";
const SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/style.css?v=96",
  "/client.js?v=96",
  "/server-config.js",
  "/i18n.js?v=96",
  "/socket.io.min.js",
  "/three.module.js",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Realtime: luôn đi mạng, không cache
  if (url.pathname.startsWith("/socket.io/")) return;
  if (e.request.method !== "GET") return;
  // Trang điều hướng: ưu tiên mạng, rớt mạng mới dùng cache
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/index.html")));
    return;
  }
  // File tĩnh: cache trước, thiếu mới tải
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy).catch(() => {}));
          return res;
        })
    )
  );
});
