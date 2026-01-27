---
title: Managing Configurations
---
# Managing Configurations

This section provides an overview of managing configurations using the Qelos SDK. Configurations in Qelos allow you to store and retrieve application settings and metadata. The SDK provides methods for both regular users and administrators to work with configurations.

## App Configurations

The SDK provides the `appConfigurations` module for working with application configurations. This module allows you to retrieve and update application configuration metadata.

### Getting App Configuration

To retrieve the current application configuration:

```typescript
const appConfig = await sdk.appConfigurations.getAppConfiguration();
// appConfig.metadata contains the configuration data
```

### Updating App Configuration

To update the application configuration:

```typescript
const updatedConfig = await sdk.appConfigurations.update({
  theme: 'dark',
  logo: 'https://example.com/logo.png',
  features: {
    enableComments: true,
    enableSharing: false
  }
});
```

The `update` method accepts a partial configuration object and returns the updated configuration.

## Admin Configuration Management

**Note**: Administrative configuration management is only available through the administrator SDK (`QelosAdminSDK`).

### Getting List of Configurations

To get a list of all configurations:

```typescript
const configurations = await sdkAdmin.manageConfigurations.getList();
```

### Getting a Specific Configuration

To retrieve a specific configuration by its key:

```typescript
const config = await sdkAdmin.manageConfigurations.getConfiguration('configKey');
```

### Creating a Configuration

As an administrator, you can create new configurations using the admin SDK:

```typescript
await sdkAdmin.manageConfigurations.create({
  key: 'configKey',
  public: true,
  description: 'Configuration description',
  metadata: { setting: 'value' }
});
```

### Updating a Configuration

To update an existing configuration:

```typescript
await sdkAdmin.manageConfigurations.update('configKey', { 
  public: false,
  metadata: { setting: 'newValue' }
});
```

### Removing a Configuration

To remove a configuration:

```typescript
await sdkAdmin.manageConfigurations.remove('configKey');
```

## Configuration Interface

### ICustomConfiguration Interface

```typescript
interface ICustomConfiguration<T = any> {
  key: string;
  public: boolean;
  kind?: string;
  description?: string;
  metadata: T;
}
```

## Usage Example

Here's a complete example of managing configurations:

```typescript
import QelosAdminSDK from '@qelos/sdk/administrator';

// Initialize the admin SDK
const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://your-qelos-app.com',
  fetch: globalThis.fetch
});

// Authenticate as admin
await sdkAdmin.authentication.oAuthSignin({
  username: 'admin@example.com',
  password: 'password'
});

// Get all configurations
const configurations = await sdkAdmin.manageConfigurations.getList();
console.log(`Found ${configurations.length} configurations`);

// Create a new configuration
await sdkAdmin.manageConfigurations.create({
  key: 'email-settings',
  public: false,
  description: 'Email service configuration',
  metadata: {
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    fromEmail: 'noreply@example.com'
  }
});

// Get specific configuration
const emailConfig = await sdkAdmin.manageConfigurations.getConfiguration('email-settings');
console.log('Email config:', emailConfig.metadata);

// Update configuration
await sdkAdmin.manageConfigurations.update('email-settings', {
  metadata: {
    smtpHost: 'smtp.newprovider.com',
    smtpPort: 465,
    fromEmail: 'noreply@example.com'
  }
});

// Remove configuration
await sdkAdmin.manageConfigurations.remove('email-settings');
console.log('Configuration removed');
```
