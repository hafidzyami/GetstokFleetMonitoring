# Route Polyline Feature

## Fitur

Fitur ini menampilkan polyline (garis rute) untuk setiap rencana rute aktif dari truck pada peta. Beberapa fitur utama:

1. **Visualisasi Rute Aktif**: Semua rute aktif ditampilkan di peta dengan polyline berwarna.

2. **Fokus pada Truck yang Dipilih**: 
   - Ketika tidak ada truck yang dipilih, semua rute ditampilkan dengan warna berbeda.
   - Ketika sebuah truck dipilih, rute truck tersebut ditampilkan dengan warna cerah, sedangkan rute lainnya berubah menjadi abu-abu.
   
3. **Legend Rute**: 
   - Menampilkan legenda dengan warna yang sesuai untuk setiap rute.
   - Jika ada truck yang dipilih, hanya menampilkan legenda untuk rute truck tersebut.
   
4. **Indikator Truck dengan Rute Aktif**:
   - Truck dengan rute aktif memiliki indikator garis hijau di samping kiri pada daftar truck.
   - Tambahan indikator titik hijau di samping nama truck untuk menunjukkan rute aktif.

## Implementasi Teknis

1. **Decoder Polyline**: Menggunakan `polylineDecoder.ts` untuk mendecode format encoded polyline dari Google Maps API.

2. **Penanganan Data**:
   - Data rute aktif diambil melalui endpoint `/api/v1/route-plans/active/all`
   - Filtering dilakukan untuk memastikan hanya rute dengan geometri valid yang ditampilkan
   - Penyegaran data otomatis setiap 30 detik

3. **Visual Highlighting**:
   - Warna polyline yang berbeda untuk setiap rute, dengan fungsi `getTruckRouteColor`
   - Warna abu-abu untuk rute truck yang tidak dipilih
   - Indikator border hijau dan dot hijau untuk menunjukkan truck dengan rute aktif

## Pengembangan Lebih Lanjut

Beberapa fitur yang dapat ditambahkan:

1. Interaksi dengan polyline (menampilkan detail rute saat di-klik)
2. Animasi pergerakan truck mengikuti rute
3. Informasi tambahan seperti estimasi tiba, jarak tempuh, dll.
4. Filter untuk menampilkan atau menyembunyikan jenis rute tertentu