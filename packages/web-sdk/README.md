# @qelos/web-sdk

A package to manage communication between a Plugin MFE to a QELOS application host.
## Installation

```shell
npm install @qelos/web-sdk
```

## Usage

```typescript
import { authorize, code } from "@qelos/web-sdk";

// authorize your micro-frontend application 
// to recognize the user and tenant of host application:
const { user, tenant } = authorize();


// add the "code" parameter given from this web-sdk
// it's a code created for this specific intercation with the user:
fetch('/api/you-own-api', {
  headers: { code }
})
```

## Embeddable AI Chat Widget

Drop a Qelos AI agent chat into any web page.

### Single script tag (CDN)

```html
<script src="https://cdn.qelos.io/widget.js"
  data-agent-id="665a1b2c3d4e5f6a7b8c9d0e"
  data-app-url="https://my.qelos.io"
  data-api-token="qelos_pk_..."
  data-position="bottom-right"
  data-theme="light"
  data-header-text="Need help?"
  data-initial-message="Hi! How can I help today?">
</script>
```

The CDN bundle (`dist/widget-cdn.js`) reads its configuration from `data-*` attributes on its own `<script>` tag and auto-mounts a chat bubble. It also exposes `window.QelosChatWidget` for programmatic control.

### Programmatic

```typescript
import { QelosChatWidget } from '@qelos/web-sdk';

QelosChatWidget.init({
  agentId: '665a1b2c3d4e5f6a7b8c9d0e',
  appUrl: 'https://my.qelos.io',
  apiToken: 'qelos_pk_...',
  position: 'bottom-right',
  theme: 'light',
  headerText: 'Need help?',
  initialMessage: 'Hi! How can I help today?',
  recordThread: true,
});
```

### Options

| Option | Default | Description |
|---|---|---|
| `agentId` | _required_ | The Qelos AI agent (integration) ID |
| `appUrl` | _required_ | Base URL of the Qelos instance |
| `apiToken` | — | Public API token (`qelos_pk_...`). Provide this **or** `accessToken` |
| `accessToken` | — | Bearer access token for end-user-bound chats |
| `position` | `"bottom-right"` | `"bottom-right"`, `"bottom-left"`, `"top-right"`, `"top-left"` |
| `theme` | `"light"` | `"light"` or `"dark"` |
| `accentColor` | `"#409eff"` | Brand accent color (any CSS color) |
| `headerText` | `"AI Assistant"` | Title shown in the panel header |
| `initialMessage` | — | First assistant message shown when the panel opens |
| `inputPlaceholder` | `"Type your message…"` | Placeholder for the input box |
| `recordThread` | `false` | Persist the conversation as a Qelos thread |
| `threadId` | — | Resume an existing thread |
| `autoOpen` | `false` | Open the panel automatically on load |
| `chatContext` | — | Object sent as `context` in every chat request |
| `container` | `document.body` | Element to mount the widget into |

The widget is rendered inside a Shadow DOM, so it does not pick up or leak host page styles.

Enjoy!
