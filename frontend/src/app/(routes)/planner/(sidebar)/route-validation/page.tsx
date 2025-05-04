"use client";

import "boxicons/css/boxicons.min.css";

// import Image from "next/image";
import React from "react";
import { useRouter } from "next/navigation";

const daftarRute = [
	{
		alamatAsal: "Bogor",
		platNomor: "B 1234 SSUV",
		status: "Menunggu",
	},
	{
		alamatAsal: "Bogor",
		platNomor: "B 1234 SSUV",
		status: "Menunggu",
	},
	{
		alamatAsal: "Bogor",
		platNomor: "B 1234 SSUV",
		status: "Disetujui",
	},
	{
		alamatAsal: "Jakarta",
		platNomor: "B 5678 XYZ",
		status: "Disetujui",
	},
	{
		alamatAsal: "Bandung",
		platNomor: "D 9012 ABC",
		status: "Disetujui",
	},
	{
		alamatAsal: "Surabaya",
		platNomor: "L 3456 DEF",
		status: "Disetujui",
	},
	{
		alamatAsal: "Yogyakarta",
		platNomor: "AB 7890 GHI",
		status: "Disetujui",
	},
	{
		alamatAsal: "Bali",
		platNomor: "DK 1234 JKL",
		status: "Disetujui",
	},
	{
		alamatAsal: "Medan",
		platNomor: "BK 5678 MNO",
		status: "Disetujui",
	},
];

const ValidasiRutePage = () => {
	const router = useRouter();

	return (
		<div className="h-full">
			<div className="bg-white w-full flex justify-between items-center mb-6">
				<label className="relative w-full max-w-md px-4 py-2 rounded-lg border border-gray-200 flex items-center gap-3 shadow-sm">
					<i className="bx bx-search text-2xl text-blue-500"></i>
					<input
						type="text"
						className="w-full outline-none"
						placeholder="Cari Rute"
					/>
				</label>
			</div>

			{/* <div className="w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm">
				
				<div className="grid grid-cols-12 bg-gray-50 p-4 font-semibold text-sm text-gray-700 border-b border-gray-200">
					<div className="col-span-1 text-center">No</div>
					<div className="col-span-3 text-center">Alamat Asal</div>
					<div className="col-span-3 text-center">Plat Nomor</div>
					<div className="col-span-3 text-center">Status</div>
					<div className="col-span-2 text-center">Aksi</div>
				</div>

				<div className="h-[450px] overflow-y-auto">
					{daftarRute.map((rute, index) => (
						<div
							key={index}
							className="grid grid-cols-12 items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
						>
							<div className="col-span-1 text-center text-gray-600">
								{index + 1}
							</div>
							<div className="col-span-3 text-center text-gray-600">
								{rute.alamatAsal}
							</div>
							<div className="col-span-3 text-center text-gray-600">
								{rute.platNomor}
							</div>
							<div className="col-span-3 flex justify-center">
								<span
									className={`px-3 py-1 rounded-full text-sm font-medium ${
										rute.status === "Menunggu"
											? "bg-yellow-100 text-yellow-800"
											: "bg-green-100 text-green-800"
									}`}
								>
									{rute.status}
								</span>
							</div>
							<div className="col-span-2 flex justify-center">
								<button
									onClick={() =>
										router.push("/planner/route-validation/1")
									}
									className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors text-sm flex items-center gap-2"
								>
									<i className="bx bx-show text-lg"></i>
									Detail
								</button>
							</div>
						</div>
					))}
				</div>
			</div> */}
			<div className="my-6 w-full">
				{/* Desktop Table (hidden on mobile) */}
				<div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 shadow-sm">
					{/* Table Header */}
					<div className="grid grid-cols-12 bg-gray-50 p-4 font-semibold text-sm text-gray-700 border-b border-gray-200">
						<div className="col-span-1 text-center">No</div>
						<div className="col-span-3 text-center">Alamat Asal</div>
						<div className="col-span-3 text-center">Plat Nomor</div>
						<div className="col-span-3 text-center">Status</div>
						<div className="col-span-2 text-center">Aksi</div>
					</div>

					{/* Table Body */}
					<div className="h-[450px] overflow-y-auto">
						{daftarRute.map((rute, index) => (
							<div
								key={index}
								className="grid grid-cols-12 items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
							>
								<div className="col-span-1 text-center text-gray-600">
									{index + 1}
								</div>
								<div className="col-span-3 text-center text-gray-600">
									{rute.alamatAsal}
								</div>
								<div className="col-span-3 text-center text-gray-600">
									{rute.platNomor}
								</div>
								<div className="col-span-3 flex justify-center">
									<span
										className={`px-3 py-1 rounded-full text-sm font-medium ${
											rute.status === "Menunggu"
												? "bg-yellow-100 text-yellow-800"
												: "bg-green-100 text-green-800"
										}`}
									>
										{rute.status}
									</span>
								</div>
								<div className="col-span-2 flex justify-center">
									<button
										onClick={() =>
											router.push("/planner/route-validation/1")
										}
										className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors text-sm flex items-center gap-2"
									>
										<i className="bx bx-show text-lg"></i>
										<span>Detail</span>
									</button>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Mobile Cards (shown only on mobile) */}
				<div className="md:hidden space-y-3">
					{daftarRute.map((rute, index) => (
						<div
							key={index}
							className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
						>
							<div className="flex justify-between items-start mb-3">
								<div className="flex items-center gap-2">
									<span className="text-gray-700 font-medium">
										No.
									</span>
									<span className="text-gray-600">{index + 1}</span>
								</div>

								<span
									className={`px-3 py-1 rounded-full text-sm font-medium ${
										rute.status === "Menunggu"
											? "bg-yellow-100 text-yellow-800"
											: "bg-green-100 text-green-800"
									}`}
								>
									{rute.status}
								</span>
							</div>

							<div className="space-y-2">
								<div>
									<p className="text-gray-500 text-sm">Alamat Asal</p>
									<p className="text-gray-700 font-medium">
										{rute.alamatAsal}
									</p>
								</div>

								<div>
									<p className="text-gray-500 text-sm">Plat Nomor</p>
									<p className="text-gray-700 font-medium">
										{rute.platNomor}
									</p>
								</div>
							</div>

							<button
								onClick={() =>
									router.push("/planner/route-validation/1")
								}
								className="w-full mt-4 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors text-sm flex items-center justify-center gap-2"
							>
								<i className="bx bx-show text-lg"></i>
								<span>Lihat Detail</span>
							</button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default ValidasiRutePage;
