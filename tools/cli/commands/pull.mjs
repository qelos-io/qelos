import pullController from "../controllers/pull.mjs";
import { getPullConfig, savePullConfig } from "../services/config/load-config.mjs";
import { createConfigMiddleware } from "../services/config/config-middleware.mjs";

const pullConfigMiddleware = createConfigMiddleware({
  keys: ['path'],
  getDefaults: (argv) => getPullConfig(argv.type),
  saveDefaults: (argv, opts, options) => savePullConfig(argv.type, opts, options),
  getSaveKey: (argv) => argv.type,
});

export default function pullCommand(program) {
  program
    .command('pull [type] [path]', 'pull from qelos app. Ability to pull components, blueprints, configurations, plugins, blocks, and more.',
      (yargs) => {
        return yargs
          .positional('type', {
            describe: 'Type of the resource to pull. Can be components, blueprints, configurations, plugins, blocks, or all.',
            type: 'string',
            choices: ['components', 'blueprints', 'configs', 'plugins', 'blocks', 'integrations', 'connections', 'all', '*'],
            required: true
          })
          .positional('path', {
            describe: 'Path to store the pulled resources.',
            type: 'string',
            required: true
          })
          .middleware(pullConfigMiddleware)
      },
      pullController)
}
