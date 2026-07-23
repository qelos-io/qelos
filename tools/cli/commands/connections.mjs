import { connectionsStatusController } from '../controllers/connections.mjs';

export default function connectionsCommand(program) {
  program.command('connections', 'Manage integration source connections', (yargs) => {
    yargs
      .command(
        'status',
        'Show connection status for all integration sources',
        () => {},
        connectionsStatusController
      )
      .demandCommand(1, 'Please specify a connections subcommand: status');
  });
}
