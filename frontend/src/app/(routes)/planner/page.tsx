"use client";

import { useRouter } from "next/navigation";
import { useRoleProtection } from "@/app/hooks/useRoleProtection";
import { useAuth } from "@/app/contexts/AuthContext";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useState, useEffect } from "react";

export default function PlannerDashboard() {
  const router = useRouter();
  // Protect this page for planner role only
  const { loading } = useRoleProtection(["planner"]);
  const { user, logout } = useAuth();
  const { 
    isSupported, 
    isSubscribed, 
    isLoading: isNotificationLoading, 
    error: notificationError, 
    subscribe, 
    unsubscribe 
  } = useNotification();

  // State untuk debug service worker
  const [swStatus, setSwStatus] = useState<string>('Checking...');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);

  useEffect(() => {
    // Periksa status service worker saat komponen dimuat
    checkServiceWorkerStatus();
  }, []);

  // Fungsi untuk memeriksa status service worker
  const checkServiceWorkerStatus = async () => {
    if (!('serviceWorker' in navigator)) {
      setSwStatus('Service Worker tidak didukung di browser ini');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        setSwStatus('Service Worker tidak terdaftar');
        setSwRegistration(null);
        return;
      }
      
      setSwRegistration(registration);
      
      if (registration.active) {
        setSwStatus('Service Worker aktif (scope: ' + registration.scope + ')');
      } else if (registration.installing) {
        setSwStatus('Service Worker sedang diinstal');
      } else if (registration.waiting) {
        setSwStatus('Service Worker menunggu aktivasi');
      } else {
        setSwStatus('Service Worker status tidak diketahui');
      }
    } catch (error) {
      setSwStatus('Error memeriksa Service Worker: ' + (error as Error).message);
      setSwRegistration(null);
    }
  };

  // Fungsi untuk mengirim ping ke service worker
  const pingServiceWorker = async () => {
    if (!swRegistration || !swRegistration.active) {
      alert('Service Worker tidak aktif');
      return;
    }

    try {
      const messageChannel = new MessageChannel();
      
      // Promise untuk menunggu respons
      const responsePromise = new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
      });

      // Kirim pesan ke service worker
      swRegistration.active.postMessage('ping', [messageChannel.port2]);
      
      // Tunggu respons atau timeout setelah 3 detik
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout menunggu respons')), 3000);
      });
      
      const response = await Promise.race([responsePromise, timeoutPromise]);
      alert('Service Worker merespons: ' + JSON.stringify(response));
    } catch (error) {
      alert('Error mengirim ping: ' + (error as Error).message);
    }
  };

  // Fungsi untuk menguji notifikasi lokal
  const testLocalNotification = async () => {
    if (!swRegistration) {
      alert('Service Worker tidak terdaftar');
      return;
    }

    try {
      await swRegistration.showNotification('Notifikasi Uji', {
        body: 'Ini adalah notifikasi uji lokal dari PWA',
        icon: '/pwa-icon.png',
        badge: '/pwa-icon.png'
      });
      alert('Notifikasi uji berhasil dikirim!');
    } catch (error) {
      alert('Error menampilkan notifikasi: ' + (error as Error).message);
    }
  };

  // Fungsi untuk memeriksa konfigurasi iOS
  const checkIOSConfiguration = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isPWA = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    
    let iosVersion = 'N/A';
    if (isIOS) {
      const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
      if (match) {
        iosVersion = match[1] + '.' + match[2] + '.' + (match[3] || '0');
      }
    }
    
    const info = {
      isIOS,
      iosVersion,
      isPWA,
      userAgent: navigator.userAgent,
      protocol: window.location.protocol,
      notificationPermission: 'Notification' in window ? Notification.permission : 'Tidak Didukung',
      timestamp: new Date().toISOString()
    };
    
    setDebugInfo(info);
    setShowDebugPanel(true);
  };

  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };
  
  const goToRoutingPlan = () => {
    router.push("/routingplan");
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Planner Dashboard</h1>
        <div className="flex items-center gap-4">
          <span>Welcome, {user?.name}</span>
          <button 
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={goToRoutingPlan}
          className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 shadow-md flex items-center"
        >
          <span>Go to Routing Plan</span>
        </button>
        {/* Add other action buttons here */}
      </div>
      
      {/* Notification Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Notifikasi</h2>
        
        {!isSupported ? (
          <div className="p-4 bg-yellow-100 rounded-md mb-4">
            <p className="text-yellow-800">
              Browser Anda tidak mendukung notifikasi push. Silakan gunakan browser modern seperti Chrome, Firefox, Edge, atau Safari terbaru.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4">
              {isSubscribed 
                ? "Anda telah mengaktifkan notifikasi push. Anda akan menerima pemberitahuan penting terkait perencanaan rute dan jadwal."
                : "Aktifkan notifikasi push untuk menerima pemberitahuan penting terkait perencanaan rute dan jadwal."}
            </p>
            
            <button
              onClick={handleToggleSubscription}
              disabled={isNotificationLoading}
              className={`px-4 py-2 rounded-md ${
                isNotificationLoading 
                  ? 'bg-gray-300 cursor-wait' 
                  : isSubscribed 
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isNotificationLoading 
                ? 'Memproses...' 
                : isSubscribed 
                  ? 'Nonaktifkan Notifikasi' 
                  : 'Aktifkan Notifikasi'}
            </button>
            
            {notificationError && (
              <p className="text-red-500 text-sm mt-3">{notificationError}</p>
            )}
            
            {isSubscribed && (
              <div className="mt-4 p-4 bg-green-100 rounded-md">
                <p className="text-green-800">
                  ✓ Notifikasi aktif
                </p>
              </div>
            )}
          </>
        )}
        
        <div className="mt-6 p-4 bg-gray-100 rounded-md">
          <h3 className="font-medium mb-2">Informasi tentang Notifikasi Planner</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700">
            <li className="mb-1">Notifikasi perubahan jadwal dan rute</li>
            <li className="mb-1">Pemberitahuan tentang permintaan persetujuan rute</li>
            <li className="mb-1">Update status pengiriman penting</li>
            <li className="mb-1">Pengumuman penting dari management</li>
            <li>Anda dapat menonaktifkan notifikasi kapan saja</li>
          </ul>
        </div>
      </div>
      
      {/* Service Worker Debug Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Service Worker Diagnostik</h2>
          <button 
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            {showDebugPanel ? 'Sembunyikan Detail' : 'Tampilkan Detail'}
          </button>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-md mb-4">
          <p className="text-blue-800 mb-2">
            <strong>Status Service Worker:</strong> {swStatus}
          </p>
          <p className="text-sm text-blue-600">
            Status ini menunjukkan apakah service worker untuk notifikasi terdaftar dan aktif.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={checkServiceWorkerStatus}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Periksa Ulang Status
          </button>
          
          <button
            onClick={pingServiceWorker}
            className={`px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm ${
              (!swRegistration || !swRegistration.active) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={!swRegistration || !swRegistration.active}
          >
            Ping Service Worker
          </button>
          
          <button
            onClick={testLocalNotification}
            className={`px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm ${
              !swRegistration ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={!swRegistration}
          >
            Uji Notifikasi Lokal
          </button>
          
          <button
            onClick={checkIOSConfiguration}
            className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
          >
            Periksa Konfigurasi iOS
          </button>
        </div>
        
        {showDebugPanel && debugInfo && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="font-medium mb-2">Informasi Debug</h3>
            <div className="text-xs font-mono overflow-x-auto">
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          </div>
        )}
        
        <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
          <h3 className="font-medium mb-2 text-yellow-800">Petunjuk iOS Safari</h3>
          <ul className="list-disc pl-5 text-sm text-yellow-700">
            <li className="mb-1">Pastikan perangkat iOS menggunakan versi 16.4 atau lebih baru</li>
            <li className="mb-1">Aplikasi harus telah ditambahkan ke Home Screen sebagai PWA</li>
            <li className="mb-1">Buka aplikasi PWA dari icon di Home Screen, bukan dari browser Safari</li>
            <li className="mb-1">Pastikan notifikasi diizinkan di Settings &gt; [Nama App] &gt; Notifications</li>
            <li>Jika notifikasi masih tidak muncul, coba restart perangkat iOS</li>
          </ul>
        </div>
      </div>
      
      {/* Tambahkan konten dashboard lainnya di sini */}
    </div>
  );
}