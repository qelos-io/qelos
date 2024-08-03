---
title: Managing Configurations
---

# {{ $frontmatter.title }}

This section provides an overview of managing configurations using the Qelos SDK. The examples demonstrate how to create, update, remove, and retrieve configuration information, enabling administrators to effectively manage configurations.

## Creating a Configuration

To create a new configuration, use the following code:

```bash
await sdkAdmin.manageConfigurations.create({
  key: 'configKey',
  public: true,
  description: 'Configuration description',
  metadata: { setting: 'value' }
});
```

## Updating a Configuration

To update an existing configuration's information, use the following code:

```bash
await sdkAdmin.manageConfigurations.update('configKey', { public: false });
```

## Removing a Configuration

To remove a configuration, use the following code:

```bash
await sdkAdmin.manageConfigurations.remove('configKey');
```

## Getting List of Configurations

To get a list of all configurations, use the following code:

```bash
const configurations = await sdkAdmin.manageConfigurations.getList('configKey');
```

***

# Management of Custom Configurations

The Qelos SDK also allows managing custom configurations. Here are examples demonstrating how to get, create, update, and remove custom configurations.

## Creating of Custom Configurations

To create a new configuration, use the following code:

```bash
await sdkAdmin.manageConfigurations.create({
  key: 'configKey',
  public: true,
  metadata: { some: 'data' }
});
```

## Other Operations with Custom Configurations

For updating, removing, and retrieving custom configurations, refer to the regular configuration management methods as they follow the same process:

- **Updating a Custom Configuration:** Use the same code as updating a regular configuration.
- **Removing a Custom Configuration:** Use the same code as removing a regular configuration.
- **Getting List of Custom Configurations:** Use the same code as getting a list of regular configurations.
- **Getting a Specific Custom Configuration:** Use the same code as getting a specific regular configuration.
