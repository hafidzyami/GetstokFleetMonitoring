import L from "leaflet";

// Fungsi untuk membuat marker waypoint dengan angka
export const createWaypointIcon = (text, bgColor) => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${bgColor}; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; border-radius: 50%; color: white; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);">${text}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Fungsi untuk mendapatkan warna marker berdasarkan posisi
export const getWaypointColor = (index, totalWaypoints) => {
  if (index === 0) {
    return "#4CAF50"; // Hijau untuk titik awal
  } else if (index === totalWaypoints - 1) {
    return "#F44336"; // Merah untuk titik akhir
  } else {
    return "#2196F3"; // Biru untuk titik tengah
  }
};
