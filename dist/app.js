import {cleanText, renderText, plainClipboardText, richClipboardHTML, countText} from './rtl.js';

const $ = selector => document.querySelector(selector);
const input = $('#text-input');
const storageKey = 'rtl-studio-history-v1';
let mode = 'smart';
let current = null;
let history = [];
let toastTimer;
const examples = {
  mixed: 'היי לכולם, ברוכים הבאים ל־RTL Studio!\n\nהפגישה הבאה שלנו בנושא Project Atlas תתקיים ביום ראשון, בשעה 10:30.\nאפשר לשלוח שאלות לכתובת hello@example.com או לבקר באתר https://example.com.\n\n**שתי שפות, בלי לאבד את הכיוון.**',
  list: '# הדברים שצריך לזכור\n\n1. פגישת צוות ב־09:30 דרך Google Meet\n2. עדכון גרסה 2.5 של האפליקציה\n3. תקציב לפרויקט: 12,500 ₪\n4. שליחת המסמך לכתובת team@example.com\n\n**רשימת קניות:**\n- קפה ותה לצוות\n- 3 מחברות ו־12 עטים\n- כבל USB-C למסך\n\nהכול מסודר. אפשר להתחיל.',
  paragraph: '# קצת מקום למילים\n\nלפעמים טקסט עובר דרך ארוכה. מעתיקים אותו ממייל, ממסמך או משיחה, ופתאום הכיוון מתבלבל. מילים באנגלית כמו Creative Thinking, מספרים וסימני פיסוק הופכים את הקריאה למאתגרת.\n\nכאן אפשר לתת לטקסט מקום לנשום. הפסקאות נשמרות, העברית חוזרת לימין, והפרטים הקטנים נשארים קריאים.\n\nואפילו קוד מקבל מקום משלו:\n```javascript\nconst message = "שלום, עולם!";\nconsole.log(message);\n```\n\nכי כשהטקסט מסודר, אפשר פשוט להתמקד במה שרצינו להגיד.'
};

function notify(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4200);
}

function updateInput() {
  input.dir = input.value ? 'auto' : 'rtl';
  const count = countText(input.value).characters;
  $('#char-count').textContent = `${count.toLocaleString('he-IL')} תווים`;
  $('#convert-button').disabled = !input.value.trim();
}

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(history)); }
  catch { notify('הטקסט סודר, אבל לא ניתן לשמור היסטוריה בדפדפן הזה.'); }
}

function renderHistory() {
  const list = $('#history-list');
  list.replaceChildren();
  $('#history-empty').hidden = history.length > 0;
  $('#clear-history').hidden = history.length === 0;
  for (const entry of history) {
    const button = document.createElement('button');
    button.className = 'history-item' + (entry.id === current?.id ? ' selected' : '');
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.classList.add('icon');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-message');
    icon.append(use);
    const label = document.createElement('span');
    label.textContent = entry.text.replace(/[#*`\n]/g, ' ').trim().slice(0, 42) || 'טקסט מסודר';
    button.title = label.textContent;
    button.append(icon, label);
    button.addEventListener('click', () => {
      mode = entry.mode === 'full' ? 'full' : 'smart';
      updateMode();
      input.value = entry.text;
      updateInput();
      showResult(entry);
      closeSidebar();
      window.scrollTo({top:0, behavior:'smooth'});
    });
    list.append(button);
  }
}

function showResult(entry) {
  current = entry;
  $('#welcome').hidden = true;
  $('#examples').hidden = true;
  $('#feature-line').hidden = true;
  $('#conversation').hidden = false;
  $('#workspace').classList.add('has-result');
  $('#source-preview').textContent = entry.text;
  renderText(entry.text, $('#result-text'), mode);
  const {characters, words} = countText(entry.text);
  $('#result-stats').textContent = `${words.toLocaleString('he-IL')} מילים · ${characters.toLocaleString('he-IL')} תווים`;
  renderHistory();
}

function convert() {
  const text = cleanText(input.value);
  if (!text.trim()) { notify('מדביקים קצת טקסט ומתחילים.'); input.focus(); return; }
  const previous = history.find(entry => entry.text === text && entry.mode === mode);
  const entry = previous || {id: crypto.randomUUID?.() || String(Date.now()), text, mode};
  history = [entry, ...history.filter(item => item.id !== entry.id)].slice(0, 20);
  persist();
  showResult(entry);
  $('#conversation').scrollIntoView({behavior:'smooth',block:'start'});
  notify('הטקסט מסודר ומוכן להעתקה.');
}

function newDocument() {
  current = null;
  input.value = '';
  updateInput();
  $('#welcome').hidden = false;
  $('#examples').hidden = false;
  $('#feature-line').hidden = false;
  $('#conversation').hidden = true;
  $('#workspace').classList.remove('has-result');
  $('#source-preview').textContent = '';
  $('#result-text').replaceChildren();
  renderHistory();
  closeSidebar();
  input.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'smooth'});
}

function updateMode() {
  $('#mode-label').textContent = mode === 'smart' ? 'RTL חכם' : 'RTL מלא';
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
}

function closeModeMenu() {
  $('#mode-menu').hidden = true;
  $('#mode-toggle').setAttribute('aria-expanded', 'false');
}

function exportedHTML() {
  return current ? richClipboardHTML(current.text, mode) : '';
}

function legacyCopy(text, html) {
  const area = document.createElement(html ? 'div' : 'textarea');
  if (html) {
    area.contentEditable = 'true';
    area.innerHTML = html; // Only our escaped, generated clipboard markup.
  } else area.value = text;
  area.style.cssText = 'position:fixed;opacity:0;inset:0;pointer-events:none;';
  area.dir = 'rtl';
  document.body.append(area);
  if (html) {
    const range = document.createRange();
    range.selectNodeContents(area);
    const selection = window.getSelection();
    selection.removeAllRanges();selection.addRange(range);
  } else area.select();
  const onCopy = event => {
    if (!event.clipboardData) return;
    event.preventDefault();
    event.clipboardData.setData('text/plain', text);
    if (html) event.clipboardData.setData('text/html', html);
  };
  document.addEventListener('copy', onCopy);
  let copied = false;
  try { copied = document.execCommand('copy'); }
  finally { document.removeEventListener('copy', onCopy); area.remove(); }
  return copied;
}

async function copyResult(target = 'gmail') {
  if (!current) return;
  const plain = plainClipboardText(current.text, mode);
  const html = target === 'gmail' ? exportedHTML() : null;
  const button = target === 'gmail' ? $('#copy-result') : $('#copy-whatsapp');
  let copied = html ? legacyCopy(plain, html) : false;
  let copyMethod = copied ? 'copy-event' : '';
  try {
    if (!copied && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      const payload = {'text/plain':new Blob([plain], {type:'text/plain'})};
      if (html) payload['text/html'] = new Blob([html],{type:'text/html'});
      await navigator.clipboard.write([new ClipboardItem(payload)]);
      copied = true;
      copyMethod = 'clipboard-api';
    }
  } catch { /* Text-only copy is useful when rich clipboard permission is unavailable. */ }
  if (!copied) {
    // Keep rich RTL markup in the fallback, too; a text-only fallback silently
    // loses the paragraph direction in Gmail.
    copied = legacyCopy(plain, html);
    if (copied) copyMethod = 'copy-event';
    if (!copied) {
      try { await navigator.clipboard.writeText(plain); copied = true; copyMethod = 'text-api'; }
      catch { /* Offer a visible selection below. */ }
    }
  }
  button.dataset.copyMethod = copyMethod;
  button.dataset.copyFormat = html && copyMethod !== 'text-api' ? 'html' : 'plain';
  if (!copied) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents($('#result-text'));
    selection.removeAllRanges(); selection.addRange(range);
    notify('הדפדפן חסם העתקה. הטקסט מסומן — אפשר להעתיק עם Ctrl+C.');
    return;
  }
  button.querySelector('span').textContent = 'הועתק!';
  button.querySelector('use').setAttribute('href','#i-check');
  notify(target === 'gmail' ? 'הועתק ל־Gmail: כיוון RTL, בלי ריווח נוסף.' : 'הועתק ל־WhatsApp: טקסט נקי עם סימני כיוון RTL.');
  setTimeout(() => {button.querySelector('span').textContent=target==='gmail'?'העתקה ל־Gmail':'העתקה ל־WhatsApp';button.querySelector('use').setAttribute('href','#i-copy');},2200);
}

function closeSidebar() {
  document.body.classList.remove('sidebar-open');
  $('#sidebar-scrim').hidden = true;
  $('#sidebar-toggle').setAttribute('aria-expanded','false');
}

$('#convert-form').addEventListener('submit', event => {event.preventDefault(); convert();});
input.addEventListener('input', updateInput);
input.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {event.preventDefault();convert();}
});
$('#new-document').addEventListener('click', newDocument);
$('#workspace-nav').addEventListener('click', () => {closeSidebar();input.focus();});
$('#edit-source').addEventListener('click', () => {input.focus();input.scrollIntoView({behavior:'smooth',block:'center'});});
document.querySelectorAll('[data-example]').forEach(button => {
  button.addEventListener('click', () => {
    input.value = examples[button.dataset.example];
    updateInput();
    input.focus({preventScroll:true});
    input.scrollIntoView({behavior:'smooth',block:'center'});
    notify('הדוגמה מוכנה. לחצו על ״סידור הטקסט״ כדי לראות את התוצאה.');
  });
});
$('#paste-text').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    input.value = text.slice(0,100000);
    updateInput();
    if (text.length > 100000) notify('הודבקו 100,000 התווים הראשונים. אפשר לפצל טקסט ארוך למספר חלקים.');
    else if (!text) notify('הלוח ריק. מעתיקים טקסט ומנסים שוב.');
    input.focus();
  } catch {
    input.focus();
    notify('אפשר להדביק ישירות בשדה עם Ctrl+V או בלחיצה ארוכה בנייד.');
  }
});
$('#mode-toggle').addEventListener('click', () => {
  const open = $('#mode-menu').hidden;
  $('#mode-menu').hidden = !open;
  $('#mode-toggle').setAttribute('aria-expanded',String(open));
});
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  updateMode();closeModeMenu();
  if (current) { renderText(current.text,$('#result-text'),mode); }
}));
document.addEventListener('click', event => {if (!event.target.closest('.mode-control')) closeModeMenu();});
document.addEventListener('keydown', event => {if(event.key === 'Escape'){closeModeMenu();closeSidebar();}});
$('#copy-result').addEventListener('click',()=>copyResult('gmail'));
$('#copy-whatsapp').addEventListener('click',()=>copyResult('whatsapp'));
$('#download-result').addEventListener('click', () => {
  if (!current) return;
  const html = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>הטקסט המסודר שלי</title></head><body style="max-width:850px;margin:40px auto;padding:20px;">' + exportedHTML() + '</body></html>';
  const url = URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
  const link = document.createElement('a');
  link.href=url;link.download='rtl-studio-text.html';link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  notify('המסמך הורד עם כיוון הטקסט והעיצוב.');
});
$('#clear-history').addEventListener('click', () => {
  history=[];
  try {localStorage.removeItem(storageKey);} catch { /* Browsing can continue without local storage. */ }
  renderHistory();notify('ההיסטוריה המקומית נמחקה.');
});
function setTheme(theme) {
  document.documentElement.dataset.theme=theme;
  const label=theme==='dark'?'מעבר למצב בהיר':'מעבר למצב כהה';
  $('#theme-toggle').setAttribute('aria-label',label);$('#theme-toggle').title=label;
  $('#theme-icon').setAttribute('href',theme==='dark'?'#i-sun':'#i-moon');
  document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#171719':'#faf9fc';
}
$('#theme-toggle').addEventListener('click', () => {
  const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  setTheme(theme);try{localStorage.setItem('rtl-studio-theme',theme);}catch{}
});
$('#sidebar-toggle').addEventListener('click', () => {
  const open=document.body.classList.toggle('sidebar-open');
  $('#sidebar-scrim').hidden=!open;
  $('#sidebar-toggle').setAttribute('aria-expanded',String(open));
});
$('#sidebar-scrim').addEventListener('click',closeSidebar);
$('#help-button').addEventListener('click',()=>$('#help-dialog').showModal());
$('#close-help').addEventListener('click',()=>$('#help-dialog').close());
$('#help-dialog').addEventListener('click',event=>{if(event.target===$('#help-dialog')){const rect=event.target.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)event.target.close();}});
try {
  const stored=JSON.parse(localStorage.getItem(storageKey)||'[]');
  if(Array.isArray(stored))history=stored.filter(entry=>entry&&typeof entry.id==='string'&&typeof entry.text==='string'&&entry.text.length<=100000).slice(0,20);
  const theme=localStorage.getItem('rtl-studio-theme');
  if(theme==='light'||theme==='dark')setTheme(theme);
}catch{}
renderHistory();updateInput();
