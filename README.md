# Fitness Tracker

A full-stack fitness tracker built with React, TypeScript, Vite, and Strapi. The app lets users create an account, complete onboarding, track meals, log workouts, monitor daily progress, and use Gemini AI to estimate calories from food photos.

## Live Demo

https://fitness-tracker-lovat-seven.vercel.app/

## Features

- User signup and login with Strapi authentication
- Guided onboarding for age, weight, height, goal, and calorie targets
- Dashboard with calorie intake, calories burned, BMI, and weekly progress
- Food logging with meal categories and daily totals
- Activity logging with quick presets and custom workouts
- Profile editing and session logout
- Gemini-powered food image analysis for calorie estimation

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Axios, Recharts
- Backend: Strapi 5, TypeScript, SQLite
- AI: Google Gemini (`GEMINI_API_KEY`)
- Deployment: Vercel (frontend)

## Project Structure

```text
fitness tracker/
|-- cilent/   # React frontend
|-- server/   # Strapi backend
|-- package.json
```

Note: the frontend folder is currently named `cilent/` in the repository.

## Local Setup

### 1. Install dependencies

```bash
npm install
npm --prefix cilent install
npm --prefix server install
```

### 2. Add environment variables

Create `cilent/.env`:

```env
VITE_STRAPI_API_URL=http://localhost:1337
```

Create `server/.env`:

```env
HOST=0.0.0.0
PORT=1337
APP_KEYS=your_app_keys
API_TOKEN_SALT=your_api_token_salt
ADMIN_JWT_SECRET=your_admin_jwt_secret
TRANSFER_TOKEN_SALT=your_transfer_token_salt
ENCRYPTION_KEY=your_encryption_key
JWT_SECRET=your_jwt_secret
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
GEMINI_API_KEY=your_gemini_api_key
```

If you switch away from SQLite, also configure the relevant database variables in `server/.env`.

### 3. Run the app

Use two terminals from the project root:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

Frontend default URL: `http://localhost:5173`  
Backend default URL: `http://localhost:1337`

## Available Scripts

From the project root:

- `npm run dev:client` - start the Vite frontend
- `npm run dev:server` - start the Strapi backend
- `npm run build` - build the frontend
- `npm run lint` - run frontend linting
- `npm run preview` - preview the frontend build

## API Notes

- The frontend reads its API base URL from `VITE_STRAPI_API_URL`
- The backend stores data in SQLite by default
- Food image analysis requires a valid Gemini API key in `server/.env`

## Author

Kanka Das
