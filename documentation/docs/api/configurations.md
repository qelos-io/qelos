---
title: Configurations API
editLink: true
---
# Configurations API

Endpoints for managing application configuration settings.

> **SDK equivalent:** [`sdk.appConfigurations`](/sdk/managing_configurations)

## Get App Configuration

Retrieve the current application configuration.

```
GET /api/configurations/app-configuration
```

### Response

```json
{
  "metadata": {
    "theme": "dark",
    "logo": "https://example.com/logo.png",
    "features": {
      "enableComments": true,
      "enableSharing": false
    }
  }
}
```

> **SDK:** [`sdk.appConfigurations.getAppConfiguration()`](/sdk/managing_configurations#getting-app-configuration)

---

## Update App Configuration

Update the application configuration.

```
PUT /api/configurations/app-configuration
```

### Request Body

```json
{
  "theme": "dark",
  "logo": "https://example.com/logo.png",
  "features": {
    "enableComments": true,
    "enableSharing": false
  }
}
```

Accepts a partial configuration object — only the fields being changed need to be included.

### Response

```json
{
  "metadata": {
    "theme": "dark",
    "logo": "https://example.com/logo.png",
    "features": {
      "enableComments": true,
      "enableSharing": false
    }
  }
}
```

> **SDK:** [`sdk.appConfigurations.update(changes)`](/sdk/managing_configurations#updating-app-configuration)
