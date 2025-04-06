"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import "boxicons/css/boxicons.min.css";

// Dynamic import komponen Leaflet (hindari SSR)
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
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

const ManajemenPage = () => {
  const [icon, setIcon] = useState<Icon | null>(null);
  const position: [number, number] = [-6.175392, 106.827153]; // Jakarta

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    const customIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png", // pastikan file ini ada di /public/icons/
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
    setIcon(customIcon);
  }, []);

  return (
    <div className="relative w-full h-screen">
      {/* Map dengan z-index lebih rendah */}
      <div className="absolute inset-0 z-[1]">
        {icon && (
          <MapContainer
            center={position}
            zoom={12}
            scrollWheelZoom={true}
            dragging={true}   // Add this line to explicitly enable dragging
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={position} icon={icon}>
              <Popup>Kantor Pusat</Popup>
            </Marker>
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default ManajemenPage;
