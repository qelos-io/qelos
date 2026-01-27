---
title: Modals
---
# Modals

Documentation coming soon.

The Web SDK allows you to open and close modals in the host Qelos application.

## Opening a Modal

```typescript
import { openModal } from '@qelos/web-sdk';

openModal('modalName', { props: 'value' });
```

## Closing a Modal

```typescript
import { closeModal } from '@qelos/web-sdk';

closeModal('modalName');
```
