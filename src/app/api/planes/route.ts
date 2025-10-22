import { NextResponse } from "next/server";
export const maxDuration = 120; // Keep your increased duration setting

export async function GET() {
  const API_URL = "https://opensky-network.org/api/states/all";
  console.log(`[${new Date().toISOString()}] /api/planes: Function invoked.`); // Log start

  try {
    console.log(
      `[${new Date().toISOString()}] /api/planes: Attempting to fetch from ${API_URL}`
    );
    const res = await fetch(API_URL, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 30 },
    });

    console.log(
      `[${new Date().toISOString()}] /api/planes: Fetch completed. Status: ${
        res.status
      }`
    ); // Log status immediately

    if (!res.ok) {
      console.error(
        `[${new Date().toISOString()}] /api/planes: Fetch failed with status ${
          res.status
        } ${res.statusText}`
      );
      // Try to get error body text if possible, but be careful as it might not be JSON
      let errorBody = `Status: ${res.status} ${res.statusText}`;
      try {
        errorBody = await res.text(); // Get raw text body
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
  } catch (error) {
    // Log the *entire* error object for maximum detail
    console.error(
      `[${new Date().toISOString()}] /api/planes: Caught error in try-catch block:`,
      error
    );
    let errorMessage = "An internal server error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Include the error message in the response body if possible
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
}
