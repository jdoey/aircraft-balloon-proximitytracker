import { NextResponse } from "next/server";
import type { Balloon } from "@/lib/types"; // Assuming types are in lib

// Set max duration for this specific function (Vercel Pro/Enterprise/Fluid)
export const maxDuration = 300; // 5 minutes in seconds

// Type definitions for API responses (can be moved to lib/types if preferred)
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

// --- Define North America Bounding Box ---
const NA_BOUNDS = {
  minLat: 15, // Approx Southern boundary
  maxLat: 85, // Approx Northern boundary
  minLon: -170, // Approx Western boundary
  maxLon: -50, // Approx Eastern boundary
};

// Helper function to check if coordinates are within North America
const isWithinNorthAmerica = (lat: number, lon: number): boolean => {
  return (
    lat >= NA_BOUNDS.minLat &&
    lat <= NA_BOUNDS.maxLat &&
    lon >= NA_BOUNDS.minLon &&
    lon <= NA_BOUNDS.maxLon
  );
};
// -----------------------------------------

export async function GET() {
  const latestBalloonData = new Map<string, Balloon>();
  let anyRequestFailed = false;
  const fetchErrors: string[] = [];
  // Define timeoutMs here so it's accessible in the catch block
  const timeoutMs = 25000; // 25 seconds for *each* sequential fetch

  console.log(
    "Starting sequential fetch for 24-hour balloon history (North America)..."
  );

  // Sequentially fetch data for each hour from 23 down to 00
  for (let i = 23; i >= 0; i--) {
    const hour = i.toString().padStart(2, "0");
    const API_URL = `https://a.windbornesystems.com/treasure/${hour}.json`;
    // console.log(`Fetching: ${API_URL}`); // Less verbose logging

    try {
      // Use a slightly longer timeout for each individual fetch within the sequence
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(API_URL, {
        headers: {
          "Content-Type": "application/json",
        },
        // Cache each hourly response moderately
        next: { revalidate: 60 },
        signal: controller.signal,
      });

      clearTimeout(timeoutId); // Clear timeout if fetch succeeded or failed quickly

      if (res.ok) {
        try {
          const rawData: RawBalloonData = await res.json();
          if (Array.isArray(rawData) && rawData.length > 0) {
            const firstItem = rawData[0];
            if (Array.isArray(firstItem) && typeof firstItem[0] === "number") {
              (rawData as number[][]).forEach((b, index) => {
                const [lat, lon, alt] = b;
                // *** ADD North America Check ***
                if (
                  lat != null &&
                  lon != null &&
                  isWithinNorthAmerica(lat, lon)
                ) {
                  const id = `WBS-H${hour}-${index}`;
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
                // *** ADD North America Check ***
                if (
                  b.id != null &&
                  lat != null &&
                  lon != null &&
                  isWithinNorthAmerica(lat, lon)
                ) {
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
        } catch (e) {
          console.warn(`Failed to parse JSON for hour ${hour}.json`, e);
          // Optionally count as a failure depending on requirements
        }
      } else {
        console.warn(
          `Request for hour ${hour} failed with status ${res.status}`
        );
        anyRequestFailed = true;
        fetchErrors.push(`Hour ${hour}: Status ${res.status}`);
      }
    } catch (e: any) {
      // Handle fetch errors, including AbortError from timeout
      if (e.name === "AbortError") {
        // Now timeoutMs is accessible here
        console.error(
          `Error fetching data for hour ${hour}: Fetch timed out after ${timeoutMs}ms`
        );
        fetchErrors.push(`Hour ${hour}: Fetch Timeout`);
      } else {
        console.error(`Error fetching data for hour ${hour}:`, e);
        fetchErrors.push(`Hour ${hour}: Fetch Error (${e.message})`);
      }
      anyRequestFailed = true;
    }
  }

  const allBalloons: Balloon[] = Array.from(latestBalloonData.values());
  // Still limit the *final* result to 10, even if more were found in NA
  const finalBalloons = allBalloons.slice(0, 50);

  console.log(
    `Finished fetching. Found ${allBalloons.length} unique balloons in NA, returning ${finalBalloons.length}. Any failures: ${anyRequestFailed}`
  );

  // Return the processed data or an error
  if (finalBalloons.length === 0 && anyRequestFailed) {
    // If requests failed *and* we have no data, return a server error
    return NextResponse.json(
      {
        error:
          "Some API requests failed, and no valid balloon data could be retrieved for North America.",
        details: fetchErrors,
      },
      { status: 502 }
    ); // Bad Gateway
  }
  if (finalBalloons.length === 0) {
    // If all requests succeeded but returned no data *within NA*, return empty array
    console.log(
      "Returning empty balloon array as no data was found within North America."
    );
    return NextResponse.json([]); // Return empty array
  }

  // Success case: return the found balloons
  return NextResponse.json(finalBalloons);
}
