import ast
from pathlib import Path
def test_python_syntax():
    for path in Path("app").rglob("*.py"): ast.parse(path.read_text(encoding="utf-8"))
def test_core_files():
    for path in ["app/main.py","app/api/chat.py","app/db.py","app/rag.py","app/router.py","app/tools.py","app/observability.py"]:
        assert Path(path).exists()
