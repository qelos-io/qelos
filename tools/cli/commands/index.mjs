import createCommand from './create.mjs';
import pushCommand from './push.mjs';
import pullCommand from './pull.mjs';
import generateCommand from './generate.mjs';
import blueprintsCommand from './blueprints.mjs';
import dumpCommand from './dump.mjs';
import restoreCommand from './restore.mjs';
import getCommand from './get.mjs';
import agentCommand from './agent.mjs';
import globalCommand from './global.mjs';

/**
 * Ordered list of all CLI commands.
 * Each entry is a function that receives the yargs program instance.
 * To add a new command, import it above and append it to this array.
 */
export const commands = [
  createCommand,
  pushCommand,
  pullCommand,
  generateCommand,
  blueprintsCommand,
  dumpCommand,
  restoreCommand,
  getCommand,
  agentCommand,
  globalCommand,
];

/**
 * Registers all commands on the given yargs program instance.
 * @param {import('yargs').Argv} program
 */
export function registerCommands(program) {
  for (const command of commands) {
    command(program);
  }
}
