"use client";
import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet icon issue
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Define props for the RouteMap component
interface RouteMapProps {
  center: [number, number];
  zoom?: number;
  routePath?: Array<[number, number]>;
  segments?: Array<{
    segment: Array<[number, number]>;
    typeValue: number;
  }>;
  tollways?: Array<{
    segment: Array<[number, number]>;
    tollwayValue: number;
  }>;
  currentLocation?: [number, number] | null;
  onMapRef?: (map: L.Map) => void;
  // Menambahkan waypoints untuk ditampilkan sebagai markers
  waypoints?: Array<{
    id: string | number;
    position: [number, number];
    address?: string;
  }>;
}

// Component to set the map view
const MapViewSetter = ({
  center,
  zoom,
  onMapRef,
}: {
  center: [number, number];
  zoom: number;
  onMapRef?: (map: L.Map) => void;
}) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
    if (onMapRef) {
      onMapRef(map);
    }
  }, []);

  return null;
};

// Component to center map to current location
const LocationButton = ({
  map,
  currentLocation,
}: {
  map: L.Map | null;
  currentLocation: [number, number] | null;
}) => {
  if (!map || !currentLocation) return null;

  const handleClick = () => {
    map.setView(currentLocation, 15);
  };

  return (
    <button
      onClick={handleClick}
      className="absolute bottom-20 right-4 z-[1000] bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
      title="Ke posisi saat ini"
    >
      <i className="bx bx-current-location text-blue-500 text-xl"></i>
    </button>
  );
};

// Legend component
const Legend = () => {
  return (
    <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg z-[500] text-sm">
      <h4 className="font-bold mb-2">Tipe Jalan</h4>
      <div className="flex items-center mb-1">
        <div className="w-12 h-2 bg-blue-500 mr-2"></div>
        <span>Kelas III</span>
      </div>
      <div className="flex items-center mb-1">
        <div className="w-12 h-2 bg-green-500 mr-2"></div>
        <span>Kelas II</span>
      </div>
      <div className="flex items-center mb-1">
        <div className="w-12 h-2 bg-red-500 mr-2"></div>
        <span>Kelas I</span>
      </div>
      <div className="flex items-center mb-1">
        <div className="w-12 h-2 bg-purple-500 mr-2"></div>
        <span>Kelas Khusus (Tol)</span>
      </div>
    </div>
  );
};

const RouteMap: React.FC<RouteMapProps> = ({
  center,
  zoom = 13,
  routePath = [],
  segments = [],
  tollways = [],
  currentLocation = null,
  onMapRef,
  waypoints = [],
}) => {
  const [mounted, setMounted] = useState(false);
  const mapReference = useRef<L.Map | null>(null);

  // Debug info
  console.log("RouteMap props on render:", {
    routePathLength: routePath?.length || 0,
    segmentsLength: segments?.length || 0,
    tollwaysLength: tollways?.length || 0,
    hasCurrentLocation: !!currentLocation,
  });
  console.log(routePath, segments, tollways, currentLocation);

  // Default icon
  let defaultIcon: L.Icon;

  // Car icon for current location
  // let carIcon: L.DivIcon;
  
  // State untuk menyimpan icon waypoints
  const waypointIcons = useRef<{ [key: number]: L.DivIcon }>({});

  // Function untuk membuat waypoint icon dengan angka
  const createWaypointIcon = (text: string, bgColor: string) => {
    return L.divIcon({
      className: "custom-div-icon",
      html: `<div style="background-color: ${bgColor}; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; border-radius: 50%; color: white; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);">${text}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  useEffect(() => {
    // Initialize icons once on client-side
    if (!mounted) {
      // Fix default icon
      defaultIcon = L.icon({
        iconUrl: markerIcon.src,
        iconRetinaUrl: markerIcon2x.src,
        shadowUrl: markerShadow.src,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41],
      });

      // Create car icon
      // carIcon = L.divIcon({
      //   className: "car-icon",
      //   html: `<div style="background-color: #4285F4; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
      //           <i class="bx bxs-car-garage" style="font-size: 20px;"></i>
      //         </div>`,
      //   iconSize: [36, 36],
      //   iconAnchor: [18, 18],
      // });

      L.Marker.prototype.options.icon = defaultIcon;
      setMounted(true);
    }

    // Buat icon untuk setiap waypoint
    if (waypoints.length > 0) {
      for (let i = 0; i < waypoints.length; i++) {
        // Gunakan index sebagai label (0, 1, 2, dsb.)
        const label = i.toString();

        // Warna berbeda berdasarkan posisi
        let color;
        if (i === 0) {
          color = "#4CAF50"; // Hijau untuk waypoint pertama (0)
        } else if (i === waypoints.length - 1) {
          color = "#F44336"; // Merah untuk waypoint terakhir
        } else {
          color = "#2196F3"; // Biru untuk waypoint tengah
        }

        waypointIcons.current[i] = createWaypointIcon(label, color);
      }
    }
  }, [mounted, waypoints]);

  // Handle map reference
  const handleMapRef = (map: L.Map) => {
    mapReference.current = map;
    if (onMapRef) {
      onMapRef(map);
    }
  };

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Map view setter */}
        <MapViewSetter center={center} zoom={zoom} onMapRef={handleMapRef} />

        {/* Legend */}
        <Legend />

        {/* Render road segments with color coding */}
        {segments.map((seg: any, index: any) => {
          let color;
          switch (seg.typeValue) {
            case 3:
              color = "blue"; // Street
              break;
            case 2:
              color = "green"; // Road
              break;
            case 1:
              color = "red"; // State Road
              break;
            default:
              color = "gray"; // Default color
          }
          return (
            <Polyline
              key={index}
              positions={seg.segment}
              pathOptions={{ color }} // Set the color based on the waytype
            />
          );
        })}

        {tollways.map((seg: any, index: any) => {
          let color;

          switch (seg.tollwayValue) {
            case 1:
              color = "purple";
              break;
          }
          return (
            <Polyline
              key={index}
              positions={seg.segment}
              pathOptions={{ color }} // Set the color based on the waytype
            />
          );
        })}

        {/* Fallback route if no segments */}
        {segments.length === 0 && routePath.length > 0 && (
          <Polyline
            positions={routePath}
            pathOptions={{ color: "blue", weight: 5, opacity: 0.7 }}
          />
        )}

        {/* Markers untuk waypoints */}
        {waypoints.map((waypoint, index) => (
          <Marker
            key={waypoint.id.toString()}
            position={waypoint.position}
            icon={waypointIcons.current[index] || defaultIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold mb-1">
                  {index === 0
                    ? "Titik Awal"
                    : index === waypoints.length - 1
                    ? "Titik Akhir"
                    : `Waypoint ${index}`}
                </div>
                <div>
                  {waypoint.address ||
                    `${waypoint.position[0].toFixed(
                      6
                    )}, ${waypoint.position[1].toFixed(6)}`}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Current location marker with car icon */}
        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={L.divIcon({
              className: "car-icon",
              html: `<div style="background-color: #4285F4; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                      <i class="bx bxs-car" style="font-size: 20px;"></i>
                    </div>`,
              iconSize: [36, 36],
              iconAnchor: [18, 18],
            })}
          />
        )}
      </MapContainer>

      {/* Button to center map on current location */}
      <LocationButton
        map={mapReference.current}
        currentLocation={currentLocation}
      />
    </div>
  );
};

export default RouteMap;
