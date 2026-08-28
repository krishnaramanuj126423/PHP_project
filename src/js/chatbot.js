/* AI Cafe Chatbot Controller */
import { API } from './api.js';

export const Chatbot = {
  isOpen: false,

  init() {
    this.bindEvents();
  },

  toggle() {
    const containerEl = document.getElementById('chatbot-widget-container');
    if (containerEl) {
      this.isOpen = !this.isOpen;
      containerEl.classList.toggle('open', this.isOpen);
    }
  },

  async sendMessage(customText = null) {
    const inputEl = document.getElementById('chatbot-input-field');
    const msgArea = document.getElementById('chatbot-messages-area');

    const text = customText || (inputEl ? inputEl.value.trim() : '');
    if (!text) return;

    if (inputEl && !customText) inputEl.value = '';

    // Append user message
    this.appendMessage(text, 'user');

    // Append typing indicator
    const typingId = 'typing_' + Date.now();
    const typingBubble = document.createElement('div');
    typingBubble.id = typingId;
    typingBubble.className = 'chat-bubble bot text-stone-400 italic text-xs';
    typingBubble.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Antiquity AI is thinking...`;
    msgArea.appendChild(typingBubble);
    msgArea.scrollTop = msgArea.scrollHeight;

    try {
      const res = await API.sendChatMessage(text);
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      this.appendMessage(res.reply || "I am glad to assist you with our artisanal cafe offerings!", 'bot');
    } catch (err) {
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      this.appendMessage("I apologize, I'm currently adjusting my coffee grinder! Please ask again in a moment.", 'bot');
    }
  },

  appendMessage(text, sender) {
    const msgArea = document.getElementById('chatbot-messages-area');
    if (!msgArea) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;
    msgArea.appendChild(bubble);
    msgArea.scrollTop = msgArea.scrollHeight;
  },

  bindEvents() {
    const triggerBtn = document.getElementById('chatbot-trigger-btn');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => this.toggle());
    }

    const closeBtn = document.getElementById('chatbot-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.toggle());
    }

    const sendBtn = document.getElementById('chatbot-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }

    const inputEl = document.getElementById('chatbot-input-field');
    if (inputEl) {
      inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }

    // Quick suggestion chips
    document.querySelectorAll('.chatbot-quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.dataset.prompt || chip.textContent.trim();
        this.sendMessage(text);
      });
    });
  }
};

window.Chatbot = Chatbot;
