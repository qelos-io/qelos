import pushController from "../controllers/push.mjs";

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
      },
      pushController)
}