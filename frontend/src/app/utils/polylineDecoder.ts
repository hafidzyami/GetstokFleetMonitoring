export function decodePolylineWithElevation(encoded: string) {
    const precision = 5;
    const factor = Math.pow(10, precision);
    
    let index = 0;
    let lat = 0;
    let lng = 0;
    let ele = 0;
    const coordinates: any[] = [];
    let shift = 0;
    let result = 0;
    let byte = null;
  
    while (index < encoded.length) {
      // Decode latitude
      shift = 0;
      result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
  
      // Decode longitude
      shift = 0;
      result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
  
      // Decode elevation
      shift = 0;
      result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      ele += ((result & 1) ? ~(result >> 1) : (result >> 1));
  
      // Create object with all data
      coordinates.push({
        lat: lat / factor,
        lng: lng / factor,
        elevation: ele / 100
      });
    }
    
    return coordinates;
  }
  
  // Fungsi untuk mendapatkan hanya koordinat lat/lng untuk peta
  export function getLatLngsForMap(encoded: string) {
    const coordinates = decodePolylineWithElevation(encoded);
    return coordinates.map(coord => [coord.lat, coord.lng]);
  }
  
  // Fungsi untuk mendapatkan informasi elevasi untuk chart
  export function getElevationData(encoded: string) {
    return decodePolylineWithElevation(encoded);
  }