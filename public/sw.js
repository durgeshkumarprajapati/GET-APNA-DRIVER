// Get Apna Driver - Web Push Service Worker
self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Get Apna Driver';
    const options = {
      body: payload.body || 'You have a new update.',
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      data: payload.data || {},
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error handling web push event', err);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/notifications';

  if (data.bookingId) {
    targetUrl = `/bookings/${data.bookingId}`;
  } else if (data.paymentId) {
    targetUrl = `/payments/${data.paymentId}`;
  } else if (data.type === 'BOOKING_DRIVER_OFFERED') {
    targetUrl = '/driver/incoming-bookings';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});
