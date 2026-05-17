# OptiScan

OptiScan is scaffolded as a monorepo with a FastAPI backend and a React + Vite + TypeScript frontend.

## Project Structure

```text
optiscan/
├── backend/
└── frontend/
```

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload
```

The backend is configured for SQLite through `backend/database.py` and allows CORS requests from `http://localhost:5173`.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on Vite's default development server at `http://localhost:5173`.
