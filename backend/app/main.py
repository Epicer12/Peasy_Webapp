from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()  # Load SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.

app = FastAPI()

from .routers import models, component_identification
app.include_router(models.router, prefix="/api")
app.include_router(component_identification.router, prefix="/api") 

@app.get("/")
def root():
    return {"message": "Peasy backend is running 🚀"}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "peasy-backend"
    }


