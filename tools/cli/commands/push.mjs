import pushController from "../controllers/push.mjs";

export default function createCommand(program) {
  program
    .command('push [type] [path]', 'push to qelos app. Ability to push components, blueprints, configurations, and more.',
      (yargs) => {
        return yargs
          .positional('type', {
            describe: 'Type of the resource to push. Can be components, blueprints, configurations, or more.',
            type: 'string',
            choices: ['components', 'blueprints', 'configs'],
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