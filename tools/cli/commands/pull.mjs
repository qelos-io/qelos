import pullController from "../controllers/pull.mjs";

export default function pullCommand(program) {
  program
    .command('pull [type] [path]', 'pull from qelos app. Ability to pull components, blueprints, configurations, plugins, blocks, and more.',
      (yargs) => {
        return yargs
          .positional('type', {
            describe: 'Type of the resource to pull. Can be components, blueprints, configurations, plugins, blocks, or all.',
            type: 'string',
            choices: ['components', 'blueprints', 'configs', 'plugins', 'blocks', 'integrations', 'all', '*'],
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
