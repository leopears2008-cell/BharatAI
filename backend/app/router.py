from google import genai
from google.genai import types
from openai import AsyncOpenAI
from app.config import settings
class ModelRouter:
 def __init__(self):
  self.gemini=genai.Client(api_key=settings.gemini_api_key) if settings.gemini_api_key else None;self.openai=AsyncOpenAI(api_key=settings.openai_api_key,base_url=settings.openai_base_url or None) if settings.openai_api_key else None
 async def stream(self,messages,system):
  if settings.model_provider.lower()=="gemini":
   if not self.gemini:raise RuntimeError("GEMINI_API_KEY is not configured")
   async for c in await self.gemini.aio.models.generate_content_stream(model=settings.model_name,contents=messages,config=types.GenerateContentConfig(system_instruction=system,temperature=.3)):
    if c.text:yield c.text
   return
  if not self.openai:raise RuntimeError("OPENAI_API_KEY is not configured")
  stream=await self.openai.chat.completions.create(model=settings.model_name,messages=[{"role":"system","content":system}]+messages,temperature=.3,stream=True)
  async for c in stream:
   if c.choices and c.choices[0].delta.content:yield c.choices[0].delta.content
