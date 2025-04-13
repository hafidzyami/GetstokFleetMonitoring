"use client";

import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Memperbaiki masalah icon di Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom truck icon
const truckIcon = new L.Icon({
  iconUrl: "/truck-icon.png", // Pastikan file ada di folder public
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Component to automatically center map on active truck
function MapController({ activePosition }) {
  const map = useMap();

  useEffect(() => {
    if (activePosition && activePosition.latitude && activePosition.longitude) {
      map.setView([activePosition.latitude, activePosition.longitude], 15);
    }
  }, [activePosition, map]);

  return null;
}

const TruckMonitor = () => {
  const [trucks, setTrucks] = useState({});
  const [activeTruck, setActiveTruck] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const componentMountedRef = useRef(true);

  // Default center of the map (can be Indonesia's center)
  const defaultCenter = [-6.2, 106.816666]; // Jakarta

  // Get token from localStorage
  const getToken = () => localStorage.getItem("token");

  useEffect(() => {
    // This ensures we can track if the component is still mounted
    componentMountedRef.current = true;

    // Fetch initial truck data
    const fetchTrucks = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/v1/trucks", {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.data) {
          // Convert array to object with macID as key for easier updates
          const trucksMap = {};
          data.data.forEach((truck) => {
            trucksMap[truck.mac_id] = truck;
          });
          setTrucks(trucksMap);

          // Set first truck as active if exists
          const truckList = Object.values(trucksMap);
          if (truckList.length > 0) {
            setActiveTruck(truckList[0]);
          }
        }
        setError(null);
      } catch (err) {
        console.error("Error fetching trucks:", err);
        setError("Failed to load truck data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrucks();

    // Setup WebSocket connection
    const connectWebSocket = () => {
      if (
        socketRef.current &&
        socketRef.current.readyState !== WebSocket.CLOSED
      ) {
        console.log("Closing existing connection before reconnecting");
        socketRef.current.close();
      }

      let wsUrl;
      if (process.env.NODE_ENV === "production") {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.host}/ws`;
      } else {
        // For local development, use localhost with the backend port
        wsUrl = "ws://localhost:8080/ws";
      }
      console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);

      try {
        socketRef.current = new WebSocket(wsUrl);

        socketRef.current.onopen = () => {
          console.log("WebSocket connection established");
          setConnected(true);

          // Send an initial message to confirm the connection is working bidirectionally
          socketRef.current.send(
            JSON.stringify({
              type: "hello",
              client: "react-frontend",
              timestamp: Date.now(),
            })
          );
        };

        socketRef.current.onmessage = (event) => {
          try {
            console.log("Received WebSocket message:", event.data);
            const message = JSON.parse(event.data);

            // Handle ping messages to keep connection alive
            if (message.type === "ping") {
              console.log("Received ping, sending pong response");
              // Respond with pong to keep connection alive
              if (
                socketRef.current &&
                socketRef.current.readyState === WebSocket.OPEN
              ) {
                const pongResponse = JSON.stringify({
                  type: "pong",
                  timestamp: Date.now(),
                  client_timestamp: message.timestamp,
                });
                socketRef.current.send(pongResponse);
              }
              return;
            }

            // Skip connection established messages
            if (message.type === "connection_established") {
              console.log("Connection confirmed by server");
              return;
            }

            // Process truck updates
            if (
              message.mac_id &&
              (message.type === "position" || message.type === "fuel")
            ) {
              setTrucks((prevTrucks) => {
                // Create a deep copy of the trucks object
                const updatedTrucks = { ...prevTrucks };

                // If this is the first update for this truck, create a new entry
                if (!updatedTrucks[message.mac_id]) {
                  updatedTrucks[message.mac_id] = {
                    mac_id: message.mac_id,
                    last_update: message.timestamp,
                  };
                }

                // Update truck data based on update type
                if (message.type === "position") {
                  updatedTrucks[message.mac_id].latitude = message.latitude;
                  updatedTrucks[message.mac_id].longitude = message.longitude;
                  updatedTrucks[message.mac_id].last_position =
                    message.timestamp;
                  console.log(
                    `Updated position for truck ${message.mac_id}: (${message.latitude}, ${message.longitude})`
                  );
                } else if (message.type === "fuel") {
                  updatedTrucks[message.mac_id].fuel = message.fuel;
                  updatedTrucks[message.mac_id].last_fuel = message.timestamp;
                  console.log(
                    `Updated fuel for truck ${message.mac_id}: ${message.fuel}%`
                  );
                }

                // If this is the active truck, update it
                if (activeTruck && activeTruck.mac_id === message.mac_id) {
                  setActiveTruck({ ...updatedTrucks[message.mac_id] });
                }

                return updatedTrucks;
              });
            }
          } catch (error) {
            console.error(
              "Error processing WebSocket message:",
              error,
              event.data
            );
          }
        };

        socketRef.current.onclose = (event) => {
          console.log("WebSocket connection closed", event);
          setConnected(false);

          // Don't try to reconnect if the component is unmounting
          if (componentMountedRef.current) {
            console.log("Attempting to reconnect in 3 seconds...");
            // Try to reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
          }
        };

        socketRef.current.onerror = (error) => {
          console.error("WebSocket error:", error);
          setConnected(false);
        };
      } catch (error) {
        console.error("Error creating WebSocket connection:", error);
        // Try to reconnect if there was an error creating the connection
        if (componentMountedRef.current) {
          setTimeout(connectWebSocket, 3000);
        }
      }
    };

    // Connect to WebSocket
    connectWebSocket();

    // Cleanup on component unmount
    return () => {
      componentMountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const handleTruckSelect = (truck) => {
    setActiveTruck(truck);
  };

  // Check if we have at least one truck with position data
  const hasPositionData = Object.values(trucks).some(
    (truck) => truck.latitude && truck.longitude
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg text-gray-600">Loading truck data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Fleet Monitoring System</h1>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            connected ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {connected ? "Connected" : "Disconnected"}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Truck List Sidebar */}
        <div className="w-72 bg-gray-50 p-4 overflow-y-auto border-r border-gray-200">
          <h2 className="text-lg font-semibold mb-3 pb-2 border-b border-gray-200">
            Trucks
          </h2>

          {Object.values(trucks).length === 0 ? (
            <p className="text-gray-500">No trucks available</p>
          ) : (
            <div className="space-y-3">
              {Object.values(trucks).map((truck) => (
                <div
                  key={truck.mac_id}
                  className={`bg-white rounded-lg p-3 shadow cursor-pointer transition duration-200 hover:shadow-md ${
                    activeTruck && activeTruck.mac_id === truck.mac_id
                      ? "border-l-4 border-blue-500 bg-blue-50"
                      : ""
                  }`}
                  onClick={() => handleTruckSelect(truck)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">
                      {truck.plate_number || `Truck ${truck.mac_id}`}
                    </h3>
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                      {truck.type || "Unknown"}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fuel:</span>
                      <span>
                        {truck.fuel !== undefined
                          ? `${truck.fuel.toFixed(2)}%`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Position:</span>
                      <span>
                        {truck.last_position
                          ? new Date(truck.last_position).toLocaleTimeString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Fuel Update:</span>
                      <span>
                        {truck.last_fuel
                          ? new Date(truck.last_fuel).toLocaleTimeString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapContainer
            center={
              hasPositionData && activeTruck?.latitude
                ? [activeTruck.latitude, activeTruck.longitude]
                : defaultCenter
            }
            zoom={13}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {Object.values(trucks).map((truck) =>
              truck.latitude && truck.longitude ? (
                <Marker
                  key={truck.mac_id}
                  position={[truck.latitude, truck.longitude]}
                  icon={truckIcon}
                >
                  <Popup>
                    <div>
                      <h3 className="font-bold">
                        {truck.plate_number || `Truck ${truck.mac_id}`}
                      </h3>
                      <p>Type: {truck.type || "Unknown"}</p>
                      <p>
                        Fuel:{" "}
                        {truck.fuel !== undefined
                          ? `${truck.fuel.toFixed(2)}%`
                          : "N/A"}
                      </p>
                      <p>
                        Position: {truck.latitude.toFixed(6)},{" "}
                        {truck.longitude.toFixed(6)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ) : null
            )}

            {activeTruck && activeTruck.latitude && activeTruck.longitude && (
              <MapController activePosition={activeTruck} />
            )}
          </MapContainer>
        </div>

        {/* Truck Details Panel */}
        {activeTruck && (
          <div className="w-80 bg-gray-50 p-4 overflow-y-auto border-l border-gray-200">
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-200">
              {activeTruck.plate_number || `Truck ${activeTruck.mac_id}`}{" "}
              Details
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">ID</p>
                <p className="font-medium">{activeTruck.id}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">MAC ID</p>
                <p className="font-medium">{activeTruck.mac_id}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Type</p>
                <p className="font-medium">{activeTruck.type || "Unknown"}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Plate Number</p>
                <p className="font-medium">
                  {activeTruck.plate_number || "Not registered"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Fuel Level</p>
                <div className="flex items-center">
                  <p className="font-medium">
                    {activeTruck.fuel !== undefined
                      ? `${activeTruck.fuel.toFixed(2)}%`
                      : "N/A"}
                  </p>
                  {activeTruck.fuel !== undefined && (
                    <div className="ml-2 flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full"
                        style={{ width: `${Math.min(activeTruck.fuel, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Position</p>
                <p className="font-medium">
                  {activeTruck.latitude && activeTruck.longitude
                    ? `${activeTruck.latitude.toFixed(
                        6
                      )}, ${activeTruck.longitude.toFixed(6)}`
                    : "N/A"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">
                  Last Position Update
                </p>
                <p className="font-medium">
                  {activeTruck.last_position
                    ? new Date(activeTruck.last_position).toLocaleString()
                    : "N/A"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Last Fuel Update</p>
                <p className="font-medium">
                  {activeTruck.last_fuel
                    ? new Date(activeTruck.last_fuel).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TruckMonitor;
