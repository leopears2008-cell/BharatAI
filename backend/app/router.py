from google import genai
from google.genai import types
from openai import AsyncOpenAI
from app.config import settings
class ModelRouter:
 def __init__(self):
  self.gemini=genai.Client(api_key=settings.gemini_api_key) if settings.gemini_api_key else None
  self.openai=AsyncOpenAI(api_key=settings.openai_api_key,base_url=settings.openai_base_url or None) if settings.openai_api_key else None
  self.qwen=AsyncOpenAI(api_key=settings.qwen_api_key or settings.openai_api_key,base_url=settings.qwen_base_url or settings.openai_base_url or None) if (settings.qwen_api_key or settings.openai_api_key) and (settings.qwen_base_url or settings.openai_base_url) else None
 def candidates(self):
  primary=settings.model_provider.lower(); out=[(primary,settings.model_name)]
  for item in settings.fallback_models.split(","):
   item=item.strip()
   if item: out.append(tuple(item.split(":",1)) if ":" in item else (primary,item))
  return out
 async def stream(self,messages,system):
  last=None
  for provider,model in self.candidates():
   try:
    if provider=="gemini":
     if not self.gemini: raise RuntimeError("GEMINI_API_KEY is not configured")
     async for c in await self.gemini.aio.models.generate_content_stream(model=model,contents=messages,config=types.GenerateContentConfig(system_instruction=system,temperature=.3)):
      if c.text: yield c.text
     return
    client=self.qwen if provider=="qwen" else self.openai
    if not client: raise RuntimeError(f"{provider} provider is not configured")
    stream=await client.chat.completions.create(model=model,messages=[{"role":"system","content":system}]+messages,temperature=.3,stream=True)
    async for c in stream:
     if c.choices and c.choices[0].delta.content: yield c.choices[0].delta.content
    return
   except Exception as exc: last=exc
  raise RuntimeError(f"All configured model providers failed: {last}")
