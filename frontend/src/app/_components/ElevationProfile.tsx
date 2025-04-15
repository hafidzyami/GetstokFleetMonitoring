'use client';

import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

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
  onHover 
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [data, setData] = useState<PointData[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
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

  // Calculate elevation statistics
  const calculateElevationGain = (data: PointData[]): number => {
    let gain = 0;
    for (let i = 1; i < data.length; i++) {
      const diff = data[i].elevation - data[i-1].elevation;
      if (diff > 0) gain += diff;
    }
    return gain;
  };

  const calculateElevationLoss = (data: PointData[]): number => {
    let loss = 0;
    for (let i = 1; i < data.length; i++) {
      const diff = data[i-1].elevation - data[i].elevation;
      if (diff > 0) loss += diff;
    }
    return loss;
  };

  // Get color for surface type
  const getSurfaceColor = (surfaceType: string): string => {
    switch (surfaceType) {
      case 'Asphalt':
        return 'rgba(50, 50, 50, 0.7)';
      case 'Concrete':
        return 'rgba(120, 120, 120, 0.7)';
      case 'Unpaved':
      case 'Gravel':
      case 'Fine Gravel':
      case 'Compacted Gravel':
        return 'rgba(150, 100, 50, 0.7)';
      case 'Dirt':
      case 'Ground':
        return 'rgba(130, 80, 30, 0.7)';
      case 'Paved':
        return 'rgba(70, 70, 70, 0.7)';
      default:
        return 'rgba(80, 150, 230, 0.7)';
    }
  };

  // Parse data from geometry
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
  }, [geometry, surfaceTypes]);

  // Create and update chart
  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Extract data for chart
    const distances = data.map(point => point.distance);
    const elevations = data.map(point => point.elevation);
    const surfaceColors = data.map(point => getSurfaceColor(point.surfaceType));
    
    // Calculate min and max elevation with some padding
    const minElevation = Math.min(...elevations) * 0.95;
    const maxElevation = Math.max(...elevations) * 1.05;

    // Create new chart
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: distances,
        datasets: [{
          label: 'Elevation',
          data: elevations,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: surfaceColors,
          tension: 0.3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                const index = context.dataIndex;
                const pointData = data[index];
                return [
                  `Elevasi: ${pointData.elevation.toFixed(1)} m`,
                  `Jarak: ${pointData.distance.toFixed(1)} km`,
                  `Permukaan: ${pointData.surfaceType}`,
                  `Panjang segmen: ${pointData.segmentLength.toFixed(1)} km`
                ];
              }
            }
          },
          legend: {
            display: false
          }
        },
        hover: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Jarak (km)'
            },
            ticks: {
              callback: function(value, index) {
                // Show fewer ticks for better readability
                const interval = Math.ceil(distances.length / 8);
                if (index % interval === 0) {
                  return distances[index].toFixed(1);
                }
                return '';
              }
            }
          },
          y: {
            title: {
              display: true,
              text: 'Elevasi (m)'
            },
            min: minElevation,
            max: maxElevation
          }
        },
        onHover: (event, elements) => {
          if (elements && elements.length > 0 && onHover) {
            const index = elements[0].index;
            onHover({
              lat: data[index].lat,
              lng: data[index].lng
            });
          } else if (onHover) {
            onHover(null);
          }
        }
      }
    });

    // Handle chart resize
    const resizeObserver = new ResizeObserver(() => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, onHover]);

  // Get unique surface types for legend
  const getUniqueSurfaceTypes = () => {
    if (!data.length) return [];
    return Array.from(new Set(data.map(point => point.surfaceType)))
      .filter(type => type !== 'Unknown');
  };

  const uniqueSurfaceTypes = getUniqueSurfaceTypes();
  const totalGain = data.length ? calculateElevationGain(data) : 0;
  const totalLoss = data.length ? calculateElevationLoss(data) : 0;
  const minElevation = data.length ? Math.min(...data.map(p => p.elevation)) : 0;
  const maxElevation = data.length ? Math.max(...data.map(p => p.elevation)) : 0;

  return (
    <div className="relative bg-white rounded-lg shadow-md overflow-hidden" ref={containerRef}>
      <div className="p-2 border-b border-gray-200 flex justify-between items-center">
        <div className="font-bold text-gray-700">Profil Elevasi</div>
        <div className="text-sm text-gray-500">
          Total Jarak: {totalDistance.toFixed(2)} km
        </div>
      </div>
      
      {/* Elevation Statistics */}
      <div className="p-2 bg-gray-50 border-b border-gray-200 flex flex-wrap justify-between text-xs text-gray-600">
        <div><span className="font-semibold">Kenaikan:</span> {totalGain.toFixed(0)} m</div>
        <div><span className="font-semibold">Penurunan:</span> {totalLoss.toFixed(0)} m</div>
        <div><span className="font-semibold">Min:</span> {minElevation.toFixed(0)} m</div>
        <div><span className="font-semibold">Max:</span> {maxElevation.toFixed(0)} m</div>
      </div>
      
      {/* Surface Type Legend */}
      {uniqueSurfaceTypes.length > 0 && (
        <div className="p-2 flex flex-wrap gap-2 text-xs border-b border-gray-200">
          {uniqueSurfaceTypes.map(type => (
            <div key={type} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-1"
                style={{ backgroundColor: getSurfaceColor(type) }}
              />
              <span>{type}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Chart Container */}
      <div className="relative h-64 w-full p-2">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
};

export default ElevationProfile;