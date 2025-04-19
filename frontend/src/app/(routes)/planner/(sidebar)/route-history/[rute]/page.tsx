"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useAuth } from "@/app/contexts/AuthContext";
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
  photoURL?: string;
  requesterID?: number;
  status?: string;
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
  const [requesterNames, setRequesterNames] = useState<{
    [key: number]: string;
  }>({});
  const [requesterRoles, setRequesterRoles] = useState<{
    [key: number]: string;
  }>({});
  const { user } = useAuth();
  const [isProcessingAvoidanceArea, setIsProcessingAvoidanceArea] = useState(false);
  const [isDeletingRoutePlan, setIsDeletingRoutePlan] = useState(false);

  console.log("impassible", impassibleMarkers);

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

  const fetchRole = async (userId: number | undefined) => {
    try {
      if (!userId) return;
      
      const response = await fetch(`/api/v1/users/${userId}/role`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      const data = await response.json();
      console.log("role", data.data.role);
      return data.data.role;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return `Pengguna ${userId}`;
    }
  };

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
              requesterID: area.requester_id, // Tambahkan requester_id
              status: area.status, // Tambahkan status
            }))
          );
          setImpassibleMarkers(avoidanceMarkersGroups);

          // Fetch requester names
          const fetchRequesterNames = async () => {
            const newRequesterNames: { [key: number]: string } = {};

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
                    console.log(
                      `Fetched user data for ID ${area.requester_id}:`,
                      userData
                    );
                    if (userData.data && userData.data.name) {
                      newRequesterNames[area.requester_id] = userData.data.name;
                      // Juga simpan role pengguna
                      if (userData.data && userData.data.role) {
                        setRequesterRoles((prev) => ({
                          ...prev,
                          [area.requester_id as number]: userData.data.role,
                        }));
                      }
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
                const segment = latLngs.slice(startIdx, endIdx + 1);
                setTollways((prev) => [...prev, { segment, tollwayValue }]);
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
    } catch (e) {
      return dateString;
    }
  };

  // Handle route status update
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

  // Handle avoidance area approval
  const handleApproveAvoidanceArea = async (areaId: number) => {
    if (!routePlan) return;
    setIsProcessingAvoidanceArea(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      // First, approve the avoidance area
      const approveResponse = await fetch(
        `/api/v1/route-plans/avoidance/${areaId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "approved" }),
        }
      );

      if (!approveResponse.ok) {
        throw new Error(
          `Error approving avoidance area: ${approveResponse.statusText}`
        );
      }

      // Now, generate a new route plan that avoids the approved area
      // First, find all approved avoidance areas
      const approvedAreas = routePlan.avoidance_areas.filter(
        (area) => area.status === "approved" || area.id === areaId
      );

      // Create coordinates for API call
      const coordinates = routePlan.waypoints
        .sort((a, b) => a.order - b.order)
        .map((waypoint) => [waypoint.longitude, waypoint.latitude]);

      // Prepare the request body for the directions API
      const directionsBody: any = {
        coordinates: coordinates,
        extra_info: [
          "suitability",
          "surface",
          "waycategory",
          "waytype",
          "tollways",
        ],
        geometry_simplify: "false",
        elevation: true,
        instructions_format: "html",
        language: "id",
      };

      // Add avoidance areas if any
      if (approvedAreas.length > 0) {
        // Prepare to get all approved avoidance areas, including permanent ones
        let allAvoidanceAreas = [...approvedAreas];
        
        // Also fetch all permanent avoidance areas from the system
        try {
          const permanentResponse = await fetch(`/api/v1/route-plans/avoidance/permanent`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (permanentResponse.ok) {
            const permanentResult = await permanentResponse.json();
            if (permanentResult.data && Array.isArray(permanentResult.data)) {
              // Add permanent areas that aren't already in our approved areas list
              const existingAreaIds = new Set(approvedAreas.map(area => area.id));
              const additionalPermanentAreas = permanentResult.data.filter((area : any) => !existingAreaIds.has(area.id));
              allAvoidanceAreas = [...allAvoidanceAreas, ...additionalPermanentAreas];
              console.log("Including additional permanent areas:", additionalPermanentAreas.length);
            }
          }
        } catch (error) {
          console.error("Error fetching permanent avoidance areas:", error);
          // Continue with just the approved areas we already have
        }
        
        // Create avoidance polygons from all areas
        const avoidancePolygons = allAvoidanceAreas.map((area) => {
          // Extract polygon coordinates in the right format
          const polygonCoords = area.points
            .sort((a, b) => a.order - b.order)
            .map((point) => [point.longitude, point.latitude]);
          
          // Close the polygon by adding the first point at the end if needed
          if (
            polygonCoords.length > 0 &&
            (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
              polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1])
          ) {
            polygonCoords.push(polygonCoords[0]);
          }
          
          return polygonCoords;
        });

        // Add avoidance areas to request options
        directionsBody.options = {
          avoid_polygons: {
            type: "MultiPolygon",
            coordinates: avoidancePolygons.map(polygon => [polygon]),
          },
        };
      }

      // Call the routing API to get the new route
      const directionsResponse = await fetch("/api/v1/routing/directions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(directionsBody),
      });

      if (!directionsResponse.ok) {
        const errorData = await directionsResponse.json();
        console.error("Directions API error:", errorData);
        throw new Error(`Error getting directions: ${directionsResponse.statusText}`);
      }

      const directionsData = await directionsResponse.json();
      const newRouteGeometry = directionsData.routes[0].geometry;
      const extras = directionsData.routes[0].extras;

      // Update the route plan with the new geometry and extras
      const updateResponse = await fetch(`/api/v1/route-plans/${routePlan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          route_geometry: newRouteGeometry,
          extras: extras,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error(`Error updating route plan: ${updateResponse.statusText}`);
      }

      // Update local state
      if (routePlan && routePlan.avoidance_areas) {
        const updatedAvoidanceAreas = routePlan.avoidance_areas.map((area) => {
          if (area.id === areaId) {
            return { ...area, status: "approved" };
          }
          return area;
        });
        
        // Check if all areas are now approved - if yes, update route status to "planned"
        const allAreasApproved = updatedAvoidanceAreas.every(
          (area) => area.status === "approved"
        );
        
        let updatedStatus = routePlan.status;
        
        // If current status is "on confirmation" and all areas are approved, change to "planned"
        if (allAreasApproved && routePlan.status === "on confirmation") {
          updatedStatus = "planned";
          
          // Update the status on the API
          try {
            const statusResponse = await fetch(
              `/api/v1/route-plans/${routePlan.id}/status`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: "planned" }),
              }
            );
            
            if (!statusResponse.ok) {
              console.error("Failed to update route status to planned");
            }
          } catch (statusError) {
            console.error("Error updating route status:", statusError);
          }
        }

        setRoutePlan({
          ...routePlan,
          avoidance_areas: updatedAvoidanceAreas,
          route_geometry: newRouteGeometry,
          extras: extras,
          status: updatedStatus
        });

        // Update route on map
        const latLngs = getLatLngsForMap(newRouteGeometry) as [number, number][];
        setRouteLatLngs(latLngs);

        // Process waytype segments
        setSegments([]);
        if (extras && extras.waytype && extras.waytype.values) {
          const waytypes = extras.waytype.values;
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
        setTollways([]);
        if (extras && extras.tollways && extras.tollways.values) {
          const tollwayValues = extras.tollways.values;
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

        // Update impassibleMarkers
        const updatedImpassibleMarkers = impassibleMarkers.map(
          (markerGroup) => {
            // Periksa apakah ini adalah grup marker yang sesuai dengan areaId
            if (markerGroup.length > 0) {
              const idParts = markerGroup[0].id.split("-");
              if (idParts.length >= 2 && parseInt(idParts[1]) === areaId) {
                // Tambahkan status ke semua marker dalam grup
                return markerGroup.map((marker) => ({
                  ...marker,
                  status: "approved",
                }));
              }
            }
            return markerGroup;
          }
        );
        setImpassibleMarkers(updatedImpassibleMarkers);
        
        // Show different message if status was changed
        if (allAreasApproved && routePlan.status === "on confirmation") {
          alert("Semua area telah disetujui. Status rute diubah menjadi 'Direncanakan'.");
        } else {
          alert("Area berhasil disetujui dan rute telah diperbarui");
        }
      }
    } catch (err) {
      console.error("Error approving avoidance area:", err);
      alert("Gagal menyetujui area. Silakan coba lagi.");
    } finally {
      setIsProcessingAvoidanceArea(false);
    }
  };

  // Handle avoidance area rejection (delete)
  const handleRejectAvoidanceArea = async (areaId: number) => {
    if (!routePlan) return;
    setIsProcessingAvoidanceArea(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      // First, check if the area being deleted was already approved
      const areaToDelete = routePlan.avoidance_areas.find(area => area.id === areaId);
      const wasApproved = areaToDelete && areaToDelete.status === "approved";

      // Delete the avoidance area
      const response = await fetch(`/api/v1/route-plans/avoidance/${areaId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Error deleting avoidance area: ${response.statusText}`
        );
      }

      // Update local state
      let updatedAvoidanceAreas: AvoidanceArea[] = [];
      if (routePlan && routePlan.avoidance_areas) {
        updatedAvoidanceAreas = routePlan.avoidance_areas.filter(
          (area) => area.id !== areaId
        );
      }

      // If the deleted area was approved, we need to recalculate the route
      if (wasApproved) {
        // Get the remaining approved areas
        const remainingApprovedAreas = updatedAvoidanceAreas.filter(
          (area) => area.status === "approved"
        );

        // Create coordinates for API call
        const coordinates = routePlan.waypoints
          .sort((a, b) => a.order - b.order)
          .map((waypoint) => [waypoint.longitude, waypoint.latitude]);

        // Prepare the request body for the directions API
        const directionsBody: any = {
          coordinates: coordinates,
          extra_info: [
            "suitability",
            "surface",
            "waycategory",
            "waytype",
            "tollways",
          ],
          geometry_simplify: "false",
          elevation: true,
          instructions_format: "html",
          language: "id",
        };

        // Add remaining avoidance areas if any
        if (remainingApprovedAreas.length > 0) {
          // Also fetch all permanent avoidance areas from the system
          let allAvoidanceAreas = [...remainingApprovedAreas];
          
          try {
            const permanentResponse = await fetch(`/api/v1/route-plans/avoidance/permanent`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            
            if (permanentResponse.ok) {
              const permanentResult = await permanentResponse.json();
              if (permanentResult.data && Array.isArray(permanentResult.data)) {
                // Add permanent areas that aren't already in our approved areas list
                const existingAreaIds = new Set(remainingApprovedAreas.map(area => area.id));
                const additionalPermanentAreas = permanentResult.data.filter((area : any) => !existingAreaIds.has(area.id));
                allAvoidanceAreas = [...allAvoidanceAreas, ...additionalPermanentAreas];
                console.log("Including additional permanent areas:", additionalPermanentAreas.length);
              }
            }
          } catch (error) {
            console.error("Error fetching permanent avoidance areas:", error);
          }

          // Create avoidance polygons from all areas
          const avoidancePolygons = allAvoidanceAreas.map((area) => {
            // Extract polygon coordinates in the right format
            const polygonCoords = area.points
              .sort((a, b) => a.order - b.order)
              .map((point) => [point.longitude, point.latitude]);
            
            // Close the polygon by adding the first point at the end if needed
            if (
              polygonCoords.length > 0 &&
              (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
                polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1])
            ) {
              polygonCoords.push(polygonCoords[0]);
            }
            
            return polygonCoords;
          });

          // Add avoidance areas to request options
          directionsBody.options = {
            avoid_polygons: {
              type: "MultiPolygon",
              coordinates: avoidancePolygons.map(polygon => [polygon]),
            },
          };
        }

        // Call the routing API to get the new route
        const directionsResponse = await fetch("/api/v1/routing/directions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(directionsBody),
        });

        if (!directionsResponse.ok) {
          const errorData = await directionsResponse.json();
          console.error("Directions API error:", errorData);
          throw new Error(`Error getting directions: ${directionsResponse.statusText}`);
        }

        const directionsData = await directionsResponse.json();
        const newRouteGeometry = directionsData.routes[0].geometry;
        const extras = directionsData.routes[0].extras;

        // Update the route plan with the new geometry and extras
        const updateResponse = await fetch(`/api/v1/route-plans/${routePlan.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            route_geometry: newRouteGeometry,
            extras: extras,
          }),
        });

        if (!updateResponse.ok) {
          throw new Error(`Error updating route plan: ${updateResponse.statusText}`);
        }

        // Also update local state with the new route information
        setRoutePlan({
          ...routePlan,
          avoidance_areas: updatedAvoidanceAreas,
          route_geometry: newRouteGeometry,
          extras: extras
        });

        // Update map display
        const latLngs = getLatLngsForMap(newRouteGeometry) as [number, number][];
        setRouteLatLngs(latLngs);

        // Process waytype segments
        setSegments([]);
        if (extras && extras.waytype && extras.waytype.values) {
          const waytypes = extras.waytype.values;
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
        setTollways([]);
        if (extras && extras.tollways && extras.tollways.values) {
          const tollwayValues = extras.tollways.values;
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

        alert("Area berhasil dihapus dan rute telah diperbarui");
      } else {
        // If the area wasn't approved, just update the local state
        setRoutePlan({
          ...routePlan,
          avoidance_areas: updatedAvoidanceAreas,
        });

        // Also remove from impassibleMarkers
        const updatedImpassibleMarkers = impassibleMarkers.filter(
          (markerGroup) => {
            if (markerGroup.length > 0) {
              const idParts = markerGroup[0].id.split("-");
              if (idParts.length >= 2) {
                return parseInt(idParts[1]) !== areaId;
              }
            }
            return true;
          }
        );
        setImpassibleMarkers(updatedImpassibleMarkers);

        alert("Area berhasil dihapus");
      }
    } catch (err) {
      console.error("Error deleting avoidance area:", err);
      alert("Gagal menghapus area. Silakan coba lagi.");
    } finally {
      setIsProcessingAvoidanceArea(false);
    }
  };

  // Handle route plan deletion
  const handleDeleteRoutePlan = async () => {
    if (!routePlan) return;
    
    // Confirm first
    if (!confirm(`Apakah Anda yakin ingin menghapus rute #${routePlan.id}?\nTindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setIsDeletingRoutePlan(true);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/v1/route-plans/${routePlan.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error deleting route plan: ${response.statusText}`);
      }

      alert("Rute berhasil dihapus");
      router.push("/planner/route-history");
    } catch (err) {
      console.error("Error deleting route plan:", err);
      alert("Gagal menghapus rute. Silakan coba lagi.");
      setIsDeletingRoutePlan(false);
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
              {routePlan.status === "on confirmation" && (
                <div className="ml-2 px-3 py-1 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md text-sm animate-pulse">
                  Silakan konfirmasi area yang tidak bisa dilalui
                </div>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => handleDeleteRoutePlan()}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        >
          <i className="bx bx-trash"></i>
          Hapus Rute
        </button>
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
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
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
                        <h3 className="font-medium text-gray-800 cursor-pointer">
                          Area {index + 1}
                        </h3>
                        <div className="flex items-center gap-2">
                          {area.is_permanent && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                              Permanen
                            </span>
                          )}
                          {area.status && requesterRoles[area.requester_id as any] !== "planner" && (
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
                          <button
                            className="ml-1 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation(); // Mencegah event propagation ke parent
                              if (
                                confirm(
                                  `Apakah Anda yakin ingin menghapus Area ${
                                    index + 1
                                  }?`
                                )
                              ) {
                                handleRejectAvoidanceArea(area.id);
                              }
                            }}
                            title="Hapus area ini"
                          >
                            <i className="bx bx-trash"></i>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {area.reason}
                      </p>
                      {area.requester_id && (
                        <p className="text-xs text-gray-500 mb-1">
                          Oleh:{" "}
                          {requesterNames[area.requester_id] ||
                            `Pengguna ${area.requester_id}`}
                        </p>
                      )}
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
              requesterNames={requesterNames}
              requesterRoles={requesterRoles}
              userRole={user?.role || ""}
              isPlanner={user?.role === "planner"}
              routeStatus={routePlan.status}
              onAvoidanceAreaConfirm={handleApproveAvoidanceArea}
              onAvoidanceAreaReject={handleRejectAvoidanceArea}
            />
          </div>
        </div>
      </div>
      {isProcessingAvoidanceArea && (
        <div className="fixed inset-0 bg-gray-50 opacity-90 z-[9999] flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mb-6"></div>
            <p className="text-xl font-semibold text-gray-800">
              Menghapus Avoidance Area...
            </p>
            <p className="text-sm text-gray-500 mt-2">Mohon tunggu sebentar</p>
          </div>
        </div>
      )}
      
      {isDeletingRoutePlan && (
        <div className="fixed inset-0 bg-gray-50 opacity-90 z-[9999] flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 border-4 border-t-red-500 border-red-200 rounded-full animate-spin mb-6"></div>
            <p className="text-xl font-semibold text-gray-800">
              Menghapus Rute...
            </p>
            <p className="text-sm text-gray-500 mt-2">Mohon tunggu sebentar</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteHistoryPage;
