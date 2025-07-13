const CACHE_VERSION = 'v1';
const CACHE_NAME = `ironpath-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-180x180.png?v=3',
  // Add other static assets here
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      fetch(event.request)
        .then(response => {
          cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cache.match(event.request).then(res => res || cache.match('/')))
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Allow the page to trigger immediate activation
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'workout-sync') {
    event.waitUntil(syncWorkoutData());
  }
});

async function syncWorkoutData() {
  try {
    // Implement background sync logic here
    console.log('Syncing workout data...');
    
    // Get offline data from IndexedDB
    const offlineData = await getOfflineData();
    
    // Sync with server when online
    if (navigator.onLine && offlineData.length > 0) {
      await syncWithServer(offlineData);
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function getOfflineData() {
  // Placeholder for IndexedDB operations
  return [];
}

async function syncWithServer(data) {
  // Placeholder for server sync
  console.log('Syncing data with server:', data);
}

// Push notifications (optional)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-180x180.png?v=3',
      badge: '/icon-180x180.png?v=3',
      actions: [
        {
          action: 'open',
          title: 'Open App'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
