import { processChatCompletion } from "../chat-completion-system-agents-service";

/**
 * Processes a plain chat completion request
 */
export function processPlainChatCompletion(req: any, res: any) {
  return processChatCompletion(req, res, null, () => []);
}