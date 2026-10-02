import { Type, FunctionDeclaration } from "@google/genai";

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_current_time",
    description: "Get the current date and time for a valid IANA timezone.",
    parameters: {
      type: Type.OBJECT,
      properties: { timezone: { type: Type.STRING, description: "IANA timezone such as Asia/Kolkata or UTC." } },
      required: ["timezone"],
    },
  },
  {
    name: "search_web",
    description: "Search the public web for current information. Use this when freshness or external sources are required.",
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING, description: "A concise web search query." } },
      required: ["query"],
    },
  },
];

export const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  get_current_time: async ({ timezone }) => {
    if (typeof timezone !== "string") return { error: "Timezone is required." };
    try {
      return { time: new Date().toLocaleString("en-IN", { timeZone: timezone }), timezone };
    } catch {
      return { error: "Invalid IANA timezone." };
    }
  },

  search_web: async ({ query }) => {
    if (typeof query !== "string" || !query.trim()) return { error: "Search query is required." };

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query.slice(0, 300))}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "BharatAI/1.0 (+https://github.com/leopears2008-cell/BharatAI)" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Web search service is unavailable.");

    const html = await response.text();
    const results: Array<{ title: string; url: string; snippet: string }> = [];
    const pattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\\s\\S]*?)<\\/a>[\\s\\S]*?<a[^>]+class="result__snippet"[^>]*>([\\s\\S]*?)<\\/a>/gi;

    for (const match of html.matchAll(pattern)) {
      if (results.length >= 5) break;
      const clean = (value: string) => value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\\s+/g, " ").trim();
      results.push({ url: match[1], title: clean(match[2]), snippet: clean(match[3]) });
    }

    if (!results.length) return { results: [], message: "No web results were found." };
    return { results };
  },
};
