import {
  globalSetController,
  globalDeleteController,
  globalInfoController,
  globalListController,
} from '../controllers/global.mjs';

export default function globalCommand(program) {
  program
    .command('global', 'Manage globally registered Qelos environments', (yargs) => {
      yargs
        .command(
          'set [name]',
          'Register the current directory as a named global environment (default name: "default")',
          (yargs) => yargs.positional('name', {
            describe: 'Name for this global environment',
            type: 'string',
            default: 'default'
          }),
          globalSetController
        )
        .command(
          'delete [name]',
          'Remove a named global environment',
          (yargs) => yargs.positional('name', {
            describe: 'Name of the global environment to remove',
            type: 'string',
            default: 'default'
          }),
          globalDeleteController
        )
        .command(
          'info [name]',
          'Show info about a named global environment. Use "*" or "all" to list every registered entry.',
          (yargs) => yargs.positional('name', {
            describe: 'Name of the global environment (or "*"/"all" to list all)',
            type: 'string',
            default: 'default'
          }),
          globalInfoController
        )
        .command(
          'list',
          'List all registered global environments',
          () => {},
          globalListController
        )
        .demandCommand(1, 'Please specify a global subcommand: set, delete, info, or list')
    })
}
