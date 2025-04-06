"use client";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import "boxicons/css/boxicons.min.css"; // Import Boxicons CSS
import { useRoleProtection } from "@/app/hooks/useRoleProtection";
import { useAuth } from "@/app/contexts/AuthContext";
import { useNotification } from "@/app/contexts/NotificationContext";
import { createGlobalStyle } from 'styled-components';

// Tambahkan style untuk animasi
const GlobalStyle = createGlobalStyle`
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out forwards;
  }
`;

// Definisikan interface untuk notifikasi
interface Notification {
  title?: string;
  message?: string;
  body?: string;
  url?: string;
  receivedAt: string;
  [key: string]: any; // Untuk properti tambahan yang mungkin ada
}

const LayoutPlanner = ({ children }: { children: React.ReactNode }) => {
  const currentPath = usePathname();
  const route = useRouter();
  const { loading } = useRoleProtection(["planner"]);
  const { user, logout } = useAuth();
  const { 
    isSupported, 
    isSubscribed, 
    isLoading: isNotificationLoading, 
    subscribe, 
    unsubscribe 
  } = useNotification();

  // State untuk menyimpan data notifikasi yang diterima
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // State untuk menampilkan dropdown notifikasi
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  // State untuk menunjukkan notifikasi baru
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  // State untuk menampilkan semua notifikasi
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  // Fungsi untuk handle toggle subscription
  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  // Fungsi untuk menghapus notifikasi
  const handleDeleteNotification = (index: number) => {
    const newNotifications = [...notifications];
    newNotifications.splice(index, 1);
    setNotifications(newNotifications);
  };

  // Fungsi untuk menampilkan semua notifikasi
  const toggleShowAllNotifications = () => {
    setShowAllNotifications(!showAllNotifications);
  };

  // Reset flag notifikasi baru saat panel dibuka
  const toggleNotificationPanel = () => {
    setShowNotificationPanel(!showNotificationPanel);
    if (!showNotificationPanel) {
      setHasNewNotifications(false);
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
        
        // Set flag notifikasi baru
        setHasNewNotifications(true);
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
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#009EFF]"></div>
      </div>
    );
  }
  
  // Tambahkan item notifikasi ke sidebar
  const sidebar = [
    {
      icon: "bx-map-pin",
      name: "Buat Rute ",
      href: "/planner/route-plan",
    },
    {
      icon: "bx-history",
      name: "Riwayat Rute",
      href: "/planner/route-history",
    },
    {
      icon: "bx-clipboard",
      name: "Validasi Rute",
      href: "/planner/route-validation",
    },
    {
      icon: "bx-bell",
      name: "Notifikasi",
      onclick: () => toggleNotificationPanel(),
      badge: hasNewNotifications,
    },
    {
      icon: "bx-log-out",
      name: "Log Out",
      onclick: () => {
        logout();
      },
    },
    {
      icon: "bx-map",
      name: "[Hafidz] Rute",
      href: "/routingplan",
    }
  ];
  return (
    <div className="flex flex-col h-screen w-full">
      <GlobalStyle />
      <div className="flex w-full">
        <div className="flex flex-col h-screen w-[272px] p-[25px] items-center">
          <Image
            src={"/image/logo.png"}
            alt="logo"
            width={139}
            height={139}
            className="mb-[48px] bg-white p-2 rounded-md"
          />
          <div className="flex flex-col gap-4 w-full">
            {sidebar.map((item, index) => (
              <button
                onClick={() => {
                  if (item.href) {
                    route.push(item.href);
                  } else if (item.onclick) {
                    item.onclick();
                  }
                }}
                key={index}
                className={`flex items-center gap-2 cursor-pointer px-6 py-4 text-[#707070] rounded-md ${
                  currentPath === item.href ? "bg-gray-200" : "bg-white"
                } relative`}
              >
                <i className={`bx ${item.icon} text-2xl`}></i>
                <span>{item.name}</span>
                {item.badge && (
                  <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-fit">
          <div className="mt-[68px] text-[#545454] text-2xl font-semibold flex justify-between w-full mb-[43px] px-6">
            {currentPath.includes("/route-plan") && "Membuat Rute"}
            {currentPath.includes("/route-history") && "Riwayat Rute"}
            {currentPath.includes("/route-validation") && "Validasi Rute"}
            <div className="flex items-center gap-4">
              {/* Notification Bell - Desktop */}
              <button 
                onClick={toggleNotificationPanel}
                className="relative text-[#009EFF] hover:text-[#0080CC] p-2"
              >
                <i className="bx bx-bell text-2xl"></i>
                {hasNewNotifications && (
                  <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                )}
              </button>
              
              <div className="flex rounded-[100px] text-base bg-[#009EFF] items-center text-[#F1F1F1] p-1 gap-2">
                <Image
                  src={"/image/UserImage.png"}
                  alt="Logo"
                  width={42}
                  height={42}
                />
                {user?.name}
                <i className="bx bx-caret-down"></i>
              </div>
            </div>
          </div>

          {/* Notification Alert */}
          {showNotificationPanel && (
            <div className="fixed right-4 top-[140px] w-80 bg-white shadow-lg rounded-lg z-[1000] border overflow-hidden animate-fadeIn">
              <div className="p-3 border-b bg-[#009EFF] text-white flex justify-between items-center">
                <h2 className="font-semibold">Notifikasi</h2>
                <button onClick={toggleNotificationPanel} className="text-white">
                  <i className="bx bx-x text-xl"></i>
                </button>
              </div>
              
              <div className="p-3">
                {!isSupported ? (
                  <div className="mb-2 text-yellow-800 text-sm">
                    Browser Anda tidak mendukung notifikasi push.
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">
                      {isSubscribed ? "Notifikasi aktif" : "Aktifkan notifikasi"}
                    </span>
                    
                    <button
                      onClick={handleToggleSubscription}
                      disabled={isNotificationLoading}
                      className={`px-3 py-1 text-sm rounded-md ${
                        isNotificationLoading 
                          ? 'bg-gray-300 cursor-wait' 
                          : isSubscribed 
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-[#009EFF] hover:bg-[#0080CC] text-white'
                      }`}
                    >
                      {isNotificationLoading 
                        ? 'Memproses...' 
                        : isSubscribed 
                          ? 'Nonaktifkan' 
                          : 'Aktifkan'}
                    </button>
                  </div>
                )}
                
                {/* Riwayat Notifikasi dalam Alert */}
                {notifications.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto border-t pt-2 mt-2">
                    <div className="space-y-2">
                      {(showAllNotifications ? notifications : notifications.slice(0, 3)).map((notification, index) => (
                        <div key={index} className="p-2 text-sm border-b last:border-b-0 relative group">
                          <button 
                            onClick={() => handleDeleteNotification(index)} 
                            className="absolute right-1 top-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Hapus notifikasi"
                          >
                            <i className="bx bx-x"></i>
                          </button>
                          
                          <div className="flex justify-between pr-5">
                            <span className="font-medium">{notification.title || "Notifikasi"}</span>
                            <span className="text-xs text-gray-500">{notification.receivedAt}</span>
                          </div>
                          <p className="text-gray-700 text-xs mt-1">{notification.message || notification.body || "Tidak ada pesan"}</p>
                          {notification.url && (
                            <a 
                              href={notification.url} 
                              className="text-blue-500 text-xs mt-1 inline-block hover:underline"
                            >
                              Lihat detail
                            </a>
                          )}
                        </div>
                      ))}
                      {!showAllNotifications && notifications.length > 3 && (
                        <div 
                          onClick={toggleShowAllNotifications} 
                          className="text-center text-xs text-blue-500 py-1 cursor-pointer hover:underline"
                        >
                          Lihat {notifications.length - 3} notifikasi lainnya
                        </div>
                      )}
                      {showAllNotifications && notifications.length > 3 && (
                        <div 
                          onClick={toggleShowAllNotifications} 
                          className="text-center text-xs text-blue-500 py-1 cursor-pointer hover:underline"
                        >
                          Sembunyikan
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-sm text-gray-500 py-2 border-t mt-2">
                    Belum ada notifikasi
                  </div>
                )}
              </div>
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
};

export default LayoutPlanner;