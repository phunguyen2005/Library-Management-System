# Book Loan Backend

Laravel 12 API for the Book Loan Midterm system.

## Stack

- PHP 8.2+
- Laravel 12
- Laravel Sanctum personal access tokens
- SQLite by default, MySQL supported through `.env`

## Setup

```powershell
composer install
Copy-Item .env.example .env
New-Item -ItemType File -Path database/database.sqlite -Force
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

The API base URL is:

```text
http://127.0.0.1:8000/api
```

## Demo Accounts

Default password: `Library@2026`

- Student: `4801104101@student.hcmue.edu.vn`
- Admin: `nguyen.van.an@hcmue.edu.vn`

## Useful Commands

```powershell
php artisan route:list --path=api
php artisan test
php -l test_apis.php
```

Optional smoke script after starting `php artisan serve`:

```powershell
php test_apis.php
```

## API Notes

- Public: login, register, book list, digital documents.
- Authenticated: `/me`, profile update, logout.
- Student: create borrow requests and view own requests.
- Admin: manage books, members, and request approval/rejection/return.

See `postman/README.md` and `postman/BOOK_LOAN_API.postman_collection.json` for current Postman usage.
