---
name: service-analyzer
description: Analyze a single service to extract product capabilities and user-facing features
---

# Service Analyzer

Analyze one service and extract its product capabilities from a user perspective.

## Task

Given a service (name, path, type), analyze it and extract:
1. **One-sentence summary**: What does this service do? (max 2 sentences)
2. **Capabilities**: What can users do with this service?
3. **Features**: Specific features, endpoints, or screens with:
   - Name
   - Type: api_endpoint | screen | component | workflow
   - Description from product perspective
   - Files involved
4. **Domain terms**: Key business terms used in this service

## Input

- service_name: string
- service_path: string  
- service_type: api | frontend | shared | worker
- Source files (key files only, summarized)
- Configuration files

## Output Format

```json
{
  "service_name": "api",
  "one_sentence_summary": "REST API providing todo management with team collaboration features",
  "capabilities": [
    {
      "name": "Todo Management",
      "description": "Users can create, read, update, and delete todo items",
      "user_facing": true
    },
    {
      "name": "Team Sharing",
      "description": "Users can share todos with team members and assign tasks",
      "user_facing": true
    }
  ],
  "features": [
    {
      "name": "GET /todos",
      "type": "api_endpoint",
      "description": "List all todos for the authenticated user with filtering",
      "files_involved": ["src/routes/todos.ts"]
    },
    {
      "name": "POST /todos",
      "type": "api_endpoint", 
      "description": "Create a new todo with title, description, due date",
      "files_involved": ["src/routes/todos.ts"]
    }
  ],
  "domain_terms": [
    {"term": "Todo", "meaning": "A task item with title, status, and assignee"},
    {"term": "Assignee", "meaning": "User responsible for completing a todo"}
  ]
}
```

## Guidelines

- Focus on PRODUCT perspective, not implementation
- What can USERS do, not how code is structured
- Use business language, avoid technical jargon
- For APIs: describe what the endpoint enables, not HTTP details
- For Frontend: describe user actions and outcomes
