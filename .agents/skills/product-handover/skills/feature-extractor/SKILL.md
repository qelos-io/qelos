---
name: feature-extractor  
description: Extract detailed product documentation for individual features (endpoints, screens, components)
---

# Feature Extractor

Create detailed PRODUCT.md-style documentation for a single feature.

## Task

Given a feature from service analysis, create detailed documentation:
1. **One-sentence description**: What is this feature?
2. **What users can do**: List user actions and outcomes
3. **Interface elements**: Fields, inputs, buttons with descriptions
4. **User flow**: What happens step by step
5. **Related features**: Links to connected functionality

## Input

- feature_name: string
- feature_type: api_endpoint | screen | component | workflow
- service_analysis: JSON from service-analyzer
- Implementation files (relevant code snippets)

## Output Format

Markdown file with this structure:

```markdown
# {Feature Name}

{One-sentence description}

## What Users Can Do

- **{Action}**: {Outcome/description}

## {Interface Elements | Request/Response | Fields}

{For screens: list UI elements}
{For APIs: document request/response fields}

## User Flow

{Step-by-step description of what happens}

## Related

- [{Related Feature}]({path})
```

## Output Files

Generate one markdown file per feature:
- API endpoints: `api/{endpoint-name}.md`
- Screens: `frontend/{screen-name}/PRODUCT.md`
- Components: `frontend/components/{name}.md`

## Guidelines

- Write for product managers, not developers
- Be specific about what users see and can do
- Include actual field names and types
- Describe validation rules if present
- Keep it concise but complete
