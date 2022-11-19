const authService = require('@qelos/api-kit').service('AUTH')

function callAuthService (url, options) {
  return authService({
    ...options,
    url,
  })
    .then(axiosRes => axiosRes.data)
}

module.exports = callAuthService
