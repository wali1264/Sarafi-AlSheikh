
import { GoogleGenAI } from "@google/genai";

class GeminiService {
    public ai: GoogleGenAI;

    constructor() {
        // Obtain the API key exclusively from the environment variable as per guidelines.
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    }
}

const geminiService = new GeminiService();
export default geminiService;
