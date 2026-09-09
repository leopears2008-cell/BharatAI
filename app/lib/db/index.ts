import { v4 as uuidv4 } from "uuid";

// Types
export type User = { id: string; email: string; name: string; createdAt: Date };
export type Conversation = { id: string; userId: string; title: string; language: string; createdAt: Date; updatedAt: Date };
export type Message = { id: string; conversationId: string; role: "user" | "model"; content: string; citations?: any[]; createdAt: Date };
export type Document = { id: string; title: string; content: string; url?: string; createdAt: Date };
export type Chunk = { id: string; documentId: string; content: string; embedding: number[]; score?: number };

// In-Memory Storage (Mimicking a real DB since external databases were declined)
const users = new Map<string, User>();
const conversations = new Map<string, Conversation>();
const messages = new Map<string, Message>();
const documents = new Map<string, Document>();
const chunks = new Map<string, Chunk>();

// Initialize an admin user for the mock backend
const ADMIN_ID = "admin-123";
users.set(ADMIN_ID, { id: ADMIN_ID, email: "admin@bharatai.in", name: "Admin", createdAt: new Date() });

export const db = {
  users: {
    findByEmail: async (email: string) => Array.from(users.values()).find(u => u.email === email),
    findById: async (id: string) => users.get(id),
    create: async (data: Omit<User, "id" | "createdAt">) => {
      const id = uuidv4();
      const user = { ...data, id, createdAt: new Date() };
      users.set(id, user);
      return user;
    }
  },
  conversations: {
    findByUserId: async (userId: string) => Array.from(conversations.values()).filter(c => c.userId === userId).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    findById: async (id: string) => conversations.get(id),
    create: async (userId: string, title: string, language: string = "English") => {
      const id = uuidv4();
      const conv = { id, userId, title, language, createdAt: new Date(), updatedAt: new Date() };
      conversations.set(id, conv);
      return conv;
    },
    update: async (id: string, data: Partial<Conversation>) => {
      const conv = conversations.get(id);
      if (conv) {
        Object.assign(conv, data, { updatedAt: new Date() });
      }
      return conv;
    },
    delete: async (id: string) => {
      conversations.delete(id);
      // Cascade delete messages
      Array.from(messages.values()).forEach(m => {
        if (m.conversationId === id) messages.delete(m.id);
      });
    }
  },
  messages: {
    findByConversationId: async (conversationId: string) => Array.from(messages.values()).filter(m => m.conversationId === conversationId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    create: async (conversationId: string, role: "user" | "model", content: string, citations?: any[]) => {
      const id = uuidv4();
      const msg = { id, conversationId, role, content, citations, createdAt: new Date() };
      messages.set(id, msg);
      
      const conv = conversations.get(conversationId);
      if (conv) {
        conv.updatedAt = new Date();
      }
      return msg;
    }
  },
  documents: {
    findAll: async () => Array.from(documents.values()),
    create: async (title: string, content: string, url?: string) => {
      const id = uuidv4();
      const doc = { id, title, content, url, createdAt: new Date() };
      documents.set(id, doc);
      return doc;
    },
    delete: async (id: string) => {
      documents.delete(id);
      Array.from(chunks.values()).forEach(c => {
        if (c.documentId === id) chunks.delete(c.id);
      });
    }
  },
  chunks: {
    create: async (documentId: string, content: string, embedding: number[]) => {
      const id = uuidv4();
      const chunk = { id, documentId, content, embedding };
      chunks.set(id, chunk);
      return chunk;
    },
    findAll: async () => Array.from(chunks.values())
  }
};
