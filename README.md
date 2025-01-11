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

## Backend

The **Backend** is developed using [Go](https://golang.org/), a fast and efficient language for building scalable server-side applications.

### Features
- RESTful API endpoints for handling data.
- Lightweight and high-performance.
- Well-documented codebase for easy maintenance.


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

