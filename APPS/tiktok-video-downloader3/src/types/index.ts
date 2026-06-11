export interface DownloadRequest {
  url: string;
  quality?: "high" | "medium" | "low";
}

export interface DownloadResponse {
  success: boolean;
  message: string;
  data?: {
    videoId: string;
    url: string;
    downloadUrl?: string;
    title?: string;
    author?: string;
    downloadedAt?: string;
  };
  error?: string;
}

export interface DownloadHistory {
  id: string;
  videoUrl: string;
  videoId: string;
  title: string | null;
  author: string | null;
  quality: string;
  downloadedAt: Date;
  status: "success" | "failed";
  errorMessage: string | null;
}
