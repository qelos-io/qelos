export interface AiToolCall {
  id?: string;
  name: string;
  /** object (stringified for you) or a JSON string */
  arguments?: unknown;
  /** what the tool returned, for tools the service runs itself (not listed in the app's `clientTools`) */
  result?: unknown;
}

export interface AiReply {
  /** assistant text */
  content?: string;
  /** stream these pieces as separate chunks (non-streaming calls get them joined) */
  chunks?: string[];
  toolCalls?: AiToolCall[];
  /**
   * With `toolCalls`: the text the agent answers after the tools ran. For tools the service runs itself that is
   * part of the same response; for the app's `clientTools` it answers the request that brings their results back.
   */
  followup?: string | string[];
  /** answer with this HTTP error instead of a completion */
  error?: { status: number; message?: string };
  /** wait before answering (ms) */
  delay?: number;
}

export interface AiCall {
  agentId: string;
  /** the messages the app sent */
  messages: Array<{ role: string; content?: unknown; [key: string]: unknown }>;
  /** text of the last user message */
  message: string;
  stream: boolean;
  threadId?: string;
}

export type AiMatcher = string | RegExp | ((call: AiCall) => boolean);
export type AiReplyInput = string | AiReply | Array<string | AiReply> | ((call: AiCall) => string | AiReply);

export interface AiRuleOptions {
  /** only for this agent id. Default: any agent. */
  agent?: string;
  /** apply to the first N matching calls, then fall back to older rules / seeded replies. */
  times?: number;
}

export interface AiRuleHandle {
  readonly calls: number;
  remove(): void;
}

interface Rule {
  match: AiMatcher | undefined;
  reply: AiReplyInput;
  options: AiRuleOptions;
  calls: number;
}

export interface AiStub {
  /**
   * Script a reply. Newest rules win over older ones and over seeded `aiResponses`.
   * An array is a sequence: the 1st matching call gets the 1st item, ..., the last item repeats.
   *
   * `mock.ai.reply(/refund/i, 'Refund started')`, `mock.ai.reply('*', ['one', 'two'])`,
   * `mock.ai.reply(() => true, { toolCalls: [{ name: 'lookup', arguments: { id: 1 } }] })`.
   */
  reply(match: AiMatcher | '*', reply: AiReplyInput, options?: AiRuleOptions): AiRuleHandle;
  /** Fail every matching call with an HTTP error. */
  fail(match: AiMatcher | '*', status?: number, message?: string, options?: AiRuleOptions): AiRuleHandle;
  /** Every call the mock received, oldest first. */
  readonly calls: AiCall[];
  /** Drop scripted rules and recorded calls. */
  clear(): void;
  /** @internal */
  resolve(call: AiCall): AiReply | undefined;
}

function matches(match: AiMatcher | undefined, call: AiCall): boolean {
  if (match === undefined || match === '*') return true;
  if (typeof match === 'string') return call.message.toLowerCase().includes(match.toLowerCase());
  if (match instanceof RegExp) return match.test(call.message);
  return match(call);
}

const asReply = (r: string | AiReply): AiReply => (typeof r === 'string' ? { content: r } : r);

export function createAiStub(): AiStub {
  let rules: Rule[] = [];
  const calls: AiCall[] = [];

  const add = (match: AiMatcher | undefined, reply: AiReplyInput, options: AiRuleOptions = {}): AiRuleHandle => {
    const rule: Rule = { match, reply, options, calls: 0 };
    rules.unshift(rule);
    return {
      get calls() {
        return rule.calls;
      },
      remove() {
        rules = rules.filter((r) => r !== rule);
      },
    };
  };

  return {
    reply: (match, reply, options) => add(match, reply, options),
    fail: (match, status = 500, message, options) =>
      add(match, { error: { status, message } }, options),
    calls,
    clear() {
      rules = [];
      calls.length = 0;
    },
    resolve(call) {
      calls.push(call);
      for (const rule of rules) {
        if (rule.options.agent && rule.options.agent !== call.agentId) continue;
        if (rule.options.times !== undefined && rule.calls >= rule.options.times) continue;
        if (!matches(rule.match, call)) continue;
        const index = rule.calls++;
        const r = rule.reply;
        if (typeof r === 'function') return asReply(r(call));
        if (Array.isArray(r)) return asReply(r[Math.min(index, r.length - 1)]);
        return asReply(r);
      }
      return undefined;
    },
  };
}
