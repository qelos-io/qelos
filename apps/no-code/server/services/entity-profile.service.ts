// Best-effort guess, from a blueprint's identifier and name, of whether it is a "log": rows that are appended all
// the time (and often updated while "today" is open), so it is worth keeping them away from ordinary blueprints.
// Pure (no database) so it can be unit tested. A wrong guess is harmless: log collections behave exactly like the
// others, they only isolate the write volume and compress better.

/** enough on their own: "activity_log", "AuditTrail", "usage-daily", "metrics" */
const STRONG = new Set([
  'log', 'logs', 'audit', 'audits', 'history', 'histories', 'activity', 'activities', 'usage',
  'telemetry', 'trace', 'traces', 'metric', 'metrics',
]);

/** only meaningful next to another word: "video_editing_state" is a log, a bare "State" is not */
const WEAK = new Set(['state', 'states']);

/** "system_event" is a log, a standalone "Event" (a calendar, say) is not: an event needs one of these next to it */
const EVENT = new Set(['event', 'events']);
const EVENT_QUALIFIERS = new Set(['system', 'app', 'application', 'platform', 'tracking', 'analytics', 'user']);

/** "AuditLog", "usage-daily", "video editing state" -> ['audit', 'log'], ['usage', 'daily'], ['video', 'editing', 'state'] */
export function tokenize(text: string | undefined): string[] {
  return (text || '')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z\d]+/)
    .filter(Boolean);
}

function matches(tokens: string[]): boolean {
  if (tokens.some(token => STRONG.has(token))) {
    return true;
  }
  if (tokens.length > 1 && tokens.some(token => WEAK.has(token))) {
    return true;
  }
  return tokens.some(token => EVENT.has(token)) && tokens.some(token => EVENT_QUALIFIERS.has(token));
}

/** description is deliberately ignored: free text is too noisy for a decision that is made once */
export function isLogLikeBlueprint(identifier: string | undefined, name?: string): boolean {
  return matches(tokenize(identifier)) || matches(tokenize(name));
}
