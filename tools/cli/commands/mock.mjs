import { mockInitController, mockServeController } from '../controllers/mock.mjs';

export default function mockCommand(program) {
  program.command('mock', 'Develop locally without a Qelos tenant (scaffold and serve a mock folder)', (yargs) => {
    yargs
      .command('init [dir]', 'Scaffold a mock folder (personas, workspaces, state/, README)',
        (y) => y
          .positional('dir', { describe: 'Folder to create', type: 'string', default: './qelos-mock' })
          .option('pull', { type: 'boolean', description: 'Also run `qelos pull all` into the folder (needs a tenant)' })
          .option('dump', { type: 'boolean', description: 'Also dump users, workspaces and blueprint entities into the folder (needs a tenant)' })
          .option('force', { type: 'boolean', description: 'Overwrite existing scaffold files' }),
        mockInitController)
      .command('serve [dir]', 'Run the @qelos/testing server for a mock folder',
        (y) => y
          .positional('dir', { describe: 'Mock folder', type: 'string', default: './qelos-mock' })
          .option('port', { alias: 'p', type: 'number', description: 'Port (default: a free port)' })
          .option('host', { type: 'string', description: 'Host to bind (default 127.0.0.1)' }),
        mockServeController)
      .demandCommand(1, 'Please specify a mock subcommand: init or serve');
  });
}
