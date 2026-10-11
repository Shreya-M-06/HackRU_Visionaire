
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI();

export async function POST(request) {
  try {
    const {
      topic,
      selectedNode,
      ancestorPath = [],
      descendantSummaries = [],
      previousSummary = '',
      messages = [],
    } = await request.json();

    if (!selectedNode) {
      return Response.json(
        { error: 'A selected concept is required.' },
        { status: 400 }
      );
    }

    const conversation = messages
      .filter((message) => ['user', 'assistant'].includes(message.role))
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(message.content ?? message.text ?? '') }],
      }))
      .filter((message) => message.parts[0].text.trim());

    const context = {
      overallTopic: topic || '',
      selectedConcept: selectedNode,
      ancestorPath,
      descendantSummaries,
      previousSummary,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        ...conversation,
        {
          role: 'user',
          parts: [{
            text: `Answer questions about this knowledge-map concept.
Use the context to stay relevant to the selected concept.
Explain clearly and use examples when helpful.
If asked about a related concept, explain the connection.

Knowledge-map context:
${JSON.stringify(context, null, 2)}

Answer the latest user question in the conversation.`,
          }],
        },
      ],
      config: {
        systemInstruction:
          'You are Visionaire, a helpful tutor for exploring knowledge maps. Be accurate, clear, and concise. Do not invent details about the map that are not in the supplied context.',
      },
    });

    return Response.json({
      reply: response.text || 'Sorry, I could not generate a response. Please try again.',
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Failed to generate a chat response.', details: error.message },
      { status: 500 }
    );
  }
}
