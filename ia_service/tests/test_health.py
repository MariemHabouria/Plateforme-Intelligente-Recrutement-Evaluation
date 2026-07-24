# ia_service/tests/test_health.py
#
# Test minimal pour valider que le service demarre et repond.
# A placer dans ia_service/tests/test_health.py
#
# Necessite : pip install pytest httpx

from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


def test_health_endpoint_returns_ok():
    """Le endpoint /health doit repondre 200 avec un statut ok,
    meme si la base de donnees n'est pas disponible au moment du test."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "kilani-ia"


def test_health_endpoint_has_correct_content_type():
    response = client.get("/health")
    assert response.headers["content-type"] == "application/json"