"use client";

import "boxicons/css/boxicons.min.css";

import React, { useRef, useState } from "react";

import Image from "next/image";
import { createWorker } from "tesseract.js";

const KuitansiPage = () => {
	const [isOpen, setIsOpen] = useState({
		UnggahKuitansi: false,
		DeteksiKuitansi: false,
		HasilDeteksiKuitanasi: false,
	});
	const [ocrData, setOcrData] = useState({
		waktu: "",
		namaProduk: "",
		hargaPerLiter: "",
		volume: "",
		totalHarga: "",
	});
	const [isProcessing, setIsProcessing] = useState(false);
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const startCamera = async () => {
		try {
			// Cek apakah perangkat adalah mobile
			const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

			const constraints = {
				video: {
					facingMode: isMobile ? { ideal: "environment" } : "user", // Gunakan ideal agar lebih fleksibel
				},
			};

			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}
		} catch (err: any) {
			console.error("Error accessing camera:", err.name, err.message);
		}
	};

	const stopCamera = () => {
		if (videoRef.current?.srcObject) {
			const stream = videoRef.current.srcObject as MediaStream;
			stream.getTracks().forEach((track) => track.stop());
			videoRef.current.srcObject = null;
		}
	};

	const captureImage = () => {
		if (videoRef.current && canvasRef.current) {
			const video = videoRef.current;
			const canvas = canvasRef.current;

			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			canvas.getContext("2d")?.drawImage(video, 0, 0);

			return canvas.toDataURL("image/jpeg");
		}
		return null;
	};

	const processOCR = async (imageData: string) => {
		setIsProcessing(true);
		try {
			const worker = await createWorker("ind");
			const {
				data: { text },
			} = await worker.recognize(imageData);
			await worker.terminate();

			console.log("Hasil OCR mentah:", text);

			// Proses teks hasil OCR
			const lines = text.split("\n");
			console.log("Baris-baris hasil OCR:", lines);

			const extractedData = {
				waktu: "",
				namaProduk: "",
				hargaPerLiter: "",
				volume: "",
				totalHarga: "",
			};

			// Logika ekstraksi data dari teks OCR
			lines.forEach((line) => {
				const lowerLine = line.toLowerCase();
				console.log("Memproses baris:", line);
				if (lowerLine.includes("waktu") || lowerLine.includes("jam")) {
					extractedData.waktu = line;
					console.log("Ditemukan waktu:", line);
				} else if (
					lowerLine.includes("produk") ||
					lowerLine.includes("bensin")
				) {
					extractedData.namaProduk = line;
					console.log("Ditemukan nama produk:", line);
				} else if (
					lowerLine.includes("harga") &&
					!lowerLine.includes("total")
				) {
					extractedData.hargaPerLiter = line;
					console.log("Ditemukan harga per liter:", line);
				} else if (lowerLine.includes("volume")) {
					extractedData.volume = line;
					console.log("Ditemukan volume:", line);
				} else if (
					lowerLine.includes("total") &&
					lowerLine.includes("harga")
				) {
					extractedData.totalHarga = line;
					console.log("Ditemukan total harga:", line);
				}
			});

			console.log("Data yang diekstrak:", extractedData);

			setOcrData(extractedData);
			// Mengubah state untuk menampilkan hasil deteksi
			setIsOpen({
				UnggahKuitansi: false,
				DeteksiKuitansi: false,
				HasilDeteksiKuitanasi: true,
			});
		} catch (error) {
			console.error("Error processing OCR:", error);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleCapture = async () => {
		const imageData = captureImage();
		if (imageData) {
			await processOCR(imageData);
		}
		stopCamera();
	};

	const RiwayatKuitansi = [
		{
			tanggalPengisian: "12 Januari 2025",
			platNomor: "B 1234 SUV",
		},
		{
			tanggalPengisian: "11 Januari 2025",
			platNomor: "B 1234 SUV",
		},
		{
			tanggalPengisian: "10 Januari 2025",
			platNomor: "B 1234 SUV",
		},
		{
			tanggalPengisian: "9 Januari 2025",
			platNomor: "B 1234 SUV",
		},
		{
			tanggalPengisian: "8 Januari 2025",
			platNomor: "B 1234 SUV",
		},
	];

	return (
		<div className="flex flex-col items-center bg-white p-5 rounded-md border-[1px]">
			<div className="flex flex-col gap-3  w-full text-[#707070] text-md">
				Lihat kuitansi
				<label className="relative w-full flex">
					<i className="bx bx-search absolute left-3 top-1/2 transform -translate-y-1/2 text-[#009EFF] text-xl"></i>
					<input
						type="text"
						placeholder="Cari kuitansi"
						className="h-[48px] border rounded-[8px] px-10 py-4 w-full"
					/>
				</label>
				<button
					className="text-white bg-[#009EFF] rounded-[8px] flex items-center justify-center h-[48px] gap-3"
					onClick={() => setIsOpen({ ...isOpen, UnggahKuitansi: true })}
				>
					<i className="bx bx-upload"></i>
					Unggah
				</button>
			</div>

			<div className="my-8 w-full">
				<h3 className="text-lg font-semibold mb-4">
					Riwayat kuantitas terbaru
				</h3>

				{/* Desktop Table */}
				<div className="hidden md:block overflow-x-auto">
					<table className="min-w-full bg-white rounded-lg overflow-hidden">
						{/* Table Header */}
						<thead className="bg-[#FFF7EF]">
							<tr>
								<th className="w-10 p-10"></th>
								<th className="p-3 text-center font-semibold text-sm text-gray-600">
									No
								</th>
								<th className="p-3 text-center font-semibold text-sm text-gray-600">
									Tanggal Pengisian
								</th>
								<th className="p-3 text-center font-semibold text-sm text-gray-600">
									Plat Nomor
								</th>
								<th className="p-3 text-center font-semibold text-sm text-gray-600">
									Aksi
								</th>
							</tr>
						</thead>

						{/* Table Body */}
						<tbody>
							{RiwayatKuitansi.map((riwayat, index) => (
								<tr
									key={index}
									className="border-b border-gray-100 hover:bg-[#FFF7EF] transition-colors"
								>
									<td className="p-3 flex justify-center">
										<div className="bg-[#BC8644] rounded-full p-2">
											<Image
												src="/icons/ShopifyChecklist.svg"
												alt="Checklist Icon"
												width={20}
												height={20}
											/>
										</div>
									</td>
									<td className="p-3 text-center text-[#009EFF] font-medium">
										{index + 1}
									</td>
									<td className="p-3 text-center text-[#009EFF] font-medium">
										{riwayat.tanggalPengisian}
									</td>
									<td className="p-3 text-center text-[#009EFF] font-medium">
										{riwayat.platNomor}
									</td>
									<td className="p-3 text-center">
										<button className="flex items-center justify-center gap-2 bg-[#FBB25B] hover:bg-[#EAA347] px-4 py-2 rounded-lg text-white font-medium transition-colors mx-auto">
											<i className="bx bx-image-alt"></i>
											<span>Bukti foto</span>
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Mobile Cards */}
				<div className="md:hidden space-y-3">
					{RiwayatKuitansi.map((riwayat, index) => (
						<div
							key={index}
							className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
						>
							<div className="flex items-center gap-3 mb-3">
								<div className="bg-[#BC8644] rounded-full p-2">
									<Image
										src="/icons/ShopifyChecklist.svg"
										alt="Checklist Icon"
										width={20}
										height={20}
									/>
								</div>
								<span className="text-[#009EFF] font-medium">
									No. {index + 1}
								</span>
							</div>

							<div className="space-y-2">
								<div className="flex justify-between">
									<span className="text-gray-500">Tanggal</span>
									<span className="text-[#009EFF] font-medium">
										{riwayat.tanggalPengisian}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500">Plat Nomor</span>
									<span className="text-[#009EFF] font-medium">
										{riwayat.platNomor}
									</span>
								</div>
							</div>

							<button className="w-full mt-3 flex items-center justify-center gap-2 bg-[#FBB25B] hover:bg-[#EAA347] px-4 py-2 rounded-lg text-white font-medium transition-colors">
								<i className="bx bx-image-alt"></i>
								<span>Bukti foto</span>
							</button>
						</div>
					))}
				</div>
			</div>

			{isOpen.UnggahKuitansi && (
				<>
					{/* Overlay dengan efek lebih smooth */}
					<div
						className="fixed inset-0 bg-opacity-30 backdrop-blur-sm z-40 transition-opacity duration-300"
						onClick={() =>
							setIsOpen({ ...isOpen, UnggahKuitansi: false })
						}
					></div>

					{/* Modal dengan animasi dan layout lebih baik */}
					<div className="fixed inset-0 flex items-center justify-center z-50 px-4">
						<div
							className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden transform transition-all duration-300 scale-95 animate-fadeIn"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Header Modal */}
							<div className="bg-[#009EFF] p-6 text-white">
								<div className="flex items-center gap-3">
									<i className="bx bx-receipt text-2xl"></i>
									<h2 className="text-xl font-bold">
										Unggah Kuitansi
									</h2>
								</div>
								<p className="text-white text-opacity-90 text-sm mt-1">
									Upload kuitansi yang telah anda peroleh disini.
								</p>
							</div>

							{/* Body Modal */}
							<div className="p-6 space-y-6">
								{/* Input Plat Nomor */}
								<div className="space-y-2">
									<label className="block text-gray-700 font-medium">
										Plat Nomor Kendaraan
									</label>
									<input
										type="text"
										placeholder="Masukkan nomor plat di sini"
										className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#009EFF] focus:ring-2 focus:ring-[#009EFF]/50 transition"
									/>
								</div>

								{/* Upload Area */}
								<div className="space-y-2">
									<label className="block text-gray-700 font-medium">
										Upload Kuitansi
									</label>
									<label className="block border-2 border-dashed border-[#009EFF] rounded-lg p-6 text-center cursor-pointer hover:bg-[#E6F5FF] transition-colors">
										<div className="flex flex-col items-center justify-center gap-2 text-[#009EFF]">
											<i className="bx bx-cloud-upload text-3xl"></i>
											<span className="font-medium">
												Klik untuk mengunggah
											</span>
											<span className="text-xs text-gray-500">
												Format: JPG, PNG (Maks. 5MB)
											</span>
										</div>
										<input
											type="file"
											className="hidden"
											accept="image/*"
											onChange={(e) => {
												const file = e.target.files?.[0];
												if (file) {
													const reader = new FileReader();
													reader.onload = () => {
														const result =
															reader.result as string;
														setPreviewImage(result);
													};
													reader.readAsDataURL(file);
												}
											}}
										/>
									</label>

									{/* Preview Image */}
									{previewImage && (
										<div className="mt-4 space-y-2">
											<label className="block text-gray-700 font-medium">
												Preview
											</label>
											<div className="relative group">
												<Image
													src={previewImage}
													alt="Preview Kuitansi"
													className="w-full h-auto rounded-lg border border-gray-200"
													width={400}
													height={300}
												/>
												<button
													className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
													onClick={() => setPreviewImage(null)}
												>
													<i className="bx bx-x text-sm"></i>
												</button>
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Footer Modal */}
							<div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
								<button
									className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition"
									onClick={() =>
										setIsOpen({ ...isOpen, UnggahKuitansi: false })
									}
								>
									Batal
								</button>
								<button
									className="px-6 py-2 rounded-lg bg-[#009EFF] text-white font-medium hover:bg-[#0088DD] transition disabled:opacity-50"
									onClick={() =>
										setIsOpen({
											...isOpen,
											UnggahKuitansi: false,
											DeteksiKuitansi: true,
										})
									}
								>
									Submit
								</button>
							</div>
						</div>
					</div>
				</>
			)}

			{isOpen.DeteksiKuitansi && (
				<>
					{/* Overlay */}
					<div
						className="fixed inset-0 backdrop-blur-xs z-40"
						onClick={() =>
							setIsOpen({ ...isOpen, DeteksiKuitansi: false })
						}
					></div>

					{/* Modal */}
					<div
						className="bg-white w-[354px] fixed top-1/2 -translate-y-1/2 rounded-[8px] gap-6 flex flex-col items-center p-[24px] z-50"
						onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
					>
						<div className="text-[#009EFF] font-bold text-xl flex gap-2.5 items-center">
							<i className="bx bx-receipt text-2xl"></i>
							Deteksi Kuantitas OCR
						</div>

						<div className="w-[312px] h-[298px] aspect-video bg-gray-200 rounded-lg flex items-center justify-center relative">
							<video
								ref={videoRef}
								autoPlay
								playsInline
								className="w-full h-full object-cover rounded-lg"
							/>
							<canvas ref={canvasRef} className="hidden" />
							<div className="absolute bottom-4 flex gap-2">
								<button
									onClick={startCamera}
									className="bg-[#009EFF] text-white px-4 py-2 rounded-lg flex items-center gap-2"
								>
									<i className="bx bx-camera"></i>
									Buka Kamera
								</button>
								<button
									onClick={handleCapture}
									disabled={isProcessing}
									className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
								>
									<i className="bx bx-capture"></i>
									{isProcessing ? "Memproses..." : "Ambil Foto"}
								</button>
							</div>
						</div>
					</div>
				</>
			)}

			{isOpen.HasilDeteksiKuitanasi && (
				<>
					{/* Overlay */}
					<div
						className="fixed inset-0 backdrop-blur-xs z-40"
						onClick={() =>
							setIsOpen({ ...isOpen, HasilDeteksiKuitanasi: false })
						}
					></div>

					<div className="bg-white w-[354px] fixed top-1/2 -translate-y-1/2 rounded-[8px] gap-6 flex flex-col items-center p-[24px] z-50">
						<div className="text-[#009EFF] font-bold text-xl flex gap-2.5 items-center">
							<i className="bx bx-receipt text-2xl"></i>
							Deteksi Kuantitas OCR
						</div>

						<div className="flex flex-col w-full gap-4">
							<div className="flex flex-col gap-2">
								<label className="text-gray-600">Waktu</label>
								<input
									type="text"
									value={ocrData.waktu}
									onChange={(e) =>
										setOcrData({ ...ocrData, waktu: e.target.value })
									}
									className="border rounded-md p-2"
								/>
							</div>

							<div className="flex flex-col gap-2">
								<label className="text-gray-600">Nama Produk</label>
								<input
									type="text"
									value={ocrData.namaProduk}
									onChange={(e) =>
										setOcrData({
											...ocrData,
											namaProduk: e.target.value,
										})
									}
									className="border rounded-md p-2"
								/>
							</div>

							<div className="flex flex-col gap-2">
								<label className="text-gray-600">Harga/Liter</label>
								<input
									type="text"
									value={ocrData.hargaPerLiter}
									onChange={(e) =>
										setOcrData({
											...ocrData,
											hargaPerLiter: e.target.value,
										})
									}
									className="border rounded-md p-2"
								/>
							</div>

							<div className="flex flex-col gap-2">
								<label className="text-gray-600">Volume</label>
								<input
									type="text"
									value={ocrData.volume}
									onChange={(e) =>
										setOcrData({ ...ocrData, volume: e.target.value })
									}
									className="border rounded-md p-2"
								/>
							</div>

							<div className="flex flex-col gap-2">
								<label className="text-gray-600">Total Harga</label>
								<input
									type="text"
									value={ocrData.totalHarga}
									onChange={(e) =>
										setOcrData({
											...ocrData,
											totalHarga: e.target.value,
										})
									}
									className="border rounded-md p-2"
								/>
							</div>

							<button
								className="bg-[#009EFF] text-white py-2 rounded-md mt-2"
								onClick={() =>
									setIsOpen({
										UnggahKuitansi: false,
										DeteksiKuitansi: false,
										HasilDeteksiKuitanasi: false,
									})
								}
							>
								Selesai
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default KuitansiPage;
