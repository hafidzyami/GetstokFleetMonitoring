"use client";

import "leaflet/dist/leaflet.css";

import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { debugTruckRouteMatch, getRouteColor } from "@/app/utils/colorUtils";

import ApexCharts from "apexcharts";
import L from "leaflet";
import WaypointMarkers from "@/app/_components/WaypointMarkers";
import { getLatLngsForMap } from "@/app/utils/polylineDecoder";
import { initLeafletIcons } from "@/app/utils/leafletIcons";
import { useAuth } from "@/app/contexts/AuthContext";
import { calculateDistanceToPolyline } from "@/app/utils/distanceUtils";

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

// Custom truck icon for deviating trucks
const deviatingTruckIcon = new L.Icon({
  iconUrl: "/truck-icon.png", // Create this icon in red or with alert symbol
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Reference point icon
const referencePointIcon = new L.Icon({
  iconUrl: "/marker-icon.png", // Create a small dot/marker icon
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});

// Custom divIcon for showing deviation distance
const createDeviationLabelIcon = (distance) => {
  return L.divIcon({
    className: "deviation-label",
    html: `<div class="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">${distance.toFixed(
      0
    )}m</div>`,
    iconSize: [40, 20],
    iconAnchor: [20, 10],
  });
};

// Custom truck icon
const truckIcon = new L.Icon({
  iconUrl: "/truck-icon.png", // Make sure this file exists in public folder
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Component to automatically center map on active truck and route
function MapController({ activePosition, activeTruck, activeRoutePlans }) {
  const map = useMap();

  useEffect(() => {
    // Jika ada truck yang aktif dengan posisi, fokus ke posisi truck
    if (activePosition && activePosition.latitude && activePosition.longitude) {
      // Default zoom level untuk posisi truck
      const defaultZoom = 15;

      // Jika ada truck yang aktif, cari rute yang sesuai dengan truck tersebut
      if (activeTruck && activeRoutePlans && activeRoutePlans.length > 0) {
        // Filter rute yang milik truck aktif
        const activeTruckRoutes = activeRoutePlans.filter((routePlan) => {
          const routePlanPlate = routePlan.vehicle_plate
            ? routePlan.vehicle_plate.split("/")[0]
            : "";
          const routePlanMacId = routePlan.vehicle_plate
            ? routePlan.vehicle_plate.split("/")[1]
            : "";
          return (
            routePlanPlate === activeTruck.plate_number ||
            routePlanMacId === activeTruck.mac_id
          );
        });

        // Jika ada rute untuk truck aktif, buat bounds dari polyline
        if (activeTruckRoutes.length > 0) {
          try {
            // Ambil rute pertama yang sesuai
            const route = activeTruckRoutes[0];
            const positions = getLatLngsForMap(route.route_geometry);

            if (positions && positions.length > 0) {
              // Buat bounds dari semua posisi di rute
              const bounds = L.latLngBounds(positions);

              // Tambahkan posisi truck ke bounds
              bounds.extend([
                activePosition.latitude,
                activePosition.longitude,
              ]);

              // Fitkan peta ke bounds dengan padding
              map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: defaultZoom,
              });
              return;
            }
          } catch (error) {
            console.error("Error creating bounds from route:", error);
          }
        }
      }

      // Jika tidak ada rute yang valid atau terjadi error, fokus ke posisi truck saja
      map.setView(
        [activePosition.latitude, activePosition.longitude],
        defaultZoom
      );
    }
  }, [activePosition, activeTruck, activeRoutePlans, map]);

  return null;
}

const DashboardPage = () => {
  const [trucks, setTrucks] = useState({});
  const [activeTruck, setActiveTruck] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRoutePlans, setActiveRoutePlans] = useState([]);
  const [loadingRoutePlans, setLoadingRoutePlans] = useState(false);
  const [deviatingTrucks, setDeviatingTrucks] = useState({});
  const [showDeviationAlert, setShowDeviationAlert] = useState(false);
  const [deviationThreshold] = useState(35); // Deviation threshold in meters
  const [deviationReferences, setDeviationReferences] = useState({});
  const socketRef = useRef(null);
  const componentMountedRef = useRef(true);
  const chartRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState("Today");
  const [viewMode, setViewMode] = useState("sensor"); // default view is 'sensor'
  const [fuelData, setFuelData] = useState({});
  const [fuelReceipts, setFuelReceipts] = useState([]);
  const [activityDays, setActivityDays] = useState([]);
  const [loadingFuelData, setLoadingFuelData] = useState(false);
  const [loadingFuelReceipts, setLoadingFuelReceipts] = useState(false);

  const [defaultCenter, setDefaultCenter] = useState([-6.2, 106.816666]);

  // Effect to get user's current location
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("User location obtained:", latitude, longitude);
          setDefaultCenter([latitude, longitude]);
        },
        (error) => {
          console.error("Error getting user location:", error.message);
          // Keep the default Jakarta location on error
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
    }
  }, []);

  // Generate activity days for today and past 4 days
  useEffect(() => {
    const generateActivityDays = () => {
      const days = [];
      const today = new Date();
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      // Add today
      days.push({
        day: "Today",
        date: today.toLocaleDateString(),
        isoDate: today.toISOString().split("T")[0],
      });

      // Add past 4 days
      for (let i = 1; i <= 4; i++) {
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - i);

        days.push({
          day: dayNames[pastDate.getDay()],
          date: pastDate.toLocaleDateString(),
          isoDate: pastDate.toISOString().split("T")[0],
        });
      }

      setActivityDays(days);
    };

    generateActivityDays();
  }, []);

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
    const defaultColor = "#dddddd";

    // Jika ada truck yang aktif/dipilih
    if (activeTruck) {
      // Cek apakah route plan milik truck yang aktif
      const isActiveTruckRoute = debugTruckRouteMatch(activeTruck, routePlan);

      // Jika milik truck yang aktif, berikan warna berdasarkan ID
      if (isActiveTruckRoute) {
        return getRouteColor(routePlan);
      } else {
        // Jika bukan milik truck yang aktif, tampilkan abu-abu
        return defaultColor;
      }
    } else {
      // Jika tidak ada truck yang dipilih, tampilkan semua rute dengan warna berbeda
      return getRouteColor(routePlan);
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
        const validRoutePlans = data.data.filter((plan) => {
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

  // Function to fetch fuel history for a specific truck
  const fetchFuelHistory = async (truckId, date) => {
    if (!truckId) return;

    try {
      setLoadingFuelData(true);

      // Convert date string to API expected format (YYYY-MM-DD)
      let startDate, endDate;

      if (date) {
        startDate = date;
        endDate = date;
      } else {
        // If no date is provided, use today
        const today = new Date().toISOString().split("T")[0];
        startDate = today;
        endDate = today;
      }

      console.log(`Fetching fuel history for truck ${truckId} from ${startDate} to ${endDate}`);
      
      const response = await fetch(
        `/api/v1/trucks/${truckId}/fuel?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Raw fuel history response:", data);

      if (data && data.data) {
        console.log("Fuel history received:", data.data);
        
        // Handle both the DateGroupedFuelHistory format and direct array format
        let fuelData;
        
        if (Array.isArray(data.data)) {
          // This is the direct format from date range queries
          fuelData = data.data;
          console.log("Using direct fuel history array format");
        } else if (Array.isArray(data.data.Fuels)) {
          // This might be the grouped format from 30-day query, with a single date
          fuelData = data.data.Fuels;
          console.log("Using single day fuel history format");
        } else if (Array.isArray(data.data)) {
          // This is the grouped format from 30-day query, with multiple dates
          // Find the entry for our specific date if exists
          const dateEntry = data.data.find(entry => entry.Date === date);
          fuelData = dateEntry?.Fuels || [];
          console.log(`Using fuel history for date ${date}`);
        } else {
          console.warn("Unknown fuel history data format", data.data);
          fuelData = [];
        }

        // Process fuel data for chart display
        const processedData = processFuelData(fuelData);

        // Update state with the new data
        setFuelData((prevData) => ({
          ...prevData,
          [date || "today"]: processedData,
        }));
      }
    } catch (err) {
      console.error("Error fetching fuel history:", err);
    } finally {
      setLoadingFuelData(false);
    }
  };

  // Function to process fuel data for chart display
  const processFuelData = (data) => {
    if (!data || !Array.isArray(data)) {
      console.warn("Invalid fuel data format", data);
      return { times: [], levels: [] };
    }

    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    console.log("Sorted fuel data sample:", sortedData.length > 0 ? sortedData[0] : "No data");

    // Extract times and fuel levels
    const times = sortedData.map((item) => {
      const date = new Date(item.timestamp);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    });

    const levels = sortedData.map((item) => {
      // Handle different property names - use fuel_level or fuel depending on which exists
      if (typeof item.fuel_level === "number") {
        return item.fuel_level;
      } else if (typeof item.fuel === "number") {
        return item.fuel;
      } else {
        console.warn("Missing fuel level data in item:", item);
        return 0; // Default value
      }
    });

    console.log(`Processed ${times.length} fuel data points for chart`);
    return { times, levels };
  };

  const fetchFuelReceipts = async (truckId, startDate, endDate) => {
    if (!truckId) return;

    try {
      setLoadingFuelReceipts(true);

      // Fix: Properly construct URL with actual truckId value
      let url = `/api/v1/fuel-receipts/truck/${truckId}`;

      // Add query parameters with proper ? and & syntax
      const queryParams = [];

      if (startDate) {
        queryParams.push(`start_date=${startDate}`);
      }

      if (endDate) {
        queryParams.push(`end_date=${endDate}`);
      }

      // Add query parameters to URL if any exist
      if (queryParams.length > 0) {
        url += `?${queryParams.join("&")}`;
      }

      console.log("Fetching fuel receipts from URL:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Raw API response:", data);

      // Fix: Match the actual data structure from the API
      if (data && data.data && data.data.receipts) {
        console.log("Fuel receipts received:", data.data.receipts);
        setFuelReceipts(data.data.receipts);
      } else {
        console.log("No fuel receipts data or empty array received:", data);
        setFuelReceipts([]);
      }
    } catch (err) {
      console.error("Error fetching fuel receipts:", err);
      setFuelReceipts([]);
    } finally {
      setLoadingFuelReceipts(false);
    }
  };

  // Effect to fetch fuel data when activeTruck or selectedDay changes
  useEffect(() => {
    if (!activeTruck) return;

    // Find the selected day in activityDays
    const selectedDayInfo = activityDays.find((day) => day.day === selectedDay);
    if (!selectedDayInfo) return;

    // Fetch fuel history for the selected day
    fetchFuelHistory(activeTruck.id, selectedDayInfo.isoDate);

    // Fetch fuel receipts for the selected day
    fetchFuelReceipts(
      activeTruck.id,
      selectedDayInfo.isoDate,
      selectedDayInfo.isoDate
    );
  }, [activeTruck, selectedDay, activityDays]);

  // Refresh active route plans secara periodik
  useEffect(() => {
    // Inisialisasi icon Leaflet
    initLeafletIcons();

    // Fetch route plans
    fetchActiveRoutePlans();

    // Set interval untuk refresh data setiap 60 detik
    const interval = setInterval(() => {
      if (componentMountedRef.current) {
        fetchActiveRoutePlans();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Hanya periksa jika ada truck dan ada route plans
    if (Object.keys(trucks).length > 0 && activeRoutePlans.length > 0) {
      checkTruckDeviation();

      // Set interval untuk memeriksa deviasi setiap 60 detik
      const deviationInterval = setInterval(() => {
        if (componentMountedRef.current) {
          checkTruckDeviation();
        }
      }, 60000);

      return () => clearInterval(deviationInterval);
    }
  }, [trucks, activeRoutePlans]);

  // Initialize chart when activeTruck changes
  // Effect to handle popup opening/closing when active truck changes
  useEffect(() => {
    // Close all popups first
    Object.values(markerRefs.current).forEach((marker) => {
      if (marker && marker.closePopup) {
        marker.closePopup();
      }
    });

    // If there's an active truck, open its popup
    if (activeTruck) {
      // Short delay to ensure the map has updated
      setTimeout(() => {
        const markerRef = markerRefs.current[activeTruck.mac_id];
        if (markerRef) {
          markerRef.openPopup();
        }
      }, 50);
    }
  }, [activeTruck]);

  // Initialize chart when fuel data changes
  useEffect(() => {
    if (!activeTruck || viewMode !== "sensor") return;

    const chartElement = document.querySelector("#fleet-chart");
    if (!chartElement) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Find the selected day in activityDays
    const selectedDayInfo = activityDays.find((day) => day.day === selectedDay);
    if (!selectedDayInfo) return;

    // Get fuel data for the selected day
    const dayFuelData = fuelData[selectedDayInfo.isoDate] || fuelData["today"];

    if (!dayFuelData) {
      console.log("No fuel data for the selected day. Waiting for data...");
      // If no data yet, don't render chart
      return;
    }

    const { times, levels } = dayFuelData;
    console.log(`Rendering chart with ${times.length} data points. Selected day: ${selectedDay}`);

    // If no real data available, use placeholder message
    if (times.length === 0) {
      // Create a temporary div with a message
      const messageDiv = document.createElement('div');
      messageDiv.className = 'flex justify-center items-center h-[200px] text-gray-500';
      messageDiv.innerHTML = 'No fuel sensor data available for the selected day';
      
      // Clear chart container and append message
      chartElement.innerHTML = '';
      chartElement.appendChild(messageDiv);
      return;
    }

    // Actual data points exist, render chart
    const options = {
      chart: {
        type: "line",
        height: 200,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
        },
      },
      series: [
        {
          name: "Fuel Level",
          data: levels,
        },
      ],
      xaxis: {
        categories: times,
        title: {
          text: "Waktu (Jam)",
        },
        labels: {
          rotate: -45,
          style: {
            fontSize: '10px',
          },
        },
      },
      yaxis: {
        title: {
          text: "Level BBM (%)",
        },
        min: 0,
        max: 100,
        forceNiceScale: true,
      },
      title: {
        text: `Fuel Levels - ${selectedDayInfo.day} (${selectedDayInfo.date})`,
        align: 'center',
        style: {
          fontSize: '14px',
        },
      },
      subtitle: {
        text: activeTruck ? `Truck: ${activeTruck.plate_number || activeTruck.mac_id}` : '',
        align: 'center',
      },
      colors: ["#009EFF"],
      stroke: {
        curve: "smooth",
        width: 3,
      },
      markers: {
        size: 4,
        hover: {
          size: 6,
        },
      },
      tooltip: {
        y: {
          formatter: (value) => `${value}%`,
        },
        x: {
          show: true,
        },
      },
      grid: {
        row: {
          colors: ['transparent', 'transparent'],
          opacity: 0.2
        },
        borderColor: '#f1f1f1'
      },
    };

    chartRef.current = new ApexCharts(chartElement, options);
    chartRef.current.render();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [activeTruck, selectedDay, viewMode, fuelData]);

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

  // Fungsi untuk mengecek apakah truck memiliki rute aktif
  const truckHasActiveRoute = (truck) => {
    if (!activeRoutePlans || !truck) return false;

    // Log data truck dan route plans untuk debug
    console.log(
      "Checking active route for truck:",
      truck.mac_id,
      truck.plate_number
    );

    // Iterate through all route plans and check if any matches this truck
    return activeRoutePlans.some((routePlan) => {
      return debugTruckRouteMatch(truck, routePlan);
    });
  };

  // Fungsi untuk mengecek deviasi truck dari rute yang ditentukan
  const checkTruckDeviation = () => {
    // Buat objek untuk menyimpan status deviasi setiap truck
    const newDeviatingTrucks = {};
    const newDeviationReferences = {};
    let anyTruckDeviating = false;

    // Periksa setiap truck yang memiliki posisi
    Object.values(trucks).forEach((truck) => {
      // Skip jika tidak ada posisi latitude/longitude
      if (!truck.latitude || !truck.longitude) return;

      // Cari rute yang sesuai dengan truck ini
      const truckRoutes = activeRoutePlans.filter((routePlan) => {
        return debugTruckRouteMatch(truck, routePlan);
      });

      // Skip jika tidak memiliki rute aktif
      if (truckRoutes.length === 0) return;

      // Periksa jarak truck ke rute terdekat
      truckRoutes.forEach((routePlan) => {
        try {
          // Decode polyline rute
          const routePolyline = getLatLngsForMap(routePlan.route_geometry);
          if (!routePolyline || routePolyline.length === 0) return;

          // Hitung jarak dari posisi truck ke polyline rute
          const result = calculateDistanceToPolyline(
            [truck.latitude, truck.longitude],
            routePolyline
          );

          const distanceToRoute = result.distance;
          const referencePoint = result.referencePoint;
          const segmentIndex = result.segmentIndex;

          console.log(
            `Truck ${
              truck.plate_number || truck.mac_id
            } deviation: ${distanceToRoute.toFixed(2)}m`
          );

          // Check if truck deviates more than the threshold
          if (distanceToRoute >= deviationThreshold) {
            newDeviatingTrucks[truck.mac_id] = {
              truck: truck,
              routePlan: routePlan,
              distance: distanceToRoute,
              timestamp: new Date(),
            };

            // Simpan referensi untuk visualisasi
            newDeviationReferences[truck.mac_id] = {
              truckPosition: [truck.latitude, truck.longitude],
              referencePoint: referencePoint,
              segmentIndex: segmentIndex,
              distance: distanceToRoute,
              routeId: routePlan.id,
            };

            anyTruckDeviating = true;
          }
        } catch (error) {
          console.error(
            `Error checking deviation for truck ${
              truck.plate_number || truck.mac_id
            }:`,
            error
          );
        }
      });
    });

    // Update state dengan truck-truck yang menyimpang
    setDeviatingTrucks(newDeviatingTrucks);
    setDeviationReferences(newDeviationReferences);
    setShowDeviationAlert(anyTruckDeviating);
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
    <div className="">
      {/* Deviation Alert Notification */}
      {showDeviationAlert && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <i className="bx bx-error-circle text-2xl text-red-500"></i>
            </div>
            <div className="ml-3">
              <p className="font-bold">Route Deviation Alert</p>
              <p className="text-sm">
                {Object.keys(deviatingTrucks).length === 1
                  ? `1 truck is deviating from its assigned route by more than ${deviationThreshold} meters.`
                  : `${
                      Object.keys(deviatingTrucks).length
                    } trucks are deviating from their assigned routes by more than ${deviationThreshold} meters.`}
              </p>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setShowDeviationAlert(false)}
                className="text-red-500 hover:text-red-700 focus:outline-none"
              >
                <i className="bx bx-x text-xl"></i>
              </button>
            </div>
          </div>
          <div className="mt-2 max-h-32 overflow-y-auto">
            {Object.values(deviatingTrucks).map(({ truck, distance }) => (
              <div
                key={truck.mac_id}
                className="flex justify-between items-center text-sm mt-1 border-t border-red-200 pt-1"
              >
                <span className="font-medium">
                  {truck.plate_number || truck.mac_id}
                </span>
                <span>
                  Off route by{" "}
                  <span className="font-bold">{distance.toFixed(0)}m</span>
                </span>
                <button
                  onClick={() => handleTruckSelect(truck)}
                  className="px-2 py-1 bg-red-200 hover:bg-red-300 rounded text-xs"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Connection Status and Route Legend */}
      <div className="flex justify-between mb-4">
        {/* Legend untuk active routes */}
        {activeRoutePlans.length > 0 && (
          <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
            <span className="text-sm font-medium">Active Routes:</span>
            {/* Jika ada truck yang dipilih, hanya tampilkan rute dari truck tersebut di legenda */}
            {activeTruck ? (
              // Filter hanya rute milik truck yang sedang aktif
              activeRoutePlans.filter((routePlan) => {
                if (!activeTruck) return false;
                return debugTruckRouteMatch(activeTruck, routePlan);
              }).length > 0 ? (
                // Tampilkan rute truck yang aktif
                activeRoutePlans
                  .filter((routePlan) => {
                    if (!activeTruck) return false;
                    return debugTruckRouteMatch(activeTruck, routePlan);
                  })
                  .map((routePlan, index) => (
                    <div
                      key={`legend-${routePlan.id}`}
                      className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: getRouteColor(routePlan) }}
                      ></div>
                      <span className="text-xs font-medium">
                        {routePlan.vehicle_plate
                          ? routePlan.vehicle_plate.split("/")[0]
                          : `Route ${routePlan.id}`}
                      </span>
                    </div>
                  ))
              ) : (
                // Tampilkan pesan jika tidak ada rute aktif untuk truck yang dipilih
                <span className="text-xs text-gray-500 italic bg-gray-100 px-2 py-1 rounded">
                  No active routes for selected truck
                </span>
              )
            ) : (
              // Tampilkan semua rute jika tidak ada truck yang dipilih
              activeRoutePlans.map((routePlan, index) => (
                <div
                  key={`legend-${routePlan.id}`}
                  className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: getRouteColor(routePlan) }}
                  ></div>
                  <span className="text-xs font-medium">
                    {routePlan.vehicle_plate
                      ? routePlan.vehicle_plate.split("/")[0]
                      : `Route ${routePlan.id}`}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Connection Status */}
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium text-white flex items-center gap-1 ${
            connected ? "bg-green-500" : "bg-red-500"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-white animate-pulse" : "bg-gray-200"
            }`}
          ></span>
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
                      ? "border-l-4 border-[#009EFF] bg-[#E6F5FF] shadow-md"
                      : deviatingTrucks[truck.mac_id]
                      ? "border-l-4 border-red-500 bg-red-50"
                      : truckHasActiveRoute(truck)
                      ? "border-l-4 border-green-500 border-opacity-70"
                      : "border-gray-200"
                  }`}
                  onClick={() => handleTruckSelect(truck)}
                >
                  <div className="flex items-center gap-2">
                    <i className="bx bx-car rounded-full bg-[#009EFF] text-white text-xl p-2 flex items-center justify-center"></i>
                    <div className="flex flex-col w-full">
                      <div className="flex items-center gap-1">
                        <h3 className="font-medium">{truck.plate_number}</h3>
                        {truckHasActiveRoute(truck) && (
                          <span
                            className="w-2 h-2 rounded-full bg-green-500"
                            title="Has active route"
                          ></span>
                        )}
                        {deviatingTrucks[truck.mac_id] && (
                          <span
                            className="flex items-center text-xs text-red-500 font-bold ml-1 animate-pulse"
                            title={`Off route by ${deviatingTrucks[
                              truck.mac_id
                            ].distance.toFixed(0)}m`}
                          >
                            <i className="bx bxs-error-circle mr-1"></i>
                            Off Route!
                          </span>
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

              {Object.values(trucks).map((truck) => {
                // For each truck with position data, create a marker with popup
                if (!truck.latitude || !truck.longitude) return null;

                // Create marker element with TruckMarker component
                return (
                  <TruckMarker
                    key={truck.mac_id}
                    truck={truck}
                    isDeviating={!!deviatingTrucks[truck.mac_id]}
                    deviation={deviatingTrucks[truck.mac_id]}
                    isActive={
                      activeTruck && activeTruck.mac_id === truck.mac_id
                    }
                    onClick={handleMarkerClick}
                    markerRefs={markerRefs}
                  />
                );
              })}

              {/* Visualisasi Titik Referensi dan Deviasi */}
              {Object.entries(deviationReferences).map(
                ([mac_id, deviationInfo]) => (
                  <React.Fragment key={`deviation-vis-${mac_id}`}>
                    {/* Titik referensi pada polyline */}
                    <Marker
                      position={deviationInfo.referencePoint}
                      icon={referencePointIcon}
                    >
                      <Popup>
                        <div>
                          <h3 className="font-bold text-sm">Reference Point</h3>
                          <p className="text-xs">
                            This is the closest point on the route to truck{" "}
                            {trucks[mac_id]?.plate_number || mac_id}
                          </p>
                          <p className="text-xs mt-1">
                            Position:{" "}
                            {deviationInfo.referencePoint[0].toFixed(6)},{" "}
                            {deviationInfo.referencePoint[1].toFixed(6)}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                    {/* Garis yang menunjukkan deviasi */}
                    <Polyline
                      positions={[
                        deviationInfo.truckPosition,
                        deviationInfo.referencePoint,
                      ]}
                      pathOptions={{
                        color: "red",
                        weight: 2,
                        dashArray: "5, 5",
                        opacity: 0.7,
                      }}
                    />

                    {/* Label jarak di tengah garis */}
                    <Marker
                      position={[
                        (deviationInfo.truckPosition[0] +
                          deviationInfo.referencePoint[0]) /
                          2,
                        (deviationInfo.truckPosition[1] +
                          deviationInfo.referencePoint[1]) /
                          2,
                      ]}
                      icon={createDeviationLabelIcon(deviationInfo.distance)}
                      interactive={false}
                    />
                  </React.Fragment>
                )
              )}
              {activeTruck && activeTruck.latitude && activeTruck.longitude && (
                <MapController
                  activePosition={activeTruck}
                  activeTruck={activeTruck}
                  activeRoutePlans={activeRoutePlans}
                />
              )}

              {/* Render polylines dan markers untuk semua active route plans */}
              {activeRoutePlans.map((routePlan, index) => {
                // Decode route geometry dengan decoder yang benar
                const positions = decodeRouteGeometry(routePlan.route_geometry);
                if (!positions || positions.length === 0) return null;

                // Tentukan apakah route plan ini milik truck yang aktif
                let isMatch = false;
                if (activeTruck) {
                  const routePlanPlate =
                    routePlan.vehicle_plate?.split("/")[0] || "";
                  const routePlanMacId =
                    routePlan.vehicle_plate?.split("/")[1] || "";
                  isMatch =
                    routePlanPlate === activeTruck.plate_number ||
                    routePlanMacId === activeTruck.mac_id;
                }

                // Tentukan warna berdasarkan truck aktif
                const color = activeTruck
                  ? isMatch
                    ? getRouteColor(routePlan)
                    : "#dddddd"
                  : getRouteColor(routePlan);

                // Tentukan ketebalan dan opasitas berdasarkan status
                const weight = activeTruck ? (isMatch ? 5 : 2) : 5;
                const opacity = activeTruck ? (isMatch ? 0.9 : 0.3) : 0.7;

                return (
                  <React.Fragment key={`route-${routePlan.id}`}>
                    {/* Render polyline untuk rute */}
                    <Polyline
                      positions={positions}
                      pathOptions={{
                        color: color,
                        weight: weight,
                        opacity: opacity,
                        dashArray: !isMatch && activeTruck ? "5, 5" : null,
                      }}
                      zIndex={isMatch ? 1000 : 100}
                    />

                    {/* Render markers untuk waypoints jika tidak ada truck yang dipilih atau jika ini adalah truck yang dipilih */}
                    {(!activeTruck || isMatch) && (
                      <WaypointMarkers routePlan={routePlan} />
                    )}
                  </React.Fragment>
                );
              })}
            </MapContainer>
          </div>

          {/* Chart Panel - Only visible when a truck is selected */}
          {activeTruck && (
            <div className="bg-white shadow-md py-3 rounded-lg w-full transition-opacity duration-300">
              <div className="flex flex-col md:flex-row justify-between mb-2 gap-4 px-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("sensor")}
                    className={`p-2 rounded-[8px] flex gap-2 items-center text-sm ${
                      viewMode === "sensor"
                        ? "bg-[#009EFF] text-white"
                        : "text-[#009EFF] border border-[#009EFF]"
                    }`}
                  >
                    <i className="bx bx-radar text-lg"></i> Sensor
                  </button>
                  <button
                    onClick={() => setViewMode("data")}
                    className={`p-2 rounded-[8px] flex gap-2 items-center text-sm ${
                      viewMode === "data"
                        ? "bg-[#009EFF] text-white"
                        : "text-[#009EFF] border border-[#009EFF]"
                    }`}
                  >
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
              {viewMode === "sensor" && (
                <div className="relative">
                  {loadingFuelData ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
                      <div className="text-[#009EFF]">
                        Loading sensor data...
                      </div>
                    </div>
                  ) : null}
                  <div id="fleet-chart" className="w-full h-[200px]" />
                </div>
              )}
              {viewMode === "data" && (
                <div className="p-4 overflow-x-auto">
                  <h4 className="text-sm font-semibold mb-2">
                    Fuel Receipt Data
                  </h4>
                  {loadingFuelReceipts ? (
                    <div className="flex justify-center items-center h-36">
                      <div className="text-[#009EFF]">
                        Loading fuel receipt data...
                      </div>
                    </div>
                  ) : fuelReceipts.length > 0 ? (
                    <table className="w-full text-sm border border-gray-200 rounded">
                      <thead className="bg-[#009EFF] text-white">
                        <tr>
                          <th className="p-2 border">DateTime</th>
                          <th className="p-2 border">Product</th>
                          <th className="p-2 border">Price/Liter</th>
                          <th className="p-2 border">Volume</th>
                          <th className="p-2 border">Total Price</th>
                          <th className="p-2 border">Bukti Foto</th>
                        </tr>
                      </thead>
                      <tbody className="text-center">
                        {fuelReceipts.map((receipt) => (
                          <tr key={receipt.id}>
                            <td className="p-2 border">
                              {new Date(receipt.created_at).toLocaleString()}
                            </td>
                            <td className="p-2 border">
                              {receipt.product_name}
                            </td>
                            <td className="p-2 border">
                              Rp {receipt.price.toLocaleString()}
                            </td>
                            <td className="p-2 border">
                              {receipt.volume} Liter
                            </td>
                            <td className="p-2 border">
                              Rp {receipt.total_price.toLocaleString()}
                            </td>
                            <td className="p-2 border">
                              {receipt.image_url ? (
                                <a href={receipt.image_url} target="_blank" rel="noopener noreferrer">
                                  <div className="flex flex-col items-center">
                                    <img
                                      src={receipt.image_url}
                                      alt="Bukti Receipt"
                                      className="w-16 h-16 object-cover rounded border border-gray-300 mb-1"
                                    />
                                    <span className="text-xs text-blue-500 hover:underline">Lihat Foto</span>
                                  </div>
                                </a>
                              ) : (
                                <span className="text-gray-400 text-xs">Tidak ada foto</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      No fuel receipt data available for {selectedDay}
                    </div>
                  )}
                </div>
              )}
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
                    <p className="font-medium">
                      {activeTruck.type || "Unknown"}
                    </p>
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
                            style={{
                              width: `${Math.min(activeTruck.fuel, 100)}%`,
                            }}
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
                    <p className="text-xs text-gray-500 mb-1">
                      Last Fuel Update
                    </p>
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
                <span className="text-xs text-[#009EFF] font-medium block mb-2">
                  Aktivitas
                </span>
                <div className="flex flex-col gap-2 overflow-y-auto text-xs">
                  {activityDays.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedDay(item.day)}
                      className={`border border-[#F1F1F1] p-3 rounded-md cursor-pointer ${
                        selectedDay === item.day
                          ? "bg-[#E6F5FF] border-[#009EFF]"
                          : ""
                      }`}
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
                        <span className="text-yellow-500">
                          <i className="bx bx-calendar"></i>
                        </span>
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

// Helper component to handle marker and popup management
function TruckMarker({
  truck,
  isDeviating,
  deviation,
  isActive,
  onClick,
  markerRefs,
}) {
  // Create reference for this marker
  const popupRef = useRef();

  // Store marker reference when it's created
  const eventHandlers = useMemo(
    () => ({
      add: (e) => {
        markerRefs.current[truck.mac_id] = e.target;
      },
      remove: () => {
        delete markerRefs.current[truck.mac_id];
      },
    }),
    [truck.mac_id, markerRefs]
  );

  // Effect to handle popup when active state changes
  useEffect(() => {
    if (!popupRef.current) return;

    if (isActive) {
      popupRef.current.openPopup();
    } else {
      popupRef.current.closePopup();
    }
  }, [isActive]);

  return (
    <Marker
      position={[truck.latitude, truck.longitude]}
      icon={isDeviating ? deviatingTruckIcon : truckIcon}
      eventHandlers={{
        ...eventHandlers,
        click: () => onClick(truck),
      }}
    >
      <Popup ref={popupRef}>
        <div>
          <h3 className="font-bold">
            {truck.plate_number || `Truck ${truck.mac_id}`}
            {isDeviating && (
              <span className="ml-2 text-red-500 text-sm">(Off Route!)</span>
            )}
          </h3>
          <p>Type: {truck.type || "Unknown"}</p>
          <p>
            Fuel:{" "}
            {truck.fuel !== undefined ? `${truck.fuel.toFixed(2)}%` : "N/A"}
          </p>
          <p>
            Position: {truck.latitude.toFixed(6)}, {truck.longitude.toFixed(6)}
          </p>
          {isDeviating && deviation && (
            <p className="text-red-500 font-medium mt-2">
              Off route by {deviation.distance.toFixed(0)} meters!
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default DashboardPage;
