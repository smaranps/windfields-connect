import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

async function uriToGenerativePart(uri: string, mimeType: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<{ inlineData: { data: string; mimeType: string } }>(
    (resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve({
          inlineData: {
            data: base64String,
            mimeType,
          },
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }
  );
}

interface GeminiListingResult {
  title: string;
  description: string;
  category: string;
}

export async function generateListingDetails(
  imageUri: string
): Promise<GeminiListingResult> {
  try {
    const imagePart = await uriToGenerativePart(imageUri, "image/jpeg");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
        Analyze this image of an item being listed on a marketplace. 
        Return a clean, valid JSON object with exactly these three keys:
        {
          "title": "A short, catchy, search-friendly title (max 6 words)",
          "description": "A descriptive, appealing 2-3 sentence description of the item based on what you see",
          "category": "A single best-fit category name (e.g., Electronics, Fashion, Home, Sports, Games)"
        }
        Strict requirement: Do NOT wrap the response in markdown blocks like \`\`\`json. Return ONLY the raw JSON string starting with { and ending with }.
      `;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    // 4. Parse the JSON
    const parsedData = JSON.parse(responseText.trim());
    return parsedData;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}
interface SmartRepliesResult {
  replies: string[];
}


export async function generateSmartReplies(
  chatHistory: { senderId: string; text: string }[]
): Promise<SmartRepliesResult> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const formattedHistory = chatHistory
      .slice(-4)
      .map(
        (msg) => `${msg.senderId === "buyer" ? "Buyer" : "Seller"}: ${msg.text}`
      )
      .join("\n");

    const prompt = `
        You are an AI assistant built into a neighborhood marketplace chat app.
        Analyze this recent conversation history between a buyer and a seller:
        
        ${formattedHistory}
        
        Based on this conversation, generate exactly 3 short, polite, 1-sentence reply suggestions that the user could send next. 
        - One should be accepting/agreeable (e.g., "That sounds perfect, see you then!").
        - One should be a polite counter-offer or alternative (e.g., "Would you be able to do $20 instead?").
        - One should be a clarifying question (e.g., "What time works best for pickup?").
        
        Return a clean, valid JSON object with exactly this key:
        {
          "replies": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
        }
        Strict requirement: Do NOT wrap the response in markdown blocks like \`\`\`json. Return ONLY the raw JSON string starting with { and ending with }.
      `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const parsedData = JSON.parse(responseText.trim());
    return parsedData;
  } catch (error) {
    console.error("Gemini Smart Reply Error:", error);

    return {
      replies: [
        "Is this still available?",
        "Where are you located?",
        "Sounds good to me!",
      ],
    };
  }
}
