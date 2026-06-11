package main

import (
	"log"
	"net/http"
	"tiktok-downloader/handlers"
)

func main() {
	http.HandleFunc("/", handlers.HandleIndex)
	http.HandleFunc("/api/download", handlers.HandleDownload)

	port := "8080"
	log.Printf("Server starting on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
