import uuid
from fastapi import APIRouter,Depends,HTTPException,Request
from fastapi.responses import StreamingResponse
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import current_user
from app.config import settings
from app.db import Conversation,Message,get_session,get_conversation
from app.models import ChatRequest
from app.rag import retrieve
from app.router import ModelRouter
from app.tools import TOOL_DECLARATIONS,execute_tool\nfrom app.rate_limit import enforce
router=APIRouter();models=ModelRouter()
async def dep():
    async for s in get_session():yield s
def gemini_contents(req):return [types.Content(role="user" if m.role=="user" else "model",parts=[types.Part(text=m.content)]) for m in req.messages]
async def agent(req,s):
    context=await retrieve(s,req.messages[-1].content);system=f"You are BharatAI, a professional multilingual AI assistant. Reply in {req.language}. Never fabricate facts. Use tools for current information. Ground answers in supplied context when relevant.\nRAG CONTEXT:\n"+"\n".join("["+x["source"]+"] "+x["content"] for x in context)
    if settings.model_provider.lower()!="gemini" or not models.gemini:return gemini_contents(req),system
    contents=gemini_contents(req);tool=types.Tool(function_declarations=[types.FunctionDeclaration(name=x["name"],description=x["description"],parameters=x["parameters"]) for x in TOOL_DECLARATIONS]);cfg=types.GenerateContentConfig(system_instruction=system,tools=[tool],temperature=.3)
    for _ in range(settings.max_tool_iterations):
        r=await models.gemini.aio.models.generate_content(model=settings.model_name,contents=contents,config=cfg);calls=[]
        if r.candidates:
            for p in r.candidates[0].content.parts:
                if p.function_call:calls.append(p.function_call)
        if not calls:return contents,system
        contents.append(r.candidates[0].content)
        for c in calls:contents.append(types.Content(role="user",parts=[types.Part.from_function_response(name=c.name,response={"result":await execute_tool(c.name,dict(c.args or {}))},id=c.id)]))
    return contents,system
@router.post("/v1/chat")
async def chat(req:ChatRequest,request:Request,user=Depends(current_user),s:AsyncSession=Depends(dep))
    enforce(request)
    if not req.messages:raise HTTPException(400,"At least one message is required")
    if len(req.messages[-1].content)>settings.max_message_chars:raise HTTPException(413,"Message is too large")
    cid=req.conversation_id or uuid.uuid4().hex;c=await get_conversation(s,cid,user["sub"])
    if not c:c=Conversation(id=cid,user_id=user["sub"],title=req.messages[-1].content[:80]);s.add(c);await s.commit()
    s.add(Message(conversation_id=cid,role="user",content=req.messages[-1].content));await s.commit()
    async def generate():
        answer=[]
        try:
            contents,system=await agent(req,s)
            if settings.model_provider.lower()=="gemini":
                async for chunk in await models.gemini.aio.models.generate_content_stream(model=settings.model_name,contents=contents,config=types.GenerateContentConfig(system_instruction=system,temperature=.3)):
                    if chunk.text:answer.append(chunk.text);yield chunk.text
            else:
                msgs=[{"role":"user" if m.role=="user" else "assistant","content":m.content} for m in req.messages]
                async for piece in models.stream(msgs,system):answer.append(piece);yield piece
            s.add(Message(conversation_id=cid,role="assistant",content="".join(answer)));await s.commit()
        except Exception as e:print("BharatAI generation error:",e);yield "I couldn't complete that request. Please check the backend configuration and try again."
    return StreamingResponse(generate(),media_type="text/plain; charset=utf-8",headers={"X-Conversation-Id":cid,"X-Model":settings.model_name,"Cache-Control":"no-cache"})
