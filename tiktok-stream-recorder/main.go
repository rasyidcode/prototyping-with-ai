package main

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"regexp"
	"strings"
	"syscall"
	"time"
)

type Config struct {
	Username      string
	PollInterval  time.Duration
	OutputDir     string
	FFmpegPath    string
	YtDlpPath     string
	FFmpegArgs    []string
	CheckTimeout  time.Duration
	RecordTimeout time.Duration
}

type ProbeResult struct {
	Live      bool
	StreamURL string
	Title     string
}

func main() {
	cfg, err := loadConfig()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	if err := os.MkdirAll(cfg.OutputDir, 0o755); err != nil {
		log.Fatalf("create output dir: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	log.Printf("watching TikTok user @%s", cfg.Username)
	log.Printf("recordings will be stored in %s", cfg.OutputDir)

	if err := watchAndRecord(ctx, cfg); err != nil && !errors.Is(err, context.Canceled) {
		log.Fatalf("recorder stopped: %v", err)
	}
}

func loadConfig() (Config, error) {
	username := envOrDefault("TIKTOK_USERNAME", "")
	outputDir := envOrDefault("OUTPUT_DIR", "recordings")
	ffmpegPath := envOrDefault("FFMPEG_PATH", "ffmpeg")
	ytdlpPath := envOrDefault("YTDLP_PATH", "yt-dlp")
	pollEvery := envOrDefault("POLL_INTERVAL", "30s")
	checkTimeout := envOrDefault("CHECK_TIMEOUT", "20s")
	recordTimeout := envOrDefault("RECORD_TIMEOUT", "0s")
	extraFFmpegArgs := envOrDefault("FFMPEG_ARGS", "")

	flag.StringVar(&username, "username", username, "TikTok username without @")
	flag.StringVar(&outputDir, "output", outputDir, "directory for saved recordings")
	flag.StringVar(&ffmpegPath, "ffmpeg", ffmpegPath, "path to ffmpeg binary")
	flag.StringVar(&ytdlpPath, "yt-dlp", ytdlpPath, "path to yt-dlp binary")
	flag.StringVar(&pollEvery, "interval", pollEvery, "how often to poll for live status")
	flag.StringVar(&checkTimeout, "check-timeout", checkTimeout, "timeout for live checks")
	flag.StringVar(&recordTimeout, "record-timeout", recordTimeout, "optional max duration per recording, 0 disables it")
	flag.StringVar(&extraFFmpegArgs, "ffmpeg-args", extraFFmpegArgs, "extra ffmpeg args appended before output path")
	flag.Parse()

	if username == "" {
		return Config{}, errors.New("username is required, pass -username or TIKTOK_USERNAME")
	}

	pollInterval, err := time.ParseDuration(pollEvery)
	if err != nil {
		return Config{}, fmt.Errorf("invalid poll interval: %w", err)
	}

	checkDur, err := time.ParseDuration(checkTimeout)
	if err != nil {
		return Config{}, fmt.Errorf("invalid check timeout: %w", err)
	}

	recordDur, err := time.ParseDuration(recordTimeout)
	if err != nil {
		return Config{}, fmt.Errorf("invalid record timeout: %w", err)
	}

	cfg := Config{
		Username:      strings.TrimPrefix(strings.TrimSpace(username), "@"),
		PollInterval:  pollInterval,
		OutputDir:     outputDir,
		FFmpegPath:    ffmpegPath,
		YtDlpPath:     ytdlpPath,
		FFmpegArgs:    splitArgs(extraFFmpegArgs),
		CheckTimeout:  checkDur,
		RecordTimeout: recordDur,
	}

	return cfg, nil
}

func watchAndRecord(ctx context.Context, cfg Config) error {
	ticker := time.NewTicker(cfg.PollInterval)
	defer ticker.Stop()

	var lastState string

	for {
		probe, err := probeTikTokLive(ctx, cfg)
		switch {
		case err != nil:
			log.Printf("live check failed: %v", err)
		case probe.Live:
			lastState = "live"
			log.Printf("stream is live, starting recording")
			if err := recordStream(ctx, cfg, probe); err != nil && !errors.Is(err, context.Canceled) {
				log.Printf("recording ended with error: %v", err)
			}
		default:
			if lastState != "offline" {
				log.Printf("stream is offline, polling every %s", cfg.PollInterval)
				lastState = "offline"
			}
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
		}
	}
}

func probeTikTokLive(parent context.Context, cfg Config) (ProbeResult, error) {
	ctx, cancel := context.WithTimeout(parent, cfg.CheckTimeout)
	defer cancel()

	url := fmt.Sprintf("https://www.tiktok.com/@%s/live", cfg.Username)
	cmd := exec.CommandContext(ctx, cfg.YtDlpPath, "--no-warnings", "--skip-download", "--print", "%(is_live)s|%(title)s|%(url)s", url)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if ctx.Err() != nil {
			return ProbeResult{}, ctx.Err()
		}
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = err.Error()
		}
		if isOfflineMessage(msg) {
			return ProbeResult{Live: false}, nil
		}
		return ProbeResult{}, fmt.Errorf("yt-dlp: %s", msg)
	}

	line := firstNonEmptyLine(stdout.String())
	if line == "" {
		return ProbeResult{Live: false}, nil
	}

	parts := strings.SplitN(line, "|", 3)
	if len(parts) < 3 {
		return ProbeResult{}, fmt.Errorf("unexpected yt-dlp response: %q", line)
	}

	live := strings.EqualFold(strings.TrimSpace(parts[0]), "true")
	streamURL := strings.TrimSpace(parts[2])
	if !live || streamURL == "" {
		return ProbeResult{Live: false}, nil
	}

	return ProbeResult{
		Live:      true,
		Title:     strings.TrimSpace(parts[1]),
		StreamURL: streamURL,
	}, nil
}

func recordStream(parent context.Context, cfg Config, probe ProbeResult) error {
	filename := buildOutputFilename(cfg.Username, probe.Title)
	outputPath := filepath.Join(cfg.OutputDir, filename)

	ctx := parent
	var cancel context.CancelFunc
	if cfg.RecordTimeout > 0 {
		ctx, cancel = context.WithTimeout(parent, cfg.RecordTimeout)
		defer cancel()
	}

	args := []string{
		"-hide_banner",
		"-loglevel", "warning",
		"-i", probe.StreamURL,
		"-c", "copy",
		"-movflags", "+faststart",
	}
	args = append(args, cfg.FFmpegArgs...)
	args = append(args, outputPath)

	cmd := exec.CommandContext(ctx, cfg.FFmpegPath, args...)

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("stderr pipe: %w", err)
	}

	cmd.Stdout = os.Stdout

	log.Printf("recording to %s", outputPath)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start ffmpeg: %w", err)
	}

	go streamLogs(stderr)

	err = cmd.Wait()
	if ctx.Err() != nil {
		return ctx.Err()
	}
	if err != nil {
		return fmt.Errorf("ffmpeg: %w", err)
	}

	log.Printf("recording finished: %s", outputPath)
	return nil
}

func streamLogs(r io.Reader) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line != "" {
			log.Printf("ffmpeg: %s", line)
		}
	}
}

func buildOutputFilename(username, title string) string {
	safeUser := sanitizeFilename(username)
	safeTitle := sanitizeFilename(title)
	if safeTitle == "" {
		safeTitle = "live"
	}

	timestamp := time.Now().Format("20060102-150405")
	return fmt.Sprintf("%s-%s-%s.mp4", safeUser, timestamp, safeTitle)
}

func sanitizeFilename(value string) string {
	re := regexp.MustCompile(`[^a-zA-Z0-9._-]+`)
	value = strings.TrimSpace(value)
	value = strings.ReplaceAll(value, " ", "-")
	value = re.ReplaceAllString(value, "-")
	value = strings.Trim(value, "-.")
	if value == "" {
		return "stream"
	}
	return value
}

func splitArgs(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	return strings.Fields(raw)
}

func envOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func firstNonEmptyLine(value string) string {
	for _, line := range strings.Split(value, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func isOfflineMessage(msg string) bool {
	msg = strings.ToLower(msg)
	offlineMarkers := []string{
		"user is offline",
		"this live event will begin",
		"is not live",
		"no video formats found",
		"requested format is not available",
	}

	for _, marker := range offlineMarkers {
		if strings.Contains(msg, marker) {
			return true
		}
	}
	return false
}
