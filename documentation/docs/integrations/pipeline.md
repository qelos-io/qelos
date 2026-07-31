---
title: Trigger → Data Manipulation → Target → Target Manipulation
---

# The Integration Pipeline

Every Integration connects a **trigger** to a **target**, with two optional, symmetric transformation stages in between and after:

```
trigger  →  dataManipulation  →  target  →  targetManipulation
(fires)     (optional, runs      (executes)   (optional, runs
             on the trigger's                  on the target's
             payload)                          result)
```

- **`dataManipulation`** transforms the trigger's incoming payload before it's sent to the target — enrich it, reshape it, or abort the whole run.
- **`targetManipulation`** transforms the target's result after it executes and before that result is returned to the original caller (an HTTP webhook response) or passed onward (an AI agent's tool-call result, an MCP tool's result).

Both use the exact same step shape and the same JQ-based engine — the only difference is *what data they run against*: the trigger's payload for `dataManipulation`, the target's result for `targetManipulation`.

## Step shape

Both `dataManipulation` and `targetManipulation` are arrays of steps, run in order. Each step:

```typescript
interface IDataManipulationStep {
  map?: Record<string, string>;       // key -> JQ expression, evaluated against the current data
  populate?: Record<string, {         // key -> fetch and attach data from a Qelos source
    source: 'user' | 'workspace' | 'blueprintEntity' | 'blueprintEntities' | 'vectorStores' | 'apiWebhook';
    blueprint?: string;
    scope?: string;
    subjectId?: string;
    integration?: string;
  }>;
  clean?: boolean;                    // if true, discard all data accumulated so far before this step's map/populate run
  abort?: boolean | string;           // true, or a JQ expression evaluated against the current data — if truthy, stop the pipeline
}
```

- **`map`** — each value is a [JQ](https://jqlang.org/) expression evaluated against the data produced by the previous step (or the initial payload, for the first step). String leaves anywhere in a nested `map` value are treated as JQ expressions and evaluated recursively.
- **`populate`** — fetches related data and attaches it under the given key:
  | `source` | What it fetches |
  |---|---|
  | `user` | The user by ID (the current value at that key) |
  | `workspace` | The workspace by ID |
  | `blueprintEntity` | A single blueprint entity — needs `blueprint` + an entity ID, or `{ entity, blueprint }` |
  | `blueprintEntities` | A list of blueprint entities matching a query |
  | `vectorStores` | Vector stores for a `scope`/`subjectId` |
  | `apiWebhook` | Triggers another integration's `apiWebhook` trigger and attaches its result (`integration` = the target integration's ID) |
- **`clean`** — resets the working data to `{}` before this step's `map`/`populate` apply (later steps still see it via the usual chaining).
- **`abort`** — `true` always stops; a string is evaluated as a JQ expression against the current data, and a truthy result stops the pipeline. The pipeline result becomes `{ abort: true }`.

## Where each stage runs

Both stages run through the same execution path — every trigger source ultimately calls `callIntegrationTarget`, which now applies `targetManipulation` to whatever the target handler returns:

| Trigger | `dataManipulation` runs on | `targetManipulation` runs on |
|---|---|---|
| Webhook (`apiWebhook`) | The inbound HTTP request (body/headers/query/user) | The target's result, before it's returned as the HTTP response |
| Platform event (`webhook`) | The platform event payload | The target's result (the pipeline is fire-and-forget here, but manipulation still applies for consistency) |
| AI agent tool call (`functionCalling`) | `{ arguments, user, workspace }` — only `.arguments` is kept | The target's result, before it's returned to the LLM as the tool's output |
| MCP tool call (`mcpTool`) | `{ arguments, user, workspace }` — same convention as AI agent tool calls, so the same JQ steps are portable between both | The target's result, before it's returned to the MCP client |

::: info Chat completion integrations
`targetManipulation` does not apply to `chatCompletion`-trigger integrations. There, `target` configures the LLM call itself (model, temperature, etc.) rather than a single request/response you'd reshape with JQ — it's a different, streaming, multi-turn pipeline.
:::

## Admin UI

In **Admin → Integrations → New/Edit Integration** (Workflow view), the pipeline is laid out as ordered steps: **Trigger → Data Manipulation → Target → Target Manipulation → Trigger Response**. Both manipulation steps use the same step editor (JSON editor or a visual form-builder), with a live tester that runs your steps against a sample payload via the API below.

## API

```
POST /api/data-manipulation
```
Body: `{ payload: any, workflow: IDataManipulationStep[] }`. Runs the given steps against `payload` and returns the result — used by the admin panel's live tester, and usable directly to validate a `dataManipulation`/`targetManipulation` array before saving it on an integration.

`targetManipulation` itself is just a field on the Integration document, set the same way as `dataManipulation`:

```
POST /api/integrations
PUT  /api/integrations/:integrationId
```
Body includes `{ trigger, target, dataManipulation?, targetManipulation?, active? }`.

## SDK

```typescript
await qelos.administrator.integrations.create({
  trigger: { source: triggerSourceId, operation: 'apiWebhook', details: { name: 'Get characters' } },
  target: { source: httpSourceId, operation: 'makeRequest', details: { method: 'GET', url: '/api/characters' } },
  targetManipulation: [
    { map: { count: '.characters | length', names: '.characters | map(.name)' } },
  ],
});
```

`@qelos/sdk` has no dedicated wrapper for the `POST /api/data-manipulation` tester endpoint yet — call it directly (as the admin panel's live tester does) to validate a `dataManipulation`/`targetManipulation` array before saving it on an integration.

## Notes

- `targetManipulation` is optional and defaults to an empty array — targets behave exactly as before when it's unset.
- On `abort`, the pipeline's result becomes `{ abort: true }` rather than the target's raw result — treat this marker as "no data" wherever you consume the target's output.
- Errors during either stage (an invalid JQ expression, a failed `populate` fetch) raise a structured error identifying the step index, phase (`map`/`populate`/`abort`), and field — the same error shape for both `dataManipulation` and `targetManipulation`.

See also: [Connection Status Checks](./status-check.md).
