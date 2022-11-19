const execute = require('../../utils/execute');
const {getCommand} = require('../../services/populate');
module.exports = function ({tenant, host}) {
  if (!host) {
    console.log('Host domain is missing, could not populate.');
    return;
  }
  execute(`docker exec qelos_auth_1 sh -c '${getCommand(tenant, host)}'`, {stdio: 'inherit'});
  execute(`docker exec qelos_content_1 sh -c '${getCommand(tenant, host)}'`, {stdio: 'inherit'});
}
