"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { LatLngTuple } from "leaflet";
import polyline from "@mapbox/polyline";

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
  const [directions, setDirections] = useState<any>(null);
  const [flagImpassible, setFlagImpassible] = useState<boolean>(false);

  const callApiForDirections = async () => {
    setSegments([]); // Reset the segments state to an empty array
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
            Authorization:
              process.env.NEXT_PUBLIC_API_ORS || "", // Get the API key from the environment variables
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
      );

      const waytypes = data.routes[0].extras.waytypes.values;
      const tollwayss = data.routes[0].extras.tollways.values;
      console.log(tollwayss);

      for(const waytype of waytypes){
        const startIdx = waytype[0];
        const endIdx = waytype[1];
        const typeValue = waytype[2];
        const segment = latLngs.slice(startIdx, endIdx + 1);
        setSegments((prev: any) => [...prev, {segment, typeValue}]);
      }

      for(const tollway of tollwayss){
        const startIdx = tollway[0];
        const endIdx = tollway[1];
        const tollwayValue = tollway[2];
        const segment = latLngs.slice(startIdx, endIdx + 1);
        setTollways((prev: any) => [...prev, {segment, tollwayValue}]);
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
        id: index, // Reassign ID based on the new index
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
        id: index, // Reassign ID based on the new index
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
          segments={segments}
          tollways={tollways}
        />
      </div>
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
