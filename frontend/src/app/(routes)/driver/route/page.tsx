"use client";

import "leaflet/dist/leaflet.css";
import "boxicons/css/boxicons.min.css";

import React, { useEffect, useMemo, useRef, useState } from "react";

import dynamic from "next/dynamic";
import { getLatLngsForMap } from "@/app/utils/polylineDecoder";
import { useRouter } from "next/navigation";

// Tambahkan style global untuk peta
const mapStyle = `
  .leaflet-container {
    height: 100%;
    width: 100%;
  }
`;

// Interfaces
interface RouteExtras {
  waytype: {
    values: Array<[number, number, number]>;
    summary: any[];
  };
  tollways: {
    values: Array<[number, number, number]>;
    summary: any[];
  };
  surface: {
    values: Array<[number, number, number]>;
    summary: any[];
  };
}

interface Waypoint {
  id: number;
  latitude: number;
  longitude: number;
  address: string;
  order: number;
}

interface AvoidanceArea {
  id: number;
  reason: string;
  is_permanent: boolean;
  has_photo: boolean;
  photo_url?: string;
  requester_id?: number;
  status?: string;
  points: AvoidancePointResponse[];
}

interface AvoidancePointResponse {
  id: number;
  latitude: number;
  longitude: number;
  order: number;
}

interface RoutePlan {
  id: number;
  driver_name: string;
  vehicle_plate: string;
  planner_name: string;
  route_geometry: string;
  extras?: RouteExtras;
  status: string;
  waypoints: Waypoint[];
  avoidance_areas: AvoidanceArea[];
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  apiVersion: string;
  context?: string;
  id?: string;
  method?: string;
  data: {
    id: number;
    route_plan: RoutePlan;
  };
  error?: {
    code: number;
    message: string;
    errors?: any[];
  };
}


// Define the marker types
interface MapMarker {
  id: string;
  position: [number, number];
  address?: string;
}

const DriverActiveRoutePage = () => {
  const router = useRouter();
  const [routePlan, setRoutePlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [center] = useState<[number, number]>([-6.8904, 107.6102]); // Default to Bandung
  const [routeLatLngs, setRouteLatLngs] = useState<[number, number][]>([]);
  const mapRef = useRef<any>(null);
  const [segments, setSegments] = useState<{ segment: [number, number][]; typeValue: number }[]>([]);
  const [tollways, setTollways] = useState<{ segment: [number, number][]; tollwayValue: number }[]>([]);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [activeRouteId, setActiveRouteId] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [nextWaypoint, setNextWaypoint] = useState<Waypoint | null>(null);

  // Load RouteMap component dynamically to avoid SSR issues
  const RouteMap = useMemo(
    () =>
      dynamic(() => import("@/app/_components/RouteMap"), {
        loading: () => (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Memuat peta...</p>
            </div>
          </div>
        ),
        ssr: false,
      }),
    []
  );

  // Function to fetch the active route
  const fetchActiveRoute = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      // First check if there's an active route for the driver
      const response = await fetch(`/api/v1/route-plans/active`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("response", response);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        
        if (response.status === 404) {
          // No active route found - handle gracefully
          console.log("No active route found for this driver");
          setIsLoading(false);
          setIsInitialLoad(false);
          return; // Stop further execution
        }
        
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();

      console.log("Active route data:", data);
      
      if (!data.data) {
        // No active route found
        router.push("/driver/route-list")
        return;
      }

      console.log(data.data)
      
      setRoutePlan(data.data.route_plan);

      setActiveRouteId(data.data.id);

      // Process waypoints for map markers
      if (data.data.route_plan.waypoints && data.data.route_plan.waypoints.length > 0) {
        const waypointMarkers = data.data.route_plan.waypoints.map((waypoint : any) => ({
          id: `waypoint-${waypoint.id}`,
          position: [waypoint.latitude, waypoint.longitude] as [number, number],
          address: waypoint.address || `Point ${waypoint.order + 1}`,
        }));
        setMarkers(waypointMarkers);
        
        // Set the next waypoint
        setNextWaypoint(data.data.route_plan.waypoints[0]);
      }

      // Process route geometry and segments
      if (data.data.route_plan.route_geometry) {
        const latLngs = getLatLngsForMap(data.data.route_plan.route_geometry) as [number, number][];
        setRouteLatLngs(latLngs);

        // Process extras data if available
        if (data.data.route_plan.extras) {
          // Process waytype segments
          if (data.data.route_plan.extras.waytype && data.data.route_plan.extras.waytype.values) {
            const waytypes = data.data.route_plan.extras.waytype.values;
            const newSegments = [];
            for (const waytype of waytypes) {
              const startIdx = waytype[0];
              const endIdx = waytype[1];
              const typeValue = waytype[2];
              
              // Validasi indeks
              if (startIdx < 0 || endIdx >= latLngs.length || startIdx > endIdx) {
                console.warn(`Invalid segment indices: ${startIdx}-${endIdx} (max: ${latLngs.length-1})`);
                continue;
              }
              
              const segment = latLngs.slice(startIdx, endIdx + 1);
              newSegments.push({ segment, typeValue });
            }
            
            setSegments(newSegments);
          }

          // Process tollways
          if (data.data.route_plan.extras.tollways && data.data.route_plan.extras.tollways.values) {
            const tollwayValues = data.data.route_plan.extras.tollways.values;
            const newTollways = [];
            for (const tollway of tollwayValues) {
              const startIdx = tollway[0];
              const endIdx = tollway[1];
              const tollwayValue = tollway[2];
              
              // Validasi indeks
              if (startIdx < 0 || endIdx >= latLngs.length || startIdx > endIdx) {
                continue;
              }
              
              const segment = latLngs.slice(startIdx, endIdx + 1);
              newTollways.push({ segment, tollwayValue });
            }
            setTollways(newTollways);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching active route:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  // Start location tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolokasi tidak didukung oleh browser Anda");
      return;
    }

    setIsTracking(true);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation([latitude, longitude]);
        
        // If we have a map reference, center it on the current location
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 15);
        }
        
        // Update location on the server
        if (activeRouteId) {
          updateLocationOnServer(activeRouteId, latitude, longitude);
        }
        
        // Calculate progress
        calculateProgress([latitude, longitude]);
      },
      (error) => {
        console.error("Error getting current position:", error);
        alert(`Gagal mendapatkan lokasi: ${error.message}`);
        setIsTracking(false);
      },
      { enableHighAccuracy: true }
    );

    // Start watching position
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation([latitude, longitude]);
        
        // Update location on the server
        if (activeRouteId) {
          updateLocationOnServer(activeRouteId, latitude, longitude);
        }
        
        // Calculate progress
        calculateProgress([latitude, longitude]);
      },
      (error) => {
        console.error("Error watching position:", error);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    setWatchId(id);
  };

  // Calculate distance between two coordinates in meters (Haversine formula)
  const calculateDistance = (
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Calculate route progress based on current location
  const calculateProgress = (currentPos: [number, number]) => {
    if (!routePlan || !routePlan.waypoints || routePlan.waypoints.length === 0) return;
    
    // Find the next waypoint
    // Simple approach: find the closest waypoint that hasn't been visited
    let closestWaypoint = null;
    let minDistance = Infinity;
    let waypointIndex = -1;
    
    for (let i = 0; i < routePlan.waypoints.length; i++) {
      const waypoint = routePlan.waypoints[i];
      const distance = calculateDistance(
        currentPos[0], currentPos[1], 
        waypoint.latitude, waypoint.longitude
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestWaypoint = waypoint;
        waypointIndex = i;
      }
    }
    
    if (closestWaypoint) {
      // If within 50 meters of waypoint, consider it reached
      if (minDistance < 50) {
        // Mark this waypoint as visited
        setNextWaypoint(routePlan.waypoints[Math.min(waypointIndex + 1, routePlan.waypoints.length - 1)]);
      } else {
        setNextWaypoint(closestWaypoint);
      }
      
      // Calculate rough progress percentage
      const progressPct = Math.min(100, Math.max(0, (waypointIndex / (routePlan.waypoints.length - 1)) * 100));
      setProgress(Math.round(progressPct));
    }
  };

  // Stop location tracking
  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  // Update driver location on the server
  const updateLocationOnServer = async (routeId: number, latitude: number, longitude: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/v1/route-plans/${routeId}/location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error("Failed to update location on server:", response.statusText);
      }
    } catch (error) {
      console.error("Error updating location:", error);
    }
  };

  // Function to update route status
  const handleUpdateStatus = async (newStatus: string) => {
    if (!routePlan) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/v1/route-plans/${routePlan.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Error updating status: ${response.statusText}`);
      }

      // Update local state
      setRoutePlan({
        ...routePlan,
        status: newStatus,
      });

      // If completed or cancelled, stop tracking and redirect
      if (newStatus === "completed" || newStatus === "cancelled") {
        stopTracking();
        setTimeout(() => {
          router.push("/driver/route-list");
        }, 2000);
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Gagal mengubah status rute. Silakan coba lagi.");
    }
  };

  // Manually center to current location
  const centerToCurrentLocation = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.setView(currentLocation, 15);
    } else if (!currentLocation) {
      alert("Lokasi belum tersedia. Aktifkan tracking terlebih dahulu.");
    }
  };

  // Inject CSS untuk map
  useEffect(() => {
    // Add the CSS
    const styleEl = document.createElement('style');
    styleEl.textContent = mapStyle;
    document.head.appendChild(styleEl);
    
    // Clean up
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Load active route when component mounts
  useEffect(() => {
    fetchActiveRoute();
    
    // Clean up function to stop tracking when component unmounts
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Start tracking after route is loaded
  useEffect(() => {
    if (!isInitialLoad && !isTracking && routePlan) {
      startTracking();
    }
  }, [isInitialLoad, routePlan]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#009EFF] mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data rute...</p>
        </div>
      </div>
    );
  }

  // Error state - only for actual errors, not for "no route found"
  if (error && !error.includes("404")) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="bx bx-error-circle text-red-500 text-4xl"></i>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-800">Terjadi Kesalahan</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <i className="bx bx-refresh"></i>
              <span>Coba Lagi</span>
            </button>
            <button
              onClick={() => router.push("/driver/route-list")}
              className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <i className="bx bx-arrow-back"></i>
              <span>Kembali</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!routePlan) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-700">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="bx bx-map text-blue-500 text-4xl"></i>
          </div>
          <h2 className="text-2xl font-bold mb-2">Tidak Ada Rute Aktif</h2>
          <p className="text-gray-500 mb-6">Saat ini Anda tidak memiliki rute yang sedang aktif.</p>
          <button
            onClick={() => router.push("/driver/route-list")}
            className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <i className="bx bx-list-ul"></i>
            <span>Lihat Daftar Rute</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="container mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Rute Aktif #{routePlan.id}</h1>
            <p className="text-sm text-gray-600">{routePlan.driver_name} | {routePlan.vehicle_plate}</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {!isTracking ? (
              <button
                onClick={startTracking}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center gap-2"
              >
                <i className="bx bx-current-location"></i>
                <span>Mulai Tracking</span>
              </button>
            ) : (
              <button
                onClick={stopTracking}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md flex items-center gap-2"
              >
                <i className="bx bx-stop"></i>
                <span>Hentikan Tracking</span>
              </button>
            )}
            
            <button
              onClick={() => handleUpdateStatus("completed")}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md flex items-center gap-2"
            >
              <i className="bx bx-check"></i>
              <span>Selesaikan Rute</span>
            </button>
            
            <button
              onClick={() => handleUpdateStatus("cancelled")}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center gap-2"
            >
              <i className="bx bx-x"></i>
              <span>Batalkan Rute</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Map Container */}
      <div className="flex-1 relative h-[70vh]" style={{ minHeight: '500px', position: 'relative', zIndex: 0 }}>
        {/* Status tracking indicator */}
        <div className="absolute top-4 right-4 z-10 bg-white px-4 py-2 rounded-full shadow-md flex items-center gap-2">
          {isTracking ? (
            <>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Tracking Aktif</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium">Tracking Tidak Aktif</span>
            </>
          )}
        </div>
        
        {/* Progress indicator */}
        <div className="absolute top-4 left-4 z-100 bg-white p-3 rounded-lg shadow-md max-w-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
              <i className="bx bx-map"></i>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Progress Rute</h3>
              <p className="text-xs text-gray-500">
                {markers.length} titik | {Math.round(routeLatLngs.length / 100) / 10} km
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="text-xs font-medium">{progress}%</span>
          </div>
          
          {nextWaypoint && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">Menuju:</p>
              <p className="text-sm font-medium truncate">{nextWaypoint.address}</p>
            </div>
          )}
        </div>
        
        {/* Using our new RouteMap component */}
        <RouteMap
          center={center}
          routePath={routeLatLngs}
          segments={segments}
          tollways={tollways}
          zoom={14}
          currentLocation={currentLocation}
          waypoints={markers} // Menambahkan waypoints untuk menampilkan marker
          onMapRef={(map: any) => {
            mapRef.current = map;
            // Jika sudah ada lokasi saat ini, set view ke lokasi tersebut
            if (currentLocation && map) {
              map.setView(currentLocation, 15);
            }
          }}
        />
      </div>
      
      {/* Bottom info panel */}
      <div className="bg-white shadow-md p-4 border-t border-gray-200">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <i className="bx bx-map-pin text-xl"></i>
              </div>
              <div>
                <p className="text-xs text-gray-500">Titik Awal</p>
                <p className="text-sm font-medium">
                  {markers.length > 0 && markers[0].address ? markers[0].address : "Tidak tersedia"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <i className="bx bx-map-pin text-xl"></i>
              </div>
              <div>
                <p className="text-xs text-gray-500">Titik Akhir</p>
                <p className="text-sm font-medium">
                  {markers.length > 0 && markers[markers.length - 1].address 
                    ? markers[markers.length - 1].address 
                    : "Tidak tersedia"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <i className="bx bx-current-location text-xl"></i>
              </div>
              <div>
                <p className="text-xs text-gray-500">Lokasi Saat Ini</p>
                <p className="text-sm font-medium">
                  {currentLocation 
                    ? `${currentLocation[0].toFixed(6)}, ${currentLocation[1].toFixed(6)}` 
                    : "Belum tersedia"}
                </p>
              </div>
            </div>
          </div>
          
          {/* Tombol re-center ke posisi saat ini */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={centerToCurrentLocation}
              disabled={!currentLocation}
              className={`px-6 py-2 rounded-full shadow-md flex items-center gap-2 ${
                !currentLocation 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <i className="bx bx-current-location"></i>
              <span>Ke Posisi Saat Ini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverActiveRoutePage;