<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

function allEmployees(?string $query = null): array
{
    $pdo = db();

    if ($query === null || trim($query) === '') {
        $stmt = $pdo->query('SELECT * FROM employees ORDER BY created_at DESC');
        return $stmt->fetchAll();
    }

    $sql = 'SELECT * FROM employees
            WHERE first_name LIKE :q
               OR last_name LIKE :q
               OR email LIKE :q
               OR department LIKE :q
               OR position LIKE :q
            ORDER BY created_at DESC';

    $stmt = $pdo->prepare($sql);
    $like = '%' . trim($query) . '%';
    $stmt->execute(['q' => $like]);

    return $stmt->fetchAll();
}

function findEmployee(int $id): ?array
{
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM employees WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $employee = $stmt->fetch();

    return $employee ?: null;
}

function createEmployee(array $data): void
{
    $pdo = db();

    $stmt = $pdo->prepare(
        'INSERT INTO employees (first_name, last_name, email, department, position, salary, hire_date)
         VALUES (:first_name, :last_name, :email, :department, :position, :salary, :hire_date)'
    );

    $stmt->execute([
        'first_name' => $data['first_name'],
        'last_name' => $data['last_name'],
        'email' => $data['email'],
        'department' => $data['department'],
        'position' => $data['position'],
        'salary' => $data['salary'],
        'hire_date' => $data['hire_date'],
    ]);
}

function updateEmployee(int $id, array $data): void
{
    $pdo = db();

    $stmt = $pdo->prepare(
        'UPDATE employees
         SET first_name = :first_name,
             last_name = :last_name,
             email = :email,
             department = :department,
             position = :position,
             salary = :salary,
             hire_date = :hire_date
         WHERE id = :id'
    );

    $stmt->execute([
        'id' => $id,
        'first_name' => $data['first_name'],
        'last_name' => $data['last_name'],
        'email' => $data['email'],
        'department' => $data['department'],
        'position' => $data['position'],
        'salary' => $data['salary'],
        'hire_date' => $data['hire_date'],
    ]);
}

function deleteEmployee(int $id): void
{
    $pdo = db();
    $stmt = $pdo->prepare('DELETE FROM employees WHERE id = :id');
    $stmt->execute(['id' => $id]);
}

function dashboardStats(): array
{
    $pdo = db();

    $totalEmployees = (int) $pdo->query('SELECT COUNT(*) FROM employees')->fetchColumn();
    $departmentCount = (int) $pdo->query('SELECT COUNT(DISTINCT department) FROM employees')->fetchColumn();

    $avgSalaryRaw = $pdo->query('SELECT AVG(salary) FROM employees')->fetchColumn();
    $avgSalary = $avgSalaryRaw === null ? 0.0 : (float) $avgSalaryRaw;

    return [
        'total_employees' => $totalEmployees,
        'department_count' => $departmentCount,
        'avg_salary' => $avgSalary,
    ];
}
