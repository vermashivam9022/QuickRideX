# QuickRideX

QuickRideX is a full-stack bike and scooty rental platform designed for campus or local fleet operations.
It supports separate student and admin workflows, secure authentication, booking lifecycle management, and operational controls like shop open/close status.

## Highlights

- Role-based platform: `student` and `admin`
- JWT authentication with refresh-token sessions
- Student verification flow (`isApproved`) before booking
- Fleet management for bikes and scooties
- Booking creation with availability conflict checks
- Dynamic pricing using hourly and daily rates
- Booking cancellation and post-ride rating
- Admin shop status toggle that controls booking availability
- File uploads for student verification docs and bike photos

## Tech Stack

### Frontend

- React 19 + TypeScript
- Vite
- Tailwind CSS
- React Router

### Backend

- Node.js + Express
- MongoDB + Mongoose
- JWT + bcrypt
- Multer (file upload)
- cookie-parser, cors, morgan

## Monorepo Structure

```text
QuickRideX/
  backend/
    server.js
    src/
      app.js
      config/db.js
      controllers/
      middelware/
      model/
      routes/
    scripts/
  frontend/
    src/
      components/
      context/
      lib/
      pages/
      routes/
```

## Core Features

### Student Side

- Register/login with driving license and college ID upload
- View available bikes/scooties with category support
- Check booking availability for selected time window
- Create booking requests (pending by default)
- View own booking list and booking details
- Cancel own pending bookings
- Rate confirmed/completed rides
- Dashboard with booking summary and shop status

### Admin Side

- Approve or update student verification status
- Manage fleet (create/update/delete bikes and scooties)
- Upload bike photos
- View all bookings and booking details
- Approve/reject bookings via status updates
- Edit booking timing and recalculate pricing
- Monitor dashboard metrics (bookings, earnings, fleet stats)
- Toggle shop open/closed status for operations control

## Booking Rules

- Only approved students can create bookings.
- Booking start time cannot be in the past.
- Booking duration cannot exceed 1 week.
- Overlapping pending/confirmed bookings for the same vehicle are blocked.
- If shop is closed, bookings are blocked and student-side availability appears unavailable.

## Environment Variables

Create `backend/.env`:

```env
MONGO_URL=mongodb://127.0.0.1:27017
JWT_SECRET=your_jwt_secret
PORT=5000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
ADMIN_EMAILS=admin@example.com
```

Notes:
- `MONGO_URL` is required.
- `JWT_SECRET` is required for access and refresh token signing.
- `ADMIN_EMAILS` is a comma-separated list; matching registrations become `admin`.
- `CORS_ORIGIN` can include comma-separated origins.

Create `frontend/.env` (optional):

```env
VITE_API_BASE_URL=
```

If frontend and backend are on different hosts/ports, set:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Local Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd QuickRideX

cd backend && npm install
cd ../frontend && npm install
```

### 2. Run backend

```bash
cd backend
npm run dev
```

Backend runs on `http://0.0.0.0:5000` by default.

### 3. Run frontend

```bash
cd frontend
npm run dev
```

Frontend runs on Vite default port (usually `http://localhost:5173`).

## API Overview

Base URL: `/api`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout` (auth required)
- `POST /auth/logout-all` (auth required)
- `POST /auth/refresh-token`
- `GET /auth/dashboard` (auth required)

### Users

- `GET /users/me` (auth required)
- `PATCH /users/me` (auth required)

### Bikes

- `GET /bikes` (auth required)
- `GET /bikes/shop-status` (auth required)
- `POST /bikes/upload-photo` (admin)
- `POST /bikes` (admin)
- `PATCH /bikes/:id` (admin)
- `DELETE /bikes/:id` (admin)

### Bookings

- `GET /bookings` (admin)
- `GET /bookings/my` (auth required)
- `GET /bookings/my/:id` (auth required)
- `PATCH /bookings/my/:id/rating` (auth required)
- `PATCH /bookings/my/:id/cancel` (auth required)
- `GET /bookings/:id` (admin)
- `GET /bookings/availability/:bikeId` (auth required)
- `POST /bookings` (auth required)
- `PATCH /bookings/:id/status` (admin)
- `PATCH /bookings/:id/time` (admin)

### Admin

- `GET /admin/students/pending` (admin)
- `PATCH /admin/students/:id/approve` (admin)
- `PATCH /admin/students/:id/verification` (admin)
- `GET /admin/shop-status` (admin)
- `PATCH /admin/shop-status` (admin)

## Authentication Notes

- Access token is sent as `Bearer <token>` in `Authorization` header.
- Refresh token is stored in an HTTP-only cookie.
- Frontend API client retries once after `401` by calling `/api/auth/refresh-token`.

## Uploads and Static Files

- Uploaded files are stored in `backend/uploads/`.
- Backend serves uploads via `/uploads` static route.
- Bike photo URLs and student document URLs are stored as relative paths.

## Scripts

### Backend

- `npm run dev` - starts server
- `npm run start` - starts server
- `npm run backfill:bike-category` - backfill category values in existing data

### Frontend

- `npm run dev` - run Vite dev server
- `npm run build` - TypeScript build + Vite build
- `npm run preview` - preview production build
- `npm run lint` - lint codebase

## Current Status

This project is production-style in structure and suitable for portfolio/resume demonstration of:

- Full-stack architecture
- Auth and session design
- CRUD + domain rules
- Admin operations panel
- Modern React + Express + MongoDB integration

## Author

Shivam Verma
