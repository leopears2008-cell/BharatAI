'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Code, FileText, Settings, AlignLeft, Info, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Message = {
  role: 'user' | 'model';
  parts: [{ text: string }];
};

function ArchitectureView() {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-[#080808] text-[#e0e0e0] relative">
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      <div className="max-w-4xl mx-auto space-y-12 relative z-10">
        
        <header className="space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">BharatAI Architecture</h1>
          <p className="text-lg text-[#e0e0e0]/70 leading-relaxed max-w-2xl">
            A decoder-only Transformer language model built from scratch, optimized for Indian languages, education, government services, and local knowledge.
          </p>
        </header>

        {/* Pipeline Diagram */}
        <section className="bg-[#0c0c0c] border border-[#222] rounded-2xl p-8 relative overflow-hidden">
          <h2 className="text-sm uppercase tracking-[0.3em] text-[#F27D26] font-bold mb-8 text-center">Mini LLM Pipeline</h2>
          
          <div className="flex flex-col items-center justify-center space-y-0 relative z-10 font-mono text-sm">
            
            <div className="flex flex-col items-center">
              <div className="py-2 w-48 border border-[#444] bg-[#1a1a1a] text-center text-xs font-mono rounded shadow-xl text-[#e0e0e0]">
                MINI LLM
              </div>
              <div className="w-px h-6 bg-[#444]"></div>
              
              <div className="w-64 h-px bg-[#444] flex justify-between relative">
                <div className="w-px h-6 bg-[#444] absolute left-0 top-0"></div>
                <div className="w-px h-6 bg-[#444] absolute right-0 top-0"></div>
              </div>
              
              <div className="flex justify-between w-64 pt-6">
                <div className="py-4 border border-[#F27D26]/50 bg-[#151515] text-center rounded flex flex-col gap-1 w-28 text-xs text-[#e0e0e0]">
                  <span className="text-[10px] opacity-50 font-bold">SOURCE</span>
                  Training Data
                </div>
                <div className="py-4 border border-[#222] bg-[#151515] text-center rounded flex flex-col gap-1 w-28 text-xs">
                  <span className="text-[10px] opacity-50 font-bold text-[#e0e0e0]">PROCESS</span>
                  <span className="text-[#06038D] font-bold">Tokenizer</span>
                </div>
              </div>

              <div className="w-64 flex justify-between relative mt-6">
                <div className="w-px h-6 bg-[#444] absolute left-0 -top-6"></div>
                <div className="w-px h-6 bg-[#444] absolute right-0 -top-6"></div>
                <div className="w-full h-px bg-[#444] absolute top-0"></div>
                <div className="w-px h-6 bg-[#444] absolute left-1/2 -top-0 -translate-x-1/2"></div>
              </div>
              
              <div className="mt-0 flex flex-col items-center space-y-0">
                <div className="py-3 bg-[#F27D26] text-black text-center font-bold text-xs rounded-sm shadow-[0_0_20px_rgba(242,125,38,0.3)] w-48 flex items-center justify-center space-x-2 mt-6">
                  <Bot size={16} />
                  <span>TRANSFORMER</span>
                </div>
                <div className="w-px h-6 bg-[#444]"></div>
                
                <div className="py-2 border border-[#444] border-dashed text-center text-[10px] font-mono w-48 text-[#e0e0e0]">
                  TRAINING LOOP
                </div>
                <div className="w-px h-6 bg-[#444]"></div>
                
                <div className="py-3 bg-white text-black text-center font-bold text-sm rounded shadow-lg w-48">
                  miniGPT
                </div>
                <div className="w-px h-6 bg-[#444]"></div>
                
                <div className="py-2 border border-[#444] text-center text-xs opacity-70 w-48 text-[#e0e0e0]">
                  Text Generation
                </div>
                <div className="w-px h-6 bg-[#444]"></div>
                
                <div className="py-2 bg-[#0c0c0c] border border-[#333] text-center text-xs font-mono text-green-500 w-48 flex items-center justify-center space-x-2">
                  <Code size={16} />
                  <span>FastAPI Backend</span>
                </div>
                <div className="w-px h-6 bg-[#444]"></div>
                
                <div className="py-3 bg-gradient-to-r from-[#06038D] to-[#222] text-center text-xs font-bold rounded-full border border-white/10 w-56 text-white shadow-lg">
                  WEB INTERFACE
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Technical Details */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0c0c0c] border border-[#222] rounded-xl p-6">
            <div className="w-10 h-10 bg-[#151515] border border-[#F27D26]/20 text-[#F27D26] rounded-lg flex items-center justify-center mb-4">
              <Database size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">1. Dataset & Tokenizer</h3>
            <p className="text-[#e0e0e0]/70 text-sm leading-relaxed mb-4">
              Trained on a clean corpus of Indian educational materials and government data. Starts with character-level tokenization for simplicity, scaling to BPE/SentencePiece for multilingual efficiency.
            </p>
            <pre className="bg-[#151515] p-3 rounded-lg text-xs text-[#e0e0e0]/70 overflow-x-auto border border-[#333]">
{`class CharTokenizer:
  def __init__(self, text):
    chars = sorted(set(text))
    self.stoi = {c:i for i,c in enumerate(chars)}
    self.itos = {i:c for c,i in self.stoi.items()}`}
            </pre>
          </div>

          <div className="bg-[#0c0c0c] border border-[#222] rounded-xl p-6">
            <div className="w-10 h-10 bg-[#151515] border border-[#06038D]/50 text-[#06038D] rounded-lg flex items-center justify-center mb-4">
              <Cpu size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">2. Transformer Core</h3>
            <p className="text-[#e0e0e0]/70 text-sm leading-relaxed mb-4">
              A causal, decoder-only Transformer incorporating multi-head causal self-attention, token & positional embeddings, feed-forward networks, and residual connections.
            </p>
             <pre className="bg-[#151515] p-3 rounded-lg text-xs text-[#e0e0e0]/70 overflow-x-auto border border-[#333]">
{`class Block(nn.Module):
  def forward(self, x):
    x = x + self.sa(self.ln1(x))
    x = x + self.ff(self.ln2(x))
    return x`}
            </pre>
          </div>

          <div className="bg-[#0c0c0c] border border-[#222] rounded-xl p-6">
            <div className="w-10 h-10 bg-[#151515] border border-green-500/20 text-green-500 rounded-lg flex items-center justify-center mb-4">
              <Activity size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">3. Training & Finetuning</h3>
            <p className="text-[#e0e0e0]/70 text-sm leading-relaxed">
              Optimized using AdamW with cross-entropy loss. Evaluated via validation loss/perplexity. Fine-tuned on instruction-response pairs to function as a helpful assistant rather than just a text predictor.
            </p>
          </div>

          <div className="bg-[#0c0c0c] border border-[#222] rounded-xl p-6">
            <div className="w-10 h-10 bg-[#151515] border border-orange-500/20 text-orange-400 rounded-lg flex items-center justify-center mb-4">
              <Server size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">4. Deployment</h3>
            <p className="text-[#e0e0e0]/70 text-sm leading-relaxed">
              Inference served via a FastAPI backend, accepting prompts and decoding generated tokens. Temperature and top-k sampling used for generation variability.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}

export default function BharatAIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: [{ text: "Namaste! I am BharatAI, an Indian multilingual LLM. I can understand and speak Tamil, Hindi, Telugu, Kannada, Malayalam, and English. How can I assist you today?" }]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'chat' | 'architecture'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: input }] };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'model', parts: [{ text: data.text }] }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: 'model', parts: [{ text: "Sorry, I encountered an error processing your request. Please try again." }] }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#080808] text-[#e0e0e0] font-sans overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className={`fixed md:static inset-y-0 left-0 z-30 w-72 bg-[#0c0c0c] border-r border-[#222] flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#F27D26] to-[#06038D] flex items-center justify-center text-white font-bold shadow-sm">
              B
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-white">Bharat<span className="text-[#F27D26]">AI</span></h2>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-[#e0e0e0]/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => { setView('chat'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${view === 'chat' ? 'bg-[#151515] border border-[#333] text-[#F27D26] font-medium' : 'text-[#e0e0e0]/70 hover:bg-[#151515] hover:text-white'}`}
          >
            <Bot size={18} />
            <span>Chat Interface</span>
          </button>
          
          <button 
            onClick={() => { setView('architecture'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${view === 'architecture' ? 'bg-[#151515] border border-[#333] text-[#F27D26] font-medium' : 'text-[#e0e0e0]/70 hover:bg-[#151515] hover:text-white'}`}
          >
            <FileText size={18} />
            <span>Model Architecture</span>
          </button>
        </nav>

        <div className="p-4 mt-auto">
          <div className="p-4 bg-[#151515] border border-[#222] rounded-xl">
            <h4 className="text-[10px] uppercase tracking-widest opacity-40 mb-4 font-bold">Multilingual Matrix</h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-2 rounded bg-[#080808] border border-[#222]">
                <span className="text-sm">Hindi (हिन्दी)</span>
                <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded">OPTIMIZED</span>
              </div>
              {['Tamil (தமிழ்)', 'Telugu (తెలుగు)', 'Kannada (ಕನ್ನಡ)', 'Malayalam (മലയാളം)'].map(lang => (
                <div key={lang} className="flex items-center justify-between p-2 rounded border border-[#222]/50 opacity-80">
                  <span className="text-sm">{lang}</span>
                  <span className="text-[10px] opacity-50 font-mono">READY</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#080808] relative">
        
        {/* Header */}
        <header className="h-16 border-b border-[#222] flex items-center px-4 md:px-8 justify-between bg-[#0c0c0c] z-10 sticky top-0">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 mr-2 text-[#e0e0e0]/70 hover:text-white hover:bg-[#151515] rounded-lg md:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-semibold text-white">
              {view === 'chat' ? 'Chat' : 'Documentation'}
            </h1>
          </div>
          <div className="hidden md:flex gap-6 text-xs uppercase tracking-widest font-medium opacity-70">
            <span>Education</span>
            <span>Governance</span>
            <span>Local Knowledge</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-mono opacity-60 hidden sm:inline">GPU-A100-NODE-04: ACTIVE</span>
          </div>
        </header>

        {view === 'architecture' ? (
          <ArchitectureView />
        ) : (
          /* Chat Interface */
          <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((msg, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={index} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      
                      <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${msg.role === 'user' ? 'bg-[#222] ml-3' : 'bg-gradient-to-tr from-[#F27D26] to-[#06038D] mr-3'}`}>
                        {msg.role === 'user' ? <User size={16} className="text-[#e0e0e0]" /> : <Bot size={16} className="text-white" />}
                      </div>
                      
                      <div className={`px-5 py-3.5 rounded-xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-[#151515] border border-[#F27D26]/20 text-[#e0e0e0]' : 'bg-[#0c0c0c] border border-[#222] text-[#e0e0e0]'}`}>
                        {msg.parts[0].text.split('\n').map((line, i) => (
                          <span key={i}>
                            {line}
                            {i !== msg.parts[0].text.split('\n').length - 1 && <br />}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="flex max-w-[75%] flex-row">
                      <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-tr from-[#F27D26] to-[#06038D] mr-3 flex items-center justify-center">
                        <Bot size={16} className="text-white" />
                      </div>
                      <div className="px-5 py-4 rounded-xl bg-[#0c0c0c] border border-[#222] flex items-center space-x-1.5 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-[#444] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-[#444] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-[#444] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-4 bg-[#080808] border-t border-[#222]">
              <div className="max-w-3xl mx-auto">
                <form onSubmit={handleSubmit} className="relative flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask BharatAI anything in English, Hindi, Tamil..."
                    className="w-full pl-5 pr-14 py-4 bg-[#151515] border border-[#333] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#F27D26]/50 focus:border-[#F27D26] transition-all text-[#e0e0e0] placeholder-[#e0e0e0]/40 shadow-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 p-2.5 bg-[#F27D26] hover:bg-[#F27D26]/80 text-black rounded-lg disabled:opacity-50 disabled:hover:bg-[#F27D26] transition-colors shadow-sm"
                  >
                    <Send size={18} className={input.trim() && !isLoading ? "ml-0.5" : ""} />
                  </button>
                </form>
                <div className="text-center mt-3 text-[10px] text-[#e0e0e0]/40 uppercase tracking-widest">
                  System Status: Operational • RAG Pipeline & Search Grounding Active
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Icons needed for the Architecture view
function Database(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>;
}
function Cpu(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>;
}
function Activity(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.48 12H2"/></svg>;
}
function Server(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>;
}
