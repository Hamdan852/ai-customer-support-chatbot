# Hamdan AI — Production setup

Before selling the assistant, configure these items in the Vercel project connected to this repository.

## 1. Connect persistent storage

Create/connect a Vercel Postgres database to the project. The app will create these tables automatically on first authenticated request:

- `hamdan_business_configs`
- `hamdan_users`

Without persistent storage, business accounts must not be enabled for production.

## 2. Add authentication secret

In Vercel Project Settings → Environment Variables, add:

`HAMDAN_AUTH_SECRET`

Use a long random value (at least 32 characters). Do not put it in GitHub, HTML, JavaScript, or chat messages.

Use the same secret for Production and Preview only when that is intentional.

## 3. Add AI provider secret (optional)

`OPENAI_API_KEY`

This is a server-side secret. Never use `NEXT_PUBLIC_`, expose it to the browser, or commit it to GitHub.

Optional:

`OPENAI_MODEL`

If omitted, the application defaults to `gpt-4o-mini`.

## 4. Deploy

Push the repository to the Vercel project connected to `Hamdan852/ai-customer-support-chatbot`, or import this repository into Vercel. After deployment, open `/login.html`.

## 5. First test

1. Create a test business account.
2. Sign in.
3. Open Customize Assistant.
4. Add business information and approved knowledge.
5. Save the assistant.
6. Copy the generated widget script.
7. Put the script on a test website.
8. Test typed chat, microphone input, read-aloud, and consented lead submission.
9. Return to the dashboard and verify that the lead appears only for the correct business.
10. Test sign-out and confirm that `/dashboard.html` and `/client-setup.html` require authentication.

## 6. Still required before commercial launch

- Transactional email provider for lead notifications.
- Mobile notification provider if SMS/push is promised.
- Rate limiting and bot protection for public chat/lead endpoints.
- Privacy policy, terms, cookie/consent handling, and industry-specific compliance where applicable.
- Payment/subscription system.
- Automated tests and monitoring.
- Custom production domain and customer onboarding materials.
