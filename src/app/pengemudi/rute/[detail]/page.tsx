"use client";

import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import dynamic from 'next/dynamic';
import type { LatLngExpression } from "leaflet";
import { useRouter } from "next/navigation";

// Dynamically import Leaflet components with no SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

const DetailRutePage = () => {
  const [isClient, setIsClient] = useState(false);
  const route = useRouter();

  useEffect(() => {
    setIsClient(true); // Agar Map hanya dirender di client-side
    
    // Setup Leaflet icons only on client side
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const L = require("leaflet");
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    }
  }, []);

  const center: LatLngExpression = [-6.3088, 106.8525];

  return (
    <div className="px-6 flex flex-col gap-3 h-full -mt-4">
      <button onClick={()=> route.push('/pengemudi/rute')} className="bg-[#009EFF] text-white px-6 py-3 h-fit rounded-[8px] flex items-center gap-2 font-semibold mb-2 w-fit">
        <i className="bx bx-arrow-back"></i>
        Detail Validasi rute
      </button>

      <div className="border border-[#F1F1F1] rounded-[8px] bg-white p-4 flex flex-col gap-2">
        {/* Informasi Kendaraan */}
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 flex items-center gap-2">
            <i className="bx bx-car text-2xl text-[#009EFF]"></i>
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-semibold text-[#707070]">Jenis Mobil</p>
              <p className="font-bold">SUV</p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <i className="bx bx-credit-card-front text-2xl text-[#009EFF]"></i>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-[#707070]">Plat Nomor</p>
              <p className="font-bold">B 1234 SUV</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex-1 flex items-center gap-2">
            <i className="bx bx-user text-2xl text-[#009EFF]"></i>
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-semibold text-[#707070]">Nama Supir</p>
              <p className="font-bold">Udin</p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <i className="bx bx-map text-2xl text-[#009EFF]"></i>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-[#707070]">Alamat Asal</p>
              <p className="font-bold">Cikarang</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex-1 flex items-center gap-2">
            <i className="bx bx-map-pin text-2xl text-[#009EFF]"></i>
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-semibold text-[#707070]">Alamat Tujuan</p>
              <p className="font-bold">• Bekasi • Bogor </p>
            </div>
          </div>
        </div>

        {/* MAP */}
        <div className="h-[300px] w-full mt-2 rounded-[8px] overflow-hidden">
          {isClient && (
            <MapContainer
              center={center}
              zoom={10}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={[-6.2615, 106.9719]}>
                <Popup>Bekasi</Popup>
              </Marker>
              <Marker position={[-6.595, 106.8166]}>
                <Popup>Bogor</Popup>
              </Marker>
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailRutePage;
