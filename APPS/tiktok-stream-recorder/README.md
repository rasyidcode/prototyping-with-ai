# TikTok Stream Recorder

A small Go CLI that watches a TikTok account and starts recording automatically when the account goes live.

## How it works

The app polls `https://www.tiktok.com/@<username>/live` with `yt-dlp`. When a live stream is detected, it extracts the direct media URL and launches `ffmpeg` to save the stream into the `recordings/` folder.

This project uses only the Go standard library, so you can build it without pulling extra Go modules.

## Requirements

- Go 1.22+
- `yt-dlp`
- `ffmpeg`

## Run

```bash
go run . -username somecreator
```

## Useful flags

```bash
go run . \
  -username somecreator \
  -output recordings \
  -interval 30s \
  -check-timeout 20s \
  -record-timeout 0s
```

## Environment variables

You can configure the same values through env vars:

```bash
export TIKTOK_USERNAME=somecreator
export OUTPUT_DIR=recordings
export POLL_INTERVAL=30s
export CHECK_TIMEOUT=20s
export RECORD_TIMEOUT=0s
export YTDLP_PATH=yt-dlp
export FFMPEG_PATH=ffmpeg
export FFMPEG_ARGS="-bsf:a aac_adtstoasc"
```

Then run:

```bash
go run .
```

## Build

```bash
go build -o bin/tiktok-recorder .
```

## Notes

- TikTok frequently changes its delivery flow, so `yt-dlp` may need to stay updated.
- The recorder saves a new timestamped `.mp4` file each time a live session is captured.
- If `ffmpeg` exits because the stream ends, the watcher goes back to polling automatically.
