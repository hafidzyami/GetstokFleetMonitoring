# Tugas Akhir - Getstok Fleet Monitoring

Welcome to the **Getstok Fleet Monitoring** repository! This repository contains three main components: **Frontend**, **Backend**, and **Firmware**, each designed to work together seamlessly. Below are the details of each component.

---

## Table of Contents
- [Frontend](#frontend)
- [Backend](#backend)
- [Firmware](#firmware)
- [Setup](#setup)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
  - [Firmware Setup](#firmware-setup)
- [License](#license)
- [Contributing](#contributing)

---

## Frontend

The **Frontend** is built using [Next.js](https://nextjs.org/), a React framework for server-rendered and statically generated web applications.

### Features
- Modern UI built with React and Next.js.
- Server-side rendering and API routes for efficient data fetching.
- Optimized performance and SEO.

---

## Backend - Getstok Fleet Monitoring

The backend for Getstok Fleet Monitoring is built with Go (Golang), using the GoFiber framework and GORM for database operations. It follows a clean n-tier architecture and provides RESTful API endpoints with authentication and role-based access control.

### Features

- **Authentication System**: Secure JWT-based authentication with roles (management, planner, driver)
- **RESTful API**: Clean API design following Google JSON Style Guide
- **Documentation**: Integrated Swagger API documentation
- **Database**: PostgreSQL integration with GORM
- **Docker Support**: Containerized development and production environments
- **Hot Reload**: Development environment with automatic reloading

### Tech Stack

- **Language**: Go 1.20+
- **Framework**: GoFiber v2
- **ORM**: GORM with PostgreSQL driver
- **Authentication**: JWT (JSON Web Tokens)
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker & Docker Compose

### Project Structure

```
backend/
├── config/            # Configuration and database setup
├── controller/        # HTTP request handlers
├── docs/              # Swagger documentation
├── middleware/        # Middleware components (auth, logging, etc.)
├── model/             # Data models and DTOs
├── repository/        # Database access layer
├── service/           # Business logic
├── util/              # Utility functions
├── .env               # Environment variables (not in git)
├── .env.db            # Database environment variables (not in git)
├── .env.example       # Example environment variables
├── .env.db.example    # Example database environment variables
├── Dockerfile         # Multi-stage build for dev and prod
├── docker-compose.yml # Base Docker Compose configuration
├── docker-compose.dev.yml # Development overrides
├── docker-compose.prod.yml # Production overrides
├── go.mod             # Go modules
├── go.sum             # Dependencies lockfile
└── main.go            # Application entry point
```

### Environment Setup

#### Prerequisites

- Go 1.20 or higher
- Docker and Docker Compose
- PostgreSQL (if not using Docker)

#### Environment Variables

Two environment files are required:

1. `.env` - Application configuration:
```
DB_HOST=postgres
DB_PORT=port
DB_USER=username
DB_PASSWORD=password
DB_NAME=getstok
DB_DRIVER=postgres
JWT_SECRET=your_secret_key
PORT=3000
```

2. `.env.db` - Database configuration:
```
POSTGRES_USER=username
POSTGRES_PASSWORD=password
POSTGRES_DB=getstok
```

Copy the example files and adjust as needed:
```bash
cp .env.example .env
cp .env.db.example .env.db
```

### Docker Setup

#### Development Environment

The development environment includes hot-reload for faster development cycles:

```bash
# Build and run development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Run in background
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api
```

#### Production Environment

```bash
# Build and run production-ready containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api
```

#### Stopping Containers

```bash
# Stop development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# Stop production environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
```

### Local Setup (Without Docker)

If you prefer to run the application locally:

1. Ensure PostgreSQL is running and accessible
2. Configure `.env` with your database connection details
3. Run the application:

```bash
# Get dependencies
go mod tidy

# Run the application
go run main.go

# For hot-reload development (requires air: go install github.com/cosmtrek/air@latest)
air
```

### API Documentation

The API documentation is available through Swagger UI when the application is running:

- Development: http://localhost:3000/swagger/index.html
- Production: https://your-api-domain.com/swagger/index.html

### Authentication

The API uses JWT tokens for authentication. Most endpoints require authentication and some are restricted by role.

#### Available Roles

- `management`: Can register users and access all features
- `planner`: Can plan routes and manage fleet operations
- `driver`: Can view assigned routes and update status

#### Authentication Flow

1. Register (Management only): `POST /api/auth/register`
2. Login: `POST /api/auth/login`
3. Use the returned token in the Authorization header: `Bearer <token>`

### Development

#### Generating Swagger Documentation

```bash
# Install swag if not already installed
go install github.com/swaggo/swag/cmd/swag@latest

# Generate documentation
swag init -g main.go --output docs
```

#### Database Migrations

Database migrations are handled automatically by GORM when the application starts.

---

## Firmware

The **Firmware** is written in **C++** to control hardware devices efficiently.

### Features
- Optimized for resource-constrained environments.
- Compatible with a variety of microcontrollers.
- Includes communication protocols for interacting with the backend.


---

## Setup


```yaml
frontend:
  steps:
    - navigate: "cd frontend"
    - install_dependencies: "npm install"
    - run_development_server: "npm run dev"
    - open_browser: "http://localhost:3000"

backend:
  steps:
    - navigate: "cd backend"
    - initialize_modules: "go mod tidy"
    - run_application: "go run cmd/main.go"
    - api_url: "http://localhost:8080"

firmware:
  steps:
    - navigate: "cd firmware"
    - open_project: "Open the project in PlatformIO"
    - build_project: "Use the 'Build' button in PlatformIO"
    - upload_firmware: "Use the 'Upload' button to flash the microcontroller"

