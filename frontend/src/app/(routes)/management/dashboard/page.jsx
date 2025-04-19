"use client";

import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import { getLatLngsForMap } from "@/app/utils/polylineDecoder";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Image from "next/image";
import { useAuth } from "@/app/contexts/AuthContext";
import ApexCharts from "apexcharts";

// Fix Leaflet icon issue
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
  iconUrl: "/truck-icon.png", // Make sure this file exists in public folder
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

// Sample activity data (from layout.tsx)
const aktivitas = [
  { day: "Today" },
  { day: "Monday", date: "12/12/2023" },
  { day: "Tuesday", date: "12/12/2023" },
  { day: "Wednesday", date: "12/12/2023" },
  { day: "Thursday", date: "12/12/2023" },
  { day: "Friday", date: "12/12/2023" },
  { day: "Saturday", date: "12/12/2023" },
  { day: "Sunday", date: "12/12/2023" },
];

const DashboardPage = () => {
  const [trucks, setTrucks] = useState({});
  const [activeTruck, setActiveTruck] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRoutePlans, setActiveRoutePlans] = useState([]);
  const [loadingRoutePlans, setLoadingRoutePlans] = useState(false);
  const socketRef = useRef(null);
  const componentMountedRef = useRef(true);
  const chartRef = useRef(null);
  const mapRef = useRef(null);
  const { user } = useAuth();

  // Default center of the map (Jakarta)
  const defaultCenter = [-6.2, 106.816666];
  
  // Fungsi untuk decode polyline dari routeGeometry
  const decodeRouteGeometry = (encoded) => {
    if (!encoded) return [];
    try {
      // Gunakan decoder dari utility untuk decode Google Polyline format
      return getLatLngsForMap(encoded);
    } catch (e) {
      console.error("Error decoding route geometry:", e);
      return [];
    }
  };

  // Fungsi untuk mendapatkan warna berdasarkan truck ID dan status aktif
  const getTruckRouteColor = (routePlan) => {
    // Warna default untuk rute yang tidak aktif (abu-abu muda)
    const defaultColor = "#cccccc";
    
    // Warna-warna untuk rute aktif
    const colors = ["#3388ff", "#33cc33", "#ff3300", "#9933ff", "#ff9900", "#00ccff"];
    
    // Jika ada truck yang aktif/dipilih
    if (activeTruck) {
      // Cek apakah route plan milik truck yang aktif
      const routePlanPlate = routePlan.vehicle_plate ? routePlan.vehicle_plate.split('/')[0] : '';
      const routePlanMacId = routePlan.vehicle_plate ? routePlan.vehicle_plate.split('/')[1] : '';
      
      // Jika plate number atau mac_id cocok dengan truck yang aktif
      if (routePlanPlate === activeTruck.plate_number || routePlanMacId === activeTruck.mac_id) {
        return colors[routePlan.id % colors.length];
      } else {
        // Jika bukan milik truck yang aktif, tampilkan abu-abu
        return defaultColor;
      }
    } else {
      // Jika tidak ada truck yang dipilih, tampilkan semua rute dengan warna berbeda
      return colors[routePlan.id % colors.length];
    }
  };

  // Get token from localStorage
  const getToken = () => localStorage.getItem("token");

  // Fungsi untuk mengambil route plan yang active
  const fetchActiveRoutePlans = async () => {
    try {
      setLoadingRoutePlans(true);
      const response = await fetch("/api/v1/route-plans/active/all", {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.data) {
        console.log("Active route plans received:", data.data.length);
        console.log("Route plan data sample:", data.data[0]);
        
        // Pastikan setiap route plan memiliki route_geometry
        const validRoutePlans = data.data.filter(plan => {
          const hasGeometry = !!plan.route_geometry;
          if (!hasGeometry) {
            console.warn(`Route plan ${plan.id} doesn't have route geometry`);
          }
          return hasGeometry;
        });
        
        console.log("Valid route plans with geometry:", validRoutePlans.length);
        setActiveRoutePlans(validRoutePlans);
      } else {
        console.warn("Empty or invalid response for active route plans");
        setActiveRoutePlans([]);
      }
    } catch (err) {
      console.error("Error fetching active route plans:", err);
      setActiveRoutePlans([]);
    } finally {
      setLoadingRoutePlans(false);
    }
  };

  // Refresh active route plans secara periodik
  useEffect(() => {
    // Fetch route plans
    fetchActiveRoutePlans();

    // Set interval untuk refresh data setiap 30 detik
    const interval = setInterval(() => {
      if (componentMountedRef.current) {
        fetchActiveRoutePlans();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

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
        trucksMap[truck.mac_id] = {
            ...truck,
            // Store extra information for matching with routes later
              routeKey: `${truck.plate_number}/${truck.mac_id}`,
              };
            });
            setTrucks(trucksMap);
            console.log("Trucks data loaded:", Object.keys(trucksMap).length);
            console.log("Sample truck:", Object.values(trucksMap)[0]);
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

  // Initialize chart when activeTruck changes
  useEffect(() => {
    if (!activeTruck) return;

    const initChart = () => {
      const chartElement = document.querySelector("#fleet-chart");
      if (!chartElement) return;

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const options = {
        chart: {
          type: "line",
          height: 200,
        },
        series: [
          {
            name: "Fuel Level",
            data: [70, 65, 60, 72, 68, 74, 71, 69, 73], // Sample data, replace with real truck data
          },
        ],
        xaxis: {
          categories: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
          ],
        },
        colors: ["#009EFF"],
        stroke: {
          curve: "smooth",
        },
      };

      chartRef.current = new ApexCharts(chartElement, options);
      chartRef.current.render();
    };

    // Initialize chart with a small delay to ensure the element is ready
    setTimeout(initChart, 200);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [activeTruck]);

  // Fungsi untuk mengecek apakah truck memiliki rute aktif
  const truckHasActiveRoute = (truck) => {
    if (!activeRoutePlans || !truck) return false;
    
    // Log data truck dan route plans untuk debug
    console.log('Checking active route for truck:', truck.mac_id, truck.plate_number);
    
    // Coba cari berdasarkan plate_number jika ada (dari frontend)
    if (truck.plate_number) {
      const routeByPlate = activeRoutePlans.some(routePlan => {
        const truckPlate = routePlan.vehicle_plate ? routePlan.vehicle_plate.split('/')[0] : '';
        return truckPlate === truck.plate_number;
      });
      if (routeByPlate) return true;
    }
    
    // Coba cari berdasarkan mac_id jika id tidak cocok
    return activeRoutePlans.some(routePlan => {
      const truckMacId = routePlan.vehicle_plate ? routePlan.vehicle_plate.split('/')[1] : '';
      return truckMacId === truck.mac_id;
    });
  };

  // Modified to toggle selection when clicking the same truck
  const handleTruckSelect = (truck) => {
    // Log detail truck yang dipilih untuk debugging
    console.log("Truck selected:", truck);
    console.log("Active route plans:", activeRoutePlans);
    
    // If the same truck is clicked again, unselect it
    if (activeTruck && activeTruck.mac_id === truck.mac_id) {
      setActiveTruck(null);
    } else {
      // Otherwise select the new truck
      setActiveTruck(truck);
    }
  };

  // New function to handle marker click on the map
  const handleMarkerClick = (truck) => {
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
    <div className="px-4 md:px-8">
      {/* Connection Status and Route Legend */}
      <div className="flex justify-between mb-4">
        {/* Legend untuk active routes */}
        {activeRoutePlans.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Active Routes:</span>
            {/* Jika ada truck yang dipilih, hanya tampilkan rute dari truck tersebut di legenda */}
            {activeTruck ? (
              // Filter hanya rute milik truck yang sedang aktif
              // Filter hanya rute milik truck yang sedang aktif
              activeRoutePlans.filter(routePlan => {
                if (!activeTruck) return false;
                
                // Get data from route plan
                const routePlanPlate = routePlan.vehicle_plate ? routePlan.vehicle_plate.split('/')[0] : '';
                const routePlanMacId = routePlan.vehicle_plate ? routePlan.vehicle_plate.split('/')[1] : '';
                
                // Check if matches active truck
                return (routePlanPlate === activeTruck.plate_number || routePlanMacId === activeTruck.mac_id);
              }).length > 0 ? (
                // Tampilkan rute truck yang aktif
                activeRoutePlans
                  .filter(routePlan => {
                    if (!activeTruck) return false;
                    
                    // Get data from route plan
                    const routePlanPlate = routePlan.vehicle_plate ? routePlan.vehicle_plate.split('/')[0] : '';
                    const routePlanMacId = routePlan.vehicle_plate ? routePlan.vehicle_plate.split('/')[1] : '';
                    
                    // Check if matches active truck
                    return (routePlanPlate === activeTruck.plate_number || routePlanMacId === activeTruck.mac_id);
                  })
                  .map((routePlan, index) => (
                    <div key={`legend-${routePlan.id}`} className="flex items-center gap-1">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: getTruckRouteColor(routePlan) }}
                      ></div>
                      <span className="text-xs">
                        {routePlan.vehicle_plate ? routePlan.vehicle_plate.split('/')[0] : `Route ${routePlan.id}`}
                      </span>
                    </div>
                  ))
              ) : (
                // Tampilkan pesan jika tidak ada rute aktif untuk truck yang dipilih
                <span className="text-xs text-gray-500 italic">No active routes for selected truck</span>
              )
            ) : (
              // Tampilkan semua rute jika tidak ada truck yang dipilih
              activeRoutePlans.map((routePlan, index) => (
                <div key={`legend-${routePlan.id}`} className="flex items-center gap-1">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: getTruckRouteColor(routePlan) }}
                  ></div>
                  <span className="text-xs">
                    {routePlan.vehicle_plate ? routePlan.vehicle_plate.split('/')[0] : `Route ${routePlan.id}`}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Connection Status */}
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium text-white ${
            connected ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {connected ? "Connected" : "Disconnected"}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-200px)]">
        {/* Truck List Sidebar (using UI from layout.tsx) */}
        <div className="w-full lg:w-72 bg-white shadow-md rounded-lg p-4 overflow-y-auto max-h-[400px] lg:max-h-full">
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
                  className={`bg-white rounded-lg p-3 border cursor-pointer transition duration-200 hover:shadow-md ${
                    activeTruck && activeTruck.mac_id === truck.mac_id
                      ? "border-l-4 border-[#009EFF] bg-[#E6F5FF]"
                      : truckHasActiveRoute(truck) 
                        ? "border-l-4 border-green-500 border-opacity-50" 
                        : "border-gray-200"
                  }`}
                  onClick={() => handleTruckSelect(truck)}
                >
                  <div className="flex items-center gap-2">
                    <i className="bx bx-car rounded-full bg-[#009EFF] text-white text-xl p-2 flex items-center justify-center"></i>
                    <div className="flex flex-col w-full">
                      <div className="flex items-center gap-1">
                        <h3 className="font-medium">
                          {truck.plate_number}
                        </h3>
                        {truckHasActiveRoute(truck) && (
                          <span className="w-2 h-2 rounded-full bg-green-500" title="Has active route"></span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {`${truck.mac_id} | ${truck.type}`}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fuel:</span>
                      <span>
                        {truck.fuel !== undefined
                          ? `${truck.fuel.toFixed(2)}%`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Update:</span>
                      <span>
                        {truck.last_position
                          ? new Date(truck.last_position).toLocaleTimeString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map and Chart Container */}
        <div className="flex-1 flex flex-col">
          {/* Map Container */}
          <div 
            ref={mapRef}
            className={`relative flex-1 mb-4 transition-all duration-300 ${
              activeTruck ? "h-[calc(100%-250px)]" : "h-full"
            }`}
          >
            <MapContainer
              center={
                hasPositionData && activeTruck?.latitude
                  ? [activeTruck.latitude, activeTruck.longitude]
                  : defaultCenter
              }
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              whenCreated={(map) => {
                mapRef.current = map;
              }}
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
                    eventHandlers={{
                      click: () => handleMarkerClick(truck),
                    }}
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

              {/* Render polylines untuk semua active route plans */}
              {activeRoutePlans.map((routePlan) => {
                // Decode route geometry dengan decoder yang benar
                const positions = decodeRouteGeometry(routePlan.route_geometry);
                if (!positions || positions.length === 0) return null;
                
                return (
                  <Polyline
                    key={`route-${routePlan.id}`}
                    positions={positions}
                    color={getTruckRouteColor(routePlan)}
                    weight={5}
                    opacity={0.7}
                  />
                );
              })}
            </MapContainer>
          </div>

          {/* Chart Panel - Only visible when a truck is selected */}
          {activeTruck && (
            <div className="bg-white shadow-md py-3 rounded-lg w-full transition-opacity duration-300">
              <div className="flex flex-col md:flex-row justify-between mb-2 gap-4 px-4">
                <div className="flex gap-2">
                  <button className="p-2 bg-[#009EFF] text-white rounded-[8px] flex gap-2 items-center text-sm">
                    <i className="bx bx-radar text-lg"></i> Sensor
                  </button>
                  <button className="p-2 text-[#009EFF] border border-[#009EFF] rounded-[8px] flex gap-2 items-center text-sm">
                    <i className="bx bx-data text-lg"></i> Data
                  </button>
                </div>
                <div className="flex justify-between md:justify-end gap-3 text-xs md:text-sm">
                  <div className="flex flex-col items-center">
                    <p className="font-semibold">96.695</p>
                    <p className="text-[#707070]">Kilometer</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="font-semibold">03:57:34</p>
                    <p className="text-[#707070]">Driving</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="font-semibold">01:02:09</p>
                    <p className="text-[#707070]">Idling</p>
                  </div>
                </div>
              </div>
              <div id="fleet-chart" className="w-full h-[200px]" />
            </div>
          )}
        </div>

        {/* Truck Details Panel - Only visible when a truck is selected */}
        {activeTruck && (
          <div className="w-full lg:w-80 bg-white shadow-md rounded-lg p-4 overflow-y-auto max-h-[400px] lg:max-h-full">
            <div className="flex flex-row lg:flex-col">
              {/* Left column (Details) */}
              <div className="flex-1 pr-4 lg:pr-0">
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

              {/* Right column (Activity) - Only on small screens */}
              <div className="flex-1 pl-4 border-l lg:border-l-0 lg:pl-0 lg:pt-4 lg:mt-4 lg:border-t">
                <span className="text-xs text-[#009EFF] font-medium block mb-2">Aktivitas</span>
                <div className="flex flex-col gap-2 overflow-y-auto text-xs">
                  {aktivitas.slice(0, 4).map((item, index) => (
                    <div
                      key={index}
                      className="border border-[#F1F1F1] p-3 rounded-md"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-[#484848]">
                          {item.day}
                          {item.date && (
                            <span className="text-[#ADADAD] font-light ml-2">
                              {item.date}
                            </span>
                          )}
                        </span>
                        <span className="text-yellow-500">!</span>
                      </div>
                      <div className="w-full h-1 rounded-[8px] bg-gray-300 relative">
                        <div
                          className="h-full bg-blue-500 rounded-[8px]"
                          style={{ width: `${45 + Math.random() * 30}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;