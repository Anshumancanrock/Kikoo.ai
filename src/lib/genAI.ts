import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Google Generative AI client with API key
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Helper function to retry API calls with exponential backoff when rate limits are hit
export async function generateWithRetry(model: any, prompt: string, maxRetries = 3) {
  let retries = 0;
  let delay = 1000; // Start with a 1-second delay
  
  // Set up safety settings to avoid content filtering issues
  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];
  
  // Set generation config
  const generationConfig = {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 300,
  };
  
  while (retries < maxRetries) {
    try {
      // Ensure the model is configured with the proper settings
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
      });
      return result;
    } catch (error: any) {
      // Check if the error is a rate limit error (429)
      if (error.message && error.message.includes('429') && retries < maxRetries - 1) {
        console.log(`Rate limit hit. Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        delay *= 2; // Exponential backoff
      } else {
        throw error; // Rethrow if it's not a rate limit error or we've exceeded retries
      }
    }
  }
  
  throw new Error('Maximum retry attempts reached for API call');
}