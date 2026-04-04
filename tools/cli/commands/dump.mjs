import dumpBlueprintsController from "../controllers/dump-blueprints.mjs";
import dumpUsersController from "../controllers/dump-users.mjs";
import dumpWorkspacesController from "../controllers/dump-workspaces.mjs";
import { getDumpConfig, saveDumpConfig } from "../services/config/load-config.mjs";
import { createConfigMiddleware } from "../services/config/config-middleware.mjs";

const blueprintsConfigMiddleware = createConfigMiddleware({
  keys: ['filter', 'group', 'path'],
  getDefaults: (argv) => getDumpConfig('blueprints', argv.blueprints),
  saveDefaults: (argv, opts, options) => saveDumpConfig('blueprints', argv.blueprints || 'all', opts, options),
  getSaveKey: () => true,
});

const usersConfigMiddleware = createConfigMiddleware({
  keys: ['path'],
  getDefaults: () => getDumpConfig('users'),
  saveDefaults: (_argv, opts, options) => saveDumpConfig('users', 'all', opts, options),
  getSaveKey: () => true,
});

const workspacesConfigMiddleware = createConfigMiddleware({
  keys: ['path'],
  getDefaults: () => getDumpConfig('workspaces'),
  saveDefaults: (_argv, opts, options) => saveDumpConfig('workspaces', 'all', opts, options),
  getSaveKey: () => true,
});

export default function dumpCommand(program) {
  program
    .command('dump', 'dump data from a Qelos instance to local files', (yargs) => {
      yargs
        .command('blueprints [blueprints]', 'dump entities from blueprints to local files',
          (yargs) => {
            return yargs
              .positional('blueprints', {
                describe: 'Blueprint names to dump (comma-separated) or "all"',
                type: 'string',
                default: 'all'
              })
              .option('filter', {
                describe: 'JSON filter object to apply to entity queries (e.g. \'{"status":"active"}\')',
                type: 'string'
              })
              .option('group', {
                describe: 'Group entities by this key in the output files',
                type: 'string'
              })
              .option('path', {
                describe: 'Base path for the dump output',
                type: 'string',
                default: './dump'
              })
              .middleware(blueprintsConfigMiddleware)
          },
          dumpBlueprintsController)

        .command('users', 'dump all users to a local JSON file',
          (yargs) => {
            return yargs
              .option('path', {
                describe: 'Base path for the dump output',
                type: 'string',
                default: './dump'
              })
              .middleware(usersConfigMiddleware)
          },
          dumpUsersController)

        .command('workspaces', 'dump all workspaces to a local JSON file',
          (yargs) => {
            return yargs
              .option('path', {
                describe: 'Base path for the dump output',
                type: 'string',
                default: './dump'
              })
              .middleware(workspacesConfigMiddleware)
          },
          dumpWorkspacesController)

        .demandCommand(1, 'Please specify a dump subcommand: blueprints, users, or workspaces')
    })
}
