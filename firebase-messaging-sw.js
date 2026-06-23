importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD3ZovcnnW3E5NeKGsLJUGyRFUUBd1mn7Y",
  authDomain: "palpitei-492b0.firebaseapp.com",
  projectId: "palpitei-492b0",
  storageBucket: "palpitei-492b0.firebasestorage.app",
  messagingSenderId: "354175925377",
  appId: "1:354175925377:web:5f297e355b7831c4c86180",
  measurementId: "G-PWZPNCLQMR"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  self.registration.showNotification(notification.title || "Palpitei", {
    body: notification.body || "Tem novidade no Palpitei.",
    icon: data.icon || "icon-192.png",
    badge: data.badge || "icon-192.png",
    tag: data.tag || "palpitei",
    data: { url: data.url || self.registration.scope }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.registration.scope;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url.startsWith(self.registration.scope));
      if (existing) return existing.navigate(url).then(() => existing.focus());
      return clients.openWindow(url);
    })
  );
});
