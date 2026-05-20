<?php

declare(strict_types=1);

session_start();

require_once __DIR__ . '/lib/employee_repository.php';

$action = $_GET['action'] ?? 'list';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$errors = [];
$formValues = [
    'first_name' => '',
    'last_name' => '',
    'email' => '',
    'department' => '',
    'position' => '',
    'salary' => '',
    'hire_date' => '',
];

if ($action === 'create' && $method === 'POST') {
    $formValues = collectFormValues($_POST);
    $errors = validateEmployeeForm($formValues);

    if (!$errors) {
        try {
            createEmployee($formValues);
            setFlash('Employee added successfully.');
            redirectTo('/');
        } catch (PDOException $exception) {
            $errors[] = 'Could not save employee. Email might already exist.';
        }
    }

    renderFormPage('Add Employee', 'create', $formValues, $errors);
    exit;
}

if ($action === 'edit') {
    $employeeId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    $employee = findEmployee($employeeId);

    if (!$employee) {
        setFlash('Employee not found.', 'error');
        redirectTo('/');
    }

    if ($method === 'POST') {
        $formValues = collectFormValues($_POST);
        $errors = validateEmployeeForm($formValues);

        if (!$errors) {
            try {
                updateEmployee($employeeId, $formValues);
                setFlash('Employee updated successfully.');
                redirectTo('/');
            } catch (PDOException $exception) {
                $errors[] = 'Could not update employee. Email might already exist.';
            }
        }

        renderFormPage('Edit Employee', 'edit&id=' . $employeeId, $formValues, $errors);
        exit;
    }

    $formValues = [
        'first_name' => $employee['first_name'],
        'last_name' => $employee['last_name'],
        'email' => $employee['email'],
        'department' => $employee['department'],
        'position' => $employee['position'],
        'salary' => (string) $employee['salary'],
        'hire_date' => $employee['hire_date'],
    ];

    renderFormPage('Edit Employee', 'edit&id=' . $employeeId, $formValues, []);
    exit;
}

if ($action === 'delete' && $method === 'POST') {
    $employeeId = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($employeeId > 0) {
        deleteEmployee($employeeId);
        setFlash('Employee deleted successfully.');
    }

    redirectTo('/');
}

if ($action === 'new') {
    renderFormPage('Add Employee', 'create', $formValues, []);
    exit;
}

$search = trim((string) ($_GET['q'] ?? ''));
$employees = allEmployees($search);
$stats = dashboardStats();
$flash = getFlash();

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple HR System</title>
    <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
    <main class="container">
        <header class="topbar">
            <h1>Simple HR System</h1>
            <a class="button primary" href="/?action=new">+ Add Employee</a>
        </header>

        <?php if ($flash): ?>
            <div class="flash <?= escape($flash['type']) ?>"><?= escape($flash['message']) ?></div>
        <?php endif; ?>

        <section class="stats-grid">
            <article class="stat-card">
                <h2>Total Employees</h2>
                <p><?= number_format($stats['total_employees']) ?></p>
            </article>
            <article class="stat-card">
                <h2>Departments</h2>
                <p><?= number_format($stats['department_count']) ?></p>
            </article>
            <article class="stat-card">
                <h2>Average Salary</h2>
                <p>$<?= number_format($stats['avg_salary'], 2) ?></p>
            </article>
        </section>

        <section class="panel">
            <form method="GET" class="search-form">
                <input type="text" name="q" value="<?= escape($search) ?>" placeholder="Search employees...">
                <button type="submit" class="button">Search</button>
                <?php if ($search !== ''): ?>
                    <a href="/" class="button subtle">Clear</a>
                <?php endif; ?>
            </form>

            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th>Position</th>
                        <th>Salary</th>
                        <th>Hire Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!$employees): ?>
                        <tr>
                            <td colspan="7" class="empty">No employees found.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($employees as $employee): ?>
                            <tr>
                                <td><?= escape($employee['first_name'] . ' ' . $employee['last_name']) ?></td>
                                <td><?= escape($employee['email']) ?></td>
                                <td><?= escape($employee['department']) ?></td>
                                <td><?= escape($employee['position']) ?></td>
                                <td>$<?= number_format((float) $employee['salary'], 2) ?></td>
                                <td><?= escape($employee['hire_date']) ?></td>
                                <td>
                                    <a class="button" href="/?action=edit&id=<?= (int) $employee['id'] ?>">Edit</a>
                                    <form method="POST" action="/?action=delete&id=<?= (int) $employee['id'] ?>" class="inline" onsubmit="return confirm('Delete this employee?');">
                                        <button type="submit" class="button danger">Delete</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </section>
    </main>
</body>
</html>
<?php

function collectFormValues(array $input): array
{
    return [
        'first_name' => trim((string) ($input['first_name'] ?? '')),
        'last_name' => trim((string) ($input['last_name'] ?? '')),
        'email' => trim((string) ($input['email'] ?? '')),
        'department' => trim((string) ($input['department'] ?? '')),
        'position' => trim((string) ($input['position'] ?? '')),
        'salary' => trim((string) ($input['salary'] ?? '')),
        'hire_date' => trim((string) ($input['hire_date'] ?? '')),
    ];
}

function validateEmployeeForm(array $values): array
{
    $errors = [];

    if ($values['first_name'] === '') {
        $errors[] = 'First name is required.';
    }

    if ($values['last_name'] === '') {
        $errors[] = 'Last name is required.';
    }

    if (!filter_var($values['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'A valid email is required.';
    }

    if ($values['department'] === '') {
        $errors[] = 'Department is required.';
    }

    if ($values['position'] === '') {
        $errors[] = 'Position is required.';
    }

    if (!is_numeric($values['salary']) || (float) $values['salary'] < 0) {
        $errors[] = 'Salary must be a non-negative number.';
    }

    $date = DateTime::createFromFormat('Y-m-d', $values['hire_date']);
    if (!$date || $date->format('Y-m-d') !== $values['hire_date']) {
        $errors[] = 'Hire date must be in YYYY-MM-DD format.';
    }

    if (!$errors) {
        $values['salary'] = number_format((float) $values['salary'], 2, '.', '');
    }

    return $errors;
}

function renderFormPage(string $title, string $action, array $values, array $errors): void
{
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title><?= escape($title) ?> - Simple HR System</title>
        <link rel="stylesheet" href="/assets/style.css">
    </head>
    <body>
        <main class="container narrow">
            <header class="topbar">
                <h1><?= escape($title) ?></h1>
                <a class="button subtle" href="/">Back to Dashboard</a>
            </header>

            <section class="panel">
                <?php if ($errors): ?>
                    <div class="flash error">
                        <ul>
                            <?php foreach ($errors as $error): ?>
                                <li><?= escape($error) ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endif; ?>

                <form method="POST" action="/?action=<?= escape($action) ?>" class="employee-form">
                    <label>
                        First Name
                        <input type="text" name="first_name" value="<?= escape($values['first_name']) ?>" required>
                    </label>
                    <label>
                        Last Name
                        <input type="text" name="last_name" value="<?= escape($values['last_name']) ?>" required>
                    </label>
                    <label>
                        Email
                        <input type="email" name="email" value="<?= escape($values['email']) ?>" required>
                    </label>
                    <label>
                        Department
                        <input type="text" name="department" value="<?= escape($values['department']) ?>" required>
                    </label>
                    <label>
                        Position
                        <input type="text" name="position" value="<?= escape($values['position']) ?>" required>
                    </label>
                    <label>
                        Salary
                        <input type="number" step="0.01" min="0" name="salary" value="<?= escape($values['salary']) ?>" required>
                    </label>
                    <label>
                        Hire Date
                        <input type="date" name="hire_date" value="<?= escape($values['hire_date']) ?>" required>
                    </label>

                    <div class="form-actions">
                        <button type="submit" class="button primary">Save Employee</button>
                        <a class="button subtle" href="/">Cancel</a>
                    </div>
                </form>
            </section>
        </main>
    </body>
    </html>
    <?php
}

function setFlash(string $message, string $type = 'success'): void
{
    $_SESSION['flash'] = [
        'message' => $message,
        'type' => $type,
    ];
}

function getFlash(): ?array
{
    if (!isset($_SESSION['flash'])) {
        return null;
    }

    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);

    return $flash;
}

function redirectTo(string $path): void
{
    header('Location: ' . $path);
    exit;
}

function escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}
