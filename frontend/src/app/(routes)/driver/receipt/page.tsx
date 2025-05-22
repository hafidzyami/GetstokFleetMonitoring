"use client";

import "boxicons/css/boxicons.min.css";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
// OCR is now handled by the backend
import { format} from "date-fns";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // console.log("Raw receipts response:", responseText);

      // Parse respons JSON
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        console.error("Error parsing receipts JSON:", e);
        setReceipts([]);
        return;
      }

      // console.log("Parsed receipts response:", responseJson);

      // Ekstrak data kuitansi dari format respons yang spesifik
      // Format: { apiVersion: "1.0", method: "fuel_receipt.my_receipts", data: { receipts: [...] } }
      if (
        responseJson.apiVersion &&
        responseJson.data &&
        responseJson.data.receipts
      ) {
        // console.log(
        //   "Found receipts data in API format:",
        //   responseJson.data.receipts
        // );
        setReceipts(responseJson.data.receipts);
      }
      // Format alternatif lain jika ada
      else if (
        responseJson.status === "success" &&
        responseJson.data &&
        responseJson.data.receipts
      ) {
        // console.log(
        //   "Found receipts data in success format:",
        //   responseJson.data.receipts
        // );
        setReceipts(responseJson.data.receipts);
      }
      // Format langsung array
      else if (Array.isArray(responseJson)) {
        // console.log("Found receipts data as direct array:", responseJson);
        setReceipts(responseJson);
      }
      // Format jika data langsung berisi array
      else if (Array.isArray(responseJson.data)) {
        // console.log(
        //   "Found receipts data in direct data array:",
        //   responseJson.data
        // );
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
    setIsSubmitting(true);
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
      // Parse numeric values dengan perlakuan khusus untuk volume
      const parseNumeric = (str: any, isVolume = false) => {
        if (!str) return 0;
        
        // Bersihkan string
        let cleanStr = str.toString();
        
        // Hapus titik di depan jika ada
        if (cleanStr.startsWith('.')) {
          cleanStr = cleanStr.substring(1);
        }

        if (isVolume) {
          // Untuk volume, pertahankan titik desimal
          // Standarisasi koma menjadi titik untuk desimal
          cleanStr = cleanStr.replace(/,/g, '.');
          
          // Pastikan hanya ada satu titik desimal
          const parts = cleanStr.split('.');
          if (parts.length > 2) {
            cleanStr = parts[0] + '.' + parts.slice(1).join('');
          }

          // Hapus karakter non-numerik kecuali titik desimal
          cleanStr = cleanStr.replace(/[^\d.]/g, '');
        } else {
          // Untuk harga, hapus semua pemisah dan gunakan angka bulat
          cleanStr = cleanStr.replace(/[^\d]/g, '');
        }
        
        // Konversi ke angka
        const result = parseFloat(cleanStr);
        return isNaN(result) ? 0 : result;
      };

      const price = parseNumeric(ocrData.hargaPerLiter);
      const volume = parseNumeric(ocrData.volume, true); // true = isVolume 
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
      const timestamp = new Date().toISOString();


      // Buat data yang akan dikirim
      let imageBase64 = "";
      if (previewImage) {
        // Pastikan format yang benar: ambil hanya bagian base64 setelah koma
        if (previewImage.includes(",")) {
          imageBase64 = previewImage.split(",")[1] || "";
        } else {
          imageBase64 = previewImage;
        }
      }

      const receiptData = {
        product_name: ocrData.namaProduk.trim(),
        price: price,
        volume: volume,
        total_price: totalPrice,
        truck_id: parseInt(selectedTruckId, 10),
        timestamp: timestamp,
        image_base64: imageBase64,
      };

      // console.log("Sending data:", JSON.stringify(receiptData, null, 2));

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
      setIsSubmitting(false);
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

  // Handle OCR result in a more robust way
  const handleOCRResult = (success: boolean, errorMessage?: string) => {
    // Always proceed to show the OCR form, even if partial data is available
    setIsOpen({
      UnggahKuitansi: false,
      DeteksiKuitansi: false,
      HasilDeteksiKuitanasi: true,
    });

    // If OCR wasn't entirely successful but we have some data, show a helpful message
    if (
      !success &&
      (ocrData.namaProduk ||
        ocrData.hargaPerLiter ||
        ocrData.volume ||
        ocrData.totalHarga)
    ) {
      // Some data was detected but not all
      setTimeout(() => {
        alert(
          "Beberapa data berhasil dideteksi. Silakan lengkapi atau perbaiki data yang kurang."
        );
      }, 300);
    } else if (!success) {
      // No data was detected
      setTimeout(() => {
        alert(
          errorMessage || "Data tidak terdeteksi. Silakan isi secara manual."
        );
      }, 300);
    }
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

    // Validasi ukuran file maksimal 5MB (tetap ada)
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file maksimal 5MB.");
      return;
    }

    // Validasi ukuran file untuk OCR - tidak boleh lebih dari 1MB
    if (file.size > 1 * 1024 * 1024) {
      // File lebih dari 1MB, tampilkan preview tapi tidak lakukan OCR
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPreviewImage(result);
        
        // Tampilkan alert bahwa OCR tidak dapat dilakukan
        alert("File melebihi 1MB. OCR tidak dapat dilakukan, silakan isi data secara manual.");
        
        // Reset OCR data supaya user harus isi manual
        setOcrData({
          waktu: "",
          namaProduk: "",
          hargaPerLiter: "",
          volume: "",
          totalHarga: "",
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    // File di bawah 1MB, lakukan OCR seperti biasa
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreviewImage(result);

      // Otomatis proses OCR saat file dipilih (hanya jika ≤ 1MB)
      processOCR(result);
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

  // Tidak lagi memerlukan fungsi cleanField karena OCR diproses di backend

  const processOCR = async (imageData: string) => {
    setIsProcessing(true);
    try {
      // Ekstrak base64 string dari dataURL dengan benar
      let formattedBase64 = imageData;
      // Jika imageData sudah memiliki header data:image, gunakan base64 bagian setelah koma
      if (imageData.includes(",")) {
        formattedBase64 = imageData.split(",")[1];
      }

      const response = await fetch("/api/v1/ocr/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          image_base64: formattedBase64,
          lang: "auto", // Gunakan deteksi otomatis bahasa dengan engine 2
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("OCR API Response:", result);

      if (result.data && result.data.extracted_data) {
        // Konversi dari snake_case ke camelCase untuk kompatibilitas dengan frontend
        const apiData = result.data.extracted_data;
        // Format nilai berdasarkan jenisnya
        // Untuk harga: ubah 12.500 → 12500 (tidak perlu koma/titik ribuan)
        // Untuk volume: pertahankan desimal, 2.801 → 2.801 (desimal penting)
        const formatNumberForDisplay = (value : any, isVolume = false) => {
          if (!value) return "";
          
          // Hapus titik di depan jika ada
          let formatted = value.startsWith(".") ? value.substring(1) : value;
          
          if (isVolume) {
            // Untuk volume, kita ingin mempertahankan desimal
            // Pastikan koma diubah ke titik
            formatted = formatted.replace(/,/g, ".");
            
            // Pastikan hanya satu titik desimal
            const parts = formatted.split(".");
            if (parts.length > 2) {
              formatted = parts[0] + "." + parts.slice(1).join("");
            }
            
            // Kalau tidak ada titik, kemungkinan OCR error mengenali 2,801 sebagai 2801
            if (!formatted.includes(".") && formatted.length > 1) {
              // Jika angka > 100, kemungkinan butuh konversi ke format desimal
              const numValue = parseFloat(formatted);
              if (numValue > 100) {
                // Kemungkinan kesalahan OCR - konversi 2801 ke 2.801
                formatted = (numValue / 1000).toFixed(3);
              }
            }
          } else {
            // Untuk harga, hapus semua titik dan koma
            formatted = formatted.replace(/[.,]/g, "");
          }
          
          return formatted;
        };

        const extractedData = {
          waktu: apiData.waktu || "",
          namaProduk: apiData.nama_produk || "",
          hargaPerLiter: formatNumberForDisplay(apiData.harga_per_liter || ""),
          volume: formatNumberForDisplay(apiData.volume || "", true),  // true = isVolume
          totalHarga: formatNumberForDisplay(apiData.total_harga || ""),
        };

        console.log("Data yang diekstrak dari API:", extractedData);
        console.log("Raw text dari API:", result.data.raw_text);

        setOcrData(extractedData);

        // Cek jika data terdeteksi dengan baik
        const isDataComplete =
          extractedData.namaProduk &&
          extractedData.hargaPerLiter &&
          extractedData.volume &&
          extractedData.totalHarga;

        const isDataPartial =
          extractedData.namaProduk ||
          extractedData.hargaPerLiter ||
          extractedData.volume ||
          extractedData.totalHarga;

        if (isDataComplete) {
          handleOCRResult(true);
        } else if (isDataPartial) {
          handleOCRResult(false, "Data tidak lengkap");
        } else {
          handleOCRResult(false, "Tidak ada data yang terdeteksi");
        }
      } else {
        handleOCRResult(
          false,
          "Tidak ada data yang berhasil diekstrak dari gambar"
        );
      }
    } catch (error: any) {
      console.error("Error processing OCR:", error);
      handleOCRResult(false, error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCapture = async () => {
    const imageData = captureImage();
    if (imageData) {
      // Konversi base64 ke blob untuk mendapatkan ukuran file
      const base64Data = imageData.split(',')[1];
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });
      const fileSize = blob.size;

      // Validasi ukuran file untuk OCR - tidak boleh lebih dari 1MB
      if (fileSize > 1 * 1024 * 1024) {
        // File lebih dari 1MB, tampilkan preview tapi tidak lakukan OCR
        setPreviewImage(imageData);
        
        // Tampilkan alert bahwa OCR tidak dapat dilakukan
        alert("File melebihi 1MB. OCR tidak dapat dilakukan, silakan isi data secara manual.");
        
        // Reset OCR data supaya user harus isi manual
        setOcrData({
          waktu: "",
          namaProduk: "",
          hargaPerLiter: "",
          volume: "",
          totalHarga: "",
        });
      } else {
        // File di bawah 1MB, lakukan OCR seperti biasa
        setPreviewImage(imageData); // Save captured image for submission
        try {
          await processOCR(imageData);
        } catch (error) {
          console.error("Error during capture OCR:", error);
          handleOCRResult(false, "Terjadi kesalahan saat memproses gambar");
        }
      }
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

  // Format date for display with time
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return format(date, "d MMMM yyyy '-' HH:mm:ss", { locale: id });
      } catch {
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
                    <a
                      href={receipt.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mt-3 flex items-center justify-center gap-2 bg-[#FBB25B] hover:bg-[#EAA347] px-4 py-2 rounded-lg text-white font-medium transition-colors"
                    >
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
              className="bg-white w-full max-w-md max-h-[90vh] rounded-lg shadow-xl overflow-hidden transform transition-all duration-300 scale-95 animate-fadeIn flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="bg-[#009EFF] p-6 text-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <i className="bx bx-receipt text-2xl"></i>
                  <h2 className="text-xl font-bold">Unggah Kuitansi</h2>
                </div>
                <p className="text-white text-opacity-90 text-sm mt-1">
                  Upload kuitansi yang telah anda peroleh disini.
                </p>
              </div>

              {/* Body Modal - Scrollable */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
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

                  {/* Tips untuk OCR yang lebih baik */}
                  <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm text-gray-600">
                    <h3 className="font-semibold text-blue-600">
                      Tips hasil OCR terbaik:
                    </h3>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Pastikan kuitansi dalam kondisi tidak kusut</li>
                      <li>Ambil foto dengan pencahayaan yang cukup</li>
                      <li>Posisikan kamera tegak lurus</li>
                      <li>Pastikan seluruh kuitansi terlihat jelas</li>
                      <li className="text-red-600 font-medium">
                        <strong>Ukuran file maksimal 1MB untuk OCR otomatis</strong>
                      </li>
                    </ul>
                    <div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-400">
                      <p className="text-yellow-700 text-xs">
                        ⚠️ File yang melebihi 1MB tidak akan diproses dengan OCR dan harus diisi secara manual.
                      </p>
                    </div>
                  </div>

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
                          className="rounded border w-full h-auto max-h-64 object-contain"
                          width={400}
                          height={300}
                        />
                        {isProcessing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
                            <div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full"></div>
                            <span className="text-white ml-3 font-semibold">
                              Memproses OCR...
                            </span>
                          </div>
                        )}
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

              {/* Footer Modal - Fixed */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 flex-shrink-0">
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
                  onClick={() => {
                    // Saat tombol Submit ditekan, tampilkan hasil OCR
                    if (previewImage && ocrData.hargaPerLiter) {
                      // Jika OCR sudah selesai diproses, buka langsung hasil OCR
                      setIsOpen({
                        UnggahKuitansi: false,
                        DeteksiKuitansi: false,
                        HasilDeteksiKuitanasi: true,
                      });
                    } else if (previewImage) {
                      // Jika preview ada tapi OCR belum/tidak diproses (file > 1MB), langsung ke form manual
                      setIsOpen({
                        UnggahKuitansi: false,
                        DeteksiKuitansi: false,
                        HasilDeteksiKuitanasi: true,
                      });
                    }
                  }}
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
      {isSubmitting && (
        <div className="fixed inset-0 bg-gray-50 opacity-90 z-[9999] flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mb-6"></div>
            <p className="text-xl font-semibold text-gray-800">
              Mengirimkan Kuitansi...
            </p>
            <p className="text-sm text-gray-500 mt-2">Mohon tunggu sebentar</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default KuitansiPage;
