import { NextResponse } from "next/server";
export const maxDuration = 120; // Keep your increased function duration setting

export async function GET() {
  const API_URL = "https://opensky-network.org/api/states/all";
  console.log(`[${new Date().toISOString()}] /api/planes: Function invoked.`);

  // --- Add AbortController for fetch timeout ---
  const controller = new AbortController();
  const timeoutMs = 30000; // Increase fetch timeout to 30 seconds (adjust as needed)
  const timeoutId = setTimeout(() => {
    console.log(
      `[${new Date().toISOString()}] /api/planes: Fetch timed out after ${timeoutMs}ms`
    );
    controller.abort();
  }, timeoutMs);
  // ---------------------------------------------

  try {
    console.log(
      `[${new Date().toISOString()}] /api/planes: Attempting to fetch from ${API_URL}`
    );
    const res = await fetch(API_URL, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 },
      // --- Pass the AbortSignal to fetch ---
      signal: controller.signal,
      // ------------------------------------
    });

    // --- Clear the timeout if fetch completes successfully ---
    clearTimeout(timeoutId);
    // ------------------------------------------------------

    console.log(
      `[${new Date().toISOString()}] /api/planes: Fetch completed. Status: ${
        res.status
      }`
    );

    if (!res.ok) {
      console.error(
        `[${new Date().toISOString()}] /api/planes: Fetch failed with status ${
          res.status
        } ${res.statusText}`
      );
      let errorBody = `Status: ${res.status} ${res.statusText}`;
      try {
        errorBody = await res.text();
      } catch (bodyError) {
        console.warn(
          `[${new Date().toISOString()}] /api/planes: Could not read error body.`
        );
      }
      return NextResponse.json(
        {
          error: `Failed to fetch external plane data: ${res.statusText}`,
          details: errorBody,
        },
        { status: res.status }
      );
    }

    console.log(
      `[${new Date().toISOString()}] /api/planes: Response OK. Attempting to parse JSON.`
    );
    const data = await res.json();
    console.log(
      `[${new Date().toISOString()}] /api/planes: JSON parsed successfully. Returning data.`
    );
    return NextResponse.json(data);
  } catch (error: any) {
    // Type error as any to check its name property
    // --- Clear the timeout if fetch throws an error (including abort) ---
    clearTimeout(timeoutId);
    // -------------------------------------------------------------

    // Check if the error was due to our explicit abort (timeout)
    if (error.name === "AbortError") {
      console.error(
        `[${new Date().toISOString()}] /api/planes: Fetch aborted due to timeout (${timeoutMs}ms).`
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

    // Log other errors
    console.error(
      `[${new Date().toISOString()}] /api/planes: Caught error in try-catch block:`,
      error
    );
    let errorMessage = "An internal server error occurred";
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
}
