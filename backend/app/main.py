from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"DEBUG: Incoming request: {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"DEBUG: Response status: {response.status_code}")
    return response

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
    warranty,
    community,
    marketplace,
    analysis,
    auth
)

app.include_router(models.router, prefix="/api")
app.include_router(component_identification.router, prefix="/api")
app.include_router(troubleshoot.router, prefix="/api/troubleshoot", tags=["troubleshoot"])
app.include_router(assembly_instructions.router, prefix="/api")  # new router
app.include_router(builder.router, prefix="/api")
app.include_router(warranty.router, prefix="/api")
app.include_router(community.router, prefix="/api")
app.include_router(components.router, prefix="/api")
app.include_router(build_suggestions.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(marketplace.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(auth.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Peasy backend is running 🚀"}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "peasy-backend"
    }