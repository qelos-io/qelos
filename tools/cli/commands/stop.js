const { stopCommand } = require('../controllers/stop');

function setStopCommand(program) {
	program
		.command('stop')
		.description('stop qelos application')
		.action(stopCommand);
}

module.exports = setStopCommand;
