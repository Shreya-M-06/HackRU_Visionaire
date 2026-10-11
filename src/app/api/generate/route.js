import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client. It automatically pulls your key from .env.local
const ai = new GoogleGenAI();

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
    const response = await ai.models.generateContent({
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
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { status: 500 });
  }
}
