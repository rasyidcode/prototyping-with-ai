package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"tiktok-downloader/downloader"
)

type DownloadRequest struct {
	URL string `json:"url"`
}

func HandleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, "templates/index.html")
}

func HandleDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req DownloadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	url := strings.TrimSpace(req.URL)
	if url == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	outputDir := "downloads"
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		http.Error(w, "Failed to create downloads directory", http.StatusInternalServerError)
		return
	}

	var filePath string
	var err error

	// Determine if it's a profile or a single video
	// This is a simple heuristic. TikTok profile URLs often look like https://www.tiktok.com/@username
	// Video URLs often look like https://www.tiktok.com/@username/video/123...
	if strings.Contains(url, "/video/") {
		filePath, err = downloader.DownloadVideo(r.Context(), url, outputDir)
	} else {
		filePath, err = downloader.DownloadProfile(r.Context(), url, outputDir)
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("Download failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Ensure the file is deleted after being served
	defer os.Remove(filePath)

	fileName := filepath.Base(filePath)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	http.ServeFile(w, r, filePath)
}
