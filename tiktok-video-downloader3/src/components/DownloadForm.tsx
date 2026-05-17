"use client";

import { useState } from "react";
import { DownloadResponse } from "@/types";

export default function DownloadForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<DownloadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data: DownloadResponse = await res.json();
      setResponse(data);

      if (!data.success) {
        setError(data.error || "Download failed");
      } else {
        setUrl(""); // Clear input on success
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="url"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            TikTok Video URL
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@username/video/..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {loading ? "Downloading..." : "Download Video"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {response?.success && response.data && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">Success!</p>
          <div className="text-sm text-green-700 space-y-1 mt-2">
            {response.data.title && <p>Title: {response.data.title}</p>}
            {response.data.author && <p>Author: {response.data.author}</p>}
            {response.data.downloadUrl && (
              <a
                href={response.data.downloadUrl}
                download
                className="text-blue-600 hover:underline block mt-2"
              >
                Download File
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
