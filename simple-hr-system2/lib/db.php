<?php

declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $databaseDir = __DIR__ . '/../data';
    if (!is_dir($databaseDir)) {
        mkdir($databaseDir, 0775, true);
    }

    $databasePath = $databaseDir . '/hr.sqlite';
    $pdo = new PDO('sqlite:' . $databasePath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    initializeDatabase($pdo);

    return $pdo;
}

function initializeDatabase(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            department TEXT NOT NULL,
            position TEXT NOT NULL,
            salary REAL NOT NULL CHECK (salary >= 0),
            hire_date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )'
    );

    $pdo->exec(
        'CREATE TRIGGER IF NOT EXISTS employees_updated_at
        AFTER UPDATE ON employees
        BEGIN
            UPDATE employees
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.id;
        END'
    );
}
