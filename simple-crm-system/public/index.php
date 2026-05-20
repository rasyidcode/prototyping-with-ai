<?php

declare(strict_types=1);

use CRM\ContactRepository;
use CRM\Database;

require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/ContactRepository.php';

session_start();

$db = new Database(__DIR__ . '/../data/crm.sqlite');
$contacts = new ContactRepository($db->pdo());

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$action = $_GET['action'] ?? 'index';
$errors = [];
$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);

function redirect(string $url): never
{
    header('Location: ' . $url);
    exit;
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function validateContact(array $input): array
{
    $required = ['first_name', 'last_name', 'email', 'phone', 'company'];
    $clean = [];
    $errors = [];

    foreach ($required as $field) {
        $clean[$field] = trim((string) ($input[$field] ?? ''));
        if ($clean[$field] === '') {
            $errors[$field] = 'This field is required.';
        }
    }

    $clean['notes'] = trim((string) ($input['notes'] ?? ''));

    if ($clean['email'] !== '' && !filter_var($clean['email'], FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Please enter a valid email address.';
    }

    return [$clean, $errors];
}

function enforceCsrf(): void
{
    if (!hash_equals($_SESSION['csrf_token'] ?? '', (string) ($_POST['_csrf'] ?? ''))) {
        http_response_code(403);
        echo 'CSRF token mismatch.';
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    enforceCsrf();

    if ($action === 'store') {
        [$payload, $errors] = validateContact($_POST);
        if ($errors === []) {
            $contacts->create($payload);
            $_SESSION['flash'] = 'Contact created.';
            redirect('/');
        }

        $contact = $payload;
        $mode = 'create';
        $title = 'New Contact';
        require __DIR__ . '/../views/form.php';
        exit;
    }

    if ($action === 'update') {
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0 || !$contacts->find($id)) {
            http_response_code(404);
            echo 'Contact not found.';
            exit;
        }

        [$payload, $errors] = validateContact($_POST);
        if ($errors === []) {
            $contacts->update($id, $payload);
            $_SESSION['flash'] = 'Contact updated.';
            redirect('/');
        }

        $contact = array_merge($payload, ['id' => $id]);
        $mode = 'edit';
        $title = 'Edit Contact';
        require __DIR__ . '/../views/form.php';
        exit;
    }

    if ($action === 'delete') {
        $id = (int) ($_GET['id'] ?? 0);
        if ($id > 0) {
            $contacts->delete($id);
            $_SESSION['flash'] = 'Contact deleted.';
        }
        redirect('/');
    }
}

if ($action === 'create') {
    $contact = [
        'first_name' => '',
        'last_name' => '',
        'email' => '',
        'phone' => '',
        'company' => '',
        'notes' => '',
    ];
    $mode = 'create';
    $title = 'New Contact';
    require __DIR__ . '/../views/form.php';
    exit;
}

if ($action === 'edit') {
    $id = (int) ($_GET['id'] ?? 0);
    $contact = $contacts->find($id);

    if (!$contact) {
        http_response_code(404);
        echo 'Contact not found.';
        exit;
    }

    $mode = 'edit';
    $title = 'Edit Contact';
    require __DIR__ . '/../views/form.php';
    exit;
}

$search = trim((string) ($_GET['q'] ?? ''));
$rows = $contacts->all($search);
$stats = $contacts->stats();
require __DIR__ . '/../views/index.php';
