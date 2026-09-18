// Get Apna Driver - Web Push Service Worker
//
// -----------------------------------------------------------------------
// OS / browser background-execution constraints (read before debugging a
// "push worked but no notification appeared" report — this is almost
// always one of these, not a bug in this file):
//
// - Once the user force-quits the browser process (not just closes the
//   window) or the OS kills it under memory pressure, NO push event can
//   reach this worker at all until the browser process runs again — this
//   is enforced by the OS's push service (FCM/APNs/Mozilla Push), not by
//   this script, and there is no code-level workaround.
// - macOS: "App Nap" / aggressive power-saving can delay (rarely, for
//   minutes) when a backgrounded browser process wakes to handle a push,
//   especially on battery. The push itself is queued by the OS push
//   service and still delivered once the process wakes.
// - iOS/iPadOS Safari (16.4+) only delivers Web Push to a site that has
//   been added to the Home Screen as a PWA — a push subscription created
//   from an ordinary Safari tab is accepted by pushManager.subscribe()
//   but Apple's push service will never actually deliver to it. This
//   project has no web app manifest yet, so iOS users cannot receive
//   these pushes until that's added and the user adds the app to their
//   Home Screen.
// - Android/Chrome/Windows/Linux: once subscribed, the browser's push
//   service wakes this worker for a push even with every browser window
//   closed, as long as the browser isn't force-stopped/uninstalled and
//   the OS hasn't force-stopped the browser's background app permission
//   (Android battery optimization settings can do this per-app).
// - If the user revokes notification permission at the OS/browser level
//   after subscribing, pushes still arrive at this worker but
//   showNotification() silently no-ops — there is no event this worker
//   receives to detect that; the frontend must re-check
//   Notification.permission on its own.
// -----------------------------------------------------------------------

const DEFAULT_TITLE = 'Get Apna Driver';
const DEFAULT_BODY = 'You have a new update.';
const DEFAULT_ICON = '/icon-192.png';
const DEFAULT_BADGE = '/badge-72.png';
const DEFAULT_URL = '/notifications';

self.addEventListener('push', function (event) {
  // event.waitUntil() is what keeps this worker alive long enough for
  // showNotification() to actually render — without it, the browser is
  // free to terminate the worker the instant this handler returns, which
  // can (and does, intermittently) race ahead of an async
  // showNotification() call and silently drop the notification. Every
  // code path below — including the parse-failure fallback — resolves
  // through this single promise so that guarantee always holds.
  event.waitUntil(handlePush(event));
});

async function handlePush(event) {
  const payload = parsePushPayload(event.data);

  const title = payload.title || DEFAULT_TITLE;
  const options = {
    body: payload.body || DEFAULT_BODY,
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_BADGE,
    data: payload.data || {},
    // Tagged notifications replace one another in the OS tray instead of
    // stacking (see PushPayload.tag on the server) — omit the option
    // entirely rather than pass tag: undefined, since some browsers treat
    // an explicit undefined differently from an absent key.
    ...(payload.tag ? { tag: payload.tag, renotify: true } : {}),
  };

  try {
    return await self.registration.showNotification(title, options);
  } catch (err) {
    // showNotification() itself can reject (e.g. permission revoked at the
    // OS level after subscribing) — log for diagnostics, but there is
    // nothing further this worker can do about it.
    console.error('showNotification failed', err);
  }
}

/**
 * Reliably extracts a usable payload from a PushEvent, regardless of what
 * actually arrived on the wire:
 *   1. Well-formed JSON (the normal case, from push-provider.ts) — parsed
 *      directly.
 *   2. Non-JSON text (some third-party push senders, or a malformed
 *      payload) — used as the notification body rather than discarded.
 *   3. No data at all, or JSON that isn't an object — falls back to the
 *      DEFAULT_* constants above, so the user still sees *something*
 *      rather than nothing.
 */
function parsePushPayload(pushMessageData) {
  if (!pushMessageData) return {};

  try {
    const json = pushMessageData.json();
    return json && typeof json === 'object' ? json : {};
  } catch {
    try {
      const text = pushMessageData.text();
      return text ? { body: text } : {};
    } catch (err) {
      console.error('Failed to read push event data', err);
      return {};
    }
  }
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const data = event.notification.data || {};

  // actionUrl is resolved server-side per notification (see
  // notification-service.ts) and is authoritative when present — it knows
  // about routing rules (e.g. role-specific driver vs. customer links)
  // this worker has no way to re-derive on its own. The bookingId/paymentId/
  // type checks below only exist as a fallback for older queued
  // notifications sent before actionUrl was included in the push payload.
  let targetUrl = data.actionUrl || DEFAULT_URL;

  if (!data.actionUrl) {
    if (data.bookingId) {
      targetUrl = `/bookings/${data.bookingId}`;
    } else if (data.paymentId) {
      targetUrl = `/payments/${data.paymentId}`;
    } else if (data.type === 'BOOKING_DRIVER_OFFERED') {
      targetUrl = '/driver/incoming-bookings';
    }
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

// Browsers occasionally invalidate/rotate a push subscription outside of
// any action by this app (subscription expiry, browser-side key rotation,
// or the OS restoring a backup on a new device) and fire this event
// instead of just silently failing future pushes. Without handling it, the
// old subscription's endpoint is dead but the server keeps sending to it
// forever, and the user sees pushes quietly stop with no error anywhere.
self.addEventListener('pushsubscriptionchange', function (event) {
  event.waitUntil(resubscribe(event));
});

async function resubscribe(event) {
  try {
    const oldEndpoint = event.oldSubscription ? event.oldSubscription.endpoint : null;
    const applicationServerKey = event.oldSubscription
      ? event.oldSubscription.options.applicationServerKey
      : undefined;

    const newSubscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const p256dhKey = newSubscription.getKey('p256dh');
    const authKey = newSubscription.getKey('auth');
    if (!p256dhKey || !authKey) return;

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: newSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(p256dhKey),
          auth: arrayBufferToBase64(authKey),
        },
      }),
    });

    if (oldEndpoint && oldEndpoint !== newSubscription.endpoint) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: oldEndpoint }),
      }).catch(() => {
        // Best-effort cleanup only — the new subscription above is what
        // actually matters for future deliveries.
      });
    }
  } catch (err) {
    console.error('Failed to resubscribe after pushsubscriptionchange', err);
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
