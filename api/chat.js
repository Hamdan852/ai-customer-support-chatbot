import { getPublicBusinessId } from './auth.js';
import { getBusinessConfig } from './business-store.js';
import { rejectIfLimited } from './rate-limit.js';

function cleanAssistantName(value, business) {
  const businessName = String(business?.businessName || business || '').trim().replace(/\s+/g, ' ');
  const fallback = businessName ? `${businessName} AI Assistant` : 'Hamdan AI Assistant';
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  if (!name) return fallback;
  if (/^(the\s+)?business\s+(ai|al)(\s+support)?\s+assistant$/i.test(name)) return fallback;
  if (/^(the\s+)?ai\s+assistant\s+for\s+(your|the)\s+business$/i.test(name)) return fallback;
  return name.replace(/^the\s+the\s+/i, 'the ');
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function knowledgeFallback(message, config) {
  const knowledge = String(config?.knowledge || '').trim();
  if (!knowledge) return '';
  const query = normalizeText(message);
  if (!query) return '';
  const queryWords = new Set(query.split(' ').filter((word) => word.length >= 3));
  const candidates = knowledge.split(/(?<=[.!?])\s+|\n+/).map((part) => part.trim()).filter(Boolean).slice(0, 80);
  const best = [];
  for (const sentence of candidates) {
    const words = new Set(normalizeText(sentence).split(' ').filter((word) => word.length >= 3));
    let score = 0;
    for (const word of queryWords) if (words.has(word)) score += 1;
    if (score > 0) best.push({ score, sentence });
  }
  best.sort((a, b) => b.score - a.score);
  const threshold = queryWords.size <= 2 ? 1 : Math.max(2, Math.ceil(queryWords.size * 0.15));
  if (!best.length || best[0].score < threshold) return '';
  return best.slice(0, 2).map((item) => item.sentence).join(' ').slice(0, 900);
}

function wantsVideo(text) {
  return /video|vid(e|eo)|30\s*(second|sec|seconds)|text to video|image to video|audio to video|create.*video|generate.*video/.test(text);
}

function wantsMultilingual(text) {
  return /urdu|roman urdu|arabic|spanish|french|chinese|hindi|language|speak|multilingual/.test(text);
}

function localSupportAnswer(message, mode, config) {
  const text = normalizeText(message);
  const business = String(config?.businessName || 'Hamdan AI').trim() || 'Hamdan AI';
  const assistant = cleanAssistantName(config?.assistantName, config);
  const website = String(config?.website || '').trim();
  const email = String(config?.contactEmail || '').trim();
  const knowledge = knowledgeFallback(message, config);
  const video = wantsVideo(text);
  const multilingual = wantsMultilingual(text);
  const romanUrdu = /\b(kya|kaise|ap|aap|mujhe|hamdan|madad|kar|sakte|sakty|hai|hain|chahiye|bana|banaye|video)\b/.test(text) && /\b(kaise|mujhe|aap|ap|chahiye|bana|banaye)\b/.test(text);

  if (mode === 'real-estate') {
    if (/schedule|showing|tour|visit/.test(text)) return `Absolutely. I can help prepare a showing request for ${business}. Please provide the property address or listing link, your preferred date and time, and the best way for an agent to contact you. A licensed agent can then confirm availability.`;
    if (/agent|realtor|contact|call|phone|email/.test(text)) return `I can prepare an agent handoff for ${business}. Please share your name, preferred contact method, phone or email, the area you are interested in, and when you would like an agent to contact you.`;
    if (/buy|house|home|property|bedroom|bathroom|budget|\$|price|rent|rental|apartment|condo|townhome/.test(text)) return 'I can help organize your property search. Please tell me the city or ZIP code, buying or renting, property type, budget, desired bedrooms/bathrooms, and your target timeframe. A licensed agent can provide current listing availability and professional advice.';
    if (/sell|selling|listing|list my/.test(text)) return 'I can help prepare a seller request. Please provide the property city or ZIP code, property type, approximate size, and your preferred timeframe. A licensed real-estate professional can discuss valuation, listing strategy, and local requirements.';
    if (knowledge) return knowledge;
    return `I can help with ${assistant}'s property-search preferences, showing requests, buyer or seller lead qualification, and agent handoff. Tell me what you need and I’ll help organize the request.`;
  }

  // Handle combined questions before single-intent fallbacks so the assistant does not
  // answer only the first part of a multi-part customer request.
  if (video && multilingual) {
    return romanUrdu
      ? `Ji haan. Main ${assistant} hoon, ${business} ka AI assistant. Main approved business questions ka jawab de sakta hoon aur multilingual support de sakta hoon. 30-second Urdu video ke liye main aap ka professional video brief tayyar karne mein madad kar sakta hoon; actual video generation tab available hogi jab Hamdan ka video engine connected ho. Aap topic, style aur audience batayein.`
      : `Yes. I’m ${assistant}, the AI assistant for ${business}. I can support multilingual conversations and help prepare a professional 30-second Urdu video brief. I won’t claim that a video has been generated here unless the video-generation engine is actually connected. Tell me the topic, style, and target audience.`;
  }
  if (video) {
    return `I’m ${assistant}, the AI assistant for ${business}. I can help you plan a professional video, including a 30-second Urdu script, scene-by-scene brief, voice style, and visual direction. This chatbot does not claim to render the final video unless a video-generation engine is connected. Tell me the topic and style you want.`;
  }
  if (multilingual) {
    if (/urdu|roman urdu/.test(text) || romanUrdu) return `Ji haan. Main ${assistant} hoon aur Urdu/Roman Urdu mein madad kar sakta hoon. Aap apna sawal Urdu ya Roman Urdu mein bhej sakte hain.`;
    return `Yes. ${assistant} can support multilingual conversations when the AI provider is connected. Tell me which language you prefer, and I’ll respond in that language when possible.`;
  }

  if (/who are you|what is your name|your name|are you an ai|what can you do/.test(text)) {
    const extra = /service|services|offer|provide/.test(text) ? ` I can also explain ${business}’s approved services, policies, hours, and contact options.` : '';
    return `Hello! 👋 I’m ${assistant}, the AI assistant for ${business}. I can answer approved business questions, explain services and policies, and help connect you with the team when needed.${extra}`;
  }
  if (/service|services|offer|provide/.test(text)) {
    if (knowledge) return knowledge;
    return `I’m ${assistant}, the AI assistant for ${business}. I can answer questions about the business, its services, policies, hours, and how to contact the team.`;
  }
  if (/hour|open|close|when.*open|when.*close/.test(text)) {
    if (knowledge) return knowledge;
    return `I can provide current opening hours when they are included in ${business}’s approved business information. I don’t want to guess or invent hours.`;
  }
  if (/price|pricing|cost|credit|credits|plan|subscription/.test(text)) {
    if (knowledge) return knowledge;
    return `I can explain ${business} pricing or credit plans when those details are included in the approved business information. I won’t invent prices or credit amounts.`;
  }
  if (/contact|support email|email|phone|call|website|human|agent|team/.test(text)) {
    if (email || website) {
      const details = [email && `email: ${email}`, website && `website: ${website}`].filter(Boolean).join(' • ');
      return `You can contact ${business} using the approved details I have: ${details}. If you want a human to follow up, ask for an agent and I can help prepare a consent-based lead request.`;
    }
    if (knowledge) return knowledge;
    return `I can help you request human support from ${business}. Please ask for an agent and I’ll guide you through the next step without inventing contact details.`;
  }
  if (/shipping|delivery|deliver/.test(text)) return knowledge || 'For shipping details, please tell me what you need to know. I can explain the available options once the company’s current policy is provided.';
  if (/return|refund|exchange/.test(text)) return knowledge || 'I can help with a return or refund request. Please provide your order number and a short description of the issue. A support representative should confirm the exact eligibility and deadline.';
  if (/thank|thanks/.test(text)) return 'You’re welcome! If you have another question, just ask. 😊';
  if (/hello|hi|hey|good morning|good afternoon|good evening/.test(text)) return `Hello! 👋 I’m ${assistant}, the AI assistant for ${business}. How can I help you today?`;
  if (knowledge) return knowledge;
  return `I’m ${assistant}, the AI assistant for ${business}. I can help with common questions about the business, its services, policies, hours, or how to contact the team.`;
}

function cleanMessages(messages) {
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  if (rejectIfLimited(req, res, 'chat', 30, 60_000)) return;
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const messages = cleanMessages(Array.isArray(body.messages) ? body.messages : []);
    const mode = body.mode === 'real-estate' ? 'real-estate' : 'support';
    if (!messages.length || messages[messages.length - 1].role !== 'user') return res.status(400).json({ error: 'A user message is required.' });
    const businessId = getPublicBusinessId(req) || 'demo-business';
    const config = await getBusinessConfig(businessId);
    const latest = messages[messages.length - 1].content;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !apiKey.trim()) return res.status(200).json({ answer: localSupportAnswer(latest, mode, config), provider: 'local-fallback', degraded: true });
    const assistant = cleanAssistantName(config?.assistantName, config);
    const businessContext = config ? `Approved business information:\nBusiness name: ${config.businessName || ''}\nAssistant name: ${assistant}\nIndustry: ${config.industry || ''}\nWebsite: ${config.website || ''}\nKnowledge supplied by the business:\n${(config.knowledge || '').slice(0,12000)}` : 'No business-specific information has been configured. Do not invent business facts.';
    const instructions = mode === 'real-estate' ? `You are ${assistant}, a professional website assistant for ${config?.businessName || 'Hamdan AI'}. Help visitors with objective property information, search preferences, showing requests, general buying and selling process questions, and lead qualification. Never invent listings, prices, availability, mortgage terms, legal advice, or agency policies. Do not steer users or make recommendations based on protected characteristics. Offer an agent handoff when professional advice is required. Keep answers concise and friendly. Respond in the same language as the user whenever possible. Use only the approved business information below for business-specific facts.\n\n${businessContext}` : `You are ${assistant}, the customer-support assistant for ${config?.businessName || 'Hamdan AI'}. Give concise, friendly, useful answers. When the customer asks who you are or what your name is, explicitly identify yourself as ${assistant}. If the user asks about video creation, you may help prepare a script/brief, but never claim a video was rendered unless a connected video engine actually performed the generation. Respond in the same language as the user whenever possible, including Urdu and Roman Urdu. Never invent company policies, prices, hours, services, contact details, or other facts. If the approved business information does not answer a business-specific question, say so and offer human contact/lead handoff.\n\n${businessContext}`;
    const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey.trim()}` }, body: JSON.stringify({ model, instructions, input: messages, max_output_tokens: 700 }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const answer = data.output_text || data.output?.filter((x) => x.type === 'message').flatMap((x) => x.content || []).filter((x) => x.type === 'output_text').map((x) => x.text).join(' ').trim();
      if (answer) return res.status(200).json({ answer, provider: 'openai' });
    }
    console.error('OpenAI unavailable; using local fallback', { status: response.status, error: data?.error?.message || 'unknown' });
    return res.status(200).json({ answer: localSupportAnswer(latest, mode, config), provider: 'local-fallback', degraded: true });
  } catch (error) {
    console.error('Chat handler exception; using local fallback:', error?.message || 'Unknown error');
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const mode = body.mode === 'real-estate' ? 'real-estate' : 'support';
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const latest = messages.filter((m) => m && m.role === 'user' && typeof m.content === 'string').slice(-1)[0]?.content || '';
    return res.status(200).json({ answer: localSupportAnswer(latest, mode, null), provider: 'local-fallback', degraded: true });
  }
}
