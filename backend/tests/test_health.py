"""
Bootstrap test for the Peasy backend.
Tests the /health endpoint to confirm the FastAPI app starts and responds correctly.
Add more tests in this folder as the project grows.
"""

from fastapi.testclient import TestClient
from app.main import app

# Create a test client
client = TestClient(app)


def test_health_check():
    """The /health endpoint should return HTTP 200 with status: ok."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "peasy-backend"


def test_root():
    """The root / endpoint should return a running message."""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
