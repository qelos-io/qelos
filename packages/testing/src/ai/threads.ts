import type { Doc, MockState } from '../state/mock-state.js';
import type { AuthContext } from '../auth/authenticate.js';

/**
 * Chat threads and what a conversation writes into them, following `apps/ai` (`controllers/threads.ts` and the
 * thread handling of `controllers/chat-completion.ts`).
 */

export interface ThreadMessage {
  role: string;
  content?: unknown;
  timestamp?: string;
  tool_calls?: unknown;
  [key: string]: unknown;
}

const now = () => new Date().toISOString();

export function newThread(state: MockState, integration: string, auth: AuthContext): Doc {
  return state.collection('threads').insert({
    integration,
    user: auth.user._id,
    workspace: auth.workspace?._id,
    messages: [],
    messageSummaries: [],
    created: now(),
    updated: now(),
  } as any);
}

/** Whether the thread belongs to the caller: same user, and the same workspace when the caller has one active. */
export function ownsThread(thread: Doc, auth: AuthContext): boolean {
  return thread.user === auth.user._id && (!auth.workspace || thread.workspace === auth.workspace._id);
}

export function appendToThread(state: MockState, threadId: string, ...messages: ThreadMessage[]): void {
  const thread = state.collection('threads').get(threadId);
  if (!thread) return;
  state.collection('threads').update(threadId, {
    messages: [...thread.messages, ...messages.map((m) => ({ timestamp: now(), ...m }))],
    updated: now(),
  });
}

/**
 * Store what the app sent. A new thread keeps the user messages. A thread with history keeps the user messages that
 * are newer than its last one (a message without a timestamp counts as new), tool results, and assistant messages
 * carrying tool calls.
 */
export function recordRequest(state: MockState, threadId: string, sent: ThreadMessage[]): void {
  const thread = state.collection('threads').get(threadId);
  if (!thread) return;
  const history: ThreadMessage[] = thread.messages;
  const last = history.at(-1);
  const lastTime = new Date(last?.timestamp ?? 0).getTime();
  const added = sent.filter((message) => {
    if (!history.length) return message.role === 'user';
    if (message.role === 'tool') return true;
    if (message.role === 'assistant' && message.tool_calls) return true;
    if (message.role !== 'user') return false;
    return message.timestamp ? new Date(message.timestamp).getTime() > lastTime : true;
  });
  // an empty thread stamps what it gets with the time of arrival, whatever the app sent
  appendToThread(state, threadId, ...(history.length ? added : added.map((m) => ({ ...m, timestamp: now() }))));
  // the service writes a generated title; the mock uses the start of the first user message
  if (!thread.title) {
    const first = sent.find((m) => m.role === 'user');
    if (first) state.collection('threads').update(threadId, { title: String(first.content ?? '').slice(0, 60) });
  }
}
