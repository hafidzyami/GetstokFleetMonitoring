import http from "k6/http";
import { check, sleep, group } from "k6";
import { randomString } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";
import { BASE_URL, OPTIONS, TEST_DATA, getAuthToken } from "./config.js";

export const options = OPTIONS;

export default function () {
  const token = getAuthToken(http);
  if (!token) {
    console.error("Failed to get auth token");
    return;
  }

  group("Route Plan Controller Tests", () => {
    // Get Active Route Plans
    group("Get Active Route Plans", () => {
      const res = http.get(`${BASE_URL}/route-plans/active/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      check(res, {
        "get active route plans response received": (r) => r.status !== 0,
      });
    });

    // Create Route Plan
    group("Create Route Plan", () => {
      const res = http.post(
        `${BASE_URL}/route-plans`,
        JSON.stringify({
          name: `Test Route Plan ${randomString(5)}`,
          truckID: 1,
          driverID: 1,
          origin: {
            name: "Origin Place",
            lat: -6.2088,
            lng: 106.8456,
          },
          destination: {
            name: "Destination Place",
            lat: -6.1751,
            lng: 106.865,
          },
          waypoints: [],
        }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      check(res, {
        "create route plan response received": (r) => r.status !== 0,
      });

      // If the route plan was created successfully, test the get by ID endpoint
      if (res.status === 201 || res.status === 200) {
        const routePlanId = JSON.parse(res.body).data.id;

        // Get Route Plan by ID
        group("Get Route Plan by ID", () => {
          const getRes = http.get(`${BASE_URL}/route-plans/${routePlanId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          check(getRes, {
            "get route plan by ID response received": (r) => r.status !== 0,
          });
        });

        // Update Route Plan Status
        group("Update Route Plan Status", () => {
          const updateRes = http.put(
            `${BASE_URL}/route-plans/${routePlanId}/status`,
            JSON.stringify({
              status: "in_progress",
            }),
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          check(updateRes, {
            "update route plan status response received": (r) => r.status !== 0,
          });
        });

        // Update Route Plan
        group("Update Route Plan", () => {
          const updateRes = http.put(
            `${BASE_URL}/route-plans/${routePlanId}`,
            JSON.stringify({
              name: `Updated Route Plan ${randomString(5)}`,
              truckID: 1,
              driverID: 1,
              origin: {
                name: "Updated Origin",
                lat: -6.2088,
                lng: 106.8456,
              },
              destination: {
                name: "Updated Destination",
                lat: -6.1751,
                lng: 106.865,
              },
              waypoints: [],
            }),
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          check(updateRes, {
            "update route plan response received": (r) => r.status !== 0,
          });
        });

        // Update Driver Location
        group("Update Driver Location", () => {
          const locationRes = http.post(
            `${BASE_URL}/route-plans/${routePlanId}/location`,
            JSON.stringify({
              lat: -6.18 + Math.random() * 0.1,
              lng: 106.8 + Math.random() * 0.1,
            }),
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          check(locationRes, {
            "update driver location response received": (r) => r.status !== 0,
          });
        });

        // Get Latest Driver Location
        group("Get Latest Driver Location", () => {
          const getLocationRes = http.get(
            `${BASE_URL}/route-plans/${routePlanId}/location/latest`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          check(getLocationRes, {
            "get latest driver location response received": (r) =>
              r.status !== 0,
          });
        });

        // Get Driver Location History
        group("Get Driver Location History", () => {
          const getHistoryRes = http.get(
            `${BASE_URL}/route-plans/${routePlanId}/location/history`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          check(getHistoryRes, {
            "get driver location history response received": (r) =>
              r.status !== 0,
          });
        });

        // Add Avoidance Area
        group("Add Avoidance Area", () => {
          const avoidanceRes = http.post(
            `${BASE_URL}/route-plans/${routePlanId}/avoidance`,
            JSON.stringify({
              name: `Test Avoidance ${randomString(5)}`,
              center: {
                lat: -6.19,
                lng: 106.82,
              },
              radius: 500,
              isPermanent: false,
            }),
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          check(avoidanceRes, {
            "add avoidance area response received": (r) => r.status !== 0,
          });
        });
      }
    });

    // Get Permanent Avoidance Areas
    group("Get Permanent Avoidance Areas", () => {
      const res = http.get(`${BASE_URL}/route-plans/avoidance/permanent`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      check(res, {
        "get permanent avoidance areas response received": (r) =>
          r.status !== 0,
      });
    });

    // Get Non-Permanent Avoidance Areas
    group("Get Non-Permanent Avoidance Areas", () => {
      const res = http.get(`${BASE_URL}/route-plans/avoidance/non-permanent`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      check(res, {
        "get non-permanent avoidance areas response received": (r) =>
          r.status !== 0,
      });
    });

    // Get All Route Plans
    group("Get All Route Plans", () => {
      const res = http.get(`${BASE_URL}/route-plans`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      check(res, {
        "get all route plans status is 200": (r) => r.status === 200,
        "route plans data exists": (r) => JSON.parse(r.body).data !== undefined,
      });
    });
  });

  sleep(1);
}
