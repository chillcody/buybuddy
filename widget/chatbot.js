(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────────────────
  // Change this to your deployed server URL once hosted
  var API_URL = 'http://localhost:3000/api/chat';
  var BOT_NAME = 'BuyBuddy';
  var WELCOME_MSG = 'Hi! I\'m BuyBuddy, your shopping assistant. Ask me about products, check an order, or anything else I can help with!';

  // ── State ──────────────────────────────────────────────────────────────────
  var conversationId = null;
  var isOpen = false;
  var isLoading = false;

  // ── Styles ─────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#bb-bubble{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;',
    'background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;cursor:pointer;',
    'display:flex;align-items:center;justify-content:center;z-index:99998;',
    'box-shadow:0 4px 16px rgba(37,99,235,.45);transition:transform .2s,box-shadow .2s;}',
    '#bb-bubble:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(37,99,235,.55);}',
    '#bb-bubble svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '#bb-badge{position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#EF4444;',
    'border-radius:50%;border:2px solid #fff;display:none;}',
    '#bb-panel{position:fixed;bottom:90px;right:24px;width:380px;height:540px;',
    'display:none;flex-direction:column;z-index:99999;border-radius:20px;overflow:hidden;',
    'background:#fff;box-shadow:0 12px 40px rgba(0,0,0,.18);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
    '@media(max-width:440px){#bb-panel{width:calc(100vw - 16px);right:8px;bottom:80px;height:70vh;}}',
    '#bb-header{background:linear-gradient(135deg,#2563EB,#7C3AED);padding:16px 18px;',
    'display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}',
    '#bb-header-info{display:flex;align-items:center;gap:10px;}',
    '#bb-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.25);',
    'display:flex;align-items:center;justify-content:center;font-size:18px;}',
    '#bb-name{color:#fff;font-weight:700;font-size:15px;}',
    '#bb-status{color:rgba(255,255,255,.8);font-size:11px;margin-top:1px;}',
    '#bb-close{background:none;border:none;color:rgba(255,255,255,.8);cursor:pointer;',
    'padding:4px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:color .15s;}',
    '#bb-close:hover{color:#fff;}',
    '#bb-close svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;}',
    '#bb-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}',
    '#bb-msgs::-webkit-scrollbar{width:4px;}',
    '#bb-msgs::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px;}',
    '.bb-msg{display:flex;gap:8px;max-width:90%;}',
    '.bb-msg.user{align-self:flex-end;flex-direction:row-reverse;}',
    '.bb-msg.bot{align-self:flex-start;}',
    '.bb-msg-avatar{width:30px;height:30px;border-radius:50%;flex-shrink:0;',
    'background:linear-gradient(135deg,#2563EB,#7C3AED);display:flex;align-items:center;',
    'justify-content:center;font-size:14px;color:#fff;font-weight:700;}',
    '.bb-bubble-text{padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;',
    'white-space:pre-wrap;word-break:break-word;}',
    '.bb-msg.user .bb-bubble-text{background:#2563EB;color:#fff;border-bottom-right-radius:4px;}',
    '.bb-msg.bot .bb-bubble-text{background:#F3F4F6;color:#111827;border-bottom-left-radius:4px;}',
    '.bb-msg.bot .bb-bubble-text a{color:#2563EB;text-decoration:underline;}',
    '#bb-typing{display:none;align-self:flex-start;align-items:center;gap:8px;}',
    '#bb-typing .bb-msg-avatar{background:linear-gradient(135deg,#2563EB,#7C3AED);}',
    '.bb-dots{display:flex;gap:4px;padding:10px 14px;background:#F3F4F6;border-radius:16px;border-bottom-left-radius:4px;}',
    '.bb-dot{width:7px;height:7px;border-radius:50%;background:#9CA3AF;animation:bb-bounce .9s infinite;}',
    '.bb-dot:nth-child(2){animation-delay:.15s;}.bb-dot:nth-child(3){animation-delay:.3s;}',
    '@keyframes bb-bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}',
    '#bb-footer{padding:12px 14px;border-top:1px solid #F3F4F6;flex-shrink:0;background:#fff;}',
    '#bb-form{display:flex;gap:8px;align-items:flex-end;}',
    '#bb-input{flex:1;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:24px;',
    'font-size:14px;outline:none;resize:none;max-height:100px;line-height:1.4;',
    'font-family:inherit;transition:border-color .15s;overflow-y:auto;}',
    '#bb-input:focus{border-color:#2563EB;}',
    '#bb-send{width:40px;height:40px;border-radius:50%;background:#2563EB;border:none;',
    'cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;',
    'transition:background .15s,transform .1s;}',
    '#bb-send:hover{background:#1D4ED8;}',
    '#bb-send:active{transform:scale(.93);}',
    '#bb-send:disabled{background:#9CA3AF;cursor:default;transform:none;}',
    '#bb-send svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '#bb-branding{text-align:center;font-size:10px;color:#9CA3AF;margin-top:6px;}',
  ].join('');
  document.head.appendChild(style);

  // ── Bubble button ──────────────────────────────────────────────────────────
  var bubble = document.createElement('div');
  bubble.id = 'bb-bubble';
  bubble.setAttribute('aria-label', 'Open chat');
  bubble.setAttribute('role', 'button');
  bubble.setAttribute('tabindex', '0');
  bubble.innerHTML = [
    '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    '<div id="bb-badge"></div>',
  ].join('');

  // ── Panel ──────────────────────────────────────────────────────────────────
  var panel = document.createElement('div');
  panel.id = 'bb-panel';
  panel.setAttribute('aria-live', 'polite');
  panel.innerHTML = [
    '<div id="bb-header">',
    '  <div id="bb-header-info">',
    '    <div id="bb-avatar">B</div>',
    '    <div><div id="bb-name">' + BOT_NAME + '</div><div id="bb-status">Online &bull; Replies instantly</div></div>',
    '  </div>',
    '  <button id="bb-close" aria-label="Close chat">',
    '    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    '  </button>',
    '</div>',
    '<div id="bb-msgs">',
    '  <div id="bb-typing" class="bb-msg bot">',
    '    <div class="bb-msg-avatar">B</div>',
    '    <div class="bb-dots">',
    '      <div class="bb-dot"></div><div class="bb-dot"></div><div class="bb-dot"></div>',
    '    </div>',
    '  </div>',
    '</div>',
    '<div id="bb-footer">',
    '  <form id="bb-form">',
    '    <textarea id="bb-input" placeholder="Ask me anything..." rows="1" aria-label="Chat message"></textarea>',
    '    <button type="submit" id="bb-send" aria-label="Send">',
    '      <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    '    </button>',
    '  </form>',
    '  <div id="bb-branding">Powered by BuyBuddy AI</div>',
    '</div>',
  ].join('');

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  // ── Refs ───────────────────────────────────────────────────────────────────
  var msgs = document.getElementById('bb-msgs');
  var input = document.getElementById('bb-input');
  var sendBtn = document.getElementById('bb-send');
  var form = document.getElementById('bb-form');
  var typing = document.getElementById('bb-typing');
  var badge = document.getElementById('bb-badge');

  // ── Helpers ────────────────────────────────────────────────────────────────
  function scrollBottom() {
    msgs.scrollTop = msgs.scrollHeight;
  }

  function linkify(text) {
    // Convert markdown-style links [text](url) to anchor tags
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Convert bare URLs
    text = text.replace(/(^|[^"'])(https?:\/\/[^\s<>"']+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    // Bold **text**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    return text;
  }

  function appendMsg(role, text) {
    var wrap = document.createElement('div');
    wrap.className = 'bb-msg ' + role;

    var avatar = document.createElement('div');
    avatar.className = 'bb-msg-avatar';
    avatar.textContent = role === 'bot' ? 'B' : 'You'[0];

    var bubble = document.createElement('div');
    bubble.className = 'bb-bubble-text';
    if (role === 'bot') {
      bubble.innerHTML = linkify(text.replace(/\n/g, '<br>'));
    } else {
      bubble.textContent = text;
    }

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    msgs.insertBefore(wrap, typing);
    scrollBottom();
  }

  function setLoading(on) {
    isLoading = on;
    typing.style.display = on ? 'flex' : 'none';
    sendBtn.disabled = on;
    input.disabled = on;
    if (on) scrollBottom();
  }

  // ── Toggle panel ───────────────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    panel.style.display = 'flex';
    badge.style.display = 'none';
    setTimeout(function () { input.focus(); }, 50);
    if (msgs.children.length === 1) { // only typing indicator
      appendMsg('bot', WELCOME_MSG);
    }
  }

  function closePanel() {
    isOpen = false;
    panel.style.display = 'none';
  }

  bubble.addEventListener('click', function () { isOpen ? closePanel() : openPanel(); });
  bubble.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? closePanel() : openPanel(); } });
  document.getElementById('bb-close').addEventListener('click', closePanel);

  // ── Send message ───────────────────────────────────────────────────────────
  async function sendMessage(text) {
    if (!text || isLoading) return;
    appendMsg('user', text);
    setLoading(true);

    try {
      var res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: conversationId }),
      });

      var data = await res.json();

      if (!res.ok) {
        appendMsg('bot', data.error || 'Something went wrong. Please try again.');
        return;
      }

      conversationId = data.conversationId;
      appendMsg('bot', data.reply);

      if (!isOpen) {
        badge.style.display = 'block';
      }
    } catch (err) {
      appendMsg('bot', 'Could not connect to the assistant. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Form submit ────────────────────────────────────────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';
    sendMessage(text);
  });

  // Auto-grow textarea
  input.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });

  // Send on Enter, newline on Shift+Enter
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

})();
