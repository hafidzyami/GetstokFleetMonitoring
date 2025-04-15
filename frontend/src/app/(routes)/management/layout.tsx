"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import "boxicons/css/boxicons.min.css"; // Import Boxicons CSS
import { useRoleProtection } from "@/app/hooks/useRoleProtection";
import { useAuth } from "@/app/contexts/AuthContext";
import { useNotification } from "@/app/contexts/NotificationContext";
import { createGlobalStyle } from 'styled-components';

// Definisikan interface untuk window
declare global {
  interface Window {
    truckData?: Array<{
      mac_id: string;
      plate_number?: string;
      type?: string;
      fuel?: number;
      latitude?: number;
      longitude?: number;
      last_position?: string;
      last_fuel?: string;
      [key: string]: any;
    }>;
    wsConnected?: boolean;
    fleetChart?: any;
  }
}

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

const LayoutManagement = ({ children }: { children: React.ReactNode }) => {
  const currentPath = usePathname();
  const route = useRouter();
  const { loading } = useRoleProtection(["management"]);
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
  // State untuk menyimpan truck yang aktif (untuk dashboard)
  const [activeTruckIndex, setActiveTruckIndex] = useState<number | null>(null);

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

  // Listen for truck selection events
  useEffect(() => {
    interface TruckSelectedEvent extends CustomEvent {
      detail: {
        mac_id: string;
        [key: string]: any;
      };
    }

    const handleTruckSelect = (event: TruckSelectedEvent) => {
      const truckData = event.detail;
      if (truckData) {
        // Find the index of the truck in window.truckData
        if (window.truckData) {
          const index = window.truckData.findIndex(
            (truck) => truck.mac_id === truckData.mac_id
          );
          setActiveTruckIndex(index >= 0 ? index : 0);
        } else {
          setActiveTruckIndex(0);
        }
      } else {
        setActiveTruckIndex(null);
      }
    };

    window.addEventListener('truckSelected', handleTruckSelect as EventListener);
    
    return () => {
      window.removeEventListener('truckSelected', handleTruckSelect as EventListener);
    };
  }, []);

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

  // Initialize chart when activeTruckIndex changes
  useEffect(() => {
    if (activeTruckIndex === null || !window.truckData || !currentPath.includes("/dashboard")) return;
    
    const initChart = async () => {
      try {
        const chartElement = document.querySelector("#fleet-chart");
        if (!chartElement) return;
        
        // Dynamically import ApexCharts
        const ApexCharts = (await import("apexcharts")).default;
        
        // Clear any existing chart
        if (window.fleetChart) {
          window.fleetChart.destroy();
        }
        
        const options = {
          chart: {
            type: "line",
            height: 200,
          },
          series: [
            {
              name: "Fuel Level",
              data: [70, 65, 60, 72, 68, 74, 71, 69, 73], // Sample data
            },
          ],
          xaxis: {
            categories: [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
            ],
          },
          colors: ["#009EFF"],
          stroke: {
            curve: "smooth",
          },
        };
        
        window.fleetChart = new ApexCharts(chartElement, options);
        window.fleetChart.render();
      } catch (error) {
        console.error("Error initializing chart:", error);
      }
    };
    
    // Initialize chart with a small delay to ensure the element is ready
    setTimeout(initChart, 200);
    
    return () => {
      if (window.fleetChart) {
        window.fleetChart.destroy();
        window.fleetChart = null;
      }
    };
  }, [activeTruckIndex, currentPath]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#009EFF]"></div>
      </div>
    );
  }
  
  // Define sidebar items for management
  const sidebar = [
    {
      icon: "bx-laptop",
      name: "Dashboard",
      href: "/management/dashboard",
    },
    {
      icon: "bx-notepad",
      name: "Daftar User",
      href: "/management/user-list",
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
    }
  ];

  // Sample aktivitas data for details panel
  const aktivitas = [
    { day: "Today" },
    { day: "Monday", date: "12/12/2023" },
    { day: "Tuesday", date: "12/12/2023" },
    { day: "Wednesday", date: "12/12/2023" },
    { day: "Thursday", date: "12/12/2023" },
    { day: "Friday", date: "12/12/2023" },
    { day: "Saturday", date: "12/12/2023" },
    { day: "Sunday", date: "12/12/2023" },
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

        <div className="w-full h-full overflow-hidden">
          <div className="mt-[68px] text-[#545454] text-2xl font-semibold flex justify-between w-full mb-[20px] px-6">
            {currentPath.includes("/dashboard") && "Fleet Monitoring System"}
            {currentPath.includes("/user-list") && "Daftar User"}
            <div className="flex items-center gap-4">
              {/* Connection status badge */}
              {currentPath.includes("/dashboard") && window.wsConnected !== undefined && (
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium text-white ${
                    window.wsConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {window.wsConnected ? "Connected" : "Disconnected"}
                </div>
              )}
              
              {/* Notification Bell */}
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

          {/* Main content area */}
          <div className="px-6 h-[calc(100vh-150px)] overflow-auto">
            {children}
          </div>
          
          {/* Chart and details panel - only visible when a truck is selected */}
          {activeTruckIndex !== null && currentPath.includes("/dashboard") && (
            <div className="fixed bottom-0 left-[272px] right-0 bg-white shadow-lg z-10 flex">
              {/* Chart Panel */}
              <div className="flex-1 py-3 px-4">
                <div className="flex flex-col md:flex-row justify-between mb-2 gap-4">
                  <div className="flex gap-2">
                    <button className="p-2 bg-[#009EFF] text-white rounded-[8px] flex gap-2 items-center text-sm">
                      <i className="bx bx-radar text-lg"></i> Sensor
                    </button>
                    <button className="p-2 text-[#009EFF] border border-[#009EFF] rounded-[8px] flex gap-2 items-center text-sm">
                      <i className="bx bx-data text-lg"></i> Data
                    </button>
                  </div>
                  <div className="flex justify-between md:justify-end gap-3 text-xs md:text-sm">
                    <div className="flex flex-col items-center">
                      <p className="font-semibold">96.695</p>
                      <p className="text-[#707070]">Kilometer</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="font-semibold">03:57:34</p>
                      <p className="text-[#707070]">Driving</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="font-semibold">01:02:09</p>
                      <p className="text-[#707070]">Idling</p>
                    </div>
                  </div>
                </div>
                <div id="fleet-chart" className="w-full h-[200px]"></div>
              </div>
              
              {/* Status Terkini Panel */}
              <div className="w-[300px] border-l border-gray-200 p-4">
                <div className="flex justify-between">
                  <div className="flex gap-2 text-[#009EFF] items-center font-semibold">
                    <i className="bx bx-receipt text-xl"></i>
                    Status Terkini
                  </div>
                  <button
                    onClick={() => setActiveTruckIndex(null)}
                    className="bx bx-x text-2xl"
                  ></button>
                </div>
                <p className="text-[#707070] text-sm mb-3">
                  Status akan diperbarui secara berkala
                </p>
                {window.truckData && activeTruckIndex !== null && window.truckData[activeTruckIndex] && (
                  <div className="flex items-center gap-2 bg-[#E6F5FF] border border-[#009EFF] p-2 rounded-md mb-3">
                    <i className="bx bx-car bg-[#009EFF] text-white text-xl p-[6px] rounded-full"></i>
                    <span className="font-medium text-black text-sm">
                      {window.truckData[activeTruckIndex].plate_number || 
                        `Truck ${window.truckData[activeTruckIndex].mac_id}`}
                    </span>
                  </div>
                )}
                <span className="text-xs text-[#009EFF] block mb-2">Aktivitas</span>
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[220px] text-xs">
                  {aktivitas.slice(0, 4).map((item, index) => (
                    <div
                      key={index}
                      className="border border-[#F1F1F1] p-3 rounded-md"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-[#484848]">
                          {item.day}
                          {item.date && (
                            <span className="text-[#ADADAD] font-light ml-2">
                              {item.date}
                            </span>
                          )}
                        </span>
                        <span className="text-yellow-500">!</span>
                      </div>
                      <div className="w-full h-1 rounded-[8px] bg-gray-300 relative">
                        <div
                          className="h-full bg-blue-500 rounded-[8px]"
                          style={{ width: `${45 + Math.random() * 30}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayoutManagement;