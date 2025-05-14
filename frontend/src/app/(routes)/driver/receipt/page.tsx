"use client";

import "boxicons/css/boxicons.min.css";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { createWorker } from "tesseract.js";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Truck {
  id: string;
  plate_number: string;
  mac_id: string;
  displayValue: string;
}

interface Receipt {
  id: number;
  product_name: string;
  price: number;
  volume: number;
  total_price: number;
  truck_id: number;
  truck_info?: {
    plate_number: string;
    mac_id: string;
  };
  image_url?: string;
  timestamp: string;
  created_at: string;
}

const KuitansiPage = () => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch trucks
  const fetchTrucks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/trucks", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseJson = await response.json();
      const data = responseJson.data || [];

      if (Array.isArray(data)) {
        const formattedTrucks: Truck[] = data.map((truck: any) => ({
          id: truck.id.toString() || `truck-${Date.now()}-${Math.random()}`,
          plate_number: truck.plate_number || "N/A",
          mac_id: truck.mac_id || "N/A",
          displayValue: `${truck.plate_number || "N/A"} | ${
            truck.mac_id || "N/A"
          }`,
        }));

        setTrucks(formattedTrucks);
      } else {
        console.warn("Unexpected trucks API data format:", responseJson);
        setTrucks([]);
      }
    } catch (error) {
      console.error("Error fetching trucks:", error);
      setTrucks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch receipts
  const fetchReceipts = async () => {
    setIsLoadingReceipts(true);
    try {
      const response = await fetch("/api/v1/fuel-receipts/my-receipts", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Baca respons sebagai teks untuk debug
      const responseText = await response.text();
      console.log("Raw receipts response:", responseText);

      // Parse respons JSON
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        console.error("Error parsing receipts JSON:", e);
        setReceipts([]);
        return;
      }

      console.log("Parsed receipts response:", responseJson);

      // Ekstrak data kuitansi dari format respons yang spesifik
      // Format: { apiVersion: "1.0", method: "fuel_receipt.my_receipts", data: { receipts: [...] } }
      if (
        responseJson.apiVersion &&
        responseJson.data &&
        responseJson.data.receipts
      ) {
        console.log(
          "Found receipts data in API format:",
          responseJson.data.receipts
        );
        setReceipts(responseJson.data.receipts);
      }
      // Format alternatif lain jika ada
      else if (
        responseJson.status === "success" &&
        responseJson.data &&
        responseJson.data.receipts
      ) {
        console.log(
          "Found receipts data in success format:",
          responseJson.data.receipts
        );
        setReceipts(responseJson.data.receipts);
      }
      // Format langsung array
      else if (Array.isArray(responseJson)) {
        console.log("Found receipts data as direct array:", responseJson);
        setReceipts(responseJson);
      }
      // Format jika data langsung berisi array
      else if (Array.isArray(responseJson.data)) {
        console.log(
          "Found receipts data in direct data array:",
          responseJson.data
        );
        setReceipts(responseJson.data);
      }
      // Jika format tidak dikenali
      else {
        console.warn("Unrecognized response format:", responseJson);
        setReceipts([]);
      }
    } catch (error) {
      console.error("Error fetching receipts:", error);
      setReceipts([]);
    } finally {
      setIsLoadingReceipts(false);
    }
  };

  // Submit receipt to the backend
  const submitReceipt = async () => {
    // Validasi input seperti biasa
    if (!selectedTruckId) {
      alert("Silakan pilih kendaraan terlebih dahulu");
      return;
    }

    if (
      !ocrData.namaProduk ||
      !ocrData.hargaPerLiter ||
      !ocrData.volume ||
      !ocrData.totalHarga
    ) {
      alert("Semua field harus diisi");
      return;
    }

    setIsProcessing(true);
    try {
      // Parse numeric values
      const parseNumeric = (str: any) => {
        const numStr = str.replace(/[^\d.]/g, "");
        const result = parseFloat(numStr);
        return isNaN(result) ? 0 : result;
      };

      const price = parseNumeric(ocrData.hargaPerLiter);
      const volume = parseNumeric(ocrData.volume);
      const totalPrice = parseNumeric(ocrData.totalHarga);

      // Validasi nilai numerik
      if (price <= 0) {
        alert("Harga per liter harus lebih dari 0");
        return;
      }
      if (volume <= 0) {
        alert("Volume harus lebih dari 0");
        return;
      }
      if (totalPrice <= 0) {
        alert("Total harga harus lebih dari 0");
        return;
      }

      // Siapkan timestamp
      let timestamp = new Date().toISOString();

      // Buat data yang akan dikirim
      const receiptData = {
        product_name: ocrData.namaProduk.trim(),
        price: price,
        volume: volume,
        total_price: totalPrice,
        truck_id: parseInt(selectedTruckId, 10),
        timestamp: timestamp,
        image_base64: previewImage ? previewImage.split(",")[1] || "" : "",
      };

      console.log("Sending data:", JSON.stringify(receiptData, null, 2));

      // Kirim request
      const response = await fetch("/api/v1/fuel-receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(receiptData),
      });

      // Baca respons sebagai teks
      const responseText = await response.text();
      console.log("Raw response:", responseText);

      // Parse respons sebagai JSON
      let result;
      try {
        result = JSON.parse(responseText);
        console.log("Parsed response:", result);
      } catch (e) {
        console.error("Error parsing response:", e);
        if (response.ok) {
          // Respons bukan JSON tapi status OK, anggap sukses
          handleSuccess();
          return;
        }
        // Respons bukan JSON dan status error
        throw new Error("Invalid response from server");
      }

      // PENTING: Penanganan format respons khusus dari backend
      // Format sukses: { apiVersion: "1.0", method: "...", data: {...} }
      // Format error: { apiVersion: "1.0", error: { code: XXX, message: "..." } }

      // Cek apakah respons mengandung error
      if (result.error) {
        throw new Error(result.error.message || "Unknown error");
      }

      // Cek apakah respons mengandung data (sukses)
      if (result.data || (result.apiVersion && result.method)) {
        handleSuccess();
        return;
      }

      // Fallback jika respons struktur tidak dikenali tapi HTTP status ok
      if (response.ok) {
        handleSuccess();
        return;
      }

      // Jika sampai di sini, respons adalah error tapi tidak dalam format yang dikenali
      throw new Error("Unexpected response format");
    } catch (error: any) {
      console.error("Error submitting receipt:", error);
      alert(`Gagal menyimpan kuitansi: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function untuk menangani sukses
  const handleSuccess = () => {
    alert("Kuitansi berhasil disimpan!");

    // Reset form
    setOcrData({
      waktu: "",
      namaProduk: "",
      hargaPerLiter: "",
      volume: "",
      totalHarga: "",
    });
    setPreviewImage(null);
    setSelectedTruckId("");
    setIsOpen({
      UnggahKuitansi: false,
      DeteksiKuitansi: false,
      HasilDeteksiKuitanasi: false,
    });

    // Refresh daftar kuitansi
    fetchReceipts();
  };

  useEffect(() => {
    fetchTrucks();
    fetchReceipts();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTruckId(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file maksimal 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreviewImage(result);
    };
    reader.readAsDataURL(file);
  };

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

  const cleanField = (raw: string, keywords: string[] = []): string => {
    let result = raw;

    // Hapus kata kunci seperti "Harga:", "Nama Produk", dll
    keywords.forEach((keyword) => {
      const regex = new RegExp(`${keyword}\\s*:?\\s*`, "i");
      result = result.replace(regex, "");
    });

    // Hapus simbol dan karakter aneh di awal dan akhir
    result = result.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");

    return result.trim();
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
          extractedData.waktu = cleanField(line, ["waktu", "jam"]);
        } else if (
          lowerLine.includes("produk") ||
          lowerLine.includes("bensin")
        ) {
          extractedData.namaProduk = cleanField(line, [
            "nama produk",
            "produk",
            "bensin",
          ]);
        } else if (
          lowerLine.includes("harga") &&
          !lowerLine.includes("total")
        ) {
          extractedData.hargaPerLiter = cleanField(line, [
            "harga",
            "harga/liter",
            "harga liter",
          ]);
        } else if (lowerLine.includes("volume")) {
          extractedData.volume = cleanField(line, ["volume"]);
        } else if (lowerLine.includes("total") && lowerLine.includes("harga")) {
          extractedData.totalHarga = cleanField(line, ["total harga", "total"]);
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
      setPreviewImage(imageData); // Save captured image for submission
      await processOCR(imageData);
    }
    stopCamera();
  };

  // Filter receipts based on search query
  const filteredReceipts = receipts.filter((receipt) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      receipt.product_name?.toLowerCase().includes(searchLower) ||
      false ||
      receipt.truck_info?.plate_number?.toLowerCase().includes(searchLower) ||
      false ||
      new Date(receipt.timestamp)
        .toLocaleDateString("id-ID")
        .toLowerCase()
        .includes(searchLower)
    );
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d MMMM yyyy", { locale: id });
    } catch (error) {
      return dateString;
    }
  };

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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
        <h3 className="text-lg font-semibold mb-4">Riwayat kuitansi terbaru</h3>

        {isLoadingReceipts ? (
          <div className="text-center py-8">
            <div
              className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-500 rounded-full"
              role="status"
              aria-label="loading"
            >
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-2 text-gray-600">Memuat data...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="bx bx-receipt text-4xl"></i>
            <p className="mt-2">Belum ada kuitansi</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg overflow-hidden">
                {/* Table Header */}
                <thead className="bg-[#FFF7EF]">
                  <tr>
                    <th className="w-10 p-3"></th>
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
                      Produk
                    </th>
                    <th className="p-3 text-center font-semibold text-sm text-gray-600">
                      Volume
                    </th>
                    <th className="p-3 text-center font-semibold text-sm text-gray-600">
                      Total
                    </th>
                    <th className="p-3 text-center font-semibold text-sm text-gray-600">
                      Aksi
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {filteredReceipts.map((receipt, index) => (
                    <tr
                      key={receipt.id}
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
                        {formatDate(receipt.timestamp)}
                      </td>
                      <td className="p-3 text-center text-[#009EFF] font-medium">
                        {receipt.truck_info?.plate_number || "N/A"}
                      </td>
                      <td className="p-3 text-center text-[#009EFF] font-medium">
                        {receipt.product_name}
                      </td>
                      <td className="p-3 text-center text-[#009EFF] font-medium">
                        {receipt.volume.toFixed(2)} L
                      </td>
                      <td className="p-3 text-center text-[#009EFF] font-medium">
                        Rp {receipt.total_price.toLocaleString("id-ID")}
                      </td>
                      <td className="p-3 text-center">
                        {receipt.image_url ? (
                          <a
                            href={receipt.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 bg-[#FBB25B] hover:bg-[#EAA347] px-4 py-2 rounded-lg text-white font-medium transition-colors mx-auto"
                          >
                            <i className="bx bx-image-alt"></i>
                            <span>Bukti foto</span>
                          </a>
                        ) : (
                          <button className="flex items-center justify-center gap-2 bg-gray-300 cursor-not-allowed px-4 py-2 rounded-lg text-white font-medium mx-auto opacity-60">
                            <i className="bx bx-image-alt"></i>
                            <span>Tidak ada foto</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredReceipts.map((receipt, index) => (
                <div
                  key={receipt.id}
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
                        {formatDate(receipt.timestamp)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Plat Nomor</span>
                      <span className="text-[#009EFF] font-medium">
                        {receipt.truck_info?.plate_number || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Produk</span>
                      <span className="text-[#009EFF] font-medium">
                        {receipt.product_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Volume</span>
                      <span className="text-[#009EFF] font-medium">
                        {receipt.volume.toFixed(2)} L
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total</span>
                      <span className="text-[#009EFF] font-medium">
                        Rp {receipt.total_price.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {receipt.image_url ? (
                    <a>
                      href={receipt.image_url}
                      target="_blank" rel="noopener noreferrer"
                      className="w-full mt-3 flex items-center justify-center
                      gap-2 bg-[#FBB25B] hover:bg-[#EAA347] px-4 py-2 rounded-lg
                      text-white font-medium transition-colors"
                      <i className="bx bx-image-alt"></i>
                      <span>Bukti foto</span>
                    </a>
                  ) : (
                    <button className="w-full mt-3 flex items-center justify-center gap-2 bg-gray-300 cursor-not-allowed px-4 py-2 rounded-lg text-white font-medium opacity-60">
                      <i className="bx bx-image-alt"></i>
                      <span>Tidak ada foto</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {isOpen.UnggahKuitansi && (
        <>
          {/* Overlay dengan efek lebih smooth */}
          <div
            className="fixed inset-0 bg-opacity-30 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setIsOpen({ ...isOpen, UnggahKuitansi: false })}
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
                  <h2 className="text-xl font-bold">Unggah Kuitansi</h2>
                </div>
                <p className="text-white text-opacity-90 text-sm mt-1">
                  Upload kuitansi yang telah anda peroleh disini.
                </p>
              </div>

              {/* Body Modal */}
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Plat Nomor Kendaraan
                  </label>
                  <select
                    value={selectedTruckId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#009EFF] focus:ring-2 focus:ring-[#009EFF]/50 transition"
                  >
                    <option value="">-- Pilih Plat Nomor --</option>
                    {trucks.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.displayValue}
                      </option>
                    ))}
                  </select>
                  {isLoading && (
                    <p className="text-sm text-gray-500">Memuat data...</p>
                  )}
                </div>

                {/* Upload Area */}
                <div className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    Upload Kuitansi
                  </label>

                  <div className="flex gap-2">
                    {/* Tombol Kamera */}
                    <label className="flex-1 cursor-pointer border border-blue-500 text-blue-600 text-center p-3 rounded-md hover:bg-blue-50">
                      📷 Ambil Foto
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleFileChange(e)}
                      />
                    </label>

                    {/* Tombol Galeri/File */}
                    <label className="flex-1 cursor-pointer border border-gray-400 text-gray-600 text-center p-3 rounded-md hover:bg-gray-50">
                      📁 Pilih File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e)}
                      />
                    </label>
                  </div>

                  {/* Preview */}
                  {previewImage && (
                    <div className="mt-4">
                      <label className="block text-gray-700 font-medium">
                        Preview
                      </label>
                      <div className="relative group mt-2">
                        <Image
                          src={previewImage}
                          alt="Preview"
                          className="rounded border"
                          width={400}
                          height={300}
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                          onClick={() => setPreviewImage(null)}
                        >
                          ❌
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
                      //   DeteksiKuitansi: true,
                      HasilDeteksiKuitanasi: true,
                    })
                  }
                  disabled={!selectedTruckId || !previewImage}
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
            onClick={() => setIsOpen({ ...isOpen, DeteksiKuitansi: false })}
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

              <div className="flex space-x-3 pt-2">
                <button
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md"
                  onClick={() =>
                    setIsOpen({
                      UnggahKuitansi: false,
                      DeteksiKuitansi: false,
                      HasilDeteksiKuitanasi: false,
                    })
                  }
                >
                  Batal
                </button>
                <button
                  className="flex-1 bg-[#009EFF] text-white py-2 rounded-md"
                  onClick={submitReceipt}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default KuitansiPage;
