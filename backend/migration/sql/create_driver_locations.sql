-- Tabel untuk menyimpan lokasi driver
CREATE TABLE IF NOT EXISTS driver_locations (
    id SERIAL PRIMARY KEY,
    route_plan_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    speed DOUBLE PRECISION,
    bearing DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_route_plan FOREIGN KEY (route_plan_id)
        REFERENCES route_plans (id) ON DELETE CASCADE,
    CONSTRAINT fk_driver FOREIGN KEY (driver_id)
        REFERENCES users (id) ON DELETE CASCADE
);

-- Indeks untuk mempercepat pencarian
CREATE INDEX IF NOT EXISTS idx_driver_locations_route_plan_id ON driver_locations(route_plan_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp ON driver_locations(timestamp);