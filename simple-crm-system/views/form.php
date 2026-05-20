<?php declare(strict_types=1); ?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($title) ?> - Simple CRM</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f5f7fb; color: #202737; }
        .container { max-width: 760px; margin: 2rem auto; padding: 0 1rem; }
        .card { background: #fff; border-radius: 12px; padding: 1.2rem; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .9rem; }
        label { display: block; font-size: .88rem; color: #4d5670; margin-bottom: .25rem; }
        input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #d6dbe7; border-radius: 8px; padding: .55rem; }
        textarea { min-height: 120px; resize: vertical; }
        .full { grid-column: 1 / -1; }
        .error { color: #b42318; font-size: .82rem; margin-top: .2rem; }
        .actions { display: flex; gap: .5rem; margin-top: 1rem; }
        button, a.button { background: #1967d2; color: #fff; border: none; border-radius: 8px; padding: .55rem .8rem; text-decoration: none; cursor: pointer; font-size: .9rem; }
        a.button.secondary { background: #57607a; }
    </style>
</head>
<body>
<div class="container">
    <div class="card">
        <h1><?= e($title) ?></h1>

        <form method="post" action="<?= $mode === 'create' ? '/?action=store' : '/?action=update&id=' . (int) $contact['id'] ?>">
            <input type="hidden" name="_csrf" value="<?= e($_SESSION['csrf_token']) ?>">

            <div class="grid">
                <div>
                    <label for="first_name">First name</label>
                    <input id="first_name" name="first_name" value="<?= e((string) $contact['first_name']) ?>">
                    <?php if (isset($errors['first_name'])): ?><div class="error"><?= e($errors['first_name']) ?></div><?php endif; ?>
                </div>
                <div>
                    <label for="last_name">Last name</label>
                    <input id="last_name" name="last_name" value="<?= e((string) $contact['last_name']) ?>">
                    <?php if (isset($errors['last_name'])): ?><div class="error"><?= e($errors['last_name']) ?></div><?php endif; ?>
                </div>
                <div>
                    <label for="email">Email</label>
                    <input id="email" name="email" value="<?= e((string) $contact['email']) ?>">
                    <?php if (isset($errors['email'])): ?><div class="error"><?= e($errors['email']) ?></div><?php endif; ?>
                </div>
                <div>
                    <label for="phone">Phone</label>
                    <input id="phone" name="phone" value="<?= e((string) $contact['phone']) ?>">
                    <?php if (isset($errors['phone'])): ?><div class="error"><?= e($errors['phone']) ?></div><?php endif; ?>
                </div>
                <div class="full">
                    <label for="company">Company</label>
                    <input id="company" name="company" value="<?= e((string) $contact['company']) ?>">
                    <?php if (isset($errors['company'])): ?><div class="error"><?= e($errors['company']) ?></div><?php endif; ?>
                </div>
                <div class="full">
                    <label for="notes">Notes</label>
                    <textarea id="notes" name="notes"><?= e((string) $contact['notes']) ?></textarea>
                </div>
            </div>

            <div class="actions">
                <button type="submit">Save</button>
                <a class="button secondary" href="/">Cancel</a>
            </div>
        </form>
    </div>
</div>
</body>
</html>
