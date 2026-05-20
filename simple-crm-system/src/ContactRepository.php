<?php

declare(strict_types=1);

namespace CRM;

use PDO;

final class ContactRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function all(?string $search = null): array
    {
        if ($search === null || $search === '') {
            $stmt = $this->pdo->query('SELECT * FROM contacts ORDER BY last_name, first_name');
            return $stmt->fetchAll();
        }

        $stmt = $this->pdo->prepare(
            'SELECT * FROM contacts
             WHERE first_name LIKE :q
                OR last_name LIKE :q
                OR email LIKE :q
                OR company LIKE :q
             ORDER BY last_name, first_name'
        );
        $stmt->execute(['q' => '%' . $search . '%']);

        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM contacts WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function create(array $data): void
    {
        $now = gmdate('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare(
            'INSERT INTO contacts (first_name, last_name, email, phone, company, notes, created_at, updated_at)
             VALUES (:first_name, :last_name, :email, :phone, :company, :notes, :created_at, :updated_at)'
        );

        $stmt->execute([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'company' => $data['company'],
            'notes' => $data['notes'],
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function update(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE contacts
             SET first_name = :first_name,
                 last_name = :last_name,
                 email = :email,
                 phone = :phone,
                 company = :company,
                 notes = :notes,
                 updated_at = :updated_at
             WHERE id = :id'
        );

        $stmt->execute([
            'id' => $id,
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'company' => $data['company'],
            'notes' => $data['notes'],
            'updated_at' => gmdate('Y-m-d H:i:s'),
        ]);
    }

    public function delete(int $id): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM contacts WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    public function stats(): array
    {
        $total = (int) $this->pdo->query('SELECT COUNT(*) FROM contacts')->fetchColumn();
        $recent = (int) $this->pdo->query("SELECT COUNT(*) FROM contacts WHERE created_at >= datetime('now', '-7 day')")->fetchColumn();

        return ['total' => $total, 'recent' => $recent];
    }
}
