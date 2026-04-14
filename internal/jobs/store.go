package jobs

import (
	"encoding/json"
	"fmt"
	"os"
)

func LoadOffers(path string) ([]Offer, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read offers: %w", err)
	}

	var offers []Offer
	if err := json.Unmarshal(raw, &offers); err != nil {
		return nil, fmt.Errorf("parse offers: %w", err)
	}

	return offers, nil
}
