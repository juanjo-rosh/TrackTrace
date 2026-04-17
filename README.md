# TrackTrace

TrackTrace is a 3-service local app that turns a voice request into a DJ-style playlist:

1. Frontend (React + Vite): records audio in the browser and displays results.
2. AI Service (FastAPI + Whisper + Ollama): transcribes voice and generates the playlist structure.
3. Node Backend (Express + Spotify API): enriches songs with Spotify metadata and preview links.

## Demo Video

Add your demo link or embedded video here.

- Demo URL: PENDING
- Notes: Replace this section with your final demo recording.

## Project Structure

```text
TrackTrace/
	ai-service/        # FastAPI + Whisper + local LLM (Ollama)
	backend-node/      # Express API for Spotify enrichment
	frontend/          # React + Vite client
```

## End-to-End Workflow

1. You press the microphone button in the frontend.
2. The frontend records audio and sends it to `POST http://localhost:8000/api/transcribe`.
3. `ai-service` transcribes the recording using Whisper.
4. `ai-service` calls local Ollama (`llama3.2:1b`) to produce a JSON setlist.
5. The frontend sends that setlist to `POST http://localhost:3000/api/enrich-setlist`.
6. `backend-node` looks up each song in Spotify and returns enriched tracks.
7. The frontend renders the final playlist with covers and preview players.

## Prerequisites (What You Need To Download)

Install these first:

1. Git
2. Node.js LTS (recommended: 20.x or newer)
3. Python 3.12 (recommended for compatibility with current venv and Whisper setup)
4. Ollama (desktop app or CLI)

Also required:

1. Spotify Developer credentials:
	 - `SPOTIFY_CLIENT_ID`
	 - `SPOTIFY_CLIENT_SECRET`

Notes:

1. Whisper model files are downloaded the first time the AI service starts.
2. ffmpeg is handled inside the Python environment through `imageio-ffmpeg` (no global ffmpeg install required in this project setup).

## Local Setup

Run all commands from the repository root unless a step says otherwise.

### 1) Clone and enter the project

```powershell
git clone <your-repo-url>
cd TrackTrace
```

### 2) Setup AI Service (Python)

Open Terminal A:

```powershell
cd ai-service
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install fastapi uvicorn python-multipart openai openai-whisper torch imageio-ffmpeg
```

If your machine blocks activation scripts, run once in that terminal session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
```

### 3) Setup Node Backend (Spotify Integrator)

Open Terminal B:

```powershell
cd backend-node
npm install
```

Create `backend-node/.env` with:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
PORT=3000
```

### 4) Setup Frontend

Open Terminal C:

```powershell
cd frontend
npm install
```

### 5) Setup Ollama model

Open Terminal D (or reuse any terminal):

```powershell
ollama pull llama3.2:1b
```

Keep Ollama running locally so `http://localhost:11434` is available.

## Run the App (What To Do In Each Terminal)

Use 4 terminals.

### Terminal A: AI Service (port 8000)

```powershell
cd ai-service
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

Expected startup logs include:

1. `Cargando modelo Whisper...`
2. `Modelo cargado y listo.`

### Terminal B: Node Backend (port 3000)

```powershell
cd backend-node
node index.js
```

Expected log:

1. `Node.js Music Integrator running on http://localhost:3000`

### Terminal C: Frontend (Vite, usually port 5173)

```powershell
cd frontend
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

### Terminal D: Ollama

If Ollama is not already running as a service:

```powershell
ollama serve
```

## Quick Health Checks

Before testing microphone flow, verify services:

1. AI Service docs: `http://localhost:8000/docs`
2. Node backend running log in Terminal B
3. Ollama responds:

```powershell
ollama list
```

4. Frontend is reachable in browser (Vite URL)

## API Contracts

### AI Service endpoint

- `POST /api/transcribe`
- Input: multipart form-data with `file`
- Output: JSON with
	- `status`
	- `transcription`
	- `playlist_data` (`vibe_name`, `dj_intro`, `songs`, `dj_outro`)

### Node Backend endpoint

- `POST /api/enrich-setlist`
- Input: playlist JSON from AI service
- Output: enriched songs with
	- `spotify_uri`
	- `cover_url`
	- `preview_url`

## Typical Development Cycle

1. Start Ollama.
2. Start AI service.
3. Start Node backend.
4. Start frontend.
5. Open browser and test a voice request.

When changing code:

1. Frontend auto-reloads with Vite.
2. AI service auto-reloads with Uvicorn `--reload`.
3. Node backend currently needs restart after changes.

## Troubleshooting

### Error: ffmpeg not found

If you see ffmpeg-related errors in `ai-service`:

1. Activate Python venv.
2. Reinstall package:

```powershell
pip install --upgrade imageio-ffmpeg
```

3. Restart AI service.

### Error: Spotify authentication failed

1. Check `backend-node/.env` values.
2. Ensure credentials are from Spotify Developer Dashboard.
3. Restart Node backend after editing `.env`.

### Error: LLM request fails

1. Ensure Ollama is running.
2. Ensure model exists:

```powershell
ollama list
```

3. If missing, run:

```powershell
ollama pull llama3.2:1b
```

### Frontend shows generic processing error

Check logs in this order:

1. Terminal A (`ai-service`)
2. Terminal B (`backend-node`)
3. Browser devtools console

## Tech Stack

1. Frontend: React, TypeScript, Vite, Axios
2. AI Service: FastAPI, OpenAI Whisper, OpenAI Python client (against local Ollama)
3. Backend: Node.js, Express, Axios, Spotify Web API

## Current Ports

1. Frontend: `5173` (default Vite)
2. AI Service: `8000`
3. Node Backend: `3000`
4. Ollama API: `11434`
