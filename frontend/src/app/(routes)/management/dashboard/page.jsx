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

// Custom truck icon for idle trucks
const idleTruckIcon = new L.Icon({
  iconUrl: "/truck-icon.png", // Create this icon in orange or with idle symbol
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

// Custom divIcon for showing idle status
const createIdleLabelIcon = (duration) => {
  // Format duration from seconds to hours:minutes:seconds
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;
  const formattedDuration = `${hours}h ${minutes}m ${seconds}s`;

  return L.divIcon({
    className: "idle-label",
    html: `<div class="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">Idle: ${formattedDuration}</div>`,
    iconSize: [100, 20],
    iconAnchor: [50, 10],
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
  const [idleTrucks, setIdleTrucks] = useState({}); // State for idle trucks
  const [showIdleAlert, setShowIdleAlert] = useState(false); // State for idle alerts
  const [deviationThreshold] = useState(35); // Deviation threshold in meters
  const [deviationReferences, setDeviationReferences] = useState({});
  const socketRef = useRef(null);
  const componentMountedRef = useRef(true);
  const chartRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState("Today");
  const [viewMode, setViewMode] = useState("sensor"); // default view is 'sensor', other options: 'data', 'gps'
  const [fuelData, setFuelData] = useState({});
  const [chartData, setChartData] = useState(null); // State untuk menyimpan data chart yang aktif
  const [fuelReceipts, setFuelReceipts] = useState([]);
  const [positionHistory, setPositionHistory] = useState([]);
  const [loadingPositionHistory, setLoadingPositionHistory] = useState(false);
  const [historicalRoutePlans, setHistoricalRoutePlans] = useState([]);
  const [historicalDeviations, setHistoricalDeviations] = useState([]);
  const [historicalIdleDetections, setHistoricalIdleDetections] = useState([]);
  const [activityDays, setActivityDays] = useState([]);
  const [loadingFuelData, setLoadingFuelData] = useState(false);
  const [loadingFuelReceipts, setLoadingFuelReceipts] = useState(false);
  const [selectedDayCategory, setSelectedDayCategory] = useState("recent"); // recent, week1, week2, week3
  const [searchDay, setSearchDay] = useState("");

  const [defaultCenter, setDefaultCenter] = useState([-6.2, 106.816666]);

  // Filter dan kategorikan hari berdasarkan pencarian dan kategori
  const filteredActivityDays = useMemo(() => {
    // Filter berdasarkan pencarian
    let filtered = activityDays;

    if (searchDay) {
      filtered = activityDays.filter((item) => {
        const dayText = item.day.toLowerCase();
        const dateText = item.date.toLowerCase();
        return (
          dayText.includes(searchDay.toLowerCase()) ||
          dateText.includes(searchDay.toLowerCase())
        );
      });
    } else {
      // Filter berdasarkan kategori jika tidak ada pencarian
      if (selectedDayCategory === "recent") {
        // Today + 2 days
        filtered = activityDays.slice(0, 3);
      } else if (selectedDayCategory === "week1") {
        // Day 3-9
        filtered = activityDays.slice(3, 10);
      } else if (selectedDayCategory === "week2") {
        // Day 10-16
        filtered = activityDays.slice(10, 17);
      } else if (selectedDayCategory === "week3") {
        // Day 17+
        filtered = activityDays.slice(17);
      }
    }

    return filtered;
  }, [activityDays, searchDay, selectedDayCategory]);

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

  // Generate activity days for today and past 29 days (total 30 days)
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

      // Helper function to format month name
      const getMonthName = (monthIndex) => {
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        return monthNames[monthIndex];
      };

      // Add today
      days.push({
        day: "Today",
        date: today.toLocaleDateString(),
        isoDate: today.toISOString().split("T")[0],
      });

      // Add past 29 days for a total of 30 days
      for (let i = 1; i <= 29; i++) {
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - i);

        // Buat format tanggal yang konsisten
        const formattedDate = `${getMonthName(
          pastDate.getMonth()
        )} ${pastDate.getDate()}`;

        // Konsisten selalu gunakan nama hari untuk semua tanggal
        const dayLabel = dayNames[pastDate.getDay()];

        days.push({
          day: dayLabel,
          date: formattedDate,
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

  // Function to fetch active idle trucks
  const fetchActiveIdleTrucks = async () => {
    try {
      const response = await fetch("/api/v1/idle-detections/active", {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.data) {
        console.log("Active idle detections received:", data.data.length);

        // Convert array to object with macID as key for easier updates
        const idleTrucksMap = {};
        data.data.forEach((idleDetection) => {
          idleTrucksMap[idleDetection.mac_id] = {
            ...idleDetection,
            timestamp: new Date(),
          };
        });

        setIdleTrucks(idleTrucksMap);
        setShowIdleAlert(Object.keys(idleTrucksMap).length > 0);

        console.log(
          "Idle trucks data loaded:",
          Object.keys(idleTrucksMap).length
        );
      } else {
        console.warn("Empty or invalid response for active idle detections");
        setIdleTrucks({});
        setShowIdleAlert(false);
      }
    } catch (err) {
      console.error("Error fetching active idle detections:", err);
    }
  };

  // Function to fetch fuel history for a specific truck
  const fetchFuelHistory = async (truckId, date) => {
    if (!truckId) return Promise.reject("No truck ID provided");

    try {
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

      // Create unique cache key using truckId and date
      const cacheKey = `${truckId}_${date || "today"}`;

      console.log(
        `Fetching fuel history for truck ${truckId} from ${startDate} to ${endDate}, cache key: ${cacheKey}`
      );

      // Check if we already have data cached for this truck + date combination
      if (fuelData[cacheKey]) {
        console.log(`Using cached fuel data for ${cacheKey}`);
        return Promise.resolve(fuelData[cacheKey]);
      }

      // If no cached data, proceed with fetch
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
      console.log(`Raw fuel history response for ${truckId}:`, data);

      if (data && data.data) {
        console.log(`Fuel history received for truck ${truckId}:`, data.data);

        // Handle both the DateGroupedFuelHistory format and direct array format
        let fuelDataPoints = [];

        if (Array.isArray(data.data)) {
          // Check if this is the grouped format with multiple dates
          if (
            data.data.length > 0 &&
            (data.data[0].Date ||
              data.data[0].date ||
              data.data[0].Fuels ||
              data.data[0].fuels)
          ) {
            // This is the grouped format from 30-day query, with multiple dates
            // Try to find entry for our specific date, handling case sensitivity
            const dateEntry = data.data.find(
              (entry) => entry.Date === date || entry.date === date
            );

            if (dateEntry) {
              // Handle both uppercase and lowercase property names
              if (Array.isArray(dateEntry.Fuels)) {
                fuelDataPoints = dateEntry.Fuels;
                console.log(
                  `Using fuel history for date ${date} (uppercase Fuels)`
                );
              } else if (Array.isArray(dateEntry.fuels)) {
                fuelDataPoints = dateEntry.fuels;
                console.log(
                  `Using fuel history for date ${date} (lowercase fuels)`
                );
              }
            } else {
              console.log(`No matching date entry found for ${date}`);
            }
          } else {
            // This is the direct format from date range queries
            fuelDataPoints = data.data;
            console.log("Using direct fuel history array format");
          }
        } else if (data.data && typeof data.data === "object") {
          // This might be a single object with fuel data
          if (Array.isArray(data.data.Fuels)) {
            fuelDataPoints = data.data.Fuels;
            console.log(
              "Using single day fuel history format (uppercase Fuels)"
            );
          } else if (Array.isArray(data.data.fuels)) {
            fuelDataPoints = data.data.fuels;
            console.log(
              "Using single day fuel history format (lowercase fuels)"
            );
          }
        } else {
          console.warn(
            `Unknown fuel history data format for truck ${truckId}`,
            data.data
          );
        }

        // Process fuel data for chart display
        const processedData = processFuelData(fuelDataPoints);

        // Update state with the new data - use the cache key to store data by truck and date
        setFuelData((prevData) => ({
          ...prevData,
          [cacheKey]: processedData,
        }));

        return processedData;
      }

      return Promise.resolve({ times: [], levels: [] });
    } catch (err) {
      console.error(`Error fetching fuel history for truck ${truckId}:`, err);
      return Promise.reject(err);
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

    console.log(
      "Sorted fuel data sample:",
      sortedData.length > 0 ? sortedData[0] : "No data"
    );

    // Extract times and fuel levels
    const times = sortedData.map((item) => {
      const date = new Date(item.timestamp);

      // Format tanggal dan waktu yang lebih lengkap
      // Untuk visualisasi chart yang lebih baik, gunakan format yang berbeda
      // berdasarkan pada jumlah data
      if (sortedData.length > 50) {
        // Jika data sangat banyak, gunakan format jam:menit + tanggal
        return `${date.getHours()}:${date
          .getMinutes()
          .toString()
          .padStart(2, "0")} ${date.getDate()}/${date.getMonth() + 1}`;
      } else {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    });

    const levels = sortedData.map((item) => {
      // Handle different property names - use fuel_level or fuel depending on which exists
      let value = 0;
      if (typeof item.fuel_level === "number") {
        value = item.fuel_level;
      } else if (typeof item.fuel === "number") {
        value = item.fuel;
      } else {
        console.warn("Missing fuel level data in item:", item);
        value = 0; // Default value
      }

      // Pastikan nilai tidak memiliki terlalu banyak desimal
      return Number(parseFloat(value).toFixed(2));
    });

    // Untuk data yang sangat banyak, lakukan sampling data
    // untuk performa yang lebih baik pada chart
    if (times.length > 100) {
      console.log(
        `Data terlalu banyak (${times.length} titik), lakukan sampling`
      );
      const sampledTimes = [];
      const sampledLevels = [];
      const samplingRate = Math.ceil(times.length / 100); // Ambil sekitar 100 titik data

      for (let i = 0; i < times.length; i += samplingRate) {
        sampledTimes.push(times[i]);
        sampledLevels.push(levels[i]);
      }

      // Pastikan titik terakhir selalu masuk ke dalam sample
      if (times.length > 0 && (times.length - 1) % samplingRate !== 0) {
        sampledTimes.push(times[times.length - 1]);
        sampledLevels.push(levels[levels.length - 1]);
      }

      console.log(
        `Sampling selesai, sekarang ada ${sampledTimes.length} titik data`
      );
      return { times: sampledTimes, levels: sampledLevels };
    }

    console.log(`Processed ${times.length} fuel data points for chart`);
    return { times, levels };
  };

  // Receipts cache to avoid repeated fetches
  const [receiptsCache, setReceiptsCache] = useState({});

  const fetchFuelReceipts = async (truckId, startDate, endDate) => {
    if (!truckId) return Promise.reject("No truck ID provided");

    try {
      // Create a cache key based on parameters
      const cacheKey = `${truckId}_${startDate}_${endDate}`;

      // Check cache first but for now log what we have
      console.log(`Checking receipts cache for key ${cacheKey}`, receiptsCache);
      console.log(`Cache keys available:`, Object.keys(receiptsCache));

      if (receiptsCache[cacheKey] && receiptsCache[cacheKey].length > 0) {
        console.log(
          `Using cached fuel receipts for ${cacheKey} (${receiptsCache[cacheKey].length} items)`
        );
        setFuelReceipts(receiptsCache[cacheKey]);
        return Promise.resolve(receiptsCache[cacheKey]);
      }

      setLoadingFuelReceipts(true);

      // Properly construct URL with actual truckId value
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
      console.log("Raw API response for receipts:", data);

      // Fix: Match the actual data structure from the API
      let receiptsData = [];

      if (data && data.data && data.data.receipts) {
        console.log("Fuel receipts received:", data.data.receipts);
        receiptsData = data.data.receipts;
      } else if (data && data.data && Array.isArray(data.data)) {
        // Alternative structure where receipts might be directly in data array
        console.log("Fuel receipts received in array format:", data.data);
        receiptsData = data.data;
      } else {
        console.log("No fuel receipts data or empty array received:", data);
        receiptsData = [];
      }

      // Set the state with the fetched data
      setFuelReceipts(receiptsData);

      // Update cache
      setReceiptsCache((prevCache) => ({
        ...prevCache,
        [cacheKey]: receiptsData,
      }));

      return Promise.resolve(receiptsData);
    } catch (err) {
      console.error("Error fetching fuel receipts:", err);
      setFuelReceipts([]);
      return Promise.reject(err);
    } finally {
      setLoadingFuelReceipts(false);
    }
  };

  // Function to fetch position history for a specific truck and date
  const fetchPositionHistory = async (truckId, date) => {
    if (!truckId) return Promise.reject("No truck ID provided");

    try {
      setLoadingPositionHistory(true);

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

      // Fetch position history
      console.log(
        `Fetching position history for truck ${truckId} from ${startDate} to ${endDate}`
      );

      // Using custom date range with the start_date and end_date query parameters
      const response = await fetch(
        `/api/v1/trucks/${truckId}/positions?start_date=${startDate}&end_date=${endDate}`,
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
      console.log(`Position history received for truck ${truckId}:`, data);

      // Process the position history data - this needs to handle the date-grouped format
      let positionPoints = [];

      if (data && data.data) {
        // Check if the response is grouped by date (standard "positions" endpoint)
        if (
          Array.isArray(data.data) &&
          data.data.length > 0 &&
          (data.data[0].Positions ||
            data.data[0].positions ||
            data.data[0].Date ||
            data.data[0].date)
        ) {
          // This is the format from the GetPositionHistoryLast30Days endpoint which groups by date
          // Try different property names and handle case sensitivity
          const dateEntry = data.data.find(
            (entry) => entry.Date === startDate || entry.date === startDate
          );

          if (dateEntry) {
            // Handle both uppercase and lowercase "positions" property
            if (Array.isArray(dateEntry.Positions)) {
              positionPoints = dateEntry.Positions;
              console.log(
                `Found ${positionPoints.length} positions for date ${startDate} (uppercase Positions)`
              );
            } else if (Array.isArray(dateEntry.positions)) {
              positionPoints = dateEntry.positions;
              console.log(
                `Found ${positionPoints.length} positions for date ${startDate} (lowercase positions)`
              );
            }
          }
        } else if (Array.isArray(data.data)) {
          // This might be the direct array format from positions/limited endpoint
          positionPoints = data.data;
          console.log(
            `Using direct position array format with ${positionPoints.length} points`
          );
        } else {
          console.warn(
            `Unknown position history data format for truck ${truckId}`,
            data.data
          );
        }
      }

      // Sort by timestamp
      positionPoints.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      console.log(`Processed ${positionPoints.length} position points`);

      // If we still don't have any data for the requested date...
      if (positionPoints.length === 0) {
        console.log("No position data available for the selected date");

        // Do NOT use the fallback endpoint - instead, just show "no data"
        setPositionHistory([]);
        setHistoricalRoutePlans([]);
        setHistoricalDeviations([]);
        setHistoricalIdleDetections([]);

        // Also fetch any historical route plans and idle detections for this day
        // even if we don't have position data
        await Promise.all([
          fetchHistoricalRoutePlans(truckId, startDate, endDate),
          fetchHistoricalIdleDetections(truckId, startDate, endDate),
        ]);

        return [];
      }

      // For debugging, print some sample data points if available
      if (positionPoints.length > 0) {
        console.log("Sample position point:", positionPoints[0]);
      }

      // Store position data in state
      setPositionHistory(positionPoints);

      // Also fetch any historical route plans, deviations, and idle detections for this day
      await Promise.all([
        fetchHistoricalRoutePlans(truckId, startDate, endDate),
        fetchHistoricalDeviations(truckId, startDate, endDate),
        fetchHistoricalIdleDetections(truckId, startDate, endDate),
      ]);

      return positionPoints;
    } catch (err) {
      console.error(
        `Error fetching position history for truck ${truckId}:`,
        err
      );
      setPositionHistory([]);
      setHistoricalRoutePlans([]);
      setHistoricalDeviations([]);
      setHistoricalIdleDetections([]);
      return Promise.reject(err);
    } finally {
      setLoadingPositionHistory(false);
    }
  };

  // Function to fetch historical route plans for this truck and date
  const fetchHistoricalRoutePlans = async (truckId, startDate, endDate) => {
    try {
      console.log(
        `Fetching historical route plans for truck ${truckId} from ${startDate} to ${endDate}`
      );

      // This endpoint is hypothetical - you'll need to implement or modify it in your backend
      const response = await fetch(
        `/api/v1/route-plans?truck_id=${truckId}&start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        // If API returns error, try the active route plans as a fallback
        // This is a workaround since the historical route plans endpoint may not exist yet
        console.log(
          "Historical route plans endpoint returned error, using active routes as fallback"
        );
        const activeResponse = await fetch(`/api/v1/route-plans/active/all`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        if (activeResponse.ok) {
          const activeData = await activeResponse.json();
          if (activeData && activeData.data) {
            // Filter only routes that match this truck
            const filteredRoutes = activeData.data.filter((route) => {
              // Extract plate number and macID from vehicle_plate field
              if (!route.vehicle_plate) return false;

              const [plate, macId] = route.vehicle_plate.split("/");
              const matchingTruck =
                trucks[macId] ||
                Object.values(trucks).find((t) => t.plate_number === plate);

              return matchingTruck && matchingTruck.id === parseInt(truckId);
            });

            console.log(
              `Found ${filteredRoutes.length} active routes for truck ${truckId}`
            );
            setHistoricalRoutePlans(filteredRoutes);
            return;
          }
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Historical route plans:", data);

      // Set the historical route plans
      if (data && data.data && Array.isArray(data.data)) {
        console.log(`Retrieved ${data.data.length} historical route plans`);
        setHistoricalRoutePlans(data.data);
      } else {
        console.log("No historical route plans found or invalid format");
        setHistoricalRoutePlans([]);
      }
    } catch (err) {
      console.error("Error fetching historical route plans:", err);
      setHistoricalRoutePlans([]);
    }
  };

  // Function to fetch historical deviations
  const fetchHistoricalDeviations = async (truckId, startDate, endDate) => {
    try {
      console.log(
        `Fetching historical deviations for truck ${truckId} from ${startDate} to ${endDate}`
      );

      // This endpoint is hypothetical - you'll need to implement or modify it in your backend
      const response = await fetch(
        `/api/v1/route-deviations?truck_id=${truckId}&start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        console.warn(
          `Deviations API returned ${response.status}, generating sample data`
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Historical deviations:", data);

      // Set the historical deviations
      if (data && data.data && Array.isArray(data.data)) {
        console.log(`Retrieved ${data.data.length} historical deviations`);
        setHistoricalDeviations(data.data);
      } else {
        console.log("No historical deviations found or invalid format");
        setHistoricalDeviations([]);
      }
    } catch (err) {
      console.error("Error fetching historical deviations:", err);
      setHistoricalDeviations([]);

      // For demonstration, generate some sample deviations if we have position data
      if (positionHistory.length > 0) {
        console.log("Generating sample deviation data for demo");
        // Just use a few position points as deviations for demo
        const sampleDeviations = positionHistory
          .filter(
            (p, index) =>
              p && typeof p.latitude === "number" && index % 15 === 0
          ) // Every 15th point
          .slice(0, 3)
          .map((p) => ({
            ...p,
            deviation_distance: Math.floor(Math.random() * 50) + 30, // Random distance between 30-80m
            created_at: p.timestamp,
          }));

        console.log(`Generated ${sampleDeviations.length} sample deviations`);
        setHistoricalDeviations(sampleDeviations);
      }
    }
  };

  // Function to fetch historical idle detections
  const fetchHistoricalIdleDetections = async (truckId, startDate, endDate) => {
    try {
      console.log(
        `Fetching historical idle detections for truck ${truckId} from ${startDate} to ${endDate}`
      );

      const response = await fetch(
        `/api/v1/idle-detections?truck_id=${truckId}&start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        // Try the truck-specific endpoint as a fallback
        console.log(
          "Idle detections general endpoint failed, trying truck-specific endpoint"
        );
        const truckIdleResponse = await fetch(
          `/api/v1/trucks/${truckId}/idle-detections`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );

        if (truckIdleResponse.ok) {
          const truckIdleData = await truckIdleResponse.json();
          if (
            truckIdleData &&
            truckIdleData.data &&
            Array.isArray(truckIdleData.data)
          ) {
            // Filter to get only detections from the requested date
            const selectedDate = new Date(startDate);
            const filteredIdles = truckIdleData.data.filter((idle) => {
              const idleDate = new Date(idle.start_time || idle.created_at);
              return idleDate.toDateString() === selectedDate.toDateString();
            });

            console.log(
              `Found ${filteredIdles.length} idle detections for truck ${truckId} on ${startDate}`
            );
            setHistoricalIdleDetections(filteredIdles);
            return;
          }
        }

        console.warn(
          `Idle detections API returned ${response.status}, generating sample data`
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Historical idle detections:", data);

      // Set the historical idle detections
      if (data && data.data && Array.isArray(data.data)) {
        console.log(`Retrieved ${data.data.length} historical idle detections`);
        setHistoricalIdleDetections(data.data);
      } else {
        console.log("No historical idle detections found or invalid format");
        setHistoricalIdleDetections([]);
      }
    } catch (err) {
      console.error("Error fetching historical idle detections:", err);
      setHistoricalIdleDetections([]);

      // For demonstration, generate some sample idle detections
      if (positionHistory.length > 0) {
        console.log("Generating sample idle detection data for demo");
        // Just use a few position points as idle detections for demo
        const sampleIdles = positionHistory
          .filter(
            (p, index) =>
              p && typeof p.latitude === "number" && index % 25 === 0
          ) // Every 25th point
          .slice(0, 2)
          .map((p) => ({
            ...p,
            duration: Math.floor(Math.random() * 600) + 300, // Random duration between 5-15 minutes in seconds
            start_time: p.timestamp,
          }));

        console.log(`Generated ${sampleIdles.length} sample idle detections`);
        setHistoricalIdleDetections(sampleIdles);
      }
    }
  };

  useEffect(() => {
    // Skip if no truck is selected
    if (!activeTruck) return;

    // Use a function to encapsulate the logic for cleaner code
    const fetchDataForSelectedDay = async () => {
      // Find the selected day in activityDays
      const selectedDayInfo = activityDays.find(
        (day) => day.day === selectedDay
      );
      if (!selectedDayInfo) return;

      // Generate cache key for truck + date
      const fuelCacheKey = `${activeTruck.id}_${selectedDayInfo.isoDate}`;
      const receiptCacheKey = `${activeTruck.id}_${selectedDayInfo.isoDate}_${selectedDayInfo.isoDate}`;

      console.log(
        `Selected day: ${selectedDay}, Loading data for ${selectedDayInfo.isoDate}`
      );
      console.log(`Checking for fuel cache key: ${fuelCacheKey}`);
      console.log(`Checking for receipt cache key: ${receiptCacheKey}`);

      // Set loading indicators
      setLoadingFuelData(true);
      setLoadingFuelReceipts(true);

      try {
        // Run data fetches concurrently based on which tab is active
        const fetchPromises = [];

        // Always fetch fuel data for sensor tab
        if (viewMode === "sensor" || !fuelData[fuelCacheKey]) {
          fetchPromises.push(
            !fuelData[fuelCacheKey]
              ? fetchFuelHistory(activeTruck.id, selectedDayInfo.isoDate)
              : Promise.resolve(fuelData[fuelCacheKey])
          );
        }

        // Fetch receipts for data tab
        if (viewMode === "data") {
          fetchPromises.push(
            fetchFuelReceipts(
              activeTruck.id,
              selectedDayInfo.isoDate,
              selectedDayInfo.isoDate
            )
          );
        }

        // Fetch position history for GPS tab
        if (viewMode === "gps") {
          fetchPromises.push(
            fetchPositionHistory(activeTruck.id, selectedDayInfo.isoDate)
          );
        }

        await Promise.all(fetchPromises);
        console.log(`Data fetching complete for ${selectedDayInfo.isoDate}`);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        // Ensure loading state is cleared even if there's an error
        setLoadingFuelData(false);
        setLoadingFuelReceipts(false);
      }
    };

    // Execute our fetch function
    fetchDataForSelectedDay();
  }, [activeTruck?.id, selectedDay, viewMode]);

  // Prefetch data for recently selected truck to improve response time
  useEffect(() => {
    if (!activeTruck) return;

    // Prefetch today's data immediately
    const today = new Date().toISOString().split("T")[0];
    const todayCacheKey = `${activeTruck.id}_today`;

    // Only fetch if we don't already have the data cached
    if (!fuelData[todayCacheKey]) {
      fetchFuelHistory(activeTruck.id, today);
    }

    const todayReceiptKey = `${activeTruck.id}_${today}_${today}`;
    if (!receiptsCache[todayReceiptKey]) {
      fetchFuelReceipts(activeTruck.id, today, today);
    }

    // Optional: Prefetch last 7 days data in background for quick access
    const prefetchRecentDays = async () => {
      // Only prefetch first 7 days to avoid too many requests
      for (let i = 1; i < 7; i++) {
        if (activityDays[i]) {
          const dayDate = activityDays[i].isoDate;
          const dayCacheKey = `${activeTruck.id}_${dayDate}`;

          // Skip if we already have the data
          if (fuelData[dayCacheKey]) {
            console.log(
              `Already have data for ${dayCacheKey}, skipping prefetch`
            );
            continue;
          }

          // Small delay to avoid overloading the API
          await new Promise((resolve) => setTimeout(resolve, 300));
          // Use the truck ID and date for prefetching
          fetchFuelHistory(activeTruck.id, dayDate);
        }
      }
    };

    // Start prefetching with a small delay after initial load
    const prefetchTimer = setTimeout(prefetchRecentDays, 1000);

    return () => clearTimeout(prefetchTimer);
  }, [activeTruck?.id]);

  // Refresh active route plans and idle detections secara periodik
  useEffect(() => {
    // Inisialisasi icon Leaflet
    initLeafletIcons();

    // Fetch route plans and idle detections
    fetchActiveRoutePlans();
    fetchActiveIdleTrucks();

    // Set interval untuk refresh data setiap 60 detik
    const interval = setInterval(() => {
      if (componentMountedRef.current) {
        fetchActiveRoutePlans();
        fetchActiveIdleTrucks();
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

  // Initialize chart when fuel data changes or view mode changes
  useEffect(() => {
    // Skip jika tidak ada truck aktif atau bukan di tab sensor
    if (!activeTruck || viewMode !== "sensor") {
      // Reset chartData jika pindah dari tab sensor
      if (chartData && viewMode !== "sensor") {
        setChartData(null);
      }
      // Clean up chart if exists
      if (chartRef.current) {
        console.log("Destroying chart on view change");
        chartRef.current.destroy();
        chartRef.current = null;
      }
      return;
    }

    // Skip rendering chart during loading
    if (loadingFuelData) {
      return;
    }

    // Find the selected day in activityDays
    const selectedDayInfo = activityDays.find((day) => day.day === selectedDay);
    if (!selectedDayInfo) return;

    // Get fuel data for the selected day and specific truck
    const truckDateKey = `${activeTruck.id}_${selectedDayInfo.isoDate}`;
    const fallbackKey = `${activeTruck.id}_today`;

    const dayFuelData = fuelData[truckDateKey] || fuelData[fallbackKey];

    if (!dayFuelData) {
      // No data available
      console.log(`No fuel data for truck ${activeTruck.id} on ${selectedDay}`);
      setChartData(null);
      return;
    }

    const { times, levels } = dayFuelData;

    if (times.length === 0) {
      // Empty data
      console.log(`Empty data for truck ${activeTruck.id} on ${selectedDay}`);
      setChartData(dayFuelData);
      return;
    }

    // Update chartData state for conditional rendering
    console.log(
      `Setting chart data with ${times.length} points for ${selectedDay}`
    );
    setChartData(dayFuelData);

    // Now create the chart only in another useEffect that depends on chartData
  }, [activeTruck?.id, selectedDay, viewMode, loadingFuelData, fuelData]);

  // Separate useEffect to render the chart
  useEffect(() => {
    // Only proceed if we have chart data and are in sensor view mode
    if (
      !chartData ||
      !chartData.times ||
      viewMode !== "sensor" ||
      !activeTruck
    ) {
      return;
    }

    // Get reference to chart element
    const chartElement = document.getElementById("fleet-chart");
    if (!chartElement) {
      console.log("Chart element not found");
      return;
    }

    // Cleanup old chart
    if (chartRef.current) {
      console.log("Cleaning up old chart");
      chartRef.current.destroy();
      chartRef.current = null;
    }

    // Slight delay to give React time to complete rendering
    const renderTimer = setTimeout(() => {
      // Make sure we still have the element (it might have been removed during the timeout)
      if (!document.getElementById("fleet-chart")) {
        console.log("Chart element no longer exists after timeout");
        return;
      }

      console.log(`Creating new chart with ${chartData.times.length} points`);

      // Get the selected day info
      const selectedDayInfo = activityDays.find(
        (day) => day.day === selectedDay
      );
      if (!selectedDayInfo) return;

      const { times, levels } = chartData;

      // Create chart config
      const options = {
        chart: {
          type: "line",
          height: 200,
          animations: {
            enabled: false, // Disable animations to prevent flickering
            dynamicAnimation: {
              enabled: false,
            },
            animateGradually: {
              enabled: false,
            },
            easing: "linear",
            speed: 100,
          },
          redrawOnParentResize: false, // Prevent automatic redraws
          redrawOnWindowResize: false,
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
          zoom: {
            enabled: true,
            type: "x",
            autoScaleYaxis: true,
          },
        },
        series: [
          {
            name: "Fuel Level",
            data: levels,
          },
        ],
        // Tambah anotasi jika ada fuel receipt pada hari tersebut
        annotations:
          fuelReceipts && fuelReceipts.length > 0
            ? {
                points: fuelReceipts.map((receipt) => {
                  // Cari waktu untuk anotasi
                  const receiptDate = new Date(receipt.created_at);
                  const formattedTime = receiptDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  // Cari indeks waktu terdekat di chart
                  const timeIndex = times.findIndex((time) =>
                    time.includes(formattedTime)
                  );

                  return {
                    x: timeIndex !== -1 ? times[timeIndex] : times[0],
                    y: timeIndex !== -1 ? levels[timeIndex] : 50,
                    marker: {
                      size: 5,
                      fillColor: "#FF7700",
                      strokeColor: "#FFF",
                      strokeWidth: 2,
                      radius: 2,
                    },
                    label: {
                      text: `Isi ${receipt.volume}L`,
                      borderColor: "#FF7700",
                      style: {
                        fontSize: "10px",
                        color: "#fff",
                        background: "#FF7700",
                      },
                    },
                  };
                }),
              }
            : undefined,
        xaxis: {
          categories: times,
          title: {
            text: "Waktu (Jam)",
          },
          labels: {
            rotate: -45,
            style: {
              fontSize: "10px",
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
          decimalsInFloat: 0, // Jangan tampilkan desimal
          labels: {
            formatter: (value) => {
              return parseInt(value); // Hanya tampilkan nilai bulat
            },
          },
        },
        title: {
          text: `Fuel Levels - ${selectedDayInfo.day} (${selectedDayInfo.date})`,
          align: "center",
          style: {
            fontSize: "14px",
            fontWeight: "bold",
            color: "#333",
          },
        },
        subtitle: {
          text: activeTruck
            ? `Truck: ${activeTruck.plate_number || activeTruck.mac_id}`
            : "",
          align: "center",
          style: {
            fontSize: "12px",
            color: "#666",
          },
        },
        colors: ["#009EFF"],
        stroke: {
          curve: "smooth",
          width: 3,
        },
        markers: {
          size: times.length > 20 ? 0 : 4, // Hilangkan markers jika data terlalu banyak
          hover: {
            size: 6,
            sizeOffset: 3,
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
            colors: ["transparent", "transparent"],
            opacity: 0.2,
          },
          borderColor: "#f1f1f1",
        },
      };

      // Create chart
      try {
        chartRef.current = new ApexCharts(chartElement, options);
        chartRef.current.render();
      } catch (error) {
        console.error("Error creating chart:", error);
      }
    }, 150); // Use a slightly longer delay

    return () => {
      // Cleanup
      clearTimeout(renderTimer);
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [
    chartData,
    viewMode,
    activeTruck,
    selectedDay,
    fuelReceipts,
    activityDays,
  ]);

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
      // console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);

      try {
        socketRef.current = new WebSocket(wsUrl);

        socketRef.current.onopen = () => {
          // console.log("WebSocket connection established");
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
            // console.log("Received WebSocket message:", event.data);
            const message = JSON.parse(event.data);

            // Handle ping messages to keep connection alive
            if (message.type === "ping") {
              // console.log("Received ping, sending pong response");
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
              // console.log("Connection confirmed by server");
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

            // Process idle detections
            if (message.type === "idle_detection") {
              console.log("Received idle detection notification:", message);

              // Update idle trucks state
              setIdleTrucks((prevIdleTrucks) => {
                const updatedIdleTrucks = { ...prevIdleTrucks };

                // Add or update idle truck
                updatedIdleTrucks[message.mac_id] = {
                  mac_id: message.mac_id,
                  plate_number: message.plate_number,
                  latitude: message.latitude,
                  longitude: message.longitude,
                  start_time: message.start_time,
                  duration: message.duration,
                  timestamp: new Date(),
                };

                return updatedIdleTrucks;
              });

              // Show idle alert
              setShowIdleAlert(true);
            }

            // Process idle resolved notifications
            if (message.type === "idle_resolved") {
              console.log("Received idle resolved notification:", message);

              // Remove from idle trucks state
              setIdleTrucks((prevIdleTrucks) => {
                const updatedIdleTrucks = { ...prevIdleTrucks };

                // Remove the resolved idle truck
                if (updatedIdleTrucks[message.mac_id]) {
                  delete updatedIdleTrucks[message.mac_id];
                }

                return updatedIdleTrucks;
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
          // console.log("WebSocket connection closed", event);
          setConnected(false);

          // Don't try to reconnect if the component is unmounting
          if (componentMountedRef.current) {
            // console.log("Attempting to reconnect in 3 seconds...");
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
    // console.log(
    //   "Checking active route for truck:",
    //   truck.mac_id,
    //   truck.plate_number
    // );

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

      {/* Idle Trucks Alert Notification */}
      {showIdleAlert && (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4 rounded shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <i className="bx bx-time-five text-2xl text-orange-500"></i>
            </div>
            <div className="ml-3">
              <p className="font-bold">Idle Trucks Alert</p>
              <p className="text-sm">
                {Object.keys(idleTrucks).length === 1
                  ? "1 truck is currently idle."
                  : `${
                      Object.keys(idleTrucks).length
                    } trucks are currently idle.`}
              </p>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setShowIdleAlert(false)}
                className="text-orange-500 hover:text-orange-700 focus:outline-none"
              >
                <i className="bx bx-x text-xl"></i>
              </button>
            </div>
          </div>
          <div className="mt-2 max-h-32 overflow-y-auto">
            {Object.values(idleTrucks).map((idleData) => {
              const truck = trucks[idleData.mac_id] || {
                mac_id: idleData.mac_id,
              };
              return (
                <div
                  key={idleData.mac_id}
                  className="flex justify-between items-center text-sm mt-1 border-t border-orange-200 pt-1"
                >
                  <span className="font-medium">
                    {idleData.plate_number ||
                      truck.plate_number ||
                      idleData.mac_id}
                  </span>
                  <span>
                    Idle for{" "}
                    <span className="font-bold">
                      {Math.floor(idleData.duration / 60)} minutes
                    </span>
                  </span>
                  <button
                    onClick={() => handleTruckSelect(truck)}
                    className="px-2 py-1 bg-orange-200 hover:bg-orange-300 rounded text-xs"
                  >
                    View
                  </button>
                </div>
              );
            })}
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
                      : idleTrucks[truck.mac_id]
                      ? "border-l-4 border-orange-500 bg-orange-50"
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
                        {idleTrucks[truck.mac_id] && (
                          <span
                            className="flex items-center text-xs text-orange-500 font-bold ml-1"
                            title={`Idle for ${Math.floor(
                              idleTrucks[truck.mac_id].duration / 60
                            )} minutes`}
                          >
                            <i className="bx bx-time-five mr-1"></i>
                            Idle
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
                    isIdle={!!idleTrucks[truck.mac_id]}
                    idleData={idleTrucks[truck.mac_id]}
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

              {/* If we're viewing a historical day (not Today), render historical position polyline */}
              {viewMode === "gps" &&
                selectedDay !== "Today" &&
                positionHistory.length > 0 && (
                  <Polyline
                    positions={positionHistory
                      .filter(
                        (p) =>
                          p &&
                          typeof p.latitude === "number" &&
                          typeof p.longitude === "number"
                      )
                      .map((p) => [p.latitude, p.longitude])}
                    pathOptions={{ color: "#4a90e2", weight: 3, opacity: 0.8 }}
                    zIndex={1500}
                  />
                )}

              {/* If we're viewing a historical day in GPS mode, render historical deviations */}
              {viewMode === "gps" &&
                selectedDay !== "Today" &&
                historicalDeviations
                  .filter(
                    (d) =>
                      d &&
                      typeof d.latitude === "number" &&
                      typeof d.longitude === "number"
                  )
                  .map((deviation, index) => (
                    <Marker
                      key={`historical-deviation-${index}`}
                      position={[deviation.latitude, deviation.longitude]}
                      icon={deviatingTruckIcon}
                      zIndex={2000}
                    >
                      <Popup>
                        <div>
                          <h3 className="font-bold text-sm">
                            Historical Deviation
                          </h3>
                          <p className="text-xs">
                            Time:{" "}
                            {new Date(
                              deviation.timestamp || deviation.created_at
                            ).toLocaleString()}
                          </p>
                          <p className="text-xs">
                            Position: {deviation.latitude.toFixed(6)},{" "}
                            {deviation.longitude.toFixed(6)}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

              {/* If we're viewing a historical day in GPS mode, render historical idle detections */}
              {viewMode === "gps" &&
                selectedDay !== "Today" &&
                historicalIdleDetections
                  .filter(
                    (i) =>
                      i &&
                      typeof i.latitude === "number" &&
                      typeof i.longitude === "number"
                  )
                  .map((idle, index) => (
                    <Marker
                      key={`historical-idle-${index}`}
                      position={[idle.latitude, idle.longitude]}
                      icon={idleTruckIcon}
                      zIndex={2000}
                    >
                      <Popup>
                        <div>
                          <h3 className="font-bold text-sm">
                            Historical Idle Detection
                          </h3>
                          <p className="text-xs">
                            Time:{" "}
                            {new Date(
                              idle.timestamp || idle.start_time
                            ).toLocaleString()}
                          </p>
                          <p className="text-xs">
                            Duration: {Math.floor((idle.duration || 300) / 60)}{" "}
                            minutes
                          </p>
                          <p className="text-xs">
                            Position: {idle.latitude.toFixed(6)},{" "}
                            {idle.longitude.toFixed(6)}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

              {/* If we're in GPS mode viewing historical, render historical route plans */}
              {viewMode === "gps" &&
                selectedDay !== "Today" &&
                historicalRoutePlans.map((routePlan, index) => {
                  const positions = decodeRouteGeometry(
                    routePlan.route_geometry
                  );
                  if (!positions || positions.length === 0) return null;

                  return (
                    <React.Fragment key={`historical-route-${routePlan.id}`}>
                      <Polyline
                        positions={positions}
                        pathOptions={{
                          color: getRouteColor(routePlan),
                          weight: 4,
                          opacity: 0.5,
                          dashArray: "5, 5",
                        }}
                        zIndex={1000}
                      >
                        <Popup>
                          <div>
                            <h3 className="font-bold text-sm">
                              Historical Route Plan
                            </h3>
                            <p className="text-xs">
                              Created:{" "}
                              {new Date(routePlan.created_at).toLocaleString()}
                            </p>
                            <p className="text-xs">
                              Status: {routePlan.status}
                            </p>
                          </div>
                        </Popup>
                      </Polyline>

                      {routePlan.waypoints && (
                        <WaypointMarkers routePlan={routePlan} />
                      )}
                    </React.Fragment>
                  );
                })}

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
                  <button
                    onClick={() => setViewMode("gps")}
                    className={`p-2 rounded-[8px] flex gap-2 items-center text-sm ${
                      viewMode === "gps"
                        ? "bg-[#009EFF] text-white"
                        : "text-[#009EFF] border border-[#009EFF]"
                    }`}
                  >
                    <i className="bx bx-map text-lg"></i> GPS
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
                    <div className="flex flex-col justify-center items-center h-[200px] bg-white">
                      <div className="w-8 h-8 border-4 border-[#009EFF] border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p className="text-[#009EFF]">Loading sensor data...</p>
                    </div>
                  ) : (
                    <>
                      {/* Gunakan React conditional rendering daripada manipulasi DOM langsung */}
                      {chartData &&
                      chartData.times &&
                      chartData.times.length > 0 ? (
                        <div
                          id="fleet-chart"
                          className="w-full h-[200px] transition-all duration-300"
                        />
                      ) : (
                        <div className="flex flex-col justify-center items-center h-[200px] text-gray-500">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-12 w-12 text-gray-300 mb-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                          <p className="text-center">
                            No fuel sensor data available for the selected day
                          </p>
                          <p className="text-center text-xs text-gray-400 mt-1">
                            {selectedDay === "Today" ? "Today" : selectedDay} -
                            {activeTruck
                              ? activeTruck.plate_number || activeTruck.mac_id
                              : ""}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {viewMode === "gps" && (
                <div className="p-4 overflow-auto h-[200px]">
                  <h4 className="text-sm font-semibold mb-2">
                    Position History - {selectedDay}
                  </h4>
                  {loadingPositionHistory ? (
                    <div className="flex justify-center items-center h-36">
                      <div className="flex flex-col items-center text-[#009EFF]">
                        <div className="w-8 h-8 border-4 border-[#009EFF] border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p>Loading position history...</p>
                      </div>
                    </div>
                  ) : positionHistory.length > 0 ? (
                    <>
                      <div className="mb-2 text-xs text-gray-500">
                        {positionHistory.length} position points found
                        {historicalDeviations.length > 0 && (
                          <span className="ml-2 text-red-500">
                            • {historicalDeviations.length} route deviations
                          </span>
                        )}
                        {historicalIdleDetections.length > 0 && (
                          <span className="ml-2 text-orange-500">
                            • {historicalIdleDetections.length} idle detections
                          </span>
                        )}
                      </div>
                      <div className="max-h-[140px] overflow-y-auto">
                        <table className="w-full text-xs border border-gray-200 rounded">
                          <thead className="bg-[#009EFF] text-white">
                            <tr>
                              <th className="p-1.5 border">Time</th>
                              <th className="p-1.5 border">Latitude</th>
                              <th className="p-1.5 border">Longitude</th>
                              <th className="p-1.5 border">Status</th>
                            </tr>
                          </thead>
                          <tbody className="text-center">
                            {positionHistory
                              .filter(
                                (position) =>
                                  position &&
                                  typeof position.latitude === "number" &&
                                  typeof position.longitude === "number"
                              )
                              .map((position, index) => {
                                // Check if this position is a deviation or idle point
                                const isDeviation = historicalDeviations.some(
                                  (d) =>
                                    d &&
                                    typeof d.latitude === "number" &&
                                    typeof d.longitude === "number" &&
                                    Math.abs(d.latitude - position.latitude) <
                                      0.0001 &&
                                    Math.abs(d.longitude - position.longitude) <
                                      0.0001
                                );

                                const isIdle = historicalIdleDetections.some(
                                  (i) =>
                                    i &&
                                    typeof i.latitude === "number" &&
                                    typeof i.longitude === "number" &&
                                    Math.abs(i.latitude - position.latitude) <
                                      0.0001 &&
                                    Math.abs(i.longitude - position.longitude) <
                                      0.0001
                                );

                                return (
                                  <tr
                                    key={`pos-${index}`}
                                    className={`
                                  ${isDeviation ? "bg-red-50" : ""} 
                                  ${isIdle ? "bg-orange-50" : ""}
                                `}
                                  >
                                    <td className="p-1.5 border">
                                      {position.timestamp
                                        ? new Date(
                                            position.timestamp
                                          ).toLocaleTimeString()
                                        : "N/A"}
                                    </td>
                                    <td className="p-1.5 border">
                                      {position.latitude.toFixed(6)}
                                    </td>
                                    <td className="p-1.5 border">
                                      {position.longitude.toFixed(6)}
                                    </td>
                                    <td className="p-1.5 border">
                                      {isDeviation && (
                                        <span className="text-red-500 font-bold">
                                          DEVIATION
                                        </span>
                                      )}
                                      {isIdle && (
                                        <span className="text-orange-500 font-bold">
                                          IDLE
                                        </span>
                                      )}
                                      {!isDeviation && !isIdle && (
                                        <span className="text-green-500">
                                          Normal
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center text-gray-500 py-8 rounded-lg border border-gray-200 bg-gray-50">
                      <svg
                        className="w-12 h-12 text-gray-300 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        ></path>
                      </svg>
                      <p>No position data available for {selectedDay}</p>
                      <p className="text-center text-xs text-gray-400 mt-1">
                        {activeTruck
                          ? activeTruck.plate_number || activeTruck.mac_id
                          : ""}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {viewMode === "data" && (
                <div className="p-4 overflow-x-auto">
                  <h4 className="text-sm font-semibold mb-2">
                    Fuel Receipt Data
                  </h4>
                  {loadingFuelReceipts ? (
                    <div className="flex justify-center items-center h-36">
                      <div className="flex flex-col items-center text-[#009EFF]">
                        <div className="w-8 h-8 border-4 border-[#009EFF] border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p>Loading fuel receipt data...</p>
                      </div>
                    </div>
                  ) : fuelReceipts && fuelReceipts.length > 0 ? (
                    <>
                      <div className="mb-2 text-xs text-gray-500">
                        {fuelReceipts.length} receipt(s) found
                      </div>
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
                            <tr key={receipt.id || `receipt-${Math.random()}`}>
                              <td className="p-2 border">
                                {receipt.created_at
                                  ? new Date(
                                      receipt.created_at
                                    ).toLocaleString()
                                  : "N/A"}
                              </td>
                              <td className="p-2 border">
                                {receipt.product_name || "N/A"}
                              </td>
                              <td className="p-2 border">
                                {receipt.price
                                  ? `Rp ${Number(
                                      receipt.price
                                    ).toLocaleString()}`
                                  : "N/A"}
                              </td>
                              <td className="p-2 border">
                                {receipt.volume
                                  ? `${Number(receipt.volume)} Liter`
                                  : "N/A"}
                              </td>
                              <td className="p-2 border">
                                {receipt.total_price
                                  ? `Rp ${Number(
                                      receipt.total_price
                                    ).toLocaleString()}`
                                  : "N/A"}
                              </td>
                              <td className="p-2 border">
                                {receipt.image_url ? (
                                  <a
                                    href={receipt.image_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <div className="flex flex-col items-center">
                                      <img
                                        src={receipt.image_url}
                                        alt="Bukti Receipt"
                                        className="w-16 h-16 object-cover rounded border border-gray-300 mb-1"
                                      />
                                      <span className="text-xs text-blue-500 hover:underline">
                                        Lihat Foto
                                      </span>
                                    </div>
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-xs">
                                    Tidak ada foto
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center text-gray-500 py-8 rounded-lg border border-gray-200 bg-gray-50">
                      <svg
                        className="w-12 h-12 text-gray-300 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        ></path>
                      </svg>
                      <p>No fuel receipt data available for {selectedDay}</p>
                      <p className="text-sm mt-1">
                        Try selecting another date or adding a receipt
                      </p>
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
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-[#009EFF] font-medium">
                    Aktivitas (30 hari terakhir)
                  </span>
                  <span className="text-xs text-gray-500">
                    {activityDays.length} hari
                  </span>
                </div>
                {/* Tambahkan pencarian/filter untuk memudahkan navigasi saat banyak hari */}
                {/* Tabs untuk kategori hari */}
                <div className="flex mb-3 bg-gray-100 p-1 rounded-md">
                  <button
                    className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-all ${
                      selectedDayCategory === "recent"
                        ? "bg-white text-[#009EFF] shadow"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => setSelectedDayCategory("recent")}
                  >
                    Terbaru
                  </button>
                  <button
                    className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-all ${
                      selectedDayCategory === "week1"
                        ? "bg-white text-[#009EFF] shadow"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => setSelectedDayCategory("week1")}
                  >
                    Minggu 1
                  </button>
                  <button
                    className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-all ${
                      selectedDayCategory === "week2"
                        ? "bg-white text-[#009EFF] shadow"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => setSelectedDayCategory("week2")}
                  >
                    Minggu 2
                  </button>
                  <button
                    className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-all ${
                      selectedDayCategory === "week3"
                        ? "bg-white text-[#009EFF] shadow"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => setSelectedDayCategory("week3")}
                  >
                    Minggu 3+
                  </button>
                </div>

                {/* Pencarian */}
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Cari tanggal..."
                    className="w-full p-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#009EFF]"
                    onChange={(e) => {
                      const searchTerm = e.target.value.toLowerCase();
                      setSearchDay(searchTerm);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] text-xs">
                  {filteredActivityDays.length > 0 ? (
                    filteredActivityDays.map((item, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedDay(item.day)}
                        className={`day-item border border-[#F1F1F1] p-2 rounded-md cursor-pointer ${
                          selectedDay === item.day
                            ? "bg-[#E6F5FF] border-[#009EFF]"
                            : ""
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium text-[#484848] mr-2">
                              {item.day}
                            </span>
                            {item.date && (
                              <span className="text-[#ADADAD] font-light text-xs">
                                {item.date}{" "}
                                {new Date(item.isoDate).getFullYear()}
                              </span>
                            )}
                          </div>
                          <span
                            className={`${
                              selectedDay === item.day
                                ? "text-[#009EFF]"
                                : "text-yellow-500"
                            }`}
                          >
                            <i className="bx bx-calendar"></i>
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-3">
                      Tidak ada data untuk kriteria yang dipilih
                    </div>
                  )}
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
  isIdle,
  idleData,
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

  // Determine which icon to use based on truck status
  const getIcon = () => {
    if (isDeviating) return deviatingTruckIcon;
    if (isIdle) return idleTruckIcon;
    return truckIcon;
  };

  return (
    <>
      <Marker
        position={[truck.latitude, truck.longitude]}
        icon={getIcon()}
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
              {isIdle && (
                <span className="ml-2 text-orange-500 text-sm">(Idle)</span>
              )}
            </h3>
            <p>Type: {truck.type || "Unknown"}</p>
            <p>
              Fuel:{" "}
              {truck.fuel !== undefined ? `${truck.fuel.toFixed(2)}%` : "N/A"}
            </p>
            <p>
              Position: {truck.latitude.toFixed(6)},{" "}
              {truck.longitude.toFixed(6)}
            </p>
            {isDeviating && deviation && (
              <p className="text-red-500 font-medium mt-2">
                Off route by {deviation.distance.toFixed(0)} meters!
              </p>
            )}
            {isIdle && idleData && (
              <p className="text-orange-500 font-medium mt-2">
                Idle for {Math.floor(idleData.duration / 60)} minutes and{" "}
                {idleData.duration % 60} seconds
              </p>
            )}
          </div>
        </Popup>
      </Marker>

      {/* Show idle duration label above the idle truck */}
      {isIdle && idleData && (
        <Marker
          position={[
            truck.latitude + 0.0003, // Offset slightly to position above the truck marker
            truck.longitude,
          ]}
          icon={createIdleLabelIcon(idleData.duration)}
          interactive={false}
        />
      )}
    </>
  );
}

export default DashboardPage;
