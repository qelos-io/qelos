---
title: Plugin Lifecycle
editLink: true
---

# {{ $frontmatter.title }}

Let's say you want to implement something complex, and you need to implement endpoints or change something major about the HTTP server created by the SDK, you can register to plugin lifecycle hooks.

## Basic General Example

```typescript
import {on, LifecycleEvent} from '@qelos/plugin-play';

on(LifecycleEvent.beforeMount, (context) => {
  // whatever you like to know...
});
```

## Existing Events

### Before Create

In this event, the `start()` function is called the configuration is being initialized.

```typescript
import {on, LifecycleEvent, BeforeCreatePayload} from '@qelos/plugin-play';

on(LifecycleEvent.beforeCreate, (context: BeforeCreatePayload) => {
  const { manifest, config, fastifyOptions } = context;
});
```

### Before Configure

This event is right before the plugin initialized its configurations and manifest.
Edit these objects will apply to the plugin's configurations and manifest.

```typescript
import {on, LifecycleEvent, BeforeConfigurePayload} from '@qelos/plugin-play';

on(LifecycleEvent.beforeConfigure, (context: BeforeConfigurePayload) => {
  const { manifest, config, manifestOptions, configOptions } = context;
});
```

### Configured

```typescript
import {on, LifecycleEvent, ConfiguredPayload} from '@qelos/plugin-play';

on(LifecycleEvent.configured, (context: ConfiguredPayload) => {
  const { manifest, config } = context;
});
```

### Before Mount

In this event, the app (FastifyInstance) was created not is not yet listening to port.

```typescript
import {on, LifecycleEvent, BeforeMountPayload} from '@qelos/plugin-play';

on(LifecycleEvent.beforeMount, (context: BeforeMountPayload) => {
  const { app, manifest, config, fastifyOptions } = context;
});
```

### Mounted

In this event, the app (FastifyInstance) is now running and listening to port.

```typescript
import {on, LifecycleEvent, MountedPayload} from '@qelos/plugin-play';

on(LifecycleEvent.mounted, (context: MountedPayload) => {
  const { app, manifest, config, fastifyOptions } = context;
});
```