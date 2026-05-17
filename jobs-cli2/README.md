# jobs-cli2

A terminal-based Go app for exploring job-offer demand by programming language.

## What it does

- Loads job offers from a JSON file.
- Groups offers by programming language.
- Classifies each language into `high`, `medium`, or `low` demand.
- Lets you inspect the offers behind each language from the terminal.

## Run it

```bash
go run ./cmd/jobs-cli
```

Use a custom dataset:

```bash
go run ./cmd/jobs-cli -data path/to/jobs.json
```

## Commands

- `list`
- `tiers`
- `show <language>`
- `help`
- `quit`

## JSON shape

```json
[
  {
    "id": "1",
    "title": "Backend Engineer",
    "company": "Nimbus Labs",
    "location": "Remote",
    "languages": ["Go", "Python"],
    "url": "https://example.com/jobs/1"
  }
]
```
