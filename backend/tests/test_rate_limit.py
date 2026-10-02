import pytest
from app.rate_limit import enforce,_local_hits
class Client: host="test-client"
class Request: client=Client()
@pytest.mark.asyncio
async def test_local_rate_limit(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings,"rate_limit_per_minute",2)
    _local_hits.clear()
    await enforce(Request(),"integration-user")
    await enforce(Request(),"integration-user")
    with pytest.raises(Exception) as exc: await enforce(Request(),"integration-user")
    assert "429" in str(exc.value) or "Too many" in str(exc.value)
