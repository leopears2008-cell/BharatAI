"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, LogOut, Menu, MessageSquare, Plus, Sparkles, Square, Trash2, X } from "lucide-react";
import { Markdown } from "./components/Markdown";
import { CopyButton } from "./components/CopyButton";
import { ThemeToggle } from "./components/ThemeToggle";

type Citation = { title: string; url?: string };
type ChatMessage = {
  id: string;
  role: "user" | "model";
  content: string;
  citations?: Citation[];
  model?: string;
  error?: string;
};
type ConversationSummary = { id: string; title: string };

type ServerEvent =
  | { type: "meta"; conversationId: string; model: string }
  | { type: "delta"; text: string }
  | { type: "tool"; name: string }
  | { type: "citations"; citations: Citation[] }
  | { type: "error"; message: string }
  | { type: "done" };

const LANGUAGES = [
  { value: "English", label: "English" },
  { value: "Hindi", label: "हिन्दी" },
  { value: "Tamil", label: "தமிழ்" },
  { value: "Telugu", label: "తెలుగు" },
  { value: "Bengali", label: "বাংলা" },
];

const SUGGESTIONS = [
  "What are the key government schemes for farmers in Tamil Nadu?",
  "Explain quantum computing in simple Hindi.",
  "How do I securely store API keys?",
  "Write a Python script for web scraping.",
];

const TOOL_LABELS: Record<string, string> = {
  get_current_time: "Checking the time",
  calculator: "Calculating",
};

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [toolName, setToolName] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState("English");

  const activeIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const setActiveId = (id: string | null) => {
    activeIdRef.current = id;
    setActiveIdState(id);
  };

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.ok) setConversations(await res.json());
    } catch {
      /* sidebar stays as-is; chat still works */
    }
  }, [router]);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const stop = () => abortRef.current?.abort();

  const newChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setActiveId(null);
    setInput("");
    setSidebarOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const openConversation = async (id: string) => {
    abortRef.current?.abort();
    setSidebarOpen(false);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.status === 401) return router.push("/login");
      if (!res.ok) {
        await fetchConversations();
        return;
      }
      const data = await res.json();
      setMessages(
        (data.messages as { id: string; role: "user" | "model"; content: string; citations?: Citation[] }[]).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations?.length ? m.citations : undefined,
        }))
      );
      setActiveId(id);
      if (LANGUAGES.some((l) => l.value === data.language)) setLanguage(data.language);
    } catch {
      /* keep current view */
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    } finally {
      if (activeIdRef.current === id) newChat();
      await fetchConversations();
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || streaming) return;

    setInput("");
    requestAnimationFrame(resizeTextarea);

    const botId = crypto.randomUUID();
    setMessages((p) => [...p, { id: crypto.randomUUID(), role: "user", content: text }, { id: botId, role: "model", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const patchBot = (fn: (m: ChatMessage) => ChatMessage) => setMessages((p) => p.map((m) => (m.id === botId ? fn(m) : m)));

    try {
      const res = await fetch("/api/v1/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId: activeIdRef.current, language }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        if (res.status === 401) router.push("/login");
        const data = await res.json().catch(() => null);
        patchBot((m) => ({ ...m, error: data?.error?.message ?? "Something went wrong. Please try again." }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handle = (ev: ServerEvent) => {
        switch (ev.type) {
          case "meta":
            setActiveId(ev.conversationId);
            patchBot((m) => ({ ...m, model: ev.model }));
            break;
          case "delta":
            setToolName(null);
            patchBot((m) => ({ ...m, content: m.content + ev.text }));
            break;
          case "tool":
            setToolName(ev.name);
            break;
          case "citations":
            patchBot((m) => ({ ...m, citations: ev.citations }));
            break;
          case "error":
            patchBot((m) => ({ ...m, error: ev.message }));
            break;
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            handle(JSON.parse(line) as ServerEvent);
          } catch {
            /* ignore a malformed line */
          }
        }
      }
    } catch (err) {
      // User-initiated stop is not an error; partial text is kept either way.
      if ((err as Error).name !== "AbortError") {
        patchBot((m) => ({ ...m, error: "Connection interrupted. The partial response above was kept." }));
      }
    } finally {
      setStreaming(false);
      setToolName(null);
      abortRef.current = null;
      void fetchConversations();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: don't send while an IME (Tamil/Hindi/etc.) is mid-composition.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />}

      <aside
        aria-label="Conversations"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-sidebar transition-transform duration-200 md:static md:translate-x-0 md:visible ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full invisible"
        }`}
      >
        <div className="flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <span className="brand-gradient px-2 text-lg font-semibold tracking-tight">BharatAI</span>
          <button onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-hover md:hidden">
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button onClick={newChat} className="flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium hover:bg-surface-hover">
            <Plus size={18} aria-hidden /> New chat
          </button>
        </div>

        <nav className="custom-scrollbar flex-1 overflow-y-auto px-2 py-2" aria-label="Recent chats">
          <h2 className="px-3 pb-2 text-xs font-medium text-muted">Recent</h2>
          {conversations.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">No conversations yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => (
                <li key={c.id} className="group relative">
                  <button
                    onClick={() => void openConversation(c.id)}
                    aria-current={c.id === activeId ? "page" : undefined}
                    className={`flex min-h-10 w-full items-center gap-2 rounded-full py-2 pl-3 pr-10 text-left text-sm ${
                      c.id === activeId ? "bg-surface-hover text-foreground" : "text-muted hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    <MessageSquare size={15} className="shrink-0" aria-hidden />
                    <span className="truncate">{c.title}</span>
                  </button>
                  <button
                    onClick={() => void deleteConversation(c.id)}
                    aria-label={`Delete conversation: ${c.title}`}
                    className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-danger md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button onClick={handleLogout} className="flex h-10 w-full items-center gap-3 rounded-full px-3 text-sm text-muted hover:bg-surface hover:text-foreground">
            <LogOut size={17} aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between px-3 pt-[env(safe-area-inset-top)] sm:px-5">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" aria-expanded={sidebarOpen} className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-hover md:hidden">
              <Menu size={20} aria-hidden />
            </button>
            <span className="text-base font-medium">BharatAI</span>
            <span className="hidden text-sm text-muted sm:inline">AI Platform</span>
          </div>
          <div className="flex items-center gap-1">
            <label className="sr-only" htmlFor="lang">
              Response language
            </label>
            <select
              id="lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-10 rounded-full bg-surface px-3 text-sm text-foreground hover:bg-surface-hover"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <ThemeToggle />
          </div>
        </header>

        <main className="custom-scrollbar flex-1 overflow-y-auto" role="log" aria-live="polite" aria-busy={streaming} aria-label="Conversation">
          <div className="mx-auto w-full max-w-3xl px-4 pb-6 sm:px-6">
            {messages.length === 0 ? (
              <div className="pt-[12vh]">
                <h1 className="brand-gradient text-4xl font-medium leading-tight sm:text-5xl">Hello</h1>
                <p className="mt-1 text-4xl font-medium leading-tight text-muted/70 sm:text-5xl">How can I help you today?</p>
                <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInput(s);
                        requestAnimationFrame(() => {
                          textareaRef.current?.focus();
                          resizeTextarea();
                        });
                      }}
                      className="min-h-24 rounded-2xl bg-surface p-4 text-left text-sm text-foreground hover:bg-surface-hover"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8 pt-4">
                {messages.map((msg, idx) => {
                  const isLast = idx === messages.length - 1;
                  if (msg.role === "user") {
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-3xl bg-surface px-5 py-3 text-[0.95rem] leading-relaxed">{msg.content}</div>
                      </div>
                    );
                  }
                  const working = streaming && isLast && !msg.content && !msg.error;
                  return (
                    <div key={msg.id} className="flex gap-3 sm:gap-4">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface">
                        <Sparkles size={16} className="text-accent" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        {working && (
                          <p className="flex items-center gap-1.5 py-2 text-sm text-muted" role="status">
                            {toolName ? `${TOOL_LABELS[toolName] ?? "Working"}…` : "Thinking"}
                            {[0, 1, 2].map((i) => (
                              <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" style={{ animationDelay: `${i * 0.2}s` }} />
                            ))}
                          </p>
                        )}
                        {msg.content && <Markdown>{msg.content}</Markdown>}
                        {streaming && isLast && msg.content && toolName && <p className="mt-2 text-sm text-muted">{TOOL_LABELS[toolName] ?? "Working"}…</p>}
                        {msg.error && (
                          <p role="alert" className="mt-2 rounded-xl border border-danger/40 px-3 py-2 text-sm text-danger">
                            {msg.error}
                          </p>
                        )}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-3 text-sm">
                            <p className="mb-1 text-xs font-medium text-muted">Sources</p>
                            <ul className="flex flex-wrap gap-2">
                              {msg.citations.map((c) => (
                                <li key={c.title} className="rounded-full bg-surface px-3 py-1 text-xs">
                                  {c.url ? (
                                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
                                      {c.title}
                                    </a>
                                  ) : (
                                    c.title
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {msg.content && !(streaming && isLast) && (
                          <div className="mt-2 flex items-center gap-2">
                            <CopyButton text={msg.content} label="Copy response" />
                            {msg.model && <span className="text-xs text-muted">{msg.model}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={endRef} />
          </div>
        </main>

        <footer className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <div className="flex items-end gap-2 rounded-[28px] bg-surface py-2 pl-5 pr-2 focus-within:ring-1 focus-within:ring-line">
              <label htmlFor="composer" className="sr-only">
                Message BharatAI
              </label>
              <textarea
                id="composer"
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  resizeTextarea();
                }}
                onKeyDown={onKeyDown}
                placeholder="Ask BharatAI"
                maxLength={8000}
                className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent py-2 text-base leading-6 text-foreground placeholder:text-muted focus:outline-none"
              />
              {streaming ? (
                <button onClick={stop} aria-label="Stop generating" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <Square size={14} fill="currentColor" aria-hidden />
                </button>
              ) : (
                <button
                  onClick={() => void send(input)}
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:bg-surface-hover disabled:text-muted"
                >
                  <ArrowUp size={20} aria-hidden />
                </button>
              )}
            </div>
            <p className="mt-2 text-center text-xs text-muted">BharatAI can make mistakes. Check important information.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
