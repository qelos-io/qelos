import logController from '../controllers/log.mjs';

export default function logCommand(program) {
  program.command(
    'log [id]',
    'Show platform event logs, optionally following new ones. Pass an id to print one log with its full metadata',
    (yargs) => {
      return yargs
        .positional('id', { type: 'string', description: 'Log id to fetch (printed as the first column of the list)' })
        .option('kind', { type: 'string', description: 'Filter by event kind' })
        .option('source', { type: 'string', description: 'Filter by event source' })
        .option('event-name', { type: 'string', description: 'Filter by event name' })
        .option('time', {
          alias: 't',
          type: 'string',
          default: '30m',
          description: 'How far back to look: a number of minutes, or with a unit (30s, 30m, 2h, 1d)',
        })
        .option('follow', {
          alias: 'f',
          type: 'boolean',
          default: false,
          description: 'Keep polling every 5 seconds and print only new logs',
        })
        .option('json', { type: 'boolean', default: false, description: 'Print each log as a JSON line' });
    },
    logController
  );
}
