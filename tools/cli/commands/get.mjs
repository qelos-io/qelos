import getController from "../controllers/get.mjs";

export default function getCommand(program) {
  program
    .command('get [type] [path]', 'get files from git without pushing. Ability to view components, blueprints, configurations, plugins, blocks, committed files, or staged files.',
      (yargs) => {
        return yargs
          .positional('type', {
            describe: 'Type of the resource to get. Can be components, blueprints, configurations, plugins, blocks, integrations, connections, committed, staged, or all.',
            type: 'string',
            choices: ['components', 'blueprints', 'configs', 'plugins', 'blocks', 'integrations', 'connections', 'committed', 'staged', 'all', '*'],
            required: true
          })
          .positional('path', {
            describe: 'Path to search for resources.',
            type: 'string',
            required: true
          })
          .option('json', {
            alias: 'j',
            type: 'boolean',
            description: 'Output in JSON format'
          })
      },
      getController)
}
