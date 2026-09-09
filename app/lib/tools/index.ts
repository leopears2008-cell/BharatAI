import { Type, FunctionDeclaration } from "@google/genai";

// Expose the schemas for Gemini API
export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_current_time",
    description: "Get the current time and date in a specific timezone.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        timezone: {
          type: Type.STRING,
          description: "The timezone (e.g., 'Asia/Kolkata', 'UTC')",
        },
      },
      required: ["timezone"],
    },
  },
  {
    name: "search_web",
    description: "Search the web for real-time information.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "The search query to look up.",
        },
      },
      required: ["query"],
    },
  }
];

// Tool Executors
export const toolHandlers: Record<string, (args: any) => Promise<any>> = {
  get_current_time: async ({ timezone }) => {
    try {
      const time = new Date().toLocaleString("en-US", { timeZone: timezone });
      return { time, timezone };
    } catch (e) {
      return { error: "Invalid timezone or execution error." };
    }
  },
  search_web: async ({ query }) => {
    // Mock web search since external access might be limited without a real API key (e.g., Google Custom Search or Tavily)
    // In production, this would call a real search API.
    return {
      results: [
        { title: "Search Result 1", snippet: `Information regarding ${query} is currently limited in this demo environment.` },
      ]
    };
  }
};
