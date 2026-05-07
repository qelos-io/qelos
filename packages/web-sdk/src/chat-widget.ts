export interface QelosChatWidgetOptions {
  /** Qelos AI agent (integration) ID to chat with */
  agentId: string;
  /** Base URL of the Qelos instance, e.g. "https://my.qelos.io" */
  appUrl: string;
  /** Public API token used as `x-api-key` (qelos_pk_...) */
  apiToken?: string;
  /** Bearer access token for end-user-bound chats */
  accessToken?: string;
  /** Where to dock the launcher: "bottom-right" (default), "bottom-left", "top-right", "top-left" */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Color theme for the widget */
  theme?: 'light' | 'dark';
  /** First assistant message shown when the chat panel opens */
  initialMessage?: string;
  /** Header text inside the chat panel */
  headerText?: string;
  /** Placeholder text in the input box */
  inputPlaceholder?: string;
  /** Persist conversation state on the backend with a thread */
  recordThread?: boolean;
  /** Existing thread ID to resume */
  threadId?: string;
  /** Container to mount into. Defaults to `document.body`. */
  container?: HTMLElement;
  /** Open the panel automatically on load */
  autoOpen?: boolean;
  /** Brand accent color override (CSS color) */
  accentColor?: string;
  /** Optional context object sent with every chat request */
  chatContext?: Record<string, string | number | boolean | undefined | null>;
}

interface InternalMessage {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const POSITION_STYLES: Record<NonNullable<QelosChatWidgetOptions['position']>, string> = {
  'bottom-right': 'inset-block-end:24px;inset-inline-end:24px;',
  'bottom-left': 'inset-block-end:24px;inset-inline-start:24px;',
  'top-right': 'inset-block-start:24px;inset-inline-end:24px;',
  'top-left': 'inset-block-start:24px;inset-inline-start:24px;',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineMarkdown(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

export class QelosChatWidget {
  private options: Required<Pick<QelosChatWidgetOptions,
    'position' | 'theme' | 'headerText' | 'inputPlaceholder' | 'autoOpen' | 'recordThread'
  >> & QelosChatWidgetOptions;

  private host: HTMLElement;
  private shadow: ShadowRoot;
  private launcher!: HTMLButtonElement;
  private panel!: HTMLDivElement;
  private messagesEl!: HTMLDivElement;
  private inputEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;
  private statusEl!: HTMLDivElement;

  private messages: InternalMessage[] = [];
  private threadId?: string;
  private isOpen = false;
  private isSending = false;
  private destroyed = false;

  constructor(options: QelosChatWidgetOptions) {
    if (!options || !options.agentId || !options.appUrl) {
      throw new Error('QelosChatWidget: "agentId" and "appUrl" are required.');
    }
    if (!options.apiToken && !options.accessToken) {
      throw new Error('QelosChatWidget: provide either "apiToken" or "accessToken".');
    }

    this.options = {
      position: 'bottom-right',
      theme: 'light',
      headerText: 'AI Assistant',
      inputPlaceholder: 'Type your message…',
      autoOpen: false,
      recordThread: false,
      ...options,
    };
    this.threadId = this.options.threadId;

    this.host = document.createElement('div');
    this.host.setAttribute('data-qelos-chat-widget', '');
    this.shadow = this.host.attachShadow({ mode: 'open' });

    (this.options.container || document.body).appendChild(this.host);

    this.render();
    this.bindEvents();

    if (this.options.initialMessage) {
      this.messages.push({ role: 'assistant', content: this.options.initialMessage });
      this.renderMessages();
    }

    if (this.options.autoOpen) {
      this.open();
    }
  }

  /** Static helper for the documented `QelosChatWidget.init({...})` pattern. */
  static init(options: QelosChatWidgetOptions): QelosChatWidget {
    return new QelosChatWidget(options);
  }

  open(): void {
    if (this.destroyed) return;
    this.isOpen = true;
    this.panel.setAttribute('data-open', 'true');
    this.launcher.setAttribute('aria-expanded', 'true');
    setTimeout(() => this.inputEl.focus(), 50);
  }

  close(): void {
    if (this.destroyed) return;
    this.isOpen = false;
    this.panel.removeAttribute('data-open');
    this.launcher.setAttribute('aria-expanded', 'false');
  }

  toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  destroy(): void {
    this.destroyed = true;
    this.host.remove();
  }

  private render(): void {
    const { position, theme, headerText, inputPlaceholder, accentColor } = this.options;
    const accent = accentColor || '#409eff';
    const positionStyle = POSITION_STYLES[position];

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      .root {
        position: fixed;
        ${positionStyle}
        z-index: 2147483000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        --ql-accent: ${accent};
        --ql-bg: ${theme === 'dark' ? '#1f2230' : '#ffffff'};
        --ql-bg-soft: ${theme === 'dark' ? '#272a3a' : '#f6f8fb'};
        --ql-text: ${theme === 'dark' ? '#e6e8f1' : '#0f172a'};
        --ql-text-soft: ${theme === 'dark' ? '#9aa1bd' : '#5a6478'};
        --ql-border: ${theme === 'dark' ? '#34384d' : 'rgba(15,23,42,0.08)'};
        --ql-user-bg: ${theme === 'dark' ? '#3a4063' : 'rgba(64,158,255,0.12)'};
        --ql-assistant-bg: ${theme === 'dark' ? '#272a3a' : '#ffffff'};
      }
      button { font: inherit; cursor: pointer; }
      .launcher {
        width: 56px; height: 56px;
        border-radius: 50%;
        border: none;
        background: var(--ql-accent);
        color: #fff;
        box-shadow: 0 10px 28px rgba(15,23,42,0.22);
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }
      .launcher:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(15,23,42,0.28); }
      .launcher:active { transform: translateY(0); }
      .launcher svg { width: 26px; height: 26px; }
      .panel {
        position: absolute;
        ${position.includes('bottom') ? 'inset-block-end: 72px;' : 'inset-block-start: 72px;'}
        ${position.includes('right') ? 'inset-inline-end: 0;' : 'inset-inline-start: 0;'}
        width: min(380px, calc(100vw - 32px));
        height: min(560px, calc(100vh - 120px));
        background: var(--ql-bg);
        color: var(--ql-text);
        border: 1px solid var(--ql-border);
        border-radius: 16px;
        box-shadow: 0 24px 60px rgba(15,23,42,0.22);
        display: none;
        flex-direction: column;
        overflow: hidden;
        transform-origin: ${position.includes('bottom') ? 'bottom' : 'top'} ${position.includes('right') ? 'right' : 'left'};
        animation: pop 0.18s ease;
      }
      .panel[data-open="true"] { display: flex; }
      @keyframes pop {
        from { opacity: 0; transform: scale(0.94); }
        to { opacity: 1; transform: scale(1); }
      }
      header {
        display: flex; align-items: center; gap: 10px;
        padding: 14px 16px;
        background: var(--ql-accent);
        color: #fff;
      }
      header .title { font-weight: 600; font-size: 0.95rem; flex: 1; }
      header button {
        background: transparent; border: none; color: inherit;
        width: 28px; height: 28px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        opacity: 0.85;
      }
      header button:hover { background: rgba(255,255,255,0.18); opacity: 1; }
      .messages {
        flex: 1; overflow-y: auto;
        padding: 14px;
        display: flex; flex-direction: column; gap: 8px;
        background: var(--ql-bg-soft);
      }
      .msg { max-width: 85%; padding: 8px 12px; border-radius: 12px; line-height: 1.45; font-size: 0.92rem; word-wrap: break-word; white-space: pre-wrap; }
      .msg.user { align-self: flex-end; background: var(--ql-user-bg); color: var(--ql-text); border-bottom-right-radius: 4px; }
      .msg.assistant { align-self: flex-start; background: var(--ql-assistant-bg); color: var(--ql-text); border: 1px solid var(--ql-border); border-bottom-left-radius: 4px; }
      .msg code { background: rgba(0,0,0,0.08); padding: 0 4px; border-radius: 3px; font-family: ui-monospace, Menlo, monospace; font-size: 0.85em; }
      .msg pre { background: rgba(0,0,0,0.08); padding: 8px; border-radius: 6px; overflow-x: auto; }
      .msg pre code { background: none; padding: 0; }
      .msg a { color: var(--ql-accent); text-decoration: none; }
      .msg a:hover { text-decoration: underline; }
      .typing { display: inline-flex; gap: 4px; align-items: center; padding: 8px 12px; }
      .typing span { width: 6px; height: 6px; background: var(--ql-text-soft); border-radius: 50%; opacity: 0.4; animation: blink 1.4s infinite; }
      .typing span:nth-child(2) { animation-delay: 0.2s; }
      .typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes blink { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }
      .status { padding: 0 14px; font-size: 0.78rem; color: var(--ql-text-soft); min-height: 18px; }
      .status.error { color: #d24c4c; }
      form {
        display: flex; gap: 8px; padding: 10px 12px;
        border-top: 1px solid var(--ql-border);
        background: var(--ql-bg);
      }
      textarea {
        flex: 1; resize: none; border: 1px solid var(--ql-border); background: var(--ql-bg-soft);
        color: var(--ql-text); border-radius: 10px; padding: 8px 10px;
        font: inherit; font-size: 0.92rem; max-height: 120px; min-height: 38px;
        outline: none;
      }
      textarea:focus { border-color: var(--ql-accent); box-shadow: 0 0 0 2px rgba(64,158,255,0.18); }
      .send {
        background: var(--ql-accent); color: #fff;
        border: none; border-radius: 10px;
        width: 40px; display: flex; align-items: center; justify-content: center;
      }
      .send:disabled { opacity: 0.45; cursor: not-allowed; }
      .send svg { width: 18px; height: 18px; }
    `;

    const root = document.createElement('div');
    root.className = 'root';

    root.innerHTML = `
      <button class="launcher" type="button" aria-label="Open chat" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
      </button>
      <div class="panel" role="dialog" aria-label="Chat">
        <header>
          <div class="title"></div>
          <button type="button" class="close" aria-label="Close chat">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>
        <div class="messages" role="log" aria-live="polite"></div>
        <div class="status"></div>
        <form>
          <textarea rows="1" autocomplete="off"></textarea>
          <button class="send" type="submit" aria-label="Send">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(root);

    this.launcher = root.querySelector('.launcher') as HTMLButtonElement;
    this.panel = root.querySelector('.panel') as HTMLDivElement;
    this.messagesEl = root.querySelector('.messages') as HTMLDivElement;
    this.inputEl = root.querySelector('textarea') as HTMLTextAreaElement;
    this.sendBtn = root.querySelector('.send') as HTMLButtonElement;
    this.statusEl = root.querySelector('.status') as HTMLDivElement;

    (root.querySelector('.title') as HTMLElement).textContent = headerText;
    this.inputEl.placeholder = inputPlaceholder;
  }

  private bindEvents(): void {
    this.launcher.addEventListener('click', () => this.toggle());
    (this.shadow.querySelector('header .close') as HTMLButtonElement).addEventListener('click', () => this.close());

    const form = this.shadow.querySelector('form') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.send();
    });

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.send();
      }
    });

    this.inputEl.addEventListener('input', () => {
      this.inputEl.style.height = 'auto';
      this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 120) + 'px';
    });
  }

  private renderMessages(): void {
    this.messagesEl.innerHTML = '';
    for (const msg of this.messages) {
      const el = document.createElement('div');
      el.className = `msg ${msg.role}`;
      el.innerHTML = renderInlineMarkdown(msg.content);
      this.messagesEl.appendChild(el);
    }
    this.scrollToBottom();
  }

  private appendStreamingChunk(chunk: string): void {
    const last = this.messages[this.messages.length - 1];
    if (!last || last.role !== 'assistant' || !last.streaming) return;
    last.content += chunk;
    const lastEl = this.messagesEl.lastElementChild as HTMLElement | null;
    if (lastEl) {
      lastEl.innerHTML = renderInlineMarkdown(last.content);
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private setStatus(text: string, isError = false): void {
    this.statusEl.textContent = text;
    this.statusEl.classList.toggle('error', isError);
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'text/event-stream',
    };
    if (this.options.apiToken) {
      headers['x-api-key'] = this.options.apiToken;
    } else if (this.options.accessToken) {
      headers.authorization = 'Bearer ' + this.options.accessToken;
    }
    return headers;
  }

  private buildUrl(path: string): string {
    const base = this.options.appUrl.replace(/\/+$/, '');
    return base + path;
  }

  private async ensureThread(): Promise<string | undefined> {
    if (!this.options.recordThread || this.threadId) return this.threadId;
    const headers = this.buildHeaders();
    delete headers.accept;
    const res = await fetch(this.buildUrl('/api/ai/threads'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ integration: this.options.agentId }),
    });
    if (!res.ok) throw new Error(`Failed to create thread: HTTP ${res.status}`);
    const thread = await res.json();
    this.threadId = thread._id;
    return this.threadId;
  }

  private async send(): Promise<void> {
    if (this.destroyed || this.isSending) return;
    const text = this.inputEl.value.trim();
    if (!text) return;

    this.isSending = true;
    this.sendBtn.disabled = true;
    this.inputEl.disabled = true;
    this.inputEl.value = '';
    this.inputEl.style.height = 'auto';
    this.setStatus('');

    this.messages.push({ role: 'user', content: text });
    this.messages.push({ role: 'assistant', content: '', streaming: true });
    this.renderMessages();
    this.setStatus('AI is typing…');

    try {
      const threadId = await this.ensureThread();
      const path = threadId
        ? `/api/ai/${this.options.agentId}/chat-completion/${threadId}?stream=true`
        : `/api/ai/${this.options.agentId}/chat-completion?stream=true`;

      const payload: any = {
        messages: this.messages
          .filter(m => m.role === 'user' || (m.role === 'assistant' && !m.streaming))
          .map(m => ({ role: m.role, content: m.content })),
        stream: true,
      };
      if (this.options.chatContext) payload.context = this.options.chatContext;

      const res = await fetch(this.buildUrl(path), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}: ${res.statusText || 'Request failed'}`);
      }

      await this.consumeStream(res.body);

      const last = this.messages[this.messages.length - 1];
      if (last) last.streaming = false;
      this.setStatus('');
    } catch (err) {
      const last = this.messages[this.messages.length - 1];
      if (last && last.streaming) {
        last.streaming = false;
        if (!last.content) last.content = '_Sorry, I could not get a response. Please try again._';
        this.renderMessages();
      }
      this.setStatus(err instanceof Error ? err.message : 'Something went wrong', true);
    } finally {
      this.isSending = false;
      this.sendBtn.disabled = false;
      this.inputEl.disabled = false;
      this.inputEl.focus();
    }
  }

  private async consumeStream(stream: ReadableStream<Uint8Array>): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') return;
          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }
          this.handleSSEEvent(parsed);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private handleSSEEvent(data: any): void {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'connection_established') return;
    if (data.type === 'continuing_conversation') {
      const last = this.messages[this.messages.length - 1];
      if (last && last.streaming) {
        last.content = '';
        this.renderMessages();
      }
      return;
    }
    if (data.type === 'chunk' || data.type === 'followup_chunk') {
      if (typeof data.content === 'string' && data.content) {
        this.appendStreamingChunk(data.content);
      }
      return;
    }
    if (data.type === 'done') return;
  }
}

export default QelosChatWidget;
