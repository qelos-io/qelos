import generateController from "../controllers/generate.mjs";

export default function generateCommand(program) {
  program
    .command('generate rules <type>', 'Generate IDE-specific rules files for working with pulled Qelos resources.',
      (yargs) => {
        return yargs
          .positional('type', {
            describe: 'Type of IDE rules to generate. Can be windsurf, cursor, claude, or all.',
            type: 'string',
            choices: ['windsurf', 'cursor', 'claude', 'all']
          })
      },
      generateController)
}
