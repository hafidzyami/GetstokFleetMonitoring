"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import { createWaypointIcon, getWaypointColor } from "@/app/utils/waypointMarker";
import { initLeafletIcons } from "@/app/utils/leafletIcons";

// Komponen untuk menampilkan marker waypoints pada route plan
const WaypointMarkers = ({ routePlan }) => {
  const waypointIcons = useRef({});
  const [mounted, setMounted] = useState(false);
  
  // Inisialisasi icons saat komponen mount
  useEffect(() => {
    // Inisialisasi icon default Leaflet
    initLeafletIcons();
    
    // Inisialisasi icon untuk setiap waypoint
    if (routePlan && routePlan.waypoints) {
      for (let i = 0; i < routePlan.waypoints.length; i++) {
        // Gunakan nomor urut sebagai label (1, 2, 3, dsb.)
        const label = (i + 1).toString();
        
        // Tentukan warna berdasarkan posisi (awal, tengah, akhir)
        const color = getWaypointColor(i, routePlan.waypoints.length);
        
        // Buat icon dan simpan di ref
        waypointIcons.current[i] = createWaypointIcon(label, color);
      }
    }
    
    setMounted(true);
  }, [routePlan]);
  
  // Jika tidak ada waypoints atau komponen belum mount, tidak perlu render apapun
  if (!mounted || !routePlan || !routePlan.waypoints || routePlan.waypoints.length === 0) {
    return null;
  }
  
  return (
    <>
      {routePlan.waypoints.map((waypoint, index) => (
        <Marker
          key={`waypoint-${routePlan.id}-${waypoint.id}`}
          position={[waypoint.latitude, waypoint.longitude]}
          icon={waypointIcons.current[index] || L.Icon.Default}
          zIndexOffset={1000} // Pastikan marker selalu di atas polyline
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold mb-1">
                {index === 0
                  ? "Titik Awal"
                  : index === routePlan.waypoints.length - 1
                  ? "Titik Akhir"
                  : `Waypoint ${index + 1}`}
              </div>
              <div>{waypoint.address || "Tanpa alamat"}</div>
              <div className="text-xs text-gray-500 mt-1">
                {waypoint.latitude.toFixed(6)}, {waypoint.longitude.toFixed(6)}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default WaypointMarkers;
