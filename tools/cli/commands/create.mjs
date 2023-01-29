import createController from "../controllers/create.mjs";

export default function createCommand(program) {
  program
    .command('create [name]', 'create a new plugin',
      (yargs) => {
        return yargs
          .positional('name', {
            describe: 'The name of your application. A folder with that name will be created here.',
            default: 'qelos',
            type: 'string'
          })
      },
      createController)
}