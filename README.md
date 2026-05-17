<div align="center">
  <br />
  <h1 align="center">OptiScan</h1>

  <p align="center">
    A modern, high-performance application built with React and FastAPI.
    <br />
    <a href="#getting-started"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/syedowais2724/optiscan/issues">Report Bug</a>
    ·
    <a href="https://github.com/syedowais2724/optiscan/issues">Request Feature</a>
  </p>
</div>

<!-- BADGES -->
<div align="center">
  <img alt="React" src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB"/>
  <img alt="Vite" src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white"/>
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white"/>
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi"/>
  <img alt="Python" src="https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54"/>
  <img alt="SQLite" src="https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white"/>
</div>

<br />

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#tech-stack">Tech Stack</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#backend-setup">Backend Setup</a></li>
        <li><a href="#frontend-setup">Frontend Setup</a></li>
      </ul>
    </li>
  </ol>
</details>

## About The Project

OptiScan is a powerful, modern monorepo application designed for peak performance and excellent developer experience. It leverages the speed of **Vite** and **React** on the frontend, perfectly paired with a lightning-fast **FastAPI** backend driven by Python. 

## Tech Stack

* **Frontend:** React, Vite, TypeScript
* **Backend:** FastAPI, Python
* **Database:** SQLite

## Project Structure

A clean separation of concerns within a unified repository:

```text
optiscan/
├── backend/       # FastAPI server, database models, and API routes
└── frontend/      # React client, UI components, and state management
```

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

* [Node.js](https://nodejs.org/) (v16 or higher recommended)
* [Python](https://www.python.org/downloads/) (3.9 or higher recommended)

### Backend Setup

The backend handles API requests, database interactions, and business logic.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # On Windows:
   .venv\Scripts\activate
   # On macOS/Linux:
   # source .venv/bin/activate
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables (optional based on `.env.example`):
   ```bash
   copy .env.example .env
   ```
5. Start the FastAPI server (runs on `http://localhost:8000`):
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

The frontend is a blazing fast React SPA built with Vite.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install NPM dependencies:
   ```bash
   npm install
   ```
3. Start the development server (runs on `http://localhost:5173`):
   ```bash
   npm run dev
   ```

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/syedowais2724">Owais</a>.</p>
</div>
