"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { LatLngTuple } from "leaflet";
import { getLatLngsForMap } from "@/app/utils/polylineDecoder";
import ElevationProfile from "@/app/_components/ElevationProfile";
import L from "leaflet";

interface Marker {
  id: string;
  position: LatLngTuple;
}

export default function Page() {
  const Map = useMemo(
    () =>
      dynamic(() => import("@/app/_components/Map"), {
        loading: () => <p>A map is loading</p>,
        ssr: false,
      }),
    []
  );

  const [markers, setMarkers] = useState<Marker[]>([]);
  const [segments, setSegments] = useState<any>([]);
  const [tollways, setTollways] = useState<any>([]);
  const [impassibleMarkers, setImpassibleMarkers] = useState<Marker[]>([]);
  const [listOfImpassibleMarkers, setListOfImpassibleMarkers] = useState<
    Marker[][]
  >([]);
  const [center, setCenter] = useState<LatLngTuple>([-6.8904, 107.6102]);
  const [flagImpassible, setFlagImpassible] = useState<boolean>(false);
  const [routeGeometry, setRouteGeometry] = useState<string>("");
  const [surfaceTypes, setSurfaceTypes] = useState<string[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const hoverMarkerRef = useRef<L.Marker | null>(null);

  const [isLocationLoading, setIsLocationLoading] = useState(false);

  const requestUserLocation = () => {
    setIsLocationLoading(true);

    // Check if geolocation is available in the browser
    if ("geolocation" in navigator) {
      console.log("Requesting location permission...");

      navigator.geolocation.getCurrentPosition(
        // Success callback
        (position) => {
          const { latitude, longitude } = position.coords;
          // Update center state with user's coordinates
          setCenter([latitude, longitude]);
          setIsLocationLoading(false);
          console.log("User location set:", latitude, longitude);
        },
        // Error callback
        (error) => {
          setIsLocationLoading(false);

          let errorMessage = "";

          // Handle different error types
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Location permission denied. Please enable location access to use this feature.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
            default:
              errorMessage = "An unknown error occurred.";
          }

          // Show alert
          alert("Location Error: " + errorMessage);

          console.error("Error getting user location:", error.message);
        },
        // Options
        {
          enableHighAccuracy: true, // Request high accuracy
          timeout: 10000, // Time limit for request (10 seconds)
          maximumAge: 0, // Don't use cached position
        }
      );
    } else {
      const errorMessage = "Geolocation is not supported by this browser";
      setIsLocationLoading(false);
      alert("Location Error: " + errorMessage);
      console.log(errorMessage);
    }
  };

  useEffect(() => {
    requestUserLocation();
  }, []);

  // Tambahkan fungsi ini di dalam komponen Page
  const handleProfileHover = (point: { lat: number; lng: number } | null) => {
    if (mapRef.current) {
      // Hapus marker lama jika ada
      if (hoverMarkerRef.current) {
        hoverMarkerRef.current.remove();
        hoverMarkerRef.current = null;
      }

      // Buat marker baru jika ada point
      if (point) {
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

        hoverMarkerRef.current = L.marker([point.lat, point.lng], {
          icon: hoverIcon,
          zIndexOffset: 1000, // Pastikan marker ini tampil di atas marker lainnya
        }).addTo(mapRef.current);
      }
    }
  };

  const callApiForDirections = async () => {
    setSegments([]); // Reset the segments state to an empty array
    setTollways([]); // Reset the tollways state to avoid duplication

    const coordinates = markers.map((marker) => [
      marker.position[1],
      marker.position[0],
    ]);

    const body: any = {
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

    if (listOfImpassibleMarkers.length > 0) {
      // Flatten the listOfImpassibleMarkers to get all coordinates
      const impassibleCoordinates = listOfImpassibleMarkers.flatMap((group) =>
        group.map((marker) => [marker.position[1], marker.position[0]])
      );

      // Check if there are at least 3 coordinates to form a polygon
      if (impassibleCoordinates.length >= 3) {
        body.options = {
          avoid_polygons: {
            type: "Polygon",
            coordinates: [
              [
                ...impassibleCoordinates,
                impassibleCoordinates[0], // Closing the loop by adding the first point again
              ],
            ],
          },
        };
      }
    }

    try {
      const response = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-hgv/json",
        {
          method: "POST",
          headers: {
            Authorization: process.env.NEXT_PUBLIC_API_ORS || "", // Get the API key from the environment variables
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const message = await response.json();
        console.error(message);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Simpan geometri rute untuk digunakan oleh komponen profil elevasi
      setRouteGeometry(data.routes[0].geometry);

      // Gunakan decoder kustom untuk peta
      const latLngs = getLatLngsForMap(data.routes[0].geometry);

      // Proses waytypes untuk segmen
      const waytypes = data.routes[0].extras.waytypes.values;
      for (const waytype of waytypes) {
        const startIdx = waytype[0];
        const endIdx = waytype[1];
        const typeValue = waytype[2];
        const segment = latLngs.slice(startIdx, endIdx + 1);
        setSegments((prev: any) => [...prev, { segment, typeValue }]);
      }

      // Proses tollways
      const tollwayss = data.routes[0].extras.tollways.values;
      for (const tollway of tollwayss) {
        const startIdx = tollway[0];
        const endIdx = tollway[1];
        const tollwayValue = tollway[2];
        const segment = latLngs.slice(startIdx, endIdx + 1);
        setTollways((prev: any) => [...prev, { segment, tollwayValue }]);
      }

      // Ekstrak informasi surface type jika ada
      if (
        data.routes[0].extras.surface &&
        data.routes[0].extras.surface.values
      ) {
        const surfaces = data.routes[0].extras.surface.values;
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

        // Buat array dengan jenis permukaan untuk setiap titik
        const surfaceTypesArray = Array(latLngs.length).fill("Unknown");

        // Isi array berdasarkan segmen permukaan dari API
        for (const surface of surfaces) {
          const startIdx = surface[0];
          const endIdx = surface[1];
          const surfaceValue = surface[2];
          const surfaceType = surfaceMapping[surfaceValue] || "Unknown";

          // Isi semua titik dalam segmen dengan jenis permukaan yang sesuai
          for (let i = startIdx; i <= endIdx; i++) {
            if (i < surfaceTypesArray.length) {
              surfaceTypesArray[i] = surfaceType;
            }
          }
        }

        setSurfaceTypes(surfaceTypesArray);
      }
    } catch (error) {
      console.error("Error fetching directions:", error);
    }
  };

  const addMarker = (latlng: LatLngTuple) => {
    setMarkers((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, position: latlng },
    ]);
  };

  const handleMapRightClick = (latlng: LatLngTuple) => {
    if (flagImpassible) {
      setImpassibleMarkers((prev) => [
        ...prev,
        { id: `${Date.now()}-${impassibleMarkers.length}`, position: latlng },
      ]);
    } else {
      setMarkers((prev) => [
        ...prev,
        { id: `${Date.now()}-${prev.length}`, position: latlng },
      ]);
    }
  };

  const removeMarker = (id: string) => {
    setMarkers((prev) => {
      // Filter out the marker to be removed
      const updatedMarkers = prev.filter((marker) => marker.id !== id);
      // Reassign IDs to the remaining markers
      return updatedMarkers.map((marker, index) => ({
        ...marker,
        id: `${Date.now()}-${index}`, // Reassign ID based on the new index (as a string)
      }));
    });
  };

  const removeImpassibleMarker = (id: string) => {
    setImpassibleMarkers((prev) => {
      // Filter out the marker to be removed
      const updatedMarkers = prev.filter((marker) => marker.id !== id);
      // Reassign IDs to the remaining markers
      return updatedMarkers.map((marker, index) => ({
        ...marker,
        id: `${Date.now()}-${index}`, // Reassign ID based on the new index (as a string)
      }));
    });
  };

  const updateMarkerPosition = (id: string, newPosition: LatLngTuple) => {
    setMarkers((prev) =>
      prev.map((marker) =>
        marker.id === id ? { ...marker, position: newPosition } : marker
      )
    );
  };

  const updateImpassibleMarkerPosition = (
    id: string,
    newPosition: LatLngTuple
  ) => {
    setImpassibleMarkers((prev) =>
      prev.map((marker) =>
        marker.id === id ? { ...marker, position: newPosition } : marker
      )
    );
  };

  const updateListOfImpassibleMarkers = (
    id: string,
    newPosition: LatLngTuple
  ) => {
    setListOfImpassibleMarkers((prev) =>
      prev.map((group) =>
        group.map((marker) =>
          marker.id === id ? { ...marker, position: newPosition } : marker
        )
      )
    );
  };

  const handleDone = () => {
    // Store the impassible markers in the listOfImpassibleMarkers state
    setListOfImpassibleMarkers((prev) => [...prev, [...impassibleMarkers]]);
    console.log("Impassible Markers Stored:", [...impassibleMarkers]);
    setImpassibleMarkers([]); // Reset impassible markers to an empty array
    setFlagImpassible(false); // Exit impassible mode
  };

  const handleCancel = () => {
    setFlagImpassible(false); // Exit impassible mode
  };

  useEffect(() => {
    console.log("Polyline Coordinates Updated:", segments);
  }, [segments]);

  return (
    <>
      <div className="bg-white-700 mx-auto w-[98%] h-[640px]">
        <Map
          center={center}
          markers={markers}
          impassableMarkers={impassibleMarkers}
          listOfImpassibleMarkers={listOfImpassibleMarkers}
          onMapRightClick={handleMapRightClick}
          onAddMarker={addMarker}
          onUpdateMarkerPosition={updateMarkerPosition}
          onUpdateImpassibleMarkerPosition={updateImpassibleMarkerPosition}
          onUpdateListOfImpassibleMarkers={updateListOfImpassibleMarkers}
          onMapRef={(map) => (mapRef.current = map)}
          segments={segments}
          tollways={tollways}
        />
      </div>

      {/* Fixed position button at bottom right */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={requestUserLocation}
          disabled={isLocationLoading}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full shadow-lg flex items-center transition-all duration-300"
        >
          {isLocationLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Loading...</span>
            </>
          ) : center[0] !== -6.8904 && center[1] !== 107.6102 ? (
            <>
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Location Set</span>
            </>
          ) : (
            <>
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Use My Location</span>
            </>
          )}
        </button>
      </div>
      <div className="mt-5"></div>
      {routeGeometry && (
        <div className="bg-white mx-auto w-[98%] mt-4">
          <ElevationProfile
            geometry={routeGeometry}
            surfaceTypes={surfaceTypes}
            onHover={handleProfileHover}
          />
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div style={{ flex: 1, marginRight: "10px" }}>
          <h2>List of Destination:</h2>
          <ul>
            {markers.map((marker) => (
              <li key={marker.id}>
                {marker.id.split("-")[1]}. Latitude: {marker.position[0]},
                Longitude: {marker.position[1]}
                <button
                  onClick={() => removeMarker(marker.id)}
                  style={{ marginLeft: "10px" }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={callApiForDirections}
            style={{
              margin: "10px",
              padding: "10px",
              backgroundColor: "blue",
              color: "white",
              border: "none",
              borderRadius: "5px",
            }}
          >
            Get Directions
          </button>
        </div>

        <div style={{ flex: 1, marginLeft: "10px" }}>
          <h2>List of Impassible Markers:</h2>
          <ul>
            {impassibleMarkers.map((marker) => (
              <li key={marker.id}>
                {marker.id.split("-")[1]}. Latitude: {marker.position[0]},
                Longitude: {marker.position[1]}
                <button
                  onClick={() => removeImpassibleMarker(marker.id)}
                  style={{ marginLeft: "10px" }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {flagImpassible ? (
            <>
              <button
                onClick={handleDone}
                style={{
                  margin: "10px",
                  padding: "10px",
                  backgroundColor: "green",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                }}
              >
                Done
              </button>
              <button
                onClick={handleCancel}
                style={{
                  margin: "10px",
                  padding: "10px",
                  backgroundColor: "red",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setFlagImpassible(true)}
              style={{
                margin: "10px",
                padding: "10px",
                backgroundColor: "blue",
                color: "white",
                border: "none",
                borderRadius: "5px",
              }}
            >
              Set Impassible Markers
            </button>
          )}
        </div>

        <div style={{ flex: 1, marginLeft: "10px" }}>
          <h2>List of Impassible Polygons</h2>
          <ul>
            {listOfImpassibleMarkers.map((markers, index) => (
              <li key={index}>
                <h3>Impassible Polygon {index + 1}</h3>
                <ul>
                  {markers.map((marker) => (
                    <li key={marker.id}>
                      {marker.id.split("-")[1]}. Latitude: {marker.position[0]},
                      Longitude: {marker.position[1]}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
