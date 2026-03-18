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

# --- Routers ---
# --- Routers ---
from .routers import (
    models, 
    components, 
    component_identification, 
    build_suggestions, 
    projects, 
    troubleshoot, 
    assembly_instructions, 
    builder, 
    warranty
)

app.include_router(models.router, prefix="/api")
app.include_router(component_identification.router, prefix="/api")
app.include_router(troubleshoot.router, prefix="/api/troubleshoot", tags=["troubleshoot"])
app.include_router(assembly_instructions.router, prefix="/api")  # new router
app.include_router(builder.router, prefix="/api")
app.include_router(warranty.router, prefix="/api")
app.include_router(components.router, prefix="/api")
app.include_router(build_suggestions.router, prefix="/api")
app.include_router(projects.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Peasy backend is running 🚀"}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "peasy-backend"
    }
