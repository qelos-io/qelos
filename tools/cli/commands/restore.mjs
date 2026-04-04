import restoreBlueprintsController from "../controllers/restore-blueprints.mjs";
import { getRestoreConfig, saveRestoreConfig } from "../services/config/load-config.mjs";
import { createConfigMiddleware } from "../services/config/config-middleware.mjs";

const restoreBlueprintsMiddleware = createConfigMiddleware({
  keys: ['include', 'exclude', 'override', 'replace', 'path', 'clone'],
  getDefaults: (argv) => getRestoreConfig('blueprints', argv.blueprints),
  saveDefaults: (argv, opts, options) => saveRestoreConfig('blueprints', argv.blueprints || 'all', opts, options),
  getSaveKey: () => true,
});

export default function restoreCommand(program) {
  program
    .command('restore', 'restore data from local files to a Qelos instance', (yargs) => {
      yargs
        .command('blueprints [blueprints]', 'restore entities from local files to blueprints',
          (yargs) => {
            return yargs
              .positional('blueprints', {
                describe: 'Blueprint names to restore (comma-separated) or "all"',
                type: 'string',
                default: 'all'
              })
              .option('include', {
                describe: 'Only restore files whose name includes this value (comma-separated for multiple)',
                type: 'string'
              })
              .option('exclude', {
                describe: 'Skip files whose name includes this value (comma-separated for multiple)',
                type: 'string'
              })
              .option('override', {
                describe: 'JSON object to merge recursively into every entity (e.g. \'{"user":"x","metadata":{"flow_id":111}}\')',
                type: 'string'
              })
              .option('replace', {
                describe: 'Replace local JSON files with the API response data after each restore',
                type: 'boolean',
                default: false
              })
              .option('path', {
                describe: 'Base path where dump data is stored',
                type: 'string',
                default: './dump'
              })
              .option('clone', {
                describe: 'Clone mode: restore all data to a new environment, resolving blueprint relations recursively and remapping all IDs',
                type: 'boolean',
                default: false
              })
              .middleware(restoreBlueprintsMiddleware)
          },
          restoreBlueprintsController)

        .demandCommand(1, 'Please specify a restore subcommand: blueprints')
    })
}
