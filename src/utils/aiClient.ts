import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
}

const AI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default AI;
