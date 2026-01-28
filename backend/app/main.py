from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()  # Load SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.

app = FastAPI()

from .routers import models
app.include_router(models.router, prefix="/api") 

@app.get("/")
def root():
    return {"message": "Peasy backend is running 🚀"}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "peasy-backend"
    }

from fastapi import UploadFile, File

DETECTION_TO_MODEL = {"GPU": "gpu"}

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    detected = ["GPU"]
    confidence = 0.85
    model_id = DETECTION_TO_MODEL.get(detected[0]) if detected else None
    out = {
        "detected": detected,
        "confidence": confidence,
        "filename": file.filename,
    }
    if model_id is not None:
        out["model_id"] = model_id
    return out