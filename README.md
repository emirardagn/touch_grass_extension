# Touch Grass

> A LinkedIn hype translator powered by your own OpenAI key

You open LinkedIn. You see a post: "Humbled and honored to announce I am thrilled to share that I have been selected..." — and something inside you breaks. **Touch Grass** is for that moment.

Analyze LinkedIn posts and profiles with AI. Cut through corporate jargon, performative humility, and hustle-porn. Get a plain summary, a satirical roast, or a gentle eye-roll — your call.

---

## What It Does

- Works on any LinkedIn **post** or **profile** page
- Extracts visible content from the page, sends it to the **OpenAI API**, and displays the result in the popup
- Every analysis produces a **Grass Score (0–10)**: 0 = genuinely useful content, 10 = this person is LinkedIn

### Built-in Prompt Modes

| Mode | What It Does |
|------|--------------|
| **Spicy Roast** *(default)* | A precision satirist. Roasts the content, not the person. |
| **Summarizer** | Clinical, no-BS summary. Surfaces what is actually being said. |
| **Light Sarcasm** | A friend who still likes you but quietly rolls their eyes. |

You can also add your own custom prompts.

---

## How It Works

```
LinkedIn page
    │
    ▼
Content Script  (extracts visible DOM content)
    │
    ▼
Popup  (content preview + confirmation step)
    │
    ▼
Service Worker  (POST to OpenAI /v1/responses)
    │
    ▼
Popup  (summary + Grass Score displayed)
```

No data goes to any server we control. Requests go directly from your browser to OpenAI using your own API key.

---

## Installation (Development)

**Requirements:** Node.js 18+

```bash
git clone https://github.com/user/touch-grass-extension
cd touch-grass-extension
npm install
npm run build
```

A `dist/` folder will be created. In Chrome, go to `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the `dist/` folder.

Watch mode for development:

```bash
npm run dev
```

TypeScript type checking:

```bash
npm run typecheck
```

---

## Configuration

Click the extension icon and hit **Settings**:

| Setting | Description |
|---------|-------------|
| **OpenAI API Key** | Get one at [platform.openai.com](https://platform.openai.com/api-keys). Stored for the browser session only — cleared when the browser closes. |
| **Model** | Default: `gpt-4o-mini`. Any OpenAI model name works. |
| **Max Output Tokens** | Controls response length. |
| **Interface Language** | TR / EN |
| **Response Language** | Language of the generated summary: TR / EN |
| **Active Prompt** | Which mode to use for analysis |

---

## Privacy

- Your API key is stored in **`chrome.storage.session`** — it is cleared when the browser closes.
- Settings are stored in **`chrome.storage.sync`**, custom prompts in **`chrome.storage.local`**.
- When you trigger an analysis, the visible text of the page is sent to OpenAI. This data is subject to [OpenAI's privacy policy](https://openai.com/policies/privacy-policy).
- No telemetry, no analytics, no third-party servers.

---

## Tech Stack

- **Manifest V3** Chrome Extension
- **TypeScript** (strict mode)
- **esbuild** — zero runtime npm dependencies in the bundle
- **OpenAI `/v1/responses`** endpoint

---

## Why "Touch Grass"?

"Touch grass" is internet slang for "go outside, rejoin reality." It's a reminder aimed at people who have disappeared so deep into LinkedIn that every morning begins with a motivation post, every win is announced in the third person, and every setback becomes a lessons-learned thread. The extension carries the same spirit: take a step back, see it for what it is.
