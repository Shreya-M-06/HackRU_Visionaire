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
      You are an advanced knowledge-graph engine. Break down topics into a strict, highly focused 3-tier hierarchy.
      
      Level 1: Core Pillars (The high-level macro structure, main acts, or primary categories).
      Level 2: Structural Mechanics (Fleshing out how each macro system or category works in practice).
      Level 3: Ultimate Building Blocks & Direct Execution Specs.
               - For TECH/ENGINEERING: Specific databases, code languages, or clusters.
               - For STORIES/FICTION: Specific character motivations, plot twists, or narrative resolutions.
               - For COOKING/FOOD/CRAFTS: Exact ingredient ratios, chemical reactions, temperatures, or tool setups.
               - For SCIENCE/EXPERIMENTS: Raw formulas, laboratory equipment lists, variables, or observation metrics.
               - For THEORETICAL/IMAGINARY: Core axioms, conceptual anomalies, or logic boundaries.
               
      CRITICAL CONSTRAINT: Keep the canvas layout tightly focused. Generate a MAXIMUM of 3-4 nodes for Level 1, 
      and a maximum of 2 sub-nodes per parent. This cuts down data payload sizes for ultra-low latency response speeds.
    `;

    // Updated model call to leverage Google's latest Gemini 3.8 Flash engine
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash', 
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: "object", 
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
