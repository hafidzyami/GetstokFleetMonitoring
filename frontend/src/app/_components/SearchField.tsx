import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { LatLngTuple } from "leaflet";
import L from "leaflet";

interface SearchFieldProps {
  onAddMarker: (latlng: LatLngTuple) => void;
}

const SearchField = ({ onAddMarker }: SearchFieldProps) => {
  // Get the map instance
  const map = useMap();

  useEffect(() => {
    // Create provider and search control inside useEffect
    const provider = new OpenStreetMapProvider();

    // @ts-ignore
    const searchControl = new GeoSearchControl({
      provider: provider,
      style: "bar",
      autoComplete: true,
      autoCompleteDelay: 250,
      showMarker: false,
      marker: {
        icon: new L.Icon.Default(),
        draggable: true,
      },
      searchLabel: "Enter address or latitudes and longitudes",
    });

    // Add control to map
    map.addControl(searchControl);

    // Handle location found event
    const handleShowLocation = (e: any) => {  
      console.log(e.location.x, e.location.y);  
      const latlng: LatLngTuple = [e.location.y, e.location.x];  
      onAddMarker(latlng);  
    };
    
    // Add event listener
    map.on("geosearch/showlocation", handleShowLocation);
    
    // Cleanup function
    return () => {
      map.off("geosearch/showlocation", handleShowLocation);
      map.removeControl(searchControl);
    };
  }, [map, onAddMarker]); // Only dependencies are map and onAddMarker now

  return null;
};

export default SearchField;