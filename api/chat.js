const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 4000;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return json({
        error: "AI service is not configured yet. Add OPENAI_API_KEY to the Vercel project environment variables.",
      }, 503);
    }

    const body = await request.json();
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];

    if (rawMessages.length === 0) {
      return json({ error: "Please provide at least one message." }, 400);
    }

    const messages = rawMessages
      .slice(-MAX_MESSAGES)
      .filter((message) => message && ["user", "assistant"].includes(message.role))
      .map((message) => ({
        role: message.role,
        content: String(message.content || "").slice(0, MAX_CHARS_PER_MESSAGE),
      }))
      .filter((message) => message.content.trim());

    if (!messages.length) {
      return json({ error: "The message content is empty." }, 400);
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
        store: false,
        instructions: `You are the ModernTech AI Support Assistant.

Your job is to help customers politely and concisely.

Business demo information:
- Business: ModernTech
- Support topic examples: shipping, returns, opening hours, and contacting support.
- This is a portfolio demonstration, so never invent exact prices, delivery times, guarantees, or policies that were not supplied.
- If the customer asks for information that is not known, clearly say that a human representative can confirm it.
- Never claim to have completed an order, refund, booking, payment, or account change unless a connected tool actually performed that action.
- If a customer wants human support, offer to collect their name and contact details.
- Keep answers helpful and professional.`,
        input: messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error", data);
      return json({ error: "The AI service could not complete the request." }, 502);
    }

    const answer = data.output_text?.trim();

    if (!answer) {
      return json({ error: "The AI returned an empty response." }, 502);
    }

    return json({ answer });
  } catch (error) {
    console.error("Chat function error", error);
    return json({ error: "Something went wrong while processing the chat." }, 500);
  }
}

export function GET() {
  return json({ status: "ok", service: "ModernTech AI Support API" });
}
