import { NextResponse } from "next/server";
export const maxDuration = 120; // Keep your increased function duration setting

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET() {
  const API_URL = "https://opensky-network.org/api/states/all";
  console.log(`[${new Date().toISOString()}] /api/planes: Function invoked.`);

  let retries = 2; // Number of retries (e.g., try initial + 2 retries = 3 total attempts)
  let lastError: any = null; // Store the last error encountered

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    // Keep the overall fetch timeout relatively short for each attempt
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
        const waitTime = attempt * 1000; // Exponential backoff (1s, 2s)
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
        }): Attempting to fetch from ${API_URL}`
      );

      const res = await fetch(API_URL, {
        method: "GET", // Explicitly setting method can sometimes help
        headers: {
          "Content-Type": "application/json",
          // OpenSky doesn't require auth, but some APIs might need 'User-Agent'
        },
        next: { revalidate: 30 }, // Keep caching strategy
        signal: controller.signal,
        // Consider removing keepalive if not needed, might interact with timeouts
        // keepalive: false
      });

      clearTimeout(timeoutId); // Clear timeout as fetch completed (successfully or not)

      console.log(
        `[${new Date().toISOString()}] /api/planes (Attempt ${
          attempt + 1
        }): Fetch completed. Status: ${res.status}`
      );

      if (res.ok) {
        console.log(
          `[${new Date().toISOString()}] /api/planes: Response OK. Attempting to parse JSON.`
        );
        const data = await res.json();
        console.log(
          `[${new Date().toISOString()}] /api/planes: JSON parsed successfully. Returning data.`
        );
        return NextResponse.json(data); // Success, return the data immediately
      }

      // Handle non-ok responses (4xx, 5xx from OpenSky)
      console.error(
        `[${new Date().toISOString()}] /api/planes (Attempt ${
          attempt + 1
        }): Fetch failed with status ${res.status} ${res.statusText}`
      );
      let errorBody = `Status: ${res.status} ${res.statusText}`;
      try {
        errorBody = await res.text();
      } catch (bodyError) {
        console.warn(
          `[${new Date().toISOString()}] /api/planes: Could not read error body.`
        );
      }
      lastError = {
        // Store error details for potential final response
        status: res.status,
        message: `Failed to fetch external plane data: ${res.statusText}`,
        details: errorBody,
      };
      // If it's a client error (4xx) or a persistent server error (5xx on last attempt), don't retry unnecessarily
      if ((res.status >= 400 && res.status < 500) || attempt === retries) {
        return NextResponse.json(
          { error: lastError.message, details: lastError.details },
          { status: lastError.status }
        );
      }
    } catch (error: any) {
      clearTimeout(timeoutId); // Clear timeout on any fetch error
      lastError = error; // Store the error
      console.error(
        `[${new Date().toISOString()}] /api/planes (Attempt ${
          attempt + 1
        }): Caught error:`,
        error
      );

      // Check if the error was due to our explicit abort (timeout)
      if (error.name === "AbortError") {
        // If AbortError happens on the last attempt, return 504
        if (attempt === retries) {
          console.error(
            `[${new Date().toISOString()}] /api/planes: Fetch aborted due to timeout (${timeoutMs}ms) on final attempt.`
          );
          return NextResponse.json(
            {
              error: `Request to external API timed out after ${
                timeoutMs / 1000
              } seconds.`,
            },
            { status: 504 }
          ); // Gateway Timeout
        }
        // Otherwise, the loop will continue to the next retry
      }
      // If it's another type of error on the last attempt, return 500
      else if (attempt === retries) {
        let errorMessage = "An internal server error occurred after retries";
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        return NextResponse.json(
          {
            error: errorMessage,
            details: error instanceof Error ? error.stack : String(error),
          },
          { status: 500 }
        );
      }
      // Otherwise, the loop will continue to the next retry
    }
  }

  // Should theoretically not be reached if retries > 0, but as a fallback:
  console.error(
    `[${new Date().toISOString()}] /api/planes: All fetch attempts failed. Last error:`,
    lastError
  );
  return NextResponse.json(
    {
      error: "Failed to fetch data after multiple retries.",
      details: String(lastError),
    },
    { status: 500 }
  );
}
