# Fitur Marker Waypoints pada Route Polyline

## Deskripsi Fitur

Fitur ini menambahkan marker waypoints untuk setiap polyline route plan pada dashboard peta. Setiap route plan memiliki waypoints yang ditampilkan sebagai marker dengan nomor urut, dengan warna yang berbeda untuk titik awal, tengah, dan akhir.

## File yang Ditambahkan/Dimodifikasi

1. `utils/waypointMarker.js`: Berisi fungsi untuk membuat custom waypoint marker
2. `utils/leafletIcons.js`: Berisi fungsi untuk menginisialisasi icon Leaflet
3. `_components/WaypointMarkers.jsx`: Komponen untuk menampilkan marker waypoints
4. `(routes)/management/dashboard/page.jsx`: Halaman utama yang menampilkan peta dan marker

## Cara Kerja Fitur

1. **Inisialisasi Icon Leaflet**:
   - Icon Leaflet diinisialisasi saat komponen mount untuk mengatasi masalah missing icon
   - Menggunakan CDN untuk mengambil asset icon Leaflet

2. **Pembuatan Custom Waypoint Marker**:
   - Waypoint awal ditampilkan dengan warna hijau (#4CAF50)
   - Waypoint akhir ditampilkan dengan warna merah (#F44336)
   - Waypoint tengah ditampilkan dengan warna biru (#2196F3)
   - Setiap marker menampilkan nomor urut waypoint

3. **Penampilan Marker pada Peta**:
   - Ketika tidak ada truck yang dipilih, semua waypoint dari semua route plan ditampilkan
   - Ketika sebuah truck dipilih, hanya waypoint dari route plan truck tersebut yang ditampilkan
   - Marker selalu ditampilkan di atas polyline dengan zIndexOffset=1000

4. **Popup Informasi**:
   - Setiap marker memiliki popup yang menampilkan:
     - Jenis titik (Titik Awal, Titik Akhir, atau Waypoint n)
     - Alamat (jika tersedia)
     - Koordinat (latitude, longitude)

## Integrasi dengan Fitur Lainnya

Fitur ini terintegrasi dengan baik dengan fitur polyline routing:
- Marker waypoint hanya ditampilkan untuk polyline yang sedang aktif (berwarna)
- Marker waypoint disembunyikan untuk polyline yang tidak aktif (abu-abu)
- Saat pergantian truck yang aktif, marker juga otomatis diperbarui

## Visual Reference

- Marker Awal: Bulat, warna hijau, nomor 1
- Marker Tengah: Bulat, warna biru, nomor sesuai urutan
- Marker Akhir: Bulat, warna merah, nomor terakhir

## Pengembangan Lebih Lanjut

Potensi pengembangan di masa depan:
1. Menambahkan rute alternatif yang dapat dipilih dengan mengklik waypoint
2. Animasi pergerakan truck berdasarkan progress perjalanan
3. Penambahan informasi estimasi waktu antara waypoint
4. Optimasi kinerja untuk jumlah waypoint yang banyak