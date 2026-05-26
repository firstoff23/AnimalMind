---
title: AnimalMind ML Backend
emoji: 🐾
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# AnimalMind ML Backend

FastAPI service for acoustic pet-state classification. The Hugging Face Space runs this service through Docker on port `7860`.

## Endpoints

- `GET /health` returns the service health status.
- `POST /classify` accepts an uploaded audio file and returns the predicted animal state.

## Deployment Notes

- Runtime base image: `python:3.11-slim`.
- System packages: `ffmpeg` and `libsndfile1`.
- The container runs as `USER 1000`, as required by Hugging Face Spaces.
- After the Space is deployed, update Vercel `FASTAPI_BACKEND_URL` to the Space URL, for example `https://<owner>-animalmind-ml-backend.hf.space`.
- Do not update `FASTAPI_BACKEND_URL` before the Space is live and `/health` returns `200`.
