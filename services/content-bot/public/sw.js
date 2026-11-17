// Shows a phone alert. The alert has NO message content on purpose: the text stays inside the app.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (e) => {
  e.waitUntil(self.registration.showNotification('تعديل نصوص الموقع', {
    body: 'لديك رسالة جديدة. افتح التطبيق.', icon: '/icon-192.png', badge: '/icon-192.png', tag: 'new', renotify: true, lang: 'ar', dir: 'rtl',
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('/');
  }));
});
