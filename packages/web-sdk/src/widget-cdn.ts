import { QelosChatWidget, QelosChatWidgetOptions } from './chat-widget';

declare global {
  interface Window {
    QelosChatWidget?: typeof QelosChatWidget;
  }
}

function getCurrentScript(): HTMLScriptElement | null {
  if (document.currentScript && document.currentScript instanceof HTMLScriptElement) {
    return document.currentScript;
  }
  const scripts = document.getElementsByTagName('script');
  for (let i = scripts.length - 1; i >= 0; i--) {
    if (scripts[i].dataset && scripts[i].dataset.agentId) return scripts[i];
  }
  return null;
}

function readOptionsFromScript(script: HTMLScriptElement): QelosChatWidgetOptions | null {
  const ds = script.dataset;
  if (!ds.agentId || !ds.appUrl) return null;
  const opts: QelosChatWidgetOptions = {
    agentId: ds.agentId,
    appUrl: ds.appUrl,
    apiToken: ds.apiToken,
    accessToken: ds.accessToken,
    headerText: ds.headerText,
    initialMessage: ds.initialMessage,
    inputPlaceholder: ds.inputPlaceholder,
    accentColor: ds.accentColor,
    threadId: ds.threadId,
    autoOpen: ds.autoOpen === 'true',
    recordThread: ds.recordThread === 'true',
  };
  if (ds.position) opts.position = ds.position as QelosChatWidgetOptions['position'];
  if (ds.theme) opts.theme = ds.theme as QelosChatWidgetOptions['theme'];
  return opts;
}

function autoInit(): void {
  const script = getCurrentScript();
  if (!script) return;
  const options = readOptionsFromScript(script);
  if (!options) return;
  const start = () => {
    try {
      QelosChatWidget.init(options);
    } catch (err) {
      console.error('[QelosChatWidget]', err);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}

if (typeof window !== 'undefined') {
  window.QelosChatWidget = QelosChatWidget;
  autoInit();
}

export { QelosChatWidget };
export type { QelosChatWidgetOptions } from './chat-widget';
