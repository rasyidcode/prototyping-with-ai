package downloader

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// DownloadVideo downloads a single TikTok video using yt-dlp.
// It returns the path to the downloaded file.
func DownloadVideo(ctx context.Context, url string, outputDir string) (string, error) {
	// Create unique filename
	filename := fmt.Sprintf("video_%d.mp4", time.Now().UnixNano())
	outputPath := filepath.Join(outputDir, filename)

	// yt-dlp command to download no-watermark video
	// --no-playlist ensures we only get one video if the URL is part of a list
	// -o specifies the output template
	cmd := exec.CommandContext(ctx, "yt-dlp",
		"--no-playlist",
		"-o", outputPath,
		url,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("yt-dlp failed: %v, output: %s", err, string(output))
	}

	// Check if file exists
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		return "", fmt.Errorf("downloaded file not found at %s", outputPath)
	}

	return outputPath, nil
}

// DownloadProfile downloads all videos from a TikTok profile using yt-dlp.
// It returns the path to a ZIP archive containing the videos.
func DownloadProfile(ctx context.Context, profileURL string, outputDir string) (string, error) {
	profileName := fmt.Sprintf("profile_%d", time.Now().UnixNano())
	profileDir := filepath.Join(outputDir, profileName)

	if err := os.MkdirAll(profileDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create profile directory: %v", err)
	}

	// yt-dlp command to download all videos from profile
	// -o specifies the output template inside the profile directory
	cmd := exec.CommandContext(ctx, "yt-dlp",
		"-o", filepath.Join(profileDir, "%(title)s.%(ext)s"),
		profileURL,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("yt-dlp failed: %v, output: %s", err, string(output))
	}

	// Create ZIP archive
	zipPath := filepath.Join(outputDir, profileName+".zip")
	zipCmd := exec.Command("zip", "-r", zipPath, ".")
	zipCmd.Dir = profileDir

	if output, err := zipCmd.CombinedOutput(); err != nil {
		return "", fmt.Errorf("failed to create zip: %v, output: %s", err, string(output))
	}

	// Cleanup profile directory after zipping
	os.RemoveAll(profileDir)

	return zipPath, nil
}
