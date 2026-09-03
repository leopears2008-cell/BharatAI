import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const knowledgeBase = [
  {
    id: "nep_2020",
    title: "National Education Policy 2020",
    content: "The National Education Policy (NEP) 2020 is India's first comprehensive education reform in over three decades. It replaces the 10+2 schooling model with a 5+3+3+4 structure. Key features include Foundational Literacy and Numeracy (FLN) by 2025, teaching in mother tongue up to Grade 5, and integrating vocational education from Class 6. Higher education reforms include a Four-Year Undergraduate Program (FYUP) with multiple entry/exit options and the Academic Bank of Credits (ABC)."
  },
  {
    id: "rte_2009",
    title: "Right to Education (RTE) Act",
    content: "The Right of Children to Free and Compulsory Education Act or Right to Education Act (RTE), is an Act of the Parliament of India enacted on 4 August 2009, which describes the modalities of the importance of free and compulsory education for children between 6 and 14 in India under Article 21a of the Indian Constitution."
  },
  {
    id: "aadhaar_update",
    title: "Aadhaar Card Update Procedure",
    content: "To update your Aadhaar card details (demographics like Name, Address, DoB, Gender, Mobile Number, Email), you can visit the myAadhaar portal (uidai.gov.in) for online updates (Address only) or visit an Aadhaar Enrolment Center for biometric and other demographic updates. You must bring valid Proof of Identity (PoI) and Proof of Address (PoA) documents."
  },
  {
    id: "pm_kisan",
    title: "PM-KISAN Scheme",
    content: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN) is a Central Sector scheme with 100% funding from Government of India. Under the scheme an income support of Rs.6000/- per year in three equal installments will be provided to all land holding farmer families. The definition of family for the scheme is husband, wife and minor children."
  },
  {
    id: "digital_india",
    title: "Digital India Initiative",
    content: "Digital India is a campaign launched by the Government of India to ensure the Government's services are made available to citizens electronically by improved online infrastructure and by increasing Internet connectivity or making the country digitally empowered in the field of technology. Key pillars include broadband highways, universal access to mobile connectivity, public internet access programme, e-Governance, and e-Kranti."
  }
];

async function main() {
  console.log("Generating embeddings...");
  const store = [];
  
  for (const doc of knowledgeBase) {
    console.log(`Embedding: ${doc.title}`);
    const response = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: doc.content,
    });
    store.push({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      embedding: response.embeddings[0].values,
    });
  }
  
  fs.mkdirSync("app/lib", { recursive: true });
  fs.writeFileSync("app/lib/vectorStore.json", JSON.stringify(store, null, 2));
  console.log("Vector store generated successfully at app/lib/vectorStore.json");
}

main().catch(console.error);
