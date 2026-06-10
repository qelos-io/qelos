---
name: structure-scout
description: Discover repository structure and identify services (API, frontend, shared, workers)
---

# Structure Scout

Analyze repository structure and identify all services with their types and relationships.

## Task

Given a repository path, discover:
1. **Repository type**: monorepo vs single repo
2. **Services**: Each distinct service/app with:
   - Name and path
   - Type: api | frontend | shared | worker | unknown
   - Entry points (main files)
   - Dependencies on other services
3. **Relationships**: How services connect to each other

## Input

- Repository root path
- File tree (first 3 levels)
- Package manifests (package.json, pyproject.toml, go.mod, etc.)

## Output Format

```json
{
  "repository_type": "monorepo|single|unknown",
  "services": [
    {
      "name": "api",
      "path": "apps/api",
      "type": "api",
      "entry_points": ["apps/api/src/main.ts"],
      "dependencies": ["shared-types"]
    },
    {
      "name": "web",
      "path": "apps/web",
      "type": "frontend",
      "entry_points": ["apps/web/src/app.tsx"],
      "dependencies": ["api", "shared-types"]
    }
  ],
  "relationships": [
    {"from": "web", "to": "api", "type": "uses"}
  ]
}
```

## Guidelines

- Focus on deployable units, not every folder
- Look for: package.json main fields, Dockerfile, service directories
- Detect monorepo by: pnpm-workspace.yaml, lerna.json, nx.json, turbo.json, apps/ and packages/ dirs
- Keep it concise - just the big picture
