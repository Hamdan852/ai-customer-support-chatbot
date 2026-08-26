export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI backend is not configured yet. Add OPENAI_API_KEY in Vercel Environment Variables.'
    });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const safeMessages = messages
      .filter(
        (message) =>
          message &&
          (message.role === 'user' || message.role === 'assistant') &&
          typeof message.content === 'string'
      )
      .slice(-20)
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 4000)
      }));

    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'A user message is required.' });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5',
        instructions:
          'You are the ModernTech AI Support Assistant. Give concise, friendly, useful customer-support answers. If the customer asks about a company policy that is not provided in the conversation, do not invent a policy; say that the information is not available and offer to help with something else.',
        input: safeMessages,
        max_output_tokens: 600
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API error:', data);
      return res.status(502).json({
        error: 'The AI service could not complete the request.'
      });
    }

    const answer =
      data.output_text ||
      data.output
        ?.filter((item) => item.type === 'message')
        ?.flatMap((item) => item.content || [])
        ?.filter((item) => item.type === 'output_text')
        ?.map((item) => item.text)
        ?.join(' ')
        ?.trim();

    if (!answer) {
      return res.status(502).json({ error: 'The AI service returned no answer.' });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    console.error('Chat handler error:', error);
    return res.status(500).json({ error: 'Unable to process the chat request.' });
  }
}
