import generateController from "../controllers/generate.mjs";
import generateConnectionController from "../controllers/generate-connection.mjs";
import generateAgentController from "../controllers/generate-agent.mjs";
import generateProxyController from "../controllers/generate-proxy.mjs";

export default function generateCommand(program) {

  program.command('generate', 'Generate qelos related features', yargs => {
    yargs.command(
      "rules <type>",
      "Generate IDE-specific rules files for working with pulled Qelos resources.",
      (yargs) => {
        return yargs.positional("type", {
          describe:
            "Type of IDE rules to generate. Can be windsurf, cursor, claude, or all.",
          type: "string",
          choices: ["windsurf", "cursor", "claude", "all"],
        });
      },
      generateController,
    )
    .command(
      "connection <name>",
      "Generate a secure connection configuration file for Qelos integrations.\n\n" +
        "Creates connection files with authentication stored in environment variables.\n" +
        "Supports 15+ integration types: OpenAI, AWS, GitHub, Google, Email, and more.\n\n" +
        "Examples:\n" +
        "  qelos generate connection my-openai --kind openai\n" +
        "  qelos generate connection aws-prod --kind aws\n" +
        "  qelos generate connection github-bot --kind github\n\n" +
        "After generation, push with: qelos push connections connections/<name>.connection.json",
      (yargs) => {
        return yargs
          .positional("name", {
            describe: "Name of the connection (will be used in env var names)",
            type: "string",
          })
          .option("kind", {
            alias: "k",
            describe:
              "Kind of integration source. If not provided, will show interactive selection.",
            type: "string",
            choices: [
              "qelos",
              "openai",
              "email",
              "n8n",
              "supabase",
              "linkedin",
              "http",
              "claudeai",
              "facebook",
              "google",
              "github",
              "gemini",
              "sumit",
              "paddle",
              "aws",
              "cloudflare",
            ],
          })
          .example(
            "qelos generate connection my-openai --kind openai",
            "Create an OpenAI connection",
          )
          .example(
            "qelos generate connection aws-prod --kind aws",
            "Create an AWS connection",
          )
          .example(
            "qelos generate connection github-bot --kind github",
            "Create a GitHub connection",
          );
      },
      generateConnectionController,
    )
    .command(
      "agent <name>",
      "Generate an AI agent integration configuration file for Qelos.\n\n" +
        "Creates agent integration files with trigger, target, and prompt configuration.\n" +
        "Supports OpenAI, Claude AI, and Gemini as target providers.\n\n" +
        "Examples:\n" +
        "  qelos generate agent my-assistant\n" +
        "  qelos generate agent support-bot\n\n" +
        "After generation, push with: qelos push integrations integrations/<name>.integration.json",
      (yargs) => {
        return yargs
          .positional("name", {
            describe: "Name of the agent integration",
            type: "string",
          })
          .example(
            "qelos generate agent my-assistant",
            "Create a custom AI assistant",
          )
          .example(
            "qelos generate agent support-bot",
            "Create a customer support bot",
          );
      },
      generateAgentController,
    )
    .command(
      "proxy <pathFrom> <endpointTo>",
      "Generate a proxy plugin configuration for Qelos.\n\n" +
        "Creates a plugin that proxies API requests from a local path to an external endpoint.\n" +
        "Supports optional token authentication via --token flag or QELOS_PROXY_TOKEN env variable.\n" +
        "Qelos automatically prefixes with /api/[path].\n\n" +
        "Examples:\n" +
        "  qelos generate proxy external https://api.example.com\n" +
        "  qelos generate proxy external https://api.example.com --token my-secret-token\n" +
        "  QELOS_PROXY_TOKEN=my-secret-token qelos generate proxy external https://api.example.com\n\n" +
        "After generation, push with: qelos push plugins plugins/<pathFrom>.plugin.json",
      (yargs) => {
        return yargs
          .positional("pathFrom", {
            describe: "Local path to proxy (e.g., external)",
            type: "string",
          })
          .positional("endpointTo", {
            describe: "External endpoint URL to proxy to (e.g., https://api.example.com)",
            type: "string",
          })
          .option("token", {
            describe: "Optional authentication token for the proxy (can also use QELOS_PROXY_TOKEN env variable)",
            type: "string",
          })
          .example(
            "qelos generate proxy external https://api.example.com",
            "Create a proxy without authentication",
          )
          .example(
            "qelos generate proxy external https://api.example.com --token my-secret-token",
            "Create a proxy with authentication token",
          )
          .example(
            "QELOS_PROXY_TOKEN=my-secret-token qelos generate proxy external https://api.example.com",
            "Create a proxy using environment variable",
          );
      },
      generateProxyController,
    )
    .demandCommand(1, 'Please specify a generate subcommand: rules, connection, agent, or proxy')
  })
    
}
