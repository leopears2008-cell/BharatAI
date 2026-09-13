"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, Menu, Plus, User, Bot, Loader2, LogOut, FileText, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "model"; content: string; };

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [language, setLanguage] = useState("English");
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("/api/v1/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, { role: "user", content: userMessage }],
          language 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let aiResponse = "";
      setMessages(prev => [...prev, { role: "model", content: "" }]);

      while (true) {
        const { value, done } = await reader!.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Handle meta conv id
        if (chunk.includes("__META_CONV_ID__:_")) continue; // Simplification, normally parse it cleanly.

        aiResponse += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: "model", content: aiResponse.replace(/__META_CONV_ID__:.*/g, "") };
          return newMessages;
        });
      }
      
      fetchConversations();
    } catch (error) {
      setMessages(prev => [...prev, { role: "model", content: "Error: Unable to reach the server. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-20 w-72 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <h1 className="text-white font-bold text-lg tracking-tight">BharatAI</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 hover:bg-slate-800 rounded-lg">
            <Menu size={20} />
          </button>
        </div>

        <div className="p-4">
          <button onClick={() => setMessages([])} className="w-full flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors border border-slate-700">
            <Plus size={16} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Chats</h2>
          {conversations.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-4">No recent conversations.</p>
          ) : (
            conversations.map(conv => (
              <button key={conv.id} className="w-full text-left truncate px-3 py-2 text-sm hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200">
                {conv.title}
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 bg-white border-b border-slate-200 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Menu size={20} />
            </button>
            <span className="font-semibold text-slate-800 hidden sm:block">BharatAI Enterprise Model</span>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-3 py-1.5 text-slate-700 font-medium"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="Tamil">Tamil (தமிழ்)</option>
              <option value="Telugu">Telugu (తెలుగు)</option>
              <option value="Bengali">Bengali (বাংলা)</option>
            </select>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center mt-32">
                <div className="w-16 h-16 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center justify-center mb-6">
                  <Bot size={32} className="text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">How can I help you today?</h2>
                <p className="text-slate-500 max-w-sm text-center mb-8">I am BharatAI, an enterprise-grade AI optimized for local Indian languages, tool calling, and grounded RAG responses.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {["What are the key government schemes for farmers in Tamil Nadu?", "Explain quantum computing in simple Hindi.", "How do I securely store API keys?", "Write a Python script for web scraping."].map(prompt => (
                     <button key={prompt} onClick={() => setInput(prompt)} className="p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 text-left hover:border-indigo-300 hover:shadow-md transition-all font-medium">
                       {prompt}
                     </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "model" && (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1">
                      <Bot size={16} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[85%] px-5 py-4 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-indigo-600 text-white rounded-br-none" : "bg-white border border-slate-200 text-slate-800 shadow-sm rounded-bl-none"}`}>
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <div className="markdown-body prose prose-sm prose-slate max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || "..."}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1">
                      <User size={16} className="text-slate-600" />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={endOfMessagesRef} />
          </div>
        </main>

        <footer className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask BharatAI anything..."
                disabled={loading}
                className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium shadow-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-sm"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
              </button>
            </form>
            <p className="text-center text-xs text-slate-400 mt-3 font-medium">BharatAI may produce inaccurate information about people, places, or facts.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
