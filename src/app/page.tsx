"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import BalloonList from "@/components/BalloonList";
import ResultsPanel from "@/components/ResultsPanel";
import { calculateDistance } from "@/lib/helpers";
import type { Balloon, Plane } from "@/lib/types";
// *** Import MOCK_PLANES_NA specifically ***
import { MOCK_PLANES_NA } from "@/lib/mockData";

// Type definitions for API responses
type RawPlaneState = (string | number | boolean | null)[];
type RawPlaneData = {
  time: number;
  states: RawPlaneState[] | null;
};

// Rename the component to avoid collision with the built-in 'Map' object.
const DynamicMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-gray-900 flex items-center justify-center">
      <p>Loading Map...</p>
    </div>
  ),
});

// Helper function to calculate bounds from balloons
const calculateBounds = (
  balloons: Balloon[],
  padding = 5
): { lamin: number; lomin: number; lamax: number; lomax: number } | null => {
  if (!balloons || balloons.length === 0) {
    return null; // No balloons, no bounds
  }

  let minLat = 90,
    maxLat = -90,
    minLon = 180,
    maxLon = -180;

  balloons.forEach((b) => {
    if (typeof b.lat === "number" && typeof b.lon === "number") {
      minLat = Math.min(minLat, b.lat);
      maxLat = Math.max(maxLat, b.lat);
      minLon = Math.min(minLon, b.lon);
      maxLon = Math.max(maxLon, b.lon);
    }
  });

  // Add padding to the bounds
  minLat = Math.max(-90, minLat - padding);
  maxLat = Math.min(90, maxLat + padding);
  minLon = Math.max(-180, minLon - padding);
  maxLon = Math.min(180, maxLon + padding);

  // Handle cases where only one balloon is found
  if (balloons.length === 1) {
    minLat = Math.max(-90, minLat - padding);
    maxLat = Math.min(90, maxLat + padding);
    minLon = Math.max(-180, minLon - padding);
    maxLon = Math.min(180, maxLon + padding);
  }

  return { lamin: minLat, lomin: minLon, lamax: maxLat, lomax: maxLon };
};

export default function Home() {
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [planes, setPlanes] = useState<Plane[]>([]);
  const [selectedBalloon, setSelectedBalloon] = useState<Balloon | null>(null);
  const [loadingBalloons, setLoadingBalloons] = useState<boolean>(true);
  const [loadingPlanes, setLoadingPlanes] = useState<boolean>(false); // Initially false
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalloonsAndThenPlanes = async () => {
      setLoadingBalloons(true);
      setLoadingPlanes(false); // Reset plane loading state
      setError(null);
      setBalloons([]); // Clear previous data
      setPlanes([]); // Clear previous data

      let fetchedBalloons: Balloon[] = [];
      let planeDataUsedIsMock = false; // Flag to track if fallback was used

      // --- Step 1: Fetch Consolidated Balloon History ---
      try {
        console.log("Fetching balloon history...");
        const balloonRes = await fetch("/api/balloon-history");

        if (!balloonRes.ok) {
          let errorData = { error: `HTTP error! Status: ${balloonRes.status}` };
          try {
            const potentialJson = await balloonRes.json();
            if (potentialJson && potentialJson.error) {
              errorData = potentialJson;
            }
          } catch {
            /* ignore */
          }
          console.error(
            `Failed to fetch balloon history (status: ${balloonRes.status}):`,
            errorData.error
          );
          setError(errorData.error);
          setLoadingBalloons(false);
          return;
        }

        const contentType = balloonRes.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          fetchedBalloons = await balloonRes.json();
          setBalloons(fetchedBalloons);
          if (fetchedBalloons.length === 0) {
            // Keep the error state clean if balloon fetch succeeded but was empty
            // setError("No valid balloon data found in the last 24 hours.");
            console.log("No valid balloon data found in the last 24 hours.");
          }
          console.log(`Fetched ${fetchedBalloons.length} balloons.`);
        } else {
          const responseText = await balloonRes.text();
          console.error(
            `Failed to fetch balloon history: Expected JSON but received ${contentType}. Response body:`,
            responseText.substring(0, 500)
          );
          setError(
            `Server returned unexpected content type (${contentType}) for balloons.`
          );
          setLoadingBalloons(false);
          return;
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An unknown error occurred fetching balloons."
        );
        console.error("Critical error fetching balloons:", err);
        setLoadingBalloons(false);
        return;
      } finally {
        setLoadingBalloons(false);
      }

      // --- Step 2: Calculate Bounds and Fetch Planes ---
      const bounds = calculateBounds(fetchedBalloons);
      if (!bounds) {
        console.warn(
          "Could not calculate bounds from balloon data (list might be empty). Using NA mock data as fallback."
        );
        setPlanes(MOCK_PLANES_NA); // Use NA mock data if no bounds
        planeDataUsedIsMock = true;
        // Don't set loadingPlanes to true if we aren't fetching
        return;
      }

      setLoadingPlanes(true);
      try {
        console.log(`Fetching planes within bounds: ${JSON.stringify(bounds)}`);
        const planeRes = await fetch(
          `/api/planes?lamin=${bounds.lamin}&lomin=${bounds.lomin}&lamax=${bounds.lamax}&lomax=${bounds.lomax}`
        );
        if (planeRes.ok) {
          const contentTypePlanes = planeRes.headers.get("content-type");
          if (
            contentTypePlanes &&
            contentTypePlanes.indexOf("application/json") !== -1
          ) {
            const rawPlaneData: RawPlaneData = await planeRes.json();
            if (rawPlaneData.states) {
              const processedPlanes = rawPlaneData.states
                .filter((p) => p[5] != null && p[6] != null && !p[8])
                .map(
                  (p): Plane => ({
                    icao24: p[0] as string,
                    callsign: ((p[1] as string) || "N/A").trim(),
                    origin_country: p[2] as string,
                    lon: p[5] as number,
                    lat: p[6] as number,
                    baro_altitude: p[7] as number | null,
                  })
                );
              setPlanes(processedPlanes);
              console.log(`Fetched ${processedPlanes.length} planes.`);
            } else {
              console.warn(
                "Plane API returned ok and JSON, but no 'states' array found. Using NA mock data."
              );
              setPlanes(MOCK_PLANES_NA); // Use NA mock data if 'states' is missing/null
              planeDataUsedIsMock = true;
            }
          } else {
            const responseText = await planeRes.text();
            console.error(
              `Failed to fetch planes: Expected JSON but received ${contentTypePlanes}. Response body:`,
              responseText.substring(0, 500)
            );
            setError(
              `Server returned unexpected content type (${contentTypePlanes}) for planes. Using NA mock data.`
            );
            setPlanes(MOCK_PLANES_NA); // Use NA mock data on content type error
            planeDataUsedIsMock = true;
          }
        } else {
          let errorData = {
            error: `Plane fetch failed! Status: ${planeRes.status}`,
          };
          try {
            errorData = await planeRes.json();
          } catch {
            /* ignore */
          }
          console.error(
            `Failed to fetch plane data (status: ${planeRes.status}). Using NA mock data.`,
            errorData.error
          );
          // Set error state *before* setting mock data
          setError(
            errorData.error ||
              `Failed to fetch plane data (status: ${planeRes.status}). Using mock data.`
          );
          setPlanes(MOCK_PLANES_NA); // *** Use MOCK_PLANES_NA as fallback ***
          planeDataUsedIsMock = true;
        }
      } catch (err) {
        // Set error state *before* setting mock data
        setError(
          err instanceof Error
            ? err.message
            : "An unknown error occurred fetching planes. Using mock data."
        );
        console.error(
          "Critical error fetching planes. Using NA mock data.",
          err
        );
        setPlanes(MOCK_PLANES_NA); // *** Use MOCK_PLANES_NA as fallback ***
        planeDataUsedIsMock = true;
      } finally {
        setLoadingPlanes(false);
      }
    };

    fetchBalloonsAndThenPlanes();
  }, []); // Run only once on mount

  const { closestPlane, distance } = useMemo(() => {
    if (!selectedBalloon || planes.length === 0) {
      return { closestPlane: null, distance: null };
    }
    let closest: Plane | null = null;
    let minDistance = Infinity;
    for (const plane of planes) {
      if (
        typeof plane.lat === "number" &&
        typeof plane.lon === "number" &&
        typeof selectedBalloon.lat === "number" &&
        typeof selectedBalloon.lon === "number"
      ) {
        const dist = calculateDistance(
          selectedBalloon.lat,
          selectedBalloon.lon,
          plane.lat,
          plane.lon
        );
        if (dist < minDistance) {
          minDistance = dist;
          closest = plane;
        }
      }
    }
    return { closestPlane: closest, distance: minDistance };
  }, [selectedBalloon, planes]);

  const handleBalloonSelect = (balloonId: string) => {
    const balloon = balloons.find((b) => b.id === balloonId);
    setSelectedBalloon(balloon || null);
  };

  const statusText = useMemo(() => {
    if (loadingBalloons) return "Fetching balloon history...";
    if (loadingPlanes)
      return `Fetching planes near ${balloons.length} balloons...`;
    if (error) return `Error: ${error}`;
    return `Tracking ${balloons.length} balloons and ${planes.length} planes.`;
  }, [loadingBalloons, loadingPlanes, error, balloons.length, planes.length]);

  return (
    <div className="bg-gray-900 text-gray-200 flex flex-col h-screen overflow-hidden font-sans">
      <Header statusText={statusText} />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <BalloonList
          balloons={balloons}
          onSelect={handleBalloonSelect}
          selectedId={selectedBalloon?.id || null}
        />
        <main className="flex-1 flex flex-col">
          <DynamicMap
            balloons={balloons}
            planes={planes}
            selectedBalloon={selectedBalloon}
            closestPlane={closestPlane}
          />
          {selectedBalloon && (
            <ResultsPanel
              balloon={selectedBalloon}
              plane={closestPlane}
              distance={distance}
            />
          )}
        </main>
      </div>
    </div>
  );
}
