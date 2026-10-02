import ast
from pathlib import Path
def test_python_syntax():
 for p in Path("app").rglob("*.py"):ast.parse(p.read_text(encoding="utf-8"))
def test_core_files():
 for p in ["app/main.py","app/api/chat.py","app/db.py","app/rag.py","app/router.py","app/tools.py"]:assert Path(p).exists()
