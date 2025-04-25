"use client";

import "boxicons/css/boxicons.min.css";
import "leaflet/dist/leaflet.css";

import React, { useEffect, useState } from "react";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

// Dynamically import Leaflet components with no SSR
const MapContainer = dynamic(
	() => import("react-leaflet").then((mod) => mod.MapContainer),
	{ ssr: false }
);
const TileLayer = dynamic(
	() => import("react-leaflet").then((mod) => mod.TileLayer),
	{ ssr: false }
);
const Marker = dynamic(
	() => import("react-leaflet").then((mod) => mod.Marker),
	{ ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
	ssr: false,
});

const RuteValidasiPage = () => {
	const route = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const mapPosition: [number, number] = [-6.402484, 106.794243]; // Lokasi: Bogor
	const [icon, setIcon] = useState<L.Icon | null>(null);

	useEffect(() => {
		const L = require("leaflet");
		setIcon(
			L.icon({
				iconUrl:
					"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png", // Pastikan file ini ada di public/icons/
				iconSize: [25, 41],
				iconAnchor: [12, 41],
				popupAnchor: [1, -34],
			})
		);
	}, []);

	return (
		<div className="h-full flex gap-2 flex-col">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
				<button
					onClick={() => route.push("/planner/route-validation")}
					className="flex items-center justify-center gap-2 text-white bg-[#009EFF] hover:bg-blue-600 px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold transition-colors"
				>
					<i className="bx bx-arrow-back text-lg"></i>
					<span className="text-sm sm:text-base">
						Detail Validasi Rute
					</span>
				</button>

				<div className="flex gap-2 sm:gap-4 justify-end">
					<button className="flex items-center justify-center gap-2 text-white bg-[#DC3545] hover:bg-red-700 px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold transition-colors">
						<i className="bx bx-x text-lg"></i>
						<span className="text-sm sm:text-base">Tolak</span>
					</button>
					<button
						onClick={() => setIsOpen(true)}
						className="flex items-center justify-center gap-2 text-white bg-[#28A745] hover:bg-green-700 px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold transition-colors"
					>
						<i className="bx bx-check text-lg"></i>
						<span className="text-sm sm:text-base">Terima</span>
					</button>
				</div>
			</div>

			{/* Vehicle Information Card */}
			<div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
					<div className="flex items-center gap-3">
						<i className="bx bx-car text-4xl sm:text-5xl text-[#009EFF]"></i>
						<div>
							<p className="text-xs sm:text-sm font-medium text-gray-500">
								Jenis mobil
							</p>
							<p className="text-sm sm:text-base font-bold text-gray-800">
								SUV
							</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<i className="bx bx-credit-card-front text-4xl sm:text-5xl text-[#009EFF]"></i>
						<div>
							<p className="text-xs sm:text-sm font-medium text-gray-500">
								Plat Nomor
							</p>
							<p className="text-sm sm:text-base font-bold text-gray-800">
								B 1234 SUV
							</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<i className="bx bx-user text-4xl sm:text-5xl text-[#009EFF]"></i>
						<div>
							<p className="text-xs sm:text-sm font-medium text-gray-500">
								Supir
							</p>
							<p className="text-sm sm:text-base font-bold text-gray-800">
								Udin
							</p>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
					<i className="bx bx-map text-4xl sm:text-5xl text-[#009EFF]"></i>
					<div>
						<p className="text-xs sm:text-sm font-medium text-gray-500">
							Alasan
						</p>
						<p className="text-sm sm:text-base font-bold text-gray-800">
							Banjir dan susah akses
						</p>
					</div>
				</div>
			</div>

			{/* Map */}
			<div
				className={`w-full h-[370px] rounded-md overflow-hidden relative ${
					isOpen ? "filter blur-sm" : ""
				}`}
			>
				{icon && (
					<MapContainer
						center={mapPosition}
						zoom={13}
						scrollWheelZoom={false}
						style={{ height: "100%", width: "100%" }}
					>
						<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
						<Marker position={mapPosition} icon={icon}>
							<Popup>Tujuan: Bogor</Popup>
						</Marker>
					</MapContainer>
				)}
			</div>

			{/* Modal */}
			{isOpen && (
				<>
					{/* Overlay */}
					<div
						className="fixed inset-0 backdrop-blur-xs z-40"
						onClick={() => setIsOpen(false)}
					></div>

					{/* Modal box */}
					<div
						className="bg-white w-[354px] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[8px] gap-6 flex flex-col p-[24px] z-50"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="text-[#009EFF] items-center font-bold text-xl flex gap-2.5">
							<i className="bx bx-info-circle text-2xl"></i>
							Perhatian
						</div>

						<Image
							src={"/image/Perhatian.png"}
							alt="Warning"
							width={250}
							height={250}
							className="self-center"
						/>

						<div className="flex flex-col gap-2 -mt-6">
							<p className="text-[#707070] font-normal">
								Kirimkan rute baru ke supir
							</p>
							<div className="flex items-center gap-4 font-semibold">
								<button
									className="flex-1 px-8 py-3 border border-[#009EFF] rounded-[8px]"
									onClick={() => setIsOpen(false)}
								>
									Batal
								</button>
								<button className="flex-1 px-8 py-3 bg-[#009EFF] text-white rounded-[8px]">
									Konfirmasi
								</button>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default RuteValidasiPage;
