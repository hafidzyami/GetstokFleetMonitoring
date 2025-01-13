"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { LatLngTuple } from "leaflet";
import { Polyline } from "react-leaflet";
import polyline from "@mapbox/polyline";

interface Marker {
  id: number;
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
  const [center, setCenter] = useState<LatLngTuple>([-6.8904, 107.6102]);
  const [directions, setDirections] = useState<any>(null);
  const [polylineCoordinates, setPolylineCoordinates] = useState<LatLngTuple[]>(
    []
  );
  const callApiForDirections = async () => {
    const coordinates = markers.map((marker) => [marker.position[1], marker.position[0]]);

    const body = {
      coordinates: coordinates,
      extra_info: [
        "suitability",
        "surface",
        "waycategory",
        "waytype",
        "tollways",
      ],
      geometry_simplify: "false",
      instructions_format: "html",
      language: "id",
    };

    try {
      const response = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-hgv/json",
        {
          method: "POST",
          headers: {
            Authorization:
              "5b3ce3597851110001cf62486b0a56a32a7d4b649f84b0b80d97be54",
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
      setDirections(data); // Save the JSON data to state
      console.log(data); // Optionally log the data to the console

      //decode
      const geometry = data.routes[0].geometry; // Get the geometry from the first route
      const decoded = polyline.decode(geometry); // Decode the polyline
      const latLngs = decoded.map(
        (coord) => [coord[0], coord[1]] as LatLngTuple
      ); // Convert to [lat, lng]
      setPolylineCoordinates(latLngs); // Set the polyline coordinates
      console.log(polylineCoordinates); // Optionally log the polyline coordinates
      console.log(latLngs); // Optionally log the polyline coordinates
      console.log(geometry)
    } catch (error) {
      console.error("Error fetching directions:", error);
    }
  };

  const addMarker = (latlng: LatLngTuple) => {
    setMarkers((prev) => [...prev, { id: markers.length, position: latlng }]);
  };

  const handleMapRightClick = (latlng: LatLngTuple) => {
    setMarkers((prev) => [...prev, { id: markers.length, position: latlng }]);
  };

  const removeMarker = (id: number) => {
    setMarkers((prev) => {
      // Filter out the marker to be removed
      const updatedMarkers = prev.filter((marker) => marker.id !== id);
      // Reassign IDs to the remaining markers
      return updatedMarkers.map((marker, index) => ({
        ...marker,
        id: index, // Reassign ID based on the new index
      }));
    });
  };

  const updateMarkerPosition = (id: number, newPosition: LatLngTuple) => {
    setMarkers((prev) =>
      prev.map((marker) =>
        marker.id === id ? { ...marker, position: newPosition } : marker
      )
    );
  };


  useEffect(() => {  
    console.log("Polyline Coordinates Updated:", polylineCoordinates);  
  }, [polylineCoordinates]); 

  return (
    <>
      <div className="bg-white-700 mx-auto w-[98%] h-[640px]">
        <Map
          center={center}
          markers={markers}
          onMapRightClick={handleMapRightClick}
          onAddMarker={addMarker}
          onUpdateMarkerPosition={updateMarkerPosition}
          polylineCoordinates={polylineCoordinates}
        />
      </div>
      <div>
        <h2>List of Destination:</h2>
        <ul>
          {markers.map((marker) => (
            <li key={marker.id}>
              {marker.id}. Latitude: {marker.position[0]}, Longitude:{" "}
              {marker.position[1]}
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
    </>
  );
}
