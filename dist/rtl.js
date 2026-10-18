// Keep text in logical order. Direction belongs to presentation, never string reversal.
export function cleanText(text) {
  return String(text).replace(/\r\n?/g, '\n').replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\u061c]/g, '');
}

export function directionFor(text, mode = 'smart') {
  return mode === 'full' || /[\u0590-\u05ff\u0600-\u06ff]/u.test(text) ? 'rtl' : 'ltr';
}

const inlinePattern = /(`[^`\n]+`)|(https?:\/\/[^\s<>]+|www\.[^\s<>]+|[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})|(\*\*[^*\n]+\*\*)|([A-Za-z][A-Za-z0-9_+#-]*(?:[ \t]+[A-Za-z0-9][A-Za-z0-9_+#-]*)*)|([+-]?\d[\d,.:/%-]*(?:[ \t]?[₪$€£])?)/gu;

function splitPunctuation(token) {
  let core = token.replace(/[.,;:!?،؛]+$/u, '');
  for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
    while (core.endsWith(close) && core.split(close).length > core.split(open).length) core = core.slice(0, -1);
  }
  return [core, token.slice(core.length)];
}

export function appendInline(parent, text, doc = document) {
  let position = 0;
  for (const match of text.matchAll(inlinePattern)) {
    if (match.index > position) parent.append(doc.createTextNode(text.slice(position, match.index)));
    const token = match[0];
    if (match[1]) {
      const code = doc.createElement('code');
      code.dir = directionFor(token);
      code.style.unicodeBidi = 'isolate';
      code.textContent = token.slice(1, -1);
      parent.append(code);
    } else if (match[3]) {
      const strong = doc.createElement('strong');
      appendInline(strong, token.slice(2, -2), doc);
      parent.append(strong);
    } else {
      const [core, punctuation] = splitPunctuation(token);
      const isolate = doc.createElement('bdi');
      isolate.dir = 'ltr';
      isolate.textContent = core;
      parent.append(isolate);
      if (punctuation) parent.append(doc.createTextNode(punctuation));
    }
    position = match.index + token.length;
  }
  if (position < text.length) parent.append(doc.createTextNode(text.slice(position)));
}

export function renderText(input, container, mode = 'smart') {
  const text = cleanText(input);
  const doc = container.ownerDocument;
  container.replaceChildren();
  let list = null;
  let codeLines = null;
  let codeLanguage = '';
  const addBlock = (tag, content) => {
    const element = doc.createElement(tag);
    element.dir = directionFor(content, mode);
    element.style.textAlign = element.dir === 'rtl' ? 'right' : 'left';
    appendInline(element, content, doc);
    container.append(element);
    return element;
  };
  const flushCode = () => {
    const pre = doc.createElement('pre');
    pre.dir = 'ltr';
    pre.style.textAlign = 'left';
    const code = doc.createElement('code');
    if (codeLanguage) code.setAttribute('aria-label', codeLanguage);
    code.textContent = codeLines.join('\n');
    pre.append(code);
    container.append(pre);
    codeLines = null;
  };
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) {
      list = null;
      if (codeLines !== null) flushCode();
      else { codeLines = []; codeLanguage = line.trim().slice(3).trim(); }
      continue;
    }
    if (codeLines !== null) { codeLines.push(line); continue; }
    const bullet = line.match(/^\s*([-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      const ordered = /^\d/.test(bullet[1]);
      const tag = ordered ? 'OL' : 'UL';
      const direction = directionFor(bullet[2], mode);
      if (!list || list.tagName !== tag || list.dir !== direction) {
        list = doc.createElement(tag.toLowerCase());
        list.dir = direction;
        list.style.textAlign = direction === 'rtl' ? 'right' : 'left';
        if (ordered) list.start = parseInt(bullet[1], 10);
        container.append(list);
      }
      const li = doc.createElement('li');
      if (ordered) li.value = parseInt(bullet[1], 10);
      appendInline(li, bullet[2], doc);
      list.append(li);
      continue;
    }
    list = null;
    const heading = line.match(/^\s*(#{1,3})\s+(.*)$/);
    if (heading) addBlock(`h${heading[1].length + 1}`, heading[2]);
    else if (/^>\s?/.test(line)) addBlock('blockquote', line.replace(/^>\s?/, ''));
    else if (!line.trim()) {
      const spacer = doc.createElement('div');
      spacer.style.height = '.65em';
      spacer.setAttribute('aria-hidden', 'true');
      container.append(spacer);
    } else addBlock('p', line);
  }
  if (codeLines !== null) flushCode();
  return text;
}

export function plainClipboardText(input, mode = 'smart') {
  const text = cleanText(input);
  let inCode = false;
  return text.split('\n').map(line => {
    if (/^\s*```/.test(line)) { inCode = !inCode; return '\u200e' + line; }
    if (inCode) return '\u200e' + line;
    if (!line) return line;
    const mark = directionFor(line, mode) === 'rtl' ? '\u200f' : '\u200e';
    // RLM/LRM have broad messaging-client support. Do not add isolate controls,
    // paragraph margins, NBSPs, or other characters that could turn into gaps.
    return mark + line + mark;
  }).join('\n');
}

function escapeHTML(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function clipboardInlineHTML(text) {
  let html = '';
  let position = 0;
  for (const match of text.matchAll(inlinePattern)) {
    html += escapeHTML(text.slice(position, match.index));
    const token = match[0];
    if (match[1]) {
      const direction = directionFor(token);
      html += `<code dir="${direction}" style="direction:${direction};unicode-bidi:embed;font-family:monospace;">${escapeHTML(token.slice(1,-1))}</code>`;
    } else if (match[3]) html += `<b>${clipboardInlineHTML(token.slice(2,-2))}</b>`;
    else {
      const [core, punctuation] = splitPunctuation(token);
      html += `<span dir="ltr" style="direction:ltr;unicode-bidi:embed;">${escapeHTML(core)}</span>${escapeHTML(punctuation)}`;
    }
    position = match.index + token.length;
  }
  return html + escapeHTML(text.slice(position));
}

export function richClipboardHTML(input, mode = 'smart') {
  let inCode = false;
  const lines = cleanText(input).split('\n').map(line => {
    if (/^\s*```/.test(line)) { inCode = !inCode; return ''; }
    const dir = inCode ? 'ltr' : directionFor(line, mode);
    const mark = dir === 'rtl' ? '\u200f' : '\u200e';
    let content = inCode ? escapeHTML(line) : clipboardInlineHTML(line);
    if (!inCode && /^\s*#{1,3}\s+/.test(line)) content = `<b>${clipboardInlineHTML(line.replace(/^\s*#{1,3}\s+/, ''))}</b>`;
    const style = `direction:${dir};text-align:${dir === 'rtl' ? 'right' : 'left'};margin:0;padding:0;line-height:1.45;${inCode ? 'font-family:monospace;white-space:pre-wrap;' : ''}`;
    return `<div dir="${dir}" style="${style}">${line ? mark + content + mark : '<br>'}</div>`;
  });
  // Build clipboard markup independently of the visual preview. Copying its
  // <p> elements and spacer divs imports browser/email paragraph margins.
  return `<div dir="rtl" style="direction:rtl;text-align:right;font-family:Arial,sans-serif;font-size:14px;line-height:1.45;margin:0;padding:0;">${lines.join('')}</div>`;
}

export function countText(text) {
  return {characters: Array.from(text).length, words: text.trim() ? text.trim().split(/\s+/u).length : 0};
}
