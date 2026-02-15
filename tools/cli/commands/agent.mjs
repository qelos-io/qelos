import agentController from "../controllers/agent.mjs";
import { getAgentConfig, saveAgentConfig } from "../services/load-config.mjs";

const SAVEABLE_AGENT_KEYS = ['thread', 'log', 'export', 'json', 'stream'];

export default function agentCommand(program) {
  program
    .command('agent [integrationId]', 'Interact with AI agent using Qelos SDK',
      (yargs) => {
        return yargs
          .positional('integrationId', {
            describe: 'ID of the AI integration to use',
            type: 'string',
            required: true
          })
          .option('thread', {
            alias: 't',
            type: 'string',
            description: 'Thread ID for conversation continuity'
          })
          .option('json', {
            alias: 'j',
            type: 'boolean',
            description: 'Output in JSON format'
          })
          .option('stream', {
            alias: 's',
            type: 'boolean',
            description: 'Use streaming mode for real-time responses'
          })
          .option('message', {
            alias: 'm',
            type: 'string',
            description: 'Message to send to the agent (if not provided, will read from stdin)'
          })
          .option('export', {
            alias: 'e',
            type: 'string',
            description: 'Export response content to specified file'
          })
          .option('log', {
            alias: 'l',
            type: 'string',
            description: 'Log file to maintain conversation history (stores both user and assistant messages)'
          })
          .middleware((argv) => {
            // Apply config defaults for undefined argv values
            const agentDefaults = getAgentConfig(argv.integrationId);
            if (agentDefaults && Object.keys(agentDefaults).length) {
              for (const [key, value] of Object.entries(agentDefaults)) {
                if (argv[key] === undefined) {
                  argv[key] = value;
                }
              }
            }

            // Save current options to config when --save is set
            if (argv.save && argv.integrationId) {
              const opts = {};
              for (const key of SAVEABLE_AGENT_KEYS) {
                if (argv[key] !== undefined) {
                  opts[key] = argv[key];
                }
              }
              saveAgentConfig(argv.integrationId, opts, { verbose: argv.verbose });
            }
          })
      },
      agentController)
}
