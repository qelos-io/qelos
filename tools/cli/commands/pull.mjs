import pullController from "../controllers/pull.mjs";

export default function pullCommand(program) {
  program
    .command('pull [type] [path]', 'pull from qelos app. Ability to pull components, blueprints, configurations, and more.',
      (yargs) => {
        return yargs
          .positional('type', {
            describe: 'Type of the resource to pull. Can be components, blueprints, configurations, or more.',
            type: 'string',
            choices: ['components', 'blueprints', 'configs'],
            required: true
          })
          .positional('path', {
            describe: 'Path to store the pulled resources.',
            type: 'string',
            required: true
          })
      },
      pullController)
}
