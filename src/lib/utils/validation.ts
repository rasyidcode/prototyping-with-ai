/**
 * Validate if the provided URL is a valid TikTok video URL
 */
export function isTikTokUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    // Check for various TikTok URL formats
    return (
      hostname.includes("tiktok.com") ||
      hostname.includes("vm.tiktok.com") ||
      hostname.includes("vt.tiktok.com") ||
      hostname.includes("m.tiktok.com")
    );
  } catch {
    return false;
  }
}

/**
 * Extract video ID from TikTok URL
 */
export function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // For vm.tiktok.com or vt.tiktok.com (short URLs)
    if (
      urlObj.hostname.includes("vm.tiktok.com") ||
      urlObj.hostname.includes("vt.tiktok.com")
    ) {
      // These are redirect URLs, we might need to use the full URL
      return null;
    }

    // For regular tiktok.com URLs
    const pathname = urlObj.pathname;
    const match = pathname.match(/@[\w.]+\/video\/(\d+)/);

    if (match && match[1]) {
      return match[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validate the download request
 */
export function validateDownloadRequest(url: string): {
  valid: boolean;
  error?: string;
} {
  if (!url || url.trim().length === 0) {
    return { valid: false, error: "URL is required" };
  }

  if (!isTikTokUrl(url)) {
    return { valid: false, error: "Invalid TikTok URL" };
  }

  return { valid: true };
}
