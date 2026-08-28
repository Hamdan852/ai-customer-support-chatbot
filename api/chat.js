function localSupportAnswer(message, mode) {
  const text = String(message || '').toLowerCase();

  if (mode === 'real-estate') {
    if (/schedule|showing|tour|visit/.test(text)) {
      return 'Absolutely. I can help prepare a showing request. Please provide the property address or listing link, your preferred date and time, and the best way for an agent to contact you. A licensed agent can then confirm availability.';
    }
    if (/agent|realtor|contact|call|phone|email/.test(text)) {
      return 'I can prepare an agent handoff. Please share your name, preferred contact method, phone or email, the area you are interested in, and when you would like an agent to contact you.';
    }
    if (/buy|house|home|property|bedroom|bathroom|budget|\$|price|rent|rental|apartment|condo|townhome/.test(text)) {
      return 'I can help organize your property search. Please tell me the city or ZIP code, buying or renting, property type, budget, desired bedrooms/bathrooms, and your target timeframe. I will use objective criteria only; a licensed agent can provide current listing availability and professional advice.';
    }
    if (/sell|selling|listing|list my/.test(text)) {
      return 'I can help you prepare a seller request. Please provide the property city or ZIP code, property type, approximate size, and your preferred timeframe. A licensed real-estate professional can discuss valuation, listing strategy, and local requirements.';
    }
    if (/mortgage|loan|interest|financing|payment/.test(text)) {
      return 'For mortgage rates, loan terms, and financing eligibility, please speak with a qualified lender. I can help you prepare the property details and questions you want to discuss with them.';
    }
    if (/legal|lawyer|attorney|contract|disclosure|tax/.test(text)) {
      return 'That question may require a licensed attorney, tax professional, or other qualified professional. I can help organize the facts and prepare questions for the appropriate professional or real-estate agent.';
    }
    return 'I can help with property-search preferences, showing requests, buyer or seller lead qualification, and agent handoff. Tell me the city or ZIP code, what you want to buy or rent, your budget, property type, and timeframe.';
  }

  if (/hello|hi|hey|good morning|good afternoon|good evening/.test(text)) {
    return 'Hello! 👋 I’m the ModernTech Support Assistant. I can help with shipping, returns, opening hours, support contact information, and other common customer questions.';
  }
  if (/shipping|delivery|deliver/.test(text)) {
    return 'For shipping details, please provide your order number or tell me what you need to know. I can help explain the available shipping options once the company’s current policy is provided.';
  }
  if (/return|refund|exchange/.test(text)) {
    return 'I can help with a return or refund request. Please provide your order number and a short description of the issue. If the applicable company policy is not available here, a support representative should confirm the exact eligibility and deadline.';
  }
  if (/hour|open|close|support/.test(text)) {
    return 'I’m ready to help. For current opening hours or a direct support contact, please provide the company’s latest support information so I don’t invent a policy.';
  }
  if (/thank|thanks/.test(text)) {
    return 'You’re welcome! If you have another question, just ask. 😊';
  }
  return 'I can help with common customer-support questions, but I don’t want to invent company policies. Please ask about shipping, returns, support, opening hours, or provide the relevant company information.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
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

    const latestUserMessage = safeMessages[safeMessages.length - 1].content;
    const apiKey = process.env.OPENAI_API_KEY;

    // Free fallback mode: the chatbot remains functional when no API key or API quota is available.
    if (!apiKey || !apiKey.trim()) {
      return res.status(200).json({ answer: localSupportAnswer(latestUserMessage, mode), provider: 'local-fallback' });
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
          return res.status(200).json({ answer: localSupportAnswer(latestUserMessage, mode), provider: 'local-fallback' });
        }
        return res.status(200).json({ answer, provider: 'openai' });
      }

      lastError = {
        status: response.status,
        errorType: data?.error?.type || 'unknown',
        errorCode: data?.error?.code || 'unknown',
        message: data?.error?.message || 'No error message returned',
        model
      };
      console.error('OpenAI API request failed; using local fallback:', lastError);

      // A billing/quota/auth/rate-limit/service problem should not break the customer-facing chatbot.
      if (![400, 404].includes(response.status)) break;
    }

    return res.status(200).json({
      answer: localSupportAnswer(latestUserMessage, mode),
      provider: 'local-fallback',
      degraded: true
    });
  } catch (error) {
    console.error('Chat handler exception; using local fallback:', { name: error?.name || 'Error', message: error?.message || 'Unknown error' });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const mode = body.mode === 'real-estate' ? 'real-estate' : 'support';
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const latest = messages.filter((m) => m && m.role === 'user' && typeof m.content === 'string').slice(-1)[0]?.content || '';
    return res.status(200).json({ answer: localSupportAnswer(latest, mode), provider: 'local-fallback', degraded: true });
  }
}
