---
title: Generate Connection
editLink: true
---
# Generate Connection

The `generate connection` command creates secure connection configuration files for Qelos integrations. It provides an interactive CLI experience for setting up connections to various services like OpenAI, AWS, GitHub, and more.

## Overview

Connection generation provides:
- 🔐 **Secure Authentication**: Credentials stored in environment variables
- 🎯 **Interactive Selection**: Easy-to-use connection type picker
- 📝 **Auto-Generated Templates**: Pre-configured for each service
- 🚀 **Push-Ready**: Files ready for immediate deployment to Qelos

## Usage

```bash
qelos generate connection <name> --kind [kind]
```

### Arguments

- `<name>`: Name of the connection (required) - will be used in environment variable names
- `--kind, -k`: Type of integration source (optional, will prompt if not provided)

## Available Connection Types

The following integration sources are supported:

| Kind | Description | Common Use Cases |
|------|-------------|------------------|
| `openai` | OpenAI API for AI services | ChatGPT integration, AI automation |
| `aws` | Amazon Web Services | S3 storage, EC2 compute, Lambda functions |
| `github` | GitHub API | Repository management, CI/CD integration |
| `google` | Google APIs | Google Drive, Sheets, Gmail automation |
| `email` | Email services (SMTP/POP3) | Email automation, notifications |
| `supabase` | Supabase database | Backend-as-a-Service, real-time database |
| `n8n` | N8n automation platform | Workflow automation, integration hub |
| `linkedin` | LinkedIn API | Social media management, recruiting |
| `http` | Generic HTTP endpoints | REST API connections, webhooks |
| `claudeai` | Anthropic Claude AI | AI assistant integration |
| `facebook` | Facebook/Meta APIs | Social media marketing, content management |
| `gemini` | Google Gemini AI | AI services, multimodal AI |
| `sumit` | Sumit platform | Business integration, ERP |
| `cloudflare` | Cloudflare services | CDN management, DNS, security |
| `qelos` | Qelos platform | Internal Qelos connections, multi-tenant |

## Interactive Workflow

### 1. Connection Kind Selection

If `--kind` is not provided, you'll see an interactive selection menu:

```
Select Connection Kind
──────────────────────

Choose the type of integration you want to create:

Use ↑↓ arrows to navigate, Enter to select, Esc to cancel

► 1. Openai
  2. Aws
  3. Github
  4. Google
  5. Email
  ...
```

**Navigation Controls:**
- ↑↓ arrows to navigate options
- Enter to select
- Esc to cancel
- Number keys (1-9) for quick selection
- Page Up/Down for pagination through long lists
- Home/End to jump to first/last option

### 2. Authentication Configuration

The CLI will prompt for authentication fields specific to each connection type:

```
Enter authentication.token (current: ): sk-your-api-key-here
```

**Security Features:**
- ⚠️ **Sensitive field warnings** for passwords, tokens, secrets
- 🔒 **Environment variable storage** (never in connection files)
- 👁️ **Masked display** (e.g., `sk***key` when showing current values)

### 3. Metadata Configuration

Configure connection-specific settings and options:

```
Enter metadata - organizationId (current: ): org-your-org
Enter metadata - defaultModel (current: null): gpt-4
Enter metadata - defaultTemperature (current: 0.7): 0.8
```

## Security Implementation

### Environment Variables

Authentication data is automatically stored in environment variables with consistent naming:

```bash
# Generated .env file
QELOS_CONNECTION_OPENAI_MY_CONNECTION_TOKEN=sk-your-api-key-here
QELOS_CONNECTION_AWS_PROD_SECRET_ACCESS_KEY=your-secret-key
QELOS_CONNECTION_GITHUB_BOT_CLIENT_SECRET=github-client-secret
```

### Naming Convention

Environment variables follow this pattern:
```
QELOS_CONNECTION_{KIND}_{NAME}_{FIELD}
```

Examples:
- `QELOS_CONNECTION_OPENAI_PRODUCTION_TOKEN`
- `QELOS_CONNECTION_AWS_STAGING_SECRET_ACCESS_KEY`
- `QELOS_CONNECTION_GITHUB_BOT_CLIENT_SECRET`

### Connection File Format

The generated connection file uses environment variable references instead of plain text:

```json
{
  "name": "my-openai",
  "kind": "openai",
  "metadata": {
    "organizationId": "org-123",
    "defaultModel": "gpt-4",
    "defaultTemperature": 0.7
  },
  "authentication": {
    "token": {
      "$var": "QELOS_CONNECTION_OPENAI_MY_OPENAI_TOKEN"
    }
  }
}
```

## Examples

### OpenAI Connection

```bash
qelos generate connection my-openai --kind openai
```

**Prompts for:**
- `authentication.token`: OpenAI API key
- `metadata.organizationId`: OpenAI organization ID (optional)
- `metadata.defaultModel`: Default model (gpt-3.5-turbo, gpt-4, etc.)
- `metadata.defaultTemperature`: Default temperature (0.0-2.0)
- `metadata.defaultMaxTokens`: Default response token limit
- Other OpenAI-specific settings

### AWS Connection

```bash
qelos generate connection aws-prod --kind aws
```

**Prompts for:**
- `authentication.secretAccessKey`: AWS secret access key
- `metadata.accessKeyId`: AWS access key ID
- `metadata.region`: AWS region (us-east-1, us-west-2, etc.)

### GitHub Connection

```bash
qelos generate connection github-bot --kind github
```

**Prompts for:**
- `authentication.clientSecret`: GitHub app client secret
- `metadata.clientId`: GitHub app client ID
- `metadata.scope`: OAuth scopes (repo, user, admin:repo, etc.)

### Interactive Selection

```bash
qelos generate connection my-integration
```

Shows the interactive selection menu for choosing the connection type.

## File Structure

### Generated Files

```
project/
├── connections/
│   ├── my-openai.connection.json
│   ├── aws-prod.connection.json
│   └── github-bot.connection.json
└── .env
```

### Connection File Location

Connection files are created in the `./connections/` directory relative to your current working directory. The `.env` file is created in the project root.

## Complete Workflow

### 1. Generate Connection

```bash
# Interactive selection
qelos generate connection openai-prod

# Or specify kind directly
qelos generate connection openai-prod --kind openai
```

### 2. Review Generated Files

```bash
# Connection file (safe to commit)
cat connections/openai-prod.connection.json

# Environment file (DO NOT commit)
cat .env
```

### 3. Push to Qelos

```bash
qelos push connections connections/openai-prod.connection.json
```

### 4. Use in Blueprints

Once pushed, the connection can be used in blueprints for API calls and integrations.

## Connection Templates

Each connection kind has predefined templates with appropriate fields:

### OpenAI Template
```javascript
{
  authentication: { token: '' },
  metadata: {
    organizationId: '',
    apiUrl: '',
    defaultModel: null,
    defaultTemperature: 0.7,
    defaultTopP: 1,
    defaultFrequencyPenalty: 0,
    defaultPresencePenalty: 0,
    defaultMaxTokens: null,
    defaultResponseFormat: ''
  }
}
```

### AWS Template
```javascript
{
  authentication: { secretAccessKey: '' },
  metadata: {
    region: '',
    accessKeyId: ''
  }
}
```

### GitHub Template
```javascript
{
  authentication: { clientSecret: '' },
  metadata: {
    clientId: '',
    scope: ''
  }
}
```

## Error Handling

### File Already Exists

```
✗ Error: Connection file already exists: ./connections/my-connection.connection.json
ℹ Please choose a different name.
```

**Solution:** Use a different connection name or delete the existing file.

### Invalid Kind

```
✗ Error: Invalid kind: invalid-kind
✗ Failed to generate connection: No template available
```

**Solution:** Use one of the supported connection kinds.

### Environment Variable Issues

If environment variables already exist:
```
✓ Updated existing environment variable: QELOS_CONNECTION_OPENAI_TOKEN
```

The CLI will update existing variables rather than creating duplicates.

## Best Practices

### Naming Conventions
- ✅ **Use descriptive names**: `openai-prod`, `aws-staging`, `github-bot`
- ✅ **Include environment**: `prod`, `staging`, `dev` for different environments
- ✅ **Indicate purpose**: `notifications`, `backup`, `analytics`

### Security Practices
- ✅ **Never commit `.env` files** to version control
- ✅ **Add `.env` to `.gitignore`**
- ✅ **Use different credentials** for different environments
- ✅ **Rotate credentials regularly**

### Organization
- ✅ **Environment-specific connections**: Separate prod/staging configs
- ✅ **Team sharing**: Connection files can be shared, each team member sets their own `.env`
- ✅ **Documentation**: Use connection names that indicate their purpose and usage

## Troubleshooting

### Character Duplication During Input

If you see duplicate characters while typing:
- Ensure no other CLI processes are running
- Try a different terminal if issues persist
- Use `--kind` flag to skip interactive selection

### Permission Issues

```
✗ Error: EACCES: permission denied, mkdir './connections'
```

**Solutions:**
- Check directory write permissions: `ls -la`
- Ensure you have write access: `chmod 755 .`
- Run with appropriate user permissions

### Environment Variable Conflicts

If environment variables already exist in `.env`:
- The CLI updates existing variables
- A warning is shown: `Updated existing environment variable: VAR_NAME`
- Review the updated values in `.env` after generation

## Integration with Development Workflow

### Git Workflow

```bash
# 1. Generate connection
qelos generate connection openai-prod --kind openai

# 2. Add connection file to git (NOT the .env file)
git add connections/openai-prod.connection.json
git commit -m "Add OpenAI production connection"

# 3. Push to Qelos
qelos push connections connections/openai-prod.connection.json

# 4. Team members set their own .env
echo "QELOS_CONNECTION_OPENAI_PROD_TOKEN=sk-your-token" >> .env
```

### CI/CD Integration

```bash
# In CI/CD pipeline
export QELOS_CONNECTION_OPENAI_PROD_TOKEN=$OPENAI_API_KEY
qelos push connections connections/
```

### Team Collaboration

```bash
# Share connection template
qelos get connections openai-template > connections/shared-openai.connection.json

# Each team member sets their own credentials
echo "QELOS_CONNECTION_OPENAI_SHARED_TOKEN=sk-..." >> .env
```

## Advanced Usage

### Batch Operations

```bash
# Generate multiple connections
for kind in openai aws github; do
  qelos generate connection "my-$kind" --kind $kind
done

# Push all connections
qelos push connections connections/
```

### Environment-Specific Configurations

```bash
# Production
qelos generate connection openai-prod --kind openai
qelos generate connection aws-prod --kind aws

# Staging
qelos generate connection openai-staging --kind openai
qelos generate connection aws-staging --kind aws
```

### Custom Environment Files

```bash
# Use specific environment file
qelos --env staging generate connection openai --kind openai
```

This will load `.env.staging` and create variables like `QELOS_CONNECTION_OPENAI_STAGING_TOKEN`.

## Related Commands

- [`qelos push connections`](/cli/push) - Upload connections to Qelos
- [`qelos pull connections`](/cli/pull) - Download connections from Qelos
- [`qelos get connections`](/cli/get) - View connection details without pushing

## Related Resources

- [AI Operations](/sdk/ai_operations.md) - Working with connections and AI in Qelos
- [Blueprint Integration](/sdk/blueprints_operations.md) - Using connections in blueprints
- [Security Best Practices](/deployment/production-guide.md) - Production deployment guidelines
- [Configuration Management](/deployment/configuration.md) - Managing deployment configuration
