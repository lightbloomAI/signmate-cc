import { NextRequest, NextResponse } from "next/server";

/**
 * Speech transcription proxy for Aldea API
 *
 * This endpoint receives audio data and forwards it to Aldea's
 * speech-to-text API with proper authentication headers.
 */

export async function POST(request: NextRequest) {
  try {
    // Get API key from header
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    // Get audio data from request body
    const audioData = await request.arrayBuffer();
    if (!audioData || audioData.byteLength === 0) {
      return NextResponse.json(
        { error: "No audio data provided" },
        { status: 400 },
      );
    }

    // Get content type from request (default to webm)
    const contentType = request.headers.get("content-type") || "audio/webm";

    // Forward to Aldea API
    const response = await fetch("https://api.aldea.ai/v1/listen", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": contentType,
        timestamps: "true",
      },
      body: audioData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Aldea] Error:", response.status, errorText);
      return NextResponse.json(
        { error: `Aldea API error: ${response.status}`, details: errorText },
        { status: response.status },
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Speech API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}
