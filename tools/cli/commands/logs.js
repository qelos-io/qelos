const logsController = require('../controllers/logs');

function setLogsCommand(program) {
	program
		.command('logs')
		.description('display qelos logs')
		.action(logsController)
}


module.exports = setLogsCommand;