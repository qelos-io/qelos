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

Enjoy!
