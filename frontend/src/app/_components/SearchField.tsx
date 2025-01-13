import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { LatLngTuple } from "leaflet";
import L from "leaflet";

interface SearchFieldProps {
  onAddMarker: (latlng: LatLngTuple) => void;
}

const SearchField = ({ onAddMarker }: SearchFieldProps) => {
  // Create an instance of the OpenStreetMapProvider
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

  const map = useMap();

  useEffect(() => {
    map.addControl(searchControl);
    const handleShowLocation = (e: any) => {  
        console.log(e.location.x, e.location.y);  
        const latlng: LatLngTuple = [e.location.y, e.location.x];  
        onAddMarker(latlng);  
      };  
    map.on("geosearch/showlocation", handleShowLocation);
    return () => {
      map.off("geosearch/showlocation", handleShowLocation);
      map.removeControl(searchControl);
    };
  }, [map, onAddMarker, searchControl]);

  return null;
};

export default SearchField;
