
import { GoogleGenAI } from "@google/genai";

class GeminiService {
    public ai: GoogleGenAI | null = null;

    constructor() {
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (apiKey) {
            try {
                this.ai = new GoogleGenAI({ apiKey });
            } catch (error) {
                console.warn("Failed to initialize Gemini AI:", error);
            }
        } else {
            console.warn("Gemini API key not found. Voice assistant features will be disabled.");
        }
    }

    public isAvailable(): boolean {
        return this.ai !== null;
    }
}

const geminiService = new GeminiService();
export default geminiService;
