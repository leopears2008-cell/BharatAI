import json,logging,time,uuid
from contextlib import contextmanager
from fastapi import Request
from fastapi.responses import Response
from prometheus_client import Counter,Histogram,generate_latest,CONTENT_TYPE_LATEST
from app.config import settings
logger=logging.getLogger("bharatai")
logging.basicConfig(level=getattr(logging,settings.log_level.upper(),logging.INFO),format="%(message)s")
class Metrics:
    requests=Counter("bharatai_http_requests_total","HTTP requests",["method","path","status"])
    latency=Histogram("bharatai_http_request_duration_seconds","HTTP request latency",["method","path"])
    chat_completed=Counter("bharatai_chat_completed_total","Completed chat generations")
    chat_errors=Counter("bharatai_chat_errors_total","Failed chat generations")
metrics=Metrics()
@contextmanager
def request_context():
    request_id=uuid.uuid4().hex
    yield request_id
async def observability_middleware(request:Request,call_next):
    request_id=request.headers.get("X-Request-ID") or uuid.uuid4().hex
    start=time.perf_counter()
    try:
        response=await call_next(request)
    except Exception:
        duration=time.perf_counter()-start
        logger.error(json.dumps({"event":"request_error","request_id":request_id,"method":request.method,"path":request.url.path,"duration_ms":round(duration*1000,2)}))
        raise
    duration=time.perf_counter()-start
    response.headers["X-Request-ID"]=request_id
    metrics.requests.labels(request.method,request.url.path,str(response.status_code)).inc()
    metrics.latency.labels(request.method,request.url.path).observe(duration)
    logger.info(json.dumps({"event":"request","request_id":request_id,"method":request.method,"path":request.url.path,"status":response.status_code,"duration_ms":round(duration*1000,2)}))
    return response
def metrics_response():
    return Response(generate_latest(),media_type=CONTENT_TYPE_LATEST)
