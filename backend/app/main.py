from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .routers import models, component_identification, components
app.include_router(models.router, prefix="/api")
app.include_router(component_identification.router, prefix="/api") 
app.include_router(components.router, prefix="/api")
from .routers import builder
app.include_router(builder.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Peasy backend is running 🚀"}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "peasy-backend"
    }


