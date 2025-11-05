---
title: Hooks and Events
editLink: true
---

# {{ $frontmatter.title }}

You can use this ability in order to create a backend function that will register to a system hook inside a QELOS app.


## Basic Example
```typescript
import {registerToHook} from '@qelos/plugin-play';

registerToHook({source: 'auth', kind: 'signup', eventName: 'user-registered'}, (req) => {
  const {tenantPayload, user, body} = req;
})
```

## List of existing events

| source | kind                     | eventName                    |
|--------|--------------------------|------------------------------|
| auth   | signup                   | user-registered              |
| auth   | users                    | user-created                 |
| auth   | users                    | user-updated                 |
| auth   | users                    | user-removed                 |
| auth   | failed-social-login      | failed-linkedin-login        |
| auth   | failed-social-login      | failed-facebook-login        |
| auth   | failed-social-login      | failed-google-login          |
| auth   | failed-social-login      | failed-twitter-login         |
| assets | asset-operation          | asset-uploaded               |
| assets | storage-connection-error | s3-connection-error          |
| assets | storage-connection-error | gcs-connection-error         |
| assets | storage-connection-error | ftp-connection-error         |
| assets | storage-connection-error | cloudinary-connection-error  |

## Custom Plugins' events

Any plugin can dispatch custom events using the SDK / API of qelos.

```typescript
import { getSdk } from '@qelos/plugin-play'

getSdk().events.dispatch({
  user: '111',
  source: 'my-plugin',
  kind: 'my-type',
  eventName: 'thing-changed',
  metadata: {
    customData: 1
  }
})
```

Notice that every event dispatched from a custom plugin will have a prefix to the `source` property of `plugin:`.
In order to register to the event in the above example, you'll have to register it like:

```typescript
import {registerToHook} from '@qelos/plugin-play';

registerToHook({source: 'plugin:my-plugin', kind: '*', eventName: '*'}, (req) => {
  const {tenantPayload} = req;
  
  const {user, source, kind, eventName, metadata} = req.body;
  
  if (user === '111' && metadata.customData === 1 && eventName === 'thing-changed') {
    console.log('you reached the good place.');
  }
})
```

As you can see, you can register to broad events using the `*` instead of a specific event name.