import initController from '../controllers/init.mjs';

export default function initCommand(program) {
  program
    .command('init', 'Detect your framework and scaffold the Qelos integrator config',
      (yargs) => {
        return yargs
          .option('framework', {
            alias: 'f',
            type: 'string',
            choices: ['next', 'nuxt', 'express', 'fastify', 'nest', 'fastapi'],
            description: 'Skip detection and scaffold for a specific framework'
          })
          .option('yes', {
            alias: 'y',
            type: 'boolean',
            description: 'Accept the detected framework without prompting'
          })
          .option('force', {
            type: 'boolean',
            description: 'Overwrite an existing qelos.config file'
          });
      },
      initController);
}
