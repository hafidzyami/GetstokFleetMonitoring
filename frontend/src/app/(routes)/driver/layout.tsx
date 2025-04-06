"use client";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import "boxicons/css/boxicons.min.css"; // Import Boxicons CSS
import { useRoleProtection } from "@/app/hooks/useRoleProtection";
import { useAuth } from "@/app/contexts/AuthContext";
import { useNotification } from "@/app/contexts/NotificationContext";

// Tambahkan style untuk animasi
import { createGlobalStyle } from 'styled-components'

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

const LayoutPengemudi = ({ children }: { children: React.ReactNode }) => {
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

  // Reset flag notifikasi baru saat panel dibuka
  const toggleNotificationPanel = () => {
    setShowNotificationPanel(!showNotificationPanel);
    if (!showNotificationPanel) {
      setHasNewNotifications(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#009EFF]"></div>
      </div>
    );
  }

  type SidebarItem = {
    icon: string;
    name: string;
    href?: string;
    onclick?: () => void;
  };

  const sidebar: SidebarItem[] = [
    {
      icon: "bx-map-alt",
      name: "Rute ",
      href: "/driver/route",
    },
    {
      icon: "bx-receipt",
      name: "Kuitansi ",
      href: "/driver/receipt",
    },
    {
      icon: "bx-bell",
      name: "Notifikasi",
      onclick: () => toggleNotificationPanel(),
    },
    {
      icon: "bx-log-out",
      name: "Log Out",
      onclick: () => {
        logout();
      },
    },
  ];

  const currentPath = usePathname();
  const route = useRouter();

  return (
    <div className="flex flex-col h-screen w-full">
      <GlobalStyle />
      <div className="sm:hidden h-full w-full flex flex-col">
        <div className="mt-[68px] flex justify-between w-full mb-[43px] px-6">
          <Image src={"/image/logo.png"} alt="Logo" width={172} height={172} />
          <div className="flex rounded-[100px] bg-[#009EFF] items-center text-[#F1F1F1] p-1 gap-2">
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
        
        {/* Notification Alert - Mobile */}
        {showNotificationPanel && (
          <div className="fixed top-20 left-0 right-0 mx-auto w-[90%] max-w-md z-50">
            <div className="bg-white rounded-lg shadow-lg border overflow-hidden animate-fadeIn">
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
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
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
                
                {/* Riwayat Notifikasi dalam Alert Mobile */}
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
          </div>
        )}
        
        {children}

        <div className="flex w-full mt-auto bg-[#009EFF] justify-center gap-8 h-[68px]">
          {sidebar.map((item, index) => (
            <button
              onClick={() => {
                if (item.onclick) {
                  item.onclick();
                }
                if (item.href) {
                  route.push(item.href);
                }
              }}
              key={index}
              className={`flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 px-6 py-4 text-white relative`}
            >
              <i className={`bx ${item.icon} text-2xl`}></i>
              <span>{item.name}</span>
              {currentPath === item.href && (
                <div className="w-full h-[2px] border borderwh"></div>
              )}
              {item.name === "Notifikasi" && hasNewNotifications && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden sm:flex w-full">
        <div className="flex flex-col h-screen w-[272px] bg-[#009EFF] p-[42px] items-center">
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
                  if (item.onclick) {
                    item.onclick();
                  }
                  if (item.href) {
                    route.push(item.href);
                  }
                }}
                key={index}
                className={`flex items-center gap-2 cursor-pointer px-6 py-4 text-[#707070] rounded-md ${
                  currentPath === item.href ? "bg-gray-200" : "bg-white"
                } relative`}
              >
                <i className={`bx ${item.icon} text-2xl`}></i>
                <span>{item.name}</span>
                {item.name === "Notifikasi" && hasNewNotifications && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-fit">
          <div className="mt-[68px] flex justify-between w-full mb-[43px] px-6">
            <Image
              src={"/image/logo.png"}
              alt="Logo"
              width={172}
              height={172}
            />
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
              
              <div className="flex rounded-[100px] bg-[#009EFF] items-center text-[#F1F1F1] p-1 gap-2">
                <Image
                  src={"/image/UserImage.png"}
                  alt="Logo"
                  width={42}
                  height={42}
                />
                {user?.name || 'Driver'}
                <i className="bx bx-caret-down"></i>
              </div>
            </div>
          </div>

          {/* Notification Alert - Desktop */}
          {showNotificationPanel && (
            <div className="fixed right-4 top-[180px] w-80 bg-white shadow-lg rounded-lg z-[1000] border overflow-hidden animate-fadeIn">
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

export default LayoutPengemudi;