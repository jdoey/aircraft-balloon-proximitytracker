"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import BalloonList from "@/components/BalloonList";
import ResultsPanel from "@/components/ResultsPanel";
import { calculateDistance } from "@/lib/helpers";
import type { Balloon, Plane } from "@/lib/types";
import { MOCK_PLANES } from "@/lib/mockData";

// Type definitions for API responses
type RawBalloonObject = {
  id: string;
  lat?: number;
  lon?: number;
  alt?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
};
type RawBalloonData = RawBalloonObject[] | number[][];
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

export default function Home() {
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [planes, setPlanes] = useState<Plane[]>([]);
  const [selectedBalloon, setSelectedBalloon] = useState<Balloon | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);

      try {
        // --- Fetch Plane Data with Fallback ---
        const planeRes = await fetch("/api/planes");
        if (planeRes.ok) {
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
          } else {
            console.warn("Live plane API returned no states. Using mock data.");
            setPlanes(MOCK_PLANES);
          }
        } else {
          // If API fails (e.g., 503 error), fall back to mock data
          console.error(
            `Failed to fetch live plane data (status: ${planeRes.status}). Falling back to mock data.`
          );
          setError(
            "Could not fetch live plane data; using mock data as a fallback."
          );
          setPlanes(MOCK_PLANES);
        }

        // --- Fetch Balloon Data Sequentially ---
        const latestBalloonData = new Map<string, Balloon>();
        let anyRequestFailed = false;

        for (let i = 23; i >= 0; i--) {
          const hour = i.toString().padStart(2, "0");
          try {
            const res = await fetch(`/api/users?hour=${hour}`);
            if (res.ok) {
              const rawData: RawBalloonData = await res.json();
              if (Array.isArray(rawData) && rawData.length > 0) {
                const firstItem = rawData[0];
                if (
                  Array.isArray(firstItem) &&
                  typeof firstItem[0] === "number"
                ) {
                  (rawData as number[][]).forEach((b, index) => {
                    const [lat, lon, alt] = b;
                    const id = `WBS-H${hour}-${index}`;
                    if (lat != null && lon != null) {
                      latestBalloonData.set(id, {
                        id,
                        lat,
                        lon,
                        alt: (alt ?? 0) * 1000,
                      });
                    }
                  });
                } else if (typeof firstItem === "object" && "id" in firstItem) {
                  (rawData as RawBalloonObject[]).forEach((b) => {
                    const lat = b.lat ?? b.latitude;
                    const lon = b.lon ?? b.longitude;
                    if (b.id != null && lat != null && lon != null) {
                      latestBalloonData.set(b.id, {
                        id: b.id,
                        lat,
                        lon,
                        alt: (b.alt ?? b.altitude ?? 0) * 0.3048,
                      });
                    }
                  });
                }
              }
            } else {
              console.warn(
                `Request for hour ${hour} failed with status ${res.status}`
              );
              anyRequestFailed = true;
            }
          } catch (e) {
            console.error(`Error fetching data for hour ${hour}:`, e);
            anyRequestFailed = true;
          }
        }

        const allBalloons: Balloon[] = Array.from(latestBalloonData.values());
        const finalBalloons = allBalloons.slice(0, 100);
        setBalloons(finalBalloons);

        if (finalBalloons.length === 0 && !error) {
          // Only set error if one isn't already set
          setError(
            anyRequestFailed
              ? "Some API requests failed."
              : "No valid balloon data found in the last 24 hours."
          );
        }
      } catch (err) {
        // This will catch critical network errors for the plane API as well
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
        console.error(
          "A critical error occurred during data fetching. Falling back to mock plane data.",
          err
        );
        setPlanes(MOCK_PLANES); // Fallback in case of total fetch failure
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const { closestPlane, distance } = useMemo(() => {
    if (!selectedBalloon || planes.length === 0) {
      return { closestPlane: null, distance: null };
    }
    let closest: Plane | null = null;
    let minDistance = Infinity;
    for (const plane of planes) {
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
    return { closestPlane: closest, distance: minDistance };
  }, [selectedBalloon, planes]);

  const handleBalloonSelect = (balloonId: string) => {
    const balloon = balloons.find((b) => b.id === balloonId);
    setSelectedBalloon(balloon || null);
  };

  const statusText = useMemo(() => {
    if (loading) return "Fetching live data for balloons and planes...";
    if (error) return `Error: ${error}`;
    return `Tracking ${balloons.length} balloons and ${planes.length} planes.`;
  }, [loading, error, balloons.length, planes.length]);

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
