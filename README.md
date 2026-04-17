# YourTube

YourTube is a full-stack video platform inspired by YouTube. It includes a Next.js frontend and an Express/MongoDB backend with authentication, video uploads, comments, likes, watch history, watch later, downloads, and premium plan support.

## Live Setup

- Frontend:
  Deploy the `yourtube/` app on Vercel or another Next.js-compatible platform.
- Backend:
  Configured to use `https://yourtube-backend-wnxy.onrender.com` as the production API base URL.

## Features

- Google sign-in with Firebase Authentication
- Video upload and playback
- Like and dislike support
- Watch later and watch history
- Comments with edit, delete, reaction, and translation support
- Premium plan purchase flow with Razorpay
- Download support for signed-in users
- Responsive UI built with Next.js and Tailwind CSS

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Axios, Firebase
- Backend: Node.js, Express, MongoDB, Mongoose
- Payments: Razorpay
- Email: Nodemailer

## Project Structure

```text
you_tube2.0/
|-- server/     # Express backend
|-- yourtube/   # Next.js frontend
|-- README.md
```

## Run Locally

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd you_tube2.0
```

### 2. Backend setup

```bash
cd server
npm install
```

Create a `.env` file using `server/.env.example`, then start the backend:

```bash
npm start
```

The backend runs on `http://localhost:5000` by default unless `PORT` is provided.

### 3. Frontend setup

```bash
cd ../yourtube
npm install
```

Create a `.env.local` file using `yourtube/.env.example`, then start the frontend:

```bash
npm run dev
```

The frontend runs on `http://localhost:3000`.

## Environment Variables

### Backend (`server/.env`)

Required values depend on the features you want enabled:

- `PORT`
- `DB_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### Frontend (`yourtube/.env.local`)

- `NEXT_PUBLIC_BACKEND_URL`

## Submission Notes

- This repository is organized as a monorepo with separate frontend and backend folders.
- Local environment files, build output, logs, and uploaded media are excluded from version control.
- Replace placeholder environment values from the example files before running the project.

