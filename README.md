# Sentient AI

A starter Next.js website for a personal AI assistant with:
- OpenAI Responses API chat
- Hosted web search
- OpenAI image generation
- Google OAuth connection
- Gmail message search (read-only)
- Google Drive file search (read-only)
- Browser speech input/output
- Basic saved conversation history and saved memory and conversation storage

## Requirements
- Node.js 20+
- An OpenAI API key with access to the selected model/tools
- A Google Cloud project with Gmail API and Drive API enabled
- OAuth 2.0 Web application credentials

## Run locally
1. Copy `.env.example` to `.env`.
2. Fill in `OPENAI_API_KEY`, `APP_SECRET`, and Google OAuth values.
3. In Google Cloud Console, configure the OAuth consent screen and add your account as a test user if the app is in Testing.
4. Add `http://localhost:3000/api/google/callback` as an authorized redirect URI.
5. Run:

   ```bash
   npm install
   npm run dev
   ```

6. Visit http://localhost:3000.

## Google setup
Enable **Gmail API** and **Google Drive API** in the Google Cloud project. Create OAuth credentials for a Web application. Set `OPENAI_MODEL` to a model available to your API account (the starter defaults to `gpt-4.1`). The image route uses `gpt-image-1`.

The app requests:
- `openid`, `email`, `profile`
- `gmail.readonly`
- `drive.readonly`

The OAuth flow stores the refresh token in Netlify Blobs. This demo uses a single shared app record. Do not deploy it as a public multi-user service without adding user authentication, per-user token storage, encryption at rest, CSRF protections, and account isolation.

Google OAuth may require verification before broad public use. Request only the scopes your app needs. Google documents OAuth web-server flows and scope requirements at https://developers.google.com/identity/protocols/oauth2/web-server.

## Important implementation notes
- Chat requests use the OpenAI Responses API with the `web_search` tool.
- Image requests use the Responses API `image_generation` tool. Model/tool availability depends on your API account.
- Voice uses browser speech recognition and speech synthesis for a simple first version. Browser support varies. For low-latency natural voice conversations, add OpenAI Realtime API with a server-minted ephemeral client token and WebRTC.
- Gmail and Drive routes are read-only. No email is sent, deleted, or modified.
- The memory table is included and loaded into the system instructions. This starter does not automatically infer or save new memories yet; add an explicit “remember this” action and user approval before persisting facts.
- The chat endpoint stores conversation turns, but this local prototype does not yet have sign-in or per-user isolation.

## Before production
1. Add authentication (for example Auth.js) and authorize every API route.
2. Keep Netlify Blobs enabled for persistent serverless app storage; use a relational database only if you later need multi-user transactional data.
3. Encrypt Google refresh tokens at rest using a managed key.
4. Add rate limiting, request size limits, abuse monitoring, and usage budgets.
5. Add account deletion, Google disconnect/revocation, and data export.
6. Add Google OAuth verification if distributing to users.
7. Add per-user memory controls and retention limits.
8. Add explicit confirmation screens for any future write actions such as sending email or editing Drive files.

## Official docs
- OpenAI Responses API: https://developers.openai.com/api/docs/guides/text
- OpenAI web search: https://developers.openai.com/api/docs/guides/tools-web-search
- OpenAI image generation: https://developers.openai.com/api/docs/guides/tools-image-generation
- OpenAI Realtime: https://developers.openai.com/api/docs/guides/realtime
- Google OAuth: https://developers.google.com/identity/protocols/oauth2/web-server
- Gmail API: https://developers.google.com/workspace/gmail/api
- Drive API: https://developers.google.com/workspace/drive/api


## Deploy to Netlify
1. Push this project to a private GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project** and connect that repository.
3. Netlify should detect Next.js. The included `netlify.toml` sets `npm run build` and `.next`; Netlify's managed Next.js adapter handles API route handlers and server rendering.
4. In **Site configuration → Environment variables**, add `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENROUTER_API_KEY`, `APP_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`. Add `FORGEGUI_API_KEY` if you want to enable Game Studio asset generation.
5. Set `GOOGLE_REDIRECT_URI` to `https://YOUR-SITE.netlify.app/api/google/callback`, and add that exact URL to the Authorized redirect URIs for your Google OAuth web client.
6. Run a new deploy after changing environment variables. Do not prefix secrets with `NEXT_PUBLIC_`.
7. Netlify Blobs is provisioned automatically for deployed Netlify Functions. No `DATABASE_URL`, Prisma setup, or separate database credentials are required.

**Security warning:** This starter is a single-user prototype and does not include user sign-in or per-user isolation. Do not publish it as an open public AI service or connect personal Google accounts until authentication, authorization, token encryption, and rate limiting are added.


## Multiple model providers and languages
Sentient AI can route requests to different providers through OpenRouter's OpenAI-compatible API. Add `OPENROUTER_API_KEY` to your local `.env` and Netlify environment variables. The UI currently offers a starter set of model IDs for OpenAI, Anthropic Claude, Google Gemini, and DeepSeek. Provider/model availability and pricing can change; check your OpenRouter account's model catalogue and update the `explicitModels` map in `app/api/chat/route.ts` and the model dropdown to match the exact model IDs you want.

The assistant is instructed to respond in the user's language. This does not mean every model supports every language equally; multilingual ability and quality depend on the selected model.

Automatic mode uses the Sentient Brain router: ordinary and research questions use the direct OpenAI Responses API (research mode enables web search), while other task types may use OpenRouter-selected providers. Alternate provider options use OpenRouter chat completions and do not automatically inherit OpenAI web-search or image-generation tools. Gmail and Drive remain separate Google OAuth integrations. Model access is subject to each provider's terms, API access, rate limits, and billing. This app does not merge model weights or create one model containing the proprietary internals of ChatGPT, Claude, Gemini, and DeepSeek; it routes requests to the selected provider.


## Smarter assistant behavior and memory

The chat system prompt now gives Sentient a consistent conversational style, multilingual behavior, stronger uncertainty handling, answer-checking guidance, and clear rules against pretending to be conscious or claiming tools were used when they were not.

The Memory panel lets the current app user add and delete saved facts/preferences. Those entries are supplied to the assistant on later chat requests. This is a basic shared-storage prototype: **do not expose it as a public multi-user service yet**. Before public launch, add authentication, user-scoped memory queries, encrypted Google tokens, rate limits, and privacy controls. The current memory API is not user-isolated.


## Sentient Brain and expanded workspaces

The project now includes a lightweight **Sentient Brain orchestration layer**. It classifies common requests into general, research, coding, game, creative, and planning modes, then routes automatic requests to a configured model provider:
- Coding tasks → DeepSeek
- Game and creative tasks → Gemini
- Planning / complex analysis → Claude
- General and research tasks → OpenAI (research mode enables the OpenAI web-search tool)

This is an application-level orchestrator, not a newly trained foundation model, independent consciousness, or a merger of model weights. The selected provider still performs the language-model inference. The automatic routing rules are in `lib/brain.ts` and can be customized.

The UI includes General AI, Research, Coding Studio, Game Studio, Creative Studio, and Project Planner workspaces. It retains the memory panel, browser speech input/output, Google connection, and OpenAI image generation. The planner helps structure work; it does not yet run arbitrary long-lived jobs or operate a user's computer by itself.

## ForgeGUI Game Studio integration

Game Studio can submit real asset-generation tasks to ForgeGUI and poll their status. It supports ForgeGUI's documented generation types:
- 3D model (GLB), thumbnail, GUI artwork, avatar concept, icon, clothing templates, R15 animation (RBXMX), music, and sound effects.

To enable it:
1. Create an API key in your ForgeGUI dashboard and choose the intended workspace.
2. Add `FORGEGUI_API_KEY` to Netlify environment variables (or local `.env`).
3. Redeploy the site.
4. Open **Game Studio**, enter an asset description in the ForgeGUI asset prompt field, choose an asset type and optional maximum credit ceiling, then select **Generate with ForgeGUI**.
5. Wait for the task to finish, then preview available images and download the returned files.

ForgeGUI tasks use the credits and eligibility of the workspace tied to the API key. A request being accepted is not the same as generation being complete. Sentient polls task status and proxies file downloads through its server so the API key is never sent to the browser. ForgeGUI's GUI/avatar outputs are images, not interactive interfaces or rigged characters; 3D models are delivered as GLB files and animations as RBXMX for review/import into Roblox Studio. Review generated assets before publishing.

Official documentation: https://forgegui.net/forgegui-api-docs

## Sentient-side hourly model limits

The backend enforces separate request caps per provider, reset at the beginning of each UTC clock hour:
- OpenAI: 1,000 requests/hour
- Claude: 1,000 requests/hour
- Gemini: 910 requests/hour
- DeepSeek: 1,000 requests/hour

The counters are stored in Netlify Blobs using strongly consistent reads and conditional writes, and shown in the Model usage panel. These are Sentient application limits, not provider quotas, token limits, or billing limits. Provider billing, rate limits, and credit restrictions still apply. The limit is currently global to this single-user prototype; it is not per account until authentication and per-user accounting are added.

When automatic routing hits a provider's Sentient-side cap, the router attempts an alternate configured OpenRouter provider. Explicitly selected models do not silently switch.

## Mobile installation

The app includes a web app manifest, Android/iOS app icons, Apple web-app metadata, and safe-area responsive styling. Opening a normal browser tab cannot be forced into fullscreen. Install the site from the browser menu (Android Chrome: Install app/Add to Home screen; iPhone Safari: Share → Add to Home Screen) and launch it from the home-screen icon to use standalone display where supported.

## Current capability boundaries

This is an expanded starter project, not a finished autonomous platform. The following still require separate engineering or credentials:
- User authentication, per-user memory isolation, secure account management, and encryption of Google refresh tokens are not yet implemented. Keep this as a private prototype until they are.
- Background jobs, scheduled automations, and durable multi-step agent execution need a worker/queue and scheduler; Netlify request handlers are not a persistent agent runtime.
- Full live/interruptible voice uses a Realtime/WebRTC integration; the current voice feature is browser speech recognition and speech synthesis.
- Image understanding is available for uploaded PNG, JPEG, and WebP images (up to 3 MB); automatic mode routes image questions to Gemini through OpenRouter. Video understanding is not implemented. Image generation is available through the existing OpenAI image route.
- Coding Studio generates code and guidance in chat; it does not yet execute arbitrary code in a secure sandbox or deploy projects.
- Game Studio creates ForgeGUI assets and helps with design/scripts; it does not automatically assemble and publish a complete Roblox experience.
- Google integration remains read-only Gmail and Drive in this starter.

This version no longer uses Prisma or requires PostgreSQL. Persistent app data is stored with Netlify Blobs.


## Sentient usage tracking, custom limits, and automatic fallback

Sentient records each provider attempt in Netlify Blobs and enforces its own hourly request caps independently of the AI service's limits. Counters use the UTC clock hour and naturally reset at the start of each new hour. The usage panel reports Sentient-side usage and reset time.

In automatic mode, if a provider reaches Sentient's own cap, Sentient tries another configured provider with remaining Sentient capacity. If the selected AI service responds with a rate-limit, quota, temporary-capacity, or credit/payment error, Sentient also attempts another configured provider (provided its own Sentient-side cap has not been reached). Explicitly selected models do not silently switch.

Important: Sentient cannot override a model provider's server-side quotas, billing, free-tier restrictions, or availability. Automatic fallback can only work when the alternate provider is actually configured and reachable. In this starter, Claude, Gemini, and DeepSeek fallback models are routed through OpenRouter and therefore require a valid `OPENROUTER_API_KEY`; direct OpenAI auto mode requires `OPENAI_API_KEY`. These app-side limits are request counts, not token limits, and currently apply globally to this single-user prototype.


## Netlify-native persistent storage (no PostgreSQL setup)

This version uses **Netlify Blobs** for saved memories, recent conversation turns, Google OAuth tokens, and Sentient's hourly usage counters. Netlify supplies the Blobs connection context to deployed Functions automatically. You do not need to create a PostgreSQL database, set `DATABASE_URL`, run Prisma commands, or create a separate storage API key.

Deploy the site to Netlify and the server routes use the site's persistent Blobs store. Data is site-wide and persists across deploys. This starter remains a single-user/private prototype: the saved Google connection and memory store are shared by anyone who can access the app, so do not make it public or connect personal Google data until authentication and per-user isolation are added.

For local development, use the Netlify CLI (`npx netlify dev`) linked to your Netlify site so the local server can access the site's Blobs store. A plain `next dev` session does not automatically have Netlify's storage credentials.

Netlify Blobs is key-value storage, not a relational database. The code uses strong consistency and conditional writes for simple update coordination; it is suitable for this single-user prototype, not a high-volume multi-user billing or quota system. For production multi-user accounts and strict financial-grade quota enforcement, use a transactional database and authentication.


## Netlify Blobs runtime fix

The storage layer no longer checks `NETLIFY` or `NETLIFY_SITE_ID` before opening Blobs. Those environment flags are not a dependable test for every Next.js runtime adapter and could incorrectly block a deployed request. Netlify Blobs automatically receives its site ID and access token inside Netlify Functions. The Netlify Next.js adapter is explicitly enabled in `netlify.toml`.

After replacing the project, trigger a fresh Netlify deploy (not just a browser refresh). If Blobs still reports missing context, check that the deployment is using the Next.js adapter and that the API route is running as a Netlify Function.
