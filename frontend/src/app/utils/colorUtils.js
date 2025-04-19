// Buat array warna yang lebih banyak untuk banyak truck
export const routeColors = [
  "#3388ff", "#33cc33", "#ff3300", "#9933ff", "#ff9900", "#00ccff",
  "#8B4513", "#008080", "#FF1493", "#4B0082", "#FFD700", "#32CD32",
  "#1E90FF", "#FF69B4", "#7B68EE", "#BDB76B", "#9370DB", "#BC8F8F",
  "#00FA9A", "#66CDAA", "#FA8072", "#B22222", "#A52A2A", "#2E8B57",
  "#DB7093", "#FF7F50", "#9932CC", "#9ACD32", "#8FBC8F", "#E9967A",
  "#FFDEAD", "#F08080", "#CD5C5C", "#4682B4", "#6A5ACD", "#778899",
  "#708090", "#B0C4DE", "#ADD8E6", "#87CEEB", "#40E0D0", "#48D1CC",
  "#20B2AA", "#5F9EA0", "#4169E1", "#0000CD", "#0000FF", "#6495ED",
  "#00BFFF", "#7FFFD4", "#98FB98", "#90EE90", "#F0E68C", "#FAFAD2"
];

// Fungsi untuk mendapatkan warna berdasarkan route plan ID secara konsisten
export const getRouteColor = (routePlan) => {
  // Gunakan route ID sebagai identifikasi unik (lebih baik daripada index dalam array)
  const routeId = routePlan.id || 0;
  return routeColors[routeId % routeColors.length];
};

// Fungsi untuk debugging, menampilkan data truck dan route plan
export const debugTruckRouteMatch = (truck, routePlan) => {
  if (!truck || !routePlan) {
    console.log('Invalid truck or route plan data:', {truck, routePlan});
    return false;
  }
  
  // Jika vehicle_plate tidak ada atau format tidak valid, polyline tidak akan berubah warna
  if (!routePlan.vehicle_plate) {
    console.warn(`Route plan ${routePlan.id} has no vehicle_plate property:`, routePlan);
    return false;
  }
  
  const routePlanPlate = routePlan.vehicle_plate.split('/')[0] || '';
  const routePlanMacId = routePlan.vehicle_plate.split('/')[1] || '';
  
  console.log(`[DEBUG] Truck: ${truck.plate_number}/${truck.mac_id}`, `Route: ${routePlanPlate}/${routePlanMacId}`);
  const matchByPlate = routePlanPlate === truck.plate_number;
  const matchByMacId = routePlanMacId === truck.mac_id;
  console.log(`[DEBUG] Match by plate: ${matchByPlate}, Match by mac_id: ${matchByMacId}`);
  
  return (matchByPlate || matchByMacId);
};