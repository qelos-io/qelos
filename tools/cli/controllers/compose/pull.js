const execute = require('../../utils/execute');

module.exports = function () {
	console.log('pull updated images');
	execute('docker-compose -f docker-compose.yml -p qelos pull', { stdio: 'inherit' });
}
