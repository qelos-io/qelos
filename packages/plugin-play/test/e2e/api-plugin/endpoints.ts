import { start, addProxyEndpoint, getSdkForTenant, getSdk } from '../../../src/index.ts'

addProxyEndpoint('example', {
  method: 'GET',
  handler: () => {
    return {
      yo: Math.random()
    }
  }
})

addProxyEndpoint('tenant-payload', {
  method: 'GET',
  handler: async (req) => {
    return req.tenantPayload;

  }
})

addProxyEndpoint('req-user', {
  method: 'GET',
  handler: async (req) => {
    return req.user;
  }
})


addProxyEndpoint('plugin-sdk', {
  method: 'GET',
  handler: async (req) => {
    const sdk = await getSdk();
    return sdk.authentication.getLoggedInUser();
  }
})

addProxyEndpoint('tenant-sdk', {
  method: 'GET',
  handler: async (req) => {
    const sdk = await getSdkForTenant(req.tenantPayload);
    return sdk.authentication.getLoggedInUser();
  }
})

addProxyEndpoint('workspace', {
  method: 'GET',
  handler: async (req) => {
    return req.user?.workspace;

  }
});