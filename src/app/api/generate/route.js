import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client. It automatically pulls your key from .env.local
const ai = new GoogleGenAI();


async function generateWithRetry(options, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent(options);
    } catch (error) {
      const status = error.status ?? error.code;
      const retryable = [429, 500, 502, 503, 504].includes(Number(status));

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, attempt * 1500)
      );
    }
  }
}

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    const systemInstruction = `
      You are an advanced knowledge-graph engine. Break down topics into a strict 3-tier hierarchy.
      Level 1: Core components (Macro overview).
      Level 2: Sub-components (Fleshing out each macro system).
      Level 3: Technical deployment specs (Recommended languages, databases, vector spaces, or mechanisms).
    `;

    // Updated model call to leverage Google's latest Gemini 3.8 Flash engine
    const response = await generateWithRetry({
      model: 'gemini-3.8-flash', 
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: "object", // FIXED: Updated from legacy Type.OBJECT to standard string formatting
          properties: {
            topic: { type: "string" },
            level_1_nodes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  summary: { type: "string" }
                },
                required: ['id', 'label', 'summary']
              }
            },
            level_2_nodes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  parentId: { type: "string" },
                  label: { type: "string" },
                  summary: { type: "string" }
                },
                required: ['id', 'parentId', 'label', 'summary']
              }
            },
            level_3_nodes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  parentId: { type: "string" },
                  label: { type: "string" },
                  detail: { type: "string" }
                },
                required: ['id', 'parentId', 'label', 'detail']
              }
            }
          },
          required: ['topic', 'level_1_nodes', 'level_2_nodes', 'level_3_nodes']
        }
      }
    });

    const graphData = JSON.parse(response.text);
    return new Response(JSON.stringify(graphData), { status: 200 });

  
} catch (error) {
  console.error('Gemini API Error:', error);

  const status = Number(error.status ?? error.code);
  const temporary = [429, 500, 502, 503, 504].includes(status);

  return Response.json(
    {
      error: temporary
        ? 'The AI service is temporarily unavailable. Please try again shortly.'
        : 'Could not generate the concept map.',
    },
    { status: temporary ? 503 : 500 }
  );
}
}
