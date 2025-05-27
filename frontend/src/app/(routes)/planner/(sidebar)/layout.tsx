"use client";

import "boxicons/css/boxicons.min.css"; // Import Boxicons CSS

import { Bell, ChevronDown, ChevronLeft, KeyRound, LogOut, Menu } from "lucide-react";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import Image from "next/image";
import ResetPasswordModal from "../../driver/ResetPasswordModal";
// import ThemeToggle from "@/app/_components/ThemeToggle";
// import { createGlobalStyle } from "styled-components";
import { useAuth } from "@/app/contexts/AuthContext";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useRoleProtection } from "@/app/hooks/useRoleProtection";

// import { useWindowSize } from "@/app/hooks/useWindowSize";

interface LayoutProps {
	children: React.ReactNode;
}

// Definisikan interface untuk notifikasi
interface Notification {
	title?: string;
	message?: string;
	body?: string;
	url?: string;
	receivedAt: string;
	[key: string]: any; // Untuk properti tambahan yang mungkin ada
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
	const [dropdownOpen, setDropdownOpen] = useState(false);
	// const router = useRouter();
	const [sidebarOpen, setSidebarOpen] = useState(true);
	// const { width } = useWindowSize();
	const currentPath = usePathname();
	const route = useRouter();
	const { loading } = useRoleProtection(["planner"]);
	const { user, logout } = useAuth();
	const {
		isSupported,
		isSubscribed,
		isLoading: isNotificationLoading,
		subscribe,
		unsubscribe,
	} = useNotification();

	const [modalOpen, setModalOpen] = useState(false);

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
			if (event.data && event.data.type === "notification") {
				// Tambahkan notifikasi baru ke state dengan timestamp
				setNotifications((prev) =>
					[
						{
							...event.data.payload,
							receivedAt: new Date().toLocaleString(),
						},
						...prev,
					].slice(0, 10)
				); // Simpan maksimal 10 notifikasi

				// Set flag notifikasi baru
				setHasNewNotifications(true);
			}
		};

		// Daftarkan event listener
		navigator.serviceWorker.addEventListener("message", handleMessage);

		// Jika service worker sudah aktif, kirim pesan untuk mengecek notifikasi terbaru
		if (navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({
				type: "checkNotifications",
			});
		}

		// Cleanup saat component unmount
		return () => {
			navigator.serviceWorker.removeEventListener("message", handleMessage);
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
			name: "Buat Rute",
			href: "/planner/route-plan",
		},
		{
			icon: "bx-history",
			name: "Riwayat Rute",
			href: "/planner/route-history",
		},
		// {
		// 	icon: "bx-clipboard",
		// 	name: "Validasi Rute",
		// 	href: "/planner/route-validation",
		// },
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
		// {
		// 	icon: "bx-map",
		// 	name: "[Hafidz] Rute",
		// 	href: "/routingplan",
		// },
	];

	// useEffect(() => {
	// 	if (width !== undefined) {
	// 		setSidebarOpen(width >= 768);
	// 	}
	// }, [width]);

	const toggleSidebar = () => {
		setSidebarOpen(!sidebarOpen);
	};

	return (
		<div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
			<>
				{/* Overlay for mobile */}
				{sidebarOpen && (
					<div
						// className="fixed inset-0 z-20 bg-black/50 lg:hidden"
						onClick={toggleSidebar}
					/>
				)}

				{/* Sidebar - Hidden on mobile */}
				<aside
					className={`hidden md:flex fixed lg:static inset-y-0 left-0 z-30 w-64 flex-shrink-0 flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg lg:shadow-none transform transition-all duration-300 ${
						sidebarOpen ? "translate-x-0" : "translate-x-0 lg:w-20"
					}`}
				>
					{/* Sidebar header */}
					<div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
						<div
							className={`flex items-center ${
								!sidebarOpen ? "justify-center flex-1" : ""
							}`}
						>
							{/* <Icon name="bx-laptop" className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" /> */}
							{sidebarOpen && (
								// <h2 className="ml-3 text-xl font-semibold text-gray-800 dark:text-white">
								// 	Dashboard
								// </h2>
								<Image
									src="/image/logo.png"
									alt="logo"
									width={120}
									height={120}
									className="p-2 rounded-lg transition-transform hover:scale-105 cursor-pointer"
								/>
							)}
						</div>
						{sidebarOpen && (
							<button
								onClick={toggleSidebar}
								className="hidden lg:block ml-auto p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none"
							>
								<ChevronLeft className="h-6 w-6" />
							</button>
						)}
						{!sidebarOpen && (
							<>
								<Image
									src="/pwa-icon.png"
									alt="logo"
									width={80}
									height={80}
									className="p-2 rounded-lg transition-transform hover:scale-105 cursor-pointer"
								/>
								<button
									onClick={toggleSidebar}
									className="hidden lg:block absolute right-0 top-5 -mr-3 p-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus:outline-none"
								>
									<Menu className="h-4 w-4" />
								</button>
							</>
						)}
					</div>

					{/* Sidebar content */}
					<div className="flex-1 overflow-y-auto py-4 px-3">
						<ul className="space-y-1">
							{sidebar.map((item, index) => (
								<li key={index}>
									<button
										onClick={() => {
											if (item.href) {
												route.push(item.href);
											} else if (item.onclick) {
												item.onclick();
											}
										}}
										className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200 cursor-pointer ${
											currentPath === item.href
												? "bg-blue-100 text-[#009EFF] dark:bg-blue-900/40 dark:text-blue-300"
												: "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50"
										}`}
									>
										<span className="flex items-center justify-center w-6 h-6">
											<i className={`bx ${item.icon} text-2xl`}></i>
										</span>
										{/* {sidebarOpen && (
											<>
												<span className={`ml-3 text-sm font-medium`}>
													{item.name === "Validasi" || item.name === "Riwayat" ? item.name + " Rute" : item.name}
												</span>
												{item.badge && (
													<span className="ml-auto flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-red-500 rounded-full">
														3
													</span>
												)}
											</>
										)} */}

										{sidebarOpen && (
											<>
												<span
													className={`ml-3 text-sm font-medium`}
												>
													{item.name}
												</span>
												{item.badge && (
													<span className="ml-auto flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-red-500 rounded-full">
														3
													</span>
												)}
											</>
										)}
									</button>
								</li>
							))}
						</ul>
					</div>

					{/* Sidebar footer */}
					<div className="p-4 border-t border-gray-200 dark:border-gray-700">
						<div className="flex items-center justify-between">
							{sidebarOpen && (
								<div className="flex items-center">
									<div className="h-8 w-8 rounded-full bg-[#009EFF] flex items-center justify-center text-white font-semibold">
										{user?.name?.charAt(0)}
									</div>
									<div className="ml-3">
										<p className="text-sm font-medium text-gray-700 dark:text-gray-200">
											{user?.name}
										</p>
										<p className="text-xs text-gray-500 dark:text-gray-400">
											{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ""}
										</p>
									</div>
								</div>
							)}
							{/* <ThemeToggle compact={!sidebarOpen} /> */}
						</div>
					</div>
				</aside>
			</>

			<div className="flex flex-col flex-1 overflow-hidden">
				{/* Navbar */}
				<header className="z-10 bg-white dark:bg-gray-800 shadow-sm">
					<div className="flex items-center justify-between h-16 px-4 md:px-6">
						<div className="flex items-center">
							<button
								// onClick={toggleSidebar}
								className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none"
							>
								{/* <Menu className="h-6 w-6" /> */}
								<Image
									src="/image/logo.png"
									alt="logo"
									width={120}
									height={120}
									className="p-2 rounded-lg transition-transform hover:scale-105"
								/>
							</button>
						</div>

						{/* <div className="flex-1 max-w-md mx-4 hidden md:block">
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<Search className="h-5 w-5 text-gray-400" />
								</div>
								<input
									type="text"
									className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#009EFF] focus:border-[#009EFF] sm:text-sm transition-colors duration-200"
									placeholder="Search..."
								/>
							</div>
						</div> */}

						<div className="flex items-center space-x-4">
							<button
								onClick={toggleNotificationPanel}
								className="cursor-pointer p-1 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none"
							>
								<span className="sr-only">View notifications</span>
								<div className="relative">
									<Bell className="h-6 w-6" />
									{hasNewNotifications && (
										<span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800"></span>
									)}
								</div>
							</button>

							<div className="relative flex items-center ml-auto">
							<button
								className="flex items-center space-x-2 focus:outline-none"
								onClick={() => setDropdownOpen(!dropdownOpen)}
							>
								<div className="h-8 w-8 rounded-full bg-[#009EFF] flex items-center justify-center text-white font-semibold">
								{user?.name?.charAt(0) ?? "U"}
								</div>
								<span className="hidden lg:flex flex-col items-start text-left">
								<span className="text-sm font-medium text-gray-900 dark:text-white">
									{user?.name ?? "User"}
								</span>
								<span className="text-xs text-gray-500 dark:text-gray-400">
									{user?.role? user.role.charAt(0).toUpperCase() + user.role.slice(1): ""}
								</span>
								</span>
								<ChevronDown className="hidden lg:block h-4 w-4 text-gray-400" />
							</button>

							{dropdownOpen && (
								<div className="absolute top-12 right-0 w-44 bg-white border border-gray-200 rounded-md shadow-md z-50 py-2">
								<button
									onClick={() => setModalOpen(true)}
									className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
									>
									<KeyRound className="w-4 h-4" />
									Reset Password
									</button>

									<ResetPasswordModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
								<button
									onClick={logout}
									className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
								>
									<LogOut className="w-4 h-4" />
									Logout
								</button>
								</div>
							)}
							</div>
							{/* Notification Alert */}
							{showNotificationPanel && (
								<div className="fixed right-4 top-14 w-80 bg-white shadow-lg rounded-lg z-[1000] border overflow-hidden animate-fadeIn">
									<div className="p-3 border-b bg-[#009EFF] text-white flex justify-between items-center">
										<h2 className="font-semibold">Notifikasi</h2>
										<button
											onClick={toggleNotificationPanel}
											className="text-white"
										>
											<i className="bx bx-x text-xl"></i>
										</button>
									</div>

									<div className="p-3">
										{!isSupported ? (
											<div className="mb-2 text-yellow-800 text-sm">
												Browser Anda tidak mendukung notifikasi
												push.
											</div>
										) : (
											<div className="flex items-center justify-between mb-2">
												<span className="text-sm">
													{isSubscribed
														? "Notifikasi aktif"
														: "Aktifkan notifikasi"}
												</span>

												<button
													onClick={handleToggleSubscription}
													disabled={isNotificationLoading}
													className={`px-3 py-1 text-sm rounded-md ${
														isNotificationLoading
															? "bg-gray-300 cursor-wait"
															: isSubscribed
															? "bg-red-500 hover:bg-red-600 text-white"
															: "bg-[#009EFF] hover:bg-[#0080CC] text-white"
													}`}
												>
													{isNotificationLoading
														? "Memproses..."
														: isSubscribed
														? "Nonaktifkan"
														: "Aktifkan"}
												</button>
											</div>
										)}

										{/* Riwayat Notifikasi dalam Alert */}
										{notifications.length > 0 ? (
											<div className="max-h-64 overflow-y-auto border-t pt-2 mt-2">
												<div className="space-y-2">
													{(showAllNotifications
														? notifications
														: notifications.slice(0, 3)
													).map((notification, index) => (
														<div
															key={index}
															className="p-2 text-sm border-b last:border-b-0 relative group"
														>
															<button
																onClick={() =>
																	handleDeleteNotification(
																		index
																	)
																}
																className="absolute right-1 top-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
																aria-label="Hapus notifikasi"
															>
																<i className="bx bx-x"></i>
															</button>

															<div className="flex justify-between pr-5">
																<span className="font-medium">
																	{notification.title ||
																		"Notifikasi"}
																</span>
																<span className="text-xs text-gray-500">
																	{notification.receivedAt}
																</span>
															</div>
															<p className="text-gray-700 text-xs mt-1">
																{notification.message ||
																	notification.body ||
																	"Tidak ada pesan"}
															</p>
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
													{!showAllNotifications &&
														notifications.length > 3 && (
															<div
																onClick={
																	toggleShowAllNotifications
																}
																className="text-center text-xs text-blue-500 py-1 cursor-pointer hover:underline"
															>
																Lihat {notifications.length - 3}{" "}
																notifikasi lainnya
															</div>
														)}
													{showAllNotifications &&
														notifications.length > 3 && (
															<div
																onClick={
																	toggleShowAllNotifications
																}
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
							{/* End Notification Alert */}
						</div>
					</div>
				</header>
				{/* End Navbar */}

				<main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 transition-all duration-300">
					<div className="max-w-7xl mx-auto">{children}</div>
				</main>

				{/* Mobile Navigation Bar */}
				<nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30">
					<div className="flex items-center justify-around px-4">
						{sidebar.map((item, index) => (
							<>
								{item.name !== "[Hafidz] Rute" && (
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
										className="flex flex-col items-center justify-center flex-1 py-2 cursor-pointer"
									>
										<span
											className={`p-1 rounded-lg ${
												currentPath === item.href
													? "text-[#009EFF] dark:text-blue-400"
													: "text-gray-600 dark:text-gray-400"
											}`}
										>
											<i className={`bx ${item.icon} text-2xl`}></i>
										</span>
										<span
											className={`text-xs mt-1 ${
												currentPath === item.href
													? "text-[#009EFF] dark:text-blue-400 font-medium"
													: "text-gray-600 dark:text-gray-400"
											}`}
										>
											{item.name === "Notifikasi" &&
												hasNewNotifications && (
													<div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full"></div>
												)}
											{/* {label} */}
											{item.name.includes("Rute")
												? item.name.replace("Rute", "")
												: item.name}
										</span>
									</button>
								)}
							</>
						))}
					</div>
				</nav>
			</div>
		</div>
	);
};

export default Layout;
