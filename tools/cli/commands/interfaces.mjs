import interfacesBuildController from '../controllers/interfaces.mjs';
import { getInterfacesConfig, saveInterfacesConfig } from '../services/config/load-config.mjs';
import { createConfigMiddleware } from '../services/config/config-middleware.mjs';

const interfacesConfigMiddleware = createConfigMiddleware({
  keys: ['lang', 'out', 'path'],
  getDefaults: () => getInterfacesConfig(),
  saveDefaults: (_argv, opts, options) => saveInterfacesConfig(opts, options),
  getSaveKey: () => true,
});

export default function interfacesCommand(program) {
  program
    .command('interfaces', 'generate language interfaces from local blueprints', (yargs) => {
      yargs
        .command('build [path]', 'build interface declarations from *.blueprint.json files',
          (yargs) => {
            return yargs
              .positional('path', {
                describe: 'Path to the blueprints directory (defaults to ./blueprints).',
                type: 'string'
              })
              .option('lang', {
                describe: 'Output language for generated interfaces (default: ts).',
                type: 'string',
                choices: ['ts', 'py']
              })
              .option('out', {
                describe: 'Output directory for the generated module (default: ./types).',
                type: 'string'
              })
              .middleware(interfacesConfigMiddleware);
          },
          interfacesBuildController)
        .demandCommand(1, 'Please specify an interfaces subcommand: build');
    });
}
