"use client";

import { useState, useEffect } from "react";
import { useRoleProtection } from "@/app/hooks/useRoleProtection";
import { useAuth } from "@/app/contexts/AuthContext";
import { useNotification } from "@/app/contexts/NotificationContext";

// Definisikan interface untuk notifikasi
interface Notification {
  title?: string;
  message?: string;
  body?: string;
  url?: string;
  receivedAt: string;
  [key: string]: any; // Untuk properti tambahan yang mungkin ada
}

export default function DriverDashboard() {
  // Protect this page for driver role only
  const { loading } = useRoleProtection(["driver"]);
  const { user, logout } = useAuth();
  const { 
    isSupported, 
    isSubscribed, 
    isLoading: isNotificationLoading, 
    error: notificationError, 
    subscribe, 
    unsubscribe 
  } = useNotification();

  // State untuk menyimpan data notifikasi yang diterima
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fungsi untuk handle toggle subscription
  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  // Setup listener untuk menerima data notifikasi dari service worker
  useEffect(() => {
    if (!isSupported || !navigator.serviceWorker) return;

    // Fungsi untuk menerima pesan dari service worker
    const handleMessage = (event: MessageEvent) => {
      console.log("Message received from service worker:", event.data);
      
      // Cek jika pesan memiliki tipe 'notification'
      if (event.data && event.data.type === 'notification') {
        // Tambahkan notifikasi baru ke state dengan timestamp
        setNotifications(prev => [
          {
            ...event.data.payload,
            receivedAt: new Date().toLocaleString()
          },
          ...prev
        ].slice(0, 10)); // Simpan maksimal 10 notifikasi
      }
    };

    // Daftarkan event listener
    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Jika service worker sudah aktif, kirim pesan untuk mengecek notifikasi terbaru
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'checkNotifications'
      });
    }

    // Cleanup saat component unmount
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [isSupported, isSubscribed]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Driver Dashboard</h1>
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
                ? "Anda telah mengaktifkan notifikasi push. Anda akan menerima pemberitahuan penting terkait tugas driver."
                : "Aktifkan notifikasi push untuk menerima pemberitahuan penting terkait tugas driver."}
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
        
        {/* Bagian Riwayat Notifikasi */}
        <div className="mt-6">
          <h3 className="font-medium mb-3">Riwayat Notifikasi</h3>
          
          {notifications.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-md text-gray-500 text-center">
              Belum ada notifikasi yang diterima
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <div key={index} className="p-4 border rounded-md bg-blue-50">
                  <div className="flex justify-between">
                    <h4 className="font-medium">{notification.title || "Notifikasi"}</h4>
                    <span className="text-xs text-gray-500">{notification.receivedAt}</span>
                  </div>
                  <p className="text-gray-700 mt-1">{notification.message || notification.body || "Tidak ada pesan"}</p>
                  {notification.url && (
                    <a 
                      href={notification.url} 
                      className="text-blue-500 text-sm mt-2 inline-block hover:underline"
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Lihat detail
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-6 p-4 bg-gray-100 rounded-md">
          <h3 className="font-medium mb-2">Informasi tentang Notifikasi</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700">
            <li className="mb-1">Anda akan menerima notifikasi untuk pengumuman penting</li>
            <li className="mb-1">Notifikasi tentang penugasan baru</li>
            <li className="mb-1">Perubahan jadwal dan update penting lainnya</li>
            <li>Anda dapat menonaktifkan notifikasi kapan saja</li>
          </ul>
        </div>
      </div>
    </div>
  );
}