# 📚 Library-Management-System — Enterprise Digital Library & Co-Working Ecosystem

[![Laravel Version](https://img.shields.io/badge/Laravel-12.x-red.svg?style=flat-round&logo=laravel)](https://laravel.com)
[![React Version](https://img.shields.io/badge/React-19.x-blue.svg?style=flat-round&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?style=flat-round&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38bdf8.svg?style=flat-round&logo=tailwindcss)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg?style=flat-round&logo=docker)](https://www.docker.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini--AI-Integrated-orange.svg?style=flat-round&logo=google)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An enterprise-grade, full-stack library management system featuring a **Laravel 12 RESTful API** backend and a high-performance **React 19 + Vite + TypeScript** single-page application (SPA). This system transitions traditional library management into a modern, **AI-integrated digital library** and **co-working study room booking space**.

Designed with clean architecture, dynamic role-based access control (RBAC), robust database transactional models, automated waitlists, digitized fines with mock mobile payment integration (MoMo & VNPay), interactive AI chatbot assistance, and multi-container Docker environments.

---

## 📖 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Core Features & Workflows](#4-core-features--workflows)
    - [Student Workflows](#student-workflows)
    - [Librarian & Admin Workflows](#librarian--admin-workflows)
    - [AI-Powered Capabilities](#ai-powered-capabilities)
    - [Digital Library & Study Rooms](#digital-library--study-rooms)
    - [Security & Auditing](#security--auditing)
5. [Installation & Setup](#5-installation--setup)
    - [Option A: Containerized Setup (Docker - Recommended)](#option-a-containerized-setup-docker---recommended)
    - [Option B: Native Setup (Manual)](#option-b-native-setup-manual)
6. [Database Seeded Demo Accounts](#6-database-seeded-demo-accounts)
7. [Environment Variables](#7-environment-variables)
8. [Comprehensive API Surface Summary](#8-comprehensive-api-surface-summary)
9. [Automated Test Suite](#9-automated-test-suite)
10. [Troubleshooting & FAQs](#10-troubleshooting--faqs)

---

## 1. Project Overview

The **Book Loan Midterm** project represents a complete, professional modernization of library systems. It bridges the gap between physical book borrowing workflows and modern digital content ingestion. 

Rather than a simple CRUD application, the system handles complex domain invariants:
- **Pessimistic locking and DB transactions** to ensure zero data race-conditions during concurrent borrow checkouts.
- **Automated Waitlist Reservations** that shift positions dynamically as resources fluctuate.
- **Digital PDF Readers** with page progress persistence and cross-device sync.
- **Visual Reading Room scheduling** that enforces booking quotas.
- **Daily fine accrual** with complete auditing, waivers, and dynamic mock QR payment processing.
- **Gemini 1.5 Flash AI Assistant** providing natural-language chat suggestions, summaries, and personalized recommendation engines.

---

## 2. Tech Stack

### 💻 Backend API Core
- **Framework**: Laravel 12.x
- **Language**: PHP 8.2+
- **Database**: SQLite (local developer ease) / MySQL 8.0 (production-ready deployment)
- **Authentication**: Laravel Sanctum (token-based stateless authentication)
- **AI Engine**: Google Gemini API via official Client SDK
- **Task Runner**: Artisan DB-backed queue worker for emails, AI tagging, and reports exports
- **API Spec**: Scramble OpenAPI 3.0 auto-documentation

### 🎨 Frontend Client SPA
- **Library**: React 19.x (TypeScript strict-mode)
- **Build Engine**: Vite 6.x
- **Styling**: TailwindCSS 4.x & Motion (formerly Framer Motion) for elegant micro-interactions
- **Router**: React Router v6
- **Charts**: Recharts (Analytics and reports graphics)
- **Internationalization**: React-i18next (supports seamless English & Vietnamese UI switching)
- **QR Operations**: `qrcode.react` (generation) & `@yudiel/react-qr-scanner` (real-time camera scans)

### 🐳 DevOps & Testing
- **Orchestration**: Docker & Docker Compose (Multi-container architecture)
- **Production Server**: Nginx (serving build assets under optimized cache-control headers)
- **Tests**: Vitest (Frontend unit testing) & PHPUnit (Laravel feature test suite)

---

## 3. Repository Structure

```text
BOOK_LOAN_MIDTERM/
├── .github/                   # Automated CI/CD workflows
├── BE/                        # Laravel API Backend
│   ├── app/                   # Core controllers, middleware, models & requests
│   ├── bootstrap/             # App initialization configurations
│   ├── config/                # Framework settings (auth, database, sanctum)
│   ├── database/              # Migrations, Model Factories & Seeder scripts
│   ├── routes/                # Endpoint routing definitions (api.php)
│   ├── tests/                 # PHPUnit integration/feature test cases
│   ├── Dockerfile             # Multi-stage Backend container assembly instructions
│   └── .env.example           # Backend environment configuration template
├── FE/
│   └── book_loan/             # React SPA Frontend
│       ├── src/               # React components, contexts, pages, styles & types
│       │   ├── api/           # Typed REST endpoints (auth, books, rooms, fines)
│       │   ├── components/    # Reusable controls (AiChat, RoomMap, LanguageToggle)
│       │   ├── i18n/          # Locales configuration (EN / VI translations JSON)
│       │   └── pages/         # High-fidelity layout pages (Home, Catalog, AdminSettings)
│       ├── public/            # Static assets
│       ├── Dockerfile             # Multi-stage Frontend container configuration
│       ├── package.json       # React dependencies & scripts configuration
│       └── .env.example       # Frontend environment configuration template
├── docker-compose.yml         # Enterprise multi-container layout configuration
├── PROJECT_DOCUMENTATION.md   # Extensive database schema & architectural workflows
└── README.md                  # Unified primary onboarding document (This file)
```

---

## 4. Core Features & Workflows

### Student Workflows
*   **FTS5 Smart Search & Catalog**: Fast autocomplete suggestions queried directly from the backend as you type (debounced at 300ms) with categories filtering.
*   **Borrowing Requests Queue**: Streamlined checkout process that respects database limits (maximum 5 active loans/requests per student).
*   **Personalized Wishlist (Favorites)**: Bookmark titles, view compiled favorites, and receive alerts if out-of-stock items become available.
*   **Overdue Fines Dashboard**: Check active overdue fees, calculate daily increments automatically, and pay online through dynamic simulated MoMo QR-codes or VNPay sandboxes.
*   **In-app Notification Dropdown**: Real-time read/unread counts, notifications history, and email triggers for loan approvals/reminders.
*   **My Sessions & Remote Logout**: Complete visual list of active tokens, IPs, and user agents with immediate remote device revocation.

### Librarian & Admin Workflows
*   **Analytics Control Center**: Beautiful dashboard displaying key library indicators: aggregate active loans, overdue book charts, revenue streams, and member trends.
*   **Inventory Ingestion & AI Enhancer**: Catalog CRUD supporting image attachments, digital resource files uploads, and automated Gemini AI summaries/tagging.
*   **Interactive Review Center**: Approve checkouts, submit detailed rejections, confirm physical book pickup via QR camera scanners, and process returned books.
*   **Fines Settlement**: Record cash payments, waive fines with administrative justification, and view detailed payment histories.
*   **Dynamic Policies Configurator**: Tweak loan durations, active loan quotas, grace periods, daily penalty rates, and study room booking constraints on the fly. Persisted in the database.
*   **System Action Audits**: Trace administrative activity logs showing precisely who performed an operation, the target ID, and JSON-diffs of changed parameters.

### AI-Powered Capabilities
*   **Interactive Chat Helper**: Chat directly with a floating AI assistant trained on the library's catalog. Supports real-time book queries and direct link redirections.
*   **Personalized Recommendation Engine**: One-click AI compilation that analyzes a student's history, favorite categories, reviews, and ratings to provide highly contextual reading recommendations.
*   **AI Auto-tagging & Summaries**: Accelerate catalog listings; the AI extracts description keywords and produces professional summaries with single-button prompts.

### Digital Library & Study Rooms
*   **Integrated Digital PDF Viewer**: Read documents online directly within the React layout. Native zoom controls, full-screen options, and bookmarking.
*   **Reading Progress Auto-Sync**: The application auto-saves your current page progress, synchronizing your reading position across multiple devices.
*   **Waitlist Book Reservations**: Automatically join a queue when a book is out-of-stock. Returns immediately assign the book to the next person in line.
*   **Reading Rooms & Visual Map**: visual seat-map grids displaying study spaces. Reserve time slots, enforce limits, and scan check-in codes at the desk.

### Security & Auditing
*   **Dynamic RBAC Middleware**: Robust role and permission checks applied at the routing layer (`role:student`, `role:admin,librarian` combined with `permission:manage_books`, etc.).
*   **Role Registration Protection**: Students cannot self-assign administrative roles. Registration defaults strictly to `student`.
*   **Forgot/Reset Password OTP Verification**: Secure, multi-step email verification utilizing cached OTP tokens.
*   **Hashed Tokens Flow**: Secure forgot password and authentication flows utilizing Bcrypt hashing.
*   **API Throttling & Security Limits**: Custom rate limits applied to auth endpoints to defend against brute-force attacks.

---

## 5. Installation & Setup

You can run the entire ecosystem locally using either Docker (Recommended) or by setting up native local development environments.

### Option A: Containerized Setup (Docker - Recommended)

Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on your machine.

#### Step 1: Copy Environment Templates
From the root repository directory, copy the example environment files:

```bash
# On Linux/macOS
cp BE/.env.example BE/.env
cp FE/book_loan/.env.example FE/book_loan/.env

# On Windows PowerShell
Copy-Item BE/.env.example BE/.env
Copy-Item FE/book_loan/.env.example FE/book_loan/.env
```

#### Step 2: Build & Start All Containers
Launch the Docker daemon:

```bash
docker-compose up --build -d
```

This spins up four integrated services:
1.  `app`: Laravel 12 API server listening on `http://localhost:8000`.
2.  `queue`: Artisan Queue Worker listening to database background jobs.
3.  `db`: MySQL 8.0 server listening on port `3306` inside the isolated network.
4.  `frontend`: React production bundle compiled and served via Nginx on `http://localhost:5173`.

#### Step 3: Run Database Setup & Seeding
Once the services are active, initialize and populate the database with a single command:

```bash
docker-compose exec app php artisan migrate:fresh --seed
```

Access the system immediately at:
-   **Frontend SPA client**: [http://localhost:5173](http://localhost:5173)
-   **Backend REST API**: [http://localhost:8000/api](http://localhost:8000/api)
-   **Swagger OpenAPI 3.0 Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
-   **Health check monitor**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

To stop the containers:
```bash
docker-compose down
```

---

### Option B: Native Setup (Manual)

#### Prerequisites
-   **PHP 8.2 or newer** with standard extensions (`pdo_sqlite`, `mbstring`, `zip`, `xml`).
-   **Composer 2.x+**
-   **Node.js 18+ & npm**

#### Step 1: Setup Backend Server
1.  Navigate to the backend directory and install dependencies:
    ```bash
    cd BE
    composer install
    ```
2.  Create your local environment file:
    ```bash
    cp .env.example .env
    # PowerShell: Copy-Item .env.example .env
    ```
3.  Generate the application encryption key:
    ```bash
    php artisan key:generate
    ```
4.  Create the SQLite database file:
    ```bash
    # Linux/macOS
    touch database/database.sqlite
    
    # Windows PowerShell
    New-Item -ItemType File -Path database/database.sqlite -Force
    ```
5.  Run migrations and populate seed data:
    ```bash
    php artisan migrate:fresh --seed
    ```
6.  Start the local PHP server:
    ```bash
    php artisan serve --host=127.0.0.1 --port=8000
    ```

#### Step 2: Setup Frontend Client
1.  Open a second terminal window and navigate to the frontend directory:
    ```bash
    cd FE/book_loan
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Copy the frontend environment template:
    ```bash
    cp .env.example .env
    # PowerShell: Copy-Item .env.example .env
    ```
4.  Confirm `FE/book_loan/.env` contains the correct API base URL:
    ```env
    VITE_API_BASE_URL=http://localhost:8000/api
    ```
5.  Start the development server:
    ```bash
    npm run dev
    ```
    The Vite server will launch and bind to [http://localhost:3000](http://localhost:3000) (as configured in `package.json`).

---

## 6. Database Seeded Demo Accounts

Running `php artisan db:seed` inserts a complete set of role-based accounts, settings, rooms, and sample books.

*   **Default Account Passwords**: `Library@2026`
    > [!TIP]
    > You can customize this default password by setting `LIBRARY_DEMO_PASSWORD` in your backend `.env` file before running the seeders.

| Role | Username / Identifier | Email Address | Assigned Permissions |
|---|---|---|---|
| **Student (Member)** | `1` | `4801104101@student.hcmue.edu.vn` | Browse library, mượn sách, book study rooms, chat AI |
| **Student (Member)** | `2` | `4801104102@student.hcmue.edu.vn` | Browse library, mượn sách, book study rooms, chat AI |
| **Admin** | `1` | `nguyen.van.an@hcmue.edu.vn` | Full administrative capabilities (All permissions) |
| **Admin** | `2` | `tran.thi.mai@hcmue.edu.vn` | Full administrative capabilities (All permissions) |

---

## 7. Environment Variables

### Backend Environment Configuration (`BE/.env`)

Below are key variables that control the application's runtime state:

```env
APP_ENV=local
APP_DEBUG=true
APP_KEY=base64:... # Generated via artisan key:generate

# Native Setup Database Configuration (SQLite)
DB_CONNECTION=sqlite

# Docker Setup Database Configuration (Uncomment inside container/Docker compose env)
# DB_CONNECTION=mysql
# DB_HOST=db
# DB_PORT=3306
# DB_DATABASE=book_loan
# DB_USERNAME=root
# DB_PASSWORD=secret

# Core Library System Defaults
SANCTUM_EXPIRATION=10080
LIBRARY_DEMO_PASSWORD=Library@2026

# Google Gemini AI Integration (Required for Chatbot, Tagging, and AI Recommendations)
GEMINI_API_KEY=AIzaSy...

# Queue configuration
QUEUE_CONNECTION=database
CACHE_STORE=database
```

### Frontend Environment Configuration (`FE/book_loan/.env`)

Required for REST integration:

```env
# URL pointing to the Laravel API
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 8. Comprehensive API Surface Summary

Here are the main endpoints defined in `BE/routes/api.php`, grouped by scope and protection layer:

### 🔑 Authentication & OTP
*   `POST /api/login` - Authenticate credentials, logs login history, IP & device type.
*   `POST /api/register` - Student self-registration (Default role locked to `student`).
*   `POST /api/verify-otp` - Verify email verification OTP token.
*   `POST /api/resend-otp` - Resend verification OTP token.
*   `POST /api/forgot-password` - Request a password-reset OTP.
*   `POST /api/verify-forgot-password-otp` - Verify the password reset OTP.
*   `POST /api/reset-password` - Update password using the verified reset OTP.
*   `GET /api/auth/{provider}/redirect` - Google OAuth authentication redirect.
*   `GET /api/auth/{provider}/callback` - Google OAuth callback endpoint.

### 📚 Catalog & Digital Library
*   `GET /api/books` - Query full catalog with server-side pagination, search parameters, and category filtering.
*   `GET /api/books/autocomplete` - Real-time autocomplete suggestions queried via FTS5 database indices.
*   `GET /api/books/{bookId}/reviews` - Retrieve student ratings and review comments for a book.
*   `GET /api/digital-documents` - Retrieve all digital resources in the catalog.
*   `GET /api/digital-documents/{book}/download` - Stream digital file download securely via secure **temporary signed URLs**.

### 🏛️ Public Study Rooms
*   `GET /api/rooms` - Retrieve co-working and study spaces.
*   `GET /api/rooms/{room}` - View details of a specific study room.
*   `GET /api/rooms/{room}/schedule` - View hourly schedules and bookings for a specific room.

### 💳 Payments Webhooks
*   `POST /api/momo/ipn` - Dynamic MoMo IPN instant payment webhook callback.
*   `POST /api/momo/simulate-ipn` - Simulate a successful MoMo payment callback for local testing.
*   `POST /api/vnpay/ipn` - VNPay gateway transaction verification.

### 🔒 Authenticated Shared Endpoints (Sanctum Protected)
*   `GET /api/me` - Retrieve current session's user profile.
*   `PUT /api/me` - Update profile details and in-app/email notification settings.
*   `POST /api/logout` - Invalidate current session Sanctum token.
*   `GET /api/me/devices` - Retrieve active logged-in sessions and device types.
*   `DELETE /api/me/devices/{tokenId}` - Revoke a remote session/device token.
*   `GET /api/notifications` - Retrieve list of user notifications.
*   `PUT /api/notifications/{id}/read` - Mark a notification as read.
*   `POST /api/notifications/read-all` - Mark all notifications as read.
*   `POST /api/ai/chat` - Interact with the Google Gemini AI chatbot.
*   `GET /api/ai/recommendations` - Retrieve personalized recommendations from Gemini.

### 🧑‍🎓 Student Workflows (Role: `student` Locked)
*   `POST /api/requests` - Submit a borrow request (triggers reservation waitlist if out of stock).
*   `GET /api/requests/me` - Retrieve current student's borrowing history with server-side pagination.
*   `DELETE /api/requests/{loanId}/cancel` - Cancel a pending borrow request.
*   `GET /api/favorites` - Retrieve student's wishlisted books.
*   `POST /api/favorites/{book}` - Add a book to favorites.
*   `DELETE /api/favorites/{book}` - Remove a book from favorites.
*   `GET /api/reading-progress` - View digital document page numbers progress history.
*   `GET /api/reading-progress/{book}` - View reading progress details for a specific book.
*   `PUT /api/reading-progress/{book}` - Update active reading progress page count.
*   `POST /api/books/{bookId}/reviews` - Post a book rating (1-5 stars) and review text.
*   `GET /api/reservations/me` - View active reservations in waitlists.
*   `POST /api/reservations/{bookId}` - Manually join a book's reservation queue.
*   `DELETE /api/reservations/{reservationId}` - Cancel an active reservation.
*   `GET /api/fines/me/summary` - View current student's fine totals and overdue counts.
*   `GET /api/fines/me` - List all details of active and settled student fines.
*   `POST /api/fines/{fineId}/momo/pay` - Generate dynamic simulated MoMo QR checkout page.
*   `POST /api/fines/{fineId}/vnpay/pay` - Generate a VNPay payment redirection portal.
*   `POST /api/room-bookings` - Request a study room reservation.
*   `GET /api/room-bookings/me` - View personal study room reservation history.
*   `DELETE /api/room-bookings/{id}/cancel` - Cancel a pending room booking.
*   `POST /api/room-bookings/{id}/check-out` - End a room booking early.

### 👮 Staff & Librarians Workflows (Role: `admin` or `librarian`)
*   `POST /api/ai/books/{book}/metadata` - Automatically generate book summaries and tags using Gemini.
*   **Members Directory (Permission: `manage_members`)**:
    *   `GET /api/members` - Retrieve all members.
    *   `POST /api/members` - Add a new student member account.
    *   `POST /api/members/import` - Bulk import member profiles from spreadsheet uploads.
    *   `PUT /api/members/{member}` - Update a member's profile and credentials.
    *   `DELETE /api/members/{member}` - Soft-delete a member.
*   **Catalog Control (Permission: `manage_books`)**:
    *   `POST /api/books` - Add a new book listing.
    *   `POST /api/books/import` - Bulk upload books from spreadsheet files.
    *   `PUT /api/books/{book}` - Update an existing book's details.
    *   `POST /api/books/{book}/digital-file` - Upload a digital file (PDF) for online reading.
    *   `DELETE /api/books/{book}` - Soft-delete a book (denied if active loans exist).
*   **Circulation Management (Permission: `approve_requests`)**:
    *   `GET /api/requests` - Retrieve all borrow requests.
    *   `POST /api/requests/{loanId}/approve` - Move a request from `pending` to `approved` (Locks stock).
    *   `POST /api/requests/{loanId}/confirm-pickup` - Scan physical QR code and mark status as `borrowed`.
    *   `POST /api/requests/{loanId}/reject` - Reject a pending request (with reason).
    *   `POST /api/requests/{loanId}/return` - Return a book, calculate overdue fines, and trigger next waitlist reservation.
    *   `PATCH /api/requests/{loanId}/extend` - Extend a loan's due date.
    *   `GET /api/admin/fines` - Manage all system-wide fines.
    *   `GET /api/admin/fines/statistics` - Retrieve global financial analysis.
    *   `POST /api/fines/{fineId}/pay` - Manually settle a fine (cash payment).
*   **Study Spaces Control (Permission: `manage_rooms`)**:
    *   `GET /api/admin/room-bookings` - Manage global room reservations.
    *   `GET /api/admin/room-bookings/statistics` - View room utilization charts.
    *   `POST /api/admin/room-bookings/{id}/approve` - Approve a study space booking.
    *   `POST /api/admin/room-bookings/{id}/reject` - Decline a study space booking.
    *   `POST /api/admin/room-bookings/{id}/check-in` - Record check-in at a room.
    *   `POST /api/rooms` - Create a new study space.
    *   `PUT /api/rooms/{room}` - Modify a study space's settings.
    *   `DELETE /api/rooms/{room}` - Remove a study space.
*   **Audit logs (Permission: `view_audit_logs`)**:
    *   `GET /api/audit-logs` - View system-wide administrative audit trails and actions.
*   **Global Settings (Permission: `manage_settings`)**:
    *   `GET /api/library-settings` - Retrieve system configuration.
    *   `PUT /api/library-settings` - Update library limits and fine rules in real-time.
*   **Fine Waivers (Permission: `waive_fines`)**:
    *   `POST /api/fines/{fineId}/waive` - Waive overdue fees with administrative justification.
*   **Librarian Management (Permission: `manage_librarians` - Admin Only)**:
    *   `GET /api/librarians` - List all librarians.
    *   `POST /api/librarians` - Add a new librarian account.
    *   `PUT /api/librarians/{librarian}` - Edit librarian permissions and details.
    *   `DELETE /api/librarians/{librarian}` - Terminate a librarian account.

---

## 9. Automated Test Suite

A comprehensive suite of feature tests covers critical workflows, database transactions, limits, and security controls.

### Running Backend Tests (Laravel Feature Tests)

1.  Enter the backend folder:
    ```bash
    cd BE
    ```
2.  Execute the feature test suite:
    ```bash
    php artisan test
    ```
    *This runs testing targets covering AI metadata injection, book reviews, reservation waitlists, fines calculations, and database transactions under concurrent checkouts.*

### Running Frontend Tests (Vitest Engine)

1.  Enter the frontend folder:
    ```bash
    cd FE/book_loan
    ```
2.  Execute the Vitest tests:
    ```bash
    npm run test
    ```
    *This executes React test suites covering i18n configurations, visual theme controls, study room reservation forms, page progress auto-saving, and fine dashboards.*

---

## 10. Troubleshooting & FAQs

### Q1: The Frontend client shows a white screen or crashes on load.
*   Make sure you are running **React 19** compatible packages.
*   Run `npm run lint` inside the `FE/book_loan` folder to check for TypeScript errors.
*   Verify the Vite environment file exists: `FE/book_loan/.env`.
*   Ensure that `VITE_API_BASE_URL` matches your running Laravel API server URL exactly.

### Q2: I get a "429 Too Many Requests" error when testing login or OTP.
*   Auth endpoints have a secure rate limiter active (`throttle:auth`).
*   Wait 60 seconds and attempt the action again.
*   For development testing, you can change the rate limits in `app/Http/Controllers/AuthController.php` or `routes/api.php`.

### Q3: Why is the AI Chatbot or Book Recommendations returning errors?
*   These features require a valid Google Gemini API Key.
*   Verify your backend `.env` file contains `GEMINI_API_KEY=AIzaSy...`.
*   If running under Docker, verify the key was exported inside the environment block or in `docker-compose.yml`, then restart the containers: `docker-compose down && docker-compose up -d`.

### Q4: Database errors or "SQLite database is locked".
*   This can occur if multiple concurrent transactions attempt to write to SQLite.
*   For a production-grade database, configure the backend to use **MySQL 8.0** inside `BE/.env` or run the system through our optimized pre-configured Docker Compose cluster.

---

## 👨‍💻 Development Team

Developed by **TTVP Group** — PhP Project Presentation.
Licensed under the [MIT License](LICENSE).
