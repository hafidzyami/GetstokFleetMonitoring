"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { id } from "date-fns/locale";
// Import types directly to avoid confusion
import "leaflet";
import "boxicons/css/boxicons.min.css";
import { getLatLngsForMap } from "@/app/utils/polylineDecoder";

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
  extras?: RouteExtras; // Tambahkan field extras
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
  data: RoutePlan;
  error?: {
    code: number;
    message: string;
    errors?: any[];
  };
}

// Define the marker types to match DetailMap props
interface MapMarker {
  id: string;
  position: [number, number]; // Explicit tuple type to match DetailMap
  address?: string;
}

interface AvoidanceMarker {
  id: string;
  position: [number, number]; // Explicit tuple type to match DetailMap
  reason?: string;
}

const RouteHistoryPage = () => {
  const params = useParams();
  const router = useRouter();
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [impassibleMarkers, setImpassibleMarkers] = useState<
    AvoidanceMarker[][]
  >([]);
  const [center, setCenter] = useState<[number, number]>([-6.8904, 107.6102]); // Default to Bandung
  const [routeLatLngs, setRouteLatLngs] = useState<[number, number][]>([]); // Explicit tuple type
  const mapRef = useRef<any>(null);
  const [segments, setSegments] = useState<
    { segment: [number, number][]; typeValue: number }[]
  >([]);
  const [tollways, setTollways] = useState<
    { segment: [number, number][]; tollwayValue: number }[]
  >([]);
  const [surfaceTypes, setSurfaceTypes] = useState<any>([]);

  // Load Map component dynamically to avoid SSR issues
  const Map = useMemo(
    () =>
      dynamic(() => import("@/app/_components/DetailMap"), {
        loading: () => (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            Memuat peta...
          </div>
        ),
        ssr: false,
      }),
    []
  );

  useEffect(() => {
    const fetchRoutePlanDetail = async () => {
      if (!params.rute) return;

      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const response = await fetch(`/api/v1/route-plans/${params.rute}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
            router.push("/login");
            return;
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data: ApiResponse = await response.json();
        console.log("Route plan data:", data);
        setRoutePlan(data.data);

        // Process waypoints for map markers
        if (data.data.waypoints && data.data.waypoints.length > 0) {
          const waypointMarkers = data.data.waypoints.map((waypoint) => ({
            id: `waypoint-${waypoint.id}`,
            position: [waypoint.latitude, waypoint.longitude] as [
              number,
              number
            ],
            address: waypoint.address || `Point ${waypoint.order + 1}`,
          }));
          setMarkers(waypointMarkers);

          // Set center to first waypoint
          setCenter([
            data.data.waypoints[0].latitude,
            data.data.waypoints[0].longitude,
          ]);
        }

        // Process avoidance areas
        if (data.data.avoidance_areas && data.data.avoidance_areas.length > 0) {
          const avoidanceMarkersGroups = data.data.avoidance_areas.map((area) =>
            area.points.map((point) => ({
              id: `avoidance-${area.id}-${point.id}`,
              position: [point.latitude, point.longitude] as [number, number],
              reason: area.reason,
              photoURL: area.photo_url, // Gunakan photo_url dari response API
            }))
          );
          setImpassibleMarkers(avoidanceMarkersGroups);
        } else {
          setImpassibleMarkers([]);
        }

        // Process route geometry and segments
        if (data.data.route_geometry) {
          const latLngs = getLatLngsForMap(data.data.route_geometry) as [
            number,
            number
          ][];
          setRouteLatLngs(latLngs);

          // Process extras data if available
          if (data.data.extras) {
            // Process waytype segments
            if (data.data.extras.waytype && data.data.extras.waytype.values) {
              const waytypes = data.data.extras.waytype.values;
              for (const waytype of waytypes) {
                const startIdx = waytype[0];
                const endIdx = waytype[1];
                const typeValue = waytype[2];
                const segment = latLngs.slice(startIdx, endIdx + 1);
                setSegments((prev) => [...prev, { segment, typeValue }]);
              }
            }

            // Process tollways
            if (data.data.extras.tollways && data.data.extras.tollways.values) {
              const tollwayss = data.data.extras.tollways.values;
              for (const tollway of tollwayss) {
                const startIdx = tollway[0];
                const endIdx = tollway[1];
                const tollwayValue = tollway[2];
                const segment = latLngs.slice(
                  startIdx,
                  endIdx + 1
                );
                setTollways((prev) => [
                  ...prev,
                  { segment, tollwayValue },
                ]);
              }
            }

            // Process surface types
            if (data.data.extras.surface && data.data.extras.surface.values) {
              const surfaces = data.data.extras.surface.values;
              const surfaceMapping: { [key: number]: string } = {
                0: "Unknown",
                1: "Paved",
                2: "Unpaved",
                3: "Asphalt",
                4: "Concrete",
                5: "Cobblestone",
                6: "Metal",
                7: "Wood",
                8: "Compacted Gravel",
                9: "Fine Gravel",
                10: "Gravel",
                11: "Dirt",
                12: "Ground",
                13: "Ice",
                14: "Paving Stones",
                15: "Sand",
                16: "Woodchips",
                17: "Grass",
                18: "Grass Paver",
              };

              const surfaceTypesArray = Array(latLngs.length).fill("Unknown");
              for (const surface of surfaces) {
                const startIdx = surface[0];
                const endIdx = surface[1];
                const surfaceValue = surface[2];
                const surfaceType = surfaceMapping[surfaceValue] || "Unknown";

                for (let i = startIdx; i <= endIdx; i++) {
                  if (i < surfaceTypesArray.length) {
                    surfaceTypesArray[i] = surfaceType;
                  }
                }
              }
              setSurfaceTypes(surfaceTypesArray);
            }
          } else {
            // Jika tidak ada extras data, gunakan rute standar tanpa segmen
            console.log("No extras data available for segmentation");
            setSegments([]);
            setTollways([]);
          }
        }
      } catch (err) {
        console.error("Error fetching route plan:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoutePlanDetail();
  }, [params.rute, router]);

  console.log("segments", segments);
  console.log("tollways", tollways);

  // Function to format status with color
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<
      string,
      { text: string; bgColor: string; textColor: string }
    > = {
      planned: {
        text: "Direncanakan",
        bgColor: "bg-blue-100",
        textColor: "text-blue-800",
      },
      active: {
        text: "Aktif",
        bgColor: "bg-green-100",
        textColor: "text-green-800",
      },
      completed: {
        text: "Selesai",
        bgColor: "bg-gray-100",
        textColor: "text-gray-800",
      },
      cancelled: {
        text: "Dibatalkan",
        bgColor: "bg-red-100",
        textColor: "text-red-800",
      },
    };

    const statusInfo = statusMap[status.toLowerCase()] || {
      text: status,
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}
      >
        {statusInfo.text}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd MMMM yyyy, HH:mm", { locale: id });
    } catch (e) {
      return dateString;
    }
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus: string) => {
    if (!routePlan) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        `/api/v1/route-plans/${routePlan.id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error updating status: ${response.statusText}`);
      }

      // Update local state
      setRoutePlan({
        ...routePlan,
        status: newStatus,
      });
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Gagal mengubah status rute. Silakan coba lagi.");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#009EFF]"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-red-500">
        <p className="text-xl font-semibold mb-2">Error</p>
        <p className="mb-4">{error}</p>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md"
          >
            Coba Lagi
          </button>
          <button
            onClick={() => router.push("/planner/riwayat-rute")}
            className="px-4 py-2 bg-gray-500 text-white rounded-md"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!routePlan) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500">
        <p className="text-xl font-semibold mb-2">Data Tidak Ditemukan</p>
        <p className="mb-4">Route plan dengan ID tersebut tidak ditemukan</p>
        <button
          onClick={() => router.push("/planner/riwayat-rute")}
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          Kembali ke Daftar Rute
        </button>
      </div>
    );
  }

  console.log("segmentsFIX", segments);
  console.log("tollwaysFIX", tollways);

  return (
    <div className="h-full px-8 py-6 overflow-y-auto">
      {/* Header with back button and route info */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => router.push("/planner/route-history")}
            className="mr-4 flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <i className="bx bx-arrow-back text-xl"></i>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Detail Rute #{routePlan.id}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{formatDate(routePlan.created_at)}</span>
              <span>•</span>
              {getStatusDisplay(routePlan.status)}
            </div>
          </div>
        </div>

        <div className="dropdown dropdown-end">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-md flex items-center gap-2">
            <span>Update Status</span>
            <i className="bx bx-chevron-down"></i>
          </button>
          <div className="dropdown-content bg-white shadow-lg rounded-md p-2 mt-1 min-w-[150px]">
            <button
              onClick={() => handleStatusUpdate("planned")}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md"
            >
              Direncanakan
            </button>
            <button
              onClick={() => handleStatusUpdate("active")}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md"
            >
              Aktif
            </button>
            <button
              onClick={() => handleStatusUpdate("completed")}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md"
            >
              Selesai
            </button>
            <button
              onClick={() => handleStatusUpdate("cancelled")}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-md"
            >
              Dibatalkan
            </button>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Info cards */}
        <div className="space-y-6">
          {/* Driver & Vehicle Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="font-semibold text-lg text-gray-800 mb-4">
              Informasi Rute
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <h3 className="text-gray-500 text-sm mb-1">Dibuat Oleh</h3>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-2">
                    <i className="bx bx-user"></i>
                  </div>
                  <p className="font-medium">{routePlan.planner_name}</p>
                </div>
              </div>

              <div>
                <h3 className="text-gray-500 text-sm mb-1">Driver</h3>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-2">
                    <i className="bx bx-user"></i>
                  </div>
                  <p className="font-medium">{routePlan.driver_name}</p>
                </div>
              </div>

              <div>
                <h3 className="text-gray-500 text-sm mb-1">Kendaraan</h3>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mr-2">
                    <i className="bx bx-car"></i>
                  </div>
                  <p className="font-medium">{routePlan.vehicle_plate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Waypoints */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-gray-800">
                Titik Rute
              </h2>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {routePlan.waypoints.length} waypoints
              </span>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {routePlan.waypoints.map((waypoint, index) => (
                <div key={waypoint.id} className="flex items-start">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3
                    ${
                      index === 0
                        ? "bg-green-500"
                        : index === routePlan.waypoints.length - 1
                        ? "bg-red-500"
                        : "bg-blue-500"
                    } 
                    text-white`}
                  >
                    {index}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {waypoint.address || `Waypoint ${index + 1}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {waypoint.latitude.toFixed(6)},{" "}
                      {waypoint.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Avoidance Areas */}
          {routePlan.avoidance_areas &&
            routePlan.avoidance_areas.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg text-gray-800">
                    Area Dihindari
                  </h2>
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                    {routePlan.avoidance_areas.length} area
                  </span>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {routePlan.avoidance_areas.map((area, index) => (
                    <div
                      key={area.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-800">
                          Area {index + 1}
                        </h3>
                        {area.is_permanent && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                            Permanen
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {area.reason}
                      </p>
                      <p className="text-xs text-gray-500">
                        {area.points.length} titik koordinat
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Right column - Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden h-[600px]">
            <Map
              center={center}
              markers={markers}
              impassibleMarkers={impassibleMarkers}
              routePath={routeLatLngs}
              segments={segments}
              tollways={tollways}
              zoom={12}
              onMapRef={(map) => (mapRef.current = map)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteHistoryPage;
