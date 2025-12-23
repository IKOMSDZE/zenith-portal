
import { GoogleGenAI } from "@google/genai";

export const GeminiService = {
  /**
   * Generates a text response for the AI Assistant using Gemini 3 Flash.
   */
  generateResponse: async (prompt: string) => {
    try {
      // Create a new instance right before the call to ensure up-to-date API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Direct property access on GenerateContentResponse as per SDK guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "შენ ხარ Zenith პორტალის ასისტენტი, სახელად ზენი. შენი მიზანია დაეხმარო თანამშრომლებს შიდა კითხვებზე პასუხის გაცემაში. იყავი თავაზიანი და პროფესიონალური. პასუხი გაეცი ქართულად.",
          temperature: 0.7,
        }
      });
      return response.text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "ბოდიში, მოხდა შეცდომა AI ასისტენტთან დაკავშირებისას. გთხოვთ სცადოთ მოგვიანებით.";
    }
  },

  /**
   * Starts a streaming chat session for better real-time interaction.
   */
  startChat: (history: any[] = []) => {
    // Create a new instance right before starting a chat session
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Correctly initialize chat session with provided history
    return ai.chats.create({
      model: 'gemini-3-flash-preview',
      history: history,
      config: {
        systemInstruction: "შენ ხარ Zenith პორტალის ასისტენტი. პასუხი გაეცი ქართულად.",
      }
    });
  }
};
