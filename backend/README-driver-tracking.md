# Driver Tracking API

Fitur baru ini memberikan kemampuan untuk melacak posisi driver secara real-time dan menyimpan histori pergerakan mereka.

## Struktur Kode

1. **Model**: `model/driver_location.go`
   - `DriverLocation`: Model untuk menyimpan data lokasi driver
   - `DriverLocationRequest`: DTO untuk permintaan update lokasi
   - `DriverLocationResponse`: DTO untuk respons lokasi
   - `ActiveRouteResponse`: DTO untuk informasi rute aktif beserta lokasi

2. **Repository**: `repository/driver_location_repository.go`
   - Interface dan implementasi untuk CRUD operasi lokasi driver

3. **Service**: `service/driver_location_service.go`
   - Implementasi bisnis logik untuk tracking driver

4. **Controller**: `controller/driver_location_controller.go`
   - Endpoint API untuk lokasi driver

5. **Migrasi**: `migration/create_driver_locations.go`
   - Script untuk membuat tabel driver_locations

## Endpoints

1. **POST** `/api/v1/route-plans/:id/location`
   - Update lokasi driver untuk rute tertentu
   - Memerlukan autentikasi JWT (role: driver)
   - Request body: `DriverLocationRequest`

2. **GET** `/api/v1/route-plans/:id/location/latest`
   - Mendapatkan lokasi terbaru driver untuk rute tertentu
   - Memerlukan autentikasi JWT

3. **GET** `/api/v1/route-plans/:id/location/history`
   - Mendapatkan riwayat lokasi driver untuk rute tertentu
   - Memerlukan autentikasi JWT

4. **DELETE** `/api/v1/route-plans/:id/location/history`
   - Menghapus semua riwayat lokasi untuk rute tertentu
   - Memerlukan autentikasi JWT (role: planner, management)

5. **GET** `/api/v1/route-plans/active`
   - Mendapatkan rute aktif untuk driver yang sedang login
   - Memerlukan autentikasi JWT (role: driver)
   - Mengembalikan data rute lengkap beserta lokasi terbaru

## Integrasi dengan main.go

Untuk mengintegrasikan kode tracking driver, tambahkan kode berikut di `main.go`:

1. Tambahkan repository baru setelah deklarasi repository:
```go
driverLocationRepo := repository.NewDriverLocationRepository()
```

2. Tambahkan service baru setelah deklarasi semua service:
```go
driverLocationService := service.NewDriverLocationService(
    driverLocationRepo,
    routePlanRepo,
    userRepo,
    routingPlanService,
)
```

3. Tambahkan controller baru setelah deklarasi semua controller:
```go
driverLocationController := controller.NewDriverLocationController(driverLocationService)
```

4. Tambahkan rute baru di bagian route plans:
```go
routePlans.Get("/active", driverLocationController.GetActiveRoute)
routePlans.Post("/:id/location", driverLocationController.UpdateDriverLocation)
routePlans.Get("/:id/location/latest", driverLocationController.GetLatestDriverLocation)
routePlans.Get("/:id/location/history", driverLocationController.GetDriverLocationHistory)
routePlans.Delete("/:id/location/history", driverLocationController.DeleteLocationHistory)
```

5. Jalankan migrasi untuk membuat tabel baru dengan menambahkan kode berikut setelah `config.ConnectDB()`:
```go
// Run migrations
migration.CreateDriverLocationsTable() 
```

## Migrasi Manual (SQL)

Jika Anda memerlukan migrasi manual, gunakan SQL script di `migration/sql/create_driver_locations.sql`.

## Penggunaan dari Frontend

Contoh penggunaan di frontend untuk update lokasi driver:

```javascript
// Di frontend/src/app/(routes)/driver/route/page.tsx
const updateLocationOnServer = async (routeId, latitude, longitude) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    const response = await fetch(`/api/v1/route-plans/${routeId}/location`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error("Failed to update location:", response.statusText);
    }
  } catch (error) {
    console.error("Error updating location:", error);
  }
};
```