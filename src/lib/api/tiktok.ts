/**
 * TikTok Video Downloader API
 * Handles fetching TikTok video information and download links
 */

import { DownloadResponse } from "@/types";
import { isTikTokUrl, extractVideoId } from "@/lib/utils/validation";
import { extractWithYtDlp } from "@/lib/downloader/yt-dlp";

interface TikTokVideoInfo {
  videoId: string;
  title: string;
  author: string;
  videoUrl: string;
  downloadUrl: string;
}

/**
 * Fetch TikTok video information and generate download link
 * Note: This is a placeholder implementation. In production, you would use
 * a real TikTok API or a third-party service to fetch video metadata.
 */
export async function fetchTikTokVideo(url: string): Promise<DownloadResponse> {
  try {
    // Validate URL
    if (!isTikTokUrl(url)) {
      return {
        success: false,
        message: "Invalid TikTok URL",
        error: "The provided URL is not a valid TikTok video URL",
      };
    }

    const videoId = extractVideoId(url);

    // Use yt-dlp to extract metadata and a direct download URL
    try {
      const info = await extractWithYtDlp(url);

      return {
        success: true,
        message: "Video information fetched successfully",
        data: {
          videoId: videoId || info.raw?.id || "unknown",
          url,
          downloadUrl: info.downloadUrl || undefined,
          title: info.title || undefined,
          author: info.author || undefined,
          downloadedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      return {
        success: false,
        message: "Failed to extract video with yt-dlp",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Failed to fetch video information",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
