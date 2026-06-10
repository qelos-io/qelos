# Web SDK (@qelos/web-sdk)

Browser SDK for plugin micro-frontends embedded in the Qelos host, plus a drop-in AI chat widget.

## What Developers Can Do

- **Authorize MFE**: Bind plugin to host user/tenant session
- **Communicate with host**: PostMessage bridge for modals, routing, re-auth
- **Embed AI chat**: Shadow DOM widget streaming agent conversations

## Plugin Host Bridge

| Function | Purpose |
|----------|---------|
| `authorize()` | Bind MFE to host user/tenant |
| `unAuthorize()` | Clean up on unload |
| `getCode()` | Read session code for custom API calls |
| `onReAuthorize` / `reAuthorize()` | Handle session refresh |
| `dispatch` / `on` | Host event bus |
| `openModal` / `closeModal` | Host modal control |
| `changeRoute` / `getAvailableRoutes` | Host navigation |

## AI Chat Widget

```typescript
QelosChatWidget.init({
  agentId: '...',
  appUrl: 'https://myapp.qelos.com',
  apiToken: 'qelos_pk_...', // or accessToken
  position: 'bottom-right',
  theme: 'light',
  recordThread: true,
})
```

Also mountable via CDN `<script>` with `data-*` attributes.

## Widget Options

- Position, theme, accent color
- Header text, placeholder, initial message
- Thread persistence (`recordThread`, `threadId`)
- Per-request `chatContext` metadata
- Public API key (`qelos_pk_`) or user bearer token

## Related

- [AI API](../api/ai.md)
- [SDK](PRODUCT.md)
- [Plugins](../frontend/plugins/PRODUCT.md)
