# Hamdan AI Business Assistant

A multi-purpose, embeddable AI website assistant for businesses. It supports written chat, browser voice input/output, multilingual conversations, consent-based lead capture, business-specific knowledge, and a private business dashboard.

## Current product flow

1. A business creates an account at `/login.html`.
2. The owner configures the assistant at `/client-setup.html`.
3. Hamdan generates a small installation script for the customer's website.
4. Website visitors can type or speak to the assistant.
5. Visitors can voluntarily submit contact details with consent.
6. Leads are stored for the correct business and shown only to its authenticated dashboard.

## Security boundary

- Dashboard and lead-listing APIs use a signed HttpOnly session cookie.
- Customer widgets use a public business ID and never receive dashboard credentials.
- API keys must stay in Vercel Environment Variables; never commit secrets to GitHub.
- Customer lead information should only be sent to configured notification providers after appropriate consent.

## Required Vercel production configuration

- `HAMDAN_AUTH_SECRET` — a random secret of at least 32 characters.
- Vercel Postgres — required for persistent business accounts, business configuration, and leads.
- `OPENAI_API_KEY` — optional for AI model responses; without it the assistant uses a limited local fallback.
- `OPENAI_MODEL` — optional model name; defaults to `gpt-4o-mini`.

## Important

This repository is now beyond a static frontend prototype, but production launch still requires deployment configuration, database verification, notification-provider setup, rate limiting/WAF, privacy/legal pages, and end-to-end testing. Payment/subscription billing is not enabled yet.

## Widget installation

After configuring a business, copy the generated script into the customer's website before `</body>`. The script loads the isolated Hamdan AI widget and associates visitors with that business.
