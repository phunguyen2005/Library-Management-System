# Book Loan Frontend

React + TypeScript + Vite client for the Library Management System.

## Stack

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS v4

## Setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Set the API base URL in `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

The dev server runs on:

```text
http://localhost:3000
```

## Useful Commands

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Use `npm.cmd` in PowerShell if script execution policy blocks `npm.ps1`.

## App Flow

- Students register/login (with OTP/Google OAuth), browse the catalog, add favorites, submit borrow requests (or queue reservations if books are out of stock), track reading progress of digital books, view notifications, track active loans/history, manage remote logged-in devices/sessions, and view overdue/damage fines with dynamic MoMo QR payment integration.
- Admins manage books inventory (upload digital files), members management CRUD, review and approve/confirm-pickup/reject borrow requests, configure global library rules (settings persisted in DB via Laravel controllers), view interactive reporting charts (with CSV report exports), and view system action audit logs.
- Authentication is token-based through Laravel Sanctum with route protection guards.
- Admin settings and summary reports are fully database-backed and processed via server-side endpoints, ensuring real-time consistency.
