/**
 * SPDX-License-Identifier: Apache-2.0
 * Elextra Service Worker - Local Image Caching Engine
 */

const CACHE_NAME = "elextra-product-images-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // We only target image requests (both local and from reliable Unsplash/gstatic external CDNs)
  const isImageRequest =
    request.destination === "image" ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)/i) ||
    url.host.includes("unsplash.com") ||
    url.host.includes("gstatic.com") ||
    url.host.includes("google.com");

  if (isImageRequest) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache instantly
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // Clone and save the response to cache
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });

            return networkResponse;
          })
          .catch(() => {
            // Standby local cache match fallback in case of network interruption
            return caches.match(request);
          });
      })
    );
  }
});

// Real-time Push Notification Event Listener for background alerts (even if browser is not open)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const title = payload.title || "Elextra Logistics Alert";
    const options = {
      body: payload.body || "",
      icon: "https://i.postimg.cc/HJM5QXdv/IMG-20251006-160156-858-2.jpg",
      badge: "https://i.postimg.cc/HJM5QXdv/IMG-20251006-160156-858-2.jpg",
      vibrate: [200, 100, 200],
      tag: payload.link?.orderId || payload.link?.jobId || "elextra-push",
      renotify: true,
      data: payload.link || {}
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    // Fallback if payload is plain text instead of JSON
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Elextra Logistics Alert", {
        body: text,
        icon: "https://i.postimg.cc/HJM5QXdv/IMG-20251006-160156-858-2.jpg",
        badge: "https://i.postimg.cc/HJM5QXdv/IMG-20251006-160156-858-2.jpg",
        vibrate: [100, 50, 100]
      })
    );
  }
});

// Interactive Notification Click - route user back to management dashboard
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  // Set target URL (either client app or admin panel based on payload metadata)
  const isTargetingAdmin = event.notification.data?.page || event.notification.data?.tab;
  const targetPath = isTargetingAdmin ? "/admin.html" : "/";
  const urlToOpen = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      // Or open a new tab/window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
