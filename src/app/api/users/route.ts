import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Extract the 'hour' query parameter from the request's URL
  const { searchParams } = new URL(request.url);
  const hour = searchParams.get("hour");

  // Validate that the hour parameter exists and is a two-digit string
  if (!hour || !/^\d{2}$/.test(hour)) {
    return NextResponse.json(
      {
        error: "Invalid or missing hour parameter. Must be a two-digit number.",
      },
      { status: 400 }
    );
  }

  const API_URL = `https://a.windbornesystems.com/treasure/${hour}.json`;

  try {
    const res = await fetch(API_URL, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 }, // Cache the response for 60 seconds
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch external data: ${res.statusText}` },
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
