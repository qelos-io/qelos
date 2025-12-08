import pushController from "../controllers/push.mjs";

export default function createCommand(program) {
  program
    .command('push [type] [path]', 'push to qelos app. Ability to push components, blueprints, configurations, plugins, blocks, and more.',
      (yargs) => {
        return yargs
          .positional('type', {
            describe: 'Type of the resource to push. Can be components, blueprints, configurations, plugins, blocks, or all.',
            type: 'string',
            choices: ['components', 'blueprints', 'configs', 'plugins', 'blocks', 'integrations', 'all', '*'],
            required: true
          })
          .positional('path', {
            describe: 'Path to the resource to push.',
            type: 'string',
            required: true
          })
      },
      pushController)
}