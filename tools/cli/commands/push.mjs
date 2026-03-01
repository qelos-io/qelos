import pushController from "../controllers/push.mjs";
import { getPushConfig, savePushConfig } from "../services/config/load-config.mjs";

const PUSH_KEYS = ['path', 'hard'];

export default function pushCommand(program) {
  program
    .command('push [type] [path]', 'push to qelos app. Ability to push components, blueprints, configurations, plugins, blocks, committed files, or staged files.',
      (yargs) => {
        return yargs
          .positional('type', {
            describe: 'Type of the resource to push. Can be components, blueprints, configurations, plugins, blocks, integrations, connections, committed, staged, or all.',
            type: 'string',
            choices: ['components', 'blueprints', 'configs', 'plugins', 'blocks', 'integrations', 'connections', 'committed', 'staged', 'all', '*'],
            required: true
          })
          .positional('path', {
            describe: 'Path to the resource to push.',
            type: 'string',
            required: true
          })
          .option('hard', {
            alias: 'h',
            type: 'boolean',
            describe: 'Hard push: remove resources from Qelos that don\'t exist locally (only for components, integrations, plugins, blueprints when pushing a directory)',
            default: false
          })
          .middleware((argv) => {
            const defaults = getPushConfig(argv.type);
            for (const key of PUSH_KEYS) {
              if (argv[key] === undefined && defaults[key] !== undefined) {
                argv[key] = defaults[key];
              }
            }
            if (argv.save && argv.type) {
              const opts = {};
              for (const key of PUSH_KEYS) {
                if (argv[key] !== undefined) opts[key] = argv[key];
              }
              savePushConfig(argv.type, opts, { verbose: argv.verbose });
            }
          })
      },
      pushController)
}
