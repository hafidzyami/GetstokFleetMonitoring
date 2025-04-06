"use client";
import React, { useState, useRef } from "react";
import "boxicons/css/boxicons.min.css";
import { createWorker } from "tesseract.js";
import Image from "next/image";

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
    } catch (err) {
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
        } else if (lowerLine.includes("total") && lowerLine.includes("harga")) {
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
    <div className="flex flex-col items-center px-6 ">
     

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

      <div className="mt-[32px] flex flex-col gap-3 w-full">
        Riwayat kuantitas terbaru
        {RiwayatKuitansi.map((riwayat, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-2 bg-[#FFF7EF] h-[44px] rounded-[8px] p-2"
          >
            <Image
              className="bg-[#BC8644] rounded-full h-full p-[7px] w-fit"
              src="/icons/ShopifyChecklist.svg"
              alt="Checklist Icon"
              width={15}
              height={15}
            />
            <div className="flex flex-col items-center font-semibold text-[8px] sm:text-base ">
              No
              <p className="text-[#009EFF] text-xs sm:text-base">{index + 1}</p>
            </div>
            <div className="flex flex-col items-center font-semibold text-[8px] sm:text-base">
              Tanggal Pengisian
              <p className="text-[#009EFF] text-[11px] sm:text-base">
                {riwayat.tanggalPengisian}
              </p>
            </div>
            <div className="flex flex-col items-center font-semibold text-[10px] sm:text-base">
              Plat Nomor
              <p className="text-[#009EFF] text-[10px] sm:text-base">{riwayat.platNomor}</p>
            </div>

            <div className="flex gap-1 bg-[#FBB25B] px-3 py-1 rounded-[8px] justify-center items-center text-white font-semibold text-sm sm:text-base">
              <i className="bx bx-image-alt sm:text-base"></i>
              Bukti foto
            </div>
          </div>
        ))}
      </div>

      {isOpen.UnggahKuitansi && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 backdrop-blur-xs z-40"
            onClick={() => setIsOpen({ ...isOpen, UnggahKuitansi: false })}
          ></div>

          {/* Modal */}
          <div
            className="bg-white w-[354px] fixed top-1/2 -translate-y-1/2 rounded-[8px] gap-6 flex flex-col  p-[24px] z-50"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
          >
            <div className="text-[#009EFF] flex-col font-bold text-xl flex gap-2.5 ">
              <div className="flex gap-2">
                <i className="bx bx-receipt text-2xl"></i>
                Unggah Kuitansi
              </div>
              <p className="text-[#707070] text-xs font-medium">
                Upload kuitansi yang telah anda peroleh disini.
              </p>
            </div>

            <div className="flex  flex-col font-semibold gap-1">
              Plat Nomor Kendaraan
              <input
                type="text"
                placeholder="Masukkan nomor plat di sini"
                className="p-4  rounded-[8px] border-[1px] border-[#D3D3D3] font-light"
              />
            </div>

            <div className="flex flex-col font-semibold gap-1">
              Upload Kuitansi
              <label className="text-[#009EFF] flex gap-2 items-center justify-center bg-[#E6F5FF] p-3 border-[1px] border-dashed rounded-[8px] cursor-pointer">
                <i className="bx bx-upload text-[#009EFF]"></i>
                Unggah
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = reader.result as string;
                        setPreviewImage(result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              {previewImage && (
                <div className="flex flex-col items-center mt-4">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="w-full h-auto rounded-md"
                  />
                  <div className="flex gap-2 mt-2"></div>
                </div>
              )}
            </div>

            <button
              className="bg-[#009EFF] p-4 rounded-[8px] text-white font-semibold"
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
                    setOcrData({ ...ocrData, namaProduk: e.target.value })
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
                    setOcrData({ ...ocrData, hargaPerLiter: e.target.value })
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
                    setOcrData({ ...ocrData, totalHarga: e.target.value })
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
