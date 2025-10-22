import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 120; // Keep increased duration

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Define North America Bounding Box ---
const NA_BOUNDS = {
  minLat: 15, // Approx Southern boundary
  maxLat: 85, // Approx Northern boundary
  minLon: -170, // Approx Western boundary
  maxLon: -50, // Approx Eastern boundary
};

export async function GET(request: NextRequest) {
  // request parameter might still be useful for headers etc. later

  // Construct the scoped API URL using the hardcoded North America bounds
  const API_URL = `https://opensky-network.org/api/states/all?lamin=${NA_BOUNDS.minLat}&lomin=${NA_BOUNDS.minLon}&lamax=${NA_BOUNDS.maxLat}&lomax=${NA_BOUNDS.maxLon}`;

  console.log(
    `[${new Date().toISOString()}] /api/planes: Function invoked. Fetching North America plane data.`
  );

  let retries = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutMs = 20000; // 20 seconds per attempt
    const timeoutId = setTimeout(() => {
      console.log(
        `[${new Date().toISOString()}] /api/planes (Attempt ${
          attempt + 1
        }): Fetch timed out after ${timeoutMs}ms`
      );
      controller.abort();
    }, timeoutMs);

    try {
      if (attempt > 0) {
        const waitTime = attempt * 1000;
        console.log(
          `[${new Date().toISOString()}] /api/planes: Retrying fetch (Attempt ${
            attempt + 1
          }/${retries + 1}) after ${waitTime}ms delay...`
        );
        await delay(waitTime);
      }
      console.log(
        `[${new Date().toISOString()}] /api/planes (Attempt ${
          attempt + 1
        }): Attempting fetch: ${API_URL}`
      );

      const res = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        next: { revalidate: 30 }, // Keep caching
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(
        `[${new Date().toISOString()}] /api/planes (Attempt ${
          attempt + 1
        }): Fetch completed. Status: ${res.status}`
      );

      if (res.ok) {
        console.log(
          `[${new Date().toISOString()}] /api/planes: Response OK. Parsing JSON.`
        );
        const data = await res.json();
        console.log(
          `[${new Date().toISOString()}] /api/planes: JSON parsed. Returning data.`
        );
        // Note: OpenSky might return null for 'states' if no planes are in the box
        return NextResponse.json(data);
      }

      console.error(
        `[${new Date().toISOString()}] /api/planes (Attempt ${
          attempt + 1
        }): Fetch failed: ${res.status} ${res.statusText}`
      );
      let errorBody = `Status: ${res.status} ${res.statusText}`;
      try {
        errorBody = await res.text();
      } catch {
        /* ignore */
      }
      lastError = {
        status: res.status,
        message: `Failed fetch: ${res.statusText}`,
        details: errorBody,
      };

      // If it's a client error (4xx) or a persistent server error (5xx on last attempt), return immediately
      if ((res.status >= 400 && res.status < 500) || attempt === retries) {
        return NextResponse.json(
          { error: lastError.message, details: lastError.details },
          { status: lastError.status }
        );
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;
      console.error(
        `[${new Date().toISOString()}] /api/planes (Attempt ${
          attempt + 1
        }): Caught error:`,
        error
      );

      if (error.name === "AbortError") {
        // If AbortError happens on the last attempt, return 504
        if (attempt === retries) {
          console.error(
            `[${new Date().toISOString()}] /api/planes: Timeout (${timeoutMs}ms) on final attempt.`
          );
          return NextResponse.json(
            { error: `Request timed out after ${timeoutMs / 1000}s.` },
            { status: 504 }
          );
        }
        // Otherwise, the loop will continue to the next retry
      } else if (attempt === retries) {
        // If it's another type of error on the last attempt, return 500
        return NextResponse.json(
          {
            error: error.message || "Internal Server Error",
            details: error.stack,
          },
          { status: 500 }
        );
      }
      // Otherwise, the loop will continue to the next retry
    }
  }

  // Fallback if loop finishes without returning (shouldn't happen with retries > 0)
  console.error(
    `[${new Date().toISOString()}] /api/planes: All attempts failed. Last error:`,
    lastError
  );
  return NextResponse.json(
    { error: "Failed after multiple retries.", details: String(lastError) },
    { status: 500 }
  );
}
