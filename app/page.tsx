"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Plus, Send, Square, Bot, LogOut, Sparkles, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "model"; content: string };

export default function Home() {
  const router = useRouter();
  const [messages,setMessages]=useState<Message[]>([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [conversations,setConversations]=useState<any[]>([]);
  const [sidebarOpen,setSidebarOpen]=useState(true);
  const [language,setLanguage]=useState("English");
  const [conversationId,setConversationId]=useState<string>();
  const [copied,setCopied]=useState<number|null>(null);
  const abortRef=useRef<AbortController|null>(null);
  const endRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{ loadConversations(); },[]);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  async function loadConversations(){
    const res=await fetch("/api/conversations");
    if(res.status===401){ router.push("/login"); return; }
    if(res.ok) setConversations(await res.json());
  }

  function newChat(){ setMessages([]); setConversationId(undefined); setInput(""); }
  async function logout(){ await fetch("/api/auth",{method:"DELETE"}); router.push("/login"); }

  async function sendMessage(){
    const text=input.trim();
    if(!text || loading) return;
    const next=[...messages,{role:"user" as const,content:text}];
    setMessages([...next,{role:"model",content:""}]); setInput(""); setLoading(true);
    const controller=new AbortController(); abortRef.current=controller;
    try{
      const res=await fetch(`${process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000"}/api/v1/chat",{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,
        body:JSON.stringify({messages:next,conversation_id:conversationId,language})});
      if(res.status===401){router.push("/login");return;}
      if(!res.ok) throw new Error("request_failed");
      const id=res.headers.get("X-Conversation-Id"); if(id) setConversationId(id);
      const reader=res.body?.getReader(); if(!reader) throw new Error("no_stream");
      const decoder=new TextDecoder(); let answer="";
      while(true){
        const {value,done}=await reader.read(); if(done) break;
        answer+=decoder.decode(value,{stream:true}).replace(/__META_CONV_ID__:[^\\n]*/g,"");
        setMessages(prev=>{const copy=[...prev]; copy[copy.length-1]={role:"model",content:answer}; return copy;});
      }
      await loadConversations();
    }catch(error){
      if((error as Error).name!=="AbortError") setMessages(prev=>{const copy=[...prev]; copy[copy.length-1]={role:"model",content:"I couldn't complete that request. Please try again."};return copy;});
    }finally{setLoading(false);abortRef.current=null;}
  }

  function stop(){ abortRef.current?.abort(); setLoading(false); }
  async function copyText(text:string,index:number){ await navigator.clipboard.writeText(text); setCopied(index); setTimeout(()=>setCopied(null),1200); }

  return <div className="flex h-[100dvh] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
    {sidebarOpen && <button aria-label="Close sidebar" onClick={()=>setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/50 md:hidden"/>}
    <aside className={`fixed md:relative z-40 h-full w-[280px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-transform ${sidebarOpen?"translate-x-0":"-translate-x-full md:translate-x-0"}`}>
      <div className="flex h-16 items-center justify-between px-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5"><div className="grid size-8 place-items-center rounded-xl bg-[var(--accent)]"><Sparkles size={17}/></div><span className="font-semibold">BharatAI</span></div>
        <button aria-label="Close sidebar" onClick={()=>setSidebarOpen(false)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-hover)] md:hidden"><Menu size={19}/></button>
      </div>
      <div className="p-3"><button onClick={newChat} className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium hover:bg-[var(--surface-hover)]"><Plus size={17}/> New chat</button></div>
      <div className="px-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Recent chats</div>
      <div className="custom-scrollbar flex-1 overflow-y-auto p-3 space-y-1">
        {conversations.map(c=><button key={c.id} onClick={async()=>{const res=await fetch(`/api/conversations/${c.id}`);if(res.ok){const d=await res.json();setConversationId(c.id);setMessages(d.messages||[]);}}} className="w-full truncate rounded-lg px-3 py-2.5 text-left text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]">{c.title}</button>)}
      </div>
      <div className="border-t border-[var(--border)] p-3"><button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-white"><LogOut size={17}/> Sign out</button></div>
    </aside>

    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/90 px-4 backdrop-blur">
        <button aria-label="Open sidebar" onClick={()=>setSidebarOpen(true)} className="rounded-lg p-2 hover:bg-[var(--surface-hover)] md:hidden"><Menu size={20}/></button>
        <div className="hidden items-center gap-2 sm:flex"><Bot size={18} className="text-[var(--accent)]"/><span className="text-sm font-medium">BharatAI AI Platform</span></div>
        <select aria-label="Response language" value={language} onChange={e=>setLanguage(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]">
          {["English","Hindi","Tamil","Telugu","Bengali"].map(x=><option key={x}>{x}</option>)}
        </select>
      </header>

      <main className="custom-scrollbar flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          {messages.length===0 ? <div className="flex min-h-[65vh] flex-col items-center justify-center text-center">
            <div className="mb-6 grid size-14 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]"><Sparkles size={25} className="text-[var(--accent)]"/></div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">How can I help you?</h1>
            <p className="mt-3 max-w-xl text-[var(--muted)]">Ask in English or an Indian language. BharatAI can use grounded knowledge and configured tools when available.</p>
            <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">{["Explain quantum computing simply","Help me learn Python","Summarize a document","What can BharatAI do?"].map(x=><button key={x} onClick={()=>setInput(x)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left text-sm hover:bg-[var(--surface-hover)]">{x}</button>)}</div>
          </div> : <div className="space-y-8">{messages.map((m,i)=><div key={i} className="group">
            <div className="mb-2 flex items-center gap-2 text-xs text-[var(--muted)]"><div className={`grid size-7 place-items-center rounded-lg ${m.role==="user"?"bg-[var(--surface-2)]":"bg-[var(--accent)]"}`}>{m.role==="user"?"U":<Bot size={14}/>}</div><span>{m.role==="user"?"You":"BharatAI"}</span></div>
            <div className="pl-9 text-[15px] leading-7">{m.role==="user"?<p className="whitespace-pre-wrap">{m.content}</p>:<><div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content||"▌"}</ReactMarkdown></div>{m.content&&<button aria-label="Copy response" onClick={()=>copyText(m.content,i)} className="mt-2 rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-hover)]">{copied===i?<Check size={15}/>:<Copy size={15}/>}</button>}</>}</div>
          </div>)}<div ref={endRef}/></div>}
        </div>
      </main>

      <footer className="shrink-0 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 sm:px-6">
        <form onSubmit={e=>{e.preventDefault();sendMessage()}} className="mx-auto max-w-3xl">
          <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/20 focus-within:border-[var(--accent)]/60">
            <textarea aria-label="Message BharatAI" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage()}}} rows={1} disabled={loading} placeholder="Message BharatAI..." className="max-h-40 min-h-14 w-full resize-none bg-transparent px-4 py-4 pr-14 text-sm outline-none placeholder:text-[var(--muted)]"/>
            <button type={loading?"button":"submit"} onClick={loading?stop:undefined} aria-label={loading?"Stop generation":"Send message"} disabled={!loading&&!input.trim()} className="absolute bottom-2.5 right-2.5 grid size-9 place-items-center rounded-xl bg-[var(--accent)] text-white disabled:opacity-30">{loading?<Square size={15} fill="currentColor"/>:<Send size={16}/>}</button>
          </div>
          <p className="py-2 text-center text-[11px] text-[var(--muted)]">BharatAI can make mistakes. Verify important information.</p>
        </form>
      </footer>
    </section>
  </div>;
}
