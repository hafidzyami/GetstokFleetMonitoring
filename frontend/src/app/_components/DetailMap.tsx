"use client";
import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet icon issue
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Define props for the DetailMap component
interface DetailMapProps {
  center: [number, number];
  zoom?: number;
  markers: Array<{
    id: string;
    position: [number, number];
    address?: string;
  }>;
  impassibleMarkers?: Array<Array<{
    id: string;
    position: [number, number];
    reason?: string;
    photo?: string;
    photoData?: string;
  }>>;
  routePath?: Array<[number, number]>;
  segments?: Array<{
    segment: Array<[number, number]>;
    typeValue: number;
  }>;
  tollways?: Array<{
    segment: Array<[number, number]>;
    tollwayValue: number;
  }>;
  onMapRef?: (map: L.Map) => void;
}

// Component to set the map view
const MapViewSetter = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
};

// Legend component
const Legend = () => {
  return (
    <div className="absolute bottom-8 right-4 bg-white p-3 rounded-lg shadow-lg legend z-[500] text-sm">
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

// Initialize Leaflet icons
let defaultIcon: any;
let startIcon: any;
let endIcon: any;
let avoidanceIcon: any;

// Function to create waypoint icons with numbers
const createWaypointIcon = (text: string, bgColor: string) => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${bgColor}; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; border-radius: 50%; color: white; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);">${text}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const DetailMap: React.FC<DetailMapProps> = ({
  center,
  zoom = 13,
  markers,
  impassibleMarkers = [],
  routePath = [],
  segments = [],
  tollways = [],
  onMapRef
}) => {
  const [mounted, setMounted] = useState(false);
  const hoverMarkerRef = useRef<L.Marker | null>(null);
  const waypointIcons = useRef<{[key: number]: L.DivIcon}>({});

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
        shadowSize: [41, 41]
      });

      // Avoidance icon (orange)
      avoidanceIcon = L.divIcon({
        className: "custom-div-icon",
        html: `<div style="background-color: #FF9800; width: 18px; height: 18px; display: flex; justify-content: center; align-items: center; border-radius: 50%; color: white; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      L.Marker.prototype.options.icon = defaultIcon;
      setMounted(true);
    }

    // Create waypoint icons with numbers (0, 1, 2, 3, etc.) for all points
    if (markers.length > 0) {
      for (let i = 0; i < markers.length; i++) {
        // Use the index as the label (0, 1, 2, etc.)
        const label = i.toString();
        
        // Different colors based on position
        let color;
        if (i === 0) {
          color = "#4CAF50"; // Green for first waypoint (0)
        } else if (i === markers.length - 1) {
          color = "#F44336"; // Red for last waypoint
        } else {
          color = "#2196F3"; // Blue for intermediate waypoints
        }
        
        waypointIcons.current[i] = createWaypointIcon(label, color);
      }
    }

    // Setup event handlers for elevation hover
    const handleHoverPoint = (event: CustomEvent) => {
      if (hoverMarkerRef.current && hoverMarkerRef.current.remove) {
        hoverMarkerRef.current.remove();
        hoverMarkerRef.current = null;
      }

      const point = event.detail;
      if (point && point.lat && point.lng) {
        const map = document.querySelector('.leaflet-map-pane')?.closest('.leaflet-container')?._leaflet_map;
        
        if (map) {
          const hoverIcon = L.divIcon({
            className: "hover-marker",
            html: `<div style="
              width: 12px;
              height: 12px;
              background-color: #ff0000;
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 0 4px rgba(0,0,0,0.5);
            "></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });

          hoverMarkerRef.current = L.marker([point.lat, point.lng], {
            icon: hoverIcon,
            zIndexOffset: 1000,
          }).addTo(map);

          const elevationText = point.elevation !== undefined
            ? `Elevation: ${point.elevation.toFixed(1)} m<br>`
            : "";

          hoverMarkerRef.current.bindTooltip(
            `<div style="padding: 4px; font-size: 12px;">
              ${elevationText}
              Location: ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}
            </div>`,
            {
              permanent: true,
              direction: "top",
              className: "elevation-tooltip",
              offset: [0, -8],
            }
          ).openTooltip();
        }
      }
    };

    const handleHoverReset = () => {
      if (hoverMarkerRef.current && hoverMarkerRef.current.remove) {
        hoverMarkerRef.current.remove();
        hoverMarkerRef.current = null;
      }
    };

    document.addEventListener("elevation-hover", handleHoverPoint as EventListener);
    document.addEventListener("elevation-hover-reset", handleHoverReset);

    return () => {
      document.removeEventListener("elevation-hover", handleHoverPoint as EventListener);
      document.removeEventListener("elevation-hover-reset", handleHoverReset);
      if (hoverMarkerRef.current && hoverMarkerRef.current.remove) {
        hoverMarkerRef.current.remove();
      }
    };
  }, [mounted, markers]);

  const calculatePolygonCenter = (positions: [number, number][]): [number, number] => {
    if (positions.length === 0) return [0, 0];
    let lat = 0;
    let lng = 0;
    positions.forEach(pos => {
      lat += pos[0];
      lng += pos[1];
    });
    return [lat / positions.length, lng / positions.length];
  };

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      whenReady={(map) => onMapRef && onMapRef(map.target)}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapViewSetter center={center} zoom={zoom} />
      <Legend />
      
      {/* Road segments with different colors */}
      {segments.map((seg, index) => {
        let color;
        switch (seg.typeValue) {
          case 3:
            color = "blue"; // Kelas III
            break;
          case 2:
            color = "green"; // Kelas II
            break;
          case 1:
            color = "red"; // Kelas I
            break;
          default:
            color = "gray"; // Default
        }
        return (
          <Polyline 
            key={`segment-${index}`}
            positions={seg.segment} 
            color={color}
            weight={5}
            opacity={0.7}
          />
        );
      })}
      
      {/* Tollways */}
      {tollways.map((toll, index) => (
        <Polyline 
          key={`toll-${index}`}
          positions={toll.segment} 
          color="purple"
          weight={5}
          opacity={0.7}
        />
      ))}
      
      {/* Main route path if segments are not provided */}
      {segments.length === 0 && routePath.length > 0 && (
        <Polyline 
          positions={routePath} 
          color="blue" 
          weight={5}
          opacity={0.7}
        />
      )}
      
      {/* Markers for waypoints */}
      {markers.map((marker, index) => {
        return (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={waypointIcons.current[index] || defaultIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold mb-1">
                  {index === 0 ? "Titik Awal" : 
                   index === markers.length - 1 ? "Titik Akhir" : 
                   `Waypoint ${index}`}
                </div>
                <div>{marker.address || `${marker.position[0].toFixed(6)}, ${marker.position[1].toFixed(6)}`}</div>
              </div>
            </Popup>
          </Marker>
        );
      })}
      
      {/* Impassible areas */}
      {impassibleMarkers.map((markerGroup, groupIndex) => {
        if (markerGroup.length < 3) return null;
        
        // Create polygon positions from markers
        const polygonPositions = markerGroup.map(marker => marker.position);
        const reason = markerGroup[0]?.reason || "Area yang dihindari";
        const photoData = markerGroup[0]?.photoData;
        
        // Calculate center for label
        const centerPosition = calculatePolygonCenter(polygonPositions);
        
        // Create center icon with area number
        const centerIcon = L.divIcon({
          className: "custom-center-marker",
          html: `
            <div style="
              background-color: red;
              color: white;
              border: 2px solid white;
              border-radius: 50%;
              width: 26px;
              height: 26px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: bold;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            ">
              A${groupIndex + 1}
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        
        return (
          <React.Fragment key={`avoidance-area-${groupIndex}`}>
            {/* Polygon for the avoidance area */}
            <Polygon 
              positions={polygonPositions} 
              color="red"
              fillColor="red"
              fillOpacity={0.2}
              weight={2}
            />
            
            {/* Center marker with popup */}
            <Marker position={centerPosition} icon={centerIcon}>
              <Popup>
                <div className="avoid-area-popup">
                  <h3 className="text-lg font-bold mb-2">
                    Area {groupIndex + 1} yang Dihindari
                  </h3>
                  
                  <div className="mb-2">
                    <span className="font-semibold">Alasan:</span> {reason}
                  </div>
                  
                  {photoData && (
                    <div className="mt-3">
                      <h4 className="font-semibold mb-1">Bukti Foto:</h4>
                      <div className="mt-1">
                        <img
                          src={photoData}
                          alt="Bukti foto area yang dihindari"
                          className="max-w-full h-auto rounded"
                          style={{ maxHeight: "150px" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
            
            {/* Markers for each point in the area */}
            {markerGroup.map((marker) => (
              <Marker
                key={marker.id}
                position={marker.position}
                icon={avoidanceIcon}
              />
            ))}
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
};

export default DetailMap;