#!/usr/bin/env bash
set -euo pipefail

trap 'kill 0' EXIT

(
  cd backend
  if [ ! -d .venv ]; then
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
  fi
  [ -f .env ] || cp .env.example .env
  .venv/bin/uvicorn app.main:app --reload --port 8000
) &

(
  cd frontend
  [ -d node_modules ] || npm install
  [ -f .env.local ] || cp .env.local.example .env.local
  npm run dev
) &

wait
