import { NextResponse } from "next/server";
export const maxDuration = 120;

export async function GET() {
  const API_URL = "https://opensky-network.org/api/states/all";

  try {
    // Fetch data from the external OpenSky Network API
    const res = await fetch(API_URL, {
      headers: {
        "Content-Type": "application/json",
      },
      // Revalidate cache every 30 seconds
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      // Forward any errors from the external API
      return NextResponse.json(
        { error: `Failed to fetch external plane data: ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    let errorMessage = "An internal server error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
