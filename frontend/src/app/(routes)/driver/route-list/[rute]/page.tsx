"use client";

import "leaflet";
import "boxicons/css/boxicons.min.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import dynamic from "next/dynamic";
import { format } from "date-fns";
import { getLatLngsForMap } from "@/app/utils/polylineDecoder";
import { id } from "date-fns/locale";

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
  data: RoutePlan;
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

interface AvoidanceMarker {
  id: string;
  position: [number, number];
  reason?: string;
  photoURL?: string;
  requesterID?: number;
  status?: string;
}

// Interface untuk area baru yang akan ditandai
interface NewAvoidanceArea {
  points: [number, number][];
  reason: string;
  isPermanent: boolean;
  photo?: File | null;
  photoPreview?: string;
}

const DriverRouteDetailPage = () => {
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
  const [routeLatLngs, setRouteLatLngs] = useState<[number, number][]>([]);
  const mapRef = useRef<any>(null);
  const [segments, setSegments] = useState<
    { segment: [number, number][]; typeValue: number }[]
  >([]);
  const [tollways, setTollways] = useState<
    { segment: [number, number][]; tollwayValue: number }[]
  >([]);

  // States untuk mode menandai area
  const [isMarkingMode, setIsMarkingMode] = useState<boolean>(false);
  const [newAvoidanceArea, setNewAvoidanceArea] = useState<NewAvoidanceArea>({
    points: [],
    reason: "",
    isPermanent: false,
    photo: null,
    photoPreview: undefined,
  });
  const [showAvoidanceForm, setShowAvoidanceForm] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [requesterNames, setRequesterNames] = useState<{
    [key: number]: string;
  }>({});
  const [requesterRoles, setRequesterRoles] = useState<{
    [key: number]: string;
  }>({});

  // Load Map component dynamically to avoid SSR issues
  const DriverMap = useMemo(
    () =>
      dynamic(() => import("@/app/_components/DriverMap"), {
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
              photoURL: area.photo_url,
              requesterID: area.requester_id,
              status: area.status,
            }))
          );
          setImpassibleMarkers(avoidanceMarkersGroups);

          // Fetch requester names
          const fetchRequesterNames = async () => {
            const newRequesterNames: { [key: number]: string } = {};
            const newRequesterRoles: { [key: number]: string } = {};

            for (const area of data.data.avoidance_areas) {
              if (area.requester_id && !requesterNames[area.requester_id]) {
                try {
                  const response = await fetch(
                    `/api/v1/users/${area.requester_id}`,
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    }
                  );

                  if (response.ok) {
                    const userData = await response.json();
                    if (userData.data && userData.data.name) {
                      newRequesterNames[area.requester_id] = userData.data.name;
                      newRequesterRoles[area.requester_id] =
                        userData.data.role || "unknown";
                    }
                  }
                } catch (error) {
                  console.error(
                    `Error fetching user ${area.requester_id}:`,
                    error
                  );
                }
              }
            }

            if (Object.keys(newRequesterNames).length > 0) {
              setRequesterNames((prev) => ({ ...prev, ...newRequesterNames }));
              setRequesterRoles((prev) => ({ ...prev, ...newRequesterRoles }));
            }
          };

          fetchRequesterNames();
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
              const newSegments = [];
              for (const waytype of waytypes) {
                const startIdx = waytype[0];
                const endIdx = waytype[1];
                const typeValue = waytype[2];
                const segment = latLngs.slice(startIdx, endIdx + 1);
                newSegments.push({ segment, typeValue });
              }
              setSegments(newSegments);
            }

            // Process tollways
            if (data.data.extras.tollways && data.data.extras.tollways.values) {
              const tollwayValues = data.data.extras.tollways.values;
              const newTollways = [];
              for (const tollway of tollwayValues) {
                const startIdx = tollway[0];
                const endIdx = tollway[1];
                const tollwayValue = tollway[2];
                const segment = latLngs.slice(startIdx, endIdx + 1);
                newTollways.push({ segment, tollwayValue });
              }
              setTollways(newTollways);
            }
          } else {
            // Jika tidak ada extras data, gunakan rute standar tanpa segmen
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

  // Function untuk menambahkan point ke new avoidance area
  const handleAddPoint = (point: [number, number]) => {
    if (isMarkingMode) {
      setNewAvoidanceArea((prev) => ({
        ...prev,
        points: [...prev.points, point],
      }));
    }
  };

  // Function untuk menghapus point terakhir
  const handleRemoveLastPoint = () => {
    if (newAvoidanceArea.points.length > 0) {
      setNewAvoidanceArea((prev) => ({
        ...prev,
        points: prev.points.slice(0, -1),
      }));
    }
  };

  // Function untuk handle upload foto
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAvoidanceArea((prev) => ({
          ...prev,
          photo: file,
          photoPreview: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Function untuk menyimpan area baru
  const handleSaveAvoidanceArea = async () => {
    if (newAvoidanceArea.points.length < 3) {
      alert("Minimal 3 titik diperlukan untuk membentuk area!");
      return;
    }

    if (newAvoidanceArea.reason.trim() === "") {
      alert("Mohon isi alasan area ini dihindari!");
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      // // Prepare the data
      // const formData = new FormData();

      // Convert points to format yang dibutuhkan API
      const pointsData = newAvoidanceArea.points.map((point, index) => ({
        latitude: point[0],
        longitude: point[1],
        order: index,
      }));

      // Upload photo jika ada
      let photoKey = "";
      if (newAvoidanceArea.photo) {
        const photoForm = new FormData();
        photoForm.append("photo", newAvoidanceArea.photo);

        const uploadResponse = await fetch("/api/v1/uploads/photo", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: photoForm,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload photo");
        }

        const uploadData = await uploadResponse.json();
        photoKey = uploadData.data.key;
      }

      // Get current user ID from localStorage or decode from JWT
      const userObj = localStorage.getItem("user");
      let currentUserId = 0;

      if (userObj) {
        try {
          const userData = JSON.parse(userObj);
          currentUserId = userData.id || 0;
        } catch (e) {
          console.error("Error parsing user data", e);
        }
      }

      // As fallback, get from userId directly
      if (currentUserId === 0) {
        const currentUserIdStr = localStorage.getItem("userId");
        currentUserId = currentUserIdStr ? parseInt(currentUserIdStr) : 0;
      }

      // Prepare update data
      const updateData = {
        avoidance_areas: [
          {
            reason: newAvoidanceArea.reason,
            is_permanent: newAvoidanceArea.isPermanent,
            photo_key: photoKey || undefined,
            points: pointsData,
            requester_id: currentUserId,
            status: "pending",
          },
        ],
      };

      // Send to API
      const response = await fetch(
        `/api/v1/route-plans/${params.rute}/avoidance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      // Show success message and reset form
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);

      // Update status to "on confirmation"
      try {
        await handleUpdateStatus("on confirmation");
        // Update pesan sukses untuk memberitahu pengguna bahwa status sudah berubah
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      } catch (error) {
        console.error("Error updating to on confirmation status:", error);
        // Masih tampilkan pesan sukses untuk penyimpanan area
      }
      // Add new area to current display
      const newArea = {
        id: `temp-area-${Date.now()}`,
        reason: newAvoidanceArea.reason,
        is_permanent: newAvoidanceArea.isPermanent,
        has_photo: !!newAvoidanceArea.photo,
        photo_url: newAvoidanceArea.photoPreview,
        points: pointsData.map((p) => ({
          id: 0,
          latitude: p.latitude,
          longitude: p.longitude,
          order: p.order,
        })),
      };

      // setRoutePlan(prev => {
      //   if (!prev) return null;
      //   return {
      //     ...prev,
      //     avoidance_areas: [
      //   ...prev.avoidance_areas,
      //   {
      //     ...newArea,
      //     id: typeof newArea.id === "string" ? Date.now() : newArea.id,
      //   },
      //     ],
      //   };
      // });

      setRoutePlan((prev): any => {
        // If prev doesn't exist, create a new route plan
        if (!prev) {
          return {
            avoidance_areas: [
              {
                ...newArea,
                id: typeof newArea.id === "string" ? Date.now() : newArea.id,
              },
            ],
            // Add other required route plan properties with default values here
          };
        }

        // If prev exists but avoidance_areas is not iterable (undefined, null, etc.)
        // Initialize it as an empty array
        const existingAreas = Array.isArray(prev.avoidance_areas)
          ? prev.avoidance_areas
          : [];

        return {
          ...prev,
          avoidance_areas: [
            ...existingAreas,
            {
              ...newArea,
              id: typeof newArea.id === "string" ? Date.now() : newArea.id,
            },
          ],
        };
      });

      // Add to map markers
      const newMapMarkers = newAvoidanceArea.points.map((point, idx) => ({
        id: `new-avoidance-${Date.now()}-${idx}`,
        position: point as [number, number],
        reason: newAvoidanceArea.reason,
        photoURL: newAvoidanceArea.photoPreview,
      }));

      setImpassibleMarkers((prev) => [...prev, newMapMarkers]);

      // Reset avoidance area
      setNewAvoidanceArea({
        points: [],
        reason: "",
        isPermanent: false,
        photo: null,
        photoPreview: undefined,
      });

      // Exit marking mode
      setIsMarkingMode(false);
      setShowAvoidanceForm(false);
    } catch (err) {
      console.error("Error saving avoidance area:", err);
      alert("Gagal menyimpan area. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  // Function untuk membatalkan marking
  const handleCancelMarking = () => {
    setIsMarkingMode(false);
    setShowAvoidanceForm(false);
    setNewAvoidanceArea({
      points: [],
      reason: "",
      isPermanent: false,
      photo: null,
      photoPreview: undefined,
    });
  };

  // Function untuk membuka form setelah menyelesaikan polygon
  const handleCompletePolygon = () => {
    if (newAvoidanceArea.points.length >= 3) {
      setShowAvoidanceForm(true);
    } else {
      alert("Minimal 3 titik diperlukan untuk membentuk area!");
    }
  };

  // Function untuk memperbarui status rute
  const handleUpdateStatus = async (newStatus: string) => {
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

  // Format status for display
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
      "on confirmation": {
        text: "Menunggu Konfirmasi",
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-800",
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
    } catch {
      return dateString;
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
            onClick={() => router.push("/driver/route-list")}
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
          onClick={() => router.push("/driver/route-list")}
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
        >
          Kembali ke Daftar Rute
        </button>
      </div>
    );
  }

  return (
    <div className="h-full px-4 md:px-8 py-6 overflow-y-auto">
      {/* Success message */}
      {showSuccessMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 shadow-md">
          <span className="font-bold">Berhasil!</span> Area yang tidak dapat
          dilewati telah ditambahkan dan status rute diubah menjadi &quot;Menunggu
          Konfirmasi&quot;.
        </div>
      )}

      {/* Header with back button and route info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <button
            onClick={() => router.push("/driver/route-list")}
            className="mr-4 flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <i className="bx bx-arrow-back text-xl"></i>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">
              Detail Rute #{routePlan.id}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{formatDate(routePlan.created_at)}</span>
              <span>•</span>
              {getStatusDisplay(routePlan.status)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Button untuk memulai rute */}
          {routePlan.status === "planned" && (
            <button
              onClick={() => {
                handleUpdateStatus("active").then(() => {
                  router.push("/driver/route");
                });
              }}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md flex items-center gap-2 transition-colors"
            >
              <i className="bx bx-play"></i>
              <span>Mulai Rute</span>
            </button>
          )}

          {/* Button untuk menyelesaikan rute */}
          {routePlan.status === "active" && (
            <button
              onClick={() => handleUpdateStatus("completed")}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center gap-2 transition-colors"
            >
              <i className="bx bx-check"></i>
              <span>Selesaikan Rute</span>
            </button>
          )}

          {/* Button untuk membatalkan rute */}
          {(routePlan.status === "planned" ||
            routePlan.status === "active" ||
            routePlan.status === "on confirmation") && (
            <button
              onClick={() => handleUpdateStatus("cancelled")}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center gap-2 transition-colors"
            >
              <i className="bx bx-x"></i>
              <span>Batalkan Rute</span>
            </button>
          )}

          {/* Button untuk menandai area */}
          {routePlan.status !== "completed" &&
            routePlan.status !== "cancelled" &&
            (!isMarkingMode ? (
              <button
                onClick={() => setIsMarkingMode(true)}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md flex items-center gap-2 transition-colors"
                disabled={
                  showAvoidanceForm ||
                  routePlan.status === "completed" ||
                  routePlan.status === "cancelled"
                }
              >
                <i className="bx bx-map-pin"></i>
                <span>Tandai Area</span>
              </button>
            ) : (
              <button
                onClick={handleCancelMarking}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md flex items-center gap-2 transition-colors"
              >
                <i className="bx bx-x"></i>
                <span>Batal</span>
              </button>
            ))}
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
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (
                          mapRef.current &&
                          area.points &&
                          area.points.length > 0
                        ) {
                          // Hitung center dari area
                          const latSum = area.points.reduce(
                            (sum, p) => sum + p.latitude,
                            0
                          );
                          const lngSum = area.points.reduce(
                            (sum, p) => sum + p.longitude,
                            0
                          );
                          const centerLat = latSum / area.points.length;
                          const centerLng = lngSum / area.points.length;

                          // Set center map ke area yang dipilih
                          mapRef.current.setView([centerLat, centerLng], 15);

                          // Cari marker yang sesuai dan buka popupnya
                          const areaMarkers = impassibleMarkers.find(
                            (markerGroup) => {
                              if (markerGroup.length > 0) {
                                const idParts = markerGroup[0].id.split("-");
                                return (
                                  idParts.length >= 2 &&
                                  parseInt(idParts[1]) === area.id
                                );
                              }
                              return false;
                            }
                          );

                          // Jika marker ditemukan, tampilkan popup
                          if (areaMarkers && areaMarkers.length > 0) {
                            // Kita perlu menunggu sedikit agar peta selesai digerakkan
                            setTimeout(() => {
                              // Cari layer yang sesuai untuk area ini
                              mapRef.current.eachLayer((layer: any) => {
                                if (layer._icon && layer._popup) {
                                  const iconEl = layer._icon;
                                  if (iconEl.innerText === `A${index + 1}`) {
                                    layer.openPopup();
                                  }
                                }
                              });
                            }, 500);
                          }
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-800">
                          Area {index + 1}
                        </h3>
                        <div className="flex items-center gap-2">
                          {area.is_permanent && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                              Permanen
                            </span>
                          )}
                          {area.status &&
                            (!area.requester_id ||
                              requesterRoles[area.requester_id] !==
                                "planner") && (
                              <span
                                className={`px-2 py-0.5 text-xs rounded ${
                                  area.status === "approved"
                                    ? "bg-green-100 text-green-700"
                                    : area.status === "rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {area.status === "approved"
                                  ? "Disetujui"
                                  : area.status === "rejected"
                                  ? "Ditolak"
                                  : "Menunggu"}
                              </span>
                            )}
                        </div>
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

        {/* Right column - Map and form */}
        <div className="lg:col-span-2">
          {/* Map Container */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden h-[500px] mb-6">
            <DriverMap
              center={center}
              markers={markers}
              impassibleMarkers={impassibleMarkers}
              routePath={routeLatLngs}
              segments={segments}
              tollways={tollways}
              zoom={12}
              onMapRef={(map: any) => (mapRef.current = map)}
              isMarkingMode={isMarkingMode}
              onAddPoint={handleAddPoint}
              newAvoidancePoints={newAvoidanceArea.points}
              requesterNames={requesterNames}
            />
          </div>

          {/* Marking Instructions */}
          {isMarkingMode && !showAvoidanceForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-800 mb-2">
                Mode Penandaan Area
              </h3>
              <p className="text-sm text-blue-600 mb-3">
                Klik pada peta untuk menandai titik-titik area yang tidak dapat
                dilewati. Minimal 3 titik diperlukan untuk membentuk area.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCompletePolygon}
                  disabled={newAvoidanceArea.points.length < 3}
                  className={`px-4 py-2 rounded-md text-white text-sm flex items-center gap-1
                    ${
                      newAvoidanceArea.points.length < 3
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                >
                  <i className="bx bx-check"></i>
                  <span>Selesai ({newAvoidanceArea.points.length} titik)</span>
                </button>

                <button
                  onClick={handleRemoveLastPoint}
                  disabled={newAvoidanceArea.points.length === 0}
                  className={`px-4 py-2 rounded-md text-white text-sm flex items-center gap-1
                    ${
                      newAvoidanceArea.points.length === 0
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                >
                  <i className="bx bx-undo"></i>
                  <span>Hapus Titik Terakhir</span>
                </button>

                <button
                  onClick={handleCancelMarking}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm flex items-center gap-1"
                >
                  <i className="bx bx-x"></i>
                  <span>Batal</span>
                </button>
              </div>
            </div>
          )}

          {/* Avoidance Area Form */}
          {showAvoidanceForm && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="font-medium text-gray-800 mb-4">
                Detail Area yang Tidak Dapat Dilewati
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="reason"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Alasan Tidak Dapat Dilewati{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="reason"
                    value={newAvoidanceArea.reason}
                    onChange={(e) =>
                      setNewAvoidanceArea((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Contoh: Jalan rusak, banjir, longsor, dll."
                    required
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPermanent"
                    checked={newAvoidanceArea.isPermanent}
                    onChange={(e) =>
                      setNewAvoidanceArea((prev) => ({
                        ...prev,
                        isPermanent: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isPermanent"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Area ini secara permanen tidak dapat dilewati
                  </label>
                </div>

                <div>
                  <label
                    htmlFor="photo"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Unggah Foto (Opsional)
                  </label>
                  <input
                    type="file"
                    id="photo"
                    ref={fileInputRef}
                    onChange={handlePhotoChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm"
                    >
                      Pilih Foto
                    </button>
                    <span className="text-sm text-gray-500">
                      {newAvoidanceArea.photo
                        ? newAvoidanceArea.photo.name
                        : "Tidak ada foto dipilih"}
                    </span>
                  </div>

                  {newAvoidanceArea.photoPreview && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Preview:
                      </p>
                      <img
                        src={newAvoidanceArea.photoPreview}
                        alt="Preview"
                        className="max-h-40 rounded-md border border-gray-300"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveAvoidanceArea}
                    disabled={isSaving || newAvoidanceArea.reason.trim() === ""}
                    className={`px-4 py-2 rounded-md text-white flex-1 ${
                      isSaving || newAvoidanceArea.reason.trim() === ""
                        ? "bg-blue-300 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {isSaving ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Menyimpan...
                      </span>
                    ) : (
                      "Simpan Area"
                    )}
                  </button>

                  <button
                    onClick={handleCancelMarking}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default DriverRouteDetailPage;
