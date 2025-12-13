import { NextRequest, NextResponse } from "next/server";
import { validateDownloadRequest } from "@/lib/utils/validation";
import { fetchTikTokVideo } from "@/lib/api/tiktok";
import { DownloadRequest, DownloadResponse } from "@/types";

/**
 * POST /api/download
 * Download a TikTok video
 */
export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequest = await request.json();
    const { url } = body;

    // Validate the request
    const validation = validateDownloadRequest(url);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error || "Invalid request",
          error: validation.error,
        } as DownloadResponse,
        { status: 400 }
      );
    }

    // Fetch video information
    const result = await fetchTikTokVideo(url);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to process download request",
        error: errorMessage,
      } as DownloadResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/download
 * Get download history
 */
export async function GET() {
  try {
    // Placeholder for fetching download history from database
    return NextResponse.json(
      {
        success: true,
        message: "Download history retrieved successfully",
        data: [],
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve download history",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
