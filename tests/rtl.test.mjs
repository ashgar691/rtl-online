import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanText, directionFor, plainClipboardText, countText} from '../dist/rtl.js';

test('Hebrew mixed with English, amounts and links keeps logical order',()=>{
  const input='שלום Project Atlas, התקציב 12,500 ₪. hello@example.com\nhttps://example.com/a?q=1';
  assert.equal(cleanText(input),input);
  assert.equal(cleanText(plainClipboardText(input)),input);
});
test('stale bidi overrides are removed without losing text or punctuation',()=>{
  assert.equal(cleanText('\u202eשלום\u202c \u2066English\u2069\u200f!'),'שלום English!');
});
test('paragraphs, tabs and meaningful spaces survive newline normalization',()=>{
  assert.equal(cleanText('  שלום\r\n\r\n\tEnglish  \rסוף'),'  שלום\n\n\tEnglish  \nסוף');
});
test('smart direction keeps English and source code readable',()=>{
  assert.equal(directionFor('שלום Google Meet'),'rtl');
  assert.equal(directionFor('Project Atlas version 2.5'),'ltr');
  assert.equal(directionFor('مرحبا بالعالم'),'rtl');
  assert.equal(directionFor('English','full'),'rtl');
});
test('plain clipboard isolates URLs, English phrases and numbers',()=>{
  const copied=plainClipboardText('פגישה עם Project Atlas ב־10:30: https://example.com');
  assert.ok(copied.startsWith('\u200f'));
  assert.ok(copied.includes('\u2066Project Atlas\u2069'));
  assert.ok(copied.includes('\u2066https://example.com\u2069'));
});
test('sentence punctuation stays in its paragraph direction outside LTR isolates',()=>{
  const text='בשעה 10:30. באתר (https://example.com).';
  const copied=plainClipboardText(text);
  assert.ok(copied.includes('\u206610:30\u2069.'));
  assert.ok(copied.includes('\u2066https://example.com\u2069).'));
  assert.equal(cleanText(copied),text);
});
test('clipboard keeps code lines LTR even with Hebrew string literals',()=>{
  const text='דוגמה\n```js\nconst text = "שלום";\n```\nסיום';
  const copied=plainClipboardText(text);
  assert.ok(copied.includes('\u200econst text = "שלום";'));
  assert.equal(cleanText(copied),text);
});
test('emoji, niqqud, numbered lists, bold and unsafe HTML remain text',()=>{
  const text='# כּוֹתֶרֶת 👋\n\n3. **English** וגם עברית\n<img src=x onerror=alert(1)>\n<script>alert(1)</script>';
  assert.equal(cleanText(plainClipboardText(text)),text);
});
test('Unicode characters and whitespace-only text have sensible counts',()=>{
  assert.deepEqual(countText('שלום 👋'),{characters:6,words:2});
  assert.deepEqual(countText(' \n\t'),{characters:3,words:0});
});
test('long mixed text retains every character after clipboard normalization',()=>{
  const input='שלום English 123 ₪\n'.repeat(5000);
  assert.equal(cleanText(plainClipboardText(input)),input);
});
