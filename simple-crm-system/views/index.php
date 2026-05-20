<?php declare(strict_types=1); ?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Simple CRM</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f5f7fb; color: #202737; }
        .container { max-width: 980px; margin: 2rem auto; padding: 0 1rem; }
        .topbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; }
        .card { background: #fff; border-radius: 12px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,.06); margin-bottom: 1rem; }
        .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
        .badge { font-size: .9rem; color: #57607a; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: .7rem; border-bottom: 1px solid #eef0f4; }
        th { color: #4d5670; font-size: .88rem; text-transform: uppercase; letter-spacing: .03em; }
        a.button, button { background: #1967d2; color: #fff; border: none; border-radius: 8px; padding: .55rem .8rem; text-decoration: none; cursor: pointer; font-size: .9rem; }
        a.button.secondary { background: #57607a; }
        form.inline { display: inline; }
        input[type="search"] { width: 300px; max-width: 100%; border: 1px solid #d6dbe7; border-radius: 8px; padding: .55rem; }
        .row-actions { display: flex; gap: .4rem; }
        .flash { padding: .7rem .9rem; border-radius: 8px; background: #dff6df; color: #245626; margin-bottom: 1rem; }
    </style>
</head>
<body>
<div class="container">
    <div class="topbar">
        <h1>Simple CRM</h1>
        <a class="button" href="/?action=create">+ New Contact</a>
    </div>

    <?php if ($flash): ?>
        <div class="flash"><?= e((string) $flash) ?></div>
    <?php endif; ?>

    <div class="stats">
        <div class="card">
            <div class="badge">Total contacts</div>
            <strong><?= (int) $stats['total'] ?></strong>
        </div>
        <div class="card">
            <div class="badge">Added in last 7 days</div>
            <strong><?= (int) $stats['recent'] ?></strong>
        </div>
    </div>

    <div class="card">
        <form method="get" action="/" style="display:flex; gap:.5rem; align-items:center;">
            <input type="search" name="q" placeholder="Search by name, email, company" value="<?= e($search) ?>">
            <button type="submit">Search</button>
            <a class="button secondary" href="/">Clear</a>
        </form>
    </div>

    <div class="card">
        <table>
            <thead>
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Actions</th>
            </tr>
            </thead>
            <tbody>
            <?php if ($rows === []): ?>
                <tr><td colspan="5">No contacts found.</td></tr>
            <?php endif; ?>
            <?php foreach ($rows as $row): ?>
                <tr>
                    <td><?= e($row['first_name'] . ' ' . $row['last_name']) ?></td>
                    <td><?= e($row['email']) ?></td>
                    <td><?= e($row['phone']) ?></td>
                    <td><?= e($row['company']) ?></td>
                    <td class="row-actions">
                        <a class="button secondary" href="/?action=edit&id=<?= (int) $row['id'] ?>">Edit</a>
                        <form class="inline" method="post" action="/?action=delete&id=<?= (int) $row['id'] ?>" onsubmit="return confirm('Delete this contact?');">
                            <input type="hidden" name="_csrf" value="<?= e($_SESSION['csrf_token']) ?>">
                            <button type="submit" style="background:#b42318;">Delete</button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
</body>
</html>
