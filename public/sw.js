// Minimal service worker: makes KhaoJi installable. No offline caching in the MVP
// (orders must always be live), so every request goes straight to the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
