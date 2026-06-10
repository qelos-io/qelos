# {{service_name}}

{{one_sentence_description}}

## User Flows

{{#flows}}
- {{name}}: {{description}}
{{/flows}}

## Screens

{{#screens}}
### {{name}}

{{one_sentence}}

[Details](screens/{{filename}}/PRODUCT.md)

{{/screens}}

## Components

{{#components}}
- [{{name}}](components/{{filename}}.md) - {{one_sentence}}
{{/components}}

## Related

{{#related_services}}
- [{{name}}](../../{{path}}/PRODUCT.md)
{{/related_services}}
