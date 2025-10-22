import { NextRequest, NextResponse } from "next/server";
export const maxDuration = 120; // Keep increased duration

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // --- Read bounding box params from query ---
  const lamin = searchParams.get("lamin");
  const lomin = searchParams.get("lomin");
  const lamax = searchParams.get("lamax");
  const lomax = searchParams.get("lomax");

  // --- Validate parameters ---
  if (!lamin || !lomin || !lamax || !lomax) {
    return NextResponse.json(
      { error: "Missing bounding box parameters (lamin, lomin, lamax, lomax)" },
      { status: 400 }
    );
  }
  // Basic validation (can be made more robust)
  if (
    isNaN(parseFloat(lamin)) ||
    isNaN(parseFloat(lomin)) ||
    isNaN(parseFloat(lamax)) ||
    isNaN(parseFloat(lomax))
  ) {
    return NextResponse.json(
      { error: "Invalid bounding box parameters. Must be numbers." },
      { status: 400 }
    );
  }

  // Construct the scoped API URL using query parameters
  const API_URL = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

  console.log(
    `[${new Date().toISOString()}] /api/planes: Function invoked. Fetching scoped data.`
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
        if (attempt === retries) {
          console.error(
            `[${new Date().toISOString()}] /api/planes: Timeout (${timeoutMs}ms) on final attempt.`
          );
          return NextResponse.json(
            { error: `Request timed out after ${timeoutMs / 1000}s.` },
            { status: 504 }
          );
        }
      } else if (attempt === retries) {
        return NextResponse.json(
          {
            error: error.message || "Internal Server Error",
            details: error.stack,
          },
          { status: 500 }
        );
      }
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
