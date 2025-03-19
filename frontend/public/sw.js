// Service Worker untuk Push Notifications

// Logging untuk debugging
console.log('Service Worker loaded');

// Listener untuk install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  // Aktifkan service worker segera tanpa menunggu
  self.skipWaiting();
});

// Listener untuk activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  // Mengambil alih klien yang belum dikontrol
  event.waitUntil(clients.claim());
  console.log('Service Worker activated and claimed clients');
});

// Listener untuk push event
self.addEventListener('push', function(event) {
  console.log('Push event received');
  
  if (event.data) {
    try {
      // Parse data JSON
      // Safari sometimes sends data as text, so handle both cases
      let data;
      try {
        data = event.data.json();
      } catch (e) {
        // Handle case where data might be plain text
        const textData = event.data.text();
        try {
          data = JSON.parse(textData);
        } catch (e2) {
          data = { title: 'New Notification', body: textData };
        }
      }
      
      console.log('Push data received:', data);
      
      // Kirim data notifikasi ke semua client yang terbuka
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'notification',
            payload: data
          });
        });
      });
      
      // Buat opsi notifikasi
      const options = {
        body: data.message || 'Notification',
        icon: 'https://192.168.0.139:3000/pwa-icon.png', // Ganti dengan path ke icon aplikasi Anda
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/',
          payload: data // Simpan data lengkap untuk diakses nanti
        },
        // Safari dan iOS specific options
        badge: 'https://192.168.0.139:3000/pwa-icon.png', // Sekarang hanya sekali
        timestamp: Date.now(),
        // Pastikan notifikasi tetap terlihat sampai user mengklik/menutupnya
        requireInteraction: true,
        tag: 'notification-' + Date.now(),
        renotify: true,
        silent: false,
        // Tambahkan actions jika perlu
        actions: data.actions || []
      };
      
      // Tampilkan notifikasi
      console.log('Showing notification with title:', data.title);
      event.waitUntil(
        self.registration.showNotification(data.title || 'Notification', options)
          .then(() => {
            console.log('Notification shown successfully');
            // Simpan notifikasi terakhir untuk referensi
            self.lastNotification = data;
          })
          .catch(err => {
            console.error('Error showing notification:', err);
          })
      );
    } catch (err) {
      console.error('Error parsing notification data:', err);
      
      // Fallback jika parsing gagal
      event.waitUntil(
        self.registration.showNotification('New Notification', {
          body: 'You have a new notification',
          icon: 'https://192.168.0.139:3000/pwa-icon.png',
          badge: 'https://192.168.0.139:3000/pwa-icon.png'
        })
        .then(() => {
          console.log('Fallback notification shown');
        })
        .catch(err => {
          console.error('Error showing fallback notification:', err);
        })
      );
    }
  } else {
    console.warn('Push event received but no data');
    
    // Safari sometimes sends empty push notifications to wake up the service worker
    // Show a default notification in this case
    event.waitUntil(
      self.registration.showNotification('New Notification', {
        body: 'You have a new update',
        icon: 'https://192.168.0.139:3000/pwa-icon.png',
        badge: 'https://192.168.0.139:3000/pwa-icon.png'
      })
    );
  }
});

// Menangani klik pada notifikasi
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked');
  event.notification.close();
  
  // Dapatkan data payload dari notifikasi jika ada
  const notificationData = event.notification.data;
  console.log('Notification data:', notificationData);
  
  // Buka URL jika ada dalam data notifikasi
  const urlToOpen = notificationData && notificationData.url ? notificationData.url : '/';
  
  console.log('Opening URL:', urlToOpen);
  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true})
      .then(function(clientList) {
        // Cek apakah ada client yang sudah terbuka
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            // Kirim notifikasi ke client bahwa notifikasi telah diklik
            client.postMessage({
              type: 'notificationClicked',
              payload: notificationData ? notificationData.payload : null
            });
            return client.focus();
          }
        }
        
        // Jika tidak ada client yang terbuka, buka tab baru
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch(err => {
        console.error('Error handling notification click:', err);
      })
  );
});

// Menangani notifikasi ditutup tanpa diklik
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed without being clicked');
});

// Listen for messages from the client
self.addEventListener('message', function(event) {
  console.log('Message received from client:', event.data);
  
  // Jika pesan adalah perintah untuk mengirim ping ke server
  if (event.data === 'ping') {
    // Respond to confirm service worker is active
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({status: 'Service worker is active'});
    } else {
      // Fallback jika MessageChannel tidak digunakan
      event.source.postMessage({status: 'Service worker is active'});
    }
  }
  
  // Handle permintaan untuk mengecek notifikasi terbaru
  if (event.data && event.data.type === 'checkNotifications') {
    console.log('Client requested to check for recent notifications');
    
    // Kirim notifikasi terakhir (jika ada dalam memori)
    if (self.lastNotification) {
      event.source.postMessage({
        type: 'notification',
        payload: self.lastNotification
      });
    }
  }
});

// Debugging - log ketika pertama kali di-load
console.log('Service Worker registration successful with scope');