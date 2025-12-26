---
title: Callback Link Component
editLink: true
---

# {{ $frontmatter.title }}

The CallbackLink component is a utility component that generates callback URLs for plugin integrations. This component is commonly used for OAuth flows and third-party integrations where you need to redirect users through a plugin's callback endpoint.

## Features

- Automatically detects the plugin ID from multiple sources
- Encodes the return URL using base64 for safe URL transmission
- Supports both explicit plugin ID and automatic detection
- Simple anchor tag rendering with customizable content via slots

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `url` | string | Yes | - | The absolute URL to redirect to after the callback is processed. This should include the full path (e.g., "/dashboard", "/settings/profile"). This URL will be base64 encoded for safe transmission. |
| `plugin` | string | No | - | Optional plugin ID. If not provided, the component will attempt to detect the plugin ID from the route meta (existing page's plugin) or API path. |
| `apiPath` | string | No | - | Optional API path for plugin detection. Used when plugin ID is not explicitly provided and the plugin cannot be determined from the route. |

## Plugin ID Detection

The component determines the plugin ID using the following priority order:

1. **Explicit plugin prop** - If provided via the `plugin` prop
2. **Route meta** - Plugin ID from route meta (micro-frontend context)
3. **API path matching** - Plugin ID found by matching API path against loaded plugins

## Usage Examples

> **Important:** All URLs should be absolute paths starting with `/` to ensure proper redirection after the callback.

### Basic Usage with Explicit Plugin ID

```html
<callback-link url="https://the-plugin-url.com/where-to-go" plugin="plugin-id-123">
  Connect to Service
</callback-link>
```

### Automatic Plugin Detection from Route
Will determine the plugin of the existing page

```html
<callback-link url="https://the-plugin-url.com/where-to-go">
  Save Settings
</callback-link>
```

### Using API Path for Plugin Detection

```html
<callback-link url="https://the-plugin-url.com/where-to-go" api-path="my-plugin-api-path">
  Authorize
</callback-link>
```

### Custom Button Styling

```html
<callback-link url="https://the-plugin-url.com/where-to-go" class="btn btn-primary">
  <i class="icon-connect"></i>
  Connect Account
</callback-link>
```

## Use Cases

### OAuth Integration

Perfect for OAuth flows where you need to redirect users to a third-party service.

```html
<callback-link url="https://my-plugin-url.com/oauth/success">
  Open the other app
</callback-link>
```

### Multi-Step Workflows

Great for multi-step workflows that require callback handling:

```html
<callback-link url="https://my-plugin-url.com/second-step">
  Continue to Next Step
</callback-link>
```

## Notes

- This is a client-side component that performs navigation through standard browser anchor tag behavior
- For programmatic navigation, consider using the computed `link` property directly in your Vue components
- The component relies on the plugins store being loaded for automatic plugin detection
- Base64 encoding ensures that special characters in the return URL don't break the callback URL

---

© Velocitech LTD. All rights reserved.
