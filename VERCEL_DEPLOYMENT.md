# Vercel Deployment Guide

This repo can be deployed to Vercel as a static frontend plus a Python serverless API.

## What Vercel should use

- Framework preset: `Other`
- Build command: leave empty
- Output directory: leave empty
- Root directory: repository root

## Required environment variables

Set these in the Vercel project settings:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GEMINI_API_KEY`

## What this repo already includes

- `api/index.py` exposes the FastAPI app for Vercel.
- `vercel.json` rewrites `/api/*` to the FastAPI entrypoint.
- `frontend/config.js` resolves the API base automatically.
- `backend/app.py` only mounts local static files when `VERCEL` is not set.

## Deployment flow

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Set the framework preset to `Other`.
4. Add the three environment variables above.
5. Deploy.

## Notes

- The frontend will call the deployed API using the same domain on Vercel.
- Local development still works with `python -m uvicorn backend.app:app --reload` from the repo root.
- PDF uploads are sent to Supabase Storage; Vercel does not depend on local disk.