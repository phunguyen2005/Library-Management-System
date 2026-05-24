# Book Loan API Postman Guide

Use this collection to exercise the current Laravel API from Postman.

## Import

1. Start the backend: `php artisan serve --host=127.0.0.1 --port=8000`.
2. Import `BOOK_LOAN_API.postman_collection.json`.
3. Confirm the collection variable `base_url` is `http://localhost:8000/api`.
4. Run `Auth / Login Student` or `Auth / Login Admin` first. The collection stores the returned token in `student_token` or `admin_token`.

## Seeded Accounts

Default password: `Library@2026`

- Student: `4801104101@student.hcmue.edu.vn`
- Admin: `nguyen.van.an@hcmue.edu.vn`

## Current Endpoint Groups

- Auth/profile: `POST /login`, `POST /register`, `POST /verify-otp`, `POST /resend-otp`, `POST /forgot-password`, `POST /verify-forgot-password-otp`, `POST /reset-password`, `GET /me`, `PUT /me`, `GET /me/devices`, `DELETE /me/devices/{id}`, `POST /logout`, `GET /auth/{provider}/redirect`, `GET /auth/{provider}/callback`
- Books: `GET /books`, `GET /books/autocomplete`, `GET /books/{id}/reviews`, `POST /books`, `PUT /books/{book}`, `POST /books/{book}/digital-file`, `DELETE /books/{book}`
- Digital documents: `GET /digital-documents`, signed `GET /digital-documents/{book}/download`
- Student requests: `POST /requests`, `GET /requests/me`
- Admin requests: `GET /requests`, `POST /requests/{loanId}/approve`, `POST /requests/{loanId}/confirm-pickup`, `POST /requests/{loanId}/reject`, `POST /requests/{loanId}/return`
- Members CRUD: `GET /members`, `POST /members`, `PUT /members/{member}`, `DELETE /members/{member}`
- Favorites: `GET /favorites`, `POST /favorites/{book}`, `DELETE /favorites/{book}`
- Reading Progress: `GET /reading-progress`, `PUT /reading-progress/{book}`
- Reservations Queue: `GET /reservations/me`, `POST /reservations/{bookId}`, `DELETE /reservations/{id}`
- Fines & Payments: `GET /fines/me/summary`, `GET /fines/me`, `POST /fines/{id}/momo/pay`, `GET /admin/fines`, `GET /admin/fines/statistics`, `POST /fines/{id}/pay`, `POST /fines/{id}/waive`, `POST /momo/ipn`
- Settings: `GET /library-settings`, `PUT /library-settings`
- Reports: `GET /reports`, `GET /reports/export`
- Audit logs: `GET /audit-logs`
- Notifications: `GET /notifications`, `PUT /notifications/{id}/read`, `POST /notifications/read-all`
- AI Assistant: `POST /ai/chat`, `GET /ai/recommendations`

## Recommended Smoke Flow

1. Login as a student and an admin.
2. Get books and choose an available `book_id`.
3. As student, create `POST /requests`.
4. Copy the returned `loan.loan_id` into the `loan_id` collection variable.
5. As admin, approve the request, then mark it returned.
6. Check `GET /requests/me`, `GET /requests`, and `GET /books` to confirm status and inventory changes.
