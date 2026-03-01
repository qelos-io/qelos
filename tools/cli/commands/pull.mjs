import pullController from "../controllers/pull.mjs";
import { getPullConfig, savePullConfig } from "../services/config/load-config.mjs";

const PULL_KEYS = ['path'];

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
          .middleware((argv) => {
            const defaults = getPullConfig(argv.type);
            for (const key of PULL_KEYS) {
              if (argv[key] === undefined && defaults[key] !== undefined) {
                argv[key] = defaults[key];
              }
            }
            if (argv.save && argv.type) {
              const opts = {};
              for (const key of PULL_KEYS) {
                if (argv[key] !== undefined) opts[key] = argv[key];
              }
              savePullConfig(argv.type, opts, { verbose: argv.verbose });
            }
          })
      },
      pullController)
}
