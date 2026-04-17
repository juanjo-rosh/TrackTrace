from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import whisper
import shutil
import os
import json
from pathlib import Path

try:
    import imageio_ffmpeg
except ImportError:
    imageio_ffmpeg = None

app = FastAPI(title="TrackTrace AI Service", description="Servicio de transcripción de audio usando Whisper", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows your React app to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def ensure_ffmpeg_available():
    if shutil.which("ffmpeg"):
        return

    if imageio_ffmpeg is None:
        raise RuntimeError("ffmpeg no está disponible y imageio-ffmpeg no está instalado.")

    ffmpeg_executable = Path(imageio_ffmpeg.get_ffmpeg_exe())
    ffmpeg_target = Path(__file__).resolve().parent / "venv" / "Scripts" / "ffmpeg.exe"

    if not ffmpeg_target.exists():
        shutil.copy2(ffmpeg_executable, ffmpeg_target)

    ffmpeg_directory = str(ffmpeg_target.parent)
    current_path = os.environ.get("PATH", "")

    if ffmpeg_directory not in current_path.split(os.pathsep):
        os.environ["PATH"] = ffmpeg_directory + os.pathsep + current_path

    if not shutil.which("ffmpeg"):
        raise RuntimeError(f"No se pudo localizar ffmpeg en {ffmpeg_directory}.")

# Cargamos el modelo en memoria al arrancar el servidor
# Usamos "base" para que sea rápido en desarrollo, luego puedes subirlo a "small" o "medium"
print("Cargando modelo Whisper...")
ensure_ffmpeg_available()
model = whisper.load_model("base")
print("Modelo cargado y listo.")


client = OpenAI(
    base_url="http://localhost:11434/v1", # Apuntamos a tu propio PC
    api_key="ollama" # La key no importa, pero la librería pide poner algo
)


def generate_setlist_from_text(user_text: str):
    """Call the LLM to convert the user's request into a structured setlist."""
    
    system_prompt = """
    You are a professional DJ and a music curator expert.
    The user will give you a transcribed audio request describing the 'vibe' or style of music they want.
    
    Your task is to generate a setlist of 5 songs that fit perfectly with that description.
    Additionally, you must write a brief introduction (intro) and conclusion (outro) as if you were speaking through the microphone.
    
    YOU MUST return ONLY a valid JSON object with this exact structure:
    {
        "vibe_name": "Creative name for the playlist",
        "dj_intro": "DJ introduction text...",
        "songs": [
            {"title": "Song Title", "artist": "Artist Name"}
        ],
        "dj_outro": "DJ conclusion text..."
    }
    """

    response = client.chat.completions.create(
        model="llama3.2:1b", # Using the local Meta model
        response_format={ "type": "json_object" }, # Forzamos a que la salida sea JSON
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text}
        ],
        temperature=0.7
    )
    
    # Parse the string response into a Python dictionary
    json_response = json.loads(response.choices[0].message.content)
    return json_response

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    # Save the uploaded file to a temporary location
    temp_file_path = f"temp_{file.filename}"
    with open(temp_file_path, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # Pass the audio through the Whisper model to get the transcription
        try:
            result = model.transcribe(temp_file_path)
            transcribed_text = result["text"].strip()
            
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=500,
                detail="ffmpeg not found in the execution environment. Check the backend installation.",
            ) from exc
        
        if not transcribed_text:
            return {"status": "error", "message": "Voice not detected in the audio."}
            
        setlist_data = generate_setlist_from_text(transcribed_text)
        
    finally:
        # Clean up the temporary file after processing
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            
    return {
        "status": "success",
        "transcription": transcribed_text,
        "playlist_data": setlist_data
    }