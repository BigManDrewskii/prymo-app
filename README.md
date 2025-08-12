# Prompt Enhancer (Groq + Kimi K2)

A tiny Next.js app that enhances your prompts via Groq using the `moonshotai/kimi-k2-instruct` model, and lets you copy the enhanced prompt as Markdown immediately.

## Quickstart
```bash
pnpm i   # or npm i / yarn
cp .env.example .env
# edit .env and set GROQ_API_KEY=...

pnpm dev  # or npm run dev
# visit http://localhost:3000
```

## Notes
- The UI matches the 4-state aesthetic: idle → editing → enhancing → complete.
- The API streams tokens from Groq, and the client streams them into the output area.
- Only requirement: a valid `GROQ_API_KEY` in your `.env`.
