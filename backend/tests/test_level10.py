import asyncio
from app.context import build_context
from app.orchestrator import plan_request
from app.tools import calculator

def test_context_window_trims_old_messages():
    msgs=[type("M",(),{"role":"user","content":"x"*1000})() for _ in range(20)]
    pack=build_context(msgs,max_chars=5000)
    assert len(pack.messages)<len(msgs) and pack.summary

def test_orchestrator_detects_current_research():
    p=plan_request("What is the latest news today?","English")
    assert p.use_web is True and p.intent=="research"

def test_safe_calculator():
    result=asyncio.run(calculator("2+3*4")); assert result["result"]==14

def test_unsafe_calculator():
    result=asyncio.run(calculator("__import__('os').system('x')")); assert "error" in result
