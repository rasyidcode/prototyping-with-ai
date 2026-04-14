package jobs

type Offer struct {
	ID        string   `json:"id"`
	Title     string   `json:"title"`
	Company   string   `json:"company"`
	Location  string   `json:"location"`
	Languages []string `json:"languages"`
	URL       string   `json:"url"`
}

type LanguageDemand struct {
	Language string
	Count    int
	Tier     string
	Offers   []Offer
}
