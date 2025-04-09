import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextResponse } from 'next/server';

// Use the specific experimental model name provided by the user
const MODEL_NAME = "gemini-2.5-pro-exp-03-25"; 

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Directly use the specified model name
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    // Adjust maxOutputTokens if needed for 2.5, assuming 8192 is a safe default for now
    maxOutputTokens: 8192, 
  };

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  try {
    const prompt = "Write a short, fun fact about Next.js.";

    const parts = [
      { text: prompt },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
      safetySettings,
    });

    if (result.response) {
        const text = result.response.text();
        return NextResponse.json({ text });
    } else {
        console.error("Gemini API response blocked or empty:", result);
        const blockReason = result.response?.promptFeedback?.blockReason;
        const safetyRatings = result.response?.candidates?.[0]?.safetyRatings;
        return NextResponse.json({ 
            error: "Failed to get response from Gemini API", 
            details: { blockReason, safetyRatings, fullResult: result }
        }, { status: 500 });
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    // Check for specific API errors if possible (e.g., model not found)
    if (typeof errorMessage === 'string' && (errorMessage.includes("MODEL_NAME_INVALID") || errorMessage.includes("not found") || errorMessage.includes("permission"))) {
      return NextResponse.json({ error: `Model name '${MODEL_NAME}' not found or access denied. Check the model name and your API key permissions.`, details: errorMessage }, { status: 400 });
    }
    return NextResponse.json({ error: "Error communicating with Gemini API", details: errorMessage }, { status: 500 });
  }
}
