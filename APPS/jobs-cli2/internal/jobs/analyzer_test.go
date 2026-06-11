package jobs

import "testing"

func TestAnalyzeDemand(t *testing.T) {
	offers := []Offer{
		{ID: "1", Languages: []string{"Go", "Python"}},
		{ID: "2", Languages: []string{"go", "JavaScript"}},
		{ID: "3", Languages: []string{"Python", "Go", "Go"}},
		{ID: "4", Languages: []string{"Rust"}},
	}

	demand := AnalyzeDemand(offers)

	if len(demand) != 4 {
		t.Fatalf("expected 4 languages, got %d", len(demand))
	}

	if demand[0].Language != "Go" || demand[0].Count != 3 || demand[0].Tier != "high" {
		t.Fatalf("unexpected top language: %+v", demand[0])
	}

	python, ok := FindLanguage(demand, "PYTHON")
	if !ok {
		t.Fatal("expected python demand to be present")
	}

	if python.Count != 2 || python.Tier != "medium" {
		t.Fatalf("unexpected python demand: %+v", python)
	}
}
