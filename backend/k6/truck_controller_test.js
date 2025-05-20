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

  group("Truck Controller Tests", () => {
    // Create Truck
    group("Create Truck", () => {
      const randomMacID = `MAC${randomString(8)}`;
      const randomPlate = `B${Math.floor(Math.random() * 9999)}XYZ`;

      const res = http.post(
        `${BASE_URL}/trucks`,
        JSON.stringify({
          name: `Test Truck ${randomString(5)}`,
          model: "Test Model",
          plateNumber: randomPlate,
          macID: randomMacID,
        }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      check(res, {
        "create truck response received": (r) => r.status !== 0,
      });

      // If the truck was created successfully, test the get by macID endpoint
      if (res.status === 201 || res.status === 200) {
        const createdTruck = JSON.parse(res.body).data;

        // Get Truck by MacID
        group("Get Truck by MacID", () => {
          const getTruckRes = http.get(`${BASE_URL}/trucks/${randomMacID}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          check(getTruckRes, {
            "get truck by macID response received": (r) => r.status !== 0,
          });
        });

        // Update Truck
        group("Update Truck", () => {
          const updateRes = http.put(
            `${BASE_URL}/trucks/${randomMacID}`,
            JSON.stringify({
              name: `Updated Truck ${randomString(5)}`,
              model: "Updated Model",
              plateNumber: randomPlate,
            }),
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          check(updateRes, {
            "update truck response received": (r) => r.status !== 0,
          });
        });

        // Get Truck Position History
        group("Get Truck Position History", () => {
          const historyRes = http.get(
            `${BASE_URL}/trucks/${
              createdTruck ? createdTruck.id : 1
            }/positions/limited`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          check(historyRes, {
            "get position history response received": (r) => r.status !== 0,
          });
        });

        // Get Truck Fuel History
        group("Get Truck Fuel History", () => {
          const fuelHistoryRes = http.get(
            `${BASE_URL}/trucks/${
              createdTruck ? createdTruck.id : 1
            }/fuel/limited`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          check(fuelHistoryRes, {
            "get fuel history response received": (r) => r.status !== 0,
          });
        });

        // Get Truck Idle Detections
        group("Get Truck Idle Detections", () => {
          const idleRes = http.get(
            `${BASE_URL}/trucks/${
              createdTruck ? createdTruck.id : 1
            }/idle-detections`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          check(idleRes, {
            "get idle detections response received": (r) => r.status !== 0,
          });
        });
      }
    });

    // Get All Trucks
    group("Get All Trucks", () => {
      const res = http.get(`${BASE_URL}/trucks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      check(res, {
        "get all trucks status is 200": (r) => r.status >= 200 && r.status < 300,
      });
    });
  });

  sleep(1);
}
