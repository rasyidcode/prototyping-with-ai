/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ExtractedVideoInfo {
  downloadUrl: string | null;
  title?: string | null;
  author?: string | null;
  raw?: any;
}

function chooseBestFormatUrl(
  formats: Record<string, unknown>[] | null | undefined
): string | null {
  if (!Array.isArray(formats) || formats.length === 0) return null;
  const withUrl = formats.filter((f) => f && (f.url || f.protocol));
  if (withUrl.length === 0) return null;
  withUrl.sort((a: any, b: any) => {
    const aSize = a.filesize || a.height || 0;
    const bSize = b.filesize || b.height || 0;
    return bSize - aSize;
  });
  return (withUrl[0].url as string) || (withUrl[0].protocol as string) || null;
}

/**
 * Extract video metadata and a direct download URL using system binaries.
 * Order:
 * 1) `yt-dlp -J <url>`
 * 2) `youtube-dl -J <url>`
 */
export async function extractWithYtDlp(
  url: string
): Promise<ExtractedVideoInfo> {
  // Try yt-dlp first
  try {
    const { stdout } = await execFileAsync("yt-dlp", ["-J", url], {
      maxBuffer: 10 * 1024 * 1024,
    });
    const info = JSON.parse(stdout as string);
    const formats = info?.formats || info?.requested_formats || null;
    const downloadUrl = chooseBestFormatUrl(formats) || info?.url || null;

    return {
      downloadUrl,
      title: info?.title ?? null,
      author: info?.uploader ?? info?.creator ?? null,
      raw: info,
    };
  } catch (err) {
    console.error("Error: ", err);
    throw new Error(
      "No extractor available: ensure `yt-dlp` is installed and on PATH"
    );
  }
}
