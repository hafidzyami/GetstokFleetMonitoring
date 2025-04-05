import React, { useEffect, useState, useRef } from "react";

interface ElevationProfileProps {
  geometry: string;
  surfaceTypes?: string[];
  onHover?: (point: { lat: number; lng: number } | null) => void;
}

interface PointData {
  distance: number;
  elevation: number;
  lat: number;
  lng: number;
  surfaceType: string;
  segmentLength: number;
}

const ElevationProfile: React.FC<ElevationProfileProps> = ({
  geometry,
  surfaceTypes = [],
  onHover,
}) => {
  const [componentWidth, setComponentWidth] = useState(0);
  const [data, setData] = useState<PointData[]>([]);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    data: PointData;
  } | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [elevationRange, setElevationRange] = useState({ min: 0, max: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setComponentWidth(width);
      }
    };
    
    // Hitung lebar awal
    updateWidth();
    
    // Tambahkan resize listener
    window.addEventListener('resize', updateWidth);
    
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (hoverInfo && onHover) {
      // Kirim koordinat saat hover ke parent component
      onHover({
        lat: hoverInfo.data.lat, 
        lng: hoverInfo.data.lng
      });
      
      // Dispatch custom event untuk marker pada peta
      const hoverEvent = new CustomEvent('elevation-hover', {
        detail: {
          lat: hoverInfo.data.lat,
          lng: hoverInfo.data.lng,
          elevation: hoverInfo.data.elevation
        }
      });
      document.dispatchEvent(hoverEvent);
    }
    
    return () => {
      // Bersihkan marker saat tidak hover
      if (onHover) onHover(null);
      
      // Dispatch event reset
      const resetEvent = new CustomEvent('elevation-hover-reset');
      document.dispatchEvent(resetEvent);
    };
  }, [hoverInfo, onHover]);

  // Fungsi untuk men-decode string polyline
  const decodePolyline = (encoded: string, includeElevation = false) => {
    const precision = 5;
    const factor = Math.pow(10, precision);

    let index = 0;
    let lat = 0;
    let lng = 0;
    let ele = 0;
    const coordinates: [number, number, number?][] = [];
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
      lat += result & 1 ? ~(result >> 1) : result >> 1;

      // Decode longitude
      shift = 0;
      result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      lng += result & 1 ? ~(result >> 1) : result >> 1;

      // Decode elevation if requested
      if (includeElevation) {
        shift = 0;
        result = 0;
        do {
          byte = encoded.charCodeAt(index++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
        } while (byte >= 0x20);
        ele += result & 1 ? ~(result >> 1) : result >> 1;
        coordinates.push([lng / factor, lat / factor, ele / 100]);
      } else {
        coordinates.push([lng / factor, lat / factor]);
      }
    }
    return coordinates;
  };

  // Fungsi untuk menghitung jarak antara dua titik (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371e3; // Radius bumi dalam meter
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Jarak dalam meter
  };

  useEffect(() => {
    if (!geometry) return;

    // Decode polyline dengan elevasi
    const coordinates = decodePolyline(geometry, true);

    // Menyiapkan data
    let accumulatedDistance = 0;
    const profileData = coordinates.map((coord, index) => {
      // Hitung jarak dari titik sebelumnya
      let segmentDistance = 0;
      if (index > 0) {
        const prevCoord = coordinates[index - 1];
        segmentDistance = calculateDistance(
          prevCoord[1] as number,
          prevCoord[0] as number,
          coord[1] as number,
          coord[0] as number
        );
      }

      accumulatedDistance += segmentDistance;

      // Untuk contoh, tetapkan surface type default
      const surfaceType = surfaceTypes[index] || "Asphalt";

      return {
        distance: accumulatedDistance / 1000, // konversi ke km
        elevation: coord[2] as number, // elevasi dalam meter
        lat: coord[1] as number,
        lng: coord[0] as number,
        surfaceType: surfaceType,
        segmentLength: segmentDistance / 1000, // panjang segmen dalam km
      };
    });

    setData(profileData);
    setTotalDistance(accumulatedDistance / 1000);

    // Menentukan range elevasi
    const elevations = profileData.map((p) => p.elevation);
    setElevationRange({
      min: Math.floor(Math.min(...elevations)) - 5,
      max: Math.ceil(Math.max(...elevations)) + 5,
    });
  }, [geometry, surfaceTypes]);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current || !containerRef.current) return;

      const svgRect = svgRef.current.getBoundingClientRect();

      // Periksa apakah mouse berada di dalam area grafik aktual
      const chartStartX = svgRect.left + 40; // Perkiraan offset untuk sumbu Y
      const chartEndX = svgRect.right - 10; // Sedikit padding di kanan

      // Jika mouse berada di luar area grafik, batalkan
      if (e.clientX < chartStartX || e.clientX > chartEndX) {
        setHoverInfo(null);
        return;
      }

      // Normalisasi posisi mouse relatif terhadap area grafik saja
      const chartWidth = chartEndX - chartStartX;
      const relativeX = e.clientX - chartStartX;
      const mouseXRatio = relativeX / chartWidth;

      // Konversi ke jarak dalam rute
      const hoverDistance = mouseXRatio * totalDistance;

      // Cari titik terdekat
      let closest = data[0];
      let minDiff = Math.abs(data[0].distance - hoverDistance);

      for (let i = 1; i < data.length; i++) {
        const diff = Math.abs(data[i].distance - hoverDistance);
        if (diff < minDiff) {
          minDiff = diff;
          closest = data[i];
        }
      }

      // Hitung posisi yang tepat berdasarkan data
      const pointXRatio = closest.distance / totalDistance;
      const pointX = chartStartX + pointXRatio * chartWidth;

      const normalizedElevation =
        (closest.elevation - elevationRange.min) /
        (elevationRange.max - elevationRange.min);
      const pointY =
        svgRect.top + svgRect.height - normalizedElevation * svgRect.height;

      setHoverInfo({
        x: pointX,
        y: pointY - 120, // Offset untuk tooltip
        data: closest,
      });
    };

    const handleMouseLeave = () => {
      setHoverInfo(null);
    };

    const svg = svgRef.current;
    svg.addEventListener("mousemove", handleMouseMove);
    svg.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      svg.removeEventListener("mousemove", handleMouseMove);
      svg.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [data, totalDistance, elevationRange]);

  if (!data.length) return <div className="p-4">Loading elevation data...</div>;

  // Create SVG path for elevation profile
  const height = 150;
  const width = Math.max(componentWidth - 20, 300); // Minimal 300px
  const pathData = data
    .map((point, i) => {
      const x = (point.distance / totalDistance) * width;
      const normalizedElevation =
        (point.elevation - elevationRange.min) /
        (elevationRange.max - elevationRange.min);
      const y = height - normalizedElevation * height;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  // Close the path to create a filled area
  const closedPathData = `${pathData} L${width},${height} L0,${height} Z`;

  return (
    <div
      className="relative bg-white rounded-lg shadow-md overflow-hidden"
      ref={containerRef}
    >
      <div className="p-2 border-b border-gray-200 flex justify-between items-center">
        <div className="font-bold text-gray-700">Elevation Profile</div>
        <div className="text-sm text-gray-500">
          Total Distance: {totalDistance.toFixed(2)} km
        </div>
      </div>

      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute top-0 left-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-1 mb-6">
          <span>{elevationRange.max} m</span>
          <span>
            {Math.floor((elevationRange.max + elevationRange.min) / 2)} m
          </span>
          <span>{elevationRange.min} m</span>
        </div>

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="overflow-visible ml-8"
        >
          {/* Grid lines */}
          <line
            x1="0"
            y1={height}
            x2={width}
            y2={height}
            stroke="#ccc"
            strokeWidth="1"
          />
          <line x1="0" y1="0" x2={width} y2="0" stroke="#ccc" strokeWidth="1" />
          <line
            x1="0"
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="#ccc"
            strokeWidth="0.5"
            strokeDasharray="5,5"
          />

          {/* Draw elevation profile with gradient fill */}
          <defs>
            <linearGradient
              id="elevationGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#96d633" />
              <stop offset="100%" stopColor="#70ad25" />
            </linearGradient>
          </defs>
          <path d={closedPathData} fill="url(#elevationGradient)" />
          <path d={pathData} fill="none" stroke="#228B22" strokeWidth="2" />

          {/* X-axis distance markers */}
          {[...Array(Math.ceil(totalDistance) + 1)].map((_, i) => {
            const x = (i / totalDistance) * width;
            return (
              <g key={i}>
                <line x1={x} y1={height} x2={x} y2={height + 5} stroke="#666" />
                <text
                  x={x}
                  y={height + 15}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#666"
                >
                  {i.toFixed(2)} km
                </text>
              </g>
            );
          })}

          {/* Hover indicator line */}
          {hoverInfo && containerRef.current && (
            <line
              x1={
                hoverInfo.x -
                containerRef.current.getBoundingClientRect().left +
                8
              }
              y1="0"
              x2={
                hoverInfo.x -
                containerRef.current.getBoundingClientRect().left +
                8
              }
              y2={height}
              stroke="#333"
              strokeWidth="1"
              strokeDasharray="5,5"
            />
          )}
        </svg>

        {/* X-axis label */}
        <div className="text-center text-xs text-gray-500 mt-4 mb-2">
          Distance (km)
        </div>
      </div>

      {/* Hover tooltip */}
      {hoverInfo && containerRef.current && (
        <div
          className="tooltipElevation absolute bg-white border border-gray-300 shadow-md p-2 rounded-md text-sm z-10"
          style={{
            // Tentukan posisi berdasarkan lokasi kursor pada halaman
            left: `${
              hoverInfo.x - containerRef.current.getBoundingClientRect().left
            }px`,
            // Jika kursor di dekat bagian atas, tampilkan tooltip di bawah. Jika tidak, tampilkan di atas
            bottom:
              hoverInfo.y < window.innerHeight / 2
                ? `auto`
                : `${
                    containerRef.current.getBoundingClientRect().bottom -
                    hoverInfo.y +
                    20
                  }px`,
            top:
              hoverInfo.y < window.innerHeight / 2
                ? `${
                    hoverInfo.y -
                    containerRef.current.getBoundingClientRect().top +
                    20
                  }px`
                : "auto",
            transform: "translate(-50%, 0)",
          }}
        >
          <div className="font-semibold border-b pb-1 mb-1">
            Distance: {hoverInfo.data.distance.toFixed(1)} km
          </div>
          <div>Elevation: {hoverInfo.data.elevation.toFixed(1)} m</div>
          <div>
            Segment length: {hoverInfo.data.segmentLength.toFixed(1)} km
          </div>
          <div>Type: {hoverInfo.data.surfaceType}</div>
        </div>
      )}
    </div>
  );
};

export default ElevationProfile;
