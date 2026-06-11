# Simple HR System (PHP + SQLite)

A lightweight HR system built with plain PHP and SQLite.

## Features

- Employee dashboard with key metrics
- Employee list with search
- Add, edit, and delete employees
- Form validation and flash messages
- SQLite auto-initialization (no manual DB setup)

## Requirements

- PHP 8.0+
- `pdo_sqlite` extension enabled

## Run Locally

From the project root:

```bash
php -S localhost:8000
```

Open:

```text
http://localhost:8000
```

On first run, the app creates `data/hr.sqlite` automatically.

## Project Structure

- `index.php` - Main controller and views
- `lib/db.php` - SQLite connection + schema setup
- `lib/employee_repository.php` - Employee CRUD + dashboard stats
- `assets/style.css` - Styles
