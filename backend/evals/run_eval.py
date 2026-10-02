import asyncio,json
from pathlib import Path
from app.db import Session,init_db
from app.rag import retrieve
async def main():
    await init_db()
    data=json.loads(Path(__file__).with_name("dataset.json").read_text())
    hits=covered=0
    async with Session() as session:
        for item in data:
            results=await retrieve(session,item["question"],5)
            sources={x["source"] for x in results}; body=" ".join(x["content"] for x in results).lower()
            hits+=int(bool(sources.intersection(item["expected_sources"])))
            covered+=int(all(k.lower() in body for k in item["expected_keywords"]))
    n=max(len(data),1)
    print(json.dumps({"cases":len(data),"retrieval_source_hit_rate":hits/n,"keyword_coverage":covered/n},indent=2))
if __name__=="__main__": asyncio.run(main())
