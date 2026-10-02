import uuid,json
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
from app.tools import TOOL_DECLARATIONS,execute_tool
from app.rate_limit import enforce
from app.observability import request_context,metrics
from app.context import build_context
from app.memory import retrieve_memory,remember_from_text
from app.orchestrator import plan_request,build_system
router=APIRouter();models=ModelRouter()
async def dep():
    async for session in get_session():yield session

def gemini_contents(messages):
    return [types.Content(role="user" if m["role"]=="user" else "model",parts=[types.Part(text=m["content"])]) for m in messages]

async def agent(req,session,user_id):
    query=req.messages[-1].content; plan=plan_request(query,req.language); pack=build_context(req.messages); rag=await retrieve(session,query)
    memory=await retrieve_memory(session,user_id); system=build_system(plan,rag,memory,pack.summary)
    contents=gemini_contents(pack.messages); tool_sources=[]
    if settings.model_provider.lower()=="gemini" and models.gemini:
        tool=types.Tool(function_declarations=[types.FunctionDeclaration(name=x["name"],description=x["description"],parameters=x["parameters"]) for x in TOOL_DECLARATIONS])
        cfg=types.GenerateContentConfig(system_instruction=system,tools=[tool],temperature=.3)
        for _ in range(settings.max_tool_iterations):
            result=await models.gemini.aio.models.generate_content(model=settings.model_name,contents=contents,config=cfg);calls=[]
            if result.candidates:
                for part in result.candidates[0].content.parts:
                    if part.function_call:calls.append(part.function_call)
            if not calls:break
            contents.append(result.candidates[0].content)
            for call in calls:
                args=dict(call.args or {})
                if call.name=="web_search" and not str(args.get("query","" )).strip(): tool_result={"error":"A non-empty search query is required."}
                else: tool_result=await execute_tool(call.name,args)
                if isinstance(tool_result,dict) and "results" in tool_result:
                    for item in tool_result.get("results",[]):
                        if item.get("url"):tool_sources.append(item)
                contents.append(types.Content(role="user",parts=[types.Part.from_function_response(name=call.name,response={"result":tool_result},id=call.id)]))
    return contents,system,rag,tool_sources

@router.post("/v1/chat")
async def chat(req:ChatRequest,request:Request,user=Depends(current_user),session:AsyncSession=Depends(dep)):
    await enforce(request,user["sub"])
    if not req.messages:raise HTTPException(400,"At least one message is required")
    if len(req.messages[-1].content)>settings.max_message_chars:raise HTTPException(413,"Message is too large")
    cid=req.conversation_id or uuid.uuid4().hex;conversation=await get_conversation(session,cid,user["sub"])
    if not conversation:
        conversation=Conversation(id=cid,user_id=user["sub"],title=req.messages[-1].content[:80]);session.add(conversation);await session.commit()
    await remember_from_text(session,user["sub"],req.messages[-1].content)
    session.add(Message(conversation_id=cid,role="user",content=req.messages[-1].content));await session.commit()
    async def generate():
        answer=[]
        with request_context() as request_id:
            try:
                contents,system,rag_context,tool_sources=await agent(req,session,user["sub"])
                if settings.model_provider.lower()=="gemini" and models.gemini:
                    stream=await models.gemini.aio.models.generate_content_stream(model=settings.model_name,contents=contents,config=types.GenerateContentConfig(system_instruction=system,temperature=.3))
                    async for chunk in stream:
                        if chunk.text:answer.append(chunk.text);yield chunk.text
                else:
                    pack=build_context(req.messages);messages=[{"role":x["role"],"content":x["content"]} for x in pack.messages]
                    async for piece in models.stream(messages,system):answer.append(piece);yield piece
                sources=[];seen=set()
                for item in rag_context:
                    key=item["source"]
                    if key not in seen:seen.add(key);sources.append((item["source"],None))
                for item in tool_sources:
                    key=item.get("url")
                    if key and key not in seen:seen.add(key);sources.append((item.get("title") or key,key))
                if sources:
                    block="\\n\\n---\\n### Sources\\n"+"\\n".join(f"- [{title}]({url})" if url else f"- {title}" for title,url in sources[:10])
                    answer.append(block);yield block
                session.add(Message(conversation_id=cid,role="assistant",content="".join(answer)));await session.commit();metrics.chat_completed.inc()
            except Exception as exc:
                metrics.chat_errors.inc();print(f"BharatAI generation error request_id={request_id}: {exc!r}");yield "I couldn't complete that request. Please check the backend configuration and try again."
    return StreamingResponse(generate(),media_type="text/plain; charset=utf-8",headers={"X-Conversation-Id":cid,"X-Model":settings.model_name,"Cache-Control":"no-cache"})
