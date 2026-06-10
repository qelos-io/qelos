# {{endpoint_name}}

{{one_sentence_description}}

## What This Does

{{description}}

## Request

{{#request_fields}}
- **{{name}}** ({{type}}){{#required}} *required*{{/required}}: {{description}}
{{/request_fields}}

## Response

{{#response_fields}}
- **{{name}}** ({{type}}): {{description}}
{{/response_fields}}

## User Flow

{{user_flow_description}}

## Related Endpoints

{{#related_endpoints}}
- [{{name}}]({{filename}}.md)
{{/related_endpoints}}
