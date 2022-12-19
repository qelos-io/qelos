import {addEndpoint, getSdk} from '@qelos/plugin-play'

addEndpoint('/api/example', {
  method: 'GET',
  async handler(req) {
    return {
      user: req.user,
      tenant: req.tenantPayload,
      blocks: await getSdk().blocks.getAll()
    };
  }
})
