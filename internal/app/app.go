package app

import (
	"bufio"
	"flag"
	"fmt"
	"io"
	"path/filepath"
	"strings"

	"jobs-cli2/internal/jobs"
)

func Run(args []string, in io.Reader, out io.Writer) error {
	fs := flag.NewFlagSet("jobs-cli", flag.ContinueOnError)
	fs.SetOutput(out)

	dataPath := fs.String("data", filepath.Join("data", "sample_jobs.json"), "path to a JSON file with job offers")
	if err := fs.Parse(args); err != nil {
		return err
	}

	offers, err := jobs.LoadOffers(*dataPath)
	if err != nil {
		return err
	}

	demand := jobs.AnalyzeDemand(offers)
	printWelcome(out, *dataPath, len(offers), demand)
	printSummary(out, demand)
	printHelp(out)

	scanner := bufio.NewScanner(in)
	for {
		fmt.Fprint(out, "\ncommand> ")
		if !scanner.Scan() {
			break
		}

		input := strings.TrimSpace(scanner.Text())
		if input == "" {
			continue
		}

		parts := strings.Fields(input)
		switch strings.ToLower(parts[0]) {
		case "help":
			printHelp(out)
		case "list":
			printSummary(out, demand)
		case "tiers":
			printTiers(out, demand)
		case "show":
			if len(parts) < 2 {
				fmt.Fprintln(out, "usage: show <language>")
				continue
			}

			language := strings.Join(parts[1:], " ")
			item, ok := jobs.FindLanguage(demand, language)
			if !ok {
				fmt.Fprintf(out, "language %q was not found\n", language)
				continue
			}

			printLanguageDetails(out, item)
		case "quit", "exit":
			fmt.Fprintln(out, "bye")
			return nil
		default:
			fmt.Fprintf(out, "unknown command %q\n", input)
			printHelp(out)
		}
	}

	return scanner.Err()
}

func printWelcome(out io.Writer, dataPath string, offerCount int, demand []jobs.LanguageDemand) {
	fmt.Fprintln(out, "Programming Language Job Demand")
	fmt.Fprintln(out, "================================")
	fmt.Fprintf(out, "Dataset: %s\n", dataPath)
	fmt.Fprintf(out, "Offers loaded: %d\n", offerCount)
	fmt.Fprintf(out, "Languages tracked: %d\n", len(demand))
}

func printSummary(out io.Writer, demand []jobs.LanguageDemand) {
	fmt.Fprintln(out, "\nDemand overview")
	fmt.Fprintln(out, "---------------")
	for _, item := range demand {
		fmt.Fprintf(out, "%-12s %2d jobs  %-6s %s\n", item.Language, item.Count, item.Tier, bar(item.Count))
	}
}

func printTiers(out io.Writer, demand []jobs.LanguageDemand) {
	fmt.Fprintln(out, "\nDemand by tier")
	fmt.Fprintln(out, "--------------")

	for _, tier := range []string{"high", "medium", "low"} {
		fmt.Fprintf(out, "%s:\n", strings.ToUpper(tier))
		found := false
		for _, item := range demand {
			if item.Tier == tier {
				found = true
				fmt.Fprintf(out, "  - %s (%d)\n", item.Language, item.Count)
			}
		}
		if !found {
			fmt.Fprintln(out, "  - none")
		}
	}
}

func printLanguageDetails(out io.Writer, item jobs.LanguageDemand) {
	fmt.Fprintf(out, "\n%s demand: %s (%d jobs)\n", strings.ToUpper(item.Language), item.Tier, item.Count)
	fmt.Fprintln(out, "Relevant offers")
	fmt.Fprintln(out, "---------------")
	for _, offer := range item.Offers {
		fmt.Fprintf(out, "- %s at %s | %s\n", offer.Title, offer.Company, offer.Location)
	}
}

func printHelp(out io.Writer) {
	fmt.Fprintln(out, "\nCommands")
	fmt.Fprintln(out, "--------")
	fmt.Fprintln(out, "list            show the language demand table")
	fmt.Fprintln(out, "tiers           group languages into high / medium / low demand")
	fmt.Fprintln(out, "show <language> inspect the jobs counted for one language")
	fmt.Fprintln(out, "help            show this help")
	fmt.Fprintln(out, "quit            exit the app")
}

func bar(count int) string {
	if count <= 0 {
		return ""
	}
	return strings.Repeat("#", count)
}
