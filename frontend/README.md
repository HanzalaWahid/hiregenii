# React/Vite frontend

The frontend is a React single-page application that sends resume analysis, skill-alias, job-match, and health requests to the FastAPI backend.

## Setup and development

From the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The Vite development server proxies `/api` and `/health` requests to `http://localhost:8000`.

## Available scripts

Run these commands from `frontend/`:

```powershell
npm run build
npm run lint
npm run preview
```

These are the scripts declared in `package.json`; this documentation update does not claim that they have been run.

## API configuration

The API client uses `VITE_API_URL` when set and otherwise defaults to `http://localhost:8000`. The development proxy target is configured in `vite.config.js`.

The application entry point is `src/main.jsx`; `src/App.jsx` renders the views, and `src/context/ResumeContext.jsx` holds analysis state. Backend calls are centralized in `src/utils/api.js`.

See the [root README](../README.md) for backend setup, available API routes, and application limitations.
