/**
 * public/js/main.js
 * -------------------------------------------------------
 * Logika sisi klien: toggle menu mobile, show/hide password,
 * dan widget chatbot (FR-6) lewat fetch() ke endpoint
 * /chatbot/:id/messages (routes/chatbot.routes.js).
 * -------------------------------------------------------
 */

// ---------- Menu mobile ----------
(function () {
  const toggle = document.getElementById('nav-toggle');
  const mobile = document.getElementById('nav-mobile');
  const iconOpen = document.getElementById('nav-icon-open');
  const iconClose = document.getElementById('nav-icon-close');
  if (!toggle || !mobile) return;

  toggle.addEventListener('click', function () {
    const isHidden = mobile.classList.toggle('hidden');
    toggle.setAttribute('aria-expanded', String(!isHidden));
    iconOpen.classList.toggle('hidden', !isHidden);
    iconClose.classList.toggle('hidden', isHidden);
  });
})();

// ---------- Show/hide password ----------
(function () {
  document.querySelectorAll('[data-toggle-password]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const input = document.getElementById(btn.dataset.togglePassword);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });
})();

// ---------- Widget chatbot ----------
(function () {
  const widget = document.getElementById('chatbot-widget');
  if (!widget) return; // widget hanya ada di halaman kursus

  const outlineId = widget.dataset.outlineId;
  const toggleBtn = document.getElementById('chatbot-toggle');
  const closeBtn = document.getElementById('chatbot-close');
  const panel = document.getElementById('chatbot-panel');
  const messagesEl = document.getElementById('chatbot-messages');
  const form = document.getElementById('chatbot-form');
  const input = document.getElementById('chatbot-input');

  let historyLoaded = false;

  function appendMessage(role, text) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;

    const bubble = document.createElement('div');
    bubble.className = `max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
      role === 'user' ? 'bg-brand-600 text-white' : 'bg-white border border-ink-900/5 text-ink-800'
    }`;
    bubble.textContent = text;

    wrapper.appendChild(bubble);
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendTyping() {
    const wrapper = document.createElement('div');
    wrapper.id = 'chatbot-typing';
    wrapper.className = 'flex justify-start';
    wrapper.innerHTML =
      '<div class="bg-white border border-ink-900/5 rounded-2xl px-3.5 py-3 typing-dots"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('chatbot-typing');
    if (el) el.remove();
  }

  async function loadHistory() {
    if (historyLoaded) return;
    try {
      const res = await fetch(`/chatbot/${outlineId}/messages`);
      const data = await res.json();
      if (data.success && data.history.length > 0) {
        messagesEl.innerHTML = '';
        data.history.forEach((h) => appendMessage(h.role, h.message));
      }
      historyLoaded = true;
    } catch (err) {
      console.error('Gagal memuat riwayat chatbot:', err);
    }
  }

  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      loadHistory();
      input.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.add('hidden');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    appendMessage('user', message);
    input.value = '';
    input.disabled = true;
    appendTyping();

    try {
      const res = await fetch(`/chatbot/${outlineId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      removeTyping();

      if (data.success) {
        appendMessage('ai', data.answer);
      } else {
        appendMessage('ai', data.message || 'Maaf, terjadi kesalahan. Silakan coba lagi.');
      }
    } catch (err) {
      removeTyping();
      appendMessage('ai', 'Maaf, gagal terhubung ke server. Periksa koneksimu dan coba lagi.');
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
})();
