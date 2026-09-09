# BharatAI

BharatAI is a production-grade, multilingual Indian AI platform with reliable RAG, grounded answers, tool calling, conversation memory, and citations. 

**Note: BharatAI currently uses Google Gemini as its underlying LLM.** It is not a custom-trained foundation model from scratch, but rather a sophisticated AI architecture built on top of the Gemini API.

## Architecture

User 
↓ 
Next.js Frontend (React, Tailwind v4)
↓ 
Secure API Layer (Next.js App Router, JWT Auth)
↓ 
Intent / Request Router
↓ 
Gemini LLM (gemini-3.6-flash)
├── RAG Retrieval (In-Memory Modular Store, text-embedding-004)
├── Web Search (Mock/Tool Registry)
├── Application Tools (Time, Calculator)
└── Conversation Memory (Local Storage Layer)
↓ 
Grounding / Validation Layer (Citation Injection)
↓ 
Final Response + Citations (Streaming)

## Features
- **Multilingual Support:** English, Hindi, Tamil, Telugu, Bengali, Kannada, Malayalam, Marathi.
- **RAG & Grounding:** Custom embedding chunker and semantic search.
- **Conversational Memory:** Preserves multi-turn state.
- **Streaming Chat:** Real-time token rendering.
- **Tool Calling:** Declarative tool registry for extending capabilities.
- **Authentication:** JWT cookie-based session management.

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `JWT_SECRET`: Random string for signing sessions.
- `APP_URL`: The deployed URL (e.g., http://localhost:3000).

## Setup & Deployment

1. Install dependencies: `npm install`
2. Run development server: `npm run dev`
3. Production build: `npm run build`
4. Start production server: `npm run start`

## Security Considerations
- Authentication is enforced via Next.js Middleware.
- API keys are NEVER exposed to the frontend browser bundle.
- Inputs are validated at the API boundaries.
- Rate limiting should be handled at the ingress/proxy layer (e.g., Cloud Run or Vercel).
