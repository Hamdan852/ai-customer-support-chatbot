export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.error('AI configuration error: OPENAI_API_KEY is missing or empty.');
    return res.status(503).json({ error: 'The AI service is not configured.' });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const mode = body.mode === 'real-estate' ? 'real-estate' : 'support';

    const safeMessages = messages
      .filter((message) => message && (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
      .slice(-20)
      .map((message) => ({ role: message.role, content: message.content.slice(0, 4000) }));

    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'A user message is required.' });
    }

    const instructions = mode === 'real-estate'
      ? 'You are a professional US real-estate website assistant. Help visitors with objective property information, search preferences, showing requests, general buying and selling process questions, and lead qualification. Ask for location, budget, property type, bedrooms, and timeframe when useful. Never invent listings, prices, availability, mortgage terms, legal advice, or agency policies. Never recommend or exclude neighborhoods or properties based on race, color, religion, sex, disability, familial status, national origin, or other protected characteristics. Do not steer users. When a question requires a licensed real-estate professional, lender, attorney, or other qualified professional, say so and offer an agent handoff. Keep answers concise and friendly.'
      : 'You are the ModernTech AI Support Assistant. Give concise, friendly, useful customer-support answers. If the customer asks about a company policy that is not provided in the conversation, do not invent a policy; say that the information is not available and offer to help with something else.';

    const requestedModel = (process.env.OPENAI_MODEL || '').trim();
    const models = requestedModel ? [requestedModel] : ['gpt-4o-mini', 'gpt-4.1-mini'];
    let lastError = null;

    for (const model of models) {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({ model, instructions, input: safeMessages, max_output_tokens: 600 })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const answer = data.output_text || data.output?.filter((item) => item.type === 'message')?.flatMap((item) => item.content || [])?.filter((item) => item.type === 'output_text')?.map((item) => item.text)?.join(' ')?.trim();
        if (!answer) {
          console.error('OpenAI API returned no text output.', { model });
          return res.status(502).json({ error: 'The AI service returned no answer.' });
        }
        return res.status(200).json({ answer });
      }

      lastError = {
        status: response.status,
        errorType: data?.error?.type || 'unknown',
        errorCode: data?.error?.code || 'unknown',
        message: data?.error?.message || 'No error message returned',
        model
      };
      console.error('OpenAI API request failed:', lastError);

      // Try the next model only for model/request compatibility errors.
      if (![400, 404].includes(response.status)) break;
    }

    return res.status(502).json({
      error: 'The AI service could not complete the request.',
      code: lastError?.errorCode || 'openai_request_failed'
    });
  } catch (error) {
    console.error('Chat handler exception:', { name: error?.name || 'Error', message: error?.message || 'Unknown error' });
    return res.status(500).json({ error: 'Unable to process the chat request.' });
  }
}
