"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvent,
  Polyline,
} from "react-leaflet";
import { LatLngExpression, LatLngTuple } from "leaflet";
import React, { useEffect, useState } from "react";
import SearchField from "./SearchField"; // Adjust the import path as necessary
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { Poly } from "next/font/google";

// Default marker icon
const defaultIcon = new L.Icon({
  iconUrl: require("leaflet/dist/images/marker-icon.png"), // Default marker icon
  iconSize: [25, 41], // Size of the icon
  iconAnchor: [12, 41], // Anchor point of the icon
  popupAnchor: [1, -34], // Popup anchor point
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"), // Shadow image
  shadowSize: [41, 41], // Size of the shadow
});

interface MapProps {
  center: LatLngExpression | LatLngTuple;
  zoom?: number;
  markers: { id: number; position: LatLngTuple }[];
  onMapRightClick: (latlng: LatLngTuple) => void;
  onAddMarker: (latlng: LatLngTuple) => void;
  onUpdateMarkerPosition: (id: number, newPosition: LatLngTuple) => void;
  polylineCoordinates: LatLngTuple[];
}

const defaults = {
  zoom: 19,
};

const Map = ({
  zoom = defaults.zoom,
  center,
  markers,
  onMapRightClick,
  onAddMarker,
  onUpdateMarkerPosition,
  polylineCoordinates,
}: MapProps) => {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
    >
      <SearchField onAddMarker={onAddMarker} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      { polylineCoordinates.length > 0 && (<Polyline positions={polylineCoordinates} color="blue" />)}
      {markers.map((marker, index) => {
        // Create a custom icon with the default marker and a number overlay
        const customIcon = L.divIcon({
          className: "custom-marker",
          html: `  
                        <div style="position: relative;">  
                            <img src="${defaultIcon.options.iconUrl}" style="width: 25px; height: 41px;" />  
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
                                ${marker.id}  
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
  id: number;
  customIcon: L.DivIcon;
  onUpdateMarkerPosition: (id: number, newPosition: LatLngTuple) => void;
}) => {
  
  useEffect(() => {

  }, [position]);

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
