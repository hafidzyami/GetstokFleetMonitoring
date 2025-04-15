"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LatLngTuple } from "leaflet";
import { getLatLngsForMap } from "@/app/utils/polylineDecoder";
import ElevationProfile from "@/app/_components/ElevationProfile";
import L from "leaflet";

// Import search-related dependencies directly to ensure they're available
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import "leaflet-geosearch/dist/geosearch.css"; // Make sure to include the CSS

interface Marker {
  id: string;
  position: LatLngTuple;
  address?: string;
}

const BuatRutePage = () => {
  const router = useRouter();

  // Map component with dynamic import to avoid SSR issues
  const Map = useMemo(
    () =>
      dynamic(() => import("@/app/_components/Map"), {
        loading: () => <p>Memuat peta...</p>,
        ssr: false,
      }),
    []
  );

  // States for map and routing
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
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Form states
  const [driver, setDriver] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [destinations, setDestinations] = useState<string[]>([""]);
  const [searchResultCallback, setSearchResultCallback] = useState<
    ((latlng: LatLngTuple, address: string) => void) | null
  >(null);

  // Reason impassible route
  const [avoidanceReason, setAvoidanceReason] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [avoidancePhoto, setAvoidancePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAvoidancePhoto(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPhotoPreview(dataUrl);
        
        // Simpan ke localStorage (hati-hati dengan ukuran!)
        try {
          localStorage.setItem(`avoidance-photo-${Date.now()}`, dataUrl);
        } catch (e) {
          console.error('Error saving to localStorage, likely size exceeded:', e);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle location request
  const requestUserLocation = () => {
    setIsLocationLoading(true);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCenter([latitude, longitude]);
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 15);
          }
          setIsLocationLoading(false);
        },
        (error) => {
          setIsLocationLoading(false);
          let errorMessage = "";
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
          alert("Location Error: " + errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      const errorMessage = "Geolocation is not supported by this browser";
      setIsLocationLoading(false);
      alert("Location Error: " + errorMessage);
    }
  };

  useEffect(() => {
    requestUserLocation();
  }, []);

  // Elevation profile hover handler
  const handleProfileHover = (point: { lat: number; lng: number } | null) => {
    if (mapRef.current) {
      if (hoverMarkerRef.current) {
        hoverMarkerRef.current.remove();
        hoverMarkerRef.current = null;
      }

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
          zIndexOffset: 1000,
        }).addTo(mapRef.current);
      }
    }
  };

  // Handle address search
  const handleAddMarkerFromSearch = (latlng: LatLngTuple, address?: string) => {
    // Add the marker to the map
    const newMarker = {
      id: `${Date.now()}-${markers.length}`,
      position: latlng,
      address: address,
    };
    setMarkers((prev) => [...prev, newMarker]);

    // If there's a callback waiting for search results, call it
    if (searchResultCallback) {
      searchResultCallback(
        latlng,
        address || `${latlng[0].toFixed(6)}, ${latlng[1].toFixed(6)}`
      );
      setSearchResultCallback(null);
    }
  };

  // Reference to our custom SearchField component
  const CustomSearchField = ({
    onAddMarker,
  }: {
    onAddMarker: (latlng: LatLngTuple, address?: string) => void;
  }) => {
    const map = mapRef.current;

    useEffect(() => {
      if (!map) return;

      // This sets up the search control on the map
      const provider = new OpenStreetMapProvider();

      // @ts-expect-error - typing issue with leaflet-geosearch
      const searchControl = new GeoSearchControl({
        provider: provider,
        style: "bar",
        autoComplete: true,
        autoCompleteDelay: 250,
        showMarker: false,
        searchLabel: "Cari lokasi atau masukkan koordinat",
        keepResult: true,
      });

      map.addControl(searchControl);

      // Handle location found event
      const handleShowLocation = (e: any) => {
        console.log("Location found:", e.location);
        const latlng: LatLngTuple = [e.location.y, e.location.x];
        const address = e.location.label || null;
        onAddMarker(latlng, address);
      };

      // Add event listener
      map.on("geosearch/showlocation", handleShowLocation);

      // Add this event listener to focus on input element inside the search control
      const searchContainer = document.querySelector(
        ".leaflet-control-geosearch.leaflet-geosearch-bar"
      );
      if (searchContainer) {
        const searchInput = searchContainer.querySelector("input");
        if (searchInput) {
          (searchInput as HTMLElement).classList.add("search-field-input");
        }
      }

      return () => {
        map.off("geosearch/showlocation", handleShowLocation);
        map.removeControl(searchControl);
      };
    }, [map, onAddMarker]);

    return null;
  };

  // API call for directions
  const callApiForDirections = async () => {
    setSegments([]);
    setTollways([]);

    if (markers.length < 2) {
      alert("Silakan tambahkan minimal dua titik tujuan pada peta");
      return;
    }

    setIsLoadingRoute(true);

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
      const impassibleCoordinates = listOfImpassibleMarkers.flatMap((group) => {
        // Check if we're dealing with the new format or old format
        const markers = group.markers || group;
        return markers.map((marker) => [marker.position[1], marker.position[0]]);
      });
  
      if (impassibleCoordinates.length >= 3) {
        body.options = {
          avoid_polygons: {
            type: "Polygon",
            coordinates: [[...impassibleCoordinates, impassibleCoordinates[0]]],
          },
        };
      }
    }

    try {
      const response = await fetch("/api/v1/routing/directions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const message = await response.json();
        console.error(message);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRouteGeometry(data.routes[0].geometry);
      const latLngs = getLatLngsForMap(data.routes[0].geometry);

      // Process waytypes for segments
      const waytypes = data.routes[0].extras.waytype.values;
      for (const waytype of waytypes) {
        const startIdx = waytype[0];
        const endIdx = waytype[1];
        const typeValue = waytype[2];
        const segment = latLngs.slice(startIdx, endIdx + 1);
        setSegments((prev: any) => [...prev, { segment, typeValue }]);
      }

      // Process tollways
      const tollwayss = data.routes[0].extras.tollways.values;
      for (const tollway of tollwayss) {
        const startIdx = tollway[0];
        const endIdx = tollway[1];
        const tollwayValue = tollway[2];
        const segment = latLngs.slice(startIdx, endIdx + 1);
        setTollways((prev: any) => [...prev, { segment, tollwayValue }]);
      }

      // Extract surface type information
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
    } catch (error) {
      console.error("Error fetching directions:", error);
      alert("Gagal mendapatkan rute. Silakan coba lagi.");
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Marker management
  const addMarker = (latlng: LatLngTuple) => {
    const newMarker = {
      id: `${Date.now()}-${markers.length}`,
      position: latlng,
    };

    setMarkers((prev) => [...prev, newMarker]);

    // If we have destinations but not enough markers, update the corresponding destination
    if (destinations.length > markers.length) {
      // Update the first empty destination with coordinates
      for (let i = 0; i < destinations.length; i++) {
        if (!destinations[i]) {
          const newDestinations = [...destinations];
          newDestinations[i] = `${latlng[0].toFixed(6)}, ${latlng[1].toFixed(
            6
          )}`;
          setDestinations(newDestinations);
          break;
        }
      }
    }
  };

  const handleMapRightClick = (latlng: LatLngTuple) => {
    if (flagImpassible) {
      setImpassibleMarkers((prev) => [
        ...prev,
        { id: `${Date.now()}-${impassibleMarkers.length}`, position: latlng },
      ]);
    } else {
      addMarker(latlng);
    }
  };

  const removeMarker = (id: string) => {
    const index = markers.findIndex((marker) => marker.id === id);

    setMarkers((prev) => {
      const updatedMarkers = prev.filter((marker) => marker.id !== id);
      return updatedMarkers.map((marker, i) => ({
        ...marker,
        id: `${Date.now()}-${i}`,
      }));
    });

    // Also remove the corresponding destination if it exists
    if (index !== -1 && index < destinations.length) {
      const newDestinations = [...destinations];
      newDestinations[index] = "";
      setDestinations(newDestinations);
    }
  };

  const removeImpassibleMarker = (id: string) => {
    setImpassibleMarkers((prev) => {
      const updatedMarkers = prev.filter((marker) => marker.id !== id);
      return updatedMarkers.map((marker, index) => ({
        ...marker,
        id: `${Date.now()}-${index}`,
      }));
    });
  };

  // Remove an entire impassible polygon
  const removeImpassiblePolygon = (index: number) => {
    setListOfImpassibleMarkers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMarkerPosition = (id: string, newPosition: LatLngTuple) => {
    setMarkers((prev) =>
      prev.map((marker) => {
        if (marker.id === id) {
          // Find index of this marker
          const index = prev.findIndex((m) => m.id === id);

          // Update corresponding destination with new coordinates
          if (index !== -1 && index < destinations.length) {
            const newDestinations = [...destinations];
            newDestinations[index] = `${newPosition[0].toFixed(
              6
            )}, ${newPosition[1].toFixed(6)}`;
            setDestinations(newDestinations);
          }

          return { ...marker, position: newPosition };
        }
        return marker;
      })
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

  const updateListOfImpassibleMarkers = (id: string, newPosition: LatLngTuple) => {
    setListOfImpassibleMarkers((prev) =>
      prev.map((group) => {
        // Check if we're dealing with the new format or old format
        if (group.markers) {
          return {
            ...group,
            markers: group.markers.map((marker) =>
              marker.id === id ? { ...marker, position: newPosition } : marker
            )
          };
        } else {
          return group.map((marker) =>
            marker.id === id ? { ...marker, position: newPosition } : marker
          );
        }
      })
    );
  };

  const handleDone = () => {
    if (impassibleMarkers.length < 3) {
      alert("Silakan tandai minimal 3 titik untuk membuat area yang dihindari");
      return;
    }

    if (!avoidanceReason) {
      alert("Mohon isi alasan mengapa area ini dihindari");
      return;
    }

    const avoidanceInfo = {
      markers: [...impassibleMarkers],
      reason: avoidanceReason,
      isPermanent: isPermanent,
      photo: avoidancePhoto ? avoidancePhoto.name : null,
      photoData: photoPreview,
      timestamp: new Date().toISOString(),
    };

    // Add to the list of impassible markers with the additional info
    setListOfImpassibleMarkers((prev) => [...prev, avoidanceInfo]);

    // Reset form
    setImpassibleMarkers([]);
    setAvoidanceReason("");
    setIsPermanent(false);
    setAvoidancePhoto(null);
    setPhotoPreview(null);
    setFlagImpassible(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    setImpassibleMarkers([]);
    setAvoidanceReason("");
    setIsPermanent(false);
    setAvoidancePhoto(null);
    setFlagImpassible(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle destination fields
  const addDestination = () => {
    setDestinations([...destinations, ""]);
  };

  const updateDestination = (index: number, value: string) => {
    const newDestinations = [...destinations];
    newDestinations[index] = value;
    setDestinations(newDestinations);
  };

  const removeDestination = (index: number) => {
    if (destinations.length > 1) {
      const newDestinations = [...destinations];
      newDestinations.splice(index, 1);
      setDestinations(newDestinations);

      // Also remove the corresponding marker if it exists
      if (index < markers.length) {
        const markerToRemove = markers[index];
        removeMarker(markerToRemove.id);
      }
    }
  };

  // Focus the search control and set up callback for this input
  const startAddressSearch = (index: number) => {
    if (!mapRef.current) return;

    // Set up callback for when search result is selected
    setSearchResultCallback((latlng: LatLngTuple, address: string) => {
      const newDestinations = [...destinations];
      newDestinations[index] = address;
      setDestinations(newDestinations);
    });

    // Focus and clear the search input
    const searchBar = document.querySelector(".leaflet-control-geosearch form");
    const searchInput = document.querySelector(
      ".leaflet-control-geosearch form input"
    );

    if (searchBar && searchInput) {
      // Make search bar visible by triggering the click event
      (searchBar as HTMLElement).classList.add("open");
      (searchInput as HTMLInputElement).focus();
      (searchInput as HTMLInputElement).value = destinations[index] || "";

      // Optional: Select all text in the input
      (searchInput as HTMLInputElement).select();
    }
  };

  // Handle form submission
  const handleGenerate = () => {
    if (!driver) {
      alert("Silakan pilih nama supir terlebih dahulu");
      return;
    }

    if (!vehiclePlate) {
      alert("Silakan pilih plat nomor kendaraan terlebih dahulu");
      return;
    }

    if (markers.length < 2) {
      alert("Silakan tandai minimal 2 titik di peta");
      return;
    }

    router.push("/planner/buat-rute/1");
  };

  // Append search control style to document head
  useEffect(() => {
    // Add custom CSS to make the search control more visible
    const style = document.createElement("style");
    style.textContent = `
      .leaflet-control-geosearch.leaflet-geosearch-bar {
        display: block;
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        width: 80%;
        max-width: 600px;
        z-index: 1000;
      }
      
      .leaflet-control-geosearch form input {
        width: 100%;
        padding: 10px 15px;
        border-radius: 8px !important;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
        font-size: 16px !important;
      }
      
      .leaflet-control-geosearch form {
        background: white;
        border-radius: 8px;
      }
      
      .leaflet-control-geosearch form.open {
        display: block !important;
        width: 100%;
      }
      
      .leaflet-control-geosearch.active form {
        display: block !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="h-full px-8 overflow-y-auto">
        {/* Driver selection */}
        <div className="flex flex-col gap-1 w-full text-[#545454] mb-4">
          <div className="flex gap-1 text-sm items-center font-semibold">
            <p>Supir</p>
          </div>
          <select
            className="text-sm px-6 py-4 border-[2px] border-[#F1F1F1] rounded-[8px]"
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
          >
            <option value="">Pilih nama Supir Mobil Anda di sini</option>
            <option value="Sucipto Adi Nugroho Wahyudin">
              Sucipto Adi Nugroho Wahyudin
            </option>
            <option value="Kartono Sucipto">Kartono Sucipto</option>
            <option value="andi Bahras">andi Bahras</option>
          </select>
        </div>

        {/* Vehicle plate selection */}
        <div className="flex flex-col gap-1 w-full text-[#545454] mb-4">
          <div className="flex gap-1 text-sm items-center font-semibold">
            <p>Plat Nomor Kendaraan</p>
          </div>
          <select
            className="text-sm px-6 py-4 border-[2px] border-[#F1F1F1] rounded-[8px]"
            value={vehiclePlate}
            onChange={(e) => setVehiclePlate(e.target.value)}
          >
            <option value="">Pilih Plat Nomor Kendaraan Anda di sini</option>
            <option value="B1234 SUV">B1234 SUV</option>
            <option value="B 3832 USY">B 3832 USY</option>
            <option value="B 0239 IIA">B 0239 IIA</option>
            <option value="B 2812 KUS">B 2812 KUS</option>
          </select>
        </div>

        {/* Map container */}
        <div className="w-full h-[480px] mb-4 rounded-lg overflow-hidden border-2 border-[#F1F1F1] relative">
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
          >
            {/* Custom SearchField component */}
            {mapRef.current && (
              <CustomSearchField onAddMarker={handleAddMarkerFromSearch} />
            )}
          </Map>
        </div>

        {/* Elevation profile */}
        {routeGeometry && (
          <div className="bg-white w-full mb-4 border-2 border-[#F1F1F1] rounded-lg p-2">
            <ElevationProfile
              geometry={routeGeometry}
              surfaceTypes={surfaceTypes}
              onHover={handleProfileHover}
            />
          </div>
        )}

        {/* Map controls */}
        <div className="flex justify-between gap-4 mb-4">
          <button
            onClick={requestUserLocation}
            disabled={isLocationLoading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg shadow-lg flex items-center transition-all duration-300"
            type="button"
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
                <span>Gunakan Lokasi Saya</span>
              </>
            )}
          </button>

          <div className="flex gap-2">
            <button
              onClick={callApiForDirections}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg"
              type="button"
            >
              Buat Rute
            </button>

            {flagImpassible ? (
              <>
                <button
                  onClick={handleDone}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg"
                  type="button"
                >
                  Selesai
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg"
                  type="button"
                >
                  Batal
                </button>
              </>
            ) : (
              <button
                onClick={() => setFlagImpassible(true)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg"
                type="button"
              >
                Area Dihindari
              </button>
            )}
          </div>
        </div>

        {/* List of markers and impassible areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* List of destination markers */}
          <div className="bg-white p-4 rounded-lg border-2 border-[#F1F1F1]">
            <h2 className="font-bold text-[#545454] mb-2">Daftar Tujuan:</h2>
            {markers.length === 0 ? (
              <div className="text-gray-500 italic text-sm">
                Belum ada tujuan yang ditandai
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                <ul className="space-y-2">
                  {markers.map((marker, index) => (
                    <li
                      key={marker.id}
                      className="flex justify-between items-center py-2 border-b border-gray-100"
                    >
                      <div className="text-sm">
                        <span className="font-medium">Titik {index}: </span>
                        <span className="text-gray-600">
                          {marker.address ||
                            `${marker.position[0].toFixed(
                              4
                            )}, ${marker.position[1].toFixed(4)}`}
                        </span>
                      </div>
                      <button
                        onClick={() => removeMarker(marker.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        type="button"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* List of impassible markers and polygons */}
          <div className="bg-white p-4 rounded-lg border-2 border-[#F1F1F1]">
            <h2 className="font-bold text-[#545454] mb-2">
              Area Yang Dihindari:
            </h2>

            {/* Current impassible markers (being drawn) */}
            {flagImpassible && impassibleMarkers.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm text-gray-700 mb-1">
                  Area Sedang Dibuat:
                </h3>
                <div className="max-h-40 overflow-y-auto">
                  <ul className="space-y-1">
                    {impassibleMarkers.map((marker, index) => (
                      <li
                        key={marker.id}
                        className="flex justify-between items-center text-sm py-1 border-b border-gray-100"
                      >
                        <span>
                          Titik {index + 1}: {marker.position[0].toFixed(4)},{" "}
                          {marker.position[1].toFixed(4)}
                        </span>
                        <button
                          onClick={() => removeImpassibleMarker(marker.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          type="button"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {flagImpassible && (
              <div className="mb-4 mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="font-semibold text-sm text-gray-700 mb-3">
                  Informasi Area yang Dihindari:
                </h3>

                {/* Reason input */}
                <div className="mb-3">
                  <label
                    htmlFor="avoidanceReason"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Alasan Dihindari <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="avoidanceReason"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    placeholder="Contoh: Jalan rusak, banjir, dll."
                    value={avoidanceReason}
                    onChange={(e) => setAvoidanceReason(e.target.value)}
                    required
                  />
                </div>

                {/* Permanent checkbox */}
                <div className="mb-3">
                  <div className="flex items-center">
                    <input
                      id="isPermanent"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={isPermanent}
                      onChange={(e) => setIsPermanent(e.target.checked)}
                    />
                    <label
                      htmlFor="isPermanent"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Apakah hambatan ini permanen?
                    </label>
                  </div>
                </div>

                {/* Photo upload */}
                <div className="mb-2">
                  <label
                    htmlFor="avoidancePhoto"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Bukti Foto (opsional)
                  </label>
                  <input
                    type="file"
                    id="avoidancePhoto"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
                  />
                  {avoidancePhoto && (
                    <p className="mt-1 text-xs text-gray-500">
                      File dipilih: {avoidancePhoto.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Saved impassible polygons */}
            {listOfImpassibleMarkers.length === 0 && !flagImpassible ? (
              <div className="text-gray-500 italic text-sm">
                Belum ada area yang dihindari
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {listOfImpassibleMarkers.map((polygon, polygonIndex) => (
                  <div
                    key={polygonIndex}
                    className="mb-3 pb-2 border-b border-gray-200"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-semibold text-sm">
                        Area {polygonIndex + 1}
                      </h3>
                      <button
                        onClick={() => removeImpassiblePolygon(polygonIndex)}
                        className="text-red-500 hover:text-red-700 p-1"
                        type="button"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="text-xs ml-1 mb-1">
                      <div className="text-gray-700 font-medium">
                        {polygon.reason ? `Alasan: ${polygon.reason}` : ""}
                      </div>
                      <div className="text-gray-500 flex items-center gap-1">
                        <span>
                          {polygon.markers
                            ? polygon.markers.length
                            : polygon.length}{" "}
                          titik
                        </span>
                        {polygon.isPermanent && (
                          <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">
                            Permanen
                          </span>
                        )}
                        {polygon.photo && (
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                            Dengan Foto
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          className="w-full text-sm px-6 py-4 border-[2px] bg-[#009EFF] text-white rounded-[8px] flex items-center justify-center gap-2 font-semibold mt-4 mb-8"
          type="button"
        >
          Generate
        </button>
      </div>
      {isLoadingRoute && (
        <div className="fixed inset-0 bg-gray-50 opacity-90 z-[9999] flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mb-6"></div>
            <p className="text-xl font-semibold text-gray-800">
              Membuat Rute...
            </p>
            <p className="text-sm text-gray-500 mt-2">Mohon tunggu sebentar</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuatRutePage;
