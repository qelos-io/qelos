import blueprintsController from "../controllers/blueprints.mjs";

export default function blueprintsCommand(program) {
  program
    .command('blueprints generate [path]', 'generate new blueprints from actual database tables/collections',
      (yargs) => {
        return yargs
          .positional('path', {
            describe: 'Path to store the pulled resources.',
            type: 'string',
            default: './blueprints',
            required: false
          })
          .option('uri', {
            describe: 'The URI of the database. Defaults to mongodb://localhost:27017/db',
            type: 'string',
            required: false,
            default: 'mongodb://localhost:27017/db'
          })
          .option('guides', {
            describe: 'Generate SDK guides for each blueprint',
            type: 'boolean',
            required: false,
            default: true
          })
      },
      blueprintsController)
}