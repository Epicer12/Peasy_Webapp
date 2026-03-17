from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
# Combined imports from both feature branch and development branch
from .routers import (
    models, 
    component_identification, 
    components, 
    build_suggestions, 
    projects, 
    assembly_instructions, 
    troubleshoot, 
    builder
)

# Core routers present in both
app.include_router(models.router, prefix="/api")
app.include_router(component_identification.router, prefix="/api")

# Feature branch routers (AI Suggested Planning feature)
app.include_router(components.router, prefix="/api") # Kept for component search logic
app.include_router(build_suggestions.router, prefix="/api") # Kept for AI build suggestions
app.include_router(projects.router) # Kept for project management

# Development branch routers (New features)
app.include_router(troubleshoot.router, prefix="/api/troubleshoot", tags=["troubleshoot"]) # Integrated from development
app.include_router(assembly_instructions.router, prefix="/api") # Integrated from development
app.include_router(builder.router, prefix="/api") # Integrated from development

# --- Routes ---
@app.get("/")
def root():
    return {"message": "Peasy backend is running 🚀"}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "peasy-backend"
    }