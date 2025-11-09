import createController from "../controllers/create.mjs";

export default function createCommand(program) {
  program
    .command('create [boilerplate] [name]', 'create a new project',
      (yargs) => {
        return yargs
          .positional('boilerplate', {
            describe: 'Pre-select a boilerplate. Can be vue, vanilla, crud or ui-lib, or any custom github repository.',
            type: 'string',
            required: false
          })
          .positional('name', {
            describe: 'The name of your application. A folder with that name will be created here.',
            type: 'string',
            required: true
          })
      },
      createController)
}