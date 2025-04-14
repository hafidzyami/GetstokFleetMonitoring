"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvent,
  Polyline,
  Polygon,
  useMap,
} from "react-leaflet";
import { LatLngExpression, LatLngTuple } from "leaflet";
import React, { useEffect, useRef  } from "react";
import SearchField from "./SearchField"; // Adjust the import path as necessary
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

const Legend = () => {
  return (
    <div className="absolute top-4 left-4 bg-white p-4 rounded shadow-lg legend">
      <h4 className="font-bold mb-2">Road Types Legend</h4>
      <div className="flex items-center mb-1">
        <div className="w-16 h-2 bg-blue-500 mr-2"></div>{" "}
        {/* Line for Kelas III */}
        <span>Kelas III</span>
      </div>
      <div className="flex items-center mb-1">
        <div className="w-16 h-2 bg-green-500 mr-2"></div>{" "}
        {/* Line for Kelas II */}
        <span>Kelas II</span>
      </div>
      <div className="flex items-center mb-1">
        <div className="w-16 h-2 bg-red-500 mr-2"></div>{" "}
        {/* Line for Kelas I */}
        <span>Kelas I</span>
      </div>
      <div className="flex items-center mb-1">
        <div className="w-16 h-2 bg-purple-500 mr-2"></div>{" "}
        {/* Line for Kelas I */}
        <span>Kelas Khusus (Toll)</span>
      </div>
    </div>
  );
};

// Default marker icon
const defaultIcon = new L.Icon({
  iconUrl: "/marker-icon.png",
  iconRetinaUrl: "/marker-icon-2x.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41], // Size of the icon
  iconAnchor: [12, 41], // Anchor point of the icon
  popupAnchor: [1, -34], // Popup anchor point
  shadowSize: [41, 41], // Size of the shadow
});

interface MapProps {
  center: LatLngExpression | LatLngTuple;
  zoom?: number;
  markers: { id: string; position: LatLngTuple }[];
  impassableMarkers: { id: string; position: LatLngTuple }[];
  listOfImpassibleMarkers: { id: string; position: LatLngTuple }[][];
  onMapRightClick: (latlng: LatLngTuple) => void;
  onAddMarker: (latlng: LatLngTuple) => void;
  onUpdateMarkerPosition: (id: string, newPosition: LatLngTuple) => void;
  onUpdateImpassibleMarkerPosition: (
    id: string,
    newPosition: LatLngTuple
  ) => void;
  onUpdateListOfImpassibleMarkers: (
    id: string,
    newPosition: LatLngTuple
  ) => void;
  segments: any;
  tollways: any;
  onMapRef?: (map: L.Map) => void;
  // routeGeometry?: string;
  // surfaceTypes?: string[];
}

const MapRefSetter: React.FC<{ onMapRef?: (map: L.Map) => void }> = ({ onMapRef }) => {
  const map = useMap();
  const hoverMarkerRef = useRef<L.Marker | null>(null);
  
  useEffect(() => {
    if (onMapRef) {
      onMapRef(map);
    }
    
    // Setup event handler untuk hover marker
    const handleHoverPoint = (event: CustomEvent) => {
      // Hapus marker lama jika ada
      if (hoverMarkerRef.current) {
        hoverMarkerRef.current.remove();
        hoverMarkerRef.current = null;
      }
      
      // Buat marker baru jika ada point data
      const point = event.detail;
      if (point && point.lat && point.lng) {
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
        
        // Buat marker dengan tooltip
        hoverMarkerRef.current = L.marker([point.lat, point.lng], {
          icon: hoverIcon,
          zIndexOffset: 1000,
        }).addTo(map);
        
        // Tambahkan tooltip ke marker
        const elevationText = point.elevation !== undefined ? 
          `Elevation: ${point.elevation.toFixed(1)} m<br>` : '';
          
        hoverMarkerRef.current.bindTooltip(
          `<div style="padding: 4px; font-size: 12px;">
            ${elevationText}
            Location: ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}
          </div>`,
          { 
            permanent: true, 
            direction: 'top',
            className: 'elevation-tooltip',
            offset: [0, -8] 
          }
        ).openTooltip();
      }
    };
    
    // Event untuk hover data null/reset
    const handleHoverReset = () => {
      if (hoverMarkerRef.current) {
        hoverMarkerRef.current.remove();
        hoverMarkerRef.current = null;
      }
    };
    
    // Daftarkan event listener
    document.addEventListener('elevation-hover', handleHoverPoint as EventListener);
    document.addEventListener('elevation-hover-reset', handleHoverReset);
    
    return () => {
      // Cleanup
      document.removeEventListener('elevation-hover', handleHoverPoint as EventListener);
      document.removeEventListener('elevation-hover-reset', handleHoverReset);
      if (hoverMarkerRef.current) {
        hoverMarkerRef.current.remove();
      }
    };
  }, [map, onMapRef]);
  
  return null;
};

const defaults = {
  zoom: 19,
};
const redOptions = { color: "red" };

const Map = ({
  zoom = defaults.zoom,
  center,
  markers,
  impassableMarkers,
  listOfImpassibleMarkers,
  onMapRightClick,
  onAddMarker,
  onUpdateMarkerPosition,
  onUpdateImpassibleMarkerPosition,
  onUpdateListOfImpassibleMarkers,
  segments,
  tollways,
  onMapRef,
  // routeGeometry,
  // surfaceTypes,
}: MapProps) => {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
    >
      <SearchField onAddMarker={onAddMarker} />
      <Legend />
      {onMapRef && <MapRefSetter onMapRef={onMapRef} />}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker) => {
        // Create a custom icon with the default marker and a string overlay
        const customIcon = L.divIcon({
          className: "custom-marker",
          html: `  
                        <div style="position: relative;">  
                            <img src="${
                              defaultIcon.options.iconUrl
                            }" style="width: 25px; height: 41px;" />  
                            <div style="  
                                position: absolute;   
                                top: 2px;   
                                left: 1px;   
                                background-color: blue;   
                                color: white;   
                                border-radius: 50%;   
                                width: 23.5px;   
                                height: 23.5px;   
                                display: flex;   
                                align-items: center;   
                                justify-content: center;   
                                font-size: 12px;   
                                font-weight: bold;   
                                z-index: 1000;">  
                                ${marker.id.split("-")[1]}  
                            </div>  
                        </div>  
                    `,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });

        return (
          // <Marker
          //   position={marker.position}
          //   icon={customIcon}
          //   draggable={true}
          //   key={index}
          // />
          <DraggableMarker
            key={marker.id}
            position={marker.position}
            id={marker.id}
            customIcon={customIcon}
            onUpdateMarkerPosition={onUpdateMarkerPosition}
          />
        );
      })}
      {impassableMarkers.map((marker) => {
        // Create a custom icon with the default marker and a string overlay
        const customIcon = L.divIcon({
          className: "custom-marker",
          html: `  
                        <div style="position: relative;">  
                            <img src="${
                              defaultIcon.options.iconUrl
                            }" style="width: 25px; height: 41px;" />  
                            <div style="  
                                position: absolute;   
                                top: 2px;   
                                left: 1px;   
                                background-color: red;   
                                color: white;   
                                border-radius: 50%;   
                                width: 23.5px;   
                                height: 23.5px;   
                                display: flex;   
                                align-items: center;   
                                justify-content: center;   
                                font-size: 12px;   
                                font-weight: bold;   
                                z-index: 1000;">  
                                ${marker.id.split("-")[1]}
                            </div>  
                        </div>  
                    `,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });

        return (
          <DraggableMarker
            key={marker.id}
            position={marker.position}
            id={marker.id}
            customIcon={customIcon}
            onUpdateMarkerPosition={onUpdateImpassibleMarkerPosition}
          />
        );
      })}
      {impassableMarkers.length >= 3 && (
        <Polygon
          positions={impassableMarkers.map((marker) => marker.position)}
          pathOptions={redOptions}
        />
      )}

      {listOfImpassibleMarkers.map((impassibleMarkers, index) => {
        // Render the polygon for the current group of impassible markers
        return (
          <React.Fragment key={index}>
            <Polygon
              positions={impassibleMarkers.map((marker) => marker.position)}
              pathOptions={redOptions}
            />
            {impassibleMarkers.map((marker) => {
              // Create a custom icon with the default marker and a string overlay
              const customIcon = L.divIcon({
                className: "custom-marker",
                html: `    
                <div style="position: relative;">    
                    <img src="${
                      defaultIcon.options.iconUrl
                    }" style="width: 25px; height: 41px;" />    
                    <div style="    
                        position: absolute;     
                        top: 2px;     
                        left: 1px;     
                        background-color: red;     
                        color: white;     
                        border-radius: 50%;     
                        width: 23.5px;     
                        height: 23.5px;     
                        display: flex;     
                        align-items: center;     
                        justify-content: center;     
                        font-size: 12px;     
                        font-weight: bold;     
                        z-index: 1000;">    
                        ${marker.id.split("-")[1]}    
                    </div>    
                </div>    
              `,
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              });

              return (
                <DraggableMarker
                  key={marker.id}
                  position={marker.position}
                  id={marker.id}
                  customIcon={customIcon}
                  onUpdateMarkerPosition={onUpdateListOfImpassibleMarkers}
                />
              );
            })}
          </React.Fragment>
        );
      })}

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
      <MapEventHandler onMapRightClick={onMapRightClick} />
    </MapContainer>
  );
};

const DraggableMarker = ({
  position,
  id,
  customIcon,
  onUpdateMarkerPosition,
}: {
  position: LatLngTuple;
  id: string;
  customIcon: L.DivIcon;
  onUpdateMarkerPosition: (id: string, newPosition: LatLngTuple) => void;
}) => {
  useEffect(() => {}, [position]);

  const handleDragEnd = (event: any) => {
    const newPosition: LatLngTuple = [
      event.target.getLatLng().lat,
      event.target.getLatLng().lng,
    ];
    onUpdateMarkerPosition(id, newPosition);
  };

  return (
    <Marker
      position={position}
      icon={customIcon}
      draggable={true}
      eventHandlers={{
        dragend: handleDragEnd,
      }}
    >
      <Popup>
        Latitude: {position[0]} <br /> Longitude: {position[1]}
      </Popup>
    </Marker>
  );
};

const MapEventHandler = ({
  onMapRightClick,
}: {
  onMapRightClick: (latlng: LatLngTuple) => void;
}) => {
  useMapEvent("contextmenu", (event) => {
    const { lat, lng } = event.latlng;
    onMapRightClick([lat, lng]);
  });
  return null;
};

export default Map;
