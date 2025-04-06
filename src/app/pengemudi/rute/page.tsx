"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import "leaflet/dist/leaflet.css";

// Leaflet Map dynamic imports (avoid SSR issues)
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

// Fix Leaflet icon issue - wrapped in useEffect to ensure it only runs on client-side
const fixLeafletIcon = () => {
  import("leaflet").then((L) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  });
};

const RiwayatRuteTerbaru = [
  { tanggalPengisian: "12 Januari 2025", platNomor: "B 1234 SUV" },
  { tanggalPengisian: "11 Januari 2025", platNomor: "B 1234 SUV" },
  { tanggalPengisian: "10 Januari 2025", platNomor: "B 1234 SUV" },
  { tanggalPengisian: "9 Januari 2025", platNomor: "B 1234 SUV" },
  { tanggalPengisian: "8 Januari 2025", platNomor: "B 1234 SUV" },
  { tanggalPengisian: "8 Januari 2025", platNomor: "B 1234 SUV" },
  { tanggalPengisian: "8 Januari 2025", platNomor: "B 1234 SUV" },
  { tanggalPengisian: "8 Januari 2025", platNomor: "B 1234 SUV" },
  { tanggalPengisian: "8 Januari 2025", platNomor: "B 1234 SUV" },
  { tanggalPengisian: "8 Januari 2025", platNomor: "B 1234 SUV" },
];

const RutePage = () => {
  const [isOpen, setIsOpen] = React.useState({
    TandaiRute: false,
    AkhiriRute: false,
  });
  const route = useRouter();

  React.useEffect(() => {
    fixLeafletIcon();
  }, []);

  return (
    <div className="px-6 flex flex-col gap-4">
      {/* Header Section */}
      <div className="flex justify-between items-center text-[#707070]">
        <span>Rute anda saat ini</span>
        <p className="underline text-[#009EFF] text-sm cursor-pointer">
          Lihat detail
        </p>
      </div>

      {/* Map Placeholder */}
      <div
        className={`bg-gray-200 h-[149px] flex items-center justify-center transition-all duration-300 ${
          isOpen.TandaiRute || isOpen.AkhiriRute
            ? "blur-sm pointer-events-none"
            : ""
        }`}
      >
        <MapContainer
          center={[-6.2, 106.8]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[-6.2, 106.8]} />
        </MapContainer>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-2 px-6 py-3 bg-[#008EE6] rounded-[8px] text-white font-semibold"
          onClick={() => setIsOpen({ ...isOpen, TandaiRute: true })}
        >
          <i className="bx bx-map text-xl"></i>
          Tandai rute
        </button>
        <button
          className="flex items-center gap-2 px-6 py-3 bg-[#DC3545] rounded-[8px] text-white font-semibold"
          onClick={() => setIsOpen({ ...isOpen, AkhiriRute: true })}
        >
          <i className="bx bx-map-pin text-xl"></i>
          Akhiri rute
        </button>
      </div>

      {/* Riwayat Header */}
      <div className="flex justify-between items-center text-[#707070]">
        <span>Riwayat Rute Terbaru</span>
        <p className="underline text-[#009EFF] text-sm cursor-pointer">
          Lihat semua
        </p>
      </div>

      {/* Riwayat List */}
      <div className="flex flex-col gap-3 w-full overflow-y-auto h-[200px]">
        {RiwayatRuteTerbaru.map((riwayat, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-2 bg-[#E6F5FF] h-[44px] rounded-[8px] p-2"
          >
            <Image
              className="bg-[#009EFF] rounded-full h-full p-[7px] w-fit"
              src="/icons/PlusComment.svg"
              alt="Checklist Icon"
              width={15}
              height={15}
            />
            <div className="flex flex-col items-center font-semibold text-[8px] sm:text-base">
              <span>No</span>
              <p className="text-[#009EFF] text-xs sm:text-base">{index + 1}</p>
            </div>
            <div className="flex flex-col items-center font-semibold text-[8px] sm:text-base">
              <span>Tanggal Keberangkatan</span>
              <p className="text-[#009EFF] text-xs sm:text-base">
                {riwayat.tanggalPengisian}
              </p>
            </div>
            <div className="flex flex-col items-center font-semibold text-[10px] sm:text-base">
              <span>Plat Nomor</span>
              <p className="text-[#009EFF] text-xs sm:text-base">{riwayat.platNomor}</p>
            </div>
            <button
              onClick={() => route.push("/pengemudi/rute/1")}
              className="flex gap-1 bg-[#009EFF] px-3 py-1 rounded-[8px] justify-center items-center text-white font-semibold text-sm cursor-pointer sm:text-base"
            >
              Detail
            </button>
          </div>
        ))}
      </div>

      {/* Modal: Tandai Rute */}
      {isOpen.TandaiRute && (
        <>
          <div
            className="fixed inset-0 backdrop-blur-xs z-40"
            onClick={() => setIsOpen({ ...isOpen, TandaiRute: false })}
          ></div>

          <div
            className="bg-white w-[354px] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[8px] gap-6 flex flex-col p-[24px] z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[#009EFF] font-bold text-xl flex-col flex gap-2.5">
              <div className="flex items-center gap-2.5">
                <i className="bx bx-map text-2xl"></i>
                Tandai Rute
              </div>

              <p className="text-[#707070] text-xs font-normal">
                berikan tanda titik untuk rute yang tidak bisa anda lewati dan
                berikan alasannya.
              </p>

              <div className="bg-gray-200 h-[149px] flex items-center justify-center">
                <MapContainer
                  center={[-6.3, 106.85]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[-6.3, 106.85]} />
                </MapContainer>
              </div>

              <div className="flex justify-between items-center">
                <i className="bx bx-edit text-[#707070] text-3xl "></i>
                <div className="text-[#DC3545] text-sm font-semibold flex items-center gap-2 cursor-pointer border-1 border[-#DC3545] rounded-[8px] px-3 py-1">
                  <i className="bx bx-undo text-3xl"></i>
                  Ulangi
                </div>
              </div>

              <div className="text-[#707070] text-md font-medium flex flex-col gap-2">
                Alasan
                <input
                  type="text"
                  className="text-sm border-[1px] border-[#D3D3D3] text-[#707070] p-4 rounded-[8px]"
                  placeholder="Berisikan alasan anda di sini"
                />
              </div>

              <button
                className="bg-[#009EFF] px-6 py-3 rounded-[8px] text-sm text-white font-semibold"
                onClick={() =>
                  setIsOpen({
                    ...isOpen,
                    TandaiRute: false,
                  })
                }
              >
                Submit
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal: Akhiri Rute */}
      {isOpen.AkhiriRute && (
        <>
          <div
            className="fixed inset-0 backdrop-blur-xs z-40"
            onClick={() => setIsOpen({ ...isOpen, AkhiriRute: false })}
          ></div>

          <div
            className="bg-white w-[354px] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[8px] gap-6 flex flex-col p-[24px] z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[#009EFF] font-bold text-xl flex gap-2.5">
              <i className="bx bx-map-pin text-2xl"></i>
              Akhiri Rute
            </div>

            <div className="bg-gray-200 h-[149px] flex items-center justify-center">
              <MapContainer
                center={[-6.3, 106.85]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[-6.3, 106.85]} />
              </MapContainer>
            </div>

            <p className="text-[#707070] text-xs font-normal">
              Berikan alasan anda untuk mengakhiri rute ini.
            </p>

            <div className="text-[#707070] text-md font-medium flex flex-col gap-2">
              Alasan
              <input
                type="text"
                className="text-sm border-[1px] border-[#707070] text-[#707070] p-4 rounded-[8px]"
                placeholder="Berisikan alasan anda di sini"
              />
            </div>

            <button
              className="bg-[#009EFF] px-6 py-3 rounded-[8px] text-sm text-white font-semibold"
              onClick={() =>
                setIsOpen({
                  ...isOpen,
                  AkhiriRute: false,
                })
              }
            >
              Submit
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default RutePage;
