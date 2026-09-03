# Hamdan Chatbot — OpenAI model configuration

The chatbot supports the OpenAI Responses API through the server-side `OPENAI_API_KEY`.

For a cost-sensitive, high-volume production assistant, the current recommended default is `gpt-5.6-luna`. The model can still be overridden with the `OPENAI_MODEL` environment variable.

Keep `OPENAI_API_KEY` server-side only. Never expose it in browser code, `NEXT_PUBLIC_*` variables, GitHub, or chat messages.
