from fastapi import FastAPI

app = FastAPI()

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

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    return {
        "detected": ["GPU"],
        "confidence": 0.85,
        "filename": file.filename
    }