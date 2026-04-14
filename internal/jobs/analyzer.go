package jobs

import (
	"cmp"
	"slices"
	"strings"
)

func AnalyzeDemand(offers []Offer) []LanguageDemand {
	grouped := map[string]*LanguageDemand{}
	maxCount := 0

	for _, offer := range offers {
		seen := map[string]bool{}
		for _, language := range offer.Languages {
			normalized := normalizeLanguage(language)
			if normalized == "" || seen[normalized] {
				continue
			}
			seen[normalized] = true

			item, ok := grouped[normalized]
			if !ok {
				item = &LanguageDemand{Language: strings.TrimSpace(language)}
				grouped[normalized] = item
			}

			item.Count++
			item.Offers = append(item.Offers, offer)
			if item.Count > maxCount {
				maxCount = item.Count
			}
		}
	}

	demand := make([]LanguageDemand, 0, len(grouped))
	for _, item := range grouped {
		item.Tier = classifyTier(item.Count, maxCount)
		demand = append(demand, *item)
	}

	slices.SortFunc(demand, func(a, b LanguageDemand) int {
		if diff := cmp.Compare(b.Count, a.Count); diff != 0 {
			return diff
		}
		return cmp.Compare(a.Language, b.Language)
	})

	return demand
}

func FindLanguage(demand []LanguageDemand, query string) (LanguageDemand, bool) {
	query = normalizeLanguage(query)
	for _, item := range demand {
		if normalizeLanguage(item.Language) == query {
			return item, true
		}
	}

	return LanguageDemand{}, false
}

func normalizeLanguage(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func classifyTier(count, maxCount int) string {
	if maxCount == 0 {
		return "low"
	}

	ratio := float64(count) / float64(maxCount)
	switch {
	case ratio >= 0.7:
		return "high"
	case ratio >= 0.35:
		return "medium"
	default:
		return "low"
	}
}
