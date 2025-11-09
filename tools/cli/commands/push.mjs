import pushController from "../controllers/push.mjs";

export default function createCommand(program) {
  program
    .command('push [type] [path]', 'push to qelos app. Ability to push components, plugins, integrations, blueprints, and more.',
      (yargs) => {
        return yargs
          .positional('type', {
            describe: 'Type of the plugin to push. Can be components, plugins, integrations, blueprints, or more.',
            type: 'string',
            required: true
          })
          .positional('path', {
            describe: 'Path to the context file to push.',
            type: 'string',
            required: true
          })
      },
      pushController)
}