from dataclasses import dataclass
import re

@dataclass
class EvalResult:
    keyword_coverage: float
    citation_correctness: float
    groundedness: float


def score_answer(answer:str, expected_keywords:list[str], sources:list[dict]) -> EvalResult:
    text=answer.lower(); hits=sum(1 for k in expected_keywords if k.lower() in text)
    coverage=hits/max(1,len(expected_keywords))
    urls=[x.get("url","") for x in sources if x.get("url")]
    cited=sum(1 for u in urls if u in answer)
    citation=cited/max(1,len(urls)) if urls else 1.0
    grounded=1.0 if sources and any(x.get("content") for x in sources) and ("source" in text or "according" in text or "citation" in text) else (0.5 if sources else 0.0)
    return EvalResult(round(coverage,4),round(citation,4),round(grounded,4))
