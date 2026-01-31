import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Google Generative AI client with API key
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Helper function to retry API calls with exponential backoff when rate limits are hit
export async function generateWithRetry(
  // Accept either a generative model object (from genAI.getGenerativeModel) OR a model name string
  modelOrName: ReturnType<typeof genAI.getGenerativeModel> | string,
  prompt: string,
  maxRetries = 3
) {
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

  // Helper to extract a usable text from various response shapes
  function extractTextFromResponse(obj: unknown): string {
    const strings: string[] = [];
    function walk(v: unknown) {
      if (typeof v === 'string') strings.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    }
    walk(obj);
    strings.sort((a, b) => b.length - a.length);
    return strings[0] ?? '';
  }
  
  while (retries < maxRetries) {
    try {
      if (typeof modelOrName === 'string') {
        // Call REST endpoint using API key query param
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Missing GEMINI_API_KEY for REST fallback');
        const modelName = modelOrName.replace(/^models\//, '').trim();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig,
            safetySettings,
          }),
        });

        if (res.status === 200) {
          const body = await res.json();
          const text = extractTextFromResponse(body);
          return { response: { text: () => text } } as any;
        }

        // If rate limit, throw a descriptive error to be handled below
        const bodyText = await res.text();
        const err = new Error(`HTTP ${res.status}: ${bodyText}`);
        throw err;
      } else {
        // Ensure the model is configured with the proper settings
        const result = await modelOrName.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
          safetySettings,
        });
        return result;
      }

    } catch (error: unknown) {
      const msg = (typeof error === 'object' && error && 'message' in error) ? (error as any).message : String(error);

      // Check if the error is a rate limit error (429)
      if (msg.includes('429') && retries < maxRetries - 1) {
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