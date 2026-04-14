package main

import (
	"flag"
	"fmt"
	"os"
	"strings"

	"jobs-cli/internal/aggregator"
)

const usageText = `jobs-cli aggregates job market demand trends over time.

Usage:
  jobs-cli aggregate [flags]

Commands:
  aggregate   read a CSV of job demand data and emit aggregated trends

Flags:
  -input string
        input CSV file path (default: stdin)
  -date-field string
        name of the date field in the CSV (default "date")
  -group-by string
        field to group by, such as "skill" or "location" (default "skill")
  -value-field string
        numeric field to aggregate, such as "count" or "demand" (default "count")
  -period string
        aggregation period: day, week, or month (default "month")
  -output string
        output format: json or csv (default "json")
  -delimiter string
        CSV delimiter character (default ",")
`

func main() {
	if len(os.Args) < 2 || os.Args[1] == "-h" || os.Args[1] == "--help" {
		fmt.Fprint(os.Stdout, usageText)
		return
	}

	switch os.Args[1] {
	case "aggregate":
		runAggregate(os.Args[2:])
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n\n%s", os.Args[1], usageText)
		os.Exit(1)
	}
}

func runAggregate(args []string) {
	flags := flag.NewFlagSet("aggregate", flag.ExitOnError)
	inputPath := flags.String("input", "", "input CSV file path (default: stdin)")
	dateField := flags.String("date-field", "date", "name of the date field in the CSV")
	groupBy := flags.String("group-by", "skill", "field to group by, such as \"skill\" or \"location\"")
	valueField := flags.String("value-field", "count", "numeric field to aggregate, such as \"count\" or \"demand\"")
	period := flags.String("period", "month", "aggregation period: day, week, or month")
	output := flags.String("output", "json", "output format: json or csv")
	delimiter := flags.String("delimiter", ",", "CSV delimiter character")

	flags.Parse(args)

	in := os.Stdin
	if *inputPath != "" {
		f, err := os.Open(*inputPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "failed to open input file: %v\n", err)
			os.Exit(1)
		}
		defer f.Close()
		in = f
	}

	records, err := aggregator.ParseCSV(in, *delimiter, *dateField, *groupBy, *valueField)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to parse CSV: %v\n", err)
		os.Exit(1)
	}

	result, err := aggregator.AggregateTrend(records, *period)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to aggregate trends: %v\n", err)
		os.Exit(1)
	}

	switch strings.ToLower(*output) {
	case "json":
		if err := aggregator.WriteJSON(os.Stdout, result); err != nil {
			fmt.Fprintf(os.Stderr, "failed to write JSON: %v\n", err)
			os.Exit(1)
		}
	case "csv":
		if err := aggregator.WriteCSV(os.Stdout, result); err != nil {
			fmt.Fprintf(os.Stderr, "failed to write CSV: %v\n", err)
			os.Exit(1)
		}
	default:
		fmt.Fprintf(os.Stderr, "unsupported output format: %s\n", *output)
		os.Exit(1)
	}
}
