package aggregator

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Record struct {
	Period    string  `json:"period"`
	Dimension string  `json:"dimension"`
	Value     float64 `json:"value"`
}

type TrendRow struct {
	Period    string  `json:"period"`
	Dimension string  `json:"dimension"`
	Value     float64 `json:"value"`
}

type TrendResult []TrendRow

func ParseCSV(r io.Reader, delimiter, dateField, groupBy, valueField string) ([]Record, error) {
	reader := csv.NewReader(r)
	if delimiter == "" {
		delimiter = ","
	}
	runeDelimiter := []rune(delimiter)[0]
	reader.Comma = runes2Comma(runeDelimiter)
	reader.TrimLeadingSpace = true

	head, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("reading header: %w", err)
	}

	columnIndex := map[string]int{}
	for idx, name := range head {
		columnIndex[strings.ToLower(strings.TrimSpace(name))] = idx
	}

	dateIdx, ok := columnIndex[strings.ToLower(dateField)]
	if !ok {
		return nil, fmt.Errorf("missing date field %q", dateField)
	}
	groupIdx, ok := columnIndex[strings.ToLower(groupBy)]
	if !ok {
		return nil, fmt.Errorf("missing group-by field %q", groupBy)
	}
	valueIdx, ok := columnIndex[strings.ToLower(valueField)]
	if !ok {
		return nil, fmt.Errorf("missing value field %q", valueField)
	}

	var records []Record
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("reading row: %w", err)
		}
		if dateIdx >= len(row) || groupIdx >= len(row) || valueIdx >= len(row) {
			return nil, errors.New("row does not contain required columns")
		}

		parsedDate, err := parseDate(strings.TrimSpace(row[dateIdx]))
		if err != nil {
			return nil, fmt.Errorf("parsing date %q: %w", row[dateIdx], err)
		}

		value, err := strconv.ParseFloat(strings.TrimSpace(row[valueIdx]), 64)
		if err != nil {
			return nil, fmt.Errorf("parsing value %q: %w", row[valueIdx], err)
		}

		records = append(records, Record{
			Period:    parsedDate.Format(time.RFC3339),
			Dimension: strings.TrimSpace(row[groupIdx]),
			Value:     value,
		})
	}

	return records, nil
}

func AggregateTrend(records []Record, period string) (TrendResult, error) {
	if len(records) == 0 {
		return nil, nil
	}

	grouped := map[string]map[string]float64{}

	for _, record := range records {
		parsedDate, err := time.Parse(time.RFC3339, record.Period)
		if err != nil {
			return nil, fmt.Errorf("parse stored date %q: %w", record.Period, err)
		}

		bucket, err := normalizePeriod(parsedDate, period)
		if err != nil {
			return nil, err
		}

		if grouped[bucket] == nil {
			grouped[bucket] = map[string]float64{}
		}
		grouped[bucket][record.Dimension] += record.Value
	}

	result := TrendResult{}
	periods := sortedKeys(grouped)
	for _, bucket := range periods {
		for dimension, value := range grouped[bucket] {
			result = append(result, TrendRow{Period: bucket, Dimension: dimension, Value: value})
		}
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Period == result[j].Period {
			return result[i].Dimension < result[j].Dimension
		}
		return result[i].Period < result[j].Period
	})

	return result, nil
}

func WriteJSON(w io.Writer, result TrendResult) error {
	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "  ")
	return encoder.Encode(result)
}

func WriteCSV(w io.Writer, result TrendResult) error {
	writer := csv.NewWriter(w)
	if err := writer.Write([]string{"period", "dimension", "value"}); err != nil {
		return err
	}
	for _, row := range result {
		if err := writer.Write([]string{row.Period, row.Dimension, fmt.Sprintf("%g", row.Value)}); err != nil {
			return err
		}
	}
	writer.Flush()
	return writer.Error()
}

func parseDate(value string) (time.Time, error) {
	layouts := []string{
		time.RFC3339,
		"2006-01-02",
		"2006/01/02",
		"01/02/2006",
		"2006-01",
	}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, value); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unsupported date format %q", value)
}

func normalizePeriod(t time.Time, period string) (string, error) {
	switch strings.ToLower(period) {
	case "day":
		return t.Format("2006-01-02"), nil
	case "week":
		year, week := t.ISOWeek()
		return fmt.Sprintf("%04d-W%02d", year, week), nil
	case "month":
		return t.Format("2006-01"), nil
	default:
		return "", fmt.Errorf("unsupported aggregation period %q", period)
	}
}

func sortedKeys(m map[string]map[string]float64) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func runes2Comma(r rune) rune {
	return r
}
