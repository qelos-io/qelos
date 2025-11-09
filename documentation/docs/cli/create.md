---
title: Create Command
editLink: true
---

# {{ $frontmatter.title }}

The `create` command scaffolds a new Qelos plugin project with all necessary files and configurations.

## Usage

```bash
qplay create <project-name>
```

or

```bash
qelos create <project-name>
```

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `project-name` | Name of the plugin project to create | Yes |

## What It Does

The `create` command will:

1. Create a new directory with your project name
2. Generate the plugin project structure
3. Set up configuration files
4. Install necessary dependencies
5. Provide a ready-to-use plugin template

## Example

```bash
# Create a new plugin called "my-awesome-plugin"
qplay create my-awesome-plugin
```

This will create a directory structure like:

```
my-awesome-plugin/
├── package.json
├── README.md
├── src/
│   ├── index.js
│   └── components/
├── public/
└── config/
```

## Next Steps

After creating your plugin:

1. **Navigate to the project directory:**
   ```bash
   cd my-awesome-plugin
   ```

2. **Install dependencies (if not already installed):**
   ```bash
   npm install
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Learn about plugin development:**
   - [Plugin Development Guide](/plugins/create)
   - [Plugin Lifecycle](/plugins/lifecycle)
   - [Micro-Frontends](/plugins/micro-frontend)

## Project Structure

The generated plugin includes:

### Configuration Files

- **package.json** - Node.js package configuration with dependencies
- **README.md** - Project documentation template
- **config/** - Plugin configuration files

### Source Files

- **src/index.js** - Main entry point for your plugin
- **src/components/** - Vue components directory
- **public/** - Static assets

### Development Files

- Development server configuration
- Build scripts
- Testing setup (if applicable)

## Options

View all available options:

```bash
qplay create --help
```

## Common Issues

### Permission Denied

If you get a permission error:

```bash
# Run with appropriate permissions or change directory ownership
sudo qplay create my-plugin
```

### Directory Already Exists

If the directory already exists, the command will fail. Either:
- Choose a different name
- Remove the existing directory
- Use a different path

### Network Issues

If dependency installation fails:
- Check your internet connection
- Try using a different npm registry
- Install dependencies manually after creation

## Examples

### Basic Plugin

```bash
qplay create my-plugin
cd my-plugin
npm run dev
```

### Plugin with Custom Name

```bash
qplay create customer-dashboard
cd customer-dashboard
npm install
```

## Related Commands

- [Pull Command](/cli/pull) - Pull resources from Qelos
- [Push Command](/cli/push) - Push resources to Qelos

## Related Resources

- [Create Your First Plugin](/getting-started/create-your-first-plugin)
- [Plugin Development](/plugins/create)
- [Plugin Lifecycle](/plugins/lifecycle)
