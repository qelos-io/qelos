import dumpBlueprintsController from "../controllers/dump-blueprints.mjs";
import dumpUsersController from "../controllers/dump-users.mjs";
import dumpWorkspacesController from "../controllers/dump-workspaces.mjs";

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
          },
          dumpWorkspacesController)

        .demandCommand(1, 'Please specify a dump subcommand: blueprints, users, or workspaces')
    })
}
