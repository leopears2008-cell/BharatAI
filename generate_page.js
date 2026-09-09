const fs = require('fs');
const content = `'use client'

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, Share, Bookmark, MoreHorizontal, Settings, 
  Trash2, Code2, Link, Mic, Wrench, Globe, Image as ImageIcon, Zap, 
  BookOpen, ChevronDown, Check, Download, Copy, ThumbsUp, 
  ThumbsDown, RotateCcw, Volume2, Search, Paperclip, MessageSquare, 
  Plus, FileText, Key, Terminal, LayoutDashboard, Database, Activity, 
  Cpu, Bell, Sun, Menu, ArrowRight, Play, Upload, MessageCircle, BarChart3,
  Clock, Shield, Blocks, CheckCircle2, ChevronRight, Moon, LogOut, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Message = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

type ChatSession = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
};

const DEFAULT_MESSAGES: Message[] = [
  {
    role: 'model',
    parts: [{ text: "Vanakkam! I am TN LLM. How can I assist you today?" }]
  }
];

export default function TNLLM() {
  const [view, setView] = useState<'dashboard' | 'chat' | 'knowledge' | 'developers' | 'playground' | 'insights'>('dashboard');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<{id: string, title: string}[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/v1/knowledge');
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (view === 'knowledge') fetchDocuments();
  }, [view]);

  useEffect(() => {
    const saved = localStorage.getItem('tnai_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
        } else {
          initSession();
        }
      } catch (e) {
        initSession();
      }
    } else {
      initSession();
    }
  }, []);

  const initSession = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Conversation',
      updatedAt: new Date().toISOString(),
      messages: DEFAULT_MESSAGES
    };
    setSessions([newSession]);
    setCurrentSessionId(newSession.id);
  };

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('tnai_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const currentMessages = sessions.find(s => s.id === currentSessionId)?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const createNewChat = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Conversation',
      updatedAt: new Date().toISOString(),
      messages: DEFAULT_MESSAGES
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setView('chat');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let content = '';
      if (file.type === 'text/plain') {
        content = await file.text();
      } else {
        alert('Currently only TXT files are supported for local injection in this preview.');
        setIsUploading(false);
        return;
      }

      const response = await fetch('/api/v1/knowledge/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: file.name, content }),
      });

      if (response.ok) {
        alert(\`Successfully ingested \${file.name} into Knowledge Base!\`);
        if (view === 'knowledge') fetchDocuments();
      } else {
        alert('Failed to ingest document.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await fetch(\`/api/v1/knowledge?id=\${id}\`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ta-IN'; // Tamil India
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: input }] };
    const newMessages = [...currentMessages, userMessage];
    
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { 
          ...s, 
          messages: newMessages,
          title: s.messages.length <= 1 ? input.slice(0, 30) + '...' : s.title,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    }));
    
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }

      const data = await response.json();
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, { role: 'model', parts: [{ text: data.text }] }], updatedAt: new Date().toISOString() };
        }
        return s;
      }));
    } catch (error: any) {
      console.error("Chat error:", error);
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, { role: 'model', parts: [{ text: "Error processing request." }] }], updatedAt: new Date().toISOString() };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavClick = (id: any) => {
    setView(id);
    setIsMobileMenuOpen(false);
  };

  const NavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: any }) => {
    const isActive = view === id;
    return (
      <button 
        onClick={() => handleNavClick(id)}
        className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 \${isActive ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-400 border border-indigo-500/20 shadow-[inset_0_0_12px_rgba(99,102,241,0.1)]' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'}\`}
      >
        <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-gray-500'} />
        {label}
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
        )}
      </button>
    )
  };

  return (
    <div className={\`h-screen w-full flex bg-[#F8FAFC] font-sans overflow-hidden text-slate-900 \${isDarkTheme ? 'dark' : ''}\`}>
      
      {/* --- SIDEBAR (Desktop & Mobile) --- */}
      {/* Overlay for mobile */}
      <AnimatePresence>
      {isMobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      </AnimatePresence>

      <motion.aside 
        initial={{ x: '-100%' }}
        animate={{ x: isMobileMenuOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 0 : '-100%') }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className={\`fixed inset-y-0 left-0 w-[280px] bg-[#020617] text-white flex flex-col flex-shrink-0 border-r border-white/5 z-50 shadow-2xl lg:relative lg:translate-x-0 lg:!transform-none\`}
      >
        
        {/* Brand */}
        <div className="h-20 flex items-center px-6 border-b border-white/10 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-50"></div>
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Zap size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">TN LLM</h1>
                <div className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-semibold">Tamil Nadu</div>
              </div>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
               <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide space-y-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-4">Platform Overview</div>
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="chat" icon={MessageCircle} label="AI Chat" />
          <NavItem id="knowledge" icon={Database} label="Knowledge Base" />
          
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-8 mb-4 px-4">Advanced</div>
          <NavItem id="insights" icon={BarChart3} label="Data Insights" />
          <NavItem id="playground" icon={Cpu} label="Model Playground" />
          <NavItem id="developers" icon={Terminal} label="API Access" />
        </div>

        {/* Bottom Cultural Identity Card */}
        <div className="p-4 shrink-0">
          <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-[#0B1120] to-[#171E30] p-5 shadow-xl group">
            {/* Subtle background decorative shapes (Kolam inspired) */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
            
            <div className="relative z-10">
              <h4 className="text-sm font-bold text-white mb-1">தமிழ்</h4>
              <p className="text-xs text-indigo-200">எங்கள் மொழி, எங்கள் பெருமை.</p>
              <div className="mt-3 text-[10px] text-gray-400 uppercase tracking-widest font-semibold flex items-center gap-2">
                <span>Tamil</span> <div className="w-1 h-1 bg-gray-500 rounded-full"></div> <span>English</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center text-[11px] text-gray-500">
            © 2025 TN LLM Initiative<br/>All rights reserved.
          </div>
        </div>
      </motion.aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col relative bg-slate-50 overflow-hidden w-full">
        
        {/* --- TOP NAVBAR --- */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 shadow-sm sticky top-0 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors">
               <Menu size={24} />
            </button>
            <div className="relative w-full max-w-md group hidden sm:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search anything in Tamil or English..."
                className="w-full h-11 bg-slate-100 border border-slate-200 rounded-full pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setIsDarkTheme(!isDarkTheme)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
              {isDarkTheme ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors relative">
              <Bell size={20} />
              <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-pink-500 rounded-full border-2 border-white"></div>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-1 md:mx-2 hidden sm:block"></div>
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden md:block">
                <div className="text-sm font-semibold text-slate-800">Vanakkam! 👋</div>
                <div className="text-xs text-indigo-600 font-medium">Developer Role</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 border-2 border-white shadow-md flex items-center justify-center text-indigo-700 font-bold">
                TN
              </div>
            </div>
          </div>
        </header>

        {/* --- VIEW ROUTER --- */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth bg-slate-50/50">
          
          {/* DASHBOARD VIEW */}
          {view === 'dashboard' && (
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-20">
              
              {/* Top Row: Hero & Model Status */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Hero Card */}
                <div className="col-span-1 xl:col-span-2 relative overflow-hidden rounded-3xl bg-[#0F172A] shadow-2xl group border border-slate-800">
                  {/* Futuristic Cultural Background */}
                  <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
                     <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600 rounded-full blur-[120px] opacity-60"></div>
                     <div className="absolute -bottom-40 -left-20 w-96 h-96 bg-cyan-600 rounded-full blur-[120px] opacity-40"></div>
                     {/* Temple/Network subtle overlay - placeholder with gradient */}
                     <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/80 via-purple-900/30 to-transparent"></div>
                  </div>
                  
                  <div className="relative z-10 p-8 md:p-10 h-full flex flex-col justify-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold backdrop-blur-md mb-6 w-max shadow-sm">
                      <Zap size={14} className="text-yellow-400" /> TN LLM 13B is now live
                    </div>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight leading-tight">
                      Empowering Tamil Nadu <br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">with Indigenous AI.</span>
                    </h2>
                    <p className="text-indigo-100/90 text-base md:text-lg max-w-lg mb-10 font-medium leading-relaxed">
                      Built for everyone, in every language. Explore the sovereign, secure, and state-of-the-art AI infrastructure.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <button onClick={() => setView('chat')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-slate-900 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                        <MessageSquare size={18} /> Start AI Chat
                      </button>
                      <button onClick={() => setView('playground')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold backdrop-blur-md border border-white/20 transition-all">
                        Explore Models <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Model Status Card */}
                <div className="col-span-1 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1.5">Model Status</h3>
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full w-max border border-emerald-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> All Systems Operational
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center">
                      <Activity className="text-slate-400" size={20} />
                    </div>
                  </div>
                  
                  <div className="space-y-3 flex-1">
                    {[
                      { name: 'TN LLM 13B', status: 'Active', type: 'Primary' },
                      { name: 'TN LLM 7B', status: 'Active', type: 'Fast' },
                      { name: 'Embedding Model', status: 'Active', type: 'RAG' },
                      { name: 'Speech Model', status: 'Active', type: 'Voice' },
                    ].map((model, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm transition-all">
                            <Cpu size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{model.name}</div>
                            <div className="text-[11px] font-medium text-slate-500 mt-0.5">{model.type} API</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100">
                          <CheckCircle2 size={14} className="text-emerald-500" /> {model.status}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setView('developers')} className="mt-6 w-full py-3.5 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                    View All Models <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Feature Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: 'AI Chat', desc: 'Chat in Tamil or English with our AI assistant', icon: MessageCircle, color: 'from-blue-500 to-indigo-600', view: 'chat', accent: 'bg-indigo-50' },
                  { title: 'Document AI', desc: 'Upload and analyze documents smartly', icon: FileText, color: 'from-purple-500 to-pink-600', view: 'knowledge', accent: 'bg-purple-50' },
                  { title: 'Knowledge Base', desc: 'Explore curated Tamil knowledge', icon: BookOpen, color: 'from-orange-400 to-rose-500', view: 'knowledge', accent: 'bg-orange-50' },
                  { title: 'Data Insights', desc: 'Visualize and understand your data', icon: BarChart3, color: 'from-teal-400 to-emerald-500', view: 'insights', accent: 'bg-teal-50' }
                ].map((feature, i) => (
                  <div 
                    key={i}
                    onClick={() => setView(feature.view as any)}
                    className="group cursor-pointer bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 relative overflow-hidden flex flex-col"
                  >
                    <div className={\`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500 ease-out z-0 \${feature.accent}\`}></div>
                    <div className="relative z-10 flex-1 flex flex-col">
                      <div className={\`w-14 h-14 rounded-2xl bg-gradient-to-br \${feature.color} flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6 text-white transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300\`}>
                        <feature.icon size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">{feature.title}</h3>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed flex-1">{feature.desc}</p>
                      <div className="mt-6 flex items-center text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                        Explore <ArrowRight size={16} className="ml-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Row: Analytics & Activity */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Analytics */}
                <div className="col-span-1 xl:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Usage Overview</h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">Platform performance metrics</p>
                    </div>
                    <select className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 ring-indigo-500/20 cursor-pointer">
                      <option>This Month</option>
                      <option>Last Month</option>
                      <option>All Time</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="text-sm text-slate-500 font-bold mb-2 uppercase tracking-wide">Total Requests</div>
                      <div className="text-3xl font-extrabold text-slate-800">12.5K</div>
                      <div className="text-xs font-bold text-emerald-600 mt-2 flex items-center bg-emerald-50 w-max px-2 py-1 rounded-md"><ArrowRight size={12} className="-rotate-45 mr-1" /> +14.2%</div>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="text-sm text-slate-500 font-bold mb-2 uppercase tracking-wide">Active Users</div>
                      <div className="text-3xl font-extrabold text-slate-800">2.3K</div>
                      <div className="text-xs font-bold text-emerald-600 mt-2 flex items-center bg-emerald-50 w-max px-2 py-1 rounded-md"><ArrowRight size={12} className="-rotate-45 mr-1" /> +5.1%</div>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="text-sm text-slate-500 font-bold mb-2 uppercase tracking-wide">Avg Response</div>
                      <div className="text-3xl font-extrabold text-slate-800">1.2s</div>
                      <div className="text-xs font-bold text-emerald-600 mt-2 flex items-center bg-emerald-50 w-max px-2 py-1 rounded-md"><ArrowRight size={12} className="-rotate-45 mr-1" /> -0.3s</div>
                    </div>
                  </div>

                  {/* Placeholder Chart */}
                  <div className="h-48 md:h-56 w-full bg-slate-50 rounded-2xl border border-slate-100 flex items-end px-4 pb-4 gap-2 relative">
                     <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-sm opacity-20 mix-blend-multiply"></div>
                     <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-sm z-0">Interactive Chart Area</div>
                     {[40, 60, 30, 80, 50, 90, 70, 100, 60, 40, 80, 50].map((h, i) => (
                       <div key={i} className="flex-1 bg-gradient-to-t from-indigo-500/30 to-indigo-500/10 rounded-t-md hover:from-indigo-500 hover:to-purple-500 transition-all duration-300 cursor-pointer group relative z-10" style={{ height: \`\${h}%\` }}>
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                            {h}00
                          </div>
                       </div>
                     ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="col-span-1 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-slate-800">Recent Activity</h3>
                    <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">View All</button>
                  </div>
                  <div className="space-y-6 flex-1">
                    {[
                      { icon: FileText, title: 'Document processed', time: '2 mins ago', color: 'bg-blue-100 text-blue-600', desc: 'RAG Knowledge base updated' },
                      { icon: User, title: 'New user registered', time: '5 mins ago', color: 'bg-emerald-100 text-emerald-600', desc: 'admin@tn.gov.in' },
                      { icon: Cpu, title: 'Model TN LLM 13B updated', time: '1 hour ago', color: 'bg-purple-100 text-purple-600', desc: 'Weights synchronized' },
                      { icon: MessageSquare, title: 'New feedback received', time: '3 hours ago', color: 'bg-orange-100 text-orange-600', desc: '5-star rating added' },
                    ].map((act, i) => (
                      <div key={i} className="flex items-start gap-4 group cursor-pointer">
                        <div className={\`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 \${act.color} group-hover:scale-110 transition-transform\`}>
                          <act.icon size={18} />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{act.title}</div>
                          <div className="text-xs font-medium text-slate-500 mt-0.5">{act.desc}</div>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{act.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Actions Action Bar */}
              <div className="bg-[#020617] rounded-2xl p-2 md:p-4 shadow-xl flex items-center justify-start md:justify-between overflow-x-auto gap-3 md:gap-4 border border-slate-800 scrollbar-hide">
                 {[
                   { label: 'Upload Document', icon: Upload, action: () => setView('knowledge') },
                   { label: 'Voice to Text', icon: Mic, action: () => setView('chat') },
                   { label: 'Create Dataset', icon: Database, action: () => setView('insights') },
                   { label: 'API Docs', icon: BookOpen, action: () => setView('developers') },
                   { label: 'Contact Support', icon: Shield, action: () => {} }
                 ].map((action, i) => (
                   <button key={i} onClick={action.action} className="flex-1 min-w-[150px] md:min-w-0 flex items-center justify-center gap-2.5 px-4 py-3.5 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white rounded-xl font-bold text-sm transition-colors border border-white/5 whitespace-nowrap">
                     <action.icon size={16} className={i === 0 ? "text-indigo-400" : i === 1 ? "text-purple-400" : i === 2 ? "text-emerald-400" : i === 3 ? "text-blue-400" : "text-slate-400"} /> {action.label}
                   </button>
                 ))}
              </div>

            </div>
          )}

          {/* CHAT VIEW */}
          {view === 'chat' && (
            <div className="h-full flex flex-col bg-white">
               {/* Chat Header */}
               <div className="h-16 border-b border-slate-200 flex items-center px-4 md:px-6 justify-between bg-white/80 backdrop-blur shrink-0 z-10 sticky top-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
                      <Bot size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-slate-800">TN LLM Assistant</h2>
                      <div className="text-[11px] md:text-xs font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full w-max mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Online
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={createNewChat} className="hidden sm:flex px-4 py-2 text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors items-center gap-2">
                      <Plus size={16} /> New Chat
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                      <MoreHorizontal size={20} />
                    </button>
                  </div>
               </div>

               {/* Messages */}
               <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth bg-slate-50/50">
                 <div className="max-w-4xl mx-auto space-y-8 pb-32">
                    {currentMessages.length === 0 && (
                      <div className="text-center py-10 md:py-20">
                         <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-200 text-indigo-500">
                           <Bot size={40} />
                         </div>
                         <h3 className="text-3xl font-extrabold text-slate-800 mb-3">Vanakkam! 👋</h3>
                         <p className="text-slate-500 mb-10 max-w-md mx-auto text-sm md:text-base font-medium">
                           I am your TN LLM Assistant. I can help you with Tamil literature, document analysis, coding, and general knowledge.
                         </p>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
                           {[
                             "தமிழில் பேசுங்கள்",
                             "சுருக்கமாக சொல்ல",
                             "மொழிபெயர்க்கவும்",
                             "உதவி வேண்டும்"
                           ].map((prompt, i) => (
                             <button key={i} onClick={() => setInput(prompt)} className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-md transition-all text-sm font-bold text-slate-700 group flex justify-between items-center">
                               {prompt}
                               <ArrowRight size={16} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                             </button>
                           ))}
                         </div>
                      </div>
                    )}

                    <AnimatePresence>
                      {currentMessages.map((msg, index) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={index} 
                          className={\`flex gap-3 md:gap-4 \${msg.role === 'user' ? 'justify-end' : ''}\`}
                        >
                          {msg.role === 'model' && (
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white shadow-sm mt-1">
                              <Zap size={16} className="md:w-5 md:h-5 w-4 h-4" />
                            </div>
                          )}
                          <div className={\`max-w-[85%] md:max-w-[80%] rounded-2xl md:rounded-3xl px-5 md:px-6 py-4 shadow-sm text-[15px] md:text-base leading-relaxed font-medium \${
                            msg.role === 'user' 
                              ? 'bg-slate-900 text-white rounded-tr-sm' 
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                          }\`}>
                            {msg.parts.map((p, i) => <p key={i} className="whitespace-pre-wrap">{p.text}</p>)}
                            
                            {/* Message Actions */}
                            {msg.role === 'model' && (
                              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-slate-400">
                                <button className="hover:text-indigo-600 transition-colors"><Copy size={16} /></button>
                                <button className="hover:text-emerald-500 transition-colors"><ThumbsUp size={16} /></button>
                                <button className="hover:text-red-500 transition-colors"><ThumbsDown size={16} /></button>
                                <button className="hover:text-indigo-600 transition-colors ml-auto flex items-center gap-1.5 text-xs font-bold"><RotateCcw size={14}/> Regenerate</button>
                              </div>
                            )}
                          </div>
                          {msg.role === 'user' && (
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-600 font-bold text-xs md:text-sm mt-1 shadow-inner border border-slate-300">
                              TN
                            </div>
                          )}
                        </motion.div>
                      ))}
                      {isLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white shadow-sm mt-1">
                              <Zap size={16} className="md:w-5 md:h-5 w-4 h-4" />
                          </div>
                          <div className="bg-white border border-slate-200 rounded-3xl rounded-tl-sm px-6 py-5 shadow-sm flex gap-2 items-center">
                            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                 </div>
               </div>

               {/* Input Area */}
               <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-12 pointer-events-none">
                 <div className="max-w-4xl mx-auto pointer-events-auto">
                    <form onSubmit={handleSubmit} className="relative bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-400 transition-all group">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                        placeholder="Type in Tamil or English..."
                        className="w-full max-h-40 min-h-[72px] p-5 pr-36 resize-none outline-none text-base text-slate-800 placeholder-slate-400 bg-transparent font-medium"
                        rows={1}
                      />
                      <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <button type="button" onClick={startListening} className={\`w-10 h-10 flex items-center justify-center rounded-xl transition-colors \${isListening ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-slate-50 hover:bg-slate-100 text-slate-500'}\`}>
                          <Mic size={20} />
                        </button>
                        <button type="button" className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors bg-slate-50 hover:bg-slate-100 text-slate-500">
                          <Paperclip size={20} />
                        </button>
                        <button 
                          type="submit" 
                          disabled={!input.trim() || isLoading}
                          className="w-12 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-md shadow-indigo-500/20 active:scale-95"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </form>
                    <div className="text-center mt-3 text-xs text-slate-400 font-semibold">
                      TN LLM can make mistakes. Please verify important information.
                    </div>
                 </div>
               </div>
            </div>
          )}

          {/* KNOWLEDGE BASE VIEW */}
          {view === 'knowledge' && (
            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Knowledge Base</h2>
                  <p className="text-slate-500 mt-1 md:mt-2 text-base md:text-lg font-medium">Manage documents injected into TN LLM's vector store for RAG.</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt" />
                <button onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 px-6 py-3.5 rounded-xl transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                  {isUploading ? 'Uploading...' : <><Upload size={18} /> Upload Document</>}
                </button>
              </div>
              
              <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
                
                {documents.length === 0 ? (
                  <div className="text-center py-16 md:py-24 bg-slate-50 rounded-2xl border-2 border-slate-200 border-dashed">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                      <BookOpen size={32} className="text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No documents ingested yet</h3>
                    <p className="text-base text-slate-500 font-medium max-w-sm mx-auto mb-8">Upload a .txt file to automatically generate embeddings and add it to the knowledge base.</p>
                    <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all">Browse Files</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map(doc => (
                      <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group gap-4">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                             <FileText size={20} />
                           </div>
                           <div>
                             <div className="text-base font-bold text-slate-800">{doc.title}</div>
                             <div className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2">
                               <span className="px-2 py-0.5 bg-slate-100 rounded-md">ID: {doc.id}</span>
                               <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md flex items-center gap-1"><CheckCircle2 size={12}/> Indexed</span>
                             </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <button onClick={() => setView('chat')} className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors text-center">Chat with Doc</button>
                          <button onClick={() => handleDeleteDocument(doc.id)} className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded-xl border border-transparent hover:border-red-100">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DEVELOPERS VIEW */}
          {view === 'developers' && (
            <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">API Developer Platform</h2>
                <p className="text-slate-500 mt-1 md:mt-2 text-base md:text-lg font-medium">Manage your API keys and integrate TN LLM into your own applications.</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Key size={20} /></div> API Keys
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-200 gap-4">
                    <div>
                      <div className="text-base font-bold text-slate-800">Production Key</div>
                      <div className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wide">Created today • Never used</div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <div className="w-full sm:w-auto bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between sm:justify-start gap-4">
                        <code className="text-sm font-mono text-slate-600 font-bold">bl_live_a1b2c3d4e5...</code>
                        <button className="text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 p-1.5 rounded-lg"><Copy size={16}/></button>
                      </div>
                      <button className="w-full sm:w-auto px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl shadow-md hover:bg-slate-800 transition-colors text-center">Rotate</button>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-5 py-4 rounded-xl transition-colors border-2 border-dashed border-indigo-200 w-full justify-center">
                    <Plus size={18} /> Create new secret key
                  </button>
                </div>
              </div>

              <div className="bg-[#0B1120] rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                <div className="px-6 py-4 bg-[#171E30] border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <span className="text-sm font-bold text-indigo-100 flex items-center gap-2"><Terminal size={16} className="text-indigo-400" /> Example API Request</span>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md text-xs font-bold text-white transition-colors">cURL</button>
                    <button className="px-3 py-1 bg-transparent hover:bg-white/5 rounded-md text-xs font-bold text-slate-400 transition-colors">Python</button>
                    <button className="px-3 py-1 bg-transparent hover:bg-white/5 rounded-md text-xs font-bold text-slate-400 transition-colors">Node.js</button>
                  </div>
                </div>
                <div className="p-6 overflow-x-auto relative group">
                  <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"><Copy size={16}/></button>
                  <pre className="text-base font-mono text-slate-300 leading-relaxed">
                    <span className="text-pink-400">curl</span> https://api.tnllm.ai/v1/chat/completions \\<br/>
                    {'  '}-H <span className="text-emerald-400">"Content-Type: application/json"</span> \\<br/>
                    {'  '}-H <span className="text-emerald-400">"Authorization: Bearer \$TN_API_KEY"</span> \\<br/>
                    {'  '}-d <span className="text-yellow-200">'{'{'}"model": "tn-llm-7b", "messages": [{'{'}"role": "user", "content": "Hello!"{"}"}]{'}'}'</span>
                  </pre>
                </div>
              </div>
            </div>
          )}
          
          {/* PLACEHOLDER VIEWS */}
          {['playground', 'insights'].includes(view) && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-24 h-24 bg-white shadow-sm border border-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Blocks size={40} className="text-indigo-400" />
                </div>
                <h3 className="text-3xl font-extrabold text-slate-800 mb-3 capitalize">{view}</h3>
                <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">This module is currently under development by the TN LLM engineering team.</p>
                <button onClick={() => setView('dashboard')} className="mt-8 px-8 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all">Back to Dashboard</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
`;
fs.writeFileSync('/app/applet/app/page.tsx', content);
