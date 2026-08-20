/// <reference lib="webworker" />

// PROPOS PWA Service Worker — Offline-first
// Cache name: propos-v1
// Strategies:
//   - Navigation requests: Network-first, fall back to cache
//   - API calls (/api/): Always network (no cache for data)
//   - Static assets (images, fonts, js, css): Cache-first with 30-day expiry

const CACHE_NAME = 'propos-v1';

// Pre-cache the app shell on install
const PRECACHE_URLS = [
  '/',
];

// 30 days in seconds
const STATIC_MAX_AGE = 30 * 24 * 60 * 60;

// ── Install: pre-cache shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[PROPOS SW] Instalando service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PROPOS SW] Pre-cargando shell de la aplicación');
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[PROPOS SW] Algunas URLs de precarga fallaron, continuando...', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches and claim clients ─────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[PROPOS SW] Activando service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name.startsWith('propos-'))
          .map((name) => {
            console.log('[PROPOS SW] Eliminando caché antigua:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ── Helper: is static asset (images, fonts, js, css) ─────────────────────
function isStaticAsset(url) {
  const pathname = url.pathname;
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/_next/image') ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|avif)$/i) ||
    pathname.match(/\.(woff2?|ttf|otf|eot)$/i) ||
    pathname.match(/\.(css|js)$/i)
  );
}

// ── Helper: is API call ───────────────────────────────────────────────────
function isApiCall(url) {
  return url.pathname.startsWith('/api/');
}

// ── Helper: is navigation request ────────────────────────────────────────
function isNavigation(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  );
}

// ── Strategy: Network-first for navigation (fall back to cache) ──────────
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[PROPOS SW] Red no disponible, sirviendo desde caché:', request.url);
      return cached;
    }
    // No cache either — return a minimal offline page
    return new Response(
      '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PROPOS — Sin conexión</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#333;background:#FDFBF7;text-align:center;padding:1rem}h1{color:#1B4332}p{color:#666}</style></head><body><div><h1>Sin conexión</h1><p>No hay conexión a internet. Por favor verifica tu conexión e intenta de nuevo.</p></div></body></html>',
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}

// ── Strategy: Network-only for API calls ─────────────────────────────────
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (err) {
    return new Response(
      JSON.stringify({
        fueraDeLinea: true,
        error: 'No hay conexión a internet. Los datos se guardaron localmente y se sincronizarán automáticamente.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ── Strategy: Cache-first for static assets (30-day expiry) ──────────────
async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Check cache age
    const dateHeader = cached.headers.get('sw-cache-timestamp');
    if (dateHeader) {
      const cachedAt = new Date(dateHeader).getTime();
      const ageSeconds = (Date.now() - cachedAt) / 1000;
      if (ageSeconds > STATIC_MAX_AGE) {
        // Expired — re-fetch in background
        fetch(request).then((response) => {
          if (response.ok) {
            const newResponse = response.clone();
            const headers = new Headers(newResponse.headers);
            headers.set('sw-cache-timestamp', new Date().toISOString());
            const body = await newResponse.blob();
            const timestamped = new Response(body, { headers });
            caches.open(CACHE_NAME).then((cache) => cache.put(request, timestamped));
          }
        });
      }
    }
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set('sw-cache-timestamp', new Date().toISOString());
      const body = await response.clone().blob();
      const timestamped = new Response(body, { status: response.status, statusText: response.statusText, headers });
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, timestamped);
      return response;
    }
    return response;
  } catch (err) {
    return new Response('Sin conexión', { status: 503 });
  }
}

// ── Main fetch handler ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip non-http(s) protocols
  if (!url.protocol.startsWith('http')) return;

  // API calls — always network, no cache
  if (isApiCall(url)) {
    event.respondWith(networkOnly(request));
    return;
  }

  // Navigation requests — network-first, fall back to cache
  if (isNavigation(request)) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Static assets — cache-first with 30-day expiry
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  // Default: network-first for anything else
  event.respondWith(networkFirstNavigation(request));
});

// ── Message handler ──────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
