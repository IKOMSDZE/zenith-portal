
import { GoogleGenAI } from "@google/genai";

// Initialize the Google GenAI client with API key from environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const GeminiService = {
  /**
   * Generates a text response for the AI Assistant using Gemini 3 Flash.
   */
  generateResponse: async (prompt: string) => {
    try {
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
    return ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: "შენ ხარ Zenith პორტალის ასისტენტი. პასუხი გაეცი ქართულად.",
      }
    });
  }
};
