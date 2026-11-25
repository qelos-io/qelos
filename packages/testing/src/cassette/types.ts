/** One recorded request/response pair (one JSON line of `cassette.jsonl`). Secrets are already redacted. */
export interface CassetteExchange {
  seq: number;
  method: string;
  /** pathname only: the tenant host is never part of a match */
  path: string;
  /** sorted, redacted query string without `?` */
  query: string;
  /** hash of the redacted request body, empty when there was none */
  bodyHash: string;
  requestBody?: unknown;
  status: number;
  contentType?: string;
  /** parsed JSON when the response was JSON, otherwise text */
  responseBody?: unknown;
  recordedAt: string;
}
