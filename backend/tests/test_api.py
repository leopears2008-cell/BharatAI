from fastapi.testclient import TestClient
from app.main import app
def test_health_and_root():
    with TestClient(app) as client:
        assert client.get("/").status_code==200
        assert client.get("/api/health").status_code==200
