import restoreBlueprintsController from "../controllers/restore-blueprints.mjs";
import { getRestoreConfig, saveRestoreConfig } from "../services/config/load-config.mjs";

const RESTORE_BLUEPRINTS_KEYS = ['include', 'exclude', 'override', 'replace', 'path'];

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
              .middleware((argv) => {
                const defaults = getRestoreConfig('blueprints', argv.blueprints);
                for (const key of RESTORE_BLUEPRINTS_KEYS) {
                  if (argv[key] === undefined && defaults[key] !== undefined) {
                    argv[key] = defaults[key];
                  }
                }
                if (argv.save) {
                  const opts = {};
                  for (const key of RESTORE_BLUEPRINTS_KEYS) {
                    if (argv[key] !== undefined) opts[key] = argv[key];
                  }
                  saveRestoreConfig('blueprints', argv.blueprints || 'all', opts, { verbose: argv.verbose });
                }
              })
          },
          restoreBlueprintsController)

        .demandCommand(1, 'Please specify a restore subcommand: blueprints')
    })
}
