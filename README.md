# RTL Studio

A Hebrew, ChatGPT-inspired workspace for readable right-to-left text. It runs entirely in the browser and needs no API key or build step.

Run `npm start` and open http://127.0.0.1:4173. Run `npm test` for direction and text-preservation checks. Deploy the `dist` directory with any static host; the Sites configuration lives in `.openai/hosting.json`.

Paste text and press the convert button or Ctrl/Cmd+Enter. The smart mode keeps Hebrew paragraphs RTL, English-only paragraphs and fenced code LTR, and isolates Latin text, links, and numbers. Full RTL mode gives all non-code paragraphs an RTL base direction. The source is never reversed, translated, or sent to a processing server. Existing directional control characters are removed before rendering.

Supports Markdown headings, bold text, lists, block quotes, inline code, and fenced code. Output is created through DOM text nodes, never by treating input as HTML. Copy includes rich HTML and a plain-text version with Unicode direction marks. Rendering in another app depends on that app's bidirectional text support. Download produces a self-contained HTML document.

Up to 20 recent texts and the theme preference are stored in localStorage on this browser. Clear history using the sidebar trash button. Google Fonts is used for typography; the system font is the fallback. The application itself never transmits entered text.
