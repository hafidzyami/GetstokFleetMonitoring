"use client";

import Image from "next/image";
import { useRoleProtection } from "@/app/hooks/useRoleProtection";
import { useAuth } from "@/app/contexts/AuthContext";
import { useNotification } from "@/app/contexts/NotificationContext";
import React, { ReactNode, useEffect, useState } from "react";
import "boxicons/css/boxicons.min.css";
import { usePathname, useRouter } from "next/navigation";
import type ApexCharts from "apexcharts";
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

interface LayoutManajemenProps {
  children: ReactNode;
}

const sidebar = new Array(16).fill({ plat: "B 1234 SUV" });

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

const LayoutManajemen: React.FC<LayoutManajemenProps> = ({ children }) => {
  const route = useRouter();
  const curretnPath = usePathname();
  const [isOpen, setIsOpen] = React.useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const chartRef = React.useRef<ApexCharts | null>(null);

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

  if(loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#009EFF]"></div>
      </div>
    );
  }

  useEffect(() => {
    if (isOpen === null) return;
    const chartElement = document.querySelector("#sales-chart");
    if (!chartElement) return;

    const initChart = async () => {
      const ApexChartsLib = await import("apexcharts");

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const options = {
        chart: {
          type: "line",
          height: 200,
        },
        series: [
          {
            name: "Penjualan",
            data: [30, 40, 35, 50, 49, 60, 70, 91, 125],
          },
        ],
        xaxis: {
          categories: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "Mei",
            "Jun",
            "Jul",
            "Agu",
            "Sep",
          ],
        },
        colors: ["#009EFF"],
        stroke: {
          curve: "smooth",
        },
      };

      chartRef.current = new ApexChartsLib.default(chartElement, options);
      chartRef.current.render();
    };

    initChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [isOpen]);

  return (
    <div className="flex relative">
      <GlobalStyle />
      
      {/* Sidebar (Desktop) */}
      <div className="hidden md:flex flex-col gap-4 bg-white w-[272px] px-[30px] py-[48px] items-center h-screen">
        <Image src={"/image/logo.png"} alt="Logo" width={94} height={94} />
        <label className="relative w-full flex">
          <i className="bx bx-search absolute left-3 top-1/2 transform -translate-y-1/2 text-[#009EFF] text-xl"></i>
          <input
            type="text"
            placeholder="Cari Rute"
            className="h-[48px] border border-[#F1F1F1] rounded-[8px] px-10 py-4 w-full"
          />
        </label>

        <div className="overflow-y-auto flex flex-col gap-6 h-full w-full">
          {sidebar.map((item, index) => (
            <button
              onClick={() =>
                curretnPath === "/management/dashboard" &&
                setIsOpen(isOpen === index ? null : index)
              }
              key={index}
              className={`flex w-full items-center gap-2 cursor-pointer text-[#707070] rounded-md px-2 ${
                isOpen === index ? "bg-[#E6F5FF] border border-[#009EFF]" : ""
              }`}
            >
              <i className="bx bx-car rounded-full bg-[#009EFF] text-white text-xl p-[9px] flex items-center justify-center"></i>
              <div className="flex flex-col items-center w-full font-semibold text-[#ADADAD] overflow-y-auto">
                Plat Nomor <p className="text-black font-medium">{item.plat}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={logout}
          className="flex justify-center text-[#484848] items-center py-3 px-4 w-full gap-3"
        >
          <i className="bx bx-log-out text-2xl font-semibold"></i>
          Log out
        </button>
      </div>

      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-[50]">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-3xl text-[#009EFF] bg-white p-2 rounded-full shadow"
        >
          <i className="bx bx-menu"></i>
        </button>
      </div>

      {/* Sidebar Mobile Drawer */}
      {mobileMenuOpen && curretnPath === "/management/dashboard" && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute top-0 left-0 bg-white w-64 h-full p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={"/image/logo.png"} alt="Logo" width={64} height={64} />
            <div className="my-4">
              {sidebar.map((item, index) => (
                <button
                  onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                    curretnPath === "/management/dashboard" &&
                      setIsOpen(isOpen === index ? null : index);
                    setMobileMenuOpen(false);
                  }}
                  key={index}
                  className={`flex items-center gap-2 text-sm mb-2 w-full ${
                    isOpen === index
                      ? "bg-[#E6F5FF] border border-[#009EFF]"
                      : ""
                  } px-2 py-1 rounded`}
                >
                  <i className="bx bx-car text-[#009EFF] text-lg"></i>
                  {item.plat}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                route.push("/login");
              }}
              className="flex items-center gap-2 mt-4"
            >
              <i className="bx bx-log-out"></i> Log out
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative w-full">
        <div className="w-full absolute top-[48px] px-4 md:px-[32px] flex justify-between items-center z-[2]">
          <div className="bg-white shadow-md rounded-[8px] flex gap-4 md:gap-[60px] p-4 md:py-[18px] md:px-[34px] text-sm md:text-lg">
            <div className="flex gap-2 items-center font-semibold">
              <i className="bx bx-laptop"></i>
              Dashboard
            </div>
            <button
              onClick={() => {
                setIsOpen(null);
                route.push("/management/userList");
              }}
              className="flex gap-2 items-center bg-[#009EFF] text-white py-2 px-4 md:py-3 md:px-6 text-xs md:text-base font-medium rounded-[8px]"
            >
              <i className="bx bx-notepad"></i>
              Daftar User
            </button>
          </div>

          {/* Profile Info with Notification Bell */}
          <div className="md:flex gap-2 items-center">
            {/* Notification Bell */}
            <button 
              onClick={toggleNotificationPanel}
              className="relative text-[#009EFF] hover:text-[#0080CC] mr-2 bg-white p-2 rounded-full shadow-md"
            >
              <i className="bx bx-bell text-2xl"></i>
              {hasNewNotifications && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              )}
            </button>
            
            <div className="flex rounded-[100px] bg-[#009EFF] items-center h-[50px] sm:w-[212px] text-[#F1F1F1] p-1 gap-2">
              <Image
                src={"/image/UserImage.png"}
                alt="Logo"
                width={42}
                height={42}
              />
                <p className="hidden sm:block">{user?.name}</p>
              <i className="bx bx-caret-down"></i>
            </div>
          </div>
        </div>

        {/* Notification Alert */}
        {showNotificationPanel && (
          <div className="fixed right-4 top-[120px] w-80 bg-white shadow-lg rounded-lg z-[1000] border overflow-hidden animate-fadeIn">
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

        {/* Bottom Chart Panel */}
        {isOpen !== null && (
          <div className="bottom-0 absolute bg-white shadow-md py-3 rounded-lg self-end z-[3] w-full md:w-[75%] px-4">
            <div className="flex flex-col md:flex-row justify-between mb-2 gap-4">
              <div className="flex gap-2">
                <button className="p-2 bg-[#009EFF] text-white rounded-[8px] flex gap-2 items-center text-sm">
                  <i className="bx bx-radar text-2xl"></i> Sensor
                </button>
                <button className="p-2 text-[#009EFF] border border-[#009EFF] rounded-[8px] flex gap-2 items-center text-sm">
                  <i className="bx bx-data text-2xl"></i> Data
                </button>
              </div>
              <div className="flex justify-between md:justify-end gap-3 text-xs md:text-base">
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
            <div id="sales-chart" className="w-full h-[200px]" />
          </div>
        )}

        {/* Panel Status Terkini - Muncul jika ada notifikasi */}
        {isOpen !== null && (
          <div className="fixed top-0 sm:top-auto right-2 sm:bottom-0 sm:right-10 h-[50vh] w-[95%] md:w-fit flex flex-col shadow-md rounded-[8px] bg-white p-4 gap-2 z-[4] sm:h-[600px] overflow-auto">
            <button
              onClick={() => {
                setIsOpen(null);
              }}
              className="bx bx-x text-2xl self-end"
            ></button>
            <div className="flex gap-2 text-[#009EFF] items-center font-semibold">
              <i className="bx bx-receipt text-xl"></i>
              Status Terkini
            </div>
            <p className="text-[#707070] text-sm">
              Status akan diperbarui secara berkala
            </p>
            <div className="flex items-center gap-2 bg-[#E6F5FF] border border-[#009EFF] p-2 rounded-md">
              <i className="bx bx-car bg-[#009EFF] text-white text-xl p-[6px] rounded-full"></i>
              <span className="font-medium text-black text-sm">B 1234 SUV</span>
            </div>
            <span className="text-xs text-[#009EFF] mt-2">Aktivitas</span>
            <div className="flex flex-col gap-2 overflow-y-auto text-xs">
              {aktivitas.map((item, index) => (
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
                    <Image
                      src={"/icons/MarkDarkYellow.svg"}
                      alt="Tanda seru"
                      width={18}
                      height={18}
                    />
                  </div>
                  <div className="w-full h-1 rounded-[8px] bg-gray-300 relative">
                    <div
                      className="h-full bg-blue-500 rounded-[8px]"
                      style={{ width: "45%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Children */}
        {children}
      </div>
    </div>
  );
};

export default LayoutManajemen;