import {
  loginController,
  logoutController,
  tokenController,
  statusController,
} from '../controllers/auth.mjs';

export default function authCommand(program) {
  program.command('auth', 'Manage developer authentication for the Qelos CLI', (yargs) => {
    yargs
      .command(
        'login',
        'Log in to a Qelos environment and store an API token in ~/.qelos/credentials.json',
        (y) => y
          .option('url', {
            type: 'string',
            description: 'Qelos URL (skips the URL prompt)',
          })
          .option('username', {
            type: 'string',
            description: 'Email/username (skips the email prompt)',
          })
          .option('password', {
            type: 'string',
            description: 'Password (skips the password prompt — avoid in shell history)',
          })
          .option('nickname', {
            type: 'string',
            description: 'Nickname for the created API token',
          }),
        loginController,
      )
      .command(
        'logout',
        'Clear stored credentials from ~/.qelos/credentials.json',
        () => {},
        logoutController,
      )
      .command(
        'token',
        'Display the stored API token (masked by default)',
        (y) => y.option('show', {
          type: 'boolean',
          description: 'Print the full unmasked token',
          default: false,
        }),
        tokenController,
      )
      .command(
        'status',
        'Show the currently logged-in user',
        () => {},
        statusController,
      )
      .demandCommand(1, 'Please specify an auth subcommand: login, logout, token, or status');
  });
}
