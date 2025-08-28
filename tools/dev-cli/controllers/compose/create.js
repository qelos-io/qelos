const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const execute = require('../../utils/execute');
const { getRandomHash } = require('../../services/hashing');
const { green } = require('../../utils/colors');

module.exports = function ({ tag, branch, mongo }) {
	execute(`git clone --branch ${branch} https://github.com/qelos-io/qelos.git`);

	if (!tag) {
		tag = 'v' + require(join(process.cwd(), 'qelos', 'package.json')).version;
	}

	const envs = readFileSync(join(process.cwd(), 'qelos', 'compose', '.env.example'), 'utf-8');

	const secrets = [
		"JWT_SECRET",
		"REFRESH_TOKEN_SECRET",
		"SECRETS_SERVICE_SECRET",
		"ASSETS_SECRETS_TOKEN",
		"PLUGINS_SERVICE_SECRET",
		"INTERNAL_SECRET"
	]

	const newEnvFile = envs
		.split('\n')
		.map(line => secrets.includes(line.replace('=', '')) ? `${line}${getRandomHash()}` : line)
		.join('\n')
		.replaceAll('latest', tag)
		.replaceAll('mongodb://mongo/qelos', mongo || 'mongodb://mongo/qelos')

	const yamlName = mongo ? 'docker-compose.yml' : 'docker-compose.persistent.yml';

	console.log('Create env file');
	writeFileSync(join(process.cwd(), '.env'), newEnvFile);

	console.log('Create docker-compose file');
	writeFileSync(join(process.cwd(), 'docker-compose.yml'), readFileSync(join(process.cwd(), 'qelos', 'compose', yamlName), 'utf-8'));

	execute(`rm -rf qelos`);

	console.log('Done! now run: ' + green('qelos compose start'));
}
