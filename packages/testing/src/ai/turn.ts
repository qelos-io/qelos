import { jsonResponse } from '../router/router.js';
import type { MockState } from '../state/mock-state.js';
import type { AiReply } from './ai-stub.js';
import { appendToThread } from './threads.js';

/**
 * One answer of an agent, shaped the way the Qelos AI service (`apps/ai`) returns, streams and stores it.
 *
 * Tool calls the app declared in `clientTools` are handed back to the app. The others count as run by the service,
 * which then continues the conversation with the `followup` text.
 */
export interface AiTurn {
  /** text before any tool call, in streaming pieces */
  chunks: string[];
  calls: ReturnType<typeof toolCallsOf>;
  /** calls the app has to run */
  clientCalls: ReturnType<typeof toolCallsOf>;
  /** calls the service ran, and their results */
  serverCalls: ReturnType<typeof toolCallsOf>;
  serverResults: Array<{ tool_call_id: string; role: 'tool'; type: 'function'; name: string; content: string }>;
  /** what each server tool returned, by call id */
  returned: Map<string, unknown>;
  followup: string[];
}

/** The reply's tool calls. Default ids continue from the calls already in the conversation, so they stay unique. */
const toolCallsOf = (reply: AiReply, earlier = 0) =>
  (reply.toolCalls || []).map((t, index) => ({
    id: t.id ?? `call_mock_${earlier + index + 1}`,
    type: 'function' as const,
    function: {
      name: t.name,
      arguments: typeof t.arguments === 'string' ? t.arguments : JSON.stringify(t.arguments ?? {}),
    },
  }));

const madeCalls = (messages: any[]): any[] => messages.flatMap((m) => (m?.role === 'assistant' && m.tool_calls) || []);

/**
 * Whether the request brings back the results of this reply's tool calls: it ends with tool messages answering calls
 * of the same name and arguments, including every client tool the reply asks for.
 */
function answersToolResults(reply: AiReply, messages: any[], clientTools: string[]): boolean {
  const results: string[] = [];
  for (let i = messages.length - 1; i >= 0 && messages[i]?.role === 'tool'; i--) results.push(messages[i].tool_call_id);
  if (!results.length) return false;
  const made = madeCalls(messages);
  // without the assistant message that made the calls, only the ids can tell
  const answered = made.length
    ? made.filter((c) => results.includes(c.id))
    : toolCallsOf(reply).filter((c) => results.includes(c.id));
  const isAnswered = (call: ReturnType<typeof toolCallsOf>[number]) =>
    answered.some((c) => c.function?.name === call.function.name && c.function?.arguments === call.function.arguments);
  const calls = toolCallsOf(reply);
  return calls.some(isAnswered) && calls.filter((c) => clientTools.includes(c.function.name)).every(isAnswered);
}

export function aiTurn(reply: AiReply, messages: any[], clientTools: string[]): AiTurn {
  const followup = ([] as string[]).concat(reply.followup ?? []);
  // the tools ran: answer with the follow-up instead of asking for the same tools again
  const answered = answersToolResults(reply, messages, clientTools);
  const chunks = answered ? followup : (reply.chunks ?? (reply.content ? [reply.content] : []));
  const calls = answered ? [] : toolCallsOf(reply, madeCalls(messages).length);
  const clientCalls = calls.filter((c) => clientTools.includes(c.function.name));
  const serverCalls = calls.filter((c) => !clientTools.includes(c.function.name));
  const returned = new Map<string, unknown>(serverCalls.map((c) => [c.id, reply.toolCalls![calls.indexOf(c)].result ?? {}]));
  const serverResults = serverCalls.map((c) => ({
    tool_call_id: c.id,
    role: 'tool' as const,
    type: 'function' as const,
    name: c.function.name,
    content: JSON.stringify(returned.get(c.id)),
  }));
  return { chunks, calls, clientCalls, serverCalls, serverResults, returned, followup: answered ? [] : followup };
}

function completion(content: string) {
  const tokens = Math.ceil(content.length / 4);
  return {
    id: `chatcmpl-mock-${Date.now().toString(36)}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'qelos-mock',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 0, completion_tokens: tokens, total_tokens: tokens },
  };
}

/** The body of a non-streamed completion. */
export function completionBody(turn: AiTurn) {
  if (!turn.calls.length) return completion(turn.chunks.join(''));
  if (turn.clientCalls.length) {
    return {
      type: 'client_tool_calls',
      functionCalls: turn.clientCalls,
      backendResults: turn.serverResults,
      assistantToolCalls: turn.calls,
    };
  }
  return { ...completion(turn.followup.join('')), function_calls: turn.calls, function_results: turn.serverResults };
}

/**
 * The server-sent events of a streamed completion: `{type: "chunk"}` text, tool events, `{type: "done"}` at the
 * end. No `[DONE]` marker.
 */
function streamEvents(turn: AiTurn): Array<Record<string, unknown>> {
  const events: Array<Record<string, unknown>> = turn.chunks.map((content) => ({ type: 'chunk', content }));
  if (turn.calls.length) {
    events.push({ type: 'function_calls_detected' });
    if (turn.serverCalls.length) {
      events.push({ type: 'function_calls_detected', functionCalls: turn.serverCalls });
      for (const functionCall of turn.serverCalls) {
        events.push(
          { type: 'function_executing', functionCall },
          { type: 'function_executed', functionCall, result: [turn.returned.get(functionCall.id)] },
        );
      }
    }
    if (turn.clientCalls.length) {
      events.push({
        type: 'client_tool_calls',
        functionCalls: turn.clientCalls,
        backendResults: turn.serverResults,
        assistantToolCalls: turn.calls,
      });
    } else {
      events.push({ type: 'continuing_conversation' });
      for (const content of turn.followup) events.push({ type: 'followup_chunk', content });
    }
  }
  events.push({ type: 'done' });
  return events;
}

export function eventStream(events: Array<Record<string, unknown>>): Response {
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
  return new Response(body, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });
}

/** A provider failure: an event inside a 200 stream, or an error response. */
export function failureResponse(error: NonNullable<AiReply['error']>, stream: boolean): Response {
  const message = error.message ?? `Mock AI error ${error.status}`;
  if (stream) return eventStream([{ type: 'error', message }]);
  return jsonResponse({ error: 'AI chat completion failed', message, code: 'QELOS_MOCK_AI_ERROR' }, error.status);
}

export const streamResponse = (turn: AiTurn) => eventStream(streamEvents(turn));

/** What the service writes into the thread while answering. */
export function recordTurn(state: MockState, threadId: string, turn: AiTurn, stream: boolean): void {
  const answer = (text: string) => {
    // a stream stores an answer only when text arrived
    if (!stream || text) appendToThread(state, threadId, { role: 'assistant', content: text });
  };
  if (!turn.calls.length) return answer(turn.chunks.join(''));
  appendToThread(state, threadId, { role: 'assistant', content: '', tool_calls: turn.calls });
  if (turn.clientCalls.length) return;
  appendToThread(state, threadId, { role: 'function', content: '', tool_calls: turn.serverResults });
  answer(turn.followup.join(''));
}
