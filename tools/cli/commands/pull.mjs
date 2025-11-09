import pullController from "../controllers/pull.mjs";

export default function pullCommand(program) {
  program
    .command('pull [type] [path]', 'pull from qelos app. Ability to pull components, plugins, integrations, blueprints, and more.',
      (yargs) => {
        return yargs
          .positional('type', {
            describe: 'Type of the resource to pull. Can be components, plugins, integrations, blueprints, or more.',
            type: 'string',
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
