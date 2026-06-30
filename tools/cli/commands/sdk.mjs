import sdkController from '../controllers/sdk.mjs';

export default function sdkCommand(program) {
  program.command(
    'sdk [path..]',
    'Invoke the Qelos SDK from the command line',
    (yargs) => yargs
      .positional('path', {
        describe: 'SDK path: dot-separated properties, space-separated method args (JSON or piped stdin for the final call)',
        type: 'string',
        array: true,
      })
      .option('compact', {
        type: 'boolean',
        description: 'Print JSON without pretty formatting',
        default: false,
      })
      .example('$0 sdk blueprints getList', 'List blueprints')
      .example('$0 sdk blueprints entitiesOf todo getList', 'List entities in the "todo" blueprint')
      .example('$0 sdk blueprints.entitiesOf todo create \'{"title":"Buy milk"}\'', 'Create a blueprint entity')
      .example('$0 sdk users getList', 'List users (admin SDK)')
      .example('cat query.json | $0 sdk users getList', 'Pass query filters via stdin'),
    sdkController,
  );
}
