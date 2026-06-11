# jobs-cli

A small Go CLI for aggregating job market demand trends over time.

## Overview

`jobs-cli` reads CSV job demand data and emits aggregated trends by time period and dimension.

## Example CSV

```csv
date,skill,count
2024-01-10,Go,17
2024-01-11,Python,24
2024-02-01,Go,21
2024-02-03,Python,30
```

## Usage

Build the CLI:

```bash
go build -o jobs-cli ./cmd/jobs-cli
```

Run aggregation:

```bash
./jobs-cli aggregate -input sample.csv -group-by skill -value-field count -period month -output json
```

Or pipe from stdin:

```bash
cat sample.csv | ./jobs-cli aggregate -group-by skill -period month
```

## Flags

- `-input`: CSV input file path. Defaults to stdin.
- `-date-field`: CSV date header. Defaults to `date`.
- `-group-by`: dimension field to group by. Defaults to `skill`.
- `-value-field`: numeric metric to aggregate. Defaults to `count`.
- `-period`: `day`, `week`, or `month`.
- `-output`: `json` or `csv`.
