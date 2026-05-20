# Simple CRM (PHP + SQLite)

A lightweight CRM built with plain PHP (no framework) and SQLite.

## Features

- Contact list with search
- Add, edit, delete contact
- Basic dashboard stats (total + last 7 days)
- CSRF protection for form submissions
- Input validation with inline errors

## Requirements

- PHP 8.1+
- SQLite extension enabled (`pdo_sqlite`)

## Run locally

```bash
cd /home/nb81/My-Work/simple-crm-system
php -S localhost:8000 -t public
```

Open `http://localhost:8000`.

The SQLite database is created automatically at `data/crm.sqlite`.
